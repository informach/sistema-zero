import type { JSX } from 'react'
import { useSyncExternalStore } from 'react'
import type { IDEMode } from '#core'
import { IconRedo, IconUndo, type MenuItem } from '#ui'
import {
  type EditorHistoryAdapter,
  type EditorHistoryTarget,
  historyTargetFor,
} from '../../../state/editorHistory'
import { useEditorHistory } from '../../../state/studioStores'
import { useT } from '../../../studio/i18n'
import { BarIconButton } from './BarIconButton'

export interface UndoRedoState {
  target: EditorHistoryTarget
  adapter: EditorHistoryAdapter | null
  canUndo: boolean
  canRedo: boolean
}

const NO_SUBSCRIBE = () => () => {}
const NO_VERSION = () => 0

/**
 * O estado dos botões de desfazer e refazer para o modo atual (ver `historyTargetFor`). A barra
 * re-renderiza quando o registro muda: um editor entra ou sai, a criança toca no outro editor da
 * Ponte, uma pilha cresce ou esvazia. `null` fora de um <Studio> (sem editor, sem botões).
 */
export function useUndoRedo(mode: IDEMode): UndoRedoState | null {
  const history = useEditorHistory()
  useSyncExternalStore(history?.subscribe ?? NO_SUBSCRIBE, history?.getVersion ?? NO_VERSION)
  if (!history) return null
  const target = historyTargetFor(mode, history.lastActive())
  const adapter = history.get(target)
  return {
    target,
    adapter,
    canUndo: adapter?.canUndo() ?? false,
    canRedo: adapter?.canRedo() ?? false,
  }
}

function isApple(): boolean {
  if (typeof navigator === 'undefined') return false
  const hint = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  return /mac|iphone|ipad|ipod/i.test(hint?.platform ?? navigator.platform ?? '')
}

/** O atalho do próprio editor, para a dica do mouse (o mesmo nos blocos e no código). */
function shortcut(kind: 'undo' | 'redo'): string {
  if (isApple()) return kind === 'undo' ? '⌘Z' : '⇧⌘Z'
  return kind === 'undo' ? 'Ctrl+Z' : 'Ctrl+Y'
}

/**
 * Os dois círculos da tela-modelo, entre o Zappy e o olho da prévia. O nome acessível é fixo
 * ("Desfazer"/"Refazer"); a dica diz ONDE ("Desfazer nos blocos (Ctrl+Z)"), porque na Ponte o
 * alvo muda com o editor que a criança tocou por último. Sem nada para desfazer, desligado.
 */
export function UndoRedo({ state }: { state: UndoRedoState }): JSX.Element {
  const t = useT()
  const where = state.target === 'blocks' ? 'Blocks' : 'Code'
  return (
    <>
      <BarIconButton
        label={t('topbar.undo')}
        title={t(`topbar.undo${where}`, { keys: shortcut('undo') })}
        disabled={!state.canUndo}
        onClick={() => state.adapter?.undo()}
      >
        <IconUndo />
      </BarIconButton>
      <BarIconButton
        label={t('topbar.redo')}
        title={t(`topbar.redo${where}`, { keys: shortcut('redo') })}
        disabled={!state.canRedo}
        onClick={() => state.adapter?.redo()}
      >
        <IconRedo />
      </BarIconButton>
    </>
  )
}

/** No compacto os dois não cabem na barra: entram no "⋯", numa seção "Editar". */
export function undoRedoMenuItems(state: UndoRedoState, t: (key: string) => string): MenuItem[] {
  return [
    {
      id: 'undo',
      label: t('topbar.undo'),
      icon: <IconUndo />,
      disabled: !state.canUndo,
      onSelect: () => state.adapter?.undo(),
    },
    {
      id: 'redo',
      label: t('topbar.redo'),
      icon: <IconRedo />,
      disabled: !state.canRedo,
      onSelect: () => state.adapter?.redo(),
    },
  ]
}
