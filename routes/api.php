<?php

use App\Http\Controllers\DemoChatController;
use App\Http\Controllers\DemoKnowledgeController;
use App\Http\Controllers\DemoReviewController;
use App\Http\Controllers\DemoRuleCatalogController;
use App\Services\ArkChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/demo/review', DemoReviewController::class);
Route::get('/demo/knowledge', DemoKnowledgeController::class);
Route::get('/demo/rules', DemoRuleCatalogController::class);
Route::post('/demo/chat', DemoChatController::class)->middleware('throttle:6,1');

Route::get('/demo/chat-probe', function (ArkChatService $ark): JsonResponse {
    try {
        $result = $ark->answer('接続確認です。DEMO-R02 が存在するか一文で答えてください。');

        return response()->json([
            'ok' => true,
            'model' => $result['model'],
        ]);
    } catch (\Throwable) {
        return response()->json(['ok' => false], 503);
    }
})->middleware('throttle:1,1');
