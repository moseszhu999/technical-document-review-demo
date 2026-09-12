<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class DemoRuleCatalogController
{
    public function __invoke(): JsonResponse
    {
        return response()->json(
            json_decode(
                file_get_contents(base_path('data/rules/public_demo_rules.json')),
                true,
                512,
                JSON_THROW_ON_ERROR,
            )
        );
    }
}
