<?php

namespace Tests\Unit;

use App\Services\RuleCatalog;
use App\Services\RuleEvaluator;
use Tests\TestCase;

class RuleEvaluatorBoundaryTest extends TestCase
{
    public function test_relative_tolerance_passes_at_the_exact_boundary(): void
    {
        $results = $this->evaluateWith([
            'design' => 100.0,
            'measured' => 101.5, // exactly +1.5%
        ]);

        $ratio = $this->rule($results, 'DEMO-R02');
        $this->assertSame('pass', $ratio['status']);
        $this->assertFalse($ratio['review_required']);
        $this->assertSame('pass', $ratio['output_code']);
    }

    public function test_relative_tolerance_fails_just_beyond_the_boundary(): void
    {
        $results = $this->evaluateWith([
            'design' => 100.0,
            'measured' => 101.6, // +1.6%
        ]);

        $ratio = $this->rule($results, 'DEMO-R02');
        $this->assertSame('needs_review', $ratio['status']);
        $this->assertTrue($ratio['review_required']);
        $this->assertSame('ratio_out_of_tolerance', $ratio['output_code']);
    }

    public function test_numeric_range_passes_on_both_bounds(): void
    {
        $atUpper = $this->rule($this->evaluateWith(['clearance' => 0.20]), 'DEMO-R03');
        $atLower = $this->rule($this->evaluateWith(['clearance' => 0.10]), 'DEMO-R03');

        $this->assertSame('pass', $atUpper['status']);
        $this->assertSame('pass', $atLower['status']);
    }

    public function test_numeric_range_flags_values_outside_bounds(): void
    {
        $above = $this->rule($this->evaluateWith(['clearance' => 0.21]), 'DEMO-R03');
        $below = $this->rule($this->evaluateWith(['clearance' => 0.09]), 'DEMO-R03');

        $this->assertSame('needs_review', $above['status']);
        $this->assertSame('needs_review', $below['status']);
    }

    public function test_missing_measured_value_becomes_review_not_pass_and_drops_evidence(): void
    {
        $results = $this->evaluateWith(['design' => 12.5, 'measured' => null]);

        $ratio = $this->rule($results, 'DEMO-R02');
        $this->assertSame('needs_review', $ratio['status']);

        $measuredInput = collect($ratio['inputs'])->firstWhere('name', 'measured');
        $this->assertNull($measuredInput['value']);

        $evidenceFields = collect($ratio['evidence'])->pluck('field')->all();
        $this->assertContains('assets.GEARSET-01.snapshot.gear_ratio_design', $evidenceFields);
        $this->assertNotContains('assets.GEARSET-01.snapshot.gear_ratio_measured', $evidenceFields);
    }

    public function test_every_rule_result_carries_source_locators_for_traceability(): void
    {
        $results = $this->evaluateWith([
            'design' => 12.5,
            'measured' => 12.62,
            'clearance' => 0.24,
            'revision' => 'D3',
        ]);

        foreach ($results as $result) {
            foreach ($result['evidence'] as $evidence) {
                $this->assertArrayHasKey('locator', $evidence);
                $this->assertArrayHasKey('source_document', $evidence);
            }
        }
    }

    private function evaluateWith(array $values): array
    {
        $drawingAssets = [
            $this->asset('GBX-042', ['drawing_revision' => $values['revision'] ?? 'D3']),
            $this->asset('GEARSET-01', ['gear_ratio_design' => $values['design'] ?? null]),
            $this->asset('BRG-01', ['clearance_min_mm' => 0.1, 'clearance_max_mm' => 0.2]),
        ];
        $inspectionAssets = [
            $this->asset('GBX-042', ['drawing_revision' => $values['revision'] ?? 'D3']),
            $this->asset('GEARSET-01', ['gear_ratio_measured' => $values['measured'] ?? null]),
            $this->asset('BRG-01', ['clearance_measured_mm' => $values['clearance'] ?? null]),
        ];

        $documents = [
            $this->document('AssemblyDrawing', 'assembly_drawing.json', $drawingAssets),
            $this->document('InspectionReport', 'inspection_report.json', $inspectionAssets),
        ];

        return (new RuleEvaluator(new RuleCatalog()))->evaluate($documents);
    }

    private function rule(array $results, string $ruleId): array
    {
        return collect($results)->firstWhere('rule_id', $ruleId);
    }

    private function document(string $type, string $source, array $assets): array
    {
        return [
            'document_id' => $type,
            'document_type' => $type,
            'document_version' => '1',
            'source_document' => $source,
            'assets' => $assets,
        ];
    }

    private function asset(string $id, array $snapshot): array
    {
        return [
            'asset_id' => $id,
            'asset_name' => $id,
            'snapshot' => $snapshot,
            'locators' => array_fill_keys(array_keys($snapshot), ['page' => 1]),
        ];
    }
}