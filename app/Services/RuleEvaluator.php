<?php

namespace App\Services;

class RuleEvaluator
{
    public function __construct(private readonly RuleCatalog $catalog) {}

    /** @return array<int, array<string, mixed>> */
    public function evaluate(array $documents): array
    {
        return array_map(
            fn (array $rule): array => $this->evaluateRule($rule, $documents),
            $this->catalog->all(),
        );
    }

    /** @return array<string, mixed> */
    private function evaluateRule(array $rule, array $documents): array
    {
        $observations = [];

        foreach ($rule['inputs'] as $input) {
            $observations[$input['name']] = $this->findObservation(
                $documents,
                $rule['target_asset_id'],
                $input['document_type'],
                $input['field'],
            );
        }

        $status = match ($rule['rule_type']) {
            'all_equal' => $this->allEqual($observations),
            'relative_tolerance' => $this->withinRelativeTolerance($observations, $rule['parameters']),
            'numeric_range' => $this->withinNumericRange($observations),
            default => false,
        } ? 'pass' : 'needs_review';

        return [
            'rule_id' => $rule['rule_id'],
            'title' => $rule['title'],
            'target_asset_id' => $rule['target_asset_id'],
            'public_rule' => $rule['public_rule'],
            'status' => $status,
            'output_code' => $status === 'pass' ? 'pass' : $rule['on_fail'],
            'review_required' => $status !== 'pass',
            'inputs' => collect($observations)->map(fn (?array $item, string $name): array => [
                'name' => $name,
                'value' => $item['value'] ?? null,
            ])->values()->all(),
            'evidence' => array_values(array_filter($observations)),
        ];
    }

    /** @return array<string, mixed>|null */
    private function findObservation(
        array $documents,
        string $assetId,
        string $documentType,
        string $field,
    ): ?array {
        foreach ($documents as $document) {
            if ($document['document_type'] !== $documentType) {
                continue;
            }

            foreach ($document['assets'] as $asset) {
                if ($asset['asset_id'] !== $assetId) {
                    continue;
                }

                $value = data_get($asset, "snapshot.{$field}");

                if ($value === null) {
                    return null;
                }

                return [
                    'value' => $value,
                    'document_id' => $document['document_id'],
                    'document_type' => $document['document_type'],
                    'document_version' => $document['document_version'],
                    'source_document' => $document['source_document'],
                    'field' => "assets.{$assetId}.snapshot.{$field}",
                    'locator' => data_get($asset, "locators.{$field}"),
                ];
            }
        }

        return null;
    }

    private function allEqual(array $observations): bool
    {
        $values = collect($observations)->filter()->pluck('value')->uniqueStrict();

        return $values->count() === count($observations) && $values->count() === 1;
    }

    private function withinRelativeTolerance(array $observations, array $parameters): bool
    {
        $design = $observations['design']['value'] ?? null;
        $measured = $observations['measured']['value'] ?? null;

        if (! is_numeric($design) || ! is_numeric($measured) || (float) $design === 0.0) {
            return false;
        }

        $errorPercent = abs(((float) $measured - (float) $design) / (float) $design) * 100;

        return $errorPercent <= (float) ($parameters['max_relative_error_percent'] ?? 0);
    }

    private function withinNumericRange(array $observations): bool
    {
        $minimum = $observations['minimum']['value'] ?? null;
        $maximum = $observations['maximum']['value'] ?? null;
        $measured = $observations['measured']['value'] ?? null;

        if (! is_numeric($minimum) || ! is_numeric($maximum) || ! is_numeric($measured)) {
            return false;
        }

        return (float) $minimum <= (float) $measured && (float) $measured <= (float) $maximum;
    }
}
