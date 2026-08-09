import type { JSX } from 'react'
import { CODE_FONT_SIZE_MAX, CODE_FONT_SIZE_MIN, useSettingsStore } from '../../state/settingsStore'
import { useT } from '../../studio/i18n'

/**
 * Controles de tamanho de fonte do editor Monaco (A− / valor / A+). Compartilhado
 * entre os modos Código e Ponte para que ambos tenham a mesma ergonomia.
 */
export function FontSizeControls(): JSX.Element {
  const t = useT()
  const codeFontSize = useSettingsStore((s) => s.codeFontSize)
  const increase = useSettingsStore((s) => s.increaseCodeFontSize)
  const decrease = useSettingsStore((s) => s.decreaseCodeFontSize)
  const reset = useSettingsStore((s) => s.resetCodeFontSize)

  return (
    <div className="flex items-center gap-1 text-xs text-sz-fg-soft">
      <button
        type="button"
        style={{ touchAction: 'manipulation' }}
        onClick={() => void decrease()}
        disabled={codeFontSize <= CODE_FONT_SIZE_MIN}
        aria-label={t('editor.fontSize.decrease')}
        title={t('editor.fontSize.decrease')}
        className="sz-touch-target rounded px-2.5 py-1.5 font-semibold leading-none text-sz-fg hover:bg-sz-bg disabled:cursor-not-allowed disabled:opacity-40"
      >
        A−
      </button>
      <button
        type="button"
        style={{ touchAction: 'manipulation' }}
        onClick={() => void reset()}
        title={t('editor.fontSize.reset')}
        className="sz-touch-target min-w-[2.25rem] rounded px-1.5 py-1.5 text-center tabular-nums leading-none text-sz-fg-soft hover:bg-sz-bg hover:text-sz-fg"
      >
        {codeFontSize}
      </button>
      <button
        type="button"
        style={{ touchAction: 'manipulation' }}
        onClick={() => void increase()}
        disabled={codeFontSize >= CODE_FONT_SIZE_MAX}
        aria-label={t('editor.fontSize.increase')}
        title={t('editor.fontSize.increase')}
        className="sz-touch-target rounded px-2.5 py-1.5 font-semibold leading-none text-sz-fg hover:bg-sz-bg disabled:cursor-not-allowed disabled:opacity-40"
      >
        A+
      </button>
    </div>
  )
}
