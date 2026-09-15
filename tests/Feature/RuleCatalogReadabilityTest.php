<?php

namespace Tests\Feature;

use Tests\TestCase;

class RuleCatalogReadabilityTest extends TestCase
{
    public function test_rule_catalog_uses_interview_readable_type_scale(): void
    {
        $css = (string) file_get_contents(public_path('css/light-theme.css'));

        $this->assertStringContainsString('#rules-view .rule-cell label{', $css);
        $this->assertStringContainsString('font-size:12px;', $css);
        $this->assertStringContainsString('#rules-view .rule-cell strong{font-size:16px', $css);
        $this->assertStringContainsString('#rules-view .rule-cell p{font-size:14px', $css);
        $this->assertStringContainsString('#rules-view .input-stack div{font-size:14px', $css);
        $this->assertStringContainsString('#rules-view .output-code{font-size:15px', $css);
        $this->assertStringContainsString('#rules-view .review-mark{display:inline-block;margin-top:4px;font-size:14px', $css);
        $this->assertStringContainsString('footer{font-size:12px', $css);
    }
}
