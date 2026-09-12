<?php

namespace Tests\Unit;

use App\Services\CrossDocumentComparator;
use PHPUnit\Framework\TestCase;

class CrossDocumentComparatorTest extends TestCase
{
    public function test_general_attribute_difference_is_returned_with_evidence(): void
    {
        $documents = [
            $this->document('D1', 'AssemblyDrawing', 'one.json', ['material_grade' => 'STEEL-A']),
            $this->document('D2', 'InspectionReport', 'two.json', ['material_grade' => 'STEEL-B']),
        ];

        $findings = (new CrossDocumentComparator())->compare($documents);

        $this->assertCount(1, $findings);
        $this->assertSame('material_grade', $findings[0]['field']);
        $this->assertSame('needs_review', $findings[0]['status']);
        $this->assertCount(2, $findings[0]['evidence']);
    }

    public function test_equal_general_attributes_do_not_create_finding(): void
    {
        $documents = [
            $this->document('D1', 'AssemblyDrawing', 'one.json', ['part_number' => 'GP-042']),
            $this->document('D2', 'InspectionReport', 'two.json', ['part_number' => 'GP-042']),
        ];

        $this->assertSame([], (new CrossDocumentComparator())->compare($documents));
    }

    private function document(string $id, string $type, string $source, array $snapshot): array
    {
        return [
            'document_id' => $id,
            'document_type' => $type,
            'document_version' => '1',
            'source_document' => $source,
            'assets' => [[
                'asset_id' => 'GEARSET-01',
                'asset_name' => 'Gear Pair',
                'snapshot' => $snapshot,
                'locators' => [],
            ]],
        ];
    }
}
