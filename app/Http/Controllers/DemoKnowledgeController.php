<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class DemoKnowledgeController
{
    public function __invoke(): JsonResponse
    {
        return response()->json(
            json_decode(
                file_get_contents(base_path('data/knowledge/manufacturing_knowledge.json')),
                true,
                512,
                JSON_THROW_ON_ERROR,
            )
        );
    }
}
