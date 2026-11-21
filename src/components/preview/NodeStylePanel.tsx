import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { X, RotateCcw, ChevronDown, Settings2, Zap, Trash2, Type, Smile, Image as ImageIcon, LoaderCircle, TriangleAlert, ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { ColorPicker } from '@/components/visual/ColorPicker';
// 38-06 (SHP-04): shape-change parity with the visual editor's PropertiesPanel
// — the same unified ShapePicker, mounted as a fixed-position popover so the
// panel's own overflow clipping cannot eat it.
import { ShapePicker } from '@/components/shared/ShapePicker';
import type { ShapePickerAnchor } from '@/components/shared/ShapePicker';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import type { NodeStyle, NodeShape, PresetType, IconConfig, ImgConfig } from '@/lib/mermaid/codeUtils';
// 39-05 Task 1 (ICON-03, Surface 3): the upload/paste compression pipeline
// — the ONLY route an image takes from file picker to node directive.
import {
  IMAGE_ACCEPT,
  ImageCompressError,
  dataUriByteLength,
  fileToCompressedDataUri,
  formatBytes,
} from '@/utils/imageCompress';
import type { ImageCompressErrorCode } from '@/utils/imageCompress';

interface NodeStylePreset {
  label: string;
  presetType: PresetType;
  color: string;
}

interface NodeStylePanelProps {
  selectedNodeIds: string[];
  /** Array of styles for each selected node, same order as selectedNodeIds */
  nodeStyles: NodeStyle[];
  /** 38-06: Array of shapes for each selected node, same order as selectedNodeIds (required with onShapeChange) */
  nodeShapes?: NodeShape[];
  nodeLabels: Map<string, string>;
  onClose: () => void;
  onStyleChange: (nodeIds: string[], style: Partial<NodeStyle>) => void;
  /** 38-06 (SHP-04): shape change for the selection — mirrors the onStyleChange multi-node signature */
  onShapeChange?: (nodeIds: string[], shape: NodeShape) => void;
  onReset: (nodeIds: string[]) => void;
  /** If true, hide rx/ry properties (for circle/diamond shapes where border radius has no visual effect) */
  hideBorderRadius?: boolean;
  /** Map of node ID to parent subgraph ID (null = root) */
  nodeSubgraphIds?: Map<string, string | null>;
  /** Available subgraphs */
  subgraphs?: Array<{ id: string; label: string }>;
  /** Callback when subgraph assignment changes */
  onSubgraphChange?: (nodeId: string, subgraphId: string | null) => void;
  /** Callback when node label changes */
  onLabelChange?: (nodeId: string, newLabel: string) => void;
  /** Presets generated from current theme colors */
  presets?: NodeStylePreset[];
  /** Callback when a preset is applied */
  onPresetApply?: (nodeIds: string[], presetType: PresetType) => void;
  /** Callback when the selected nodes are deleted (hides the button if absent) */
  onDelete?: () => void;
  /**
   * 39-04 (ICON-03, UI-SPEC Surface 1): the selection's shared media data —
   * a config when EVERY selected node carries that media kind, `null` when
   * NO node carries it, and `undefined` when the selection mixes media kinds
   * (no active tab segment; the `nodeStyle.mixed` chip shows). The active
   * tab derives from this parsed data synchronously — never from re-parsing
   * code strings. Absent (with its mutator) = the caller does not wire
   * media support: the whole section stays hidden and existing callers are
   * byte-identical (the 38-06 absent-props pattern).
   */
  nodeIcon?: IconConfig | null;
  /** See nodeIcon — same three-state contract for the img kind. */
  nodeImage?: ImgConfig | null;
  /**
   * 39-04: media mutations for the selection — the ONLY write path. Routes
   * to the 39-01 `updateNodeIcon` mutator (null clears that media kind on
   * every selected node; a config sets it, stripping the other kind).
   * Required (with onImageChange) for the media section to render.
   */
  onIconChange?: (nodeIds: string[], icon: IconConfig | null) => void;
  /** See onIconChange — routes to the 39-01 `updateNodeImg` mutator. */
  onImageChange?: (nodeIds: string[], img: ImgConfig | null) => void;
}

function getSharedValue(styles: NodeStyle[], field: keyof NodeStyle): string | 'mixed' | undefined {
  if (styles.length === 0) return undefined;
  const first = styles[0][field];
  if (first === undefined) return undefined;
  const allSame = styles.every(s => s[field] === first);
  return allSame ? first : 'mixed';
}

export function NodeStylePanel({
  selectedNodeIds,
  nodeStyles,
  nodeShapes,
  nodeLabels,
  onClose,
  onStyleChange,
  onShapeChange,
  onReset,
  hideBorderRadius = false,
  nodeSubgraphIds,
  subgraphs,
  onSubgraphChange,
  onLabelChange,
  presets,
  onPresetApply,
  onDelete,
  nodeIcon,
  nodeImage,
  onIconChange,
  onImageChange,
}: NodeStylePanelProps) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // 38-06 (SHP-04): the Shape row's trigger + fixed-position picker state.
  const [shapeOpen, setShapeOpen] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<ShapePickerAnchor | null>(null);
  const shapeBtnRef = useRef<HTMLButtonElement>(null);

  const BORDER_STYLE_OPTIONS = [
    { value: '', label: t('nodeStyle.solid'), dasharray: '' },
    { value: '5 5', label: t('nodeStyle.dashed'), dasharray: '5 5' },
    { value: '2 2', label: t('nodeStyle.dotted'), dasharray: '2 2' },
  ] as const;

  const FONT_WEIGHT_OPTIONS = [
    { value: '', label: t('nodeStyle.fontDefault') },
    { value: 'normal', label: t('nodeStyle.fontNormal') },
    { value: 'bold', label: t('nodeStyle.fontBold') },
    { value: 'lighter', label: t('nodeStyle.fontLighter') },
    { value: 'bolder', label: t('nodeStyle.fontBolder') },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '300', label: '300' },
    { value: '400', label: '400' },
    { value: '500', label: '500' },
    { value: '600', label: '600' },
    { value: '700', label: '700' },
    { value: '800', label: '800' },
    { value: '900', label: '900' },
  ] as const;
  const singleNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const [label, setLabel] = useState(singleNodeId ? (nodeLabels.get(singleNodeId) ?? '') : '');

  // Sync label when selection changes
  useEffect(() => {
    if (singleNodeId) {
      setLabel(nodeLabels.get(singleNodeId) ?? '');
    }
  }, [singleNodeId, nodeLabels]);

  const handleStyleChange = useCallback(
    (field: keyof NodeStyle, value: string | undefined) => {
      onStyleChange(selectedNodeIds, { [field]: value });
    },
    [selectedNodeIds, onStyleChange],
  );

  const headerTitle =
    selectedNodeIds.length === 1
      ? (nodeLabels.get(selectedNodeIds[0]) ?? selectedNodeIds[0])
      : t('nodeStyle.nodes', { count: selectedNodeIds.length });

  // Compute shared values for multi-node editing
  const fillColor = getSharedValue(nodeStyles, 'fill');
  const borderColor = getSharedValue(nodeStyles, 'stroke');
  const borderWidth = getSharedValue(nodeStyles, 'strokeWidth');
  const borderStyle = getSharedValue(nodeStyles, 'strokeDasharray');
  const textColor = getSharedValue(nodeStyles, 'color');
  const fontWeight = getSharedValue(nodeStyles, 'fontWeight');
  const fontSize = getSharedValue(nodeStyles, 'fontSize');
  const rx = getSharedValue(nodeStyles, 'rx');
  const ry = getSharedValue(nodeStyles, 'ry');

  // 38-06 (SHP-04): shared shape across the selection — 'mixed' when the
  // selected nodes disagree (the PropertiesPanel sharedShape idiom).
  const sharedShape: NodeShape | 'mixed' | undefined =
    !nodeShapes || nodeShapes.length === 0
      ? undefined
      : nodeShapes.every(s => s === nodeShapes[0])
        ? nodeShapes[0]
        : 'mixed';
  const shapeLabel = sharedShape === 'mixed'
    ? t('nodeStyle.mixed')
    : sharedShape
      ? t(`visual.shapes.${sharedShape}`)
      : '';

  // Fixed-position anchor recipe (Surface 1, ShapeToolbar): the popover is
  // position:fixed, so no panel ancestor's overflow clipping can bury it.
  const toggleShapePicker = () => {
    if (!shapeOpen && shapeBtnRef.current) {
      const r = shapeBtnRef.current.getBoundingClientRect();
      setShapeAnchor({
        right: window.innerWidth - r.right,
        top: r.bottom + 8,
        maxHeight: window.innerHeight - r.bottom - 24,
      });
    }
    setShapeOpen(v => !v);
  };

  const closeShapePicker = () => {
    setShapeOpen(false);
    setShapeAnchor(null);
  };

  // ===== 39-04 (ICON-03, Surfaces 1+6): media-mode tabs + icon param rows.
  // All state derives synchronously from the parsed data the host passes —
  // no loading state, no code re-parsing in the component.
  const mediaWired = onIconChange !== undefined && onImageChange !== undefined;
  // Mixed media kinds: the host signals it by passing undefined for either
  // prop (see the props' contract) — no active segment, mixed chip.
  const mediaMixed = mediaWired && (nodeIcon === undefined || nodeImage === undefined);
  type MediaTab = 'text' | 'icon' | 'image';
  const activeMedia: MediaTab | null = !mediaWired || mediaMixed
    ? null
    : nodeIcon
      ? 'icon'
      : nodeImage
        ? 'image'
        : 'text';
  // Switching to Icon on a selection that carries no icon opens the tab
  // body in its empty state (CTA row — Surface 1's switch table); the
  // highlight still follows the DATA (Text stays lit until an icon is
  // picked in 39-05). Disarmed when the selection changes. 39-05 Task 1:
  // the Image tab carries the identical armed idiom plus the upload
  // pipeline's busy/error state, all reset when the selection changes.
  const [iconTabArmed, setIconTabArmed] = useState(false);
  const [imageTabArmed, setImageTabArmed] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<ImageCompressErrorCode | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setIconTabArmed(false);
    setImageTabArmed(false);
    setImageBusy(false);
    setImageError(null);
  }, [selectedNodeIds[0], selectedNodeIds.length]);
  const iconBodyVisible =
    activeMedia === 'icon' || (iconTabArmed && mediaWired && !mediaMixed && !nodeIcon && !nodeImage);
  const imageBodyVisible =
    activeMedia === 'image' || (imageTabArmed && mediaWired && !mediaMixed && !nodeIcon && !nodeImage);

  // Switch semantics (the locked Surface-1 table) route ONLY through the
  // mutator props: a null config clears exactly that media kind on every
  // selected node (updateNodeImg(null) / updateNodeIcon(null)); no media
  // scaffolding is written until the user picks a value (39-05's picker /
  // upload). `!== null` fires on undefined too — a mixed selection must
  // clear both kinds. Text fires two callbacks; the hosts' handlers chain
  // through their content refs so the sequential calls compose.
  const switchToIcon = () => {
    if (!onIconChange || !onImageChange) {return;}
    setIconTabArmed(true);
    setImageTabArmed(false);
    if (nodeImage !== null) {onImageChange(selectedNodeIds, null);}
  };
  const switchToImage = () => {
    if (!onIconChange) {return;}
    setIconTabArmed(false);
    setImageTabArmed(true);
    if (nodeIcon !== null) {onIconChange(selectedNodeIds, null);}
  };
  const switchToText = () => {
    if (!onIconChange || !onImageChange) {return;}
    setIconTabArmed(false);
    setImageTabArmed(false);
    if (nodeIcon !== null) {onIconChange(selectedNodeIds, null);}
    if (nodeImage !== null) {onImageChange(selectedNodeIds, null);}
  };

  // 39-05 Task 1 (Surface 3): the compression route — file picker (and, in
  // Task 3, paste) -> fileToCompressedDataUri -> onImageChange -> the 39-01
  // updateNodeImg mutator. Validation failures hold their typed code for
  // the inline row (declared copy lands with Task 3's keys); unexpected
  // failures log and never pretend to have succeeded.
  const handleImageFile = async (file: File) => {
    if (!onImageChange) {return;}
    setImageError(null);
    setImageBusy(true);
    try {
      const dataUri = await fileToCompressedDataUri(file);
      onImageChange(selectedNodeIds, { img: dataUri });
    } catch (err) {
      if (err instanceof ImageCompressError) {
        setImageError(err.code);
      } else {
        logger.warn('Image compression failed', err);
      }
    } finally {
      setImageBusy(false);
    }
  };

  // Icon param rows (Surface 6): every edit composes the next config from
  // the parsed shared config and emits it through onIconChange. Empty W/H
  // means Auto — the key is deleted so the mutator omits the param; invalid
  // numeric entry is ignored (no submit path to fail).
  const setIconParam = (patch: Partial<Omit<IconConfig, 'icon' | 'label'>>) => {
    if (!onIconChange || !nodeIcon) {return;}
    onIconChange(selectedNodeIds, { ...nodeIcon, ...patch });
  };
  const setIconSize = (field: 'w' | 'h', raw: string) => {
    if (!onIconChange || !nodeIcon) {return;}
    const next: IconConfig = { ...nodeIcon };
    const trimmed = raw.trim();
    if (trimmed === '') {
      delete next[field]; // Auto — param omitted on emit
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {return;} // clamp/ignore invalid entry
      next[field] = n;
    }
    onIconChange(selectedNodeIds, next);
  };
  const sizePlaceholder = mediaMixed ? t('nodeStyle.mixed') : t('nodeStyle.iconSizeAuto');

  // Helper to format color values for ColorPicker (mixed -> '' with mixed label)
  const colorValue = (v: string | 'mixed' | undefined): string =>
    v === 'mixed' || v === undefined ? '' : v;
  const colorLabel = (label: string, v: string | 'mixed' | undefined): string =>
    v === 'mixed' ? `${label} (${t('nodeStyle.mixed')})` : label;

  // Helper for range/select inputs with mixed state
  const numericValue = (v: string | 'mixed' | undefined, fallback: string): string =>
    v === 'mixed' ? fallback : v ?? fallback;
  const parsePx = (v: string): number => parseInt(v.replace('px', '')) || 0;

  // Escape closes the panel regardless of where focus sits (iter-32 P2:
  // this panel kept an onKeyDown on the non-focusable wrapper div — dead
  // after a touch open, focus stayed on the page — while Edge/Subgraph got
  // the document-level idiom in iter-28; the family fix skipped this
  // sibling). ColorPicker's popover Escape runs in capture phase and stops
  // propagation, so only the topmost layer closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 38-06: the shape picker owns Escape while it is open (topmost layer
      // closes first — ShapePicker's own handler does not stop propagation,
      // so this guard is what keeps one Escape from closing panel + picker).
      if (shapeOpen) {return;}
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('keydown', onKey);};
  }, [onClose, shapeOpen]);

  return (
    <>
      <div
        className="style-panel absolute right-0 top-[110px] bottom-0 w-[280px] z-30 flex flex-col animate-slide-in-right rounded-l-xl border-l shadow-xl max-md:w-full max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:h-[40dvh] max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-t max-md:border-l-0"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
        onClick={e => e.stopPropagation()}
      >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 size={13} style={{ color: 'var(--accent)' }} />
          <span
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {headerTitle}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-[var(--hover)] shrink-0 max-md:min-w-[44px] max-md:min-h-[44px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 node-panel-scroll"
        /* `scrollbar-width` only accepts auto/thin/none — a length is invalid
           CSS that browsers ignore (real width styling is the
           ::-webkit-scrollbar block above). Kept verbatim under a cast
           rather than "fixed" to a valid value, which would change rendering;
           the double cast is required because the value is outside the
           property's declared union by design. */
        style={{
          scrollbarWidth: '12px',
          scrollbarColor: 'rgba(0,0,0,0.3) transparent',
        } as unknown as CSSProperties}
      >
        {/* Label (single node only) */}
        {singleNodeId && onLabelChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.label')}
            </span>
            <input
              type="text"
              value={label}
              placeholder={t('nodeStyle.labelPlaceholder')}
              onChange={e => { setLabel(e.target.value); onLabelChange(singleNodeId, e.target.value); }}
              className="w-full px-2.5 py-1.5 rounded-md border text-xs"
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* 38-06 (SHP-04): Shape row, grouped with the label row — the same
            unified ShapePicker the visual editor's PropertiesPanel mounts.
            Renders only when the host wires shape-change support
            (onShapeChange + nodeShapes); absent props keep the panel
            byte-compatible for every existing caller. */}
        {onShapeChange && nodeShapes && sharedShape !== undefined && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.shape')}
            </span>
            <button
              ref={shapeBtnRef}
              type="button"
              data-shape-trigger
              onClick={toggleShapePicker}
              title={t('visual.shapeChangeHint', { shape: shapeLabel })}
              aria-label={t('visual.shapeChangeHint', { shape: shapeLabel })}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <span className="shrink-0 flex items-center">
                {/* Mixed selection carries the neutral rect preview (the
                    PropertiesPanel trigger precedent). */}
                <ShapePreview shape={sharedShape === 'mixed' ? 'rect' : sharedShape} />
              </span>
              <span className="truncate">{shapeLabel}</span>
              <ChevronDown
                size={11}
                className="ml-auto shrink-0 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </button>
            {shapeOpen && shapeAnchor && (
              <ShapePicker
                anchor={shapeAnchor}
                onClose={closeShapePicker}
                onPick={(shape) => {
                  onShapeChange?.(selectedNodeIds, shape);
                  closeShapePicker();
                }}
                selected={sharedShape === 'mixed' ? null : sharedShape}
                triggerRef={shapeBtnRef}
              />
            )}
          </div>
        )}

        {/* 39-04 (ICON-03, Surfaces 1+6): the Text | Icon | Image media-mode
            tabs under the shape row (shape and media are orthogonal — this
            section never hides or replaces the shape row). Active state
            derives synchronously from the parsed media data; every mutation
            routes through the 39-01 mutator props. Renders only when the
            host wires both mutator props; the row only exists while a node
            selection does (the panel itself mounts on selection). */}
        {mediaWired && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('nodeStyle.media')}
              </span>
              {mediaMixed && (
                <span
                  data-media-mixed
                  className="text-[10px] leading-none px-1.5 py-0.5 rounded-full border shrink-0"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                  {t('nodeStyle.mixed')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1" role="tablist" aria-label={t('nodeStyle.media')}>
              {([
                { tab: 'text' as MediaTab, key: 'nodeStyle.tabText', Glyph: Type, onPick: switchToText },
                { tab: 'icon' as MediaTab, key: 'nodeStyle.tabIcon', Glyph: Smile, onPick: switchToIcon },
                { tab: 'image' as MediaTab, key: 'nodeStyle.tabImage', Glyph: ImageIcon, onPick: switchToImage },
              ]).map(({ tab, key, Glyph, onPick }) => {
                const active = activeMedia === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-media-tab={tab}
                    onClick={onPick}
                    className={`flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-xs ${FOCUS_RING_CLASSES}`}
                    style={
                      active
                        ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                        : { background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }
                    }
                  >
                    <Glyph size={14} />
                    <span>{t(key)}</span>
                  </button>
                );
              })}
            </div>

            {/* Icon tab body (Surface 6). The trigger row shows the picked
                name truncating with the full value as its accessible title
                (empty state: the declared CTA copy). The IconPicker popover
                cloning the ShapePicker fixed-anchor recipe is 39-05's
                deliverable — this trigger is its anchor. */}
            {iconBodyVisible && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  data-icon-trigger
                  onClick={() => {
                    /* 39-05 wires the IconPicker here. */
                  }}
                  title={nodeIcon ? t('visual.iconChangeHint', { icon: nodeIcon.icon }) : undefined}
                  aria-label={nodeIcon ? t('visual.iconChangeHint', { icon: nodeIcon.icon }) : t('nodeStyle.iconPickAction')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  <span
                    className="shrink-0 flex items-center"
                    style={{ color: nodeIcon ? 'var(--accent)' : 'var(--text-tertiary)' }}
                  >
                    <Smile size={14} />
                  </span>
                  {nodeIcon ? (
                    <span className="truncate" title={nodeIcon.icon}>
                      {nodeIcon.icon}
                    </span>
                  ) : (
                    <span className="truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {t('nodeStyle.iconPickAction')}
                    </span>
                  )}
                  <ChevronDown
                    size={11}
                    className="ml-auto shrink-0 pointer-events-none"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </button>

                {nodeIcon && (
                  <>
                    {/* Form segmented control — exactly the 12.3 enums. */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {t('nodeStyle.iconForm')}
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {([
                          { value: 'square' as const, key: 'nodeStyle.iconFormSquare' },
                          { value: 'circle' as const, key: 'nodeStyle.iconFormCircle' },
                          { value: 'rounded' as const, key: 'nodeStyle.iconFormRounded' },
                        ]).map(({ value, key }) => {
                          const active = nodeIcon!.form === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              data-icon-form={value}
                              aria-pressed={active}
                              onClick={() => setIconParam({ form: value })}
                              className={`rounded-md border px-1 py-1.5 text-xs ${FOCUS_RING_CLASSES}`}
                              style={
                                active
                                  ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                                  : { background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }
                              }
                            >
                              {t(key)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Position segmented control (Top / Bottom). */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {t('nodeStyle.iconPosition')}
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { value: 't' as const, key: 'nodeStyle.iconPositionTop' },
                          { value: 'b' as const, key: 'nodeStyle.iconPositionBottom' },
                        ]).map(({ value, key }) => {
                          const active = nodeIcon!.pos === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              data-icon-pos={value}
                              aria-pressed={active}
                              onClick={() => setIconParam({ pos: value })}
                              className={`rounded-md border px-1 py-1.5 text-xs ${FOCUS_RING_CLASSES}`}
                              style={
                                active
                                  ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                                  : { background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }
                              }
                            >
                              {t(key)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* W/H number inputs — empty means Auto (param omitted
                        on emit); mixed selection shows the mixed idiom. */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {t('nodeStyle.iconSize')}
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          data-icon-w
                          value={nodeIcon!.w ?? ''}
                          placeholder={sizePlaceholder}
                          min={0}
                          onChange={e => setIconSize('w', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border text-xs"
                          style={{
                            background: 'var(--surface-base)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                        <input
                          type="number"
                          data-icon-h
                          value={nodeIcon!.h ?? ''}
                          placeholder={sizePlaceholder}
                          min={0}
                          onChange={e => setIconSize('h', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border text-xs"
                          style={{
                            background: 'var(--surface-base)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Remove icon — danger text action, no confirmation
                        (reversible by re-picking). */}
                    <button
                      type="button"
                      data-icon-remove
                      onClick={() => onIconChange?.(selectedNodeIds, null)}
                      className={`text-xs px-1 py-1.5 text-left ${FOCUS_RING_CLASSES}`}
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', outline: 'none' }}
                    >
                      {t('nodeStyle.iconRemove')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 39-05 Task 1 (ICON-03, Surface 3): the Image tab body. The
                empty state IS the upload CTA + paste hint pair — no dropzone
                chrome; in-flight compression renders the spinner in the
                thumbnail slot; a compressed result renders the thumbnail +
                size readout + Replace / Remove. Every value routes through
                onImageChange -> the 39-01 updateNodeImg mutator. The declared
                validation rows, paste binding, external-URL advisory and the
                fit switch complete this body in Task 3. */}
            {imageBodyVisible && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  data-image-input
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = ''; // allow re-picking the same file
                    if (file) {void handleImageFile(file);}
                  }}
                />

                {imageBusy ? (
                  <div
                    data-image-busy
                    className="flex items-center gap-1 px-1 py-1.5 text-[11px] leading-[1.5]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <LoaderCircle size={14} className="animate-spin shrink-0" aria-hidden="true" />
                    <span>{t('nodeStyle.imageCompressing')}</span>
                  </div>
                ) : nodeImage ? (
                  <>
                    {/* Populated state: thumbnail (max-height 64px,
                        object-contain) with the accent frame (Color item 3),
                        the compressed size readout, Replace (re-opens the
                        same file input) and Remove image (danger text, no
                        confirmation — reversible by re-uploading). */}
                    <div className="flex flex-col gap-1">
                      <div
                        className="flex items-center justify-center rounded-md border p-1"
                        style={{ borderColor: 'var(--accent)', background: 'var(--surface-floating)' }}
                      >
                        <img
                          src={nodeImage.img}
                          alt=""
                          data-image-thumbnail
                          className="max-h-16 object-contain"
                        />
                      </div>
                      <span
                        data-image-readout
                        className="text-[11px] leading-[1.5]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {t('nodeStyle.imageSizeReadout', { size: formatBytes(dataUriByteLength(nodeImage.img)) })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-image-replace
                        onClick={() => imageInputRef.current?.click()}
                        className={`px-2 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
                        style={{
                          background: 'var(--surface-base)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      >
                        {t('nodeStyle.imageReplace')}
                      </button>
                      <button
                        type="button"
                        data-image-remove
                        onClick={() => onImageChange?.(selectedNodeIds, null)}
                        className={`text-xs px-1 py-1.5 ${FOCUS_RING_CLASSES}`}
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', outline: 'none' }}
                      >
                        {t('nodeStyle.imageRemove')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Empty state = the CTA + paste hint pair (Surface 3
                        item 1 — no dropzone chrome). */}
                    <button
                      type="button"
                      data-image-upload
                      onClick={() => imageInputRef.current?.click()}
                      className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
                      style={{
                        background: 'var(--surface-base)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    >
                      <ImagePlus size={14} aria-hidden="true" />
                      <span>{t('nodeStyle.imageUpload')}</span>
                    </button>
                    <span
                      data-image-hint
                      className="text-[11px] leading-[1.5]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {t('nodeStyle.imageEmptyHint')}
                    </span>
                  </>
                )}

                {/* Interim validation marker: the typed code is held (never
                    swallowed) until Task 3 renders the declared inline danger
                    rows in both panels. */}
                {imageError && !imageBusy && (
                  <div data-image-error={imageError} style={{ color: 'var(--danger)' }}>
                    <TriangleAlert size={14} aria-hidden="true" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Presets */}
        {presets && presets.length > 0 && (() => {
          // Dark text on the raw theme color (iter-13): every preset family
          // the themes ship is a light/mid tone — #111827 measures 4.5–9:1
          // on all of them, while per-color white failed Danger at 3.76.
          // The chip now shows the EXACT color applied to the node.
          return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Zap size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {t('nodeStyle.presets') || 'Presets'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map(preset => (
              <button
                key={preset.label}
                onClick={() => onPresetApply?.(selectedNodeIds, preset.presetType)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 min-w-0"
                title={preset.label}
                style={{
                  borderColor: preset.color,
                  color: '#111827',
                  /* Pure theme color + dark text (iter-13): the previous
                     veils carried AA white but painted the chip darker than
                     the color actually applied — the chip contradicted its
                     own result. */
                  backgroundColor: preset.color,
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0 border border-black/20" style={{ background: preset.color }} />
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
          </div>
          );
        })()}

        {/* Recommended Section */}
        <ColorPicker
          label={colorLabel(t('nodeStyle.fillColor'), fillColor)}
          value={colorValue(fillColor)}
          onChange={v => handleStyleChange('fill', v || undefined)}
        />
        <ColorPicker
          label={colorLabel(t('nodeStyle.borderColor'), borderColor)}
          value={colorValue(borderColor)}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Border Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('nodeStyle.borderWidth')}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={parsePx(numericValue(borderWidth, '1px'))}
              onChange={e => handleStyleChange('strokeWidth', `${e.target.value}px`)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {borderWidth === 'mixed' ? t('nodeStyle.mixed') : borderWidth ?? '1px'}
            </span>
          </div>
        </div>

        {/* Border Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('nodeStyle.borderStyle')}
          </span>
          <div className="flex gap-1">
            {BORDER_STYLE_OPTIONS.map(opt => {
              const isActive =
                borderStyle === 'mixed'
                  ? false
                  : (opt.value === '' && !borderStyle) || borderStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleStyleChange('strokeDasharray', opt.value || undefined)
                  }
                  className="flex-1 py-1.5 rounded-md border text-[11px] font-medium transition-all"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                    background: isActive ? 'var(--accent-dim)' : 'var(--surface-base)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderWidth: isActive ? '2px' : '1px',
                    borderBottomStyle: opt.dasharray
                      ? opt.value === '5 5'
                        ? 'dashed'
                        : 'dotted'
                      : 'solid',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <ColorPicker
          label={colorLabel(t('nodeStyle.textColor'), textColor)}
          value={colorValue(textColor)}
          onChange={v => handleStyleChange('color', v || undefined)}
        />

        {/* Subgraph Dropdown */}
        {selectedNodeIds.length === 1 && nodeSubgraphIds && subgraphs && onSubgraphChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.subgraph')}
            </span>
            <div className="relative">
              <select
                value={nodeSubgraphIds.get(selectedNodeIds[0]) ?? ''}
                onChange={e => {
                  const val = e.target.value || null;
                  onSubgraphChange(selectedNodeIds[0], val);
                }}
                className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                style={{
                  background: 'var(--surface-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="">{t('nodeStyle.noneRoot')}</option>
                {subgraphs.map(sg => (
                  <option key={sg.id} value={sg.id}>
                    {sg.label || sg.id}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={11}
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>
        )}

        {/* Advanced Toggle */}
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="flex items-center gap-1 py-1 text-xs font-medium uppercase tracking-wider transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ChevronDown
            size={11}
            style={{
              transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
          {t('nodeStyle.advanced')}
        </button>

        {/* Advanced Section */}
        {advancedOpen && (
          <div className="flex flex-col gap-4">
            {/* Font Weight */}
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('nodeStyle.fontWeight')}
              </span>
              <div className="relative">
                <select
                  value={fontWeight === 'mixed' ? '' : fontWeight ?? ''}
                  onChange={e =>
                    handleStyleChange('fontWeight', e.target.value || undefined)
                  }
                  className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  {fontWeight === 'mixed' && (
                    <option value="">{t('nodeStyle.mixed')}</option>
                  )}
                  {FONT_WEIGHT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </div>
            </div>

            {/* Font Size */}
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('nodeStyle.fontSize')}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={48}
                  step={1}
                  value={
                    fontSize === 'mixed'
                      ? ''
                      : fontSize ? parsePx(fontSize) : 18
                  }
                  placeholder={fontSize === 'mixed' ? t('nodeStyle.mixed') : ''}
                  onChange={e => {
                    const v = e.target.value;
                    handleStyleChange('fontSize', v ? `${v}px` : undefined);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md border text-xs font-mono w-0"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  px
                </span>
              </div>
            </div>

            {/* Border Radius X */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('nodeStyle.borderRadiusX')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rx === 'mixed' ? 0 : parseInt(rx ?? '0') || 0}
                    onChange={e => handleStyleChange('rx', e.target.value)}
                    className="flex-1 accent-teal-500"
                  />
                  <span
                    className="text-xs w-8 text-right font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {rx === 'mixed' ? t('nodeStyle.mix') : rx ?? '0'}
                  </span>
                </div>
              </div>
            )}

            {/* Border Radius Y */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('nodeStyle.borderRadiusY')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={ry === 'mixed' ? 0 : parseInt(ry ?? '0') || 0}
                    onChange={e => handleStyleChange('ry', e.target.value)}
                    className="flex-1 accent-teal-500"
                  />
                  <span
                    className="text-xs w-8 text-right font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {ry === 'mixed' ? t('nodeStyle.mix') : ry ?? '0'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset / Delete Buttons — separated (iter-13) AND delete is a
            two-step arm (iter-14 P1: removeNode executed with zero
            confirmation, 8px below Reset, both red-family — a mis-tap at
            momentum-scroll speed destroyed diagram content). Contrast:
            red-600 ink on the tint (3.29 → ≥4.6) and red-600 fill (white
            4.83 vs #ef4444's 3.76). */}
        <div className="mt-auto pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(selectedNodeIds)}
            className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(220,38,38,0.08)',
              color: '#b91c1c',
              border: '1px solid rgba(220,38,38,0.25)',
            }}
          >
            <RotateCcw size={12} className="shrink-0" />
            <span className="truncate">{t('nodeStyle.resetStyles')}</span>
          </button>
          {onDelete && (
            <button
              onClick={e => {
                const btn = e.currentTarget;
                if (btn.dataset.armed) {
                  delete btn.dataset.armed;
                  onDelete?.();
                  return;
                }
                btn.dataset.armed = 'true';
                /* Armed state gets a VISUAL change beyond text (iter-14 P3:
                   the text-only cue was easy to miss — same red background). */
                btn.style.background = '#7f1d1d';
                btn.style.borderColor = '#7f1d1d';
                btn.querySelector('span')!.textContent = t('nodeStyle.confirmDelete');
                setTimeout(() => {
                  if (btn.isConnected && btn.dataset.armed) {
                    delete btn.dataset.armed;
                    btn.style.background = '#dc2626';
                    btn.style.borderColor = '#dc2626';
                    const span = btn.querySelector('span');
                    if (span) {span.textContent = t('nodeStyle.delete');}
                  }
                }, 3000);
              }}
              title={t('nodeStyle.delete')}
              className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: '1px solid #dc2626',
              }}
            >
              <Trash2 size={12} className="shrink-0" />
              <span className="truncate">{t('nodeStyle.delete')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
