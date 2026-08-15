'use client'

/**
 * Bloco de aula do PINTA: o ateliê de desenho embarcado, com o desenho já criado pelo professor.
 * Espelha o `studio-block` no que importa (rascunho local, enviar ao professor com recado,
 * expandir) e deixa de fora o que é do Estúdio (auto-correção, Compartilhar no Mural, runtime Pro).
 *
 * ⭐ **O rascunho é o próprio ARMAZENAMENTO injetado.** Diferente do Estúdio (que tem o store local
 * dele e é semeado por prop), aqui o `<PintaLesson>` recebe um banco PRÓPRIO por bloco + perfil, e
 * a regra "o que já está guardado vence o desenho inicial" mora dentro dele. Logo o rascunho local
 * não aparece na ordem de seed daqui: só decidimos qual desenho oferecer como INICIAL quando o
 * armazenamento ainda está vazio — e aí a ordem é entrega → cadeia → desenho do professor.
 */

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { CheckCheck, CheckCircle2, Download, Maximize2, Minimize2, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import { resolvePintaSeed } from '../../lib/pinta-seed'
import type { PintaBlock, PintaStateView, PintaSubmissionResultView } from '../../lib/types'
import { useLessonPlayer } from '../lesson-player-context'

/** O módulo do Pinta é carregado só no client (IndexedDB/canvas não existem no SSR). */
type PintaModule = typeof import('@sistemazero/pinta/lesson')
type PintaComponent = PintaModule['PintaLesson']
type PintaHandle = import('@sistemazero/pinta/lesson').PintaHandle
type PintaPersistence = import('@sistemazero/pinta/lesson').PintaPersistence

const MESSAGE_MAX = 1000

/**
 * "Expandir" precisa SOBREVIVER ao `router.refresh()` que o envio dispara (o bloco re-monta com
 * `submitted:true` e um `useState` comum voltaria a `false` — a criança caía da tela cheia).
 * Mesma solução do Estúdio: Map de MÓDULO, limpo por um F5 real.
 */
const expandedByBlock = new Map<string, boolean>()

/** Banco próprio por BLOCO + PERFIL: irmãos no mesmo navegador não misturam o rascunho. */
function draftNamespace(blockId: string, viewerId: string | undefined): string {
  return viewerId ? `aula-${blockId}-${viewerId}` : `aula-${blockId}`
}

export function PintaBlockView({
  blockId,
  content,
  pintaState,
  fillHeight = false,
}: {
  blockId: string
  content: PintaBlock
  pintaState: PintaStateView | null
  /** A aula guiada do kids estica o editor; a página normal usa altura fixa. */
  fillHeight?: boolean
}) {
  const player = useLessonPlayer()
  const lessonId = player?.lessonId ?? ''

  const [mod, setMod] = useState<PintaModule | null>(null)
  const [persistence, setPersistence] = useState<PintaPersistence | null>(null)
  const [initialAsset, setInitialAsset] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(pintaState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(pintaState?.submittedAt ?? null)
  const [reviewed, setReviewed] = useState<boolean>(pintaState?.reviewed ?? false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(() => expandedByBlock.get(blockId) ?? false)

  const handleRef = useRef<PintaHandle | null>(null)

  // As demais dependências (desenho inicial, estado da entrega, aula, perfil) são a SEMENTE:
  // re-executar com elas re-hidrataria o editor por cima do que a criança está desenhando.
  // biome-ignore lint/correctness/useExhaustiveDependencies: semeia UMA vez por bloco, de propósito
  useEffect(() => {
    let active = true
    void (async () => {
      const loaded = await import('@sistemazero/pinta/lesson')
      if (!active) return
      const store = loaded.createPintaPersistence({
        namespace: draftNamespace(blockId, player?.viewerId ?? undefined),
      })

      // A ordem (entrega → cadeia → desenho do professor) é PURA e vive em `lib/pinta-seed`;
      // aqui só ligamos os fios. Sem `lessonId` não há o que buscar: fica o do professor.
      const bloco = `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}`
      const buscar = (rota: string) => async () =>
        (await apiGet<{ asset: unknown | null }>(`${bloco}/${rota}`).catch(() => null))?.asset ??
        null
      const seed = await resolvePintaSeed({
        initialAsset: content.initialAsset,
        chain: content.chain,
        submitted: Boolean(lessonId) && Boolean(pintaState?.submitted),
        loadSubmission: buscar('pinta-submission'),
        loadCarryover: lessonId ? buscar('pinta-carryover') : async () => null,
        aborted: () => !active,
      })

      if (!active) return
      setPersistence(() => store)
      setInitialAsset(seed)
      setMod(loaded)
    })()
    return () => {
      active = false
    }
  }, [blockId])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[role="menu"],[role="dialog"]')) return
      setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  useEffect(() => {
    expandedByBlock.set(blockId, expanded)
  }, [blockId, expanded])

  useBodyScrollLock(expanded)

  const submit = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    setSubmitting(true)
    setError(null)
    try {
      // ⚠️ SALVA antes de ler: o autosave é debounced, e enviar o desenho de 1s atrás mandaria
      // ao professor uma versão sem os últimos traços.
      await handle.save()
      const asset = handle.getAsset()
      const note = message.trim()
      const res = await apiSend<PintaSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/pinta-submission`,
        'POST',
        { asset, ...(note ? { message: note } : {}) },
      )
      setSubmitted(true)
      setSubmittedAt(res.submittedAt)
      setReviewed(false) // entrega nova: o carimbo do professor não vale mais
      setMessage('')
      player?.refreshAfterStudio?.()
    } catch (err) {
      const apiErr = err as ApiError
      setError(
        apiErr?.code === 'PAYLOAD_TOO_LARGE'
          ? 'Seu desenho está muito grande para enviar. Tente um desenho com menos detalhes.'
          : 'Não consegui enviar o seu desenho. Tente de novo.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [lessonId, blockId, player, message])

  /**
   * "Baixar o desenho": gera o `.pinta.json` de UM desenho — o MESMO envelope que a galeria do
   * Pinta restaura. É assim que o desenho da aula vai para o Pinta completo, sem ponte nova.
   */
  const download = useCallback(() => {
    const handle = handleRef.current
    if (!handle || !mod) return
    const asset = handle.getAsset()
    const blob = new Blob([mod.assetToJson(asset)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${asset.name || 'desenho'}.pinta.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [mod])

  const PintaLesson = mod?.PintaLesson as PintaComponent | undefined
  const ready = Boolean(PintaLesson && persistence && initialAsset)

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        expanded && 'fixed inset-0 z-50 gap-2 bg-background p-3',
        !expanded && fillHeight && 'min-h-0 flex-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={download} disabled={!ready}>
          <Download className="size-4" />
          Baixar o desenho
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          {expanded ? 'Reduzir' : 'Expandir'}
        </Button>
        <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting || !ready}>
          {submitting ? <Spinner /> : <Send className="size-4" />}
          {submitted ? 'Enviar de novo' : 'Enviar para o professor'}
        </Button>
      </div>

      <div
        className={cn(
          'isolate overflow-hidden rounded-lg border border-border bg-muted',
          expanded || fillHeight ? 'min-h-0 flex-1' : 'h-[40rem] lg:h-[52rem]',
        )}
      >
        {ready && PintaLesson && persistence ? (
          <PintaLesson
            handleRef={handleRef}
            initialAsset={initialAsset as Parameters<PintaComponent>[0]['initialAsset']}
            persistence={persistence}
            allowTools={content.allowTools}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Abrindo o seu desenho...
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {submitted ? (
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
            <CheckCircle2 className="size-4" />
            Desenho enviado ao professor
            {submittedAt ? ` em ${new Date(submittedAt).toLocaleString('pt-BR')}` : ''}.
          </p>
          {reviewed ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCheck className="size-4" />O professor já viu o seu desenho.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Envie o seu desenho ao professor para poder concluir a aula.
        </p>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={submitted ? 'Enviar o desenho de novo?' : 'Enviar o desenho?'}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmOpen(false)
                void submit()
              }}
              disabled={submitting}
            >
              <Send className="size-4" />
              Enviar
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {submitted
              ? 'O professor vai ver esta versão no lugar da anterior.'
              : 'O professor vai ver o seu desenho do jeito que ele está agora.'}
          </p>
          <label className="block space-y-1">
            <span className="font-medium">Quer escrever um recado? (opcional)</span>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              rows={3}
              placeholder="Ex.: desenhei o meu personagem com a capa vermelha!"
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
