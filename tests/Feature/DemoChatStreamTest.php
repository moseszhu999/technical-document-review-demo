<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DemoChatStreamTest extends TestCase
{
    public function test_stream_endpoint_emits_sse_with_phase_delta_sources_and_done(): void
    {
        config([
            'services.ark.api_key' => 'test-only-key',
            'services.ark.base_url' => 'https://ark.example.test/api/plan/v3',
            'services.ark.model' => 'ark-code-latest',
            'services.ark.timeout' => 5,
        ]);

        $sse = implode("\n\n", [
            'data: {"choices":[{"delta":{"reasoning_content":"reasoning"}}]}',
            'data: {"choices":[{"delta":{"content":"DEMO-R02"}}]}',
            'data: {"choices":[{"delta":{"content":" は適合です"}}]}',
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
            'data: [DONE]',
        ])."\n\n";

        Http::fake([
            'https://ark.example.test/api/plan/v3/chat/completions' => Http::response($sse, 200, [
                'Content-Type' => 'text/event-stream',
            ]),
        ]);

        $response = $this->post('/api/demo/chat/stream', ['message' => '減速比の判定は？']);

        $response->assertOk();
        $this->assertStringContainsString('text/event-stream', (string) $response->headers->get('Content-Type'));

        $content = $response->streamedContent();

        $this->assertStringContainsString('event: meta', $content);
        $this->assertStringContainsString('"mode":"ark_grounded"', $content);
        $this->assertStringContainsString('event: phase', $content);
        $this->assertStringContainsString('event: delta', $content);
        $this->assertStringContainsString('"text":"DEMO-R02"', $content);
        $this->assertStringContainsString('"text":" は適合です"', $content);
        $this->assertStringContainsString('event: sources', $content);
        $this->assertStringContainsString('event: done', $content);

        Http::assertSent(function (Request $request): bool {
            return $request['stream'] === true
                && $request['model'] === 'ark-code-latest'
                && $request->hasHeader('Authorization', 'Bearer test-only-key');
        });
    }

    public function test_stream_endpoint_falls_back_over_sse_when_ark_is_not_configured(): void
    {
        config(['services.ark.api_key' => '']);

        $response = $this->post('/api/demo/chat/stream', ['message' => 'ベアリングの判定は？']);
        $response->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('"mode":"grounded_fallback"', $content);
        $this->assertStringContainsString('event: delta', $content);
        $this->assertStringContainsString('固定デモ回答', $content);
        $this->assertStringContainsString('DEMO-R03', $content);
        $this->assertStringContainsString('event: done', $content);
    }
}