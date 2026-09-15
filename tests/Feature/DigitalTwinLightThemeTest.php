<?php

namespace Tests\Feature;

use Tests\TestCase;

class DigitalTwinLightThemeTest extends TestCase
{
    public function test_demo_loads_runtime_digital_twin_light_theme_loader(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $response->assertSee('/js/digital-twin-light-loader.js?v=20260915-1', false);
    }

    public function test_digital_twin_light_theme_brightens_runtime_workspace(): void
    {
        $css = file_get_contents(public_path('css/digital-twin-light.css'));
        $loader = file_get_contents(public_path('js/digital-twin-light-loader.js'));

        $this->assertIsString($css);
        $this->assertIsString($loader);
        $this->assertStringContainsString('#digital-twin-root .twin-kpi', $css);
        $this->assertStringContainsString('background:linear-gradient(180deg,#ffffff 0%,#f9fbfd 100%)!important', $css);
        $this->assertStringContainsString('#digital-twin-root .twin-3d-stage', $css);
        $this->assertStringContainsString('#digital-twin-root #twin-3d-canvas', $css);
        $this->assertStringContainsString("link.href = '/css/digital-twin-light.css?v=20260915-1'", $loader);
        $this->assertStringContainsString("observer.observe(document.head, {childList: true})", $loader);
    }
}
