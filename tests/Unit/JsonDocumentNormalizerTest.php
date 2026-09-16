<?php

namespace Tests\Unit;

use App\Services\JsonDocumentNormalizer;
use PHPUnit\Framework\TestCase;

class JsonDocumentNormalizerTest extends TestCase
{
    public function test_optional_fields_get_safe_defaults(): void
    {
        $normalized = (new JsonDocumentNormalizer())->normalize(
            [
                'case_id' => 'MFG-DEMO-042',
                'document_id' => 'DRAW-042',
                'document_type' => 'AssemblyDrawing',
            ],
            'assembly_drawing.json',
        );

        $this->assertSame('1', $normalized['document_version']);
        $this->assertNull($normalized['document_date']);
        $this->assertNull($normalized['document_content']);
        $this->assertSame([], $normalized['assets']);
        $this->assertSame('assembly_drawing.json', $normalized['source_document']);
    }

    public function test_provided_values_are_preserved_under_the_common_shape(): void
    {
        $normalized = (new JsonDocumentNormalizer())->normalize(
            [
                'case_id' => 'MFG-DEMO-042',
                'document_id' => 'INSP-042',
                'document_type' => 'InspectionReport',
                'document_version' => 'D2',
                'document_date' => '2026-03-01',
                'assets' => [['asset_id' => 'BRG-01']],
            ],
            'inspection_report.json',
        );

        $this->assertSame('D2', $normalized['document_version']);
        $this->assertSame('2026-03-01', $normalized['document_date']);
        $this->assertCount(1, $normalized['assets']);
    }
}