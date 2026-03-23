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
export { useDiagramActions } from './useDiagramActions';
export type { UseDiagramActionsParams, UseDiagramActionsReturn } from './useDiagramActions';
export { useAppHandlers } from './useAppHandlers';
export type { UseAppHandlersParams, UseAppHandlersReturn } from './useAppHandlers';
export { useAppShortcuts } from './useAppShortcuts';
export type { UseAppShortcutsParams } from './useAppShortcuts';
export { useModalProviderProps } from './useModalProviderProps';
export type { UseModalProviderPropsParams } from './useModalProviderProps';
