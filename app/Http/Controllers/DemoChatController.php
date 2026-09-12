<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoChatController
{
    public function __invoke(Request $request): JsonResponse
    {
        $message = trim((string) $request->input('message', ''));

        if ($message === '') {
            return response()->json(['error' => 'メッセージを入力してください。'], 422);
        }

        $text = mb_strtolower($message);
        $responses = [
            [
                'keywords' => ['減速比', 'gear ratio'],
                'answer' => '減速比については DEMO-R02 を確認できます。設計値 12.50 に対して実測値は 12.62 で、この公開デモの判定では PASS です。実測値の候補は AI-C01 から抽出され、検査記録の Evidence に戻れる設計です。',
                'sources' => ['DEMO-R02', 'AI-C01', 'KB-002']
            ],
            [
                'keywords' => ['ベアリング', '軸受', 'すきま', 'clearance'],
                'answer' => 'Output Bearing（BRG-01）は DEMO-R03 の対象です。実測すきまは 0.24 mm、デモ用の上限は 0.20 mm なので NEEDS_REVIEW です。これは自動的な最終不合格ではなく、Evidence を確認した上で人が判断する設計です。',
                'sources' => ['DEMO-R03', 'KB-003']
            ],
            [
                'keywords' => ['改訂', 'revision', 'rev', '図面'],
                'answer' => '図面改訂については DEMO-R01 が組立図と検査記録の Rev を比較します。今回のデモでは D3 と D2 に差異があるため NEEDS_REVIEW です。差異＝誤りとはせず、元文書を確認するところまでをシステムの責任範囲にしています。',
                'sources' => ['DEMO-R01', 'AI-C03', 'KB-001']
            ],
            [
                'keywords' => ['ルール', 'rule'],
                'answer' => '公開デモには3つのルールがあります。図面改訂の整合、減速比の確認、ベアリングすきまの確認です。各ルールは「入力 → 判断 → 結果 → Evidence → Human Review」という流れで表示しています。',
                'sources' => ['DEMO-R01', 'DEMO-R02', 'DEMO-R03']
            ],
            [
                'keywords' => ['知識', 'knowledge', '根拠', 'evidence'],
                'answer' => 'Knowledge Base には、図面改訂管理、減速比確認、ベアリングすきま確認、Evidence 追跡の4項目があります。ルールの判断だけでなく、どの文書を確認すべきかまでたどれるようにしています。',
                'sources' => ['KB-001', 'KB-002', 'KB-003', 'KB-004']
            ],
        ];

        foreach ($responses as $response) {
            foreach ($response['keywords'] as $keyword) {
                if (mb_strpos($text, mb_strtolower($keyword)) !== false) {
                    return response()->json([
                        'mode' => 'grounded_demo',
                        'answer' => $response['answer'],
                        'sources' => $response['sources'],
                    ]);
                }
            }
        }

        return response()->json([
            'mode' => 'grounded_demo',
            'answer' => 'このデモでは、文書、ルール、Evidence、AI候補について回答できます。たとえば「減速比は？」「ベアリングの判定は？」「図面改訂は？」「ルールを教えて」と質問してください。',
            'sources' => ['KB-004'],
        ]);
    }
}
