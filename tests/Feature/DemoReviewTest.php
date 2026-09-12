<?php

namespace Tests\Feature;

use Tests\TestCase;

class DemoReviewTest extends TestCase
{
    public function test_demo_returns_rule_evidence_ai_candidates_and_document_content(): void
    {
        $response = $this->getJson('/api/demo/review');

        $response->assertOk()
            ->assertJsonPath('case_id', 'MFG-DEMO-042')
            ->assertJsonPath('summary.document_count', 4)
            ->assertJsonPath('summary.entity_count', 3)
            ->assertJsonPath('summary.rule_count', 3)
            ->assertJsonPath('summary.rule_review_count', 2)
            ->assertJsonPath('summary.review_status', 'human_review_required')
            ->assertJsonCount(3, 'rule_results')
            ->assertJsonCount(3, 'ai_assist.candidates')
            ->assertJsonPath('documents.0.document_content.title', '小型減速機 GBX-042 組立図');

        $this->assertCount(4, $response->json('evidence_chain'));
        $this->assertCount(2, $response->json('rule_results.0.evidence'));
        $this->assertNotEmpty($response->json('documents.0.document_content.pages'));
        $this->assertNotEmpty($response->json('documents.2.document_content.pages'));
    }

    public function test_demo_workspace_is_available(): void
    {
        $this->get('/demo')
            ->assertOk()
            ->assertSee('製造業エビデンス・ワークスペース');
    }
}
