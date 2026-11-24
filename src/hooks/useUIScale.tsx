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
}

const UIScaleContext = createContext<UIScaleApi | null>(null);

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

  const setPref = useCallback((next: UIScalePref) => {
    setPrefState(next);
    writePref(next);
  }, []);

  const value = useMemo<UIScaleApi>(
    () => ({ pref, scale, autoScale, setPref }),
    [pref, scale, autoScale, setPref]
  );

  return (
    <UIScaleContext.Provider value={value}>{children}</UIScaleContext.Provider>
  );
}

/**
 * Read the shared UI scale state, or `null` when rendered outside
 * `UIScaleProvider`.
 */
export function useUIScaleContext(): UIScaleApi | null {
  return useContext(UIScaleContext);
}
