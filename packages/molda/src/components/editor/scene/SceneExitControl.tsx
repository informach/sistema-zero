import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { ArrowLeft } from '../../ui/icons'

export type SceneExitMode = 'saved' | 'discard'

/** Exiting cancels previews only after explicit consent, never merely opening the dialog. */
export function SceneExitControl({
  editor,
  cancelPreview,
  backup,
  onExit,
  beforeExit,
}: {
  editor: EditorStore<MoldaSceneDocument>
  cancelPreview(): void
  backup(): boolean
  onExit(mode: SceneExitMode): void
  beforeExit?(): Promise<boolean>
}) {
  const copy = COPY.scene.exit
  const trigger = useRef<HTMLButtonElement>(null)
  const session = useMemo(
    () => ({ editor, onExit, active: false, serial: 0, busy: false }),
    [editor, onExit],
  )
  const [state, setState] = useState<{
    session: typeof session
    open: boolean
    pending: boolean
    error: string | null
  }>({
    session,
    open: false,
    pending: false,
    error: null,
  })
  const current = state.session === session ? state : { open: false, pending: false, error: null }
  useLayoutEffect(() => {
    session.active = true
    return () => {
      session.active = false
      session.serial++
      session.busy = false
    }
  }, [session])
  function close() {
    session.serial++
    session.busy = false
    setState({ session, open: false, pending: false, error: null })
  }
  async function saveAndLeave() {
    if (session.busy || !session.active) return
    session.busy = true
    const serial = ++session.serial
    const owns = () => session.active && serial === session.serial
    setState({ session, open: true, pending: true, error: null })
    try {
      cancelPreview()
      await session.editor.getState().flush()
      if (!owns()) return
      const saved = session.editor.getState()
      if (saved.saveState !== 'saved' || saved.asset !== saved.savedAsset) {
        setState({ session, open: true, pending: false, error: saved.saveError ?? copy.failed })
        return
      }
      if (beforeExit) {
        const ready = await beforeExit()
        if (!owns()) return
        if (!ready) {
          close()
          return
        }
      }
      setState({ session, open: false, pending: false, error: null })
      session.onExit('saved')
    } catch {
      if (owns()) setState({ session, open: true, pending: false, error: copy.failed })
    } finally {
      if (owns()) session.busy = false
    }
  }
  return (
    <>
      {/* A pílula "← Meus projetos" da tela-modelo; abaixo de `sm` a seta fica sozinha. */}
      <button
        ref={trigger}
        type="button"
        className="sz-tool-pill sz-tool-pill--quiet shrink-0 px-3.5 text-sm max-sm:w-(--sz-tool-hit) max-sm:px-0"
        onClick={() => {
          setState({ session, open: true, pending: false, error: null })
        }}
      >
        <ArrowLeft aria-hidden="true" />
        <span className="max-sm:sr-only">{copy.open}</span>
      </button>
      <Dialog open={current.open} title={copy.title} onClose={close} returnFocusTo={trigger}>
        <p className="text-sm text-mld-text-soft">{copy.hint}</p>
        {current.error && (
          <p role="alert" className="mt-3 text-sm text-mld-danger">
            {current.error}
          </p>
        )}
        {current.pending && (
          <p role="status" className="mt-3 text-sm text-mld-muted">
            {copy.saving}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={close}>{copy.stay}</Button>
          <Button variant="primary" disabled={current.pending} onClick={() => void saveAndLeave()}>
            {copy.save}
          </Button>
          {current.error && (
            <>
              <Button
                onClick={() => {
                  if (!backup())
                    setState({ session, open: true, pending: false, error: COPY.scene.backupError })
                }}
              >
                {COPY.scene.backup}
              </Button>
              <Button
                onClick={() => {
                  session.serial++
                  session.editor.getState().dispose()
                  setState({ session, open: false, pending: false, error: null })
                  session.onExit('discard')
                }}
              >
                {copy.discard}
              </Button>
            </>
          )}
        </div>
      </Dialog>
    </>
  )
}
