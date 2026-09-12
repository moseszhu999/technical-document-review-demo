<?php

namespace App\Services;

use App\Contracts\DocumentNormalizer;
use RuntimeException;

class DocumentReviewService
{
    public function __construct(
        private readonly DocumentNormalizer $normalizer,
        private readonly CrossDocumentComparator $comparator,
        private readonly EvidenceChainBuilder $evidenceChainBuilder,
    ) {}

    /** @return array<string, mixed> */
    public function review(array $inputDocuments): array
    {
        $documents = array_map(
            fn (array $item): array => $this->normalizer->normalize($item['document'], $item['source']),
            $inputDocuments,
        );

        $caseIds = collect($documents)->pluck('case_id')->uniqueStrict()->values();

        if ($caseIds->count() !== 1) {
            throw new RuntimeException('このデモでは1案件分の文書を想定しています。');
        }

        $entities = collect($documents)
            ->flatMap(fn (array $document) => $document['assets'])
            ->unique('asset_id')
            ->map(fn (array $asset): array => [
                'asset_id' => $asset['asset_id'],
                'asset_name' => $asset['asset_name'],
            ])
            ->values()
            ->all();

        $findings = $this->comparator->compare($documents);

        return [
            'case_id' => $caseIds->first(),
            'documents' => $documents,
            'entities' => $entities,
            'evidence_chain' => $this->evidenceChainBuilder->build($documents),
            'findings' => $findings,
            'summary' => [
                'document_count' => count($documents),
                'entity_count' => count($entities),
                'finding_count' => count($findings),
                'review_status' => $findings === [] ? 'no_difference_found' : 'human_review_required',
            ],
        ];
    }
}
