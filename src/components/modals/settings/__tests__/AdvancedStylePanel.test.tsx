import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedStylePanel } from '../AdvancedStylePanel';

// Mock i18n (the panel-test idiom — EdgeStylePanel.test.tsx): a key map over
// only the labels these tests assert; everything else falls back to the key
// itself, and string second args (defaultValue) pass through.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown) => {
      const map: Record<string, string> = {
        // The 13 curve pill labels (40-01 key table, EN copy).
        'advancedStyle.curveSmooth': 'Smooth',
        'advancedStyle.curveBumpX': 'Bump X',
        'advancedStyle.curveBumpY': 'Bump Y',
        'advancedStyle.curveCardinal': 'Cardinal',
        'advancedStyle.curveCatmullRom': 'Catmull-Rom',
        'advancedStyle.curveStraight': 'Straight',
        'advancedStyle.curveMonotoneX': 'Monotone X',
        'advancedStyle.curveMonotoneY': 'Monotone Y',
        'advancedStyle.curveNatural': 'Natural',
        'advancedStyle.curveStep': 'Step',
        'advancedStyle.curveStepAfter': 'Step After',
        'advancedStyle.curveStepBefore': 'Step Before',
        'advancedStyle.curveRounded': 'Rounded',
        // The two new EDGE-04 rows.
        'advancedStyle.stepDuration': 'Step duration',
        'advancedStyle.markdownAutoWrap': 'Markdown auto-wrap',
        // Swimlane DIAG-03 controls.
        'advancedStyle.swimlaneLineHops': 'Line hops',
        'advancedStyle.swimlaneLineHopsArc': 'Arc',
        'advancedStyle.swimlaneLineHopsGap': 'Gap',
        'advancedStyle.swimlaneLineHopsOff': 'Off',
        'advancedStyle.swimlaneAutoOrder': 'Auto-order lanes',
      };
      return map[key] ?? (typeof fallbackOrOpts === 'string' ? fallbackOrOpts : key);
    },
  }),
}));

// Mock ColorPicker to avoid complex component rendering
vi.mock('@/components/visual/ColorPicker', () => ({
  ColorPicker: ({ label, value, onChange }: any) => (
    <div>
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} data-testid={`color-picker-${label}`} />
    </div>
  ),
}));

const FLOWCHART_CONTENT = `flowchart TD
    A[Start] --> B[End]
`;
const SEQUENCE_CONTENT = `sequenceDiagram
    A->>B: hello
`;

// The 13 mermaid config-union curves in the dist-declared order (40-UI-SPEC
// Surface 4) with their EN labels from the 40-01 key table.
const CURVE_LABELS_IN_ORDER = [
  'Smooth',
  'Bump X',
  'Bump Y',
  'Cardinal',
  'Catmull-Rom',
  'Straight',
  'Monotone X',
  'Monotone Y',
  'Natural',
  'Step',
  'Step After',
  'Step Before',
  'Rounded',
];

const renderPanel = (currentContent: string, onContentChange = vi.fn()) => {
  const utils = render(
    <AdvancedStylePanel
      isOpen={true}
      onClose={() => {}}
      currentContent={currentContent}
      onContentChange={onContentChange}
      theme="light"
    />
  );
  return { ...utils, onContentChange };
};

const lastAppliedContent = (onContentChange: ReturnType<typeof vi.fn>): string => {
  expect(onContentChange.mock.calls.length).toBeGreaterThan(0);
  return onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0] as string;
};

