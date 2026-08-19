/**
 * Janela "Atalhos" (08/2026): a lista dos atalhos do editor ABERTO, lida do
 * catálogo único (`core/shortcuts.ts`) — o mesmo que os listeners ligam — mais
 * as letras da caixa de ferramentas daquele editor. Abre pelo botão do topo ou
 * pela tecla `?`. Só leitura, sem estado além do aberto/fechado do host.
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import {
  entryKeys,
  SHORTCUT_SECTIONS,
  type ShortcutEditor,
  type ShortcutEntry,
  shortcutsFor,
} from '../../core/shortcuts'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export interface ShortcutsDialogTool {
  label: string
  shortcut: string
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform ?? '')
}

function Keys({
  entry,
  mac,
}: {
  entry: Pick<ShortcutEntry, 'combo' | 'macCombo'>
  mac: boolean
}): JSX.Element {
  const keys = entryKeys(entry, mac)
  // Chave = a tecla mais o que vem antes dela ("Ctrl", "Ctrl+Shift"): uma tecla
  // não se repete no mesmo combo, e o prefixo desempata sem cair no índice.
  const rows = keys.map((key, index) => ({ key, prefix: keys.slice(0, index).join('+') }))
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {rows.map(({ key, prefix }) => (
        <span key={`${prefix}>${key}`} className="flex items-center gap-1">
          <kbd className="rounded-md border-2 border-pin-border bg-pin-bg px-1.5 py-0.5 font-bold font-mono text-pin-text text-xs">
            {key}
          </kbd>
          {key !== keys[keys.length - 1] ? (
            <span aria-hidden="true" className="text-pin-muted text-xs">
              +
            </span>
          ) : null}
        </span>
      ))}
    </span>
  )
}

function Section({
  title,
  rows,
  mac,
}: {
  title: string
  rows: ReadonlyArray<{ id: string; label: string; combo: string; macCombo?: string }>
  mac: boolean
}): JSX.Element | null {
  if (rows.length === 0) return null
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="pin-display text-pin-muted text-xs uppercase tracking-wide">{title}</h3>
      <ul className="flex flex-col divide-y-2 divide-pin-border/60">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="text-pin-text">{row.label}</span>
            <Keys entry={row} mac={mac} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ShortcutsDialog({
  open,
  onClose,
  editor,
  tools,
  allowTools,
}: {
  open: boolean
  onClose: () => void
  /** Qual editor está aberto: filtra o catálogo. */
  editor: ShortcutEditor
  /** As letras da caixa de ferramentas DESTE editor (uma fonte só: a lista da caixa, já curada). */
  tools: ReadonlyArray<ShortcutsDialogTool>
  /** Curadoria da aula: o que a professora escondeu não aparece na ajuda. */
  allowTools?: readonly string[]
}): JSX.Element | null {
  if (!open) return null
  const mac = isMac()
  const entries: ShortcutEntry[] = shortcutsFor(editor, allowTools)
  return (
    <Dialog open onClose={onClose} title={COPY.shortcuts.title} wide>
      <p className="mb-3 text-pin-muted text-sm">{COPY.shortcuts.intro}</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Section
          title={COPY.shortcuts.toolsSection}
          mac={mac}
          rows={tools.map((tool) => ({
            id: `tool-${tool.shortcut}-${tool.label}`,
            label: tool.label,
            combo: tool.shortcut,
          }))}
        />
        {SHORTCUT_SECTIONS.map((section) => (
          <Section
            key={section.id}
            title={section.title}
            mac={mac}
            rows={entries.filter((entry) => entry.section === section.id)}
          />
        ))}
      </div>
      <p className="mt-3 text-pin-muted text-xs">{COPY.shortcuts.toolHint}</p>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          {COPY.shortcuts.close}
        </Button>
      </div>
    </Dialog>
  )
}
