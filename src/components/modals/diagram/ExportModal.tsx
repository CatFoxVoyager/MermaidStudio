import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image as ImageIcon,
  FileText,
  Code,
  Share2,
  Check,
  Braces,
  TriangleAlert,
} from 'lucide-react';
import { SUPPORTED_GOOGLE_FONTS, findGoogleFont } from '@/constants/fonts';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';
import { renderDiagram } from '@/lib/mermaid/core';
import { parseFrontmatter, parseDiagram, generateFrontmatter } from '@/lib/mermaid/codeUtils';
import { sanitizeCssValue } from '@/utils/sanitization';
import { oklchToHex } from '@/utils/oklch';
import {
  collectExternalImageHrefs,
  fetchImagesAsDataUris,
} from '@/utils/exportMedia';
import { buildMermaidEmbedSnippet } from '@/constants/cdnEmbed';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal } from '@/components/shared/Modal';

/** Extract font family from diagram frontmatter config */
function extractFontFamilyFromContent(content: string): string | null {
  try {
    const { frontmatter } = parseFrontmatter(content);
    const config = frontmatter.config as Record<string, any> | undefined;
    const themeVars = config?.themeVariables as Record<string, string> | undefined;
    return themeVars?.fontFamily || null;
  } catch {
    return null;
  }
}

/** Extract custom diagram background color from frontmatter themeVariables if authored */
function extractBackgroundFromContent(content: string): string | null {
  try {
    const { frontmatter } = parseFrontmatter(content);
    const config = frontmatter.config as Record<string, any> | undefined;
    const themeVars = config?.themeVariables as Record<string, string> | undefined;
    const bg = themeVars?.background?.trim();
    return bg || null;
  } catch {
    return null;
  }
}

/** Build the RENDER-SCOPED stepNumbers clone (EDGE-04, Surface 5, Grey Area
 *  6): merge flowchart.stepNumbers: true into the frontmatter config so the
 *  static badge layer freezes into the exported PNG. Every other frontmatter
 *  key is preserved through the parse/emit round-trip, an absent flowchart
 *  block is created, and the result exists ONLY inside the export call — the
 *  saved diagram content and the user's AdvancedStylePanel config are never
 *  written. */
function buildStepNumbersRenderContent(content: string): string {
  try {
    const { frontmatter, body } = parseFrontmatter(content);
    const config: Record<string, unknown> = {
      ...((frontmatter.config as Record<string, unknown> | undefined) ?? {}),
    };
    config.flowchart = {
      ...((config.flowchart as Record<string, unknown> | undefined) ?? {}),
      stepNumbers: true,
    };
    return `${generateFrontmatter(config)}\n\n${body}`;
  } catch {
    // Never break the export over an unparseable frontmatter — render as-is.
    return content;
  }
}

/** Cache for embedded font CSS to avoid re-fetching on every export. Key is font family name. */
const embeddedFontCache = new Map<string, string>();

