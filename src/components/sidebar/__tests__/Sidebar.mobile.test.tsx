import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

const db = vi.hoisted(() => ({
  getFolders: vi.fn(),
  getDiagrams: vi.fn(),
  createFolder: vi.fn(),
  createDiagram: vi.fn(),
  deleteFolder: vi.fn(),
  deleteDiagram: vi.fn(),
  deleteDiagrams: vi.fn(),
  updateFolder: vi.fn(),
  updateDiagram: vi.fn(),
  getTags: vi.fn(),
  getDiagramTags: vi.fn(),
  getAllDiagramTags: vi.fn(),
  toggleDiagramTag: vi.fn(),
  createTag: vi.fn(),
  moveDiagramsToFolder: vi.fn(),
}));

vi.mock('@/services/storage/database', () => db);

const folders = [
  { id: 'folder-a', name: 'Architecture', parent_id: null, created_at: '2026-01-01' },
];
const diagrams = [
  { id: 'diagram-a', title: 'Checkout Flow', content: 'flowchart TD\nA --> Checkout', folder_id: 'folder-a', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'diagram-b', title: 'Release Workflow', content: 'flowchart TD\nA --> Release', folder_id: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
];
const tags = [
  { id: 'tag-architecture', name: 'architecture', color: '#3b82f6' },
  { id: 'tag-workflow', name: 'workflow', color: '#22c55e' },
];

describe('Sidebar mobile screen', () => {
  const onOpenDiagram = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    db.getFolders.mockResolvedValue(folders);
    db.getDiagrams.mockResolvedValue(diagrams);
    db.getTags.mockResolvedValue(tags);
    db.getAllDiagramTags.mockResolvedValue([
      { diagram_id: 'diagram-a', tag_id: 'tag-architecture' },
      { diagram_id: 'diagram-b', tag_id: 'tag-workflow' },
    ]);
    db.createDiagram.mockResolvedValue({ id: 'diagram-new', title: 'Untitled', content: '', folder_id: null });
    db.createTag.mockResolvedValue({ id: 'tag-new', name: 'draft', color: '#3b82f6' });
  });

  it('filters the flat diagram list by folder, tag, and search', async () => {
    render(<Sidebar mobileScreen onOpenDiagram={onOpenDiagram} onRefresh={onRefresh} />);

    expect(await screen.findByText('Checkout Flow')).toBeInTheDocument();
    expect(screen.getByText('Release Workflow')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'sidebar.allFolders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Architecture' }));
    expect(screen.getByText('Checkout Flow')).toBeInTheDocument();
    expect(screen.queryByText('Release Workflow')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /architecture/i })[1]);
    expect(screen.getByText('Checkout Flow')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('sidebar.searchPlaceholder'), { target: { value: 'checkout' } });
    expect(screen.getByText('Checkout Flow')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Release Workflow')).not.toBeInTheDocument());
  });

  it('adds a tag and creates a diagram from the floating action button', async () => {
    render(<Sidebar mobileScreen onOpenDiagram={onOpenDiagram} onRefresh={onRefresh} />);

    await screen.findByText('Checkout Flow');
    fireEvent.click(screen.getByRole('button', { name: 'sidebar.addTag' }));
    fireEvent.change(screen.getByPlaceholderText('sidebar.tagPlaceholder'), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: /save|enregistrer/i }));
    await waitFor(() => expect(db.createTag).toHaveBeenCalledWith('draft', '#3b82f6'));

    fireEvent.click(screen.getByRole('button', { name: 'sidebar.newDiagram' }));
    await waitFor(() => expect(onOpenDiagram).toHaveBeenCalledWith('diagram-new'));
    expect(db.createDiagram).toHaveBeenCalledWith('sidebar.untitled', expect.any(String), null);
  });
});
