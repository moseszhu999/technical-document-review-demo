<?php

namespace Tests\Feature;

use Tests\TestCase;

class LightThemeTest extends TestCase
{
    public function test_demo_loads_light_theme_after_component_styles(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $html = (string) $response->getContent();

        $chatStatus = strpos($html, '/css/chat-status.css');
        $lightTheme = strpos($html, '/css/light-theme.css?v=20260916-3');

        $this->assertNotFalse($chatStatus);
        $this->assertNotFalse($lightTheme);
        $this->assertGreaterThan($chatStatus, $lightTheme);
    }

    public function test_light_theme_declares_bright_page_and_panel_palette(): void
    {
        $css = file_get_contents(public_path('css/light-theme.css'));

        $this->assertIsString($css);
        $this->assertStringContainsString('color-scheme:light', $css);
        $this->assertStringContainsString('--bg:#f4f7fb', $css);
        $this->assertStringContainsString('--panel:#ffffff', $css);
        $this->assertStringContainsString('background:#fff', $css);
        $this->assertStringContainsString('#model-stage', $css);
        $this->assertStringContainsString('.modal-card', $css);
        $this->assertStringContainsString('.chat-bubble', $css);
    }
}
