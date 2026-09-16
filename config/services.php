<?php

$volcArkApiKey = env('VOLC_ARK_API_KEY');
$legacyArkApiKey = env('ARK_API_KEY');

return [
    'ark' => [
        'api_key' => $volcArkApiKey ?: $legacyArkApiKey,
        'api_key_source' => $volcArkApiKey ? 'VOLC_ARK_API_KEY' : ($legacyArkApiKey ? 'ARK_API_KEY' : 'none'),
        'base_url' => env('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
        'model' => env('ARK_MODEL', 'doubao-seed-2-0-lite-260215'),
        'timeout' => (int) env('ARK_TIMEOUT', 18),
    ],
];
