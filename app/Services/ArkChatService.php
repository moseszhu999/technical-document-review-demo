<?php

namespace App\Services;

use Generator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ArkChatService
{
    /** @return array{answer:string,sources:array<int,string>,model:string} */
    public function answer(string $message): array
    {
        $settings = $this->connectionSettings();

        $response = $this->sendCompletionRequest($settings, $message, false);

        if (! $response->successful()) {
            $this->logFailedRequest($response, $settings);
            throw new RuntimeException('Ark API request failed with status ' . $response->status());
        }

        $answer = trim((string) $response->json('choices.0.message.content'));

        if ($answer === '') {
            throw new RuntimeException('Ark API returned an empty answer.');
        }

        return [
            'answer' => $answer,
            'sources' => $this->extractSources($answer),
            'model' => $settings['model'],
        ];
    }

    /**
     * SSE 用のストリーミング回答です。
     *
     * @return Generator<int, array<string, mixed>>
     */
    public function streamAnswer(string $message): Generator
    {
        $settings = $this->connectionSettings();

        $response = $this->sendCompletionRequest($settings, $message, true);

        if (! $response->successful()) {
            $this->logFailedRequest($response, $settings);
            throw new RuntimeException('Ark API request failed with status ' . $response->status());
        }

        $stream = $response->getBody();
        $buffer = '';
        $answer = '';
        $reasoningAnnounced = false;
        $upstreamDone = false;

        while (! $stream->eof() && ! $upstreamDone) {
            $buffer .= (string) $stream->read(512);
            $newlinePos = strpos($buffer, "\n");

            while ($newlinePos !== false) {
                $line = trim(substr($buffer, 0, $newlinePos));
                $buffer = substr($buffer, $newlinePos + 1);
                $newlinePos = strpos($buffer, "\n");

                if ($line === '' || ! str_starts_with($line, 'data:')) {
                    continue;
                }

                $payload = trim(substr($line, 5));

                if ($payload === '[DONE]') {
                    $upstreamDone = true;
                    break;
                }

                $decoded = json_decode($payload, true);

                if (! is_array($decoded)) {
                    continue;
                }

                $delta = $decoded['choices'][0]['delta'] ?? [];

                if (($delta['reasoning_content'] ?? '') !== '' && ! $reasoningAnnounced) {
                    $reasoningAnnounced = true;
                    yield ['type' => 'phase', 'phase' => 'reasoning'];
                }

                $content = (string) ($delta['content'] ?? '');

                if ($content !== '') {
                    $answer .= $content;
                    yield ['type' => 'delta', 'text' => $content];
                }
            }
        }

        $answer = trim($answer);

        if ($answer === '') {
            throw new RuntimeException('Ark API returned an empty answer.');
        }

        yield ['type' => 'sources', 'sources' => $this->extractSources($answer)];
    }

    /** @return array{api_key:string,api_key_source:string,base_url:string,model:string,timeout:int,connect_timeout:int} */
    private function connectionSettings(): array
    {
        $apiKey = $this->normalizeApiKey((string) config('services.ark.api_key'));
        $apiKeySource = (string) config('services.ark.api_key_source', 'unknown');
        $baseUrl = rtrim($this->normalizeEnvValue((string) config('services.ark.base_url')), '/');
        $model = $this->normalizeEnvValue((string) config('services.ark.model'));
        $timeout = min(max((int) config('services.ark.timeout', 12), 4), 60);
        $connectTimeout = min(4, $timeout);

        if ($apiKey === '') {
            throw new RuntimeException('Ark API key is not configured.');
        }

        if ($baseUrl === '') {
            throw new RuntimeException('ARK_BASE_URL is not configured.');
        }

        if ($model === '') {
            throw new RuntimeException('ARK_MODEL is not configured.');
        }

        @set_time_limit($timeout + 30);

        return [
            'api_key' => $apiKey,
            'api_key_source' => $apiKeySource,
            'base_url' => $baseUrl,
            'model' => $model,
            'timeout' => $timeout,
            'connect_timeout' => $connectTimeout,
        ];
    }

    /**
     * @param array<string, mixed> $settings
     */
    private function sendCompletionRequest(array $settings, string $message, bool $stream): \Illuminate\Http\Client\Response
    {
        $request = Http::withToken($settings['api_key'])
            ->acceptJson()
            ->asJson()
            ->connectTimeout($settings['connect_timeout'])
            ->timeout($settings['timeout']);

        if ($stream) {
            $request->withOptions(['stream' => true]);
        }

        try {
            return $request->post(
                $settings['base_url'] . '/chat/completions',
                $this->completionPayload($settings['model'], $message, $stream),
            );
        } catch (Throwable $e) {
            Log::warning('Ark chat connection failed', [
                'model' => $settings['model'],
                'api_key_source' => $settings['api_key_source'],
                'error_class' => $e::class,
                'error_message' => $this->safeErrorField($e->getMessage()),
            ]);

            throw $e;
        }
    }

    /** @return array<string, mixed> */
    private function completionPayload(string $model, string $message, bool $stream): array
    {
        $payload = [
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
                    'content' => "以下に公開デモの資料を添付します。ナレッジの sources に記載された公開規格・NORD公式資料は実在の公開情報で、それ以外（文書・ルール・数値・AI候補・デジタルツイン点位）は架空のデモレコードです。\n\n"
                        . $this->groundingContext() . "\n\n質問: " . $message,
                ],
            ],
        ];

        if ($stream) {
            $payload['stream'] = true;
        }

        return $payload;
    }

    /** @param array<string, mixed> $settings */
    private function logFailedRequest(\Illuminate\Http\Client\Response $response, array $settings): void
    {
        Log::warning('Ark chat request failed', [
            'status' => $response->status(),
            'model' => $settings['model'],
            'api_key_source' => $settings['api_key_source'],
            'ark_error_code' => $this->safeErrorField($response->json('error.code')),
            'ark_error_message' => $this->safeErrorField($response->json('error.message')),
        ]);
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
あなたは製造業の技術文書レビューを支援する公開デモ用AIです。根拠は二層に区別し、必ず日本語で簡潔に回答してください。
【実在の公開資料】ナレッジの sources にある公開規格（ISO/JIS）と NORD の公式マニュアル・カタログは、実在する公開資料として根拠にできます。可能な場合は規格番号・節（例: ISO 1122-1 1.1.3.1、ISO 5753-1、JIS Q 9001 8.5.2、B1050 p.73）を本文に含めてください。
【架空のデモレコード】data/input の文書、DEMO-Rxx ルール、数値・しきい値（1.5%、0.10–0.20mm など）、AI候補、デジタルツイン点位は、すべて公開デモ用の架空レコードです。これらのしきい値を ISO/JIS 規格の規定値として説明してはいけません。
公開規格に由来する事実と架空デモレコードは回答の中で明示的に区別し、架空レコードについては「この公開デモでは」と断ってください。
根拠が見つからない場合は「この公開デモの資料からは確認できません」と明示し、実在する規格、法令、顧客情報、数値を推測して補わないでください。
歯車形式の一部は NORD MAXXDRIVE の公式公開資料を参照しています。NORD の仕様値と架空デモの点位・判定値を混同しないでください。
ルール判定は最終的な専門判断ではありません。要確認の項目は、人が元文書とエビデンスを確認する必要があることを明示してください。
PROMPT;
    }

    private function groundingContext(): string
    {
        $payload = [
            'documents' => $this->readJsonFiles(base_path('data/input/*.json')),
            'knowledge' => $this->readJsonFile(base_path('data/knowledge/manufacturing_knowledge.json')),
            'rules' => $this->readJsonFile(base_path('data/rules/public_demo_rules.json')),
            'ai_candidates' => $this->readJsonFile(base_path('data/ai/assist_candidates.json')),
            'digital_twin' => $this->readJsonFile(public_path('data/workshop-assets.json')),
        ];

        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
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
        preg_match_all(
            '/(?:'
            .'\b(?:DEMO-R\d+|KB-\d+|AI-C\d+|DRAW-\d+|WI-\d+|INSP-\d+|ACC-\d+'
            .'|(?:RCV|STR|ASM|INSP|MNT|SHP)-\d+)\b'
            .'|(?<![A-Za-z0-9])(?:ISO(?:\/[A-Z]+)?\s?\d+(?:-\d+)?(?::\d{4})?'
            .'|JIS\s?[A-Z]\s?\d+(?::\d{4})?)(?![A-Za-z0-9])'
            .')/u',
            $answer,
            $matches,
        );

        return array_values(array_unique($matches[0] ?? []));
    }
}