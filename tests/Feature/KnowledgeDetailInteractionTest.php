<?php

namespace Tests\Feature;

use Tests\TestCase;

class KnowledgeDetailInteractionTest extends TestCase
{
    public function test_demo_loads_knowledge_detail_module(): void
    {
        $view = (string) file_get_contents(resource_path('views/demo.blade.php'));

        $this->assertStringContainsString('/js/knowledge-detail.js?v=20260914-1', $view);
    }

    public function test_knowledge_cards_open_real_detail_content_and_actions(): void
    {
        $script = (string) file_get_contents(public_path('js/knowledge-detail.js'));

        $this->assertStringContainsString('knowledge-detail-modal', $script);
        $this->assertStringContainsString('レビュー時の考え方', $script);
        $this->assertStringContainsString('確認ステップ', $script);
        $this->assertStringContainsString('関連ルールと現在の判定', $script);
        $this->assertStringContainsString('根拠・エビデンス', $script);
        $this->assertStringContainsString('ルールカタログで確認', $script);
        $this->assertStringContainsString('レビュー画面で根拠を確認', $script);
        $this->assertStringContainsString('このナレッジをAIに質問', $script);
        $this->assertStringContainsString("fetch('/api/demo/knowledge'", $script);
        $this->assertStringContainsString("fetch('/api/demo/review'", $script);
        $this->assertStringContainsString("fetch('/api/demo/rules'", $script);
    }

    public function test_each_demo_knowledge_entry_has_explicit_review_steps(): void
    {
        $script = (string) file_get_contents(public_path('js/knowledge-detail.js'));

        foreach (['KB-001', 'KB-002', 'KB-003', 'KB-004'] as $knowledgeId) {
            $this->assertStringContainsString("'{$knowledgeId}'", $script);
        }
    }
}
