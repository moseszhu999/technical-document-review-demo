<?php

namespace App\Providers;

use App\Contracts\DocumentNormalizer;
use App\Services\JsonDocumentNormalizer;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DocumentNormalizer::class, JsonDocumentNormalizer::class);
    }

    public function boot(): void
    {
        // 公開サンプルに固有のブート処理はありません。
    }
}
