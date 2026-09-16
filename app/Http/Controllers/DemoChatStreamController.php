<?php

namespace App\Http\Controllers;

use App\Services\ArkChatService;
use App\Services\DemoFallbackResponder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DemoChatStreamController
{
    public function __invoke(
        Request $request,
        ArkChatService $ark,
        DemoFallbackResponder $fallback,
    ): StreamedResponse {
        $message = trim((string) $request->input('message', ''));

        $headers = [
            'Content-Type' => 'text/event-stream; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ];

        return response()->stream(function () use ($message, $ark, $fallback): void {
            @set_time_limit(90);

            $emit = function (string $event, array $data): void {
                echo 'event: ' . $event . "\n";
                echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            if ($message === '') {
                $emit('error', ['message' => 'メッセージを入力してください。']);
                return;
            }

            if (mb_strlen($message) > 500) {
                $emit('error', ['message' => 'メッセージは500文字以内で入力してください。']);
                return;
            }

            try {
                $emit('meta', ['mode' => 'ark_grounded']);

                foreach ($ark->streamAnswer($message) as $chunk) {
                    $emit(($chunk['type'] ?? 'delta'), $chunk);
                }

                $emit('done', ['ok' => true]);
            } catch (Throwable) {
                $result = $fallback->respond($message);

                $emit('meta', ['mode' => 'grounded_fallback', 'warning' => DemoFallbackResponder::NOTICE]);
                $emit('delta', ['text' => '【' . DemoFallbackResponder::NOTICE . '】 ' . $result['answer']]);
                $emit('sources', ['sources' => $result['sources']]);
                $emit('done', ['ok' => true]);
            }
        }, 200, $headers);
    }
}