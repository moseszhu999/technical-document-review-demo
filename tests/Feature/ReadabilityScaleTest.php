<?php

namespace Tests\Feature;

use Tests\TestCase;

class ReadabilityScaleTest extends TestCase
{
    public function test_interview_demo_uses_readable_small_text_floor(): void
    {
        $css = file_get_contents(public_path('css/digital-twin-light.css'));

        $this->assertIsString($css);
        $this->assertStringContainsString('.nav-tab{', $css);
        $this->assertStringContainsString('font-size:13px!important', $css);
        $this->assertStringContainsString('#digital-twin-root .twin-kpi span{font-size:12px!important', $css);
        $this->assertStringContainsString('#digital-twin-root .twin-3d-asset-label strong{font-size:12px!important', $css);
        $this->assertStringContainsString('#digital-twin-root .twin-3d-hud strong,', $css);
        $this->assertStringContainsString('#digital-twin-root .twin-3d-toolbar button{font-size:11px!important', $css);
        $this->assertStringContainsString('font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif!important', $css);
    }
}
