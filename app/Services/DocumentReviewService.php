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
        private readonly RuleEvaluator $ruleEvaluator,
        private readonly AiCandidateReader $aiCandidateReader,
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

        $documentFindings = $this->comparator->compare($documents);
        $ruleResults = $this->ruleEvaluator->evaluate($documents);
        $failedRuleCount = collect($ruleResults)->where('status', 'needs_review')->count();
        $reviewRequired = $documentFindings !== [] || $failedRuleCount > 0;

        return [
            'case_id' => $caseIds->first(),
            'documents' => $documents,
            'entities' => $entities,
            'rule_results' => $ruleResults,
            'document_findings' => $documentFindings,
            'evidence_chain' => $this->evidenceChainBuilder->build($documents),
            'ai_assist' => $this->aiCandidateReader->read(),
            'summary' => [
                'document_count' => count($documents),
                'entity_count' => count($entities),
                'rule_count' => count($ruleResults),
                'rule_review_count' => $failedRuleCount,
                'document_finding_count' => count($documentFindings),
                'review_status' => $reviewRequired ? 'human_review_required' : 'no_issue_found',
            ],
        ];
    }
}
