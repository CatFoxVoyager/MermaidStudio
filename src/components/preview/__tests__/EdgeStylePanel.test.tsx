/**
 * Tests for EdgeStylePanel component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgeStylePanel } from '../EdgeStylePanel';

const mockEdge = {
  source: 'A',
  target: 'B',
  arrowType: '-->',
  label: '',
  raw: 'A --> B',
};

const defaultProps = {
  edge: mockEdge,
  edgeIndex: 0,
  edgeStyle: {},
  onClose: vi.fn(),
  onArrowChange: vi.fn(),
  onLabelChange: vi.fn(),
  onStyleChange: vi.fn(),
  onReset: vi.fn(),
};

describe('EdgeStylePanel', () => {
  it('should render connection info', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    expect(screen.getByText(/A.*B/)).toBeInTheDocument();
  });

  it('should render edge index in header', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    expect(screen.getByText('Edge 0')).toBeInTheDocument();
  });

  it('should call onArrowChange when arrow type changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const select = screen.getByDisplayValue('Arrow (-->)');
    fireEvent.change(select, { target: { value: '==>' } });

    expect(defaultProps.onArrowChange).toHaveBeenCalledWith('A', 'B', '==>');
  });

  it('should call onLabelChange on blur', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Edge label...');
    fireEvent.change(input, { target: { value: 'test label' } });
    fireEvent.blur(input);

    expect(defaultProps.onLabelChange).toHaveBeenCalledWith('A', 'B', 'test label');
  });

  it('should call onLabelChange on Enter key', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Edge label...');
    fireEvent.change(input, { target: { value: 'test label' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onLabelChange).toHaveBeenCalledWith('A', 'B', 'test label');
  });

  it('should render existing label in input', () => {
    const edgeWithLabel = { ...mockEdge, label: 'existing label' };
    render(<EdgeStylePanel {...defaultProps} edge={edgeWithLabel} />);

    expect(screen.getByDisplayValue('existing label')).toBeInTheDocument();
  });

  it('should call onStyleChange when stroke width changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const rangeInput = screen.getByDisplayValue('2');
    fireEvent.change(rangeInput, { target: { value: '4' } });

    expect(defaultProps.onStyleChange).toHaveBeenCalledWith(0, { strokeWidth: '4px' });
  });

  it('should call onStyleChange when opacity changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const opacityInput = screen.getByDisplayValue('1');
    fireEvent.change(opacityInput, { target: { value: '0.5' } });

    expect(defaultProps.onStyleChange).toHaveBeenCalledWith(0, { opacity: '0.5' });
  });

  it('should call onReset when reset button clicked', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const resetButton = screen.getByText('Reset Style');
    fireEvent.click(resetButton);

    expect(defaultProps.onReset).toHaveBeenCalledWith(0);
  });

  it('should call onClose when close button clicked', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should stop propagation on panel click', () => {
    const container = render(<EdgeStylePanel {...defaultProps} />);
    const panel = container.container.firstElementChild as HTMLElement;

    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: panel });
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    panel.dispatchEvent(clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should render with existing edge style values', () => {
    const edgeStyle = { stroke: 'red', strokeWidth: '3px', opacity: '0.5' };
    render(<EdgeStylePanel {...defaultProps} edgeStyle={edgeStyle} />);

    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
  });
});
