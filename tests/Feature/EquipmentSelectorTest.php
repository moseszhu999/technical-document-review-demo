<?php

namespace Tests\Feature;

use Tests\TestCase;

class EquipmentSelectorTest extends TestCase
{
    public function test_demo_loads_explicit_equipment_selector_assets(): void
    {
        $response = $this->get('/demo');

        $response->assertOk();
        $response->assertSee('/css/digital-twin-equipment-selector.css?v=20260915-1', false);
        $response->assertSee('/js/digital-twin-equipment-selector.js?v=20260915-1', false);
    }

    public function test_equipment_selector_replaces_ambiguous_focus_control_and_reuses_canonical_selection(): void
    {
        $js = file_get_contents(public_path('js/digital-twin-equipment-selector.js'));

        $this->assertIsString($js);
        $this->assertStringContainsString('設備を選択', $js);
        $this->assertStringContainsString('[data-scene-action="focus"]', $js);
        $this->assertStringContainsString('legacyFocus.replaceWith(select)', $js);
        $this->assertStringContainsString('[data-twin-asset=', $js);
        $this->assertStringContainsString('assetLabel.click()', $js);
    }
}
