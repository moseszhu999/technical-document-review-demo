<?php

namespace Tests\Feature;

use Tests\TestCase;

class DigitalTwinStructureVisibilityTest extends TestCase
{
    public function test_structure_visibility_extension_tracks_roof_columns_and_beams(): void
    {
        $script = (string) file_get_contents(public_path('js/digital-twin-structure-visibility.js'));

        $this->assertStringContainsString("button.textContent = 'STRUCTURE'", $script);
        $this->assertStringContainsString('isColumn', $script);
        $this->assertStringContainsString('isOverheadBeam', $script);
        $this->assertStringContainsString("[data-scene-action=\"roof\"]", $script);
        $this->assertStringContainsString('mesh.visible = structureVisible', $script);
    }

    public function test_light_loader_imports_structure_visibility_extension(): void
    {
        $loader = (string) file_get_contents(public_path('js/digital-twin-light-loader.js'));

        $this->assertStringContainsString("import('/js/digital-twin-structure-visibility.js?v=20260916-1')", $loader);
    }
}
