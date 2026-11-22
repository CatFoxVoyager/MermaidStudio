import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { detectDiagramType } from '../diagramType';
import { DIAGRAM_LABELS } from '@/constants/diagramLabels';
import { TEMPLATES } from '@/constants/templates';
import { getStylingCapabilities, supportsElkLayout } from '@/types';
import {
  applyStyleToContent,
  deriveThemeVariablesForDiagramType,
  extractStyleOptionsFromContent,
} from '@/constants/themeDerivation';
import { builtinThemes } from '@/constants/themes';
import { initMermaid, renderDiagram } from '../core';
import { mermaidCompletions } from '../autocomplete';
import {
  collectAgentflowDiagnostics,
  mapAgentflowDiagnosticsToCodeMirror,
} from '../agentflowDiagnostics';
import { buildFixSystemPrompt, buildSystemPrompt } from '@/components/ai/mermaidSystemPrompt';
import { getMermaidContext } from '@/services/ai/MermaidRAGService';

describe('Phase 46 — Agentflow diagram family (AGF-01..AGF-04)', () => {
  beforeEach(() => {
    initMermaid('light', 'base', null);
  });

  describe('AGF-01: Detection, labels, capabilities, theme derivation & config round-trip', () => {
    it('detects both agentflow-beta and agentflow headers (with or without frontmatter)', () => {
      expect(detectDiagramType('agentflow-beta TB\n  flow f["F"]\n    a@{ shape: input }\n  end')).toBe('agentflow');
      expect(detectDiagramType('agentflow LR\n  flow f["F"]\n    a@{ shape: input }\n  end')).toBe('agentflow');
      expect(
        detectDiagramType('---\ntitle: My Flow\n---\nagentflow-beta TB\n  flow f["F"]\n  end')
      ).toBe('agentflow');
    });

    it('registers Agentflow label, ELK support, and non-visual-editing capabilities', () => {
      expect(DIAGRAM_LABELS.agentflow).toBe('Agentflow');
      expect(supportsElkLayout('agentflow')).toBe(true);
      const caps = getStylingCapabilities('agentflow');
      expect(caps.supportsVisualEditing).toBe(false);
      expect(caps.supportsAgentflowConfig).toBe(true);
      expect(caps.supportsClassDef).toBe(true);
    });

    it('derives flowContainerStroke for agentflow in light and dark modes', () => {
      const palette = builtinThemes[0].coreColors;
      const lightVars = deriveThemeVariablesForDiagramType(palette, false, 'agentflow');
      const darkVars = deriveThemeVariablesForDiagramType(palette, true, 'agentflow');
      expect(typeof lightVars.flowContainerStroke).toBe('string');
      expect(typeof darkVars.flowContainerStroke).toBe('string');
      expect(String(lightVars.flowContainerStroke)).toMatch(/^#/);
    });

    it('round-trips config.agentflow options losslessly while preserving frontmatter siblings', () => {
      const source = `---
title: Support Agent
---
agentflow-beta TB
  flow triage["Triage"]
    inp@{ shape: input, label: "Ticket" }
    t1@{ shape: task, label: "Classify" }
    inp --> t1
  end`;

      const updated = applyStyleToContent(
        source,
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 16,
          nodeSpacing: 65,
          rankSpacing: 70,
          wrappingWidth: 180,
          minNodeWidth: 140,
          diagramPadding: 16,
          layoutEngine: 'elk.rectpacking',
        },
        false
      );

      expect(updated).toMatch(/title:\s*'?Support Agent'?/);
      expect(updated).toMatch(/layout:\s*'?elk\.rectpacking'?/);
      expect(updated).toContain('agentflow:');
      expect(updated).toContain('wrappingWidth: 180');
      expect(updated).toContain('minNodeWidth: 140');
      expect(updated).toContain('diagramPadding: 16');

      const extracted = extractStyleOptionsFromContent(updated);
      expect(extracted.nodeSpacing).toBe(65);
      expect(extracted.rankSpacing).toBe(70);
      expect(extracted.wrappingWidth).toBe(180);
      expect(extracted.minNodeWidth).toBe(140);
      expect(extracted.diagramPadding).toBe(16);
      expect(extracted.layoutEngine).toBe('elk.rectpacking');
    });
  });

  describe('AGF-02: Curated template & autocomplete', () => {
    it('ships a curated agentflow template that renders cleanly via renderDiagram', { timeout: 30000 }, async () => {
      const tpl = TEMPLATES.find(t => t.type === 'agentflow');
      expect(tpl).toBeDefined();
      expect(tpl?.id).toBe('agentflow-support-triage');
      const { svg, error } = await renderDiagram(tpl!.content, 'agf_tpl_test');
      expect(error).toBeNull();
      expect(svg).toContain('<svg');
      expect(svg).toMatch(/<(path|rect|polygon)[\s>]/);
    });

    it('offers Agentflow starters on line 1 and Agentflow completions inside body', () => {
      const starterState = EditorState.create({ doc: 'agent' });
      const starterRes = mermaidCompletions(new CompletionContext(starterState, 5, true));
      expect(starterRes?.options.some(o => o.label === 'agentflow-beta TB')).toBe(true);

      const bodyDoc = 'agentflow-beta TB\n  fl';
      const bodyState = EditorState.create({ doc: bodyDoc });
      const bodyRes = mermaidCompletions(new CompletionContext(bodyState, bodyDoc.length, true));
      expect(bodyRes?.options.some(o => o.label === 'flow')).toBe(true);

      const shapeDoc = 'agentflow-beta TB\n  t1@';
      const shapeState = EditorState.create({ doc: shapeDoc });
      const shapeRes = mermaidCompletions(new CompletionContext(shapeState, shapeDoc.length, true));
      expect(shapeRes?.options.some(o => o.label.includes('shape: task'))).toBe(true);
      expect(shapeRes?.options.some(o => o.label.includes('elk.rectpacking'))).toBe(true);
    });
  });

  describe('AGF-03: Non-blocking Agentflow semantic diagnostics', () => {
    it('returns zero warnings for the clean curated Agentflow template', async () => {
      const tpl = TEMPLATES.find(t => t.type === 'agentflow')!;
      const diags = await collectAgentflowDiagnostics(tpl.content);
      expect(diags).toEqual([]);
    });

    it('emits structured warnings for unsupported/removed shapes, missing flow input, orphan task, unresolved connectorRef, labeled reference edge, and unguarded decision', async () => {
      const broken = `---
title: Diagnostics Probe
---
agentflow-beta TB
  orphan@{ shape: task, label: "Outside Flow" }
  flow f1["No Input Flow"]
    weird@{ shape: cloud, label: "Cloud" }
    removed@{ shape: stadium, label: "Old Stadium" }
    t1@{ shape: tool, label: "Call", connectorRef: "missing_conn" }
    d1@{ shape: decision, label: "Check?" }
    a1@{ shape: action, label: "Act" }
    weird --> removed --> t1
    t1 -.-|bad label| a1
    d1 --> a1
  end`;

      const diags = await collectAgentflowDiagnostics(broken);
      const ids = new Set(diags.map(d => d.id));
      expect(ids.has('SHAPE_UNSUPPORTED')).toBe(true);
      expect(ids.has('SHAPE_REMOVED')).toBe(true);
      expect(ids.has('TASK_OUTSIDE_FLOW')).toBe(true);
      expect(ids.has('FLOW_NO_INPUT')).toBe(true);
      expect(ids.has('CONNECTOR_REF_UNRESOLVED')).toBe(true);
      expect(ids.has('REFERENCE_EDGE_LABEL_REJECTED')).toBe(true);
      expect(ids.has('EDGE_SEMANTIC_CONTRADICTION')).toBe(true);
      expect(ids.has('DECISION_BRANCH_UNGUARDED')).toBe(true);

      const state = EditorState.create({ doc: broken });
      const cmDiags = mapAgentflowDiagnosticsToCodeMirror(state.doc, diags);
      expect(cmDiags.length).toBe(diags.length);
      for (const d of cmDiags) {
        expect(d.from).toBeGreaterThanOrEqual(0);
        expect(d.to).toBeGreaterThanOrEqual(d.from);
        expect(d.to).toBeLessThanOrEqual(state.doc.length);
        expect(d.source).toBe('agentflow');
      }
    });

    it('returns [] for non-agentflow diagrams without invoking parser', async () => {
      const diags = await collectAgentflowDiagnostics('flowchart TD\n  A --> B');
      expect(diags).toEqual([]);
    });
  });

  describe('AGF-04: AI prompt & RAG support', () => {
    it('includes Agentflow rules in system prompt, fix prompt, and RAG context', () => {
      const sys = buildSystemPrompt({ currentContent: '', hasDiagram: false });
      expect(sys).toContain('agentflow-beta');
      expect(sys).toContain('refdoc');

      const fix = buildFixSystemPrompt({
        currentContent: 'agentflow-beta TB\n  flow f["F"]\n  end',
        hasDiagram: true,
        diagramType: 'agentflow',
      });
      expect(fix).toContain('agentflow-beta');
      expect(fix).toContain('connectorRef');

      const rag = getMermaidContext('agentflow');
      expect(rag).toContain('AGENTFLOW');
      expect(rag).toContain('agentflow-beta');
      expect(getMermaidContext('agentflow-beta')).toContain('AGENTFLOW');
    });
  });
});
