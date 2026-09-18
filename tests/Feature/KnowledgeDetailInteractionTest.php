<?php

namespace Tests\Feature;

use Tests\TestCase;

class KnowledgeDetailInteractionTest extends TestCase
{
    public function test_demo_loads_knowledge_detail_module(): void
    {
        $view = (string) file_get_contents(resource_path('views/demo.blade.php'));

        $this->assertStringContainsString('/js/knowledge-detail.js?v=20260918-3', $view);
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
        $this->assertStringContainsString("fetchJson('/api/demo/knowledge'", $script);
        $this->assertStringContainsString("fetchJson('/api/demo/review'", $script);
        $this->assertStringContainsString("fetchJson('/api/demo/rules'", $script);
        $this->assertStringContainsString('出典・参考資料', $script);
        $this->assertStringContainsString('knowledge-sources', $script);
        $this->assertStringContainsString('noopener noreferrer', $script);
        $this->assertStringContainsString('public_sources', $script);
    }

    public function test_each_demo_knowledge_entry_has_explicit_review_steps(): void
    {
        $script = (string) file_get_contents(public_path('js/knowledge-detail.js'));

        foreach (['KB-001', 'KB-002', 'KB-003', 'KB-004'] as $knowledgeId) {
            $this->assertStringContainsString("'{$knowledgeId}'", $script);
        }
    }

    /**
     * decorateKnowledgeCards() is the callback of the #knowledge-list MutationObserver.
     * If it registers a promise callback, that callback runs as a microtask and writes
     * back into the observed subtree, which re-fires the observer and registers another
     * callback. Microtasks never yield the event loop, so the page deadlocks.
     */
    public function test_knowledge_card_decorator_does_not_reenter_its_own_observer(): void
    {
        $script = (string) file_get_contents(public_path('js/knowledge-detail.js'));
        $body = $this->functionBody($script, 'decorateKnowledgeCards');

        $this->assertStringNotContainsString(
            'dataPromise.then',
            $body,
            'decorateKnowledgeCards runs inside the #knowledge-list observer; registering dataPromise.then there re-enters the observer on every mutation and deadlocks the page.'
        );
    }

    /**
     * The source-count pill lives inside #knowledge-list, which the observer watches for
     * childList changes. Writing its text unconditionally mutates the observed subtree even
     * when the value is unchanged, which re-fires the observer forever.
     */
    public function test_knowledge_source_count_pill_only_writes_when_value_changes(): void
    {
        $script = (string) file_get_contents(public_path('js/knowledge-detail.js'));

        $this->assertMatchesRegularExpression(
            '/if \(chip\.textContent !== [^)]+\)\s*\{?\s*chip\.textContent =/',
            $script,
            'The source-count pill must compare before writing; an unconditional write re-fires the #knowledge-list observer.'
        );
    }

    /**
     * Extract a function body by brace matching so tests can assert on the code that
     * actually runs inside an observer callback, not just anywhere in the file.
     */
    private function functionBody(string $script, string $functionName): string
    {
        $start = strpos($script, "function {$functionName}(");
        $this->assertNotFalse($start, "Function {$functionName} was not found.");

        $open = strpos($script, '{', (int) $start);
        $this->assertNotFalse($open, "Function {$functionName} has no body.");

        $depth = 0;
        $length = strlen($script);

        for ($i = (int) $open; $i < $length; $i++) {
            if ($script[$i] === '{') {
                $depth++;
            } elseif ($script[$i] === '}') {
                $depth--;

                if ($depth === 0) {
                    return substr($script, (int) $open, $i - (int) $open + 1);
                }
            }
        }

        $this->fail("Function {$functionName} body is not brace-balanced.");
    }
}
