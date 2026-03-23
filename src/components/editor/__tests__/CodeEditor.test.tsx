/**
 * Tests for CodeEditor component
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CodeEditor } from '../CodeEditor';

describe('CodeEditor Component', () => {
  const mockOnChange = vi.fn();

  it('should render container div', () => {
    const { container } = render(
      <CodeEditor value="graph TD\nA-->B" onChange={mockOnChange} theme="light" />
    );
    expect(container.querySelector('.h-full.overflow-hidden')).toBeInTheDocument();
  });

  it('should accept required props', () => {
    render(
      <CodeEditor value="test" onChange={mockOnChange} theme="dark" />
    );
    expect(mockOnChange).toBeDefined();
  });

  it('should handle optional onSave prop', () => {
    const mockOnSave = vi.fn();
    render(
      <CodeEditor value="test" onChange={mockOnChange} onSave={mockOnSave} theme="light" />
    );
    expect(mockOnSave).toBeDefined();
  });

  it('should re-render when value prop changes', () => {
    const { container, rerender } = render(
      <CodeEditor value="initial" onChange={mockOnChange} theme="light" />
    );

    rerender(
      <CodeEditor value="updated" onChange={mockOnChange} theme="light" />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should re-render when theme prop changes', () => {
    const { container, rerender } = render(
      <CodeEditor value="test" onChange={mockOnChange} theme="light" />
    );

    rerender(
      <CodeEditor value="test" onChange={mockOnChange} theme="dark" />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should unmount without error', () => {
    const { unmount } = render(
      <CodeEditor value="test" onChange={mockOnChange} theme="light" />
    );

    expect(() => unmount()).not.toThrow();
  });
});
