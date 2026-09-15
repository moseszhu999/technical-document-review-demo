<?php

namespace Tests\Feature;

use Tests\TestCase;

class GearboxModelV2Test extends TestCase
{
    public function test_demo_loads_component_level_gearbox_upgrade(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $response->assertSee('/css/gearbox-model-v2.css?v=20260915-1', false);
        $response->assertSee('/js/gearbox-model-v2.js?v=20260915-1', false);
    }

    public function test_model_upgrade_reuses_existing_part_selection_contract(): void
    {
        $js = (string) file_get_contents(public_path('js/gearbox-model-v2.js'));

        $this->assertStringContainsString('gearbox-canvas-v2', $js);
        $this->assertStringContainsString('gearHelix', $js);
        $this->assertStringContainsString('bearingAssembly', $js);
        $this->assertStringContainsString('renderer.shadowMap.enabled = true', $js);
        $this->assertStringContainsString('.part-tab[data-asset=', $js);
        $this->assertStringContainsString('tab?.click()', $js);
        $this->assertStringContainsString("GEARSET-01", $js);
        $this->assertStringContainsString("BRG-01", $js);
    }
}
