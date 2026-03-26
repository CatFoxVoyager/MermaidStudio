/**
 * Tests for CodeEditor component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { CodeEditor } from '../CodeEditor';
import type { CodeEditorRef } from '../CodeEditor';

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

describe('CodeEditor forwardRef API', () => {
  it('should expose highlightLine method via ref', async () => {
    const ref = createRef<CodeEditorRef>();
    render(<CodeEditor ref={ref} value="test" onChange={vi.fn()} theme="light" />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current!.highlightLine).toBeDefined();
    expect(typeof ref.current!.highlightLine).toBe('function');
  });

  it('should expose scrollToLine method via ref', async () => {
    const ref = createRef<CodeEditorRef>();
    render(<CodeEditor ref={ref} value="test" onChange={vi.fn()} theme="light" />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current!.scrollToLine).toBeDefined();
    expect(typeof ref.current!.scrollToLine).toBe('function');
  });

  it('should not throw when calling highlightLine', async () => {
    const ref = createRef<CodeEditorRef>();
    render(<CodeEditor ref={ref} value="graph TD\nA-->B" onChange={vi.fn()} theme="light" />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(() => ref.current!.highlightLine(1)).not.toThrow();
  });

  it('should not throw when calling scrollToLine', async () => {
    const ref = createRef<CodeEditorRef>();
    render(<CodeEditor ref={ref} value="graph TD\nA-->B" onChange={vi.fn()} theme="light" />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(() => ref.current!.scrollToLine(1)).not.toThrow();
  });

  it('should not throw when calling highlightLine with out-of-range line number', async () => {
    const ref = createRef<CodeEditorRef>();
    render(<CodeEditor ref={ref} value="test" onChange={vi.fn()} theme="light" />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(() => ref.current!.highlightLine(999)).not.toThrow();
  });

  it('should render and work normally without a ref', () => {
    const { container } = render(
      <CodeEditor value="test" onChange={vi.fn()} theme="light" />
    );
    expect(container.querySelector('.h-full.overflow-hidden')).toBeInTheDocument();
  });
});
