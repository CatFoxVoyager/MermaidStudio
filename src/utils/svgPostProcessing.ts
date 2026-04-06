/**
 * SVG post-processing utilities for fixing Mermaid rendering issues.
 */

/**
 * Resize background rect and center text within it.
 * Uses dominant-baseline for reliable SVG text centering.
 */
function resizeBackgroundRect(text: Element, rect: Element, fontSize: number, fontFamily?: string): void {
  const content = text.textContent?.trim() ?? '';
  if (!content) return;

  // Use canvas for precise text measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let textWidth = content.length * fontSize * 0.6; // Fallback

  if (context) {
    context.font = `${fontSize}px ${fontFamily || 'Inter, system-ui, sans-serif'}`;
    textWidth = context.measureText(content).width;
  }

  const textHeight = fontSize * 1.2;
  const hPad = 8;
  const vPad = 4;

  const newWidth = textWidth + hPad * 2;
  const newHeight = textHeight + vPad * 2;

  const textX = parseFloat(text.getAttribute('x') || '0');
  const textY = parseFloat(text.getAttribute('y') || '0');

  // Resize and reposition rect
  rect.setAttribute('width', String(newWidth));
  rect.setAttribute('height', String(newHeight));
  rect.setAttribute('x', String(textX - newWidth / 2));
  rect.setAttribute('y', String(textY - newHeight / 2));

  // Center text using dominant-baseline
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('text-anchor', 'middle');

  // Clear dy attributes on all tspans to prevent interference
  text.querySelectorAll('tspan').forEach(tspan => {
    tspan.setAttribute('dy', '0');
    tspan.setAttribute('x', String(textX));
  });
}

/** Add missing gradient definitions for Sankey diagrams (Mermaid 11.x bug workaround) */
function addSankeyGradients(doc: Document, svg: SVGSVGElement): boolean {
  // Check if defs already exists
  if (svg.querySelector('defs')) return false;

  // Find all gradient references in the SVG
  const gradientRefs = new Set<string>();
  doc.querySelectorAll('path[stroke*="url(#"]').forEach(path => {
    const stroke = path.getAttribute('stroke');
    if (stroke) {
      const match = stroke.match(/url\(#(linearGradient-[^)]+)\)/);
      if (match) {
        gradientRefs.add(match[1]);
      }
    }
  });

  if (gradientRefs.size === 0) return false;

  // Create defs element with gradient definitions
  const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Sankey color palette (Tableau 10 colors)
  const colors = [
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
    '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
  ];

  let colorIndex = 0;
  gradientRefs.forEach(id => {
    const gradient = doc.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', id);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const color = colors[colorIndex % colors.length];
    const stop1 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color);
    stop1.setAttribute('stop-opacity', '0.3');

    const stop2 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color);
    stop2.setAttribute('stop-opacity', '0.8');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    colorIndex++;
  });

  // Insert defs at the beginning of SVG (before other elements)
  svg.insertBefore(defs, svg.firstChild);

  return true;
}

/**
 * Center node label text and resize node shape to fit.
 */
/**
 * Center node label text and resize node shape to fit.
 */
