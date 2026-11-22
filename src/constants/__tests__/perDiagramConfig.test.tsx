import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import {
  applyStyleToContent,
  extractStyleOptionsFromContent,
} from '@/constants/themeDerivation';
import { mermaidCompletions } from '@/lib/mermaid/autocomplete';
import { AdvancedStylePanel } from '@/components/modals/settings/AdvancedStylePanel';
import enLocale from '../../i18n/locales/en.json';
import frLocale from '../../i18n/locales/fr.json';

function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function getCompletions(doc: string, pos?: number): string[] {
  const state = EditorState.create({ doc });
  const ctx = new CompletionContext(state, pos ?? doc.length, true);
  const res = mermaidCompletions(ctx);
  return res ? res.options.map(o => o.label) : [];
}

describe('Phase 47 CFG-01 & CFG-02: Per-Diagram Config Lossless Round-Trip', () => {
  it('round-trips Pie config (donutHole, legendPosition, highlightSlice, textPosition) while preserving sibling title', () => {
    const base = `---\ntitle: Budget\n---\npie\n  "Infra" : 60\n  "Apps" : 40`;
    const updated = applyStyleToContent(base, {
      donutHole: 0.45,
      legendPosition: 'bottom',
      highlightSlice: 'Infra',
      textPosition: 0.65,
    });
    expect(updated).toContain("title: 'Budget'");
    expect(updated).toContain('donutHole: 0.45');
    expect(updated).toContain("legendPosition: 'bottom'");
    expect(updated).toContain("highlightSlice: 'Infra'");
    expect(updated).toContain('textPosition: 0.65');

    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.donutHole).toBe(0.45);
    expect(extracted.legendPosition).toBe('bottom');
    expect(extracted.highlightSlice).toBe('Infra');
    expect(extracted.textPosition).toBe(0.65);

    const cleared = applyStyleToContent(updated, {
      donutHole: undefined,
      legendPosition: undefined,
      highlightSlice: undefined,
      textPosition: undefined,
    });
    expect(cleared).toContain("title: 'Budget'");
    expect(cleared).not.toContain('donutHole');
    expect(cleared).not.toContain('pie:');
  });

  it('round-trips XY Chart config (showDataLabel, showDataLabelOutsideBar)', () => {
    const base = `xychart\n  x-axis [q1, q2]\n  bar [10, 20]`;
    const updated = applyStyleToContent(base, {
      showDataLabel: true,
      showDataLabelOutsideBar: true,
    });
    expect(updated).toContain('xyChart:');
    expect(updated).toContain('showDataLabel: true');
    expect(updated).toContain('showDataLabelOutsideBar: true');

    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.showDataLabel).toBe(true);
    expect(extracted.showDataLabelOutsideBar).toBe(true);
  });

  it('round-trips Sankey config including nested nodeColors with spaces in keys', () => {
    const base = `sankey-beta\nSolar,Electricity grid,40\nWind,Electricity grid,30`;
    const updated = applyStyleToContent(base, {
      labelStyle: 'outlined',
      sankeyNodeWidth: 18,
      sankeyNodePadding: 14,
      linkColor: 'gradient',
      nodeAlignment: 'center',
      showValues: false,
      nodeColors: {
        Solar: '#f59e0b',
        'Electricity grid': '#22c55e',
      },
    });
    expect(updated).toContain('sankey:');
    expect(updated).toContain("labelStyle: 'outlined'");
    expect(updated).toContain('nodeWidth: 18');
    expect(updated).toContain('nodePadding: 14');
    expect(updated).toContain("linkColor: 'gradient'");
    expect(updated).toContain("nodeAlignment: 'center'");
    expect(updated).toContain('showValues: false');
    expect(updated).toContain("Solar: '#f59e0b'");
    expect(updated).toContain("'Electricity grid': '#22c55e'");

    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.labelStyle).toBe('outlined');
    expect(extracted.sankeyNodeWidth).toBe(18);
    expect(extracted.sankeyNodePadding).toBe(14);
    expect(extracted.linkColor).toBe('gradient');
    expect(extracted.nodeAlignment).toBe('center');
    expect(extracted.showValues).toBe(false);
    expect(extracted.nodeColors).toEqual({
      Solar: '#f59e0b',
      'Electricity grid': '#22c55e',
    });
  });

  it('round-trips Mindmap colorBy alongside tidy-tree layout', () => {
    const base = `mindmap\n  root((Plan))\n    A\n    B`;
    const updated = applyStyleToContent(base, {
      layoutEngine: 'tidy-tree',
      colorBy: 'depth',
    });
    expect(updated).toContain("layout: 'tidy-tree'");
    expect(updated).toContain("colorBy: 'depth'");
    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.layoutEngine).toBe('tidy-tree');
    expect(extracted.colorBy).toBe('depth');
  });

  it('round-trips Class config (hierarchicalNamespaces, hideEmptyMembersBox)', () => {
    const base = `classDiagram\n  class User`;
    const updated = applyStyleToContent(base, {
      hierarchicalNamespaces: false,
      hideEmptyMembersBox: true,
    });
    expect(updated).toContain('class:');
    expect(updated).toContain('hierarchicalNamespaces: false');
    expect(updated).toContain('hideEmptyMembersBox: true');
    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.hierarchicalNamespaces).toBe(false);
    expect(extracted.hideEmptyMembersBox).toBe(true);
  });

  it('round-trips Packet config (bitOrder, bitsPerRow, showBits)', () => {
    const base = `packet\n  +16: "Header"`;
    const updated = applyStyleToContent(base, {
      bitOrder: 'descending',
      bitsPerRow: 16,
      showBits: false,
    });
    expect(updated).toContain('packet:');
    expect(updated).toContain("bitOrder: 'descending'");
    expect(updated).toContain('bitsPerRow: 16');
    expect(updated).toContain('showBits: false');
    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.bitOrder).toBe('descending');
    expect(extracted.bitsPerRow).toBe(16);
    expect(extracted.showBits).toBe(false);
  });

  it('round-trips Architecture config (randomize, seed, nodeSeparation, idealEdgeLengthMultiplier, edgeElasticity, numIter)', () => {
    const base = `architecture-beta\n  service api(server)[API]`;
    const updated = applyStyleToContent(base, {
      randomize: true,
      seed: 42,
      nodeSeparation: 80,
      idealEdgeLengthMultiplier: 1.5,
      edgeElasticity: 0.6,
      numIter: 1500,
    });
    expect(updated).toContain('architecture:');
    expect(updated).toContain('randomize: true');
    expect(updated).toContain('seed: 42');
    expect(updated).toContain('nodeSeparation: 80');
    expect(updated).toContain('idealEdgeLengthMultiplier: 1.5');
    expect(updated).toContain('edgeElasticity: 0.6');
    expect(updated).toContain('numIter: 1500');
    const extracted = extractStyleOptionsFromContent(updated);
    expect(extracted.randomize).toBe(true);
    expect(extracted.seed).toBe(42);
    expect(extracted.nodeSeparation).toBe(80);
    expect(extracted.idealEdgeLengthMultiplier).toBe(1.5);
    expect(extracted.edgeElasticity).toBe(0.6);
    expect(extracted.numIter).toBe(1500);
  });

  it('round-trips C4, TreeView, Timeline, GitGraph, Kanban, and Treemap configs', () => {
    const c4 = applyStyleToContent(`C4Context\n  Person(u, "User")`, { wrap: false });
    expect(c4).toContain('c4:\n    wrap: false');
    expect(extractStyleOptionsFromContent(c4).wrap).toBe(false);

    const tv = applyStyleToContent(`treeView-beta\n  root/`, {
      showIcons: false,
      defaultIconPack: 'mdi',
    });
    expect(tv).toContain('treeView:');
    expect(extractStyleOptionsFromContent(tv)).toMatchObject({
      showIcons: false,
      defaultIconPack: 'mdi',
    });

    const tl = applyStyleToContent(`timeline\n  2026 : Launch`, { disableMulticolor: true });
    expect(tl).toContain('timeline:\n    disableMulticolor: true');
    expect(extractStyleOptionsFromContent(tl).disableMulticolor).toBe(true);

    const gg = applyStyleToContent(`gitGraph\n  commit`, {
      showBranches: false,
      showCommitLabel: false,
      rotateCommitLabel: false,
      parallelCommits: true,
      mainBranchName: 'trunk',
    });
    expect(gg).toContain('gitGraph:');
    expect(extractStyleOptionsFromContent(gg)).toMatchObject({
      showBranches: false,
      showCommitLabel: false,
      rotateCommitLabel: false,
      parallelCommits: true,
      mainBranchName: 'trunk',
    });

    const kb = applyStyleToContent(`kanban\n  Todo\n    t1[Task]`, {
      ticketBaseUrl: 'https://jira.example.com/#TICKET#',
    });
    expect(kb).toContain('kanban:');
    expect(extractStyleOptionsFromContent(kb).ticketBaseUrl).toBe(
      'https://jira.example.com/#TICKET#'
    );

    const tm = applyStyleToContent(`treemap-beta\n"Root"\n  "Leaf": 10`, {
      showValues: false,
      valueFormat: '$,.0f',
      diagramPadding: 16,
    });
    expect(tm).toContain('treemap:');
    expect(extractStyleOptionsFromContent(tm)).toMatchObject({
      showValues: false,
      valueFormat: '$,.0f',
      diagramPadding: 16,
    });
  });

  it('wires AdvancedStylePanel controls to frontmatter updates for Pie and GitGraph', () => {
    const onContentChange = vi.fn();
    const { getByLabelText } = render(
      <AdvancedStylePanel
        isOpen={true}
        onClose={() => {}}
        currentContent={`pie\n  "A" : 60\n  "B" : 40`}
        onContentChange={onContentChange}
        theme="dark"
      />
    );
    const legendSelect = getByLabelText('advancedStyle.pieLegendPosition');
    fireEvent.change(legendSelect, { target: { value: 'bottom' } });
    expect(onContentChange).toHaveBeenCalled();
    const emitted = onContentChange.mock.calls.at(-1)?.[0] as string;
    expect(emitted).toContain("legendPosition: 'bottom'");
  });
});

