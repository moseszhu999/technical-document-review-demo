<?php

namespace Tests\Unit;

use App\Services\DocumentReviewService;
use RuntimeException;
use Tests\TestCase;

class DocumentReviewServiceTest extends TestCase
{
    public function test_review_aggregates_rules_findings_evidence_and_summary(): void
    {
        $review = $this->service()->review([
            $this->input('assembly_drawing.json', $this->drawingDocument()),
            $this->input('inspection_report.json', $this->inspectionDocument()),
        ]);

        $this->assertSame('MFG-DEMO-042', $review['case_id']);
        $this->assertSame(2, $review['summary']['document_count']);
        $this->assertSame(3, $review['summary']['rule_count']);
        $this->assertGreaterThanOrEqual(2, $review['summary']['rule_review_count']);
        $this->assertSame('human_review_required', $review['summary']['review_status']);
        $this->assertArrayHasKey('evidence_chain', $review);
        $this->assertArrayHasKey('ai_assist', $review);
    }

    public function test_documents_from_different_cases_are_rejected(): void
    {
        $drawing = $this->drawingDocument();
        $inspection = $this->inspectionDocument();
        $inspection['case_id'] = 'MFG-DEMO-999';

        $this->expectException(RuntimeException::class);

        $this->service()->review([
            $this->input('assembly_drawing.json', $drawing),
            $this->input('inspection_report.json', $inspection),
        ]);
    }

    private function service(): DocumentReviewService
    {
        return new DocumentReviewService(
            new \App\Services\JsonDocumentNormalizer(),
            new \App\Services\CrossDocumentComparator(),
            new \App\Services\EvidenceChainBuilder(),
            new \App\Services\RuleEvaluator(new \App\Services\RuleCatalog()),
            new \App\Services\AiCandidateReader(),
        );
    }

    private function input(string $source, array $document): array
    {
        return ['source' => $source, 'document' => $document];
    }

    private function drawingDocument(): array
    {
        return [
            'case_id' => 'MFG-DEMO-042',
            'document_id' => 'DRAW-042',
            'document_type' => 'AssemblyDrawing',
            'document_version' => 'D3',
            'source_document' => 'assembly_drawing.json',
            'assets' => [
                ['asset_id' => 'GBX-042', 'asset_name' => 'Assembly', 'snapshot' => ['drawing_revision' => 'D3']],
                ['asset_id' => 'GEARSET-01', 'asset_name' => 'Gear Pair', 'snapshot' => ['gear_ratio_design' => 12.5]],
                ['asset_id' => 'BRG-01', 'asset_name' => 'Bearing', 'snapshot' => ['clearance_min_mm' => 0.1, 'clearance_max_mm' => 0.2]],
            ],
        ];
    }

    private function inspectionDocument(): array
    {
        return [
            'case_id' => 'MFG-DEMO-042',
            'document_id' => 'INSP-042',
            'document_type' => 'InspectionReport',
            'document_version' => 'D2',
            'source_document' => 'inspection_report.json',
            'assets' => [
                ['asset_id' => 'GBX-042', 'asset_name' => 'Assembly', 'snapshot' => ['drawing_revision' => 'D2']],
                ['asset_id' => 'GEARSET-01', 'asset_name' => 'Gear Pair', 'snapshot' => ['gear_ratio_measured' => 12.62]],
                ['asset_id' => 'BRG-01', 'asset_name' => 'Bearing', 'snapshot' => ['clearance_measured_mm' => 0.24]],
            ],
        ];
    }
}