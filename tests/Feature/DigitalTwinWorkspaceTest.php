<?php

namespace Tests\Feature;

use Tests\TestCase;

class DigitalTwinWorkspaceTest extends TestCase
{
    public function test_workshop_registry_exposes_v1_zones_assets_and_default_review_point(): void
    {
        $path = public_path('data/workshop-assets.json');
        $this->assertFileExists($path);

        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame('workshop_digital_twin_v1', $payload['schema']);
        $this->assertSame('MFG-WORKSHOP-01', $payload['workspace_id']);
        $this->assertSame('INSP-01', $payload['default_asset_id']);
        $this->assertCount(6, $payload['zones']);
        $this->assertCount(8, $payload['assets']);

        $inspection = collect($payload['assets'])->firstWhere('asset_id', 'INSP-01');
        $this->assertSame('review_required', $inspection['status']);
        $this->assertSame('GEARSET-01', $inspection['linked_entity']);
        $this->assertContains('DEMO-R02', $inspection['linked_rules']);
        $this->assertTrue($inspection['evidence_gap']);
    }

    public function test_digital_twin_frontend_assets_and_loader_are_wired(): void
    {
        $script = (string) file_get_contents(public_path('js/digital-twin.js'));
        $style = (string) file_get_contents(public_path('css/digital-twin.css'));
        $loader = (string) file_get_contents(public_path('js/official-source-previews.js'));

        $this->assertStringContainsString('WORKSHOP DIGITAL TWIN', $script);
        $this->assertStringContainsString('HUMAN CONFIRMATION', $script);
        $this->assertStringContainsString('data-twin-asset', $script);
        $this->assertStringContainsString('.twin-map', $style);
        $this->assertStringContainsString("import('/js/digital-twin.js?v=20260918-1')", $loader);
        $this->assertStringContainsString("import('/js/digital-twin-3d.js?v=20260913-1')", $loader);
    }

    public function test_webgl_workshop_twin_has_real_3d_scene_and_asset_interaction(): void
    {
        $script = (string) file_get_contents(public_path('js/digital-twin-3d.js'));
        $style = (string) file_get_contents(public_path('css/digital-twin-3d.css'));

        $this->assertStringContainsString("import * as THREE from 'three'", $script);
        $this->assertStringContainsString('OrbitControls', $script);
        $this->assertStringContainsString('new THREE.WebGLRenderer', $script);
        $this->assertStringContainsString('new THREE.PerspectiveCamera', $script);
        $this->assertStringContainsString('new THREE.Raycaster', $script);
        $this->assertStringContainsString('triggerSelection', $script);
        $this->assertStringContainsString('LIVE 3D TWIN', $script);
        $this->assertStringContainsString('#twin-3d-canvas', $style);
        $this->assertStringContainsString('.twin-3d-asset-label', $style);
        $this->assertStringContainsString('.twin-3d-stage>.twin-map{display:none!important}', $style);
    }

    public function test_ai_grounding_includes_digital_twin_registry(): void
    {
        $service = (string) file_get_contents(base_path('app/Services/ArkChatService.php'));
        $this->assertStringContainsString("'digital_twin' =>", $service);
        $this->assertStringContainsString("public_path('data/workshop-assets.json')", $service);
    }
}
