'use client'

import type { MoldaToolAccess } from '@sistemazero/molda/tools'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ArquipelagoStudioConfig } from '../lib/arquipelago-studio'
import type { EmbeddedCreationControl } from '../lib/embedded-creation-control'

const PintaClient = lazy(() =>
  import('./creator/pinta-client').then((m) => ({ default: m.PintaClient })),
)
const MoldaClient = lazy(() =>
  import('./creator/molda-client').then((m) => ({ default: m.MoldaClient })),
)
const StudioFullClient = lazy(() =>
  import('./creator/studio-full-client').then((m) => ({ default: m.StudioFullClient })),
)

/** A criação só é entregue depois da gravação local e da confirmação na conta. */
export function ArquipelagoCreationDialog({
  ferramenta,
  viewerId,
  audience,
  studioAvailable,
  narrationEnabled,
  toolAccess,
  studioConfig,
  onFinish,
}: {
  ferramenta: 'pinta' | 'molda' | 'estudio'
  viewerId: string
  audience: 'kids' | 'adult'
  studioAvailable: boolean
  narrationEnabled: boolean
  toolAccess: MoldaToolAccess | null
  studioConfig: ArquipelagoStudioConfig | null
  onFinish: (id: string | null) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const control = useRef<EmbeddedCreationControl | null>(null)
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const registerControl = useCallback((value: EmbeddedCreationControl | null) => {
    control.current = value
  }, [])
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    return () => element.close()
  }, [])

  async function finish(returnCreation: boolean) {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError(null)
    setConfirmExit(false)
    try {
      if (!control.current) throw new Error('Aguarde a ferramenta terminar de abrir.')
      const id = await control.current.concluir()
      if (returnCreation && !id) {
        setError('Abra uma criação para usá-la no Arquipélago.')
        return
      }
      onFinish(returnCreation ? id : null)
    } catch {
      setError('Não foi possível confirmar a criação na sua conta. Tente novamente.')
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="arquipelago-pinta-title"
      onCancel={(event) => {
        event.preventDefault()
        void finish(false)
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
          <h2 id="arquipelago-pinta-title" className="mr-auto text-lg font-bold">
            {ferramenta === 'pinta' ? 'Pinta' : ferramenta === 'molda' ? 'Molda' : 'Estúdio'}
          </h2>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(false)}
            className="rounded-full border border-border px-4 py-2 font-semibold disabled:opacity-50"
          >
            Voltar ao jogo
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(true)}
            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Usar criação'}
          </button>
        </header>
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 bg-amber-100 px-4 py-2 text-amber-950"
          >
            <p>{error}</p>
            {confirmExit ? (
              <button
                type="button"
                onClick={() => onFinish(null)}
                className="rounded-full border border-amber-900 px-3 py-1 font-semibold"
              >
                Confirmar saída sem garantir o salvamento
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmExit(true)}
                className="rounded-full border border-amber-900 px-3 py-1 font-semibold"
              >
                Sair sem confirmar
              </button>
            )}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" inert={saving} aria-busy={saving}>
          <Suspense
            fallback={
              <p role="status" className="p-4">
                Carregando a ferramenta…
              </p>
            }
          >
            {ferramenta === 'pinta' ? (
              <PintaClient
                viewerId={viewerId}
                audience={audience}
                studioAvailable={studioAvailable}
                narrationEnabled={narrationEnabled}
                onCompletionControlChange={registerControl}
              />
            ) : ferramenta === 'molda' ? (
              <MoldaClient
                viewerId={viewerId}
                audience={audience}
                studioAvailable={studioAvailable}
                narrationEnabled={narrationEnabled}
                toolAccess={toolAccess}
                onCompletionControlChange={registerControl}
              />
            ) : studioConfig ? (
              <StudioFullClient
                {...studioConfig}
                audience={audience}
                embeddedInArquipelago
                onCompletionControlChange={registerControl}
              />
            ) : null}
          </Suspense>
        </div>
      </div>
    </dialog>
  )
}
