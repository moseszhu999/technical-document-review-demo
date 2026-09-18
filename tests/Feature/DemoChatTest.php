<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DemoChatTest extends TestCase
{
    public function test_chat_uses_ark_and_sends_only_server_side_key(): void
    {
        config([
            'services.ark.api_key' => 'test-only-key',
            'services.ark.base_url' => 'https://ark.example.test/api/v3',
            'services.ark.model' => 'doubao-seed-2.1-pro',
            'services.ark.timeout' => 5,
        ]);

        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => 'DEMO-R02 と INSP-042 を根拠にすると、減速比は公開デモ上で適合です。',
                    ],
                ]],
            ], 200),
        ]);

        $response = $this->postJson('/api/demo/chat', ['message' => '減速比の判定は？']);

        $response->assertOk()
            ->assertJsonPath('mode', 'ark_grounded')
            ->assertJsonPath('model', 'doubao-seed-2.1-pro')
            ->assertJsonPath('sources.0', 'DEMO-R02');

        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'https://ark.example.test/api/v3/chat/completions'
                && $request['model'] === 'doubao-seed-2.1-pro'
                && str_contains((string) $request['messages'][1]['content'], '架空のデモレコード')
                && str_contains((string) $request['messages'][1]['content'], 'DEMO-R02')
                && $request->hasHeader('Authorization', 'Bearer test-only-key');
        });
    }

    public function test_chat_falls_back_when_ark_is_not_configured(): void
    {
        config(['services.ark.api_key' => '']);

        $response = $this->postJson('/api/demo/chat', ['message' => 'ベアリングの判定は？']);

        $response->assertOk()
            ->assertJsonPath('mode', 'grounded_fallback')
            ->assertJsonPath('sources.0', 'DEMO-R03');
    }

    public function test_chat_extracts_iso_and_jis_citations_as_sources(): void
    {
        config([
            'services.ark.api_key' => 'test-only-key',
            'services.ark.base_url' => 'https://ark.example.test/api/v3',
            'services.ark.model' => 'doubao-seed-2.1-pro',
            'services.ark.timeout' => 5,
        ]);

        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => '減速比の定義はISO 1122-1:1998で定義され、文書管理はJIS Q 9001:2015およびJIS B 1702でも参照されます。',
                    ],
                ]],
            ], 200),
        ]);

        $response = $this->postJson('/api/demo/chat', ['message' => '定義は？']);

        $response->assertOk();
        $sources = $response->json('sources');
        $this->assertContains('ISO 1122-1:1998', $sources);
        $this->assertContains('JIS Q 9001:2015', $sources);
        $this->assertContains('JIS B 1702', $sources);
    }
}
