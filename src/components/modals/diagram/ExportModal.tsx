import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, FileText, Code, Share2, Check, Braces, X, Download, Circle } from 'lucide-react';
import { SUPPORTED_GOOGLE_FONTS, findGoogleFont } from '@/constants/fonts';
import { fixDiagramLabels } from '@/utils/svgPostProcessing';
import { renderDiagram } from '@/lib/mermaid/core';
import { parseFrontmatter } from '@/lib/mermaid/codeUtils';

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
  const [transparentBg, setTransparentBg] = useState(false);

  function markDone(id: string) {
    setDone(id);
    setTimeout(() => setDone(null), 2000);
  }

  async function getSvgString(): Promise<string | null> {
    const { svg, error } = await renderDiagram(diagramContent, `export_${Date.now()}`);
    if (error || !svg) return null;
    // Fix all label centering and add missing gradients for Sankey diagrams
    return fixDiagramLabels(svg);
  }

  async function exportSvg() {
    const svgStr = await getSvgString();
    if (!svgStr) return;

    // Embed fonts into the SVG so they display correctly when opened standalone
    const fontFamily = extractFontFamilyFromContent(diagramContent);
    const fontCss = await fetchEmbeddedFontCss(fontFamily);
    
    let finalSvg = svgStr;
    const styleParts = [];
    if (fontCss) styleParts.push(fontCss);
    if (fontFamily) styleParts.push(`* { font-family: ${fontFamily} !important; }`);

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
  }

  // Helper to convert oklch color to hex
  function oklchToHex(oklchStr: string): string {
    // Parse oklch string like "oklch(50% 0.1 200)" or "oklch(50% 0.1 200 / 0.5)"
    const match = oklchStr.match(/oklch\s*\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/);
    if (!match) return '#333333'; // fallback

    const l = parseFloat(match[1].replace('%', '')) / 100;
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);

    // Simplified oklch to sRGB conversion (approximate)
    // For better results, use a library like culori
    const l2 = l + 0.39633777 * c * Math.cos(h * Math.PI / 180) + 0.21580375 * c * Math.sin(h * Math.PI / 180);
    const m2 = 1.0 + 0.39633777 * c * Math.cos(h * Math.PI / 180) - 0.21580375 * c * Math.sin(h * Math.PI / 180);
    const m2b = -0.25656905 * c * Math.cos(h * Math.PI / 180) + 0.62204873 * c * Math.sin(h * Math.PI / 180);

    const l3 = l2 + 0.26405402 * m2b;
    const b = m2 + -0.09511347 * m2b;

    // Simplified gamma correction and RGB conversion
    const r = Math.min(255, Math.max(0, (l3 + b + 1.0) * 127));
    const g = Math.min(255, Math.max(0, (l3 - b) * 127 + 64));
    const b2 = Math.min(255, Math.max(0, (l3 - 2.0 * b) * 127 + 64));

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
  }

  async function exportPng() {
    const svgStr = await getSvgString();
    if (!svgStr) return;

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
      const fontCss = await fetchEmbeddedFontCss(fontFamily);
      
      const styleParts = [];
      if (fontCss) styleParts.push(fontCss);
      if (fontFamily) styleParts.push(`* { font-family: ${fontFamily}, sans-serif !important; }`);

      if (styleParts.length > 0) {
        const styleTag = `<style>${styleParts.join('\n')}</style>`;
        cleanSvg = cleanSvg.replace(/(<svg[^>]*>)/, `$1\n${styleTag}`);
      }

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

      // Get the current theme's background color
      const bgColor = transparentBg ? 'transparent' : 
        getComputedStyle(document.documentElement).getPropertyValue('--surface-base').trim() || '#ffffff';

      // Create a canvas element
      const canvas = document.createElement('canvas');
      const scale = 2; // High resolution
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Draw background if not transparent
      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Use a data URL for the image to avoid cross-origin issues
      const img = new Image();
      // Use btoa for encoding the SVG string to base64 to ensure it's "safe" for canvas
      const svgBase64 = btoa(unescape(encodeURIComponent(cleanSvg)));
      const url = `data:image/svg+xml;base64,${svgBase64}`;

      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${diagramTitle.replace(/\s+/g, '_')}.png`;
              a.click();
              URL.revokeObjectURL(pngUrl);
              markDone('png');
            }
          }, 'image/png');
        } catch (e) {
          console.error('Failed to draw or export canvas:', e);
        }
      };

      img.onerror = (err) => {
        console.error('Failed to load SVG into image for PNG export:', err);
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText('```mermaid\n' + diagramContent + '\n```');
    markDone('md');
  }

  async function copyEmbedCode() {
    const embed = `<div class="mermaid">
${diagramContent}
</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" integrity="sha384-tI0sDqjGJcqrQ8e/XKiQGS+ee11v5knTNWx2goxMBxe4DO9U0uKlfxJtYB9ILZ4j" crossorigin="anonymous"></script>
<script>mermaid.initialize({ startOnLoad: true });</script>`;
    await navigator.clipboard.writeText(embed);
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

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <Download size={12} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{t('export.title')}</span>
              <span className="text-[10px] truncate max-w-[150px] block" style={{ color: 'var(--text-tertiary)' }}>{diagramTitle}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Transparent Background Toggle */}
          <label className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            <div className="relative">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={e => setTransparentBg(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${transparentBg ? 'bg-teal-500' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${transparentBg ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Circle size={14} style={{ color: transparentBg ? 'var(--accent)' : 'var(--text-tertiary)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('export.transparentBackground')}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {t('export.transparentBackgroundDesc')}
                </p>
              </div>
            </div>
          </label>
          {options.map(opt => (
            <button key={opt.id} onClick={opt.action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border transition-all duration-150"
              style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
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
        </div>
      </div>
    </div>
  );
}
