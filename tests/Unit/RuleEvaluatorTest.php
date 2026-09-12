<?php

namespace Tests\Unit;

use App\Services\RuleCatalog;
use App\Services\RuleEvaluator;
use PHPUnit\Framework\TestCase;

class RuleEvaluatorTest extends TestCase
{
    public function test_public_demo_rules_return_two_review_items_and_one_pass(): void
    {
        $documents = [
            $this->document('AssemblyDrawing', [
                $this->asset('GBX-042', ['drawing_revision' => 'D3']),
                $this->asset('GEARSET-01', ['gear_ratio_design' => 12.5]),
                $this->asset('BRG-01', ['clearance_min_mm' => 0.1, 'clearance_max_mm' => 0.2]),
            ]),
            $this->document('InspectionReport', [
                $this->asset('GBX-042', ['drawing_revision' => 'D2']),
                $this->asset('GEARSET-01', ['gear_ratio_measured' => 12.62]),
                $this->asset('BRG-01', ['clearance_measured_mm' => 0.24]),
            ]),
        ];

        $catalog = $this->createMock(RuleCatalog::class);
        $catalog->method('all')->willReturn(json_decode(file_get_contents(base_path('data/rules/public_demo_rules.json')), true)['rules']);
        $results = (new RuleEvaluator($catalog))->evaluate($documents);

        $this->assertCount(3, $results);
        $this->assertSame('needs_review', $results[0]['status']);
        $this->assertSame('pass', $results[1]['status']);
        $this->assertSame('needs_review', $results[2]['status']);
        $this->assertCount(2, $results[0]['evidence']);
    }

    private function document(string $type, array $assets): array
    {
        return ['document_id' => $type, 'document_type' => $type, 'document_version' => '1', 'source_document' => strtolower($type).'.json', 'assets' => $assets];
    }

    private function asset(string $id, array $snapshot): array
    {
        return ['asset_id' => $id, 'asset_name' => $id, 'snapshot' => $snapshot, 'locators' => []];
    }
}
