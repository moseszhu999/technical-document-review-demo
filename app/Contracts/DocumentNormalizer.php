<?php

namespace App\Contracts;

interface DocumentNormalizer
{
    /**
     * 入力文書をレビュー処理で使う共通形式へ整えます。
     *
     * @return array<string, mixed>
     */
    public function normalize(array $document, string $sourceDocument): array;
}
