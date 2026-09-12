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

        foreach (glob(base_path('data/input/*.json')) ?: [] as $file) {
            $documents[] = [
                'source' => basename($file),
                'document' => json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR),
            ];
        }

        if ($documents === []) {
            throw new RuntimeException('デモ入力文書が見つかりません。');
        }

        return response()->json($reviewService->review($documents));
    }
}
