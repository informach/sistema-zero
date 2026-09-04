/**
 * A barra de cima de todo editor: Voltar, nome + selo do tipo, um espaço no
 * meio (abas Montar/Pintar do modelo), desfazer/refazer e o estado do
 * salvamento.
 */
import { clsx } from 'clsx'
import type { JSX, ReactNode } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import type { EditorStore, SaveState } from '../../state/editorStore'
import { KindChip } from '../gallery/kinds'
import { Button, IconButton } from '../ui/Button'
import { ArrowLeft, Check, Loader2, Redo2, Undo2 } from '../ui/icons'

export function SaveBadge({
  state,
  error,
}: {
  state: SaveState
  error: string | null
}): JSX.Element {
  const text =
    state === 'saved'
      ? COPY.editor.saved
      : state === 'saving'
        ? COPY.editor.saving
        : state === 'dirty'
          ? COPY.editor.dirty
          : (error ?? COPY.editor.saveError)
  return (
    <span
      role="status"
      aria-label={COPY.a11y.editorStatus}
      className={clsx(
        'inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-xs font-bold',
        state === 'error' ? 'bg-mld-danger/15 text-mld-danger' : 'bg-mld-ok/15 text-mld-ok',
      )}
    >
      {state === 'saving' ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : state === 'saved' ? (
        <Check aria-hidden="true" className="size-3.5" />
      ) : null}
      {text}
    </span>
  )
}

export function EditorTopBar({
  editor,
  onBack,
  center,
  actions,
}: {
  editor: EditorStore
  onBack: () => void
  /** Abas de modo (Montar/Pintar), no meio. */
  center?: ReactNode
  /** Botões à direita, antes de desfazer/refazer (Baixar). */
  actions?: ReactNode
}): JSX.Element {
  const asset = useStore(editor, (state) => state.asset)
  const saveState = useStore(editor, (state) => state.saveState)
  const saveError = useStore(editor, (state) => state.saveError)
  const canUndo = useStore(editor, (state) => state.canUndo)
  const canRedo = useStore(editor, (state) => state.canRedo)
  return (
    <header className="flex items-center gap-2 border-b-2 border-mld-border bg-mld-surface px-3 py-2">
      <Button variant="ghost" onClick={onBack} aria-label={COPY.editor.backToGallery}>
        <ArrowLeft aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">{COPY.editor.back}</span>
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="mld-display truncate text-lg text-mld-text">{asset.name}</h1>
        <KindChip kind={asset.kind} className="hidden sm:inline-flex" />
      </div>
      {center ? <div className="flex shrink-0 items-center">{center}</div> : null}
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      <IconButton
        aria-label={COPY.editor.undo}
        title={`${COPY.editor.undo} (Ctrl+Z)`}
        disabled={!canUndo}
        onClick={() => editor.getState().undo()}
      >
        <Undo2 aria-hidden="true" className="size-5" />
      </IconButton>
      <IconButton
        aria-label={COPY.editor.redo}
        title={`${COPY.editor.redo} (Ctrl+Y)`}
        disabled={!canRedo}
        onClick={() => editor.getState().redo()}
      >
        <Redo2 aria-hidden="true" className="size-5" />
      </IconButton>
      <SaveBadge state={saveState} error={saveError} />
    </header>
  )
}
