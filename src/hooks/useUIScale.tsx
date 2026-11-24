import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  applyScale,
  AUTO_MAX_WIDTH,
  AUTO_MIN_WIDTH,
  computeAutoScale,
  readPref,
  resolveScale,
  writePref,
  type UIScalePref,
} from '@/utils/uiScale';

export interface UIScaleApi {
  pref: UIScalePref;
  scale: number;
  autoScale: number | null;
  setPref(pref: UIScalePref): void;
  menuOpen: boolean;
  openMenu(options?: { focusTrigger?: boolean }): void;
  closeMenu(): void;
}

const UIScaleContext = createContext<UIScaleApi | null>(null);
const UIScaleTriggerFocusContext = createContext<number>(0);

const DESKTOP_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Provides global UI scale state and mirrors the effective scale onto
 * `document.documentElement` via `--ui-scale`.
 *
 * Mobile viewports (< AUTO_MIN_WIDTH) always resolve to 1, even when a manual
 * preference is stored. Outside the auto band or on coarse pointers,
 * `autoScale` is `null`.
 */
export function UIScaleProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<UIScalePref>(() => readPref());
  const [width, setWidth] = useState<number>(() =>
    typeof window === 'undefined' ? AUTO_MAX_WIDTH : window.innerWidth
  );
  const finePointer = useMediaQuery(DESKTOP_POINTER_QUERY);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const autoScale =
    finePointer && width >= AUTO_MIN_WIDTH && width < AUTO_MAX_WIDTH
      ? computeAutoScale(width)
      : null;

  const scale =
    width < AUTO_MIN_WIDTH ? 1 : resolveScale(pref, width, finePointer);

  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [focusTriggerTick, setFocusTriggerTick] = useState(0);

  const setPref = useCallback((next: UIScalePref) => {
    setPrefState(next);
    writePref(next);
  }, []);

  const openMenu = useCallback((options?: { focusTrigger?: boolean }) => {
    setMenuOpen(true);
    if (options?.focusTrigger) {
      setFocusTriggerTick((n) => n + 1);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const value = useMemo<UIScaleApi>(
    () => ({ pref, scale, autoScale, setPref, menuOpen, openMenu, closeMenu }),
    [pref, scale, autoScale, setPref, menuOpen, openMenu, closeMenu]
  );

  return (
    <UIScaleTriggerFocusContext.Provider value={focusTriggerTick}>
      <UIScaleContext.Provider value={value}>{children}</UIScaleContext.Provider>
    </UIScaleTriggerFocusContext.Provider>
  );
}

/**
 * Read the shared UI scale state, or `null` when rendered outside
 * `UIScaleProvider`.
 */
export function useUIScaleContext(): UIScaleApi | null {
  return useContext(UIScaleContext);
}

/**
 * Monotonic counter incremented each time `openMenu({ focusTrigger: true })`
 * is invoked, allowing `UIScaleMenu` to focus its trigger button in a passive
 * effect (after any closing modal's focus-restore cleanup).
 */
export function useUIScaleTriggerFocusTick(): number {
  return useContext(UIScaleTriggerFocusContext);
}
