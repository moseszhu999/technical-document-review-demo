<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('demo:about', function (): void {
    $this->comment('Technical Document Review Demo');
})->purpose('デモ情報を表示します');
