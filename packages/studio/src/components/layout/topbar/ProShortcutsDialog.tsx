import type { JSX } from 'react'
import { Modal } from '#ui'
import { useT } from '../../../studio/i18n'
import { isApple } from './UndoRedo'

const GROUPS: { titleKey: string; rows: { key: string; keys: string }[] }[] = [
  {
    titleKey: 'pro.shortcuts.navigate',
    rows: [
      { key: 'pro.quickOpen', keys: 'Ctrl+P' },
      { key: 'pro.searchContent', keys: 'Ctrl+Shift+F' },
      { key: 'pro.findInFile', keys: 'Ctrl+F' },
      { key: 'pro.symbols', keys: 'Ctrl+Shift+O' },
      { key: 'pro.commands', keys: 'Ctrl+Shift+P' },
    ],
  },
  {
    titleKey: 'pro.shortcuts.edit',
    rows: [
      { key: 'topbar.undo', keys: 'Ctrl+Z' },
      { key: 'topbar.redo', keys: 'Ctrl+Y' },
      { key: 'pro.organizeCode', keys: 'Shift+Alt+F' },
      { key: 'pro.references', keys: 'Shift+F12' },
      { key: 'pro.renameSymbol', keys: 'F2' },
      { key: 'pro.shortcuts.comment', keys: 'Ctrl+/' },
    ],
  },
  {
    titleKey: 'pro.shortcuts.help',
    rows: [
      { key: 'pro.zappy.change', keys: 'Ctrl+Alt+K' },
      { key: 'pro.shortcuts.replTest', keys: 'Ctrl+Enter' },
    ],
  },
]

/** No Mac e no iPad as teclas têm os símbolos de lá. */
export function formatShortcut(keys: string, apple = isApple()): string[] {
  const parts = keys.split('+')
  if (!apple) return parts
  const symbol: Record<string, string> = { Ctrl: '⌘', Alt: '⌥', Shift: '⇧' }
  return parts.map((part) => symbol[part] ?? part)
}

/**
 * A janela "Atalhos do teclado" do modo Código (redesenho do Pro, 11/2026), aberta pelo menu
 * "⋯" da barra: os atalhos de verdade do editor, em três grupos, na língua da criança.
 */
export function ProShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}): JSX.Element | null {
  const t = useT()
  if (!open) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={t('topbar.shortcuts')}
      footer={
        <button type="button" className="sz-pro-btn" onClick={onClose}>
          {t('pro.backToCode')}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <section key={group.titleKey}>
            <h3 className="sz-pro-section-label m-0 mb-1">{t(group.titleKey)}</h3>
            <dl className="m-0 flex flex-col gap-1">
              {group.rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-sz-panel-soft"
                >
                  <dt className="text-sm">{t(row.key)}</dt>
                  <dd className="m-0 flex flex-none gap-1">
                    {formatShortcut(row.keys).map((part) => (
                      <kbd key={part} className="sz-pro-kbd">
                        {part}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="m-0 text-xs text-sz-fg-soft">{t('pro.shortcuts.hint')}</p>
      </div>
    </Modal>
  )
}
