import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewDiagramModal } from '../NewDiagramModal';
import type { NewDiagramDraft } from '@/hooks/app/useDiagramActions';

const DRAFT: NewDiagramDraft = { id: 1, folderId: null, defaultName: 'Untitled Diagram' };

function setup(draft: NewDiagramDraft = DRAFT) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<NewDiagramModal draft={draft} onConfirm={onConfirm} onCancel={onCancel} />);
  return { onConfirm, onCancel };
}
const field = () => screen.getByTestId('new-diagram-name');
const createButton = () => screen.getByTestId('new-diagram-create');

describe('NewDiagramModal', () => {
  it('opens with an empty focused field and a disabled Create button', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'newDiagramDialog.title' })).toBeInTheDocument();
    expect(field()).toHaveValue('');
    expect(field()).toHaveFocus();
    expect(createButton()).toBeDisabled();
  });

  it('labels the default-name button with the proposed name and fills the field with it', () => {
    setup();
    const button = screen.getByTestId('new-diagram-default-name');
    expect(button).toHaveTextContent('Untitled Diagram');
    fireEvent.click(button);
    expect(field()).toHaveValue('Untitled Diagram');
    expect(field()).toHaveFocus();
    expect(createButton()).toBeEnabled();
  });

  it('confirms the trimmed name on form submit', () => {
    const { onConfirm } = setup();
    fireEvent.change(field(), { target: { value: '  Réseau  ' } });
    fireEvent.submit(field().closest('form')!);
    expect(onConfirm).toHaveBeenCalledWith('Réseau');
  });

  it('confirms the name when Create is clicked', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByTestId('new-diagram-default-name'));
    fireEvent.click(createButton());
    expect(onConfirm).toHaveBeenCalledWith('Untitled Diagram');
  });

  it('keeps Create disabled and ignores submit for a whitespace-only name', () => {
    const { onConfirm } = setup();
    fireEvent.change(field(), { target: { value: '   ' } });
    expect(createButton()).toBeDisabled();
    fireEvent.submit(field().closest('form')!);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels on Escape, on the overlay and on Cancel without confirming', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.change(field(), { target: { value: 'Réseau' } });
    fireEvent.keyDown(screen.getByTestId('modal'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('new-diagram-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('proposes the template title for a template draft', () => {
    setup({ ...DRAFT, content: 'graph TD\n A --> B', defaultName: 'Flowchart', templateTitle: 'Flowchart' });
    expect(screen.getByTestId('new-diagram-default-name')).toHaveTextContent('Flowchart');
  });
});
