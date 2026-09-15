<?php

namespace Tests\Feature;

use Tests\TestCase;

class FactoryContextTest extends TestCase
{
    public function test_demo_explains_factory_scenario_before_workspace_navigation(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $html = (string) $response->getContent();

        $this->assertStringContainsString('産業用減速機の組立・検査工場', $html);
        $this->assertStringContainsString('ギヤ・軸・ベアリングなどの部品を受け入れ', $html);
        $this->assertStringContainsString('部品受入', $html);
        $this->assertStringContainsString('減速機を出荷', $html);
        $this->assertLessThan(strpos($html, '画面切替'), strpos($html, '産業用減速機の組立・検査工場'));
    }

    public function test_factory_context_has_dedicated_light_theme_styles(): void
    {
        $view = (string) file_get_contents(resource_path('views/demo.blade.php'));
        $css = (string) file_get_contents(public_path('css/factory-context.css'));

        $this->assertStringContainsString('/css/factory-context.css?v=20260915-1', $view);
        $this->assertStringContainsString('.factory-context{', $css);
        $this->assertStringContainsString('.factory-flow', $css);
    }
}
