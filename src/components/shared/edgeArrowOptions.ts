/**
 * The shared 16-token arrow option list (40-UI-SPEC Surface 1, EDGE-01/03) —
 * the ONE picker vocabulary both edge inspectors consume (Grey Area 9:
 * module-level shared const consumed by EdgeStylePanel AND PropertiesPanel's
 * EdgePanel; no per-panel duplicate list may exist).
 *
 * Every value is a family canonical token from codeUtils' ARROW_FAMILIES —
 * the Sequence-invalid flag-arrow tokens and the old PropertiesPanel's
 * Sequence-only double-arrow entry are gone by construction (the picker
 * never offers a token outside the probed-valid grammar). Lengths are the
 * link-length control's output (Surface 2), never extra picker rows.
 *
 * `minimumLength` is the link-length input's min attribute floor when that
 * family is selected: the circle/cross start tokens' bare spellings are
 * probe-INVALID at mermaid 12.3 (40-probe-grammar.cjs — spaced, glued, and
 * labeled all ERR), so the input floors at 2 for them (UI-SPEC Surface 2;
 * the mutator's own minimum emission is `o---` / `x---` regardless).
 */
export interface EdgeArrowOption {
  /** Family canonical single-length token (codeUtils ARROW_FAMILIES id). */
  value: string;
  /** i18n key of the row label ("Name (token)" pattern — tokens untranslated). */
  labelKey: string;
  /** Link-length input min attribute floor for this family. */
  minimumLength?: number;
}

export const EDGE_ARROW_OPTIONS: EdgeArrowOption[] = [
  { value: '-->', labelKey: 'edgeStyle.arrowArrow' },
  { value: '---', labelKey: 'edgeStyle.arrowLine' },
  { value: '-.->', labelKey: 'edgeStyle.arrowDotted' },
  { value: '==>', labelKey: 'edgeStyle.arrowThick' },
  { value: 'o--o', labelKey: 'edgeStyle.arrowCircle' },
  { value: 'x--x', labelKey: 'edgeStyle.arrowCross' },
  { value: '<-->', labelKey: 'edgeStyle.arrowBidirectional' },
  { value: '-.-', labelKey: 'edgeStyle.arrowDottedOpen' },
  { value: '===', labelKey: 'edgeStyle.arrowThickOpen' },
  { value: '~~~', labelKey: 'edgeStyle.arrowInvisible' },
  { value: '<-.->', labelKey: 'edgeStyle.arrowBidirectionalDotted' },
  { value: '<==>', labelKey: 'edgeStyle.arrowBidirectionalThick' },
  { value: '--o', labelKey: 'edgeStyle.arrowCircleEnd' },
  { value: 'o--', labelKey: 'edgeStyle.arrowCircleStart', minimumLength: 2 },
  { value: '--x', labelKey: 'edgeStyle.arrowCrossEnd' },
  { value: 'x--', labelKey: 'edgeStyle.arrowCrossStart', minimumLength: 2 },
];

/**
 * Truthfulness helper (40-UI-SPEC Surface 1): the ONE extra disabled option
 * an inspector renders when the edge's authored arrow type matches no shared
 * entry (a dotted/thick o/x combo like `o-.->`, or the legacy `.->`) — an
 * authored combo or length never displays as a lie. Null when the token is
 * one of the 16.
 */
export function extraArrowOption(arrowType: string): { value: string; label: string } | null {
  return EDGE_ARROW_OPTIONS.some(opt => opt.value === arrowType)
    ? null
    : { value: arrowType, label: arrowType };
}

/**
 * The 13 mermaid per-edge curve values in config-union order
 * (`config.type.d.ts:415`) with their label keys — the `advancedStyle.curve*`
 * keys landed with the 40-01 phase table; this plan consumes keys only.
 * Both inspectors render the same leading `edgeStyle.curveDefault` (value ''
 * = param omitted, Grey Area 8) before these 13.
 */
export const EDGE_CURVE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'basis', labelKey: 'advancedStyle.curveSmooth' },
  { value: 'bumpX', labelKey: 'advancedStyle.curveBumpX' },
  { value: 'bumpY', labelKey: 'advancedStyle.curveBumpY' },
  { value: 'cardinal', labelKey: 'advancedStyle.curveCardinal' },
  { value: 'catmullRom', labelKey: 'advancedStyle.curveCatmullRom' },
  { value: 'linear', labelKey: 'advancedStyle.curveStraight' },
  { value: 'monotoneX', labelKey: 'advancedStyle.curveMonotoneX' },
  { value: 'monotoneY', labelKey: 'advancedStyle.curveMonotoneY' },
  { value: 'natural', labelKey: 'advancedStyle.curveNatural' },
  { value: 'step', labelKey: 'advancedStyle.curveStep' },
  { value: 'stepAfter', labelKey: 'advancedStyle.curveStepAfter' },
  { value: 'stepBefore', labelKey: 'advancedStyle.curveStepBefore' },
  { value: 'rounded', labelKey: 'advancedStyle.curveRounded' },
];
