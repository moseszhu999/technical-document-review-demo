<?php

namespace Tests\Feature;

use Tests\TestCase;

class KnowledgeGroundingTest extends TestCase
{
    private const ALLOWED_HOSTS = [
        'www.iso.org',
        'iso.org',
        'webdesk.jsa.or.jp',
        'www.jbia.or.jp',
    ];

    /** @return array<string, mixed> */
    private function knowledge(): array
    {
        return json_decode(
            file_get_contents(base_path('data/knowledge/manufacturing_knowledge.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    /** @return array<string, mixed> */
    private function registry(): array
    {
        return json_decode(
            file_get_contents(base_path('data/public_sources/nord_maxxdrive_sources.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    public function test_schema_is_v2_and_keeps_four_entries(): void
    {
        $knowledge = $this->knowledge();

        $this->assertSame('public_demo_knowledge_v2', $knowledge['schema']);
        $ids = array_column($knowledge['items'], 'knowledge_id');
        $this->assertSame(['KB-001', 'KB-002', 'KB-003', 'KB-004'], $ids);
    }

    public function test_each_entry_has_real_sources_with_allowed_hosts(): void
    {
        foreach ($this->knowledge()['items'] as $item) {
            $this->assertNotEmpty($item['sources'] ?? [], $item['knowledge_id'].' has no sources');

            foreach ($item['sources'] as $source) {
                if (($source['type'] ?? null) === 'standard') {
                    $this->assertArrayHasKey('code', $source);
                    $this->assertArrayHasKey('title', $source);
                    $url = (string) $source['url'];
                    $this->assertStringStartsWith('https://', $url, $item['knowledge_id']);
                    $this->assertContains(parse_url($url, PHP_URL_HOST), self::ALLOWED_HOSTS);
                }
            }
        }
    }

    public function test_official_manual_refs_resolve_and_pages_are_registered(): void
    {
        $registry = $this->registry();
        $byId = collect($registry['sources'])->keyBy('source_id');

        foreach ($this->knowledge()['items'] as $item) {
            foreach ($item['sources'] ?? [] as $source) {
                if (($source['type'] ?? null) !== 'official_manual') {
                    continue;
                }

                $registered = $byId->get($source['registry_ref']);
                $this->assertNotNull($registered, $source['registry_ref'].' missing from registry');

                if (! empty($source['page'])) {
                    preg_match_all('/\d+/', (string) $source['page'], $matches);
                    $registeredPages = array_column($registered['key_previews'] ?? [], 'page');
                    foreach ($matches[0] as $pageNumber) {
                        $this->assertContains((int) $pageNumber, $registeredPages);
                    }
                }
            }
        }
    }

    public function test_demo_thresholds_are_marked_fictional_in_guidance(): void
    {
        $items = collect($this->knowledge()['items'])->keyBy('knowledge_id');

        $this->assertStringContainsString('架空', $items['KB-002']['guidance']);
        $this->assertStringContainsString('架空', $items['KB-003']['guidance']);
        $this->assertStringContainsString('ISO 1122-1', $items['KB-002']['guidance']);
        $this->assertStringContainsString('ISO 5753-1', $items['KB-003']['guidance']);
    }

    public function test_g1050_registers_ratio_nomenclature_and_exact_ratio_pages(): void
    {
        $g1050 = collect($this->registry()['sources'])->firstWhere('source_id', 'NORD-G1050');
        $pages = array_column($g1050['key_previews'], 'page');

        foreach ([36, 88, 89] as $page) {
            $this->assertContains($page, $pages);
        }
    }
}
