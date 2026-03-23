import { useMemo } from 'react';

interface Props {
  original: string;
  modified: string;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
  lineNum: number | null;
  origLineNum: number | null;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const result: DiffLine[] = [];

  const maxLen = Math.max(origLines.length, modLines.length);
  let oi = 0, mi = 0;

  while (oi < origLines.length || mi < modLines.length) {
    if (oi < origLines.length && mi < modLines.length && origLines[oi] === modLines[mi]) {
      result.push({ type: 'same', text: modLines[mi], lineNum: mi + 1, origLineNum: oi + 1 });
      oi++; mi++;
    } else {
      let found = false;
      for (let look = 1; look <= 3 && !found; look++) {
        if (mi + look < modLines.length && origLines[oi] === modLines[mi + look]) {
          for (let j = 0; j < look; j++) {
            result.push({ type: 'added', text: modLines[mi + j], lineNum: mi + j + 1, origLineNum: null });
          }
          mi += look;
          found = true;
        }
        if (!found && oi + look < origLines.length && origLines[oi + look] === modLines[mi]) {
          for (let j = 0; j < look; j++) {
            result.push({ type: 'removed', text: origLines[oi + j], lineNum: null, origLineNum: oi + j + 1 });
          }
          oi += look;
          found = true;
        }
      }
      if (!found) {
        if (oi < origLines.length) {
          result.push({ type: 'removed', text: origLines[oi], lineNum: null, origLineNum: oi + 1 });
          oi++;
        }
        if (mi < modLines.length) {
          result.push({ type: 'added', text: modLines[mi], lineNum: mi + 1, origLineNum: null });
          mi++;
        }
      }
    }
    if (result.length > maxLen * 3) {break;}
  }

  return result;
}

const lineStyles: Record<string, { bg: string; color: string; gutter: string }> = {
  same: { bg: 'transparent', color: 'var(--text-primary)', gutter: 'var(--text-tertiary)' },
  added: { bg: 'rgba(34,197,94,0.08)', color: '#22c55e', gutter: '#22c55e' },
  removed: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', gutter: '#ef4444' },
};

export function DiffView({ original, modified }: Props) {
  const diff = useMemo(() => computeDiff(original, modified), [original, modified]);
  const hasChanges = diff.some(d => d.type !== 'same');

  if (!hasChanges) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        <span className="text-xs">No changes from last save</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto font-mono text-[12px] leading-[1.65]"
      style={{ background: 'var(--surface-base)' }}>
      {diff.map((line, i) => {
        const s = lineStyles[line.type];
        return (
          <div key={i} className="flex" style={{ background: s.bg }}>
            <span className="w-8 text-right pr-2 select-none flex-shrink-0 text-[10px] leading-[1.65]"
              style={{ color: s.gutter }}>
              {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
            </span>
            <span className="w-8 text-right pr-2 select-none flex-shrink-0 text-[10px] leading-[1.65]"
              style={{ color: 'var(--text-tertiary)', borderRight: '1px solid var(--border-subtle)' }}>
              {line.origLineNum ?? line.lineNum ?? ''}
            </span>
            <span className="pl-2 whitespace-pre" style={{ color: s.color }}>{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}
