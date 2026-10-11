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

import { pintaContentFingerprint } from '@sistemazero/core/creations'
import { pintaAssetToWire } from '@sistemazero/pinta/assets'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import {
  ArrowLeftRight,
  CheckCheck,
  CheckCircle2,
  Download,
  Maximize2,
  Minimize2,
  Send,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useReportActivityExpanded } from '../../lib/lesson-activity-expansion'
import type { LessonDraftConflictOutcome, LessonDraftRemote } from '../../lib/lesson-draft-cloud'
import { requestPersistentStorage } from '../../lib/persistent-storage'
import { resolvePintaSeed } from '../../lib/pinta-seed'
import { preparePintaSubmission } from '../../lib/pinta-submission'
import type { PintaBlock, PintaStateView, PintaSubmissionResultView } from '../../lib/types'
import { useLessonCopy } from '../lesson-copy-context'
import {
  LessonDraftStatus,
  useLessonDraftEditor,
  useLessonDraftState,
} from '../lesson-draft-status'
import { useLessonPlayer } from '../lesson-player-context'
import { EXPANDED_EXIT_ATTR, EXPANDED_EXIT_EDITOR, LessonVideoToggle } from '../lesson-video-float'
import {
  type PintaDraftDeps,
  pintaDraftProducer,
  preparePintaLessonDraft,
  resolvePintaConflict,
  swapOtherDrawing,
  withDraftUpload,
} from './lesson-pinta-draft'
import { loadPintaLessonModule, type PintaLessonModule } from './pinta-loader'