/** Fetch Google Fonts CSS, download woff2 files, and return @font-face rules with embedded base64 data */
async function fetchEmbeddedFontCss(customFont?: string | null): Promise<string> {
  // Always include Inter and JetBrains Mono as base fonts
  const inter = findGoogleFont('Inter') || SUPPORTED_GOOGLE_FONTS[0];
  const jetbrains = findGoogleFont('JetBrains Mono') || SUPPORTED_GOOGLE_FONTS[SUPPORTED_GOOGLE_FONTS.length - 1];
  const baseFonts = [inter, jetbrains];
  const fontsToFetch = [...baseFonts];
  
  // If a custom font is requested and supported, add it
  if (customFont) {
    const supported = findGoogleFont(customFont);
    if (supported && !fontsToFetch.find(f => f.name === supported.name)) {
      fontsToFetch.push(supported);
    }
  }

  const cacheKey = fontsToFetch.map(f => f.name).sort().join('|');
  if (embeddedFontCache.has(cacheKey)) return embeddedFontCache.get(cacheKey)!;

  try {
    const responses = await Promise.all(fontsToFetch.map(f => fetch(f.url)));
    
    for (const resp of responses) {
      if (!resp.ok) throw new Error(`Failed to fetch font CSS`);
    }

    const cssTexts = await Promise.all(responses.map(resp => resp.text()));

    // Extract all woff2 font URLs from all CSS responses
    const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+\.woff2)\)/g;
    const allFontUrls = [...new Set(
      cssTexts.flatMap(css => Array.from(css.matchAll(urlRegex), m => m[1]))
    )];

    if (allFontUrls.length === 0) throw new Error('No font URLs found in CSS');

    // Fetch each font file and convert to base64
    const fontResults = await Promise.all(
      allFontUrls.map(async (url) => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const buf = await resp.arrayBuffer();
          // Use a more robust way to convert array buffer to base64
          let binary = '';
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          return { url, base64 };
        } catch (e) {
          console.error(`Failed to fetch font file: ${url}`, e);
          return null;
        }
      }),
    );

    // Replace URLs in combined CSS with base64 data URIs
    let result = cssTexts.join('\n');
    for (const font of fontResults) {
      if (font) {
        result = result.replaceAll(`url(${font.url})`, `url(data:font/woff2;base64,${font.base64})`);
      }
    }

    embeddedFontCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Failed to embed fonts for export:', err);
    return '';
  }
}

interface Props {
  isOpen?: boolean;
  diagramTitle: string;
  diagramContent: string;
  onClose: () => void;
  onCopyLink: () => void;
}

