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
            'data: {"choices":[{"delta":{"content":"SHOULD-NOT-BE-READ"}}]}',
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
        $this->assertStringNotContainsString('SHOULD-NOT-BE-READ', $content);

        Http::assertSent(function (Request $request): bool {
            return $request['stream'] === true
                && $request['model'] === 'ark-code-latest'
                && $request->hasHeader('Authorization', 'Bearer test-only-key');
        });
    }

    public function test_stream_client_has_done_short_circuit_and_hard_timeout(): void
    {
        $script = (string) file_get_contents(public_path('js/gearbox-demo.js'));

        $this->assertStringContainsString('new AbortController()', $script);
        $this->assertStringContainsString('signal: controller.signal', $script);
        $this->assertStringContainsString("event === 'done'", $script);
        $this->assertStringContainsString('reader.cancel()', $script);
        $this->assertStringContainsString('75000', $script);
    }

    public function test_workspace_data_requests_share_single_flight_cache_across_panels(): void
    {
        $cache = (string) file_get_contents(public_path('js/demo-api-cache.js'));
        $blade = (string) file_get_contents(resource_path('views/demo.blade.php'));
        $scripts = [
            (string) file_get_contents(public_path('js/gearbox-demo.js')),
            (string) file_get_contents(public_path('js/knowledge-detail.js')),
            (string) file_get_contents(public_path('js/official-source-previews.js')),
            (string) file_get_contents(public_path('js/digital-twin.js')),
        ];

        $this->assertStringContainsString('const inflight = new Map()', $cache);
        $this->assertStringContainsString('const cache = new Map()', $cache);
        $this->assertStringContainsString('window.DemoApi = Object.freeze({getJson})', $cache);

        foreach ($scripts as $script) {
            $this->assertStringContainsString("window.DemoApi.getJson('/api/demo/review')", $script);
            $this->assertStringNotContainsString("fetch('/api/demo/review'", $script);
        }

        $this->assertStringContainsString("window.DemoApi.getJson('/api/demo/knowledge')", $scripts[0]);
        $this->assertStringContainsString("window.DemoApi.getJson('/api/demo/rules')", $scripts[0]);
        $this->assertStringContainsString("window.DemoApi.getJson('/api/demo/knowledge')", $scripts[1]);
        $this->assertStringContainsString("window.DemoApi.getJson('/api/demo/rules')", $scripts[1]);

        $cachePos = strpos($blade, '/js/demo-api-cache.js');
        $this->assertNotFalse($cachePos);
        $this->assertLessThan(strpos($blade, '/js/gearbox-demo.js'), $cachePos);
        $this->assertLessThan(strpos($blade, '/js/official-source-previews.js'), $cachePos);
        $this->assertLessThan(strpos($blade, '/js/knowledge-detail.js'), $cachePos);
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