<?php

namespace Tests\Feature;

use Tests\TestCase;

class LocalFrontendAssetsTest extends TestCase
{
    public function test_three_runtime_is_served_locally_without_external_cdn(): void
    {
        $response = $this->get('/demo');
        $response->assertOk();

        $html = $response->getContent();

        $this->assertStringContainsString('/vendor/three/three.module.js', $html);
        $this->assertStringContainsString('/vendor/three/addons/', $html);
        $this->assertStringNotContainsString('cdn.jsdelivr.net', $html);
        $this->assertStringNotContainsString('unpkg.com', $html);
    }

    public function test_vendored_three_modules_are_committed_under_public(): void
    {
        $this->assertFileExists(public_path('vendor/three/three.module.js'));
        $this->assertFileExists(public_path('vendor/three/addons/controls/OrbitControls.js'));
    }
}