'use client'

import type { MoldaToolAccess } from '@sistemazero/molda/tools'
import { Button } from '@sistemazero/ui/button'
import { ArrowLeft, Box, Code2, Loader2, Palette, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { PedidoDeObjeto } from '../lib/arquipelago-objeto'
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

const FERRAMENTAS = {
  pinta: { nome: 'Pinta', icone: Palette },
  molda: { nome: 'Molda', icone: Box },
  estudio: { nome: 'Estúdio', icone: Code2 },
} as const

/** Por que a criação não voltou ao jogo (a frase é a mesma nas duas comunidades). */
const AVISOS = {
  abrindo: 'Espere a ferramenta terminar de abrir.',
  semCriacao: 'Abra uma criação para usar no Arquipélago.',
  naoGuardou: 'Não consegui guardar a criação na sua conta. Tente de novo.',
} as const

/**
 * A ferramenta de verdade por cima do jogo. A criação só é entregue depois da gravação local e
 * da confirmação na conta (`concluir()` da ferramenta). O cabeçalho veste o tema do app (tokens
 * e `sz-btn-gradient`), então fica na cara da comunidade que hospeda.
 */
export function ArquipelagoCreationDialog({
  ferramenta,
  viewerId,
  audience,
  studioAvailable,
  narrationEnabled,
  toolAccess,
  studioConfig,
  objeto = null,
  onFinish,
}: {
  ferramenta: 'pinta' | 'molda' | 'estudio'
  viewerId: string
  audience: 'kids' | 'adult'
  studioAvailable: boolean
  narrationEnabled: boolean
  toolAccess: MoldaToolAccess | null
  studioConfig: ArquipelagoStudioConfig | null
  /** A aparência de um objeto do jogo: a ferramenta abre com o molde dele. */
  objeto?: PedidoDeObjeto | null
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
    if (!control.current) {
      // Ferramenta ainda abrindo: nada para guardar, então voltar é imediato.
      if (!returnCreation) onFinish(null)
      else setError(AVISOS.abrindo)
      return
    }
    busy.current = true
    setSaving(true)
    setError(null)
    setConfirmExit(false)
    try {
      const id = await control.current.concluir()
      if (returnCreation && !id) {
        setError(AVISOS.semCriacao)
        return
      }
      onFinish(returnCreation ? id : null)
    } catch {
      setError(AVISOS.naoGuardou)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const { nome, icone: Icone } = FERRAMENTAS[ferramenta]
  const falhouAoGuardar = error === AVISOS.naoGuardou

  return (
    <dialog
      ref={dialog}
      aria-labelledby="arquipelago-ferramenta-titulo"
      onCancel={(event) => {
        event.preventDefault()
        void finish(false)
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-2 border-border border-b bg-card px-3 py-2.5 sm:gap-3 sm:px-4">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => void finish(false)}
            aria-label="Voltar ao jogo"
            className="h-11 shrink-0 gap-2 rounded-full px-3 font-semibold text-sm sm:px-4"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">Voltar ao jogo</span>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden
              className="hidden size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary min-[420px]:grid"
            >
              <Icone className="size-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="arquipelago-ferramenta-titulo"
                className="sz-display truncate text-lg leading-tight"
              >
                {nome}
              </h2>
              <p className="truncate text-muted-foreground text-xs">
                {objeto ? `Molde: ${objeto.molde.nome}` : 'Para usar no Arquipélago'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(true)}
            className="sz-btn-gradient h-11 shrink-0 gap-2 px-4 text-sm sm:px-5"
          >
            {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {saving ? 'Guardando…' : 'Usar no jogo'}
          </button>
        </header>
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-border border-b bg-muted px-4 py-2.5 text-foreground text-sm"
          >
            <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
              <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
              {error}
            </p>
            {falhouAoGuardar ? (
              confirmExit ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    O que não foi guardado pode se perder.
                  </span>
                  <Button
                    variant="destructive"
                    onClick={() => onFinish(null)}
                    className="h-9 rounded-full px-3 font-semibold"
                  >
                    Sair mesmo assim
                  </Button>
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setConfirmExit(true)}
                  className="h-9 rounded-full px-3 font-semibold"
                >
                  Sair sem guardar
                </Button>
              )
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" inert={saving} aria-busy={saving}>
          <Suspense
            fallback={
              <p
                role="status"
                className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm"
              >
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Abrindo o {nome}
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
                {...(objeto?.ferramenta === 'pinta' ? { initialCanvas: objeto.tela } : {})}
              />
            ) : ferramenta === 'molda' ? (
              <MoldaClient
                viewerId={viewerId}
                audience={audience}
                studioAvailable={studioAvailable}
                narrationEnabled={narrationEnabled}
                toolAccess={toolAccess}
                onCompletionControlChange={registerControl}
                {...(objeto?.ferramenta === 'molda' ? { initialModel: objeto.caixa } : {})}
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