function fixNodeLabels(doc: Document, svg: SVGSVGElement, fontFamily: string): boolean {
  let changed = false;

  // Extract global font size from SVG style tags as a better fallback
  let globalFontSize = 14;
  doc.querySelectorAll('style').forEach(styleEl => {
    const text = styleEl.textContent || '';
    const match = text.match(/font-size:\s*([\d.]+)px/);
    if (match) {
      globalFontSize = parseFloat(match[1]);
    }
  });
  
  doc.querySelectorAll('.node').forEach(node => {
    // 1. Find text elements or foreignObjects (Mermaid 11 uses foreignObject for labels)
    const textElements = Array.from(node.querySelectorAll('text'));
    const foreignObjects = Array.from(node.querySelectorAll('foreignObject'));
    
    if (textElements.length === 0 && foreignObjects.length === 0) return;

    // Use the first text element or foreignObject for measurements
    let text: Element | null = null;
    let content = '';
    let fontSize = globalFontSize;

    if (textElements.length > 0) {
      text = textElements[0];
      content = text.textContent?.trim() ?? '';
      fontSize = parseFloat(text.getAttribute('font-size') || String(globalFontSize));
    } else if (foreignObjects.length > 0) {
      // For foreignObject, find the first span or div with text
      const fo = foreignObjects[0];
      const textSource = fo.querySelector('span, div, p') || fo;
      content = textSource.textContent?.trim() ?? '';
      
      // Attempt to extract font size from style or parent g
      const styleAttr = fo.getAttribute('style') || '';
      const fontSizeMatch = styleAttr.match(/font-size:\s*([\d.]+)px/);
      if (fontSizeMatch) {
        fontSize = parseFloat(fontSizeMatch[1]);
      } else {
        // Fallback: check ancestor group style
        const gLabel = fo.closest('.label');
        const gStyle = gLabel?.getAttribute('style') || '';
        const gFontSizeMatch = gStyle.match(/font-size:\s*([\d.]+)px/);
        if (gFontSizeMatch) {
          fontSize = parseFloat(gFontSizeMatch[1]);
        }
      }
    }

    const shape = node.querySelector('rect, polygon, path, circle, ellipse');
    if (!shape || !content) return;

    // Use canvas for precise text measurement (still useful for horizontal centering)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let textWidth = content.length * fontSize * 0.6; // Fallback

    if (context) {
      context.font = `${fontSize}px ${fontFamily}`;
      textWidth = context.measureText(content).width;
    }

    // 2. Center the label position within the existing shape bounding box
    const gLabel = node.querySelector('g.label');
    if (gLabel) {
      // Get the bounding box of the shape to find its center
      const sRect = (shape as any).getBBox?.() || { x: 0, y: 0, width: 0, height: 0 };
      const sCenterX = sRect.x + sRect.width / 2;
      const sCenterY = sRect.y + sRect.height / 2;

      if (foreignObjects.length > 0) {
        // Mermaid 11+ uses foreignObject for labels and handles positioning correctly,
        // especially with themeVariables. Do NOT override positioning or inner div styles.
        // Only fix SVG text elements (below) which Mermaid sometimes mispositions.
      } else if (text) {
        // SVG text elements: center at shape's center
        text.setAttribute('x', String(sCenterX));
        text.setAttribute('y', String(sCenterY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        gLabel.removeAttribute('transform');
      }
      changed = true;
    }

    // 4. DEEP CLEANING: Force center alignment on text elements
    // Only apply when using SVG text (not foreignObjects) for labels.
    // foreignObjects handle their own text layout via HTML/CSS, and
    // overriding text positioning breaks diagrams with themeVariables.
    if (foreignObjects.length === 0) {
      node.querySelectorAll('text, tspan').forEach(el => {
        const tag = el.tagName.toLowerCase();

        if (tag === 'text' || tag === 'tspan') {
          el.setAttribute('x', '0');
          el.setAttribute('text-anchor', 'middle');
          el.setAttribute('dominant-baseline', 'central');
          el.removeAttribute('y');
          el.removeAttribute('dx');
          el.removeAttribute('dy');

          const style = (el as HTMLElement).style;
          style.setProperty('text-anchor', 'middle', 'important');
          style.setProperty('text-align', 'center', 'important');
          style.setProperty('alignment-baseline', 'central', 'important');
          style.setProperty('transform', 'none', 'important');
          style.setProperty('x', '0', 'important');
        }
      });
    }

    // Final vertical nudge for text element if it exists
    if (text) {
      const lowerFont = fontFamily.toLowerCase();
      const isImpact = lowerFont.includes('impact');
      const isOswald = lowerFont.includes('oswald');
      text.setAttribute('dy', (isImpact || isOswald) ? '0.15em' : '0.1em');
      text.style.setProperty('alignment-baseline', 'central', 'important');
    }
  });

  return changed;
}

/**
 * Center edge and node labels within their containers.
 * Also reorders SVG elements to ensure proper z-index layering.
 */
export function fixDiagramLabels(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  let changed = false;

  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  // Extract font family from SVG to use for measurements
  const svgStyle = svg.getAttribute('style') || '';
  const fontMatch = svgStyle.match(/font-family:\s*([^;]+)/);
  const fontFamily = fontMatch ? fontMatch[1].trim() : 'Inter, system-ui, sans-serif';

  // Check diagram type
  const roleDescription = svg.getAttribute('aria-roledescription');
  const isSankey = roleDescription === 'sankey' || svgString.includes('sankey');
  const isFlowchart =
    roleDescription === 'flowchart' ||
    roleDescription === 'flowchart-v2' ||
    svgString.includes('flowchart') ||
    svg.querySelector('.flowchart') !== null ||
    (svg.querySelector('.node') !== null && svg.querySelector('.edgePath') !== null);

  // Add missing gradients for Sankey diagrams
  if (isSankey) {
    changed = addSankeyGradients(doc, svg) || changed;
    if (changed) {
      return new XMLSerializer().serializeToString(doc.documentElement);
    }
    return svgString;
  }

  // Apply node label fixes
  if (isFlowchart) {
    changed = fixNodeLabels(doc, svg, fontFamily) || changed;
  }

  // Center edge label text vertically within its background rect.
  // DISABLED: Automatic centering breaks multi-line labels and is too complex.
  // Mermaid's default positioning works correctly for both single and multi-line labels.
  /*
  doc.querySelectorAll('.edgeLabel .label').forEach(label => {
    const rect = label.querySelector('rect.background');
    const text = label.querySelector('text');
    if (!rect || !text) return;

    const rectY = parseFloat(rect.getAttribute('y') || '0');
    const rectH = parseFloat(rect.getAttribute('height') || '0');
    if (rectH <= 0) return;

    // The rect is positioned relative to the label group's transform
    // We need to calculate dy to center the text within the rect
    // The first tspan's dy positions the text relative to the text element
    const firstTspan = text.querySelector('tspan');
    if (firstTspan) {
      // Get original dy value (Mermaid uses "1.1em" for multi-line)
      const originalDy = firstTspan.getAttribute('dy') || '0';
      // Calculate the offset needed: (rectH/2) - (font-size * 1.1) / 2
      // For a 14px font, 1.1em = ~15.4px, half is ~7.7px
      // rectH/2 should position us at center, so we adjust dy accordingly
      const fontSize = parseFloat(text.getAttribute('font-size') || '14');
      const tspanOffset = parseFloat(originalDy) || (fontSize * 1.1);
      const centerOffset = (rectH / 2) - (fontSize * 0.5); // Approximate visual center

      firstTspan.setAttribute('dy', String(centerOffset));
    }

    text.setAttribute('text-anchor', 'middle');
    text.removeAttribute('dominant-baseline');
    text.removeAttribute('y'); // Let dy handle positioning

    // Fix tspans: set x position but preserve dy for multi-line
    text.querySelectorAll('tspan').forEach(tspan => {
      tspan.setAttribute('x', text.getAttribute('x') || '0');
      tspan.removeAttribute('y');
      // DO NOT modify dy except for the first one (handled above)
      // Multi-line tspans keep their original dy values
    });

    // DO NOT resize the background rect
    // Mermaid already calculates the correct size for multi-line labels

    // Apply background color and opacity from Mermaid style if available
    const fill = rect.getAttribute('fill');
    const fillOpacity = rect.getAttribute('fill-opacity');
    if (fill && fill !== 'none') {
      rect.style.fill = fill;
    }
    if (fillOpacity) {
      rect.style.fillOpacity = fillOpacity;
    }

    changed = true;
  });
  */

  // Reorder SVG elements so edge labels are ABOVE edge paths.
  // This ensures label backgrounds with opaque colors cover the edge lines.
  const root = svg.querySelector('.root') || svg;
  const nodes = Array.from(root.children).filter(el => el.classList.contains('nodes'));
  const edgePaths = Array.from(root.children).filter(el => el.classList.contains('edgePaths') || el.classList.contains('edges'));
  const edgeLabels = Array.from(root.children).filter(el => el.classList.contains('edgeLabels'));

  if (nodes.length || edgePaths.length || edgeLabels.length) {
    const parent = root;
    nodes.forEach(node => parent.appendChild(node));
    edgePaths.forEach(edge => parent.appendChild(edge));      // Paths FIRST (bottom)
    edgeLabels.forEach(label => parent.appendChild(label));  // Labels LAST (on top)
    changed = true;
  }

  // Scale and color arrowhead markers
  const markers = doc.querySelectorAll('marker');
  const arrowheadMarkers = new Map<string, SVGMarkerElement>();
  markers.forEach(marker => {
    const id = marker.id;
    if (id.includes('arrowhead') || id.includes('head')) {
      arrowheadMarkers.set(id, marker as SVGMarkerElement);
    }

    // Ensure markers are visible even if content exceeds viewport (Mermaid sequence diagram bug)
    marker.setAttribute('overflow', 'visible');

    if (marker.getAttribute('markerUnits') === 'userSpaceOnUse') {
      marker.setAttribute('markerUnits', 'strokeWidth');
      const mw = parseFloat(marker.getAttribute('markerWidth') || '0');
      const mh = parseFloat(marker.getAttribute('markerHeight') || '0');
      
      // If no viewBox exists, add one based on original dimensions to prevent clipping when scaling down
      if (!marker.getAttribute('viewBox') && mw > 0 && mh > 0) {
        marker.setAttribute('viewBox', `0 0 ${mw} ${mh}`);
      }

      if (mw > 0) marker.setAttribute('markerWidth', String(mw / 2));
      if (mh > 0) marker.setAttribute('markerHeight', String(mh / 2));
      if (marker.getAttribute('viewBox')) {
        marker.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      changed = true;
    }
  });

  // Sync edge arrowheads with edge colors
  const defs = svg.querySelector('defs') || doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!svg.querySelector('defs')) svg.insertBefore(defs, svg.firstChild);

  // Expanded selector to include sequence diagram message lines
  doc.querySelectorAll('.edgePaths path, .messageLine0, .messageLine1, .messageLine').forEach((path, idx) => {
    const stroke = (path as SVGPathElement).style.stroke || path.getAttribute('stroke');
    if (!stroke || stroke === 'none') return;

    const markerEnd = path.getAttribute('marker-end');
    if (markerEnd) {
      const markerIdMatch = markerEnd.match(/url\(#([^)]+)\)/);
      if (markerIdMatch) {
        const originalMarkerId = markerIdMatch[1];
        const originalMarker = arrowheadMarkers.get(originalMarkerId);
        
        if (originalMarker) {
          // Create a unique marker for this color if it doesn't exist
          const cleanStroke = stroke.replace('#', '');
          const newMarkerId = `${originalMarkerId}-${cleanStroke}`;
          
          if (!doc.getElementById(newMarkerId)) {
            const newMarker = originalMarker.cloneNode(true) as SVGMarkerElement;
            newMarker.id = newMarkerId;
            const pathInMarker = newMarker.querySelector('path');
            if (pathInMarker) {
              pathInMarker.setAttribute('fill', stroke);
              pathInMarker.style.fill = stroke;
            }
            defs.appendChild(newMarker);
          }
          
          path.setAttribute('marker-end', `url(#${newMarkerId})`);
          changed = true;
        }
      }
    }
  });

  if (!changed) return svgString;
  return new XMLSerializer().serializeToString(doc.documentElement);
}

/**
 * Build a mapping from SVG edge-path index to parsed-edge index.
 * Uses edge label text as the primary matching signal (reliable even when
 * Mermaid reorders edges in the SVG), falling back to geometric matching
 * (path endpoints vs node positions) for edges with identical/empty labels.
 * Enforces one-to-one mapping so the Map inversion in applyEdgeFontStyles
 * never silently overwrites entries.
 */
function buildSvgToParsedEdgeMap(
  doc: Document,
  parsedEdges: Array<{ source: string; target: string; label?: string }>,
): Map<number, number> {
  const svg = doc.querySelector('svg');
  if (!svg) return new Map();

  // Collect node positions from their transforms
  // Store both full ID and simple ID (extracted from flowchart-{ID}-{NUM} pattern)
  const nodePositions = new Map<string, { x: number; y: number }>();
  svg.querySelectorAll('.node').forEach(nodeEl => {
    const transform = nodeEl.getAttribute('transform');
    const nodeId = nodeEl.getAttribute('id') || nodeEl.getAttribute('data-id');
    if (transform && nodeId) {
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const pos = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        nodePositions.set(nodeId, pos);

        // Also store under simple ID extracted from the full ID
        // Pattern: ...flowchart-{SIMPLE_ID}-{NUM}
        const simpleIdMatch = nodeId.match(/flowchart-([A-Za-z0-9_-]+)-\d+$/);
        if (simpleIdMatch) {
          const simpleId = simpleIdMatch[1];
          nodePositions.set(simpleId, pos);
        }
      }
    }
  });

  // Extract text content from SVG edge labels (same order as edgePaths)
  const edgeLabelsContainer = svg.querySelector('g.edgeLabels');
  const svgLabelTexts: string[] = [];
  if (edgeLabelsContainer) {
    Array.from(edgeLabelsContainer.children).forEach(label => {
      const textEl = label.querySelector('text');
      svgLabelTexts.push(textEl?.textContent?.trim() ?? '');
    });
  }

  const edgePaths = svg.querySelectorAll('.edgePaths path.flowchart-link');
  const map = new Map<number, number>();
  const matchedParsed = new Set<number>();

  edgePaths.forEach((path, svgIndex) => {
    const svgLabel = svgLabelTexts[svgIndex] ?? '';
    const d = path.getAttribute('d');
    const moveMatch = d?.match(/M\s+([-\d.]+)\s+([-\d.]+)/);
    const endMatch = d?.match(/([-\d.]+)\s+([-\d.]+)$/);
    const hasPathData = moveMatch && endMatch;

    // Phase 1: exact label text match among unmatched parsed edges
    const textCandidates: number[] = [];
    for (let i = 0; i < parsedEdges.length; i++) {
      if (matchedParsed.has(i)) continue;
      if ((parsedEdges[i].label?.trim() ?? '') === svgLabel) {
        textCandidates.push(i);
      }
    }

    if (textCandidates.length === 1) {
      map.set(svgIndex, textCandidates[0]);
      matchedParsed.add(textCandidates[0]);
      return;
    }

    // Phase 2: geometric matching among candidates
    // If multiple text-matched candidates exist, disambiguate among them;
    // otherwise fall back to all unmatched parsed edges.
    const geoCandidates = textCandidates.length > 1
      ? textCandidates
      : parsedEdges.map((_, i) => i).filter(i => !matchedParsed.has(i));

    if (!hasPathData) {
      if (geoCandidates.length > 0) {
        map.set(svgIndex, geoCandidates[0]);
        matchedParsed.add(geoCandidates[0]);
      }
      return;
    }

    const pathStart = { x: parseFloat(moveMatch![1]), y: parseFloat(moveMatch![2]) };
    const pathEnd = { x: parseFloat(endMatch![1]), y: parseFloat(endMatch![2]) };

    let bestMatch = -1;
    let bestDistance = Infinity;

    for (const parsedIdx of geoCandidates) {
      const edge = parsedEdges[parsedIdx];
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) continue;

      const forward =
        Math.hypot(pathStart.x - sourcePos.x, pathStart.y - sourcePos.y) +
        Math.hypot(pathEnd.x - targetPos.x, pathEnd.y - targetPos.y);
      const reverse =
        Math.hypot(pathStart.x - targetPos.x, pathStart.y - targetPos.y) +
        Math.hypot(pathEnd.x - sourcePos.x, pathEnd.y - sourcePos.y);
      const minDist = Math.min(forward, reverse);

      if (minDist < bestDistance && minDist < 50) {
        bestDistance = minDist;
        bestMatch = parsedIdx;
      }
    }

    if (bestMatch !== -1) {
      map.set(svgIndex, bestMatch);
      matchedParsed.add(bestMatch);
    } else {
      // Fallback: assign first unmatched parsed index
      const unmatched = parsedEdges.findIndex((_, i) => !matchedParsed.has(i));
      if (unmatched !== -1) {
        map.set(svgIndex, unmatched);
        matchedParsed.add(unmatched);
      }
    }
  });

  return map;
}

/**
 * Apply per-edge style overrides (font, stroke, arrowheads) directly to SVG elements.
 * Uses geometric matching to reliably map linkStyle indices to SVG paths and labels.
 */
export function applyEdgeFontStyles(
  svgString: string,
  linkStyles: Map<number | 'default', { fontSize?: string; fontWeight?: string; stroke?: string; fill?: string; fillOpacity?: string }>,
  parsedEdges?: Array<{ source: string; target: string; label?: string }>,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  const edgeLabelsContainer = doc.querySelector('g.edgeLabels');
  // Include sequence diagram message lines (line elements) in addition to flowchart paths
  const edgePaths = Array.from(doc.querySelectorAll('.edgePaths path.flowchart-link, line.messageLine0, line.messageLine1, line.messageLine'));
  const labelChildren = edgeLabelsContainer ? Array.from(edgeLabelsContainer.children) : [];

  // Collect all arrowhead markers
  const defs = svg.querySelector('defs') || doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!svg.querySelector('defs')) svg.insertBefore(defs, svg.firstChild);

  const arrowheadMarkers = new Map<string, SVGMarkerElement>();
  doc.querySelectorAll('marker').forEach(marker => {
    if (marker.id.includes('arrowhead')) {
      arrowheadMarkers.set(marker.id, marker as SVGMarkerElement);
    }
  });

  const applyToEdge = (svgPathIdx: number, style: { fontSize?: string; fontWeight?: string; stroke?: string; fill?: string; fillOpacity?: string }) => {
    // 1. Apply to Path (Stroke & Arrowhead)
    const path = edgePaths[svgPathIdx];
    if (path instanceof SVGElement) {
      if (style.stroke) {
        path.setAttribute('stroke', style.stroke);
        const tagName = path.nodeName.toLowerCase();
        if (tagName === 'path' || tagName === 'line') {
          (path as any).style.stroke = style.stroke;
        }

        // Sync Arrowhead color
        const markerEnd = path.getAttribute('marker-end');
        if (markerEnd) {
          const markerIdMatch = markerEnd.match(/url\(#([^)]+)\)/);
          if (markerIdMatch) {
            const originalMarkerId = markerIdMatch[1];
            const originalMarker = arrowheadMarkers.get(originalMarkerId);
            if (originalMarker) {
              const cleanStroke = style.stroke.replace('#', '');
              const newMarkerId = `${originalMarkerId}-${cleanStroke}`;
              if (!doc.getElementById(newMarkerId)) {
                const newMarker = originalMarker.cloneNode(true) as SVGMarkerElement;
                newMarker.id = newMarkerId;
                const pathInMarker = newMarker.querySelector('path');
                if (pathInMarker) {
                  pathInMarker.setAttribute('fill', style.stroke);
                  pathInMarker.style.fill = style.stroke;
                }
                defs.appendChild(newMarker);
              }
              path.setAttribute('marker-end', `url(#${newMarkerId})`);
            }
          }
        }
      }
    }

    // 2. Apply to Label (Font, Background, Opacity)
    if (svgPathIdx < labelChildren.length) {
      const label = labelChildren[svgPathIdx];

      // Find the background rect - in Mermaid 11.x, it may be a sibling of the label group,
      // not nested inside it. Check the label itself first, then adjacent children.
      let rectEl = label.querySelector('rect.background') ||
                   label.querySelector('g.label rect.background') ||
                   label.querySelector('g rect') ||
                   label.querySelector('rect');

      // If not found in the label itself, check the next sibling (Mermaid 11.x pattern)
      if (!rectEl && svgPathIdx + 1 < labelChildren.length) {
        const nextSibling = labelChildren[svgPathIdx + 1];
        if (nextSibling) {
          rectEl = nextSibling.querySelector('rect.background') ||
                   nextSibling.querySelector('rect') ||
                   (nextSibling instanceof SVGRectElement ? nextSibling : null);
        }
      }

      // Font styles
      if (style.fontSize || style.fontWeight) {
        const textEl = label.querySelector('text');
        if (textEl) {
          const fontSize = style.fontSize ? parseInt(style.fontSize) : 18;
          if (style.fontSize) {
            textEl.setAttribute('font-size', style.fontSize);
          }
          if (style.fontWeight) textEl.setAttribute('font-weight', style.fontWeight);

          // Ensure tspans are horizontally centered but preserve their vertical offset (dy)
          textEl.querySelectorAll('tspan').forEach(tspan => {
            tspan.setAttribute('x', textEl.getAttribute('x') || '0');
            tspan.removeAttribute('y');
            // DO NOT remove dy
          });

          // Re-measure font family if available
          const fontMatch = svg.getAttribute('style')?.match(/font-family:\s*([^;]+)/);
          const fontFamily = fontMatch ? fontMatch[1].trim() : undefined;
          if (rectEl) resizeBackgroundRect(textEl, rectEl, fontSize, fontFamily);
        }
      }

      // Background color and opacity
      if (rectEl instanceof SVGRectElement) {
        // Mark this rect as styled by post-processing for testing
        rectEl.setAttribute('data-styled-by-post-processing', 'true');

        if (style.fill) {
          // Only override fill if user specified a custom color
          rectEl.style.setProperty('fill', style.fill, 'important');
          rectEl.setAttribute('fill', style.fill);
        }
        // If no custom fill, use Mermaid's default color (don't override)

        if (style.fillOpacity) {
          rectEl.style.setProperty('fill-opacity', style.fillOpacity, 'important');
          rectEl.setAttribute('fill-opacity', style.fillOpacity);
        } else {
          // Force opacity to 1 for opaque backgrounds
          rectEl.style.setProperty('fill-opacity', '1', 'important');
          rectEl.setAttribute('fill-opacity', '1');
        }
      } else if (style.fill || style.fillOpacity) {
        // Mermaid didn't create a background rect - create one now
        const textEl = label.querySelector('text');
        if (textEl) {
          const textContent = textEl.textContent?.trim() ?? '';
          if (textContent) {
            // Get the actual bounding box of the text element
            // This correctly handles multi-line labels (multiple tspans)
            const bbox = textEl.getBBox();
            const textWidth = bbox.width;
            const textHeight = bbox.height;
            const textX = bbox.x + bbox.width / 2;
            const textY = bbox.y + bbox.height / 2;

            const fontSize = parseInt(textEl.getAttribute('font-size') || '14');
            const hPad = fontSize * 0.5;
            const vPad = fontSize * 0.3;
            const rectWidth = textWidth + hPad * 2;
            const rectHeight = textHeight + vPad * 2;

            // Create background rect centered on the text bounding box
            const newRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
            newRect.setAttribute('class', 'background');
            newRect.setAttribute('x', String(textX - rectWidth / 2));
            newRect.setAttribute('y', String(textY - rectHeight / 2));
            newRect.setAttribute('width', String(rectWidth));
            newRect.setAttribute('height', String(rectHeight));
            newRect.setAttribute('rx', '4'); // Rounded corners
            newRect.setAttribute('ry', '4');

            // Apply fill and opacity
            if (style.fill) {
              newRect.setAttribute('fill', style.fill);
              newRect.style.fill = style.fill;
            } else {
              newRect.setAttribute('fill', '#ffffff'); // Default white background
              newRect.style.fill = '#ffffff';
            }

            if (style.fillOpacity) {
              newRect.setAttribute('fill-opacity', style.fillOpacity);
              newRect.style.fillOpacity = style.fillOpacity;
            } else {
              newRect.setAttribute('fill-opacity', '1'); // Default opaque
              newRect.style.fillOpacity = '1';
            }

            // Insert rect before text in the label group
            const labelGroup = label.querySelector('g');
            if (labelGroup) {
              labelGroup.insertBefore(newRect, labelGroup.firstChild);
            } else {
              label.insertBefore(newRect, textEl);
            }
          }
        }
      }
    }
  };

  // Handle 'default' style first
  const defaultStyle = linkStyles.get('default');
  if (defaultStyle) {
    edgePaths.forEach((_, idx) => applyToEdge(idx, defaultStyle));
  }

  // Map SVG indices to parsed indices for precise individual styling
  if (parsedEdges && parsedEdges.length > 0) {
    const svgToParsed = buildSvgToParsedEdgeMap(doc, parsedEdges);
    const parsedToSvg = new Map<number, number>();
    svgToParsed.forEach((parsedIdx, svgIdx) => parsedToSvg.set(parsedIdx, svgIdx));

    for (const [parsedIdx, style] of linkStyles) {
      if (parsedIdx === 'default') continue;
      const svgIdx = parsedToSvg.get(parsedIdx as number);
      if (svgIdx !== undefined) {
        applyToEdge(svgIdx, style);
      }
    }
  } else {
    // Fallback: direct index mapping
    for (const [idx, style] of linkStyles) {
      if (idx === 'default') continue;
      if (typeof idx === 'number' && idx < edgePaths.length) {
        applyToEdge(idx, style);
      }
    }
  }

  // FINAL CLEANUP: Remove fill from ALL edge paths (even those without custom styles)
  // This ensures Mermaid's incorrect fill application is always cleaned up
  edgePaths.forEach(path => {
    const tagName = path.nodeName.toLowerCase();
    if (tagName === 'path' || tagName === 'line') {
      path.removeAttribute('fill');
      path.removeAttribute('fill-opacity');
      path.setAttribute('fill', 'none');
      path.setAttribute('fill-opacity', '0');
      
      // Also try style attribute if it exists
      const currentStyle = path.getAttribute('style') || '';
      if (currentStyle) {
        const newStyle = currentStyle
          .replace(/fill\s*:\s*[^;]+;?/g, '')
          .replace(/fill-opacity\s*:\s*[^;]+;?/g, '') + 
          'fill: none !important; fill-opacity: 0 !important;';
        path.setAttribute('style', newStyle);
      }
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}

/**
 * Apply per-node style overrides (font weight, font size, text color) directly to SVG elements.
 * Matches nodes by ID and applies styles to their text elements and shapes.
 */
export function applyNodeFontStyles(
  svgString: string,
  nodeStyles: Map<string, { fontSize?: string; fontWeight?: string; color?: string }>
): string {
  if (nodeStyles.size === 0) return svgString;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  // Get all nodes in the SVG
  const nodes = Array.from(doc.querySelectorAll('.node'));

  for (const nodeEl of nodes) {
    const nodeId = nodeEl.getAttribute('id') || nodeEl.getAttribute('data-id');
    if (!nodeId) continue;

    // Try to find a matching style by ID
    let matchedStyle: { fontSize?: string; fontWeight?: string; color?: string } | undefined;

    // Direct ID match
    if (nodeStyles.has(nodeId)) {
      matchedStyle = nodeStyles.get(nodeId);
    } else {
      // Try simple ID match (extracted from any prefix-flowchart-{ID}-{NUM} pattern)
      const simpleIdMatch = nodeId.match(/-flowchart-([A-Za-z0-9_-]+)-\d+$/);
      if (simpleIdMatch) {
        const simpleId = simpleIdMatch[1];
        if (nodeStyles.has(simpleId)) {
          matchedStyle = nodeStyles.get(simpleId);
        }
      }
    }

    if (!matchedStyle) continue;

    // Apply font styles to text elements within the node
    const textElements = nodeEl.querySelectorAll('text');
    const foreignObjects = nodeEl.querySelectorAll('foreignObject');

    // For SVG text elements
    textElements.forEach(textEl => {
      if (matchedStyle!.fontSize) {
        textEl.setAttribute('font-size', matchedStyle!.fontSize);
        textEl.style.fontSize = matchedStyle!.fontSize;
      }
      if (matchedStyle!.fontWeight) {
        textEl.setAttribute('font-weight', matchedStyle!.fontWeight);
        textEl.style.fontWeight = matchedStyle!.fontWeight;
      }
      if (matchedStyle!.color) {
        textEl.setAttribute('fill', matchedStyle!.color);
        textEl.style.color = matchedStyle!.color;
      }
    });

    // For foreignObject elements (HTML-based labels in Mermaid 11+)
    foreignObjects.forEach(fo => {
      const div = fo.querySelector('div');
      if (div) {
        const divStyle = (div as HTMLElement).style;
        if (matchedStyle!.fontSize) {
          divStyle.fontSize = matchedStyle!.fontSize;
        }
        if (matchedStyle!.fontWeight) {
          divStyle.fontWeight = matchedStyle!.fontWeight;
        }
        if (matchedStyle!.color) {
          divStyle.color = matchedStyle!.color;
        }
      }

      // Also style spans within foreignObject
      const spans = fo.querySelectorAll('span');
      spans.forEach(span => {
        const spanStyle = (span as HTMLElement).style;
        if (matchedStyle!.fontSize) {
          spanStyle.fontSize = matchedStyle!.fontSize;
        }
        if (matchedStyle!.fontWeight) {
          spanStyle.fontWeight = matchedStyle!.fontWeight;
        }
        if (matchedStyle!.color) {
          spanStyle.color = matchedStyle!.color;
        }
      });
    });
  }

  return new XMLSerializer().serializeToString(doc.documentElement);
}