describe('AdvancedStylePanel (40-03 EDGE-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly the 13 curve pills in the dist union order with the active accent', () => {
    const { container } = renderPanel(FLOWCHART_CONTENT);

    // All 13 labels present in declared DOM order.
    const buttons = Array.from(container.querySelectorAll('button'));
    const curveLabelsSeen: string[] = [];
    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      if (text && CURVE_LABELS_IN_ORDER.includes(text)) curveLabelsSeen.push(text);
    }
    expect(curveLabelsSeen).toEqual(CURVE_LABELS_IN_ORDER);

    // Active-state accent pattern unchanged: basis (Smooth) is the default,
    // every other pill carries the subtle border.
    const smooth = screen.getByRole('button', { name: 'Smooth' });
    expect(smooth.style.borderColor).toBe('var(--accent)');
    const bumpX = screen.getByRole('button', { name: 'Bump X' });
    expect(bumpX.style.borderColor).toBe('var(--border-subtle)');
  });

  it('clicking a new curve pill re-accents it and writes flowchart.curve into the frontmatter', () => {
    const { onContentChange } = renderPanel(FLOWCHART_CONTENT);

    fireEvent.click(screen.getByRole('button', { name: 'Rounded' }));
    const applied = lastAppliedContent(onContentChange);
    expect(applied).toMatch(/curve: 'rounded'/);
    expect(screen.getByRole('button', { name: 'Rounded' }).style.borderColor).toBe('var(--accent)');
    expect(screen.getByRole('button', { name: 'Smooth' }).style.borderColor).toBe('var(--border-subtle)');
  });

  it('stepDuration accepts positive decimals, writes to frontmatter, clears, and ignores <= 0', () => {
    const { onContentChange } = renderPanel(FLOWCHART_CONTENT);

    // Empty input: no stepDuration key anywhere in the initial application.
    expect(lastAppliedContent(onContentChange)).not.toContain('stepDuration');

    const input = screen.getByLabelText('Step duration');
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(lastAppliedContent(onContentChange)).toMatch(/stepDuration: 0\.5/);

    fireEvent.change(input, { target: { value: '2.5' } });
    expect(lastAppliedContent(onContentChange)).toMatch(/stepDuration: 2\.5/);

    fireEvent.change(input, { target: { value: '' } });
    expect(lastAppliedContent(onContentChange)).not.toContain('stepDuration');

    // Non-positive values are ignored on commit.
    fireEvent.change(input, { target: { value: '0' } });
    expect(lastAppliedContent(onContentChange)).not.toContain('stepDuration');
    fireEvent.change(input, { target: { value: '-1' } });
    expect(lastAppliedContent(onContentChange)).not.toContain('stepDuration');
  });

  it('markdownAutoWrap defaults checked (true), toggling off writes root config false and back on writes true', () => {
    const { onContentChange } = renderPanel(FLOWCHART_CONTENT);

    // Untouched default: no key written until user toggles.
    expect(lastAppliedContent(onContentChange)).not.toContain('markdownAutoWrap');

    const toggle = screen.getByLabelText('Markdown auto-wrap') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);
    expect(lastAppliedContent(onContentChange)).toMatch(/config:\n(?:[^\n]*\n)*?\s{2}markdownAutoWrap: false/);

    fireEvent.click(toggle);
    expect(lastAppliedContent(onContentChange)).toMatch(/config:\n(?:[^\n]*\n)*?\s{2}markdownAutoWrap: true/);
  });

  it('a non-flowchart (sequence) source renders Sequence controls and writes config.sequence', () => {
    const { onContentChange, queryByRole } = renderPanel(SEQUENCE_CONTENT);

    expect(queryByRole('button', { name: 'Smooth' })).toBeNull();
    expect(screen.queryByLabelText('Step duration')).toBeNull();
    expect(screen.queryByLabelText('Markdown auto-wrap')).toBeNull();

    const mirrorToggle = screen.getByLabelText('advancedStyle.mirrorActors') as HTMLInputElement;
    expect(mirrorToggle.checked).toBe(true);
    fireEvent.click(mirrorToggle);
    expect(lastAppliedContent(onContentChange)).toMatch(/sequence:\n[\s\S]*mirrorActors: false/);

    const actorMarginSlider = screen.getByLabelText('advancedStyle.actorMargin');
    fireEvent.change(actorMarginSlider, { target: { value: '90' } });
    expect(lastAppliedContent(onContentChange)).toMatch(/actorMargin: 90/);
    expect(lastAppliedContent(onContentChange)).not.toContain('flowchart:');
  });

  it('a Gantt source renders Gantt controls and writes config.gantt + top-level displayMode', () => {
    const ganttContent = `gantt\n  title Roadmap\n  section Dev\n  Build :a1, 2026-01-01, 5d`;
    const { onContentChange } = renderPanel(ganttContent);

    const barHeightSlider = screen.getByLabelText('advancedStyle.barHeight');
    fireEvent.change(barHeightSlider, { target: { value: '28' } });
    expect(lastAppliedContent(onContentChange)).toMatch(/gantt:\n[\s\S]*barHeight: 28/);

    const axisSelect = screen.getByLabelText('advancedStyle.axisFormat');
    fireEvent.change(axisSelect, { target: { value: '%H:%M' } });
    expect(lastAppliedContent(onContentChange)).toContain("axisFormat: '%H:%M'");

    const compactToggle = screen.getByLabelText('advancedStyle.compactDisplayMode') as HTMLInputElement;
    expect(compactToggle.checked).toBe(false);
    fireEvent.click(compactToggle);
    expect(lastAppliedContent(onContentChange)).toContain("displayMode: 'compact'");
  });

  it('clearing stepDuration in a controlled parent removes stepDuration from frontmatter (CR fix)', () => {
    let latestContent = FLOWCHART_CONTENT;
    function ControlledHost() {
      const [content, setContent] = useState(FLOWCHART_CONTENT);
      return (
        <AdvancedStylePanel
          isOpen={true}
          onClose={() => {}}
          currentContent={content}
          onContentChange={next => {
            latestContent = next;
            setContent(next);
          }}
          theme="light"
        />
      );
    }

    render(<ControlledHost />);
    const input = screen.getByLabelText('Step duration');
    fireEvent.change(input, { target: { value: '400' } });
    expect(latestContent).toMatch(/stepDuration: 400/);

    fireEvent.change(input, { target: { value: '' } });
    expect(latestContent).not.toContain('stepDuration');
  });
});

