import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextMenu } from '../ContextMenu';
import { applyScale } from '@/utils/uiScale';
import { setViewport } from '@/utils/__tests__/uiScaleTestHelpers';

describe('ContextMenu under UI scale', () => {
  afterEach(() => {
    applyScale(1);
    vi.unstubAllGlobals();
  });

  it('converts screen coordinates (160, 200) to local pixels (200px, 250px) at scale 0.8', () => {
    setViewport(1280, 640);
    applyScale(0.8);

    render(
      <ContextMenu
        x={160}
        y={200}
        onClose={vi.fn()}
        items={[
          { label: 'Rename', onClick: vi.fn() },
          { label: 'Delete', onClick: vi.fn(), danger: true },
        ]}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('200px');
    expect(menu.style.top).toBe('250px');
  });

  it('clamps against the local viewport width and height at scale 0.8', () => {
    setViewport(1280, 640); // local viewport: 1600 x 800
    applyScale(0.8);

    render(
      <ContextMenu
        x={1240} // local 1550 -> clamps to 1600 - 200 = 1400
        y={620} // local 775 -> clamps to 800 - 2 * 36 - 16 = 712
        onClose={vi.fn()}
        items={[
          { label: 'Open', onClick: vi.fn() },
          { label: 'Delete', onClick: vi.fn() },
        ]}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('1400px');
    expect(menu.style.top).toBe('712px');
  });

  it('clamps measured overflow against localViewport().height in layout effect', () => {
    setViewport(1280, 640); // local height = 800, bottom margin = 16 -> limit 784
    applyScale(0.8);

    // Mock offsetHeight on HTMLElement.prototype to simulate a 200px-tall menu in local px
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 200,
    });

    try {
      render(
        <ContextMenu
          x={160}
          y={520} // local y = 650; ay estimate = min(650, 800 - 72 - 16) = 650; ay + 200 = 850 > 784 -> overflow 66 -> top = 584px
          onClose={vi.fn()}
          items={[
            { label: 'Open', onClick: vi.fn() },
            { label: 'Delete', onClick: vi.fn() },
          ]}
        />
      );

      const menu = screen.getByRole('menu');
      expect(menu.style.top).toBe('584px');
    } finally {
      if (origOffsetHeight) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origOffsetHeight);
      } else {
        delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
      }
    }
  });
});
