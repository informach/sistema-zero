import type { JSX } from 'react'
import { Modal } from '#ui'
import { useT } from '../../../studio/i18n'
import { isApple } from './UndoRedo'

interface ShortcutRow {
  key: string
  keys: string
  /** As teclas no Mac/iPad quando não são só a troca de Ctrl por ⌘ (o Refazer do Monaco). */
  appleKeys?: string
  /** Só aparece quando vale: o Zappy precisa existir; o "Testar" é do Python. */
  when?: 'zappy' | 'python'
}

const GROUPS: { titleKey: string; rows: ShortcutRow[] }[] = [
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
      { key: 'topbar.redo', keys: 'Ctrl+Y', appleKeys: 'Ctrl+Shift+Z' },
      { key: 'pro.organizeCode', keys: 'Shift+Alt+F' },
      { key: 'pro.references', keys: 'Shift+F12' },
      { key: 'pro.renameSymbol', keys: 'F2' },
      { key: 'pro.shortcuts.comment', keys: 'Ctrl+/' },
    ],
  },
  {
    titleKey: 'pro.shortcuts.help',
    rows: [
      { key: 'pro.zappy.change', keys: 'Ctrl+Alt+K', when: 'zappy' },
      { key: 'pro.shortcuts.replTest', keys: 'Ctrl+Enter', when: 'python' },
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

/** Os grupos e linhas que valem neste projeto (grupo sem linha nenhuma sai inteiro). */
export function visibleShortcutGroups(context: {
  python: boolean
  zappy: boolean
}): { titleKey: string; rows: ShortcutRow[] }[] {
  return GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter(
      (row) => !row.when || (row.when === 'python' ? context.python : context.zappy),
    ),
  })).filter((group) => group.rows.length > 0)
}

/**
 * A janela "Atalhos do teclado" do modo Código do Pro (redesenho de 11/2026), aberta pelo menu
 * "⋯" da barra: os atalhos de verdade do editor, em três grupos, na língua da criança. Só lista
 * o que funciona AQUI: o Ctrl+Alt+K com o Zappy, o Ctrl+Enter no Python.
 */
export function ProShortcutsDialog({
  open,
  onClose,
  python = false,
  zappy = false,
}: {
  open: boolean
  onClose: () => void
  python?: boolean
  zappy?: boolean
}): JSX.Element | null {
  const t = useT()
  if (!open) return null
  const apple = isApple()
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
        {visibleShortcutGroups({ python, zappy }).map((group) => (
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
                    {formatShortcut(apple ? (row.appleKeys ?? row.keys) : row.keys, apple).map(
                      (part) => (
                        <kbd key={part} className="sz-pro-kbd">
                          {part}
                        </kbd>
                      ),
                    )}
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
