import type { NodeShape } from '@/lib/mermaid/codeUtils';

// 38-05 (SHP-03): the single 53-case 28x20 preview table, extracted from
// ShapeToolbar so every picker surface (toolbar primary row, ShapePicker
// cells, plan-06 panels) renders geometry through ONE table.
//
// Recipe is locked by the UI-SPEC: `stroke: currentColor, strokeWidth 1.5,
// fill none` at `viewBox="0 0 28 20"`. currentColor inherits the cell's
// token text color — that is how previews theme in dark mode. No case may
// render for a canonical shape via the default rect branch; the toolbar's
// uniqueness sweep (53 distinct markups) flips on any fallback.
//
// 38-06: the plan-02 migration window is closed — the NodeShape union is
// exactly the 53 canonical members, so the 14 legacy case labels the 38-05
// case grouping carried (round, rhombus, hexagon, et al.) are deleted; the
// canonical arms keep the transferred path data byte-for-byte. `asymmetric`
// remains the one superseded geometry: the SSOT maps asymmetric→odd, and
// the old banner arm retired instead of surviving as a second geometry for
// the same canonical shape.
export type ShapePreviewKind = NodeShape | 'icon' | 'img';

function ShapePreview({ shape }: { shape: ShapePreviewKind }) {
  const props = { stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' };
  switch (shape) {
    case 'icon':          return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="4" y="2.5" width="20" height="15" rx="3" {...props} /><polygon points="14,5.5 15.6,8.8 19.2,9.3 16.6,11.8 17.2,15.3 14,13.6 10.8,15.3 11.4,11.8 8.8,9.3 12.4,8.8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>;
    case 'img':           return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="3" y="3" width="22" height="14" rx="2" {...props} /><circle cx="9.5" cy="7.5" r="1.4" stroke="currentColor" strokeWidth="1.2" fill="none" /><polyline points="4.5,15.5 10.5,10.5 15,14 19,11 23.5,15.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" /></svg>;
    case 'rect':          return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
    case 'rounded':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /></svg>;
    case 'stadium':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /><line x1="9" y1="3" x2="9" y2="17" {...props} /><line x1="19" y1="3" x2="19" y2="17" {...props} /></svg>;
    case 'fr-rect':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="6" y1="3" x2="6" y2="17" {...props} /><line x1="22" y1="3" x2="22" y2="17" {...props} /></svg>;
    case 'cyl':           return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="14" cy="6" rx="10" ry="3" {...props} /><ellipse cx="14" cy="14" rx="10" ry="3" {...props} /><line x1="4" y1="6" x2="4" y2="14" {...props} /><line x1="24" y1="6" x2="24" y2="14" {...props} /></svg>;
    case 'circle':        return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /></svg>;
    case 'dbl-circ':      return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><circle cx="14" cy="10" r="4.5" {...props} /></svg>;
    case 'diam':          return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="14,2 26,10 14,18 2,10" {...props} /></svg>;
    case 'hex':           return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="8,3 20,3 26,10 20,17 8,17 2,10" {...props} /></svg>;
    // Canonical odd — mermaid's rect_left_inv_arrow: a right-angle rectangle
    // whose LEFT edge carries a concave triangular notch (corners protrude,
    // mid indents inward). The legacy `asymmetric` banner geometry it
    // superseded is retired (SSOT asymmetric→odd; see header note).
    case 'odd':           return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="5.5,3 2,10 5.5,17 26,17 26,3" {...props} /></svg>;
    case 'lean-r':        return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="6,3 26,3 22,17 2,17" {...props} /></svg>;
    case 'lean-l':        return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 22,3 26,17 6,17" {...props} /></svg>;
    case 'trap-b':        return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="6,3 22,3 26,17 2,17" {...props} /></svg>;
    case 'trap-t':        return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 26,3 22,17 6,17" {...props} /></svg>;
    case 'person':        return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="5.5" r="3" {...props} /><path d="M5 17 C5 11.5 9 9.5 14 9.5 C19 9.5 23 11.5 23 17" {...props} /></svg>;
    case 'delay':         return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M4 3 H14 A10 7 0 0 1 14 17 H4 Z" {...props} /></svg>;
    case 'sl-rect':       return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="5,5 23,2 23,16 5,19" {...props} /></svg>;
    case 'div-rect':      return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="2" y1="10" x2="26" y2="10" {...props} /></svg>;
    case 'folder':        return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M2 16 V4 H10 L12 6.5 H26 V16 Z" {...props} /></svg>;
    case 'datastore':     return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="14" cy="6" rx="10" ry="3" {...props} /><path d="M4 6 V14 A10 3 0 0 0 24 14 V6" {...props} /></svg>;
    case 'cloud':         return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M7 16 H21 A3.5 3.5 0 0 0 21 9 A5.2 5.2 0 0 0 11.5 7 A5.5 5.5 0 0 0 7 16 Z" {...props} /></svg>;
    case 'browser':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="2" y1="8" x2="26" y2="8" {...props} /><circle cx="6" cy="5.5" r="1" {...props} /></svg>;
    case 'bolt':          return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="15,2 5,11 11,11 9,18 23,7 15,7" {...props} /></svg>;
    case 'tri':           return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="14,3 25,17 3,17" {...props} /></svg>;
    case 'hourglass':     return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="4,3 24,3 14,10" {...props} /><polygon points="4,17 24,17 14,10" {...props} /></svg>;
    case 'doc':           return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M4 3 H24 V14 C22 16 20 12 17.5 13.5 C15 15 13 12 10.5 13.5 C8 15 6 13 4 14.5 Z" {...props} /></svg>;
    // --- 38-05: the 27 canonical shapes that had no toolbar-era geometry ---
    case 'bucket':        return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M4 4 H24 L21.5 17 H6.5 Z" {...props} /></svg>;
    case 'console':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><polyline points="6.5,8 9.5,10 6.5,12" {...props} /><line x1="12" y1="12.5" x2="16" y2="12.5" {...props} /></svg>;
    case 'bang':          return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><line x1="14" y1="5.5" x2="14" y2="11" {...props} /><circle cx="14" cy="13.6" r="0.9" {...props} /></svg>;
    case 'text':          return <svg width="28" height="20" viewBox="0 0 28 20"><line x1="5" y1="6" x2="23" y2="6" {...props} /><line x1="5" y1="10" x2="18" y2="10" {...props} /><line x1="5" y1="14" x2="13" y2="14" {...props} /></svg>;
    case 'notch-rect':    return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,7 6,3 26,3 26,13 22,17 2,17" {...props} /></svg>;
    case 'lin-rect':      return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="7" y1="17" x2="15" y2="3" {...props} /><line x1="13" y1="17" x2="21" y2="3" {...props} /></svg>;
    case 'sm-circ':       return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="5.5" {...props} /></svg>;
    case 'fr-circ':       return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><circle cx="14" cy="10" r="6" {...props} /></svg>;
    case 'fork':          return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="4" y="8" width="20" height="4" rx="1" {...props} /></svg>;
    case 'brace':         return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M22 3 H15 C9.5 3 12 10 5 10 C12 10 9.5 17 15 17 H22" {...props} /></svg>;
    case 'brace-r':       return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M6 3 H13 C18.5 3 16 10 23 10 C16 10 18.5 17 13 17 H6" {...props} /></svg>;
    case 'braces':        return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M11 3 H9 C5 3 7 10 3 10 C7 10 5 17 9 17 H11" {...props} /><path d="M17 3 H19 C23 3 21 10 25 10 C21 10 23 17 19 17 H17" {...props} /></svg>;
    case 'h-cyl':         return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="21" cy="10" rx="3" ry="7" {...props} /><path d="M21 3 H7 A3 7 0 0 0 7 17 H21" {...props} /></svg>;
    case 'lin-cyl':       return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="14" cy="5" rx="10" ry="2.5" {...props} /><path d="M4 5 V15 A10 2.5 0 0 0 24 15 V5" {...props} /><line x1="9" y1="10" x2="19" y2="10" {...props} /></svg>;
    case 'curv-trap':     return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M3 4 H25 L23 12 C18 16 10 16 5 12 Z" {...props} /></svg>;
    case 'win-pane':      return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="11" y1="3" x2="11" y2="17" {...props} /><line x1="2" y1="10" x2="26" y2="10" {...props} /></svg>;
    case 'f-circ':        return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><circle cx="14" cy="10" r="1.6" {...props} /></svg>;
    case 'notch-pent':    return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="3,17 3,8 9,3 19,3 25,8 25,17" {...props} /></svg>;
    case 'flip-tri':      return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="3,3 25,3 14,17" {...props} /></svg>;
    case 'docs':          return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M8 3 H25 V12" {...props} /><path d="M3 6 H21 V15 C19 17 17 13.8 14.5 15 C12 16.2 10 13.8 7.5 15 C5.8 15.9 4.2 14.5 3 15.2 Z" {...props} /></svg>;
    case 'st-rect':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="4" y="3" width="20" height="6" rx="1" {...props} /><rect x="4" y="11" width="20" height="6" rx="1" {...props} /></svg>;
    case 'bow-rect':      return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M2 3 H26 L16.5 10 L26 17 H2 L11.5 10 Z" {...props} /></svg>;
    case 'cross-circ':    return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><line x1="9" y1="5" x2="19" y2="15" {...props} /><line x1="19" y1="5" x2="9" y2="15" {...props} /></svg>;
    case 'tag-doc':       return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M4 3 H18 L24 9 V14 C22 16 20 12 17.5 13.5 C15 15 13 12 10.5 13.5 C8 15 6 13 4 14.5 Z" {...props} /><path d="M18 3 V9 H24" {...props} /></svg>;
    case 'tag-rect':      return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M2 3 H19 L26 10 V17 H2 Z" {...props} /><path d="M19 3 V10 H26" {...props} /></svg>;
    case 'flag':          return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M2 5 C4 3.5 6 6.5 8 5 C10 3.5 12 6.5 14 5 C16 3.5 18 6.5 20 5 C22 3.5 24 6.5 26 5 V15 C24 16.5 22 13.5 20 15 C18 16.5 16 13.5 14 15 C12 16.5 10 13.5 8 15 C6 16.5 4 13.5 2 15 Z" {...props} /></svg>;
    case 'lin-doc':       return <svg width="28" height="20" viewBox="0 0 28 20"><path d="M4 3 H24 V14 C22 16 20 12 17.5 13.5 C15 15 13 12 10.5 13.5 C8 15 6 13 4 14.5 Z" {...props} /><line x1="8" y1="14" x2="14" y2="4" {...props} /></svg>;
    // Safety net only — the uniqueness sweep forbids any canonical shape
    // reaching this branch (a fallback duplicates the plain-rect markup).
    default:              return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
  }
}

export { ShapePreview };
