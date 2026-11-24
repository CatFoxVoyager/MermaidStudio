import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from '../ColorPicker';
import { applyScale } from '@/utils/uiScale';
import { setViewport } from '@/utils/__tests__/uiScaleTestHelpers';

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }),
});

describe('ColorPicker under UI scale', () => {
  afterEach(() => {
    applyScale(1);
    vi.unstubAllGlobals();
  });

  it('positions the fixed popover in local pixels (625px, 258px) at scale 0.8', () => {
    applyScale(0.8);
    setViewport(1280, 640);

    const { container } = render(
      <ColorPicker label="Fill" value="#ffffff" onChange={vi.fn()} />,
    );

    const trigger = screen.getByRole('button', { name: 'Fill' });
    trigger.getBoundingClientRect = () => rect(500, 180, 40, 20);

    fireEvent.click(trigger);

    const popover = container.querySelector('.fixed.w-64') as HTMLElement | null;
    expect(popover).not.toBeNull();
    expect(popover!.style.left).toBe('625px');
    expect(popover!.style.top).toBe('258px');
  });

  it('clamps measured popover width and height against localViewport at scale 0.8', () => {
    applyScale(0.8);
    setViewport(1280, 640); // local viewport: 1600 x 800

    const origW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    const origH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 256 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });

    try {
      const { container } = render(
        <ColorPicker label="Fill" value="#ffffff" onChange={vi.fn()} />,
      );

      const trigger = screen.getByRole('button', { name: 'Fill' });
      // Screen rect near bottom-right: left=1200 (local 1500), bottom=560 (local 700)
      trigger.getBoundingClientRect = () => rect(1200, 540, 40, 20);

      fireEvent.click(trigger);

      const popover = container.querySelector('.fixed.w-64') as HTMLElement | null;
      expect(popover).not.toBeNull();
      // Local clamp: left <= 1600 - 256 - 8 = 1336; top <= 800 - 400 - 8 = 392
      expect(popover!.style.left).toBe('1336px');
      expect(popover!.style.top).toBe('392px');
    } finally {
      if (origW) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', origW);
      else delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
      if (origH) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origH);
      else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }
  });
});
