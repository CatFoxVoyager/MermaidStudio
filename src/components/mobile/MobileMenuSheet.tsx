import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Languages, ScrollText, Settings, Sparkles, Smartphone, Info, Command } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

export interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Active diagram's name — the menu is the only surface that tells you
   *  WHAT you are editing (iter-11 wayfinding finding). */
  activeTitle?: string;
  onOpenBackup: () => void;
  onOpenReleaseNotes: () => void;
  onOpenAbout: () => void;
  /** Opens the Command Palette (iter-20 P1: plumbed into the top bar but
   *  permanently shadowed by this menu — unreachable by touch anywhere). */
  onOpenCommands?: () => void;
  /** Opens the app Settings modal (Jordan red flag, critique iter-7: no
   *  Settings entry was reachable from mobile at all). */
  onOpenSettings?: () => void;
  /** Opens the AI drawer. Rendered only when a WebGPU adapter is plausibly
   *  present ('gpu' in navigator) — an honest entry point instead of the
   *  old "AI needs more power than your browser allows" copy. */
  onOpenAI?: () => void;
}

/** The AI row needs WebGPU (in-browser MLC inference); jsdom and non-WebGPU
 *  browsers simply never render it. */
const aiAvailable = typeof navigator !== 'undefined' && 'gpu' in navigator;

export function MobileMenuSheet({
  isOpen,
  onClose,
  activeTitle,
  onOpenBackup,
  onOpenReleaseNotes,
  onOpenAbout,
  onOpenSettings,
  onOpenAI,
  onOpenCommands,
}: MobileMenuSheetProps) {
  const { t, i18n } = useTranslation();

  const currentLanguageName = i18n.language?.startsWith('fr') ? 'Français' : 'English';

  const handleToggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(nextLang);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('menu.title', 'Menu')}
      subtitle={activeTitle}
      position="bottom"
    >
      <div className="p-4 space-y-4" data-testid="mobile-menu-sheet">
        {/* Menu Items List (Figma Screen E) — utility actions first; the
            Android note moved to a bottom footnote (critique iter-7: the
            promo card owned the prime slot as a card-inside-card with a
            4px accent strip, all craft-floor violations). */}
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Commands — the palette was plumbed into the top bar but this
              menu always shadowed it: unreachable by touch anywhere
              (iter-20 P1). */}
          {onOpenCommands && (
            <button
              type="button"
              data-testid="mobile-menu-item-commands"
              onClick={() => {
                onClose();
                onOpenCommands();
              }}
              className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--accent)',
                }}
              >
                <Command size={18} />
              </div>
              <span
                className="text-[15px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('menu.commands', 'Commands')}
              </span>
            </button>
          )}

          {/* Backup & Import */}
          <button
            type="button"
            data-testid="mobile-menu-item-backup"
            onClick={() => {
              onClose();
              onOpenBackup();
            }}
            className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--accent)',
              }}
            >
              <ArrowUpDown size={18} />
            </div>
            <span
              className="text-[15px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('backup.title', 'Backup & Import')}
            </span>
          </button>

          {/* AI Assistant — enabled only where WebGPU can actually run it;
              elsewhere a disabled row explains WHY instead of silently
              vanishing (iter-9: silent absence read as a missing feature). */}
          {onOpenAI && (
            aiAvailable ? (
              <button
                type="button"
                data-testid="mobile-menu-item-ai"
                onClick={onOpenAI}
                className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--surface-container)',
                    color: 'var(--accent)',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <span
                  className="text-[15px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('commands.aiAssistant', 'AI Assistant')}
                </span>
              </button>
            ) : (
              <div
                data-testid="mobile-menu-item-ai-disabled"
                aria-disabled="true"
                className="w-full flex items-center gap-3.5 py-3.5 text-left rounded-xl px-2 opacity-60"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--surface-container)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[15px] font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('commands.aiAssistant', 'AI Assistant')}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {t('menu.aiRequiresWebGPU', 'Requires WebGPU (not available in this browser)')}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button
              type="button"
              data-testid="mobile-menu-item-settings"
              onClick={onOpenSettings}
              className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--accent)',
                }}
              >
                <Settings size={18} />
              </div>
              <span
                className="text-[15px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('menu.settings', 'Settings')}
              </span>
            </button>
          )}

          {/* Language — aria-label carries the current value with a separator
              (iter-9's sr-only approach duplicated it in raw text: iter-10). */}
          <button
            type="button"
            data-testid="mobile-menu-item-language"
            onClick={handleToggleLanguage}
            aria-label={`${t('menu.language', 'Language')}: ${currentLanguageName}`}
            className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--accent)',
              }}
            >
              <Languages size={18} />
            </div>
            <div className="flex flex-col">
              <span
                className="text-[15px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('menu.language', 'Language')}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {currentLanguageName}
              </span>
            </div>
          </button>

          {/* Release Notes */}
          <button
            type="button"
            data-testid="mobile-menu-item-releasenotes"
            onClick={() => {
              onClose();
              onOpenReleaseNotes();
            }}
            className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--accent)',
              }}
            >
              <ScrollText size={18} />
            </div>
            <span
              className="text-[15px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('menu.releaseNotes', 'Release Notes')}
            </span>
          </button>

          {/* About MermaidStudio */}
          <button
            type="button"
            data-testid="mobile-menu-item-about"
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
            className="menu-row w-full flex items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] rounded-xl px-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--accent)',
              }}
            >
              <Info size={18} />
            </div>
            <span
              className="text-[15px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('about.title', 'About MermaidStudio')}
            </span>
          </button>
        </div>

        {/* Android note — demoted footnote (testid contract kept: still a
            non-interactive DIV, never a paywall card). */}
        <div
          data-testid="mobile-menu-android-card"
          className="flex items-center justify-center gap-2 pt-1 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Smartphone size={16} aria-hidden="true" style={{ color: 'var(--text-tertiary)' }} />
          <span>{t('menu.androidComingSoon', 'A dedicated Android app is coming soon.')}</span>
        </div>
      </div>
    </Modal>
  );
}
