import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toast } from '@/components/shared/Toast';
import type { ToastItem } from '@/hooks/useToast';

describe('Toast', () => {
  it('renders nothing when toasts list is empty', () => {
    const { container } = render(<Toast toasts={[]} dismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('omits toast-action button when action is not provided', () => {
    const toasts: ToastItem[] = [
      { id: 'toast-1', message: 'Saved', type: 'success' },
    ];
    render(<Toast toasts={toasts} dismiss={vi.fn()} />);

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByTestId('toast-action')).not.toBeInTheDocument();
  });

  it('renders toast-action with its label and calls onClick then dismiss(id) on click', () => {
    const callOrder: string[] = [];
    const onClick = vi.fn(() => callOrder.push('onClick'));
    const dismiss = vi.fn((id: string) => callOrder.push(`dismiss:${id}`));
    const toasts: ToastItem[] = [
      {
        id: 'toast-42',
        message: 'Interface adjusted to 80 % for this screen.',
        type: 'info',
        action: { label: 'Change', onClick },
      },
    ];

    render(<Toast toasts={toasts} dismiss={dismiss} />);

    const actionBtn = screen.getByTestId('toast-action');
    expect(actionBtn).toHaveTextContent('Change');

    fireEvent.click(actionBtn);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledWith('toast-42');
    expect(callOrder).toEqual(['onClick', 'dismiss:toast-42']);
  });
});
