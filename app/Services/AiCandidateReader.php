<?php

namespace App\Services;

class AiCandidateReader
{
    /** @return array<string, mixed> */
    public function read(): array
    {
        return json_decode(
            file_get_contents(base_path('data/ai/assist_candidates.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }
}
