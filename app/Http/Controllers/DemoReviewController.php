<?php

namespace App\Http\Controllers;

use App\Services\DocumentReviewService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class DemoReviewController
{
    public function __invoke(DocumentReviewService $reviewService): JsonResponse
    {
        $documents = [];
        $orderedFiles = [
            'assembly_drawing.json',
            'work_instruction.json',
            'inspection_report.json',
            'acceptance_report.json',
        ];

        foreach ($orderedFiles as $filename) {
            $file = base_path('data/input/' . $filename);
            if (! is_file($file)) {
                continue;
            }

            $documents[] = [
                'source' => $filename,
                'document' => json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR),
            ];
        }

        if ($documents === []) {
            throw new RuntimeException('デモ入力文書が見つかりません。');
        }

        $review = $reviewService->review($documents);
        $sourceRegistry = base_path('data/public_sources/nord_maxxdrive_sources.json');

        if (is_file($sourceRegistry)) {
            $registry = json_decode(file_get_contents($sourceRegistry), true, 512, JSON_THROW_ON_ERROR);
            $review['public_sources'] = $registry['sources'] ?? [];
            $review['public_source_boundary'] = $registry['boundary_note'] ?? null;
        } else {
            $review['public_sources'] = [];
            $review['public_source_boundary'] = null;
        }

        return response()->json($review);
    }
}
