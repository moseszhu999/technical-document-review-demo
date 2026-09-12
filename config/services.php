<?php

return [
    'ark' => [
        'api_key' => env('ARK_API_KEY'),
        'base_url' => env('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
        'model' => env('ARK_MODEL', 'doubao-seed-2.1-pro'),
        'timeout' => (int) env('ARK_TIMEOUT', 25),
    ],
];
