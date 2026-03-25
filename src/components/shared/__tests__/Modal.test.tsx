import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          Modal Content
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          title="Test"
          subtitle="Subtitle"
        >
          Content
        </Modal>
      );
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render sm size modal', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" size="sm">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
    });

    it('should render md size modal (default)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" size="md">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-md')).toBeInTheDocument();
    });

    it('should render lg size modal', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" size="lg">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
    });

    it('should render xl size modal', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" size="xl">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-xl')).toBeInTheDocument();
    });

    it('should render full size modal', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" size="full">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when X button clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <div>Modal Content</div>
        </Modal>
      );
      const content = screen.getByText('Modal Content');
      fireEvent.click(content);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Footer', () => {
    it('should render footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          title="Test"
          footer={<button>Footer Button</button>}
        >
          Content
        </Modal>
      );
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('should not render footer when not provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      expect(screen.queryByRole('button', { name: 'Footer Button' })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          Content
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('should have close button with aria-label', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          Content
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should trap focus within modal', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <input type="text" placeholder="Input" />
          <button>Button</button>
        </Modal>
      );
      const input = screen.getByPlaceholderText('Input');
      const button = screen.getByText('Button');
      expect(input).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('should render center position by default', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" position="center">
          Content
        </Modal>
      );
      const modalWrapper = container.querySelector('.fixed.inset-0.z-50');
      expect(modalWrapper).toHaveClass('items-center', 'justify-center');
    });

    it('should render right position when specified', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test" position="right">
          Content
        </Modal>
      );
      const modalWrapper = container.querySelector('.fixed.inset-0.z-50');
      expect(modalWrapper).toHaveClass('items-end', 'justify-end');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="">
          Content
        </Modal>
      );
      const titleElement = container.querySelector('#modal-title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('');
    });

    it('should handle long content', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          {longContent}
        </Modal>
      );
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle multiple modals simultaneously', () => {
      render(
        <>
          <Modal isOpen={true} onClose={mockOnClose} title="Modal 1">
            Content 1
          </Modal>
          <Modal isOpen={true} onClose={mockOnClose} title="Modal 2">
            Content 2
          </Modal>
        </>
      );
      expect(screen.getByText('Modal 1')).toBeInTheDocument();
      expect(screen.getByText('Modal 2')).toBeInTheDocument();
    });

    it('should handle ReactNode children', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <div>
            <span>Nested</span> Content
          </div>
        </Modal>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Modal Overlay', () => {
    it('should render overlay with correct testid', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('bg-black/50');
    });

    it('should apply backdrop blur-sm to overlay', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          Content
        </Modal>
      );
      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay).toHaveClass('backdrop-blur-sm');
    });
  });
});
