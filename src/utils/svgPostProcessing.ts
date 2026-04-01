/**
 * SVG post-processing utilities for fixing Mermaid rendering issues.
 */

/** Add missing gradient definitions for Sankey diagrams (Mermaid 11.x bug workaround) */
function addSankeyGradients(doc: Document, svg: SVGSVGElement): boolean {
  // Check if defs already exists
  if (svg.querySelector('defs')) return false;

  // Find all gradient references in the SVG
  const gradientRefs = new Set<string>();
  doc.querySelectorAll('path[stroke*="url(#"]').forEach(path => {
    const stroke = path.getAttribute('stroke');
    if (stroke) {
      const match = stroke.match(/url\(#(linearGradient-[^\)]+)\)/);
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
 * Center edge label text within its background rect (Mermaid htmlLabels:false misalignment).
 * Also reorders SVG elements to ensure proper z-index layering.
 */
export function fixEdgeLabelTextPosition(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  let changed = false;

  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  // Check diagram type
  const isFlowchart = svgString.includes('flowchart') || svgString.includes('graph LR') || svgString.includes('graph TD');
  const isSankey = svg.getAttribute('aria-roledescription') === 'sankey' || svgString.includes('sankey');

  // Add missing gradients for Sankey diagrams
  if (isSankey) {
    changed = addSankeyGradients(doc, svg) || changed;
    // For Sankey, just return with gradients added
    if (changed) {
      return new XMLSerializer().serializeToString(doc.documentElement);
    }
    return svgString;
  }

  // Only apply edge label fixes and reordering for flowchart diagrams
  if (!isFlowchart) {
    return svgString;
  }

  // Center edge label text
  doc.querySelectorAll('.edgeLabel .label').forEach(label => {
    const rect = label.querySelector('rect.background');
    const text = label.querySelector('text');
    if (!rect || !text) return;

    const rectY = parseFloat(rect.getAttribute('y') || '0');
    const rectH = parseFloat(rect.getAttribute('height') || '0');
    if (rectH <= 0) return;

    const centerY = rectY + rectH / 2;
    text.setAttribute('y', String(centerY));
    text.setAttribute('dominant-baseline', 'middle');
    text.removeAttribute('dy');

    text.querySelectorAll('tspan.text-outer-tspan').forEach(tspan => {
      tspan.removeAttribute('y');
    });
    changed = true;
  });

  // Reorder SVG: nodes first, then edges (arrows), then edge labels
  // This ensures arrows appear ON TOP of node shapes
  const nodes = Array.from(svg.querySelectorAll('g.nodes, g.node'));
  const edgePaths = Array.from(svg.querySelectorAll('g.edges, g.edgePaths, g.edgePath'));
  const edgeLabels = Array.from(svg.querySelectorAll('.edgeLabel'));

  if (nodes.length || edgePaths.length || edgeLabels.length) {
    // Create a document fragment to hold reordered elements
    const fragment = document.createDocumentFragment();

    // Add nodes first
    nodes.forEach(node => fragment.appendChild(node));

    // Add edges (arrows) second - so they render ON TOP of nodes
    edgePaths.forEach(edge => fragment.appendChild(edge));

    // Add edge labels last - so they render on top of everything
    edgeLabels.forEach(label => fragment.appendChild(label));

    // Append all reordered elements at the end of SVG
    // (they'll be after any remaining elements like clusters, defs, etc.)
    Array.from(fragment.childNodes).forEach(child => {
      svg.appendChild(child);
    });

    changed = true;
  }

  if (!changed) return svgString;
  return new XMLSerializer().serializeToString(doc.documentElement);
}