export function ExportModal({ isOpen = true, diagramTitle, diagramContent, onClose, onCopyLink }: Props) {
  const { t } = useTranslation();
  const [done, setDone] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  // Sibling advisory notice (Surface 5): how many external images could not
  // be fetched during the last PNG export. 0 = no warning rendered.
  const [inlineFailedCount, setInlineFailedCount] = useState(0);
  const [transparentBg, setTransparentBg] = useState(false);
  // PNG-only stepNumbers badge toggle (EDGE-04, Surface 5): export-scoped —
  // defaults off and never mutates the saved global config (Grey Area 6).
  const [stepNumbers, setStepNumbers] = useState(false);
  // Same parse as the preview, passed to the shared post-processing pipeline.
  const parsedDiagram = useMemo(() => parseDiagram(diagramContent), [diagramContent]);

  function markDone(id: string) {
    setDone(id);
    setExportError(null);
    setTimeout(() => setDone(null), 2000);
  }

  /** Surface download failures inside the sheet (iter-11 P2: svg/png errors
   *  were console-only — a failed mobile download looks like "nothing
   *  happened", and export is the session's emotional payoff). */
  function markExportError() {
    setDone(null);
    setExportError(t('export.downloadFailed'));
  }

  async function getSvgString(contentOverride?: string): Promise<string | null> {
    const { svg, error } = await renderDiagram(contentOverride ?? diagramContent, `export_${Date.now()}`);
    if (error || !svg) return null;
    // Same post-processing as the preview (label fixes + edge style cleanup),
    // so exports match what the user sees — e.g. linkStyle fill must not be
    // applied to edge paths (white polygons with curve: stepAfter).
    return postProcessDiagramSvg(svg, parsedDiagram);
  }

  async function exportSvg() {
    try {
      const svgStr = await getSvgString();
      if (!svgStr) { markExportError(); return; }

      // Embed fonts into the SVG so they display correctly when opened standalone.
      // Escape user-provided font names: this <style> ends up inside the exported
      // SVG file, where an unescaped `</style>` could inject arbitrary markup.
      const fontFamily = extractFontFamilyFromContent(diagramContent);
      const safeFontFamily = fontFamily ? sanitizeCssValue(fontFamily) : null;
      const fontCss = await fetchEmbeddedFontCss(fontFamily);

      let finalSvg = svgStr;
      const styleParts = [];
      if (fontCss) styleParts.push(fontCss);
      if (safeFontFamily) styleParts.push(`* { font-family: ${safeFontFamily} !important; }`);

      if (styleParts.length > 0) {
        const styleTag = `<style>${styleParts.join('\n')}</style>`;
        // Insert the style element right after the opening <svg> tag
        finalSvg = finalSvg.replace(/(<svg[^>]*>)/, `$1\n${styleTag}`);
      }

      const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${diagramTitle.replace(/\s+/g, '_')}.svg`; a.click();
      URL.revokeObjectURL(url);
      markDone('svg');
    } catch (err) {
      console.error('SVG export failed:', err);
      markExportError();
    }
  }

  // oklch→hex conversion lives in src/utils/oklch.ts (spec-correct CSS
  // Color 4 pipeline with alpha preservation) and is unit-tested in
  // src/utils/__tests__/oklch.test.ts.

  async function exportPng() {
    // Export-scoped override (Surface 5): with the stepNumbers toggle checked,
    // the PNG run renders a content clone carrying flowchart.stepNumbers: true
    // so step-number badges freeze into the bitmap. The override lives only in
    // this function call — SVG export and copy actions ignore the toggle
    // entirely (no effect, no warning).
    const svgStr = await getSvgString(stepNumbers ? buildStepNumbersRenderContent(diagramContent) : undefined);
    if (!svgStr) { markExportError(); return; }

    try {
      // Clean the SVG string - convert all oklch colors to hex for compatibility
      let cleanSvg = svgStr.replace(/oklch\([^)]+\)/gi, (match) => {
        try {
          return oklchToHex(match);
        } catch {
          return '#333333';
        }
      });

      // Also handle potential style tags or inline styles that might have oklch
      cleanSvg = cleanSvg.replace(/style="([^"]*)"/gi, (match, p1) => {
        const fixedStyle = p1.replace(/oklch\([^)]+\)/gi, (m: string) => oklchToHex(m));
        return `style="${fixedStyle}"`;
      });

      // Fix edge label backgrounds: white backgrounds (#ffffff) should be transparent in PNG export
      // This prevents unwanted white boxes on edge labels that are invisible in SVG
      cleanSvg = cleanSvg.replace(/(<rect class="background")([^>]*fill\s*=\s*")#ffffff(")/gi, (match, prefix, middle, end) => {
        return `${prefix}${middle}none${end}`;
      });
      cleanSvg = cleanSvg.replace(/(<rect class="background")([^>]*fill\s*=\s*")white(")/gi, (match, prefix, middle, end) => {
        return `${prefix}${middle}none${end}`;
      });

      // Embed fonts only if we want to risk tainting (not for PNG usually)
      // For PNG, we prefer success over custom fonts if it taints the canvas.
      // However, fetchEmbeddedFontCss returns base64 data URIs which SHOULD be safe.
      const fontFamily = extractFontFamilyFromContent(diagramContent);
      const safeFontFamily = fontFamily ? sanitizeCssValue(fontFamily) : null;
      const fontCss = await fetchEmbeddedFontCss(fontFamily);

      const styleParts = [];
      if (fontCss) styleParts.push(fontCss);
      if (safeFontFamily) styleParts.push(`* { font-family: ${safeFontFamily}, sans-serif !important; }`);

      if (styleParts.length > 0) {
        const styleTag = `<style>${styleParts.join('\n')}</style>`;
        cleanSvg = cleanSvg.replace(/(<svg[^>]*>)/, `$1\n${styleTag}`);
      }

      // ICON-04: best-effort CORS inlining for external <image> hrefs (PNG
      // only). SVG-as-<img> rasterization forbids network subresources, so an
      // unfetched external image renders blank in the PNG. Failures are
      // counted, never fatal (T-39-08) — the modal warns with the count.
      // Zero changes to exportSvg: the SVG file stays inline-free so external
      // refs resolve when the file is opened online.
      const externalUrls = collectExternalImageHrefs(cleanSvg);
      let inlineFailed = 0;
      if (externalUrls.length > 0) {
        const { replacements, failed } = await fetchImagesAsDataUris(externalUrls);
        for (const [url, dataUri] of replacements) {
          cleanSvg = cleanSvg.split(`"${url}"`).join(`"${dataUri}"`);
        }
        inlineFailed = failed;
      }
      setInlineFailedCount(inlineFailed);

      // Extract dimensions
      const vbMatch = cleanSvg.match(/viewBox="([^"]+)"/);
      let width = 800, height = 600;
      if (vbMatch) {
        const parts = vbMatch[1].split(/[\s,]+/).map(Number);
        if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      }

      // Fix width/height attributes
      cleanSvg = cleanSvg
        .replace(/<svg([^>]*?)width="[^"]*"/, `<svg$1width="${width}"`)
        .replace(/<svg([^>]*?)height="[^"]*"/, `<svg$1height="${height}"`);

      // Prefer the diagram's authored themeVariables.background (e.g. #111111 on dark topology diagrams),
      // falling back to the current UI surface background when not transparent.
      const authoredBg = extractBackgroundFromContent(diagramContent);
      const bgColor = transparentBg
        ? 'transparent'
        : authoredBg || getComputedStyle(document.documentElement).getPropertyValue('--surface-base').trim() || '#ffffff';

      // Use a data URL for the image to avoid cross-origin issues
      const img = new Image();
      // Ensure valid XML for SVG image loading.
      // Mermaid's foreignObject may contain unclosed HTML void elements (<br>, <hr>, etc.)
      // that break XML parsing when loaded as an SVG image.
      // Parse through DOMParser's forgiving HTML mode, then re-serialize with
      // XMLSerializer which produces properly self-closed XHTML tags.
      try {
        const htmlDoc = new DOMParser().parseFromString(cleanSvg, 'text/html');
        const svgEl = htmlDoc.querySelector('svg');
        if (svgEl) {
          cleanSvg = new XMLSerializer().serializeToString(svgEl);
        }
      } catch { /* fall through with original cleanSvg */ }
      // Encode SVG as base64 data URL (more reliable than blob URL for canvas)
      const svgBase64 = btoa(unescape(encodeURIComponent(cleanSvg)));
      const url = `data:image/svg+xml;base64,${svgBase64}`;

      img.onload = () => {
        try {
          // Guard against browser hardware canvas limits on massive diagrams (e.g. 8000+ px topologies)
          const MAX_CANVAS_SIDE = 16384;
          const MAX_CANVAS_AREA = 67_108_864; // 64 MP safe cross-browser ceiling
          let targetW = img.naturalWidth || width;
          let targetH = img.naturalHeight || height;
          const sideScale = Math.min(1, MAX_CANVAS_SIDE / targetW, MAX_CANVAS_SIDE / targetH);
          const areaScale = targetW * targetH > MAX_CANVAS_AREA
            ? Math.sqrt(MAX_CANVAS_AREA / (targetW * targetH))
            : 1;
          const safeScale = Math.min(sideScale, areaScale);
          targetW = Math.max(1, Math.round(targetW * safeScale));
          targetH = Math.max(1, Math.round(targetH * safeScale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');

          // Fill background first if not transparent
          if (!transparentBg) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Draw the image at full canvas size
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${diagramTitle.replace(/\s+/g, '_')}.png`;
              a.click();
              // Delay URL revocation to ensure download completes
              setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
              markDone('png');
            } else {
              console.error('PNG Export: Blob is null or undefined');
              markExportError();
            }
          }, 'image/png');
        } catch (e) {
          console.error('Failed to draw or export canvas:', e);
          markExportError();
        }
      };

      img.onerror = (err) => {
        console.error('Failed to load SVG into image for PNG export:', err);
        markExportError();
      };

      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
      markExportError();
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText('```mermaid\n' + diagramContent + '\n```');
    markDone('md');
  }

  async function copyEmbedCode() {
    // Version tag + SRI hash come from the shared constants module
    // (src/constants/cdnEmbed.ts), kept in sync with
    // scripts/verify-cdn-embed.html by src/constants/__tests__/cdnEmbed.test.ts.
    await navigator.clipboard.writeText(buildMermaidEmbedSnippet(diagramContent));
    markDone('embed');
  }

  async function handleCopyLink() {
    onCopyLink();
    markDone('link');
  }

  const options = [
    { id: 'svg', icon: <FileText size={18} />, label: t('export.exportSvg'), desc: t('export.exportSvgDesc'), action: exportSvg },
    { id: 'png', icon: <ImageIcon size={18} />, label: t('export.exportPng'), desc: t('export.exportPngDesc'), action: exportPng },
    { id: 'md', icon: <Code size={18} />, label: t('export.copyMarkdown'), desc: t('export.copyMarkdownDesc'), action: copyMarkdown },
    { id: 'embed', icon: <Braces size={18} />, label: t('export.copyEmbedCode'), desc: t('export.copyEmbedDesc'), action: copyEmbedCode },
    { id: 'link', icon: <Share2 size={18} />, label: t('export.copyShareLink'), desc: t('export.copyShareLinkDesc'), action: handleCopyLink },
  ];

  const isMobile = useMediaQuery('(max-width: 768px)');
  // Mobile keeps ALL options (critique iter-8 P0): the previous filter hid
  // SVG/PNG below 768px while the top bar showed a Download icon — the app's
  // most-wanted tap dead-ended into clipboard-only actions. The canvas
  // rasterizer and blob download below work on mobile browsers; the mobile
  // rendering is a bottom sheet (position below), not a feature cut.
  const visibleOptions = options;

  if (!isOpen) {return null;}

  // Shared Modal gives role="dialog"/aria-modal, the visibility-filtered
  // focus trap, Escape, and a labeled 44px close — all missing from the
  // hand-rolled overlay this replaces (mobile critique iter-7 P0: a live
  // Tab walk travelled straight through the open modal).
  // Mobile renders as a bottom sheet; the upsell footnote is gone from this
  // surface — all five export actions are real here now.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('export.title')}
      subtitle={diagramTitle}
      size="md"
      position={isMobile ? 'bottom' : 'center'}
    >
      <div className="p-4 space-y-3">
        {exportError && (
          <p className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" role="alert" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
            {exportError}
          </p>
        )}
        {/* Advisory CORS-inlining notice (Surface 5, PNG-only): N external
            images could not be embedded. Sits in the same notice channel as
            exportError but is a status (not an alert) — the export succeeded. */}
        {inlineFailedCount > 0 && (
          <p className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" role="status" style={{ background: 'var(--surface-floating)', color: 'var(--text-secondary)' }}>
            <TriangleAlert size={14} aria-hidden="true" className="shrink-0" />
            <span>{t('export.pngImageWarning', { count: inlineFailedCount })}</span>
          </p>
        )}
        {/* Actions first, options after (iter-22 P2: the PNG-only transparent
            toggle owned the first slot of the sheet's most-used moment). */}
        {visibleOptions.map(opt => (
          <button key={opt.id} onClick={opt.action}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] rounded-xl text-left border border-[var(--border-subtle)] hover:border-[var(--accent)] active:bg-[var(--state-pressed)] transition-all duration-150"
            style={{ background: 'var(--surface-floating)', color: 'var(--text-primary)' }}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-dim)', color: done === opt.id ? '#22c55e' : 'var(--accent)' }}>
              {done === opt.id ? <Check size={16} /> : opt.icon}
            </span>
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</p>
            </div>
          </button>
        ))}

        {/* Transparent-background is PNG-only — it trails the actions it
            serves instead of owning the sheet's first slot (iter-22 P2). */}
        <label className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all"
          style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={e => setTransparentBg(e.target.checked)}
            className="peer sr-only"
          />
          <div aria-hidden="true"
            className={`relative w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2 ${transparentBg ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${transparentBg ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('export.transparentBackground')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('export.transparentBackgroundDesc')}
            </p>
          </div>
        </label>

        {/* Step numbers is PNG-only like the row above — it trails the
            actions it serves, defaults off, and its override is scoped to
            the PNG render call only (EDGE-04, Surface 5). SVG export and
            the copy actions ignore it entirely: no effect, no warning. */}
        <label className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all"
          style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
          <input
            type="checkbox"
            checked={stepNumbers}
            onChange={e => setStepNumbers(e.target.checked)}
            className="peer sr-only"
          />
          <div aria-hidden="true"
            className={`relative w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2 ${stepNumbers ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${stepNumbers ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('export.stepNumbers')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('export.stepNumbersDesc')}
            </p>
          </div>
        </label>
      </div>
    </Modal>
  );
}
