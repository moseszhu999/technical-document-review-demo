<?php

namespace App\Services;

class CrossDocumentComparator
{
    private const COMPARE_FIELDS = [
        'installation_reference',
        'operating_mode',
        'rated_capacity',
        'equipment_model',
    ];

    /**
     * 同一設備について文書ごとの値を集め、値が分かれた項目だけを Finding にします。
     * 差異はこの段階では「誤り」と断定しません。
     *
     * @return array<int, array<string, mixed>>
     */
    public function compare(array $documents): array
    {
        $observations = [];
        $assetNames = [];

        foreach ($documents as $document) {
            foreach ($document['assets'] as $asset) {
                $assetId = $asset['asset_id'];
                $assetNames[$assetId] = $asset['asset_name'];

                foreach (self::COMPARE_FIELDS as $field) {
                    $value = data_get($asset, "snapshot.{$field}");

                    if ($value === null) {
                        continue;
                    }

                    $observations[$assetId][$field][] = [
                        'value' => $value,
                        'document_id' => $document['document_id'],
                        'document_type' => $document['document_type'],
                        'document_version' => $document['document_version'],
                        'source_document' => $document['source_document'],
                        'field' => "assets.{$assetId}.snapshot.{$field}",
                    ];
                }
            }
        }

        $findings = [];

        foreach ($observations as $assetId => $fields) {
            foreach ($fields as $field => $items) {
                $distinctValues = collect($items)
                    ->pluck('value')
                    ->uniqueStrict()
                    ->values();

                if ($distinctValues->count() < 2) {
                    continue;
                }

                $findings[] = [
                    'finding_id' => sprintf('F-%03d', count($findings) + 1),
                    'asset_id' => $assetId,
                    'asset_name' => $assetNames[$assetId],
                    'field' => $field,
                    'status' => 'needs_review',
                    'observed_values' => $distinctValues->all(),
                    'evidence' => $items,
                ];
            }
        }

        return $findings;
    }
}
