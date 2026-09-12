<?php

namespace App\Http\Controllers;

use App\Services\ArkChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DemoChatController
{
    public function __invoke(Request $request, ArkChatService $ark): JsonResponse
    {
        $message = trim((string) $request->input('message', ''));

        if ($message === '') {
            return response()->json(['error' => 'メッセージを入力してください。'], 422);
        }

        if (mb_strlen($message) > 500) {
            return response()->json(['error' => 'メッセージは500文字以内で入力してください。'], 422);
        }

        try {
            $result = $ark->answer($message);

            return response()->json([
                'mode' => 'ark_grounded',
                'answer' => $result['answer'],
                'sources' => $result['sources'],
                'model' => $result['model'],
            ]);
        } catch (Throwable) {
            $fallback = $this->fallback($message);

            return response()->json([
                'mode' => 'grounded_fallback',
                'answer' => $fallback['answer'],
                'sources' => $fallback['sources'],
                'warning' => 'AIサービスに接続できないため、公開デモ内の固定根拠から回答しています。',
            ]);
        }
    }

    /** @return array{answer:string,sources:array<int,string>} */
    private function fallback(string $message): array
    {
        $text = mb_strtolower($message);
        $responses = [
            [
                'keywords' => ['減速比', 'gear ratio'],
                'answer' => '減速比については DEMO-R02 を確認できます。設計値 12.50 に対して実測値は 12.62 で、この公開デモの判定では適合です。実測値は検査記録 INSP-042 の減速比測定結果に戻って確認できます。',
                'sources' => ['DEMO-R02', 'INSP-042', 'KB-002'],
            ],
            [
                'keywords' => ['ベアリング', '軸受', 'すきま', 'clearance'],
                'answer' => '出力側ベアリング（BRG-01）は DEMO-R03 の対象です。実測すきまは 0.24 mm、公開デモ用の上限は 0.20 mm なので要確認です。最終不適合とは確定せず、INSP-042 の元文書と測定条件を人が確認します。',
                'sources' => ['DEMO-R03', 'INSP-042', 'KB-003'],
            ],
            [
                'keywords' => ['改訂', 'revision', 'rev', '図面'],
                'answer' => '図面改訂については DEMO-R01 が組立図 DRAW-042 と検査記録 INSP-042 の改訂番号を比較します。今回のデモでは D3 と D2 に差異があるため要確認です。差異をそのまま誤りとはせず、元文書を確認します。',
                'sources' => ['DEMO-R01', 'DRAW-042', 'INSP-042', 'KB-001'],
            ],
            [
                'keywords' => ['ルール', 'rule'],
                'answer' => '公開デモには3つのルールがあります。図面改訂の整合、減速比の確認、ベアリングすきまの確認です。各ルールは「入力 → 判断 → 結果 → エビデンス → 人手確認」という流れで扱います。',
                'sources' => ['DEMO-R01', 'DEMO-R02', 'DEMO-R03'],
            ],
            [
                'keywords' => ['知識', 'ナレッジ', 'knowledge', '根拠', 'evidence', 'エビデンス'],
                'answer' => 'ナレッジベースには、図面改訂管理、減速比確認、ベアリングすきま確認、エビデンス追跡の4項目があります。ルールの判定だけでなく、元文書の確認位置まで戻れることを重視しています。',
                'sources' => ['KB-001', 'KB-002', 'KB-003', 'KB-004'],
            ],
        ];

        foreach ($responses as $response) {
            foreach ($response['keywords'] as $keyword) {
                if (mb_strpos($text, mb_strtolower($keyword)) !== false) {
                    return ['answer' => $response['answer'], 'sources' => $response['sources']];
                }
            }
        }

        return [
            'answer' => 'この公開デモでは、文書、ルール、エビデンス、AI候補について回答できます。たとえば「減速比は？」「ベアリングの判定は？」「図面改訂は？」「ルールを教えて」と質問してください。',
            'sources' => ['KB-004'],
        ];
    }
}
