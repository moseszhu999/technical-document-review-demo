<?php

namespace Tests\Feature;

use Tests\TestCase;

class OfficialSourcePreviewTest extends TestCase
{
    public function test_review_api_exposes_real_nord_key_page_preview_metadata(): void
    {
        $response = $this->getJson('/api/demo/review');

        $response->assertOk()
            ->assertJsonPath('public_sources.0.document_code', 'B1050')
            ->assertJsonPath('public_sources.0.key_previews.0.page', 73)
            ->assertJsonPath('public_sources.1.document_code', 'G1050')
            ->assertJsonPath('public_sources.1.key_previews.0.page', 132)
            ->assertJsonPath('public_sources.1.key_previews.1.page', 163)
            ->assertJsonPath('public_sources.2.document_code', 'PL1050')
            ->assertJsonPath('public_sources.2.key_previews.0.page', 4)
            ->assertJsonPath('public_sources.2.key_previews.1.page', 5);

        $this->assertStringStartsWith(
            'https://www.nord.com/',
            $response->json('public_sources.2.direct_pdf_url')
        );
    }

    public function test_demo_loads_official_source_preview_module(): void
    {
        $this->get('/demo')
            ->assertOk()
            ->assertSee('/js/official-source-previews.js?v=20260913-1', false);
    }
}
