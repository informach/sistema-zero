import type { JSX } from 'react'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioTheme } from '../../studio/theme'

/**
 * Botão de alternância claro/escuro. Lê o tema EFETIVO do contexto
 * (StudioThemeProvider) e grava a preferência no settingsStore (singleton) —
 * por isso funciona igual na Topbar do editor e na ProjectList, e a escolha
 * persiste entre as duas telas. Esconda-o quando o host fixa o tema.
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const theme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)
  return (
    <button
      type="button"
      onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Mudar tema"
      aria-label="Mudar tema"
      className={
        className ??
        'rounded p-1.5 text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg'
      }
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function SunIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
