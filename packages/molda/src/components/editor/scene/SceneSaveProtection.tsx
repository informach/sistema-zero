import { useEffect, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { triggerDownload } from '../../../export/download'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneToJson } from '../../../scene/documentJson'
import type { EditorStore } from '../../../state/editorStore'
import {
  EMPTY_RECOVERY,
  type SceneRecoveryCandidate,
  type SceneRecoveryController,
} from '../../../state/sceneRecoveryController'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'

const emptySubscribe = () => () => {}
const emptySnapshot = () => EMPTY_RECOVERY

/** Immediate rescue actions; the compact notice stays visible after acknowledging the dialog. */
export function SceneSaveProtection({
  editor,
  recovery,
  backup,
}: {
  editor: EditorStore<MoldaSceneDocument>
  recovery?: SceneRecoveryController
  backup(): boolean
}) {
  const saved = useStore(editor, (state) => state.savedAsset)
  const saveState = useStore(editor, (state) => state.saveState)
  const saveError = useStore(editor, (state) => state.saveError)
  const contentRevision = useStore(editor, (state) => state.contentRevision)
  const rescue = useSyncExternalStore(
    recovery?.subscribe ?? emptySubscribe,
    recovery?.getSnapshot ?? emptySnapshot,
    emptySnapshot,
  )
  const [acknowledged, setAcknowledged] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [closedRecovery, setClosedRecovery] = useState<SceneRecoveryCandidate | null>(null)
  const [discarding, setDiscarding] = useState<SceneRecoveryCandidate | null>(null)
  const failure =
    saveError !== null && saveError !== COPY.scene.conflict
      ? `${saveError}:${saved.updatedAt}`
      : rescue.phase === 'error'
        ? `recovery:${rescue.error}:${saved.updatedAt}`
        : null
  const protectedNow =
    rescue.protectedContentRevision === contentRevision &&
    rescue.protectedDocument?.id === editor.getState().asset.id
  useEffect(() => {
    let active = true
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const state = editor.getState()
      if (state.saveSnapshot() === state.savedAsset) return
      event.preventDefault()
      event.returnValue = ''
    }
    const hidden = () => {
      if (document.visibilityState !== 'hidden') return
      void editor
        .getState()
        .flush()
        .catch(() => {
          if (active)
            setActionError('Não consegui terminar o salvamento. Guarde uma cópia antes de sair.')
        })
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      active = false
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [editor])
  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
    } catch {
      setActionError('Não consegui terminar esta ação. Sua criação continua aberta.')
    } finally {
      setBusy(false)
    }
  }
  const actions = (
    <>
      <Button
        size="compact"
        variant="primary"
        onClick={() => {
          if (backup()) setAcknowledged(failure)
          else
            setActionError(
              'Não consegui baixar a cópia. Mantenha esta janela aberta e tente novamente.',
            )
        }}
      >
        Guardar uma cópia
      </Button>
      <Button
        size="compact"
        disabled={busy || saveState === 'saving'}
        onClick={() =>
          void act(async () => {
            await recovery?.flush()
            await editor.getState().flush()
          })
        }
      >
        Tentar salvar novamente
      </Button>
    </>
  )
  const candidate = rescue.available
  const conflict = candidate?.conflict || contentRevision !== 0
  function downloadFound() {
    if (!candidate) return
    try {
      if (
        !triggerDownload(
          JSON.stringify(sceneToJson(candidate.document)),
          `${candidate.document.id}-recuperado.molda.json`,
          'application/json',
        )
      )
        throw new Error('Download unavailable')
    } catch {
      setActionError('Não consegui baixar o trabalho encontrado. Tente novamente.')
    }
  }
  return (
    <>
      {(failure || rescue.error || actionError) && (
        <div
          role="alert"
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-mld-border bg-mld-surface px-3 py-2 text-sm"
        >
          <p className="min-w-0 flex-1">
            {actionError ??
              (failure
                ? protectedNow
                  ? 'Salvamento pendente. Suas últimas mudanças têm uma cópia de recuperação neste dispositivo.'
                  : 'Não consegui guardar as últimas mudanças. Proteja sua criação antes de sair.'
                : rescue.error)}
          </p>
          {actions}
        </div>
      )}
      {candidate && closedRecovery === candidate && (
        <div
          role="status"
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-mld-border bg-mld-surface px-3 py-2 text-sm"
        >
          <p className="min-w-0 flex-1">Seu trabalho encontrado continua guardado.</p>
          <Button size="compact" onClick={() => setClosedRecovery(null)}>
            Ver trabalho encontrado
          </Button>
        </div>
      )}
      <Dialog
        open={!!failure && acknowledged !== failure && !candidate}
        title="Vamos proteger sua criação"
        onClose={() => setAcknowledged(failure)}
      >
        <p className="text-sm">Não consegui guardar as últimas mudanças no projeto.</p>
        <p className="mt-2 text-sm text-mld-text-soft">
          {protectedNow
            ? 'Uma cópia de recuperação já está guardada neste dispositivo. Você também pode baixar seu projeto.'
            : 'Mantenha esta janela aberta e guarde uma cópia do projeto para proteger seu trabalho.'}
        </p>
        {actionError && (
          <p role="alert" className="mt-2 text-sm text-mld-danger">
            {actionError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {actions}
          <Button size="compact" variant="ghost" onClick={() => setAcknowledged(failure)}>
            Voltar à criação
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!candidate && closedRecovery !== candidate && !discarding}
        title="Encontramos seu trabalho mais recente"
        onClose={() => setClosedRecovery(candidate)}
      >
        <p className="text-sm">
          {conflict
            ? 'Há outra versão desta criação. Guarde o trabalho encontrado para manter as duas versões.'
            : 'Há mudanças que não chegaram ao projeto salvo. Quer continuar de onde parou?'}
        </p>
        {candidate && (
          <p className="mt-2 break-words text-sm font-bold">{candidate.document.name}</p>
        )}
        {(actionError || rescue.error) && (
          <p role="alert" className="mt-2 text-sm text-mld-danger">
            {actionError ?? rescue.error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!conflict && (
            <Button
              size="compact"
              variant="primary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  if (!(await recovery?.restore()))
                    setActionError(
                      'Não consegui recuperar aqui. Baixe o trabalho encontrado para guardá-lo.',
                    )
                })
              }
            >
              Continuar meu trabalho
            </Button>
          )}
          <Button size="compact" onClick={downloadFound}>
            Baixar trabalho encontrado
          </Button>
          <Button
            size="compact"
            variant="ghost"
            disabled={busy}
            onClick={() => setDiscarding(candidate)}
          >
            Manter criação aberta
          </Button>
        </div>
      </Dialog>
      <Dialog open={!!discarding} title="Usar a versão salva?" onClose={() => setDiscarding(null)}>
        <p className="text-sm">
          Isso descarta as mudanças da cópia encontrada. Você pode baixá-la antes de escolher.
        </p>
        {actionError && (
          <p role="alert" className="mt-2 text-sm text-mld-danger">
            {actionError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="compact" onClick={downloadFound}>
            Baixar trabalho encontrado
          </Button>
          <Button size="compact" disabled={busy} onClick={() => setDiscarding(null)}>
            Voltar
          </Button>
          <Button
            size="compact"
            variant="danger"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                if (await recovery?.keepCurrent(discarding)) setDiscarding(null)
              })
            }
          >
            Usar versão salva
          </Button>
        </div>
      </Dialog>
    </>
  )
}
