<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ArkChatService
{
    /** @return array{answer:string,sources:array<int,string>,model:string} */
    public function answer(string $message): array
    {
        $apiKey = $this->normalizeApiKey((string) config('services.ark.api_key'));
        $apiKeySource = (string) config('services.ark.api_key_source', 'unknown');
        $baseUrl = rtrim($this->normalizeEnvValue((string) config('services.ark.base_url')), '/');
        $model = $this->normalizeEnvValue((string) config('services.ark.model'));
        $timeout = (int) config('services.ark.timeout', 25);

        if ($apiKey === '') {
            throw new RuntimeException('Ark API key is not configured.');
        }

        if ($baseUrl === '') {
            throw new RuntimeException('ARK_BASE_URL is not configured.');
        }

        if ($model === '') {
            throw new RuntimeException('ARK_MODEL is not configured.');
        }

        $response = Http::withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->timeout($timeout)
            ->post($baseUrl . '/chat/completions', [
                'model' => $model,
                'temperature' => 0.2,
                'max_tokens' => 700,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $this->systemPrompt(),
                    ],
                    [
                        'role' => 'user',
                        'content' => "以下は公開デモ用の架空データです。\n\n" . $this->groundingContext() . "\n\n質問: " . $message,
                    ],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('Ark chat request failed', [
                'status' => $response->status(),
                'model' => $model,
                'api_key_source' => $apiKeySource,
                'ark_error_code' => $this->safeErrorField($response->json('error.code')),
                'ark_error_message' => $this->safeErrorField($response->json('error.message')),
            ]);
            throw new RuntimeException('Ark API request failed with status ' . $response->status());
        }

        $answer = trim((string) $response->json('choices.0.message.content'));

        if ($answer === '') {
            throw new RuntimeException('Ark API returned an empty answer.');
        }

        return [
            'answer' => $answer,
            'sources' => $this->extractSources($answer),
            'model' => $model,
        ];
    }

    private function normalizeApiKey(string $value): string
    {
        $value = $this->normalizeEnvValue($value);
        $value = preg_replace('/^Bearer\s+/i', '', $value) ?? $value;

        return trim($value);
    }

    private function normalizeEnvValue(string $value): string
    {
        $value = trim($value);

        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        return trim($value);
    }

    private function safeErrorField(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        return mb_substr($text, 0, 240);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
あなたは製造業の技術文書レビューを支援する公開デモ用AIです。
必ず与えられた文書・ナレッジ・ルールだけを根拠に、日本語で簡潔に回答してください。
根拠が見つからない場合は「この公開デモの資料からは確認できません」と明示してください。
実在する規格、法令、顧客情報、数値を推測して補わないでください。
ルール判定は最終的な専門判断ではありません。要確認の項目は、人が元文書とエビデンスを確認する必要があることを明示してください。
可能な場合は DEMO-Rxx、KB-xxx、DRAW-042、WI-042、INSP-042、ACC-042 のような根拠IDを本文に含めてください。
PROMPT;
    }

    private function groundingContext(): string
    {
        $payload = [
            'documents' => $this->readJsonFiles(base_path('data/input/*.json')),
            'knowledge' => $this->readJsonFile(base_path('data/knowledge/manufacturing_knowledge.json')),
            'rules' => $this->readJsonFile(base_path('data/rules/public_demo_rules.json')),
            'ai_candidates' => $this->readJsonFile(base_path('data/ai/assist_candidates.json')),
        ];

        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?: '{}';
    }

    /** @return array<int,array<string,mixed>> */
    private function readJsonFiles(string $pattern): array
    {
        $documents = [];
        foreach (glob($pattern) ?: [] as $file) {
            $documents[] = $this->readJsonFile($file);
        }

        return $documents;
    }

    /** @return array<string,mixed> */
    private function readJsonFile(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        return is_array($decoded) ? $decoded : [];
    }

    /** @return array<int,string> */
    private function extractSources(string $answer): array
    {
        preg_match_all('/\b(?:DEMO-R\d+|KB-\d+|AI-C\d+|DRAW-\d+|WI-\d+|INSP-\d+|ACC-\d+)\b/u', $answer, $matches);

        return array_values(array_unique($matches[0] ?? []));
    }
}
