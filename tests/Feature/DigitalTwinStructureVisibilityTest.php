<?php

namespace Tests\Feature;

use Tests\TestCase;

class DigitalTwinStructureVisibilityTest extends TestCase
{
    public function test_structure_visibility_extension_tracks_roof_columns_and_beams(): void
    {
        $script = (string) file_get_contents(public_path('js/digital-twin-structure-visibility.js'));

        $this->assertStringContainsString("button.textContent = 'STRUCTURE'", $script);
        $this->assertStringContainsString('THREE.Group.prototype.add', $script);
        $this->assertStringContainsString('isColumn', $script);
        $this->assertStringContainsString('isOverheadBeam', $script);
        $this->assertStringContainsString("[data-scene-action=\"roof\"]", $script);
        $this->assertStringContainsString('mesh.visible = structureVisible', $script);
    }

    public function test_structure_visibility_module_loads_before_digital_twin_scene(): void
    {
        $view = (string) file_get_contents(resource_path('views/demo.blade.php'));

        $structure = strpos($view, '/js/digital-twin-structure-visibility.js?v=20260916-1');
        $twinLoader = strpos($view, '/js/official-source-previews.js?v=20260918-2');

        $this->assertNotFalse($structure);
        $this->assertNotFalse($twinLoader);
        $this->assertLessThan($twinLoader, $structure);
    }
}
