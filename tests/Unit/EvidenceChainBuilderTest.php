<?php

namespace Tests\Unit;

use App\Services\EvidenceChainBuilder;
use PHPUnit\Framework\TestCase;

class EvidenceChainBuilderTest extends TestCase
{
    public function test_documents_are_ordered_from_drawing_to_acceptance(): void
    {
        $documents = [
            $this->document('ACC-042', 'AcceptanceReport'),
            $this->document('INSP-042', 'InspectionReport'),
            $this->document('DRAW-042', 'AssemblyDrawing'),
            $this->document('WI-042', 'WorkInstruction'),
        ];

        $chain = (new EvidenceChainBuilder())->build($documents);

        $this->assertSame(
            ['DRAW-042', 'WI-042', 'INSP-042', 'ACC-042'],
            array_column($chain, 'document_id'),
        );
    }

    public function test_unknown_document_type_is_sorted_last_without_breaking_the_chain(): void
    {
        $documents = [
            $this->document('X-1', 'UnknownMemo'),
            $this->document('DRAW-042', 'AssemblyDrawing'),
        ];

        $chain = (new EvidenceChainBuilder())->build($documents);

        $this->assertSame('DRAW-042', $chain[0]['document_id']);
        $this->assertSame('X-1', $chain[1]['document_id']);
    }

    private function document(string $id, string $type): array
    {
        return [
            'document_id' => $id,
            'document_type' => $type,
            'document_version' => '1',
            'document_date' => '2026-02-12',
            'source_document' => strtolower($id).'.json',
        ];
    }
}