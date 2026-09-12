<?php

namespace App\Services;

use RuntimeException;

class RuleCatalog
{
    /** @return array<int, array<string, mixed>> */
    public function all(): array
    {
        $path = base_path('data/rules/public_demo_rules.json');
        $payload = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $rules = $payload['rules'] ?? null;

        if (! is_array($rules)) {
            throw new RuntimeException('公開デモルールを読み込めません。');
        }

        return $rules;
    }
}
