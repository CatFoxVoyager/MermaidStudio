import type { Tab } from '@/types';

export function createTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: `tab_${crypto.randomUUID()}`,
    diagram_id: crypto.randomUUID(),
    title: 'Test Tab',
    content: 'flowchart TD\n  A-->B',
    saved_content: 'flowchart TD\n  A-->B',
    is_dirty: false,
    themeId: undefined,
    ...overrides
  };
}
