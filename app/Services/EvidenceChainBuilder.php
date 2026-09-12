<?php

namespace App\Services;

class EvidenceChainBuilder
{
    private const ORDER = [
        'ProjectSummary' => 10,
        'TechnicalMeasurementReport' => 20,
        'InspectionRecord' => 30,
        'AcceptanceConclusion' => 40,
    ];

    /** @return array<int, array<string, mixed>> */
    public function build(array $documents): array
    {
        usort($documents, fn (array $left, array $right): int =>
            (self::ORDER[$left['document_type']] ?? 999)
            <=> (self::ORDER[$right['document_type']] ?? 999)
        );

        return array_map(fn (array $document): array => [
            'document_id' => $document['document_id'],
            'document_type' => $document['document_type'],
            'document_version' => $document['document_version'],
            'document_date' => $document['document_date'],
            'source_document' => $document['source_document'],
        ], $documents);
    }
}
