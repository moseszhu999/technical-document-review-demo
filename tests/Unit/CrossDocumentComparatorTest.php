<?php

namespace Tests\Unit;

use App\Services\CrossDocumentComparator;
use PHPUnit\Framework\TestCase;

class CrossDocumentComparatorTest extends TestCase
{
    public function test_difference_is_returned_once_with_all_evidence(): void
    {
        $documents = [
            [
                'document_id' => 'D1',
                'document_type' => 'ProjectSummary',
                'document_version' => '1.0',
                'source_document' => 'one.json',
                'assets' => [[
                    'asset_id' => 'A1',
                    'asset_name' => 'Equipment A',
                    'snapshot' => ['installation_reference' => 'REF-01'],
                ]],
            ],
            [
                'document_id' => 'D2',
                'document_type' => 'InspectionRecord',
                'document_version' => '1.0',
                'source_document' => 'two.json',
                'assets' => [[
                    'asset_id' => 'A1',
                    'asset_name' => 'Equipment A',
                    'snapshot' => ['installation_reference' => 'REF-02'],
                ]],
            ],
        ];

        $findings = (new CrossDocumentComparator())->compare($documents);

        $this->assertCount(1, $findings);
        $this->assertSame('needs_review', $findings[0]['status']);
        $this->assertSame('installation_reference', $findings[0]['field']);
        $this->assertCount(2, $findings[0]['evidence']);
    }

    public function test_equal_values_do_not_create_a_finding(): void
    {
        $documents = [
            [
                'document_id' => 'D1',
                'document_type' => 'ProjectSummary',
                'document_version' => '1.0',
                'source_document' => 'one.json',
                'assets' => [[
                    'asset_id' => 'A1',
                    'asset_name' => 'Equipment A',
                    'snapshot' => ['equipment_model' => 'MODEL-1'],
                ]],
            ],
            [
                'document_id' => 'D2',
                'document_type' => 'InspectionRecord',
                'document_version' => '1.0',
                'source_document' => 'two.json',
                'assets' => [[
                    'asset_id' => 'A1',
                    'asset_name' => 'Equipment A',
                    'snapshot' => ['equipment_model' => 'MODEL-1'],
                ]],
            ],
        ];

        $this->assertSame([], (new CrossDocumentComparator())->compare($documents));
    }
}
