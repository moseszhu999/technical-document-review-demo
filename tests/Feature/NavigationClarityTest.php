<?php

namespace Tests\Feature;

use Tests\TestCase;

class NavigationClarityTest extends TestCase
{
    public function test_demo_uses_one_view_switcher_without_duplicate_six_step_pipeline(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $html = (string) $response->getContent();

        $this->assertStringNotContainsString('<section class="pipeline">', $html);
        $this->assertStringContainsString('画面切替', $html);
        $this->assertStringContainsString('data-view="review-view">現場レビュー</button>', $html);
        $this->assertStringContainsString('data-view="knowledge-view">ナレッジ</button>', $html);
        $this->assertStringContainsString('data-view="rules-view">ルール</button>', $html);
        $this->assertStringContainsString('data-view="chat-view">AIレビュー</button>', $html);
    }
}