/** O módulo do Pinta é carregado só no client (IndexedDB/canvas não existem no SSR). */
type PintaComponent = PintaLessonModule['PintaLesson']
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
  const { pinta, rascunho } = useLessonCopy()
  const lessonId = player?.lessonId ?? ''
  // O rascunho guardado na CONTA (10/10/2026), como no Estúdio da fase: só com o app que fala
  // com a nuvem (o Kids), com perfil e numa aula de verdade.
  const draftChannel = player?.lessonDrafts?.pinta
  const channel =
    draftChannel?.supported && player?.viewerId && player.lessonId ? draftChannel : null
  const draftState = useLessonDraftState(channel, blockId)

  const [mod, setMod] = useState<PintaLessonModule | null>(null)
  const [persistence, setPersistence] = useState<PintaPersistence | null>(null)
  const [initialAsset, setInitialAsset] = useState<unknown>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(pintaState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(pintaState?.submittedAt ?? null)
  const [reviewed, setReviewed] = useState<boolean>(pintaState?.reviewed ?? false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(() => expandedByBlock.get(blockId) ?? false)
  // Trocar pela "outra versão" remonta o editor com o desenho novo.
  const [pintaVersion, setPintaVersion] = useState(0)
  const [draftDeps, setDraftDeps] = useState<PintaDraftDeps | null>(null)
  const [hasOther, setHasOther] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [otherNote, setOtherNote] = useState<string | null>(null)
  // A conta tinha um desenho que este aparelho não conhecia e ele abriu por cima (primeiro contato).
  const [contaNote, setContaNote] = useState<string | null>(null)
  // Enquanto o desenho da conta sobe para cima, o editor fica parado e nada sobe (ver o Estúdio).
  const [trazendoDaConta, setTrazendoDaConta] = useState(false)
  const trazendoRef = useRef(false)
  const [sentFingerprint, setSentFingerprint] = useState<string | null>(
    pintaState?.contentFingerprint ?? null,
  )
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null)

  const handleRef = useRef<PintaHandle | null>(null)
  // O conflito na subida (`resolvePintaConflict`). Num ref porque a fila guarda o callback e ele
  // precisa do editor de agora. No primeiro contato a versão da conta passa para cima: guarda o
  // que está na tela antes e remonta o editor com ela.
  const conflitoRef = useRef<
    (
      deps: PintaDraftDeps,
      remote: LessonDraftRemote,
      firstContact: boolean,
    ) => Promise<LessonDraftConflictOutcome | undefined>
  >(async () => undefined)
  conflitoRef.current = async (deps, remote, firstContact) => {
    if (firstContact) {
      trazendoRef.current = true
      setTrazendoDaConta(true)
    }
    try {
      if (firstContact) await handleRef.current?.save().catch(() => false)
      const desfecho = await resolvePintaConflict(deps, remote, firstContact)
      if (desfecho.kept) setHasOther(true)
      if (desfecho.opened) {
        setInitialAsset(desfecho.opened)
        setPintaVersion((version) => version + 1)
        setContaNote(rascunho.trouxeDaConta)
      }
      return desfecho.adoptedAt === null
        ? undefined
        : { adopted: { updatedAt: desfecho.adoptedAt } }
    } finally {
      trazendoRef.current = false
      setTrazendoDaConta(false)
    }
  }
  // Estável: só lê o ref, então a fila pode guardar o callback sem prendê-lo a um render velho.
  const aoConflitar = useCallback(
    (deps: PintaDraftDeps) =>
      (remote: LessonDraftRemote, { firstContact }: { firstContact: boolean }) =>
        conflitoRef.current(deps, remote, firstContact),
    [],
  )
  // A subida do rascunho, num ref: o banco embrulhado é criado uma vez, na carga.
  const subirRef = useRef<() => void>(() => {})
  const subirRascunho = useCallback(() => {
    if (!draftDeps || trazendoRef.current) return
    draftDeps.channel.enqueue(
      blockId,
      pintaDraftProducer(draftDeps, setCurrentFingerprint),
      aoConflitar(draftDeps),
    )
  }, [draftDeps, blockId, aoConflitar])
  subirRef.current = subirRascunho

  // As demais dependências (desenho inicial, estado da entrega, aula, perfil) são a SEMENTE:
  // re-executar com elas re-hidrataria o editor por cima do que a criança está desenhando.
  // biome-ignore lint/correctness/useExhaustiveDependencies: semeia UMA vez por bloco, de propósito
  useEffect(() => {
    let active = true
    // O rascunho vive no IndexedDB: pede persistência p/ o navegador não despejá-lo
    // (Safari ~7 dias sem visita; pressão de disco). Best-effort, 1× por sessão.
    requestPersistentStorage()
    void (async () => {
      setLoadError(false)
      const result = await loadPintaLessonModule()
      if (!active) return
      if (!result.module) {
        console.error('Não foi possível carregar o Pinta do bloco.', result.error)
        setLoadError(true)
        return
      }
      const loaded = result.module
      if (!active) return
      const base = loaded.createPintaPersistence({
        namespace: draftNamespace(blockId, player?.viewerId ?? undefined),
      })
      // Com a nuvem, cada salvamento do bloco também sobe para a conta.
      const store = channel ? withDraftUpload(base, () => subirRef.current()) : base
      const deps: PintaDraftDeps | null = channel
        ? {
            channel,
            blockId,
            store: base,
            backup: loaded.createPintaPersistence({
              namespace: `${draftNamespace(blockId, player?.viewerId ?? undefined)}-outra`,
            }),
          }
        : null

      // A ordem (entrega → cadeia → desenho do professor) é PURA e vive em `lib/pinta-seed`;
      // aqui só ligamos os fios. Sem `lessonId` não há o que buscar: fica o do professor.
      const bloco = `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}`
      const buscar = (rota: string) => async () =>
        (await apiGet<{ asset: unknown | null }>(`${bloco}/${rota}`).catch(() => null))?.asset ??
        null
      // A versão da CONTA entra antes de o editor montar; sem nada guardado em lugar nenhum,
      // segue a ordem de sempre.
      let daConta: unknown | null = null
      if (deps) {
        try {
          const enviado =
            pintaState?.submitted && pintaState.submittedAt
              ? {
                  at: Date.parse(pintaState.submittedAt),
                  fingerprint: pintaState.contentFingerprint ?? null,
                }
              : null
          const preparo = await preparePintaLessonDraft({
            ...deps,
            submission: enviado,
            readSubmission: buscar('pinta-submission'),
          })
          if (!active) return
          daConta = preparo.seed
          setHasOther(preparo.other)
          if (preparo.upload)
            channel?.enqueue(
              blockId,
              pintaDraftProducer(deps, setCurrentFingerprint),
              aoConflitar(deps),
            )
          if (daConta) setCurrentFingerprint(await pintaContentFingerprint(daConta))
        } catch (error) {
          console.warn('[rascunho-da-fase] não deu para trazer o desenho da conta', error)
        }
      }
      const seed =
        daConta ??
        (await resolvePintaSeed({
          initialAsset: content.initialAsset,
          chain: content.chain,
          submitted: Boolean(lessonId) && Boolean(pintaState?.submitted),
          loadSubmission: buscar('pinta-submission'),
          loadCarryover: lessonId ? buscar('pinta-carryover') : async () => null,
          aborted: () => !active,
        }))

      if (!active) return
      setDraftDeps(deps)
      setPersistence(() => store)
      setInitialAsset(seed)
      setMod(loaded)
    })()
    return () => {
      active = false
    }
  }, [blockId, loadAttempt])

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
  // O vídeo da seção sai de baixo do Pinta expandido (o flutuante da aula).
  useReportActivityExpanded(expanded)

  const submit = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    setSubmitting(true)
    setError(null)
    try {
      // ⚠️ SALVA antes de ler: o autosave é debounced, e enviar o desenho de 1s atrás mandaria
      // ao professor uma versão sem os últimos traços.
      const toWire = (asset: unknown) =>
        pintaAssetToWire(asset as Parameters<typeof pintaAssetToWire>[0])
      const prepared = await preparePintaSubmission(handle, toWire)
      // Sem conseguir guardar neste aparelho, a entrega vai assim mesmo com o desenho da tela (que
      // tem os últimos traços), sem impressão: o "envio em dia" deixa passar e reenviar destrava.
      const asset = prepared.ok ? prepared.asset : toWire(handle.getAsset())
      // "Envio em dia": a impressão do desenho enviado, a mesma régua do rascunho da conta.
      const fingerprint = prepared.ok ? await pintaContentFingerprint(asset) : null
      // O rascunho sobe junto, em tentativa: a entrega à equipe nunca depende da nuvem dele.
      if (channel) {
        subirRef.current()
        await channel.flush(4000).catch(() => {})
      }
      const note = message.trim()
      const res = await apiSend<PintaSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/pinta-submission`,
        'POST',
        {
          asset,
          ...(note ? { message: note } : {}),
          ...(fingerprint ? { fingerprint } : {}),
        },
      )
      setSentFingerprint(fingerprint)
      setCurrentFingerprint(fingerprint)
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
  }, [lessonId, blockId, player, message, channel])

  // Troca o desenho de agora com a "outra versão" guardada neste navegador.
  const doSwap = useCallback(async () => {
    if (!draftDeps) return
    setSwapping(true)
    setOtherNote(null)
    try {
      await handleRef.current?.save()
      const aberto = await swapOtherDrawing(draftDeps)
      if (!aberto) {
        setHasOther(false)
        setOtherOpen(false)
        return
      }
      setInitialAsset(aberto)
      setPintaVersion((version) => version + 1)
      setContaNote(null)
      setOtherOpen(false)
      subirRef.current()
    } catch {
      setOtherNote(rascunho.outraVersaoFalhou)
    } finally {
      setSwapping(false)
    }
  }, [draftDeps, rascunho.outraVersaoFalhou])
  const mudouDepoisDoEnvio = useMemo(
    () =>
      Boolean(
        submitted &&
          sentFingerprint &&
          currentFingerprint &&
          sentFingerprint !== currentFingerprint,
      ),
    [submitted, sentFingerprint, currentFingerprint],
  )

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
  const savingDrafts = useLessonDraftEditor(
    channel ? player?.lessonDrafts : undefined,
    lessonId,
    'pinta',
    blockId,
    {
      // Editor fora do ar (carregando ou com falha): não há edição na tela para guardar.
      save: async () => {
        if (!ready || !handleRef.current) return
        if (!(await handleRef.current.save())) throw new Error('Não foi possível salvar o desenho')
        subirRef.current()
      },
      // Sem envio, o servidor pede o envio; envio sem impressão passa. Senão, o desenho da tela
      // decide (a mesma régua do envio; vale mesmo com o salvar falhando).
      matchesSubmission: async () => {
        if (!submitted || !sentFingerprint) return true
        const handle = handleRef.current
        if (!handle) return false
        const wire = pintaAssetToWire(handle.getAsset() as Parameters<typeof pintaAssetToWire>[0])
        return (await pintaContentFingerprint(wire)) === sentFingerprint
      },
    },
  )

  return (
    <div
      // Só o avanço da fase para a edição (a comunidade adulta nunca chega aqui).
      inert={savingDrafts || trazendoDaConta || undefined}
      aria-busy={savingDrafts || trazendoDaConta || undefined}
      className={cn(
        'flex flex-col gap-3',
        expanded && 'fixed inset-0 z-50 gap-2 bg-background p-3',
        !expanded && fillHeight && 'min-h-0 flex-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto">
          <LessonDraftStatus
            state={draftState}
            onReload={async () => {
              // A página nova junta a versão da conta com a daqui; o desenho da tela vai ao disco antes.
              // Com prazo: um IndexedDB travado deixava o botão desligado para sempre.
              await Promise.race([
                handleRef.current?.save().catch(() => false),
                new Promise((resolve) => setTimeout(resolve, 3_000)),
              ])
              window.location.reload()
            }}
          />
        </span>
        <LessonVideoToggle expanded={expanded} size="sm" />
        {hasOther ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOtherNote(null)
              setOtherOpen(true)
            }}
            disabled={!ready || swapping}
          >
            <ArrowLeftRight className="size-4" />
            {rascunho.outraVersao}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={download} disabled={!ready}>
          <Download className="size-4" />
          Baixar o desenho
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          // O vídeo flutuante da aula nunca cobre a saída; num editor ele nasce embaixo (a barra de ferramentas mora logo abaixo daqui).
          {...(expanded ? { [EXPANDED_EXIT_ATTR]: EXPANDED_EXIT_EDITOR } : {})}
        >
          {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          {expanded ? 'Reduzir' : 'Expandir'}
        </Button>
        {content.purpose !== 'experiment' &&
          (!player?.submissionAllowedBlockIds ||
            player.submissionAllowedBlockIds.includes(blockId)) && (
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting || !ready}>
              {submitting ? <Spinner /> : <Send className="size-4" />}
              {submitted ? 'Enviar de novo' : pinta.enviar}
            </Button>
          )}
      </div>

      <div
        className={cn(
          'isolate overflow-hidden rounded-lg border border-border bg-muted',
          // Um degrau abaixo do Estúdio, como sempre foi. Encolheu junto com ele
          // (09/2026): com as seções, o ateliê mora numa coluna de metade da tela e
          // 832px de altura ali viravam um retângulo comprido. O piso do mobile é
          // 34rem — o mesmo que o app embarcado usa como mínimo utilizável.
          expanded || fillHeight ? 'min-h-0 flex-1' : 'h-[34rem] lg:h-[36rem]',
        )}
      >
        {loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <p>Não consegui abrir o seu desenho.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              Tentar novamente
            </Button>
          </div>
        ) : ready && PintaLesson && persistence ? (
          <PintaLesson
            key={pintaVersion}
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
            {pinta.enviado(submittedAt ? new Date(submittedAt).toLocaleString('pt-BR') : null)}
          </p>
          {mudouDepoisDoEnvio ? (
            <p className="sz-lesson-draft-outdated text-sm font-medium">{rascunho.mudouDesenho}</p>
          ) : null}
          {contaNote ? <p className="text-sm text-muted-foreground">{contaNote}</p> : null}
          {reviewed ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCheck className="size-4" />
              {pinta.visto}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {player?.submissionAllowedBlockIds && !player.submissionAllowedBlockIds.includes(blockId)
            ? pinta.continueDesenhando
            : pinta.paraConcluir}
        </p>
      )}

      <Dialog
        open={otherOpen}
        onClose={() => setOtherOpen(false)}
        title={rascunho.outraVersaoTitulo}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOtherOpen(false)}
              disabled={swapping}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doSwap()} disabled={swapping}>
              {swapping ? <Spinner /> : <ArrowLeftRight className="size-4" />}
              {rascunho.trazer}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{rascunho.outraVersaoExplica}</p>
        {otherNote ? <p className="mt-2 text-sm text-destructive">{otherNote}</p> : null}
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={submitted ? pinta.confirmarReenviar : pinta.confirmarEnviar}
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
          <p className="text-muted-foreground">{submitted ? pinta.vaiVerDeNovo : pinta.vaiVer}</p>
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
