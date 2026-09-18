<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * README は「API キーはサーバー側の環境変数からのみ読み込み、クライアントへは一切送出しません
 * （送信しないことを確認するテストあり）」と述べています。このクラスがその保証の実体です。
 *
 * 鍵には識別可能なカナリア文字列を使い、応答・ページ・ログのいずれにも現れないことを確認します。
 */
class ApiKeyConfidentialityTest extends TestCase
{
    private const CANARY = 'ark-canary-DO-NOT-LEAK-8f3a91c7e2b4';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ark.api_key' => self::CANARY,
            'services.ark.base_url' => 'https://ark.example.test/api/v3',
            'services.ark.model' => 'doubao-seed-2.1-pro',
            'services.ark.timeout' => 5,
        ]);
    }

    public function test_json_chat_response_never_contains_the_ark_key(): void
    {
        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => 'DEMO-R02 を確認してください。']]],
            ], 200),
        ]);

        $response = $this->postJson('/api/demo/chat', ['message' => '減速比の判定は？']);

        $response->assertOk();
        $this->assertStringNotContainsString(self::CANARY, $response->getContent());
    }

    public function test_sse_chat_response_never_contains_the_ark_key(): void
    {
        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response(
                "data: {\"choices\":[{\"delta\":{\"content\":\"DEMO-R02\"}}]}\n\ndata: [DONE]\n\n",
                200,
                ['Content-Type' => 'text/event-stream'],
            ),
        ]);

        $response = $this->post('/api/demo/chat/stream', ['message' => '減速比の判定は？']);

        $response->assertOk();
        $this->assertStringNotContainsString(self::CANARY, $response->streamedContent());
    }

    /**
     * 上流が鍵をエラーメッセージへエコーする場合でも、応答にもログにも残さないこと。
     */
    public function test_fallback_response_and_logs_never_contain_the_ark_key(): void
    {
        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response([
                'error' => [
                    'code' => 'InvalidApiKey',
                    'message' => 'The API key ' . self::CANARY . ' is invalid.',
                ],
            ], 401),
        ]);

        $logged = [];
        Log::listen(function ($message) use (&$logged): void {
            $logged[] = $message->message . ' ' . json_encode($message->context, JSON_UNESCAPED_UNICODE);
        });

        $json = $this->postJson('/api/demo/chat', ['message' => '減速比の判定は？']);
        $json->assertOk()->assertJsonPath('mode', 'grounded_fallback');
        $this->assertStringNotContainsString(self::CANARY, $json->getContent(), '鍵が JSON 応答へ漏れています。');

        $sse = $this->post('/api/demo/chat/stream', ['message' => '減速比の判定は？']);
        $sse->assertOk();
        $this->assertStringNotContainsString(self::CANARY, $sse->streamedContent(), '鍵が SSE 応答へ漏れています。');

        $this->assertStringNotContainsString(self::CANARY, implode("\n", $logged), '鍵がログへ漏れています。');
    }

    public function test_demo_page_markup_never_contains_the_ark_key(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $this->assertStringNotContainsString(self::CANARY, $response->getContent());
    }
}