describe('Phase 47 CFG-03: CodeMirror v11.12-v12.3 Completions & Accessibility', () => {
  it('provides global accTitle/accDescr completions across diagram types', () => {
    for (const sample of [
      'flowchart TD\n  acc',
      'sequenceDiagram\n  acc',
      'erDiagram\n  acc',
      'pie\n  acc',
      'agentflow-beta TB\n  acc',
    ]) {
      const labels = getCompletions(sample);
      expect(labels).toContain('accTitle: ');
      expect(labels).toContain('accDescr: ');
    }
  });

  it('provides Sequence, Class, ER, Architecture, XY Chart, Packet, and Timeline v12 completions', () => {
    expect(getCompletions('sequenceDiagram\n  part')).toContain(
      'participant A@{ "type": "boundary", "alias": "API" }'
    );
    expect(getCompletions('sequenceDiagram\n  ->>')).toContain('->>()');
    expect(getCompletions('sequenceDiagram\n  auto')).toContain('autonumber 10 10');
    expect(getCompletions('sequenceDiagram\n  link')).toContain(
      'link Alice: Dashboard @ https://example.com'
    );

    expect(getCompletions('classDiagram\n  name')).toContain('namespace Auth.OAuth');
    expect(getCompletions('classDiagram\n  name')).toContain('namespace Auth["Authentication"]');

    expect(getCompletions('erDiagram\n  str')).toContain('string?');
    expect(getCompletions('erDiagram\n  sub')).toContain('subgraph');
    expect(getCompletions('erDiagram\n  class')).toContain('classDef');

    expect(getCompletions('architecture-beta\n  ali')).toContain('align row');
    expect(getCompletions('architecture-beta\n  ali')).toContain('align column');

    expect(getCompletions('xychart\n  line')).toContain('line "Series" [10, 20, 30]');
    expect(getCompletions('xychart\n  line')).toContain('line [25 "Launch", 45, 60]');

    expect(getCompletions('packet\n  +16')).toContain('+16: "Field"');

    expect(getCompletions('time')).toContain('timeline TD');
    expect(getCompletions('time')).toContain('timeline LR');
  });
});

describe('Phase 47 CFG-04: EN/FR i18n Key Parity', () => {
  it('has 100% matching leaf keys between en.json and fr.json', () => {
    const enKeys = collectLeafKeys(enLocale as Record<string, unknown>);
    const frKeys = collectLeafKeys(frLocale as Record<string, unknown>);
    const missingInFr = enKeys.filter(k => !frKeys.includes(k));
    const missingInEn = frKeys.filter(k => !enKeys.includes(k));
    expect(missingInFr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });
});
