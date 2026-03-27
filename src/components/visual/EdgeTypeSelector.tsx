import { ArrowRight, Circle, X, Minus } from 'lucide-react';

interface EdgeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const EDGE_TYPES: EdgeType[] = [
  {
    type: '-->',
    label: 'Arrow',
    icon: <ArrowRight size={14} />,
    description: 'Standard arrow connection',
  },
  {
    type: '---',
    label: 'Line',
    icon: <Minus size={14} />,
    description: 'Simple line connection',
  },
  {
    type: '==>]',
    label: 'Thick',
    icon: <ArrowRight size={14} strokeWidth={3} />,
    description: 'Thick arrow connection',
  },
  {
    type: '-.->',
    label: 'Dotted',
    icon: <ArrowRight size={14} strokeDasharray="2 2" />,
    description: 'Dotted arrow connection',
  },
  {
    type: '<-->',
    label: 'Bidirectional',
    icon: <ArrowRight size={14} />,
    description: 'Bidirectional arrow',
  },
  {
    type: 'o--o',
    label: 'Circle',
    icon: <Circle size={14} />,
    description: 'Circle endpoints',
  },
  {
    type: '--o',
    label: 'Circle End',
    icon: <Circle size={8} />,
    description: 'Circle at end',
  },
  {
    type: 'o--',
    label: 'Circle Start',
    icon: <Circle size={8} />,
    description: 'Circle at start',
  },
  {
    type: '--|>',
    label: 'Flag',
    icon: <ArrowRight size={14} />,
    description: 'Flag arrow connection',
  },
  {
    type: '~~~',
    label: 'Invisible',
    icon: <Minus size={14} strokeDasharray="1 3" opacity={0.5} />,
    description: 'Invisible link (no visual)',
  },
  {
    type: 'x--x',
    label: 'Cross',
    icon: <X size={14} />,
    description: 'Cross connection',
  },
];

interface Props {
  className?: string;
}

export function EdgeTypeSelector({ className = '' }: Props) {
  return (
    <div className={`flex items-center gap-1 px-3 py-2 ${className}`}
      style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      <span className="text-[10px] font-medium shrink-0 mr-2" style={{ color: 'var(--text-tertiary)' }}>
        EDGE TYPES
      </span>
      <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
        {EDGE_TYPES.map(({ type, label, icon, description }) => (
          <div
            key={type}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border cursor-default"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
              minWidth: 48,
            }}
            title={`${description}\nType: ${type}`}
          >
            <div className="flex items-center justify-center" style={{ height: 16 }}>
              {icon}
            </div>
            <span className="text-[8px] font-medium leading-none">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
