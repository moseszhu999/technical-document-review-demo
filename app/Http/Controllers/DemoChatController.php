<?php

namespace App\Http\Controllers;

use App\Services\DemoFallbackResponder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DemoChatController
{
    public function __invoke(Request $request, DemoFallbackResponder $fallback): JsonResponse
    {
        $message = trim((string) $request->input('message', ''));

        if ($message === '') {
            return response()->json(['error' => 'メッセージを入力してください。'], 422);
        }

        if (mb_strlen($message) > 500) {
            return response()->json(['error' => 'メッセージは500文字以内で入力してください。'], 422);
        }

        try {
            $result = app(\App\Services\ArkChatService::class)->answer($message);

            return response()->json([
                'mode' => 'ark_grounded',
                'answer' => $result['answer'],
                'sources' => $result['sources'],
                'model' => $result['model'],
            ]);
        } catch (Throwable) {
            $result = $fallback->respond($message);

            return response()->json([
                'mode' => 'grounded_fallback',
                'answer' => '【' . DemoFallbackResponder::NOTICE . '】 ' . $result['answer'],
                'sources' => $result['sources'],
                'warning' => DemoFallbackResponder::NOTICE,
            ]);
        }
    }
}