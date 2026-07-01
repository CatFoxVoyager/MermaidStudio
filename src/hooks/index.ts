// src/hooks/index.ts
// Umbrella barrel export for all hooks

export { useTheme } from './useTheme';
export { useLanguage } from './useLanguage';
export { useTabs } from './useTabs';
export { useToast } from './useToast';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export type { Shortcut } from './useKeyboardShortcuts';
export { useModalManager } from './useModalManager';
export type { ModalState, ModalName, UseModalManagerReturn } from './useModalManager';
export { useDiagramActions } from './app/useDiagramActions';
export type { UseDiagramActionsParams, UseDiagramActionsReturn } from './app/useDiagramActions';
export { useAppHandlers } from './app/useAppHandlers';
export type { UseAppHandlersParams, UseAppHandlersReturn } from './app/useAppHandlers';
export { useAppShortcuts } from './app/useAppShortcuts';
export type { UseAppShortcutsParams } from './app/useAppShortcuts';
export { useModalProviderProps } from './app/useModalProviderProps';
export type { UseModalProviderPropsParams } from './app/useModalProviderProps';
export { useAppState } from './app/useAppState';
export type { AppState, AppActions } from './app/useAppState';
export { useModalState } from './app/useModalState';
export type { UseModalStateParams } from './app/useModalState';
