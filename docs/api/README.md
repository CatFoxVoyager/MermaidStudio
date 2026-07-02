# API Documentation

This document provides a comprehensive overview of the MermaidStudio API and internal interfaces.

## Custom Hooks

### useIndex


---

### useUseKeyboardShortcuts

* Custom hook for managing keyboard shortcuts in React components.
*
* Provides a declarative way to register keyboard shortcuts with optional
* modifier keys (Ctrl/Cmd, Shift) and conditional execution.
*
* @example
* ```tsx
* const shortcuts = [
*   {
*     key: 'k',
*     ctrl: true,
*     action: () => setOpenPalette(true),
*   },
*   {
*     key: 's',
*     ctrl: true,
*     action: () => save(),
*     condition: () => hasActiveTab(),
*   },
* ];
* useKeyboardShortcuts(shortcuts);
* ```

**Functions:**
- useKeyboardShortcuts(): void

---

### useUseLanguage


**Functions:**
- useLanguage(): void

---

### useUseModalManager

* useModalManager Hook
*
* Centralized modal state management for the application.
* Manages visibility state for all modals and provides utility functions
* for opening, closing, and toggling modals.
*
* @example
* ```tsx
* const { modals, openModal, closeModal, toggleModal, closeAllModals, isModalOpen } = useModalManager();
*
* // Open a modal
* openModal('showTemplates');
*
* // Check if modal is open
* if (isModalOpen('showAI')) {
*   // Do something when AI modal is open
* }
*
* // Close all modals
* closeAllModals();
* ```

**Functions:**
- useModalManager(): UseModalManagerReturn

---

### useUseTabs


**Functions:**
- useTabs(): void

---

### useUseTheme


**Functions:**
- useTheme(): void

---

### useUseToast


**Functions:**
- useToast(): void

---

## Services

### Ai Service

#### MermaidRAGService

* MermaidRAGService - Comprehensive context-aware documentation for Mermaid.js
* Optimized for CPU-based Micro LLMs (sub-2B parameters)

#### providers


#### WebGPUMLCProvider


### Storage Service

#### database

* IndexedDB-based storage for MermaidStudio
* Replaces localStorage with much higher capacity and better persistence
*
* Automatically migrates data from localStorage on first load

## Type Definitions

### ai

- export type MachineSize
- export interface AIProviderConfig
- export interface AIMessage

### index


### mermaid

- export type DiagramType
- export interface Template
- export type LayoutEngine
- export type DiagramDirection
- export interface BaseStyleOptions
- export interface FlowchartStyleOptions
- export interface SequenceStyleOptions
- export interface GanttStyleOptions
- export interface DiagramStyleOptions
- export interface StylingCapabilities

### storage

- export interface Folder
- export interface Diagram
- export interface DiagramVersion
- export interface Tag
- export interface Tab

### theme

- export interface ThemeCoreColors
- export interface MermaidTheme
- export interface ThemeSlotGroup
- export interface ThemeSlotDef
- export interface StoredThemeData

### ui

- export interface AppSettings
- export interface UserTemplate
- export interface BackupData

*Last updated: 2026-07-01*
