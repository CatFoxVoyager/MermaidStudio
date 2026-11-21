import { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { Settings2, ChevronDown, Zap, Type, Smile, Image as ImageIcon, LoaderCircle, TriangleAlert, ImagePlus, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { ColorPicker } from './ColorPicker';
// 38-06 (SHP-04): the flat hardcoded-EN 23-option <select> is replaced by the
// unified ShapePicker (SSOT-derived 53 shapes, searchable, categorized). The
// trigger opens it as a FIXED-position popover anchored to the trigger's
// viewport rect — the panel's 220px overflow-hidden container
// (VisualEditorCanvas.tsx:884-885) would clip an absolutely-positioned
// dropdown, but cannot clip a fixed host.
import { ShapePicker } from '@/components/shared/ShapePicker';
import type { ShapePickerAnchor } from '@/components/shared/ShapePicker';
// 40-02 (EDGE-01, UI-SPEC Surface 1): the ONE shared 16-token picker list —
// the hardcoded-EN local ARROW_OPTIONS (which carried the Sequence-only
// double-arrow entry) is deleted; this panel and EdgeStylePanel consume the
// same const (Grey Area 9).
import { EDGE_ARROW_OPTIONS, EDGE_CURVE_OPTIONS, extraArrowOption } from '@/components/shared/edgeArrowOptions';
import type { EdgeMetadata } from '@/lib/mermaid/codeUtils';
// 39-05 Task 3 (ICON-03, Surface 2): the lazy FA6 picker mounts from the
// icon trigger — the fixed-position sibling recipe, never a nested popover.
import { IconPicker } from '@/components/shared/IconPicker';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
// 39-05 Task 3 (ICON-03, Surface 3): the upload/paste compression pipeline —
// the ONLY route an image takes from file picker to node directive.
import {
  IMAGE_ACCEPT,
  ImageCompressError,
  SOURCE_MAX_BYTES,
  dataUriByteLength,
  fileToCompressedDataUri,
  formatBytes,
} from '@/utils/imageCompress';
import type { ImageCompressErrorCode } from '@/utils/imageCompress';
import type { NodeShape, NodeStyle, VisualNode, VisualEdge, IconConfig, ImgConfig } from './types';

const PRESETS: { label: string; style: NodeStyle; color: string }[] = [
  { label: 'Primary',  style: { fill: '#dbeafe', stroke: '#3b82f6', color: '#1d4ed8' }, color: '#3b82f6' },
  { label: 'Success',  style: { fill: '#dcfce7', stroke: '#22c55e', color: '#15803d' }, color: '#22c55e' },
  { label: 'Warning',  style: { fill: '#fef3c7', stroke: '#f59e0b', color: '#b45309' }, color: '#f59e0b' },
  { label: 'Danger',   style: { fill: '#fee2e2', stroke: '#ef4444', color: '#b91c1c' }, color: '#ef4444' },
  { label: 'Teal',     style: { fill: '#cffafe', stroke: '#06b6d4', color: '#0e7490' }, color: '#06b6d4' },
  { label: 'Dark',     style: { fill: '#1f2937', stroke: '#374151', color: '#f9fafb' }, color: '#374151' },
];

interface NodePanelProps {
  nodes: VisualNode[];
  onLabelChange: (id: string, label: string) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onStyleChange: (id: string, style: NodeStyle) => void;
  /**
   * 39-04 (ICON-03, UI-SPEC Surface 1): the same four optional media props
   * NodeStylePanel carries — identical three-state contract (config when
   * every selected node carries the kind, null when none does, undefined
   * when kinds mix) and identical switch semantics through the 39-01
   * mutator props. Absent = the section stays hidden (absent-props callers
   * byte-identical). This panel lacks the .style-panel class, so every new
   * control carries the explicit `max-md:min-h-[44px]` touch floor.
   */
  nodeIcon?: IconConfig | null;
  nodeImage?: ImgConfig | null;
  onIconChange?: (nodeIds: string[], icon: IconConfig | null) => void;
  onImageChange?: (nodeIds: string[], img: ImgConfig | null) => void;
}

function NodePanel({
  nodes, onLabelChange, onShapeChange, onStyleChange,
  nodeIcon, nodeImage, onIconChange, onImageChange,
}: NodePanelProps) {
  const { t } = useTranslation();
  const single = nodes.length === 1 ? nodes[0] : null;
  const [label, setLabel] = useState(single?.label ?? '');
  const [shapeOpen, setShapeOpen] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<ShapePickerAnchor | null>(null);
  const shapeBtnRef = useRef<HTMLButtonElement>(null);
  // 39-05 Task 3 (Surface 2): the IconPicker popover — the same fixed-anchor
  // measurement the ShapePicker trigger uses.
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<ShapePickerAnchor | null>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  // Sync label when single node changes
  useLayoutEffect(() => { setLabel(single?.label ?? ''); }, [single?.id, single?.label]);

  function handleStyleField(field: keyof NodeStyle, value: string) {
    nodes.forEach(n => {
      onStyleChange(n.id, { ...n.style, [field]: value });
    });
  }

  const sharedStyle = single?.style ?? {};
  const sharedShape: NodeShape | 'mixed' = nodes.length === 1
    ? nodes[0].shape
    : (nodes.every(n => n.shape === nodes[0].shape) ? nodes[0].shape : 'mixed' as const);
  // 38-06: labels come only from i18n keys — the shape label from the
  // canonical slug key, the multi-select mixed state from nodeStyle.mixed
  // (the "Mixed shapes" hardcoded-EN select option it replaces).
  const shapeLabel = sharedShape === 'mixed' ? t('nodeStyle.mixed') : t(`visual.shapes.${sharedShape}`);

  // Fixed-position anchor recipe (Surface 1, ShapeToolbar): measure the
  // trigger's viewport rect at open time; the popover is position:fixed, so
  // the 220px overflow-hidden panel container cannot clip it.
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

  // ===== 39-04 (ICON-03, Surfaces 1+6): media-mode tabs + icon param rows,
  // the identical semantics NodeStylePanel ships (Task 2) — same active-state
  // derivation from the parsed data props, same mutator-only switch routing,
  // same locked bilingual copy. This 220px panel has no .style-panel class,
  // so new interactive controls carry the explicit `max-md:min-h-[44px]`
  // floor (the 38 rule), and the icon trigger uses the fixed-anchor
  // measurement idiom (never a nested positioned popover).
  const mediaWired = onIconChange !== undefined && onImageChange !== undefined;
  const mediaMixed = mediaWired && (nodeIcon === undefined || nodeImage === undefined);
  type MediaTab = 'text' | 'icon' | 'image';
  const activeMedia: MediaTab | null = !mediaWired || mediaMixed
    ? null
    : nodeIcon
      ? 'icon'
      : nodeImage
        ? 'image'
        : 'text';
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
  }, [nodes.map(n => n.id).join(','), nodes.length]);
  const iconBodyVisible =
    activeMedia === 'icon' || (iconTabArmed && mediaWired && !mediaMixed && !nodeIcon && !nodeImage);
  const imageBodyVisible =
    activeMedia === 'image' || (imageTabArmed && mediaWired && !mediaMixed && !nodeIcon && !nodeImage);

  const toggleIconPicker = () => {
    if (!iconPickerOpen && iconBtnRef.current) {
      const r = iconBtnRef.current.getBoundingClientRect();
      setIconPickerAnchor({
        right: window.innerWidth - r.right,
        top: r.bottom + 8,
        maxHeight: window.innerHeight - r.bottom - 24,
      });
    }
    setIconPickerOpen(v => !v);
  };
  const closeIconPicker = () => {
    setIconPickerOpen(false);
    setIconPickerAnchor(null);
  };

  const switchToIcon = () => {
    if (!onIconChange || !onImageChange) {return;}
    setIconTabArmed(true);
    setImageTabArmed(false);
    const ids = nodes.map(n => n.id);
    if (nodeImage !== null) {onImageChange(ids, null);}
  };
  const switchToImage = () => {
    if (!onIconChange) {return;}
    setIconTabArmed(false);
    setImageTabArmed(true);
    if (nodeIcon !== null) {onIconChange(nodes.map(n => n.id), null);}
  };
  const switchToText = () => {
    if (!onIconChange || !onImageChange) {return;}
    setIconTabArmed(false);
    setImageTabArmed(false);
    const ids = nodes.map(n => n.id);
    if (nodeIcon !== null) {onIconChange(ids, null);}
    if (nodeImage !== null) {onImageChange(ids, null);}
  };

  const setIconParam = (patch: Partial<Omit<IconConfig, 'icon' | 'label'>>) => {
    if (!onIconChange || !nodeIcon) {return;}
    onIconChange(nodes.map(n => n.id), { ...nodeIcon, ...patch });
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
    onIconChange(nodes.map(n => n.id), next);
  };

  // 39-05 Task 3 (ICON-03, Surface 3): the compression route — identical to
  // the preview panel's (file picker + paste -> fileToCompressedDataUri ->
  // onImageChange -> the 39-01 updateNodeImg mutator).
  const nodeIds = nodes.map(n => n.id);
  const nodeIdsKey = nodeIds.join(',');
  const handleImageFile = useCallback(async (file: File) => {
    if (!onImageChange) {return;}
    setImageError(null);
    setImageBusy(true);
    try {
      const dataUri = await fileToCompressedDataUri(file);
      onImageChange(nodeIds, { img: dataUri });
    } catch (err) {
      if (err instanceof ImageCompressError) {
        setImageError(err.code);
      } else {
        logger.warn('Image compression failed', err);
      }
    } finally {
      setImageBusy(false);
    }
  }, [onImageChange, nodeIdsKey]);

  // 39-05 Task 3 (ICON-03 concurrency resolution): the paste listener is
  // bound ONLY while the Image tab is open and removed on tab switch and
  // unmount — the same lifetime contract the preview panel carries.
  useEffect(() => {
    if (!imageBodyVisible) {return;}
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {return;}
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleImageFile(file);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => {document.removeEventListener('paste', onPaste);};
  }, [imageBodyVisible, handleImageFile]);

  const setImageParam = (patch: Partial<Omit<ImgConfig, 'img' | 'label'>>) => {
    if (!onImageChange || !nodeImage) {return;}
    onImageChange(nodes.map(n => n.id), { ...nodeImage, ...patch });
  };
  const setImageSize = (field: 'w' | 'h', raw: string) => {
    if (!onImageChange || !nodeImage) {return;}
    const next: ImgConfig = { ...nodeImage };
    const trimmed = raw.trim();
    if (trimmed === '') {
      delete next[field]; // Auto — param omitted on emit
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {return;} // clamp/ignore invalid entry
      next[field] = n;
    }
    onImageChange(nodes.map(n => n.id), next);
  };
  const sizePlaceholder = mediaMixed ? t('nodeStyle.mixed') : t('nodeStyle.iconSizeAuto');
  // Surface 3 item 6: the advisory fires on an EXTERNAL https img value
  // (authored in code — no URL input field exists, Grey Area 2).
  const isExternalImage = !!nodeImage && nodeImage.img.startsWith('https://');

  return (
    <div className="flex flex-col gap-4">
      {single && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Label</span>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={() => { if (label !== single.label) {onLabelChange(single.id, label);} }}
            onKeyDown={e => { if (e.key === 'Enter') {onLabelChange(single.id, label);} }}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Shape</span>
        <button
          ref={shapeBtnRef}
          type="button"
          data-shape-trigger
          onClick={toggleShapePicker}
          title={t('visual.shapeChangeHint', { shape: shapeLabel })}
          aria-label={t('visual.shapeChangeHint', { shape: shapeLabel })}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
          <span className="shrink-0 flex items-center">
            {/* Mixed state carries the neutral rect preview (the old
                "Mixed shapes" select-option precedent, carried to the
                trigger). */}
            <ShapePreview shape={sharedShape === 'mixed' ? 'rect' : sharedShape} />
          </span>
          <span className="truncate">{shapeLabel}</span>
          <ChevronDown size={11} className="ml-auto shrink-0 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </button>
        {shapeOpen && shapeAnchor && (
          <ShapePicker
            anchor={shapeAnchor}
            onClose={closeShapePicker}
            onPick={(shape) => {
              // Mixed multi-select: apply the chosen shape to every selected
              // node (the old select's onChange.forEach idiom, unchanged).
              nodes.forEach(n => onShapeChange(n.id, shape));
              closeShapePicker();
            }}
            selected={sharedShape === 'mixed' ? null : sharedShape}
            triggerRef={shapeBtnRef}
          />
        )}
      </div>

      {/* 39-04 (ICON-03, Surfaces 1+6): the Text | Icon | Image media tabs —
          the identical section NodeStylePanel ships, adapted to this 220px
          panel (explicit max-md touch floors; no .style-panel class here).
          Shape and media stay orthogonal: this section never hides the
          shape row. */}
      {mediaWired && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
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
                  className={`flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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

          {/* Icon tab body — the same trigger/param rows as the preview
              panel; the IconPicker opens from this trigger via the
              fixed-anchor measurement (39-05, no nested popover). */}
          {iconBodyVisible && (
            <div className="flex flex-col gap-2 pt-1">
              <button
                ref={iconBtnRef}
                type="button"
                data-icon-trigger
                onClick={toggleIconPicker}
                title={nodeIcon ? t('visual.iconChangeHint', { icon: nodeIcon.icon }) : undefined}
                aria-label={nodeIcon ? t('visual.iconChangeHint', { icon: nodeIcon.icon }) : t('nodeStyle.iconPickAction')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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
              {iconPickerOpen && iconPickerAnchor && (
                <IconPicker
                  anchor={iconPickerAnchor}
                  onClose={closeIconPicker}
                  onPick={(icon) => {
                    // Per-node mutator calls (the mixed multi-select pick
                    // idiom this panel's shape row uses) — the ONLY write
                    // path.
                    nodes.forEach(n =>
                      onIconChange?.([n.id], nodeIcon ? { ...nodeIcon, icon } : { icon }),
                    );
                    closeIconPicker();
                  }}
                  selected={nodeIcon?.icon ?? null}
                  triggerRef={iconBtnRef}
                />
              )}

              {nodeIcon && (
                <>
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
                            className={`rounded-md border px-1 py-1.5 text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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
                            className={`rounded-md border px-1 py-1.5 text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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
                        className="w-full px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px]"
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
                        className="w-full px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px]"
                        style={{
                          background: 'var(--surface-base)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-icon-remove
                    onClick={() => onIconChange?.(nodes.map(n => n.id), null)}
                    className={`text-xs px-1 py-1.5 text-left max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
                    style={{ color: 'var(--danger)', background: 'transparent', border: 'none', outline: 'none' }}
                  >
                    {t('nodeStyle.iconRemove')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 39-05 Task 3 (ICON-03, Surface 3): the Image tab body — the
              pixel-for-pixel semantics of the preview panel's body, adapted
              to the 220px panel (explicit max-md:min-h-[44px] floors on
              every interactive control; no .style-panel class here). */}
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

              {/* External-URL advisory (Surface 3 item 6): the fence-pill
                  idiom — advisory copy on --surface-floating, never a
                  warning color, with the upload button directly below as
                  the corrective action. No URL input field exists (Grey
                  Area 2); the URL renders only as the truncated source row
                  with its full value in the title. */}
              {isExternalImage && (
                <>
                  <div
                    data-image-advisory
                    className="flex items-start gap-1 rounded-md border p-2 text-[11px] leading-[1.5]"
                    style={{
                      background: 'var(--surface-floating)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <ExternalLink size={14} aria-hidden="true" className="shrink-0" />
                    <span>{t('nodeStyle.imageExternalWarning')}</span>
                  </div>
                  <span
                    data-image-source
                    className="text-[11px] leading-[1.5] truncate max-w-full px-1"
                    title={nodeImage!.img}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {nodeImage!.img}
                  </span>
                </>
              )}

              {imageBusy ? (
                <div
                  data-image-busy
                  className="flex items-center gap-1 px-1 py-1.5 text-[11px] leading-[1.5]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <LoaderCircle size={14} className="animate-spin shrink-0" aria-hidden="true" />
                  <span>{t('nodeStyle.imageCompressing')}</span>
                </div>
              ) : nodeImage && !isExternalImage ? (
                <>
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

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      {t('nodeStyle.iconPosition')}
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        { value: 't' as const, key: 'nodeStyle.iconPositionTop' },
                        { value: 'b' as const, key: 'nodeStyle.iconPositionBottom' },
                      ]).map(({ value, key }) => {
                        const active = nodeImage!.pos === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            data-image-pos={value}
                            aria-pressed={active}
                            onClick={() => setImageParam({ pos: value })}
                            className={`rounded-md border px-1 py-1.5 text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      {t('nodeStyle.iconSize')}
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        data-image-w
                        value={nodeImage!.w ?? ''}
                        placeholder={sizePlaceholder}
                        min={0}
                        onChange={e => setImageSize('w', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px]"
                        style={{
                          background: 'var(--surface-base)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="number"
                        data-image-h
                        value={nodeImage!.h ?? ''}
                        placeholder={sizePlaceholder}
                        min={0}
                        onChange={e => setImageSize('h', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px]"
                        style={{
                          background: 'var(--surface-base)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-image-constraint
                    aria-pressed={nodeImage!.constraint === 'on'}
                    onClick={() => setImageParam({ constraint: nodeImage!.constraint === 'on' ? 'off' : 'on' })}
                    className={`flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-md border text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
                    style={
                      nodeImage!.constraint === 'on'
                        ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                        : { background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }
                    }
                  >
                    <span>{t('nodeStyle.imageConstraint')}</span>
                    <span aria-hidden="true">{nodeImage!.constraint === 'on' ? '✓' : ''}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-image-replace
                      onClick={() => imageInputRef.current?.click()}
                      className={`px-2 py-1.5 rounded-md border text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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
                      onClick={() => onImageChange?.(nodes.map(n => n.id), null)}
                      className={`text-xs px-1 py-1.5 max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', outline: 'none' }}
                    >
                      {t('nodeStyle.imageRemove')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-image-upload
                    onClick={() => imageInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-xs max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
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

              {/* Inline validation rows (Surface 3 item 5): the typed
                  error codes render their declared danger copy under the
                  upload control, persistent until the next attempt — never
                  a toast. */}
              {imageError && !imageBusy && (
                <div
                  data-image-error={imageError}
                  className="flex items-start gap-1 px-1 text-[11px] leading-[1.5]"
                  style={{ color: 'var(--danger)' }}
                >
                  <TriangleAlert size={14} aria-hidden="true" className="shrink-0" />
                  <span>
                    {imageError === 'invalid-type'
                      ? t('nodeStyle.imageInvalidType')
                      : t('nodeStyle.imageTooLarge', { limit: formatBytes(SOURCE_MAX_BYTES) })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ColorPicker label="Fill Color" value={sharedStyle.fill ?? ''} onChange={v => handleStyleField('fill', v)} />
      <ColorPicker label="Border Color" value={sharedStyle.stroke ?? ''} onChange={v => handleStyleField('stroke', v)} />
      <ColorPicker label="Text Color" value={sharedStyle.color ?? ''} onChange={v => handleStyleField('color', v)} />

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Border Width
        </span>
        <div className="flex items-center gap-2">
          <input
            type="range" min={1} max={8} step={1}
            value={parseInt(sharedStyle.strokeWidth ?? '1') || 1}
            onChange={e => handleStyleField('strokeWidth', `${e.target.value}px`)}
            className="flex-1 accent-teal-500"
          />
          <span className="text-xs w-8 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
            {sharedStyle.strokeWidth ?? '1px'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Zap size={11} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Presets</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => nodes.forEach(n => onStyleChange(n.id, p.style))}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:scale-105 active:scale-95 min-w-0"
              title={p.label}
              style={{ borderColor: p.color, color: p.label === 'Dark' ? '#ffffff' : p.color, background: p.style.fill }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {single && (
        <div className="pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>ID: {single.id}</span>
        </div>
      )}
    </div>
  );
}

interface EdgePanelProps {
  edge: VisualEdge;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onLabelChange: (source: string, target: string, label: string) => void;
  onDeleteEdge: (source: string, target: string) => void;
  /**
   * 40-02 (EDGE-03): the edge-inspector row delegates — identical semantics
   * to EdgeStylePanel's optional props (39-04 contract: absent props hide the
   * rows and keep existing callers byte-identical). This panel has no
   * .style-panel class, so every new control carries the explicit
   * `max-md:min-h-[44px]` touch floor.
   */
  edgeMeta?: EdgeMetadata | null;
  onEdgeMetaChange?: (meta: EdgeMetadata) => void;
  onEdgeIdChange?: (newId: string) => void;
  onEdgeLengthChange?: (token: string, length: number) => void;
  onAnimatePreset?: () => void;
}

function EdgePanel({
  edge, onArrowChange, onLabelChange, onDeleteEdge,
  edgeMeta, onEdgeMetaChange, onEdgeIdChange, onEdgeLengthChange, onAnimatePreset,
}: EdgePanelProps)  {
  const { t } = useTranslation();
  const [label, setLabel] = useState(edge.label);

  // Sync label when edge changes
  useLayoutEffect(() => { setLabel(edge.label); }, [edge.label]);

  // 40-02: the length row's min attribute follows the selected family's
  // minimum (the circle/cross start tokens are probe-invalid below it).
  const lengthOption = EDGE_ARROW_OPTIONS.find(opt => opt.value === edge.arrowType);
  const minLen = lengthOption?.minimumLength ?? 1;
  const typedMeta = edgeMeta ?? edge.metadata ?? null;

  const commitStep = (raw: string) => {
    if (!onEdgeMetaChange) {return; }
    if (raw === '') {
      const { step: _drop, ...rest } = typedMeta ?? {};
      onEdgeMetaChange(rest);
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {return; }
    onEdgeMetaChange({ ...(typedMeta ?? {}), step: n });
  };

  const commitCurve = (raw: string) => {
    if (!onEdgeMetaChange) {return; }
    if (raw === '') {
      const { curve: _drop, ...rest } = typedMeta ?? {};
      onEdgeMetaChange(rest);
      return;
    }
    onEdgeMetaChange({ ...(typedMeta ?? {}), curve: raw });
  };

  const commitSpeed = (speed: 'fast' | 'slow') => {
    if (!onEdgeMetaChange) {return; }
    if (typedMeta?.animation === speed) {
      const { animation: _drop, ...rest } = typedMeta;
      onEdgeMetaChange(rest);
      return;
    }
    onEdgeMetaChange({ ...(typedMeta ?? {}), animation: speed });
  };

  const inputStyle = { background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' } as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.connection')}</span>
        {/* 40-02 (UI-SPEC Surface 7 item 2): an authored edge id prefixes the
            connection row in mono — `e1 · A → B`. */}
        <div className="text-xs px-2.5 py-2 rounded-md border font-mono truncate" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          {edge.edgeId ? `${edge.edgeId} · ` : ''}{edge.source} → {edge.target}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.arrowType')}</span>
        <div className="relative">
          <select
            value={edge.arrowType}
            onChange={e => onArrowChange(edge.source, edge.target, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8 max-md:min-h-[44px]"
            style={{ ...inputStyle }}>
            {EDGE_ARROW_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
            {/* Truthfulness (UI-SPEC Surface 1): an authored combo outside
                the shared 16 renders as one DISABLED extra row. */}
            {extraArrowOption(edge.arrowType) && (
              <option value={edge.arrowType} disabled>{edge.arrowType}</option>
            )}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.label')}</span>
        <input
          type="text"
          value={label}
          placeholder={t('edgeStyle.labelPlaceholder')}
          onChange={e => setLabel(e.target.value)}
          onBlur={() => onLabelChange(edge.source, edge.target, label)}
          onKeyDown={e => { if (e.key === 'Enter') {onLabelChange(edge.source, edge.target, label);} }}
          className="w-full px-2.5 py-1.5 rounded-md border text-xs"
          style={{ ...inputStyle }}
        />
      </div>

      {onEdgeIdChange && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.edgeId')}</span>
          <input
            type="text"
            value={edge.edgeId ?? ''}
            placeholder={t('edgeStyle.edgeIdPlaceholder')}
            onChange={e => onEdgeIdChange(e.target.value)}
            data-edge-id-input
            className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono max-md:min-h-[44px]"
            style={{ ...inputStyle }}
          />
        </div>
      )}

      {onEdgeLengthChange && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.linkLength')}</span>
          {/* DISPLAYED value = the parsed authored length verbatim (authored
              5..10 never clamp); clamping applies only to NEWLY TYPED input
              (UI-SPEC Grey Area 4). */}
          <input
            type="number"
            min={minLen}
            max={4}
            value={edge.length ?? 1}
            onChange={e => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) {return; }
              onEdgeLengthChange(edge.arrowType, Math.min(4, Math.max(minLen, n)));
            }}
            data-edge-length-input
            className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono max-md:min-h-[44px]"
            style={{ ...inputStyle }}
          />
        </div>
      )}

      {onEdgeMetaChange && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.animationSpeed')}</span>
            {/* Independent of the Animate toggle (Grey Area 5 — mermaid
                renders animation: standalone). Active segment = accent. */}
            <div className="grid grid-cols-2 gap-1">
              {(['fast', 'slow'] as const).map(speed => {
                const isActive = typedMeta?.animation === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => commitSpeed(speed)}
                    data-edge-speed={speed}
                    className={`py-1.5 rounded-md border text-[11px] font-medium transition-all max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
                    style={{
                      borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                      background: isActive ? 'var(--accent-dim)' : 'var(--surface-base)',
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {t(speed === 'fast' ? 'edgeStyle.animationFast' : 'edgeStyle.animationSlow')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.step')}</span>
            {/* Integers only; non-numeric input ignored on commit; empty =
                param omitted (UI-SPEC Surface 2). */}
            <input
              type="number"
              min={1}
              value={typedMeta?.step ?? ''}
              onChange={e => commitStep(e.target.value)}
              data-edge-step-input
              className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono max-md:min-h-[44px]"
              style={{ ...inputStyle }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('edgeStyle.curve')}</span>
            {/* Leading Default option = param omitted (Grey Area 8); then
                the 13 mermaid values in config-union order. */}
            <select
              value={typedMeta?.curve ?? ''}
              onChange={e => commitCurve(e.target.value)}
              data-edge-curve-select
              className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8 max-md:min-h-[44px]"
              style={{ ...inputStyle }}>
              <option value="">{t('edgeStyle.curveDefault')}</option>
              {EDGE_CURVE_OPTIONS.map(cv => (
                <option key={cv.value} value={cv.value}>{t(cv.labelKey)}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {onAnimatePreset && (
        <button
          onClick={onAnimatePreset}
          title={t('edgeStyle.animatePresetHint')}
          aria-label={t('edgeStyle.animatePresetHint')}
          data-edge-animate-preset
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors max-md:min-h-[44px]"
          style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
          }}>
          <Zap size={11} className="shrink-0" />
          <span className="truncate">{t('edgeStyle.animatePreset')}</span>
        </button>
      )}

      <button
        onClick={() => onDeleteEdge(edge.source, edge.target)}
        className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
        {t('edgeStyle.delete')}
      </button>
    </div>
  );
}

/**
 * 40-04 (EDGE-05, Grey Area #2): Visual-side subgraph section — carries the
 * readonly Subgraph ID/Label rows and the same Collapse/Expand segmented row
 * idiom as SubgraphStylePanel (same i18n keys, same accent active treatment,
 * explicit max-md:min-h-[44px] touch floor). Renders ONLY when selectedSubgraphId
 * and onViewChange are both present (39-04 contract).
 */
function SubgraphPanel({
  subgraphId,
  subgraphLabel,
  subgraphView,
  onViewChange,
}: {
  subgraphId: string;
  subgraphLabel?: string;
  subgraphView?: 'collapsed' | 'expanded';
  onViewChange: (view: 'collapsed' | 'expanded') => void;
}) {
  const { t } = useTranslation();
  const VIEW_OPTIONS = [
    { value: 'collapsed', label: t('subgraphStyle.collapse') },
    { value: 'expanded', label: t('subgraphStyle.expand') },
  ] as const;

  return (
    <div className="flex flex-col gap-4" data-testid="visual-subgraph-panel">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {t('subgraphStyle.subgraphId')}
        </span>
        <div
          className="text-xs px-2.5 py-2 rounded-md border font-mono truncate"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          data-subgraph-panel-id
        >
          {subgraphId}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {t('subgraphStyle.label')}
        </span>
        <div
          className="text-xs px-2.5 py-2 rounded-md border truncate"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          data-subgraph-panel-label
        >
          {subgraphLabel || subgraphId}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div
          className="flex gap-1"
          role="group"
          aria-label={t('subgraphStyle.viewHint')}
          title={t('subgraphStyle.viewHint')}
        >
          {VIEW_OPTIONS.map(opt => {
            const isActive = opt.value === 'collapsed'
              ? subgraphView === 'collapsed'
              : subgraphView !== 'collapsed';
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onViewChange(opt.value)}
                data-subgraph-view={opt.value}
                className={`flex-1 py-1.5 rounded-md border text-[11px] font-medium transition-all max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
                style={{
                  borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                  background: isActive ? 'var(--accent-dim)' : 'var(--surface-base)',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  borderWidth: isActive ? '2px' : '1px',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  selectedNodes: VisualNode[];
  selectedEdge: VisualEdge | null;
  onLabelChange: (id: string, label: string) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onStyleChange: (id: string, style: NodeStyle) => void;
  nodeIcon?: IconConfig | null;
  nodeImage?: ImgConfig | null;
  onIconChange?: (nodeIds: string[], icon: IconConfig | null) => void;
  onImageChange?: (nodeIds: string[], img: ImgConfig | null) => void;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onEdgeLabelChange: (source: string, target: string, label: string) => void;
  onDeleteEdge: (source: string, target: string) => void;
  /** 40-02 (EDGE-03): absent props hide the edge-row set (39-04 contract). */
  edgeMeta?: EdgeMetadata | null;
  onEdgeMetaChange?: (meta: EdgeMetadata) => void;
  onEdgeIdChange?: (newId: string) => void;
  onEdgeLengthChange?: (token: string, length: number) => void;
  onAnimatePreset?: () => void;
  /** 40-04 (EDGE-05): absent props hide the subgraph section (39-04 contract). */
  selectedSubgraphId?: string | null;
  selectedSubgraphLabel?: string;
  subgraphView?: 'collapsed' | 'expanded';
  onViewChange?: (view: 'collapsed' | 'expanded') => void;
}

export function PropertiesPanel({
  selectedNodes, selectedEdge,
  onLabelChange, onShapeChange, onStyleChange,
  nodeIcon, nodeImage, onIconChange, onImageChange,
  onArrowChange, onEdgeLabelChange, onDeleteEdge,
  edgeMeta, onEdgeMetaChange, onEdgeIdChange, onEdgeLengthChange, onAnimatePreset,
  selectedSubgraphId, selectedSubgraphLabel, subgraphView, onViewChange,
}: Props) {
  const { t } = useTranslation();
  const hasNode = selectedNodes.length > 0;
  const hasSubgraph = Boolean(selectedSubgraphId && onViewChange);
  const hasEdge = !!selectedEdge;

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--surface-raised)', borderLeft: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <Settings2 size={13} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {hasNode
            ? selectedNodes.length === 1 ? 'Node Properties' : `${selectedNodes.length} Nodes`
            : hasSubgraph
              ? t('preview.subgraph')
              : hasEdge ? 'Edge Properties' : 'Properties'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!hasNode && !hasSubgraph && !hasEdge ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 py-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center opacity-30"
              style={{ background: 'var(--surface-floating)' }}>
              <Settings2 size={18} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Click a node to edit its properties, or select a shape from the toolbar to add one.
            </p>
          </div>
        ) : hasNode ? (
          <NodePanel
            nodes={selectedNodes}
            onLabelChange={onLabelChange}
            onShapeChange={onShapeChange}
            onStyleChange={onStyleChange}
            nodeIcon={nodeIcon}
            nodeImage={nodeImage}
            onIconChange={onIconChange}
            onImageChange={onImageChange}
          />
        ) : hasSubgraph && selectedSubgraphId && onViewChange ? (
          <SubgraphPanel
            subgraphId={selectedSubgraphId}
            subgraphLabel={selectedSubgraphLabel}
            subgraphView={subgraphView}
            onViewChange={onViewChange}
          />
        ) : selectedEdge ? (
          <EdgePanel
            edge={selectedEdge}
            onArrowChange={onArrowChange}
            onLabelChange={onEdgeLabelChange}
            onDeleteEdge={onDeleteEdge}
            edgeMeta={edgeMeta ?? selectedEdge.metadata ?? null}
            onEdgeMetaChange={onEdgeMetaChange}
            onEdgeIdChange={onEdgeIdChange}
            onEdgeLengthChange={onEdgeLengthChange}
            onAnimatePreset={onAnimatePreset}
          />
        ) : null}
      </div>
    </div>
  );
}
