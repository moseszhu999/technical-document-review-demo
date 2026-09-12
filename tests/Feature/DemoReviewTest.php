<?php

namespace Tests\Feature;

use Tests\TestCase;

class DemoReviewTest extends TestCase
{
    public function test_demo_returns_evidence_backed_review_result(): void
    {
        $response = $this->getJson('/api/demo/review');

        $response->assertOk()
            ->assertJsonPath('case_id', 'CASE-001')
            ->assertJsonPath('summary.document_count', 4)
            ->assertJsonPath('summary.entity_count', 2)
            ->assertJsonPath('summary.finding_count', 1)
            ->assertJsonPath('summary.review_status', 'human_review_required');

        $this->assertCount(4, $response->json('evidence_chain'));
        $this->assertCount(4, $response->json('findings.0.evidence'));
    }
}
