<?php

namespace App\Services;

use App\Contracts\DocumentNormalizer;

class JsonDocumentNormalizer implements DocumentNormalizer
{
    public function normalize(array $document, string $sourceDocument): array
    {
        return [
            'case_id' => $document['case_id'],
            'document_id' => $document['document_id'],
            'document_type' => $document['document_type'],
            'document_version' => $document['document_version'] ?? '1',
            'document_date' => $document['document_date'] ?? null,
            'source_document' => $sourceDocument,
            'document_content' => $document['document_content'] ?? null,
            'assets' => $document['assets'] ?? [],
        ];
    }
}
