<?php

namespace Tests\Feature;

use Tests\TestCase;

class JapaneseLocalizationTest extends TestCase
{
    public function test_demo_loads_japanese_localization_layer(): void
    {
        $view = (string) file_get_contents(resource_path('views/demo.blade.php'));
        $this->assertStringContainsString('/js/japanese-localization.js?v=20260914-1', $view);
    }

    public function test_localization_covers_visible_digital_twin_and_source_labels(): void
    {
        $script = (string) file_get_contents(public_path('js/japanese-localization.js'));

        $this->assertStringContainsString("'WORKSHOP DIGITAL TWIN': '製造現場デジタルツイン'", $script);
        $this->assertStringContainsString("'REVIEW REQUIRED': '要確認'", $script);
        $this->assertStringContainsString("'LIVE 3D TWIN': '3Dデジタルツイン'", $script);
        $this->assertStringContainsString("'Ratio Inspection Bench': '減速比検査台'", $script);
        $this->assertStringContainsString("'NORD · OFFICIAL PUBLIC SOURCE': 'NORD · 公式公開資料'", $script);
        $this->assertStringContainsString("'Publisher': '発行元'", $script);
        $this->assertStringContainsString("'Inspection and maintenance intervals': '点検・保全間隔'", $script);
        $this->assertStringContainsString('MutationObserver', $script);
    }
}