describe('AdvancedStylePanel Swimlane config (41-01 DIAG-03)', () => {
  const SWIMLANE_CONTENT = `swimlane-beta
  subgraph LaneA
    A[Step 1]
  end
  subgraph LaneB
    B[Step 2]
  end
  A --> B
`;

  it('renders Line hops segmented controls (Arc/Gap/Off) and Auto-order lanes toggle for swimlane', () => {
    renderPanel(SWIMLANE_CONTENT);

    const arcBtn = screen.getByRole('button', { name: 'Arc' });
    const gapBtn = screen.getByRole('button', { name: 'Gap' });
    const offBtn = screen.getByRole('button', { name: 'Off' });
    expect(arcBtn.getAttribute('aria-pressed')).toBe('true');
    expect(gapBtn.getAttribute('aria-pressed')).toBe('false');
    expect(offBtn.getAttribute('aria-pressed')).toBe('false');

    const autoOrderToggle = screen.getByLabelText('Auto-order lanes') as HTMLInputElement;
    expect(autoOrderToggle.checked).toBe(false);

    // Suppresses generic noOptions notice because swimlane has config controls
    expect(screen.queryByText(/advancedStyle\.noOptions/)).toBeNull();
    // Does not render flowchart controls
    expect(screen.queryByRole('button', { name: 'Smooth' })).toBeNull();
  });

  it('writes config.swimlane.lineHops and config.swimlane.automaticLaneOrdering into frontmatter', () => {
    const { onContentChange } = renderPanel(SWIMLANE_CONTENT);

    fireEvent.click(screen.getByRole('button', { name: 'Gap' }));
    expect(lastAppliedContent(onContentChange)).toMatch(/swimlane:\n[\s\S]*lineHops: 'gap'/);

    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(lastAppliedContent(onContentChange)).toMatch(/swimlane:\n[\s\S]*lineHops: false/);

    fireEvent.click(screen.getByLabelText('Auto-order lanes'));
    expect(lastAppliedContent(onContentChange)).toMatch(/automaticLaneOrdering: true/);
  });

  it('does not render Swimlane controls on flowchart or sequence diagrams', () => {
    const { unmount } = renderPanel(FLOWCHART_CONTENT);
    expect(screen.queryByText('Line hops')).toBeNull();
    expect(screen.queryByLabelText('Auto-order lanes')).toBeNull();
    unmount();

    renderPanel(SEQUENCE_CONTENT);
    expect(screen.queryByText('Line hops')).toBeNull();
    expect(screen.queryByLabelText('Auto-order lanes')).toBeNull();
  });
});
