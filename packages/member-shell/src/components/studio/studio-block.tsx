'use client'

import '@sistemazero/studio/styles.css'
import type {
  Project,
  StudioHandle,
  StudioProRuntimeAdapter,
  StudioShareAdapter,
  StudioShareResult,
} from '@sistemazero/studio'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { CheckCheck, CheckCircle2, Maximize2, Minimize2, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import { dataUrlBase64ToBlob } from '../../lib/data-url'
import { lessonStudioProjectId } from '../../lib/studio-project-id'
import type { StudioBlock, StudioStateView, StudioSubmissionResultView } from '../../lib/types'
import { useLessonPlayer } from '../lesson-player-context'

// "Compartilhar" da AULA = UMA vez só. O projeto da aula tem começo/meio/fim: a
// criança termina, publica no Mural, pronto — não fica republicando (cada republish
// hoje cria um post NOVO). Trava persistida LOCAL por (perfil, bloco) via a chave do
// projeto (sobrevive a refresh). O Estúdio Completo (projeto livre) NÃO passa por
// aqui — lá o compartilhar segue ilimitado. Guardado contra ambiente sem localStorage.
const SHARED_FLAG_PREFIX = 'sz:studio:shared:'
function readSharedFlag(projectId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SHARED_FLAG_PREFIX + projectId) === '1'
  } catch {
    return false
  }
}
function writeSharedFlag(projectId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARED_FLAG_PREFIX + projectId, '1')
  } catch {
    // Sem localStorage (modo privado): a trava vale só nesta sessão (estado em memória).
  }
}

// "Expandir" (overlay de tela cheia) é estado de VISTA efêmero, mas precisa SOBREVIVER ao
// router.refresh() que o "Enviar para o professor" dispara: o refresh re-monta o bloco (o
// servidor re-renderiza a aula com submitted:true) e um useState comum voltaria a false — a
// criança caía da tela cheia ao enviar. Guardamos por projeto num Map de MÓDULO (sobrevive ao
// refresh e à re-montagem no mesmo load; um F5 real limpa = volta ao normal). Só "Reduzir" ou
// Esc tiram da tela cheia — nunca o envio.
const expandedByProject = new Map<string, boolean>()

interface Props {
  blockId: string
  content: StudioBlock
  /** Estado da entrega vindo do GET da aula (já enviou? quando?). */
  studioState: StudioStateView | null
  /**
   * Liga o botão "Compartilhar" (publicar no Mural) na Topbar do editor. O kids passa
   * `enableShare={Boolean(content.showcase?.enabled)}` → o botão aparece SÓ no bloco da ÚLTIMA
   * aula do projeto (a vitrine), substituindo o antigo "Publicar no Mural" da `LessonCelebration`
   * (mesma ação, e o Compartilhar ainda dá descrição editável + link público de jogar). Nas aulas
   * intermediárias fica OFF (a criança não publica antes de terminar). A elegibilidade real é do
   * backend (o publish 409 se o bloco não é vitrine). Default OFF.
   */
  enableShare?: boolean
  /**
   * Chamado quando o projeto é publicado no Mural pelo "Compartilhar" (com os links). O kids usa
   * pra abrir a CELEBRAÇÃO (overlay do Zappy + "Jogar"); o `ShareDialog` fecha sem mostrar a
   * própria tela de sucesso (ver `StudioShareAdapter.onPublished`).
   */
  onShared?: (result: StudioShareResult) => void
  /**
   * Faz o editor PREENCHER a altura do pai (em vez da altura fixa) — usado no "modo
   * criação guiada" do kids (Estúdio à direita, ocupando a coluna inteira ao lado do
   * vídeo). O pai precisa ser um flex column com altura definida.
   */
  fillHeight?: boolean
}

type StudioComponent = typeof import('@sistemazero/studio')['StudioLesson']

/**
 * Bloco Estúdio: renderiza o @sistemazero/studio pré-configurado pelo admin (versão
 * LIMITADA — sem gerenciamento de projetos; terminal/IA/export OFF). O rascunho do
 * aluno persiste LOCAL (IndexedDB nativo da lib, chaveado por bloco); "Enviar para o
 * professor" sobe o MESMO JSON do "Exportar projeto" — destrava a conclusão da aula
 * (gate do backend). "Expandir" leva o editor à tela cheia para trabalhar melhor.
 *
 * Carregado SÓ no client (Monaco/Blockly/IndexedDB não existem no SSR): o import
 * dinâmico do editor roda dentro de um effect — o server renderiza só o placeholder.
 */
export function StudioBlockView({
  blockId,
  content,
  studioState,
  enableShare,
  onShared,
  fillHeight,
}: Props) {
  const player = useLessonPlayer()
  const lessonId = player?.lessonId ?? ''
  // Id estável por bloco E por PERFIL (`viewerId`): irmãos no mesmo navegador não misturam o
  // rascunho. ⚠️ Charset seguro (sem `:`): id inválido vira ULID aleatório → perde tudo no refresh.
  const projectId = lessonStudioProjectId(blockId, player?.viewerId)

  const [StudioLesson, setStudioLesson] = useState<StudioComponent | null>(null)
  const [seed, setSeed] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(studioState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(studioState?.submittedAt ?? null)
  // "Compartilhar" da aula é 1 vez só (ver helper): trava depois do 1º publish bem-sucedido.
  const [alreadyShared, setAlreadyShared] = useState<boolean>(() => readSharedFlag(projectId))
  const [score, setScore] = useState<number | null>(studioState?.lastScore ?? null)
  const [passed, setPassed] = useState<boolean>(studioState?.passed ?? false)
  // "O professor já conferiu": some ao reenviar (a versão nova ainda não foi vista).
  const [reviewed, setReviewed] = useState<boolean>(studioState?.reviewed ?? false)
  const [xp, setXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(() => expandedByProject.get(projectId) ?? false)
  // Confirmação antes de enviar: o envio destrava/regrava a entrega no professor —
  // um clique sem querer mandava um projeto vazio (relatado pela usuária).
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Recado OPCIONAL do aluno ao professor, digitado no modal de confirmação.
  const [message, setMessage] = useState('')
  const MESSAGE_MAX = 1000
  // "Sincronizar com o enviado": puxa do servidor o projeto que o aluno enviou e
  // substitui o editor (o editor semeia do rascunho LOCAL — defasa se terminou em
  // outro PC). Confirmação porque SUBSTITUI o que está aberto aqui.
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)

  const activity = content.activity
  const passingScore = activity?.passingScore
  const isProLesson = content.initialProject.kind === 'pro'

  const proRuntime = useMemo<StudioProRuntimeAdapter | undefined>(() => {
    if (!isProLesson || !player?.courseSlug || !lessonId) return undefined
    return {
      limits: STUDIO_PRO_BUILD_LIMITS,
      async build({ project, signal }) {
        const res = await fetch('/api/studio/pro-runtime/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseSlug: player.courseSlug,
            lessonId,
            blockId,
            // O BFF só precisa da árvore para compilar. Não envie assets, estado
            // clássico nem metadados fora do runtime; isso mantém o envelope sob
            // a cota que o editor e o Worker validam.
            project: { kind: 'pro', tree: project.tree },
          }),
          signal,
        })
        const body = (await res.json().catch(() => null)) as {
          html?: string
          output?: string
          durationMs?: number
          error?: { message?: string; output?: string }
        } | null
        if (!res.ok || !body?.html) {
          const error = new Error(body?.error?.message ?? 'Não foi possível compilar o projeto.') as
            | (Error & { output?: string })
            | Error
          if (body?.error?.output) (error as Error & { output?: string }).output = body.error.output
          throw error
        }
        return { html: body.html, output: body.output, durationMs: body.durationMs }
      },
    }
  }, [isProLesson, player?.courseSlug, lessonId, blockId])

  const handleRef = useRef<StudioHandle | null>(null)

  // Client-only: carrega o editor e semeia na ordem rascunho LOCAL → carryover da
  // aula contínua anterior → projeto inicial do admin. Semear DEPOIS do read evita
  // re-hidratar por cima do WIP.
  useEffect(() => {
    let active = true
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
      // A LIÇÃO usa o store LOCAL padrão (isolada por perfil pelo id do projeto). Reseta o
      // namespace caso o Estúdio Completo o tenha trocado numa visita anterior nesta sessão.
      mod.setStudioStorageNamespace('')
      setStudioLesson(() => mod.StudioLesson)
      // 1) Rascunho LOCAL sempre vence — nunca re-hidratar por cima do WIP.
      const existing = await mod
        .createLocalPersistenceAdapter()
        .load(projectId)
        .catch(() => null)
      if (!active) return
      if (existing) {
        setSeed(existing)
        return
      }
      // 2) Sem rascunho local: tenta o ENVIO no banco (save na nuvem) DESTE bloco — só se já
      //    enviou (`studioState.submitted`). É o que retoma o trabalho num navegador NOVO (o
      //    rascunho local é por aparelho; o envio é a sincronização entre eles). Lazy + best-effort.
      if (lessonId && studioState?.submitted) {
        const mine = await apiGet<{ project: unknown | null }>(
          `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
        ).catch(() => null)
        if (!active) return
        if (mine?.project) {
          setSeed({ ...(mine.project as Project), id: projectId })
          return
        }
      }
      // 3) Projeto contínuo (cadeia), sem rascunho/envio: semeia do que o aluno enviou na aula
      //    contínua anterior. Lazy + best-effort: falha de rede NÃO trava o editor.
      if (content.chain && lessonId) {
        const carry = await apiGet<{ project: unknown | null }>(
          `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-carryover`,
        ).catch(() => null)
        if (!active) return
        if (carry?.project) {
          // id estável por bloco — o autosave local desta aula grava na chave certa.
          setSeed({ ...(carry.project as Project), id: projectId })
          return
        }
      }
      // 4) 1ª da cadeia / nunca enviou / aula independente → template do bloco.
      setSeed({ ...(content.initialProject as Project), id: projectId })
    })()
    return () => {
      active = false
    }
  }, [projectId, content.initialProject, content.chain, lessonId, blockId, studioState?.submitted])

  // "Expandir" é uma SOBREPOSIÇÃO em tela cheia por CSS (não a Fullscreen API nativa): a
  // API restringe a pintura à subárvore do elemento, então menus/diálogos PORTALADOS no
  // body (três-pontinhos do editor, "Enviar?", toasts) saíam FORA da camada de tela cheia
  // → invisíveis e o clique "não fazia nada". Como overlay fixo (z-50, acima da navbegação
  // z-40), tudo isso fica por cima e o botão "Reduzir" mora no cabeçalho DENTRO do overlay.
  // Esc também fecha, mas só quando NÃO há menu/diálogo aberto (aí o Esc é deles).
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

  // Espelha o estado atual no Map de módulo → sobrevive ao router.refresh()/re-montagem do
  // envio (o initializer acima o restaura). Fonte única p/ toggle, Esc e "Reduzir".
  useEffect(() => {
    expandedByProject.set(projectId, expanded)
  }, [projectId, expanded])

  // (O editor relayouta sozinho ao mudar de tamanho — BlocklyPanel/MonacoTabs têm
  // ResizeObserver no container; não precisa disparar resize manual.)
  const toggleExpanded = useCallback(() => setExpanded((v) => !v), [])

  // Expandido = overlay `fixed`: a barra de rolagem da PÁGINA atrás dele só confunde (rola
  // mas nada se move). Trava o scroll do body enquanto expandido (refcontada com o <Dialog>,
  // p/ fechar o "Enviar?" por cima não destravar cedo e a barra fantasma não voltar).
  useBodyScrollLock(expanded)

  const submit = useCallback(async () => {
    const project = handleRef.current?.getProject()
    if (!project) return
    setSubmitting(true)
    setError(null)
    try {
      // Resultado da auto-correção rodada no editor (correção híbrida): o servidor
      // RECALCULA a estrutura e registra estes p/ comportamento/teste/código.
      const run = handleRef.current?.getActivityResult() ?? null
      const results = run
        ? run.results.map((r) => ({ checkId: r.checkId, passed: r.passed, message: r.message }))
        : undefined
      // Recado opcional ao professor (trim → omite se vazio).
      const note = message.trim()
      const res = await apiSend<StudioSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
        'POST',
        {
          project,
          ...(activity ? { results } : {}),
          ...(note ? { message: note } : {}),
        },
      )
      setSubmitted(true)
      setSubmittedAt(res.submittedAt)
      setReviewed(false) // entrega nova: o carimbo do professor não vale mais
      if (res.score !== undefined) setScore(res.score)
      if (res.passed !== undefined) setPassed(res.passed)
      setXp(res.gamification?.xpAwarded ?? null)
      setMessage('') // recado é por envio: limpa após mandar
      // Destrava o "Concluir aula" (gate do backend) → re-render da página.
      player?.refreshAfterStudio?.()
    } catch (err) {
      const apiErr = err as ApiError
      setError(
        apiErr?.code === 'PAYLOAD_TOO_LARGE'
          ? 'Seu projeto está muito grande para enviar.'
          : 'Não foi possível enviar o projeto. Tente de novo.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [lessonId, blockId, player, activity, message])

  // Abre a confirmação de "Sincronizar com o enviado" (item do menu ⋯ do Estúdio).
  // Estável (o Studio latcha este callback no mount).
  const openSync = useCallback(() => {
    setSyncNote(null)
    setSyncOpen(true)
  }, [])

  // Puxa a entrega do servidor (save na nuvem) e substitui o projeto do editor.
  const doSync = useCallback(async () => {
    setSyncing(true)
    setSyncNote(null)
    try {
      const res = await apiGet<{ project: unknown | null }>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
      )
      if (res?.project) {
        // Re-chaveia o id p/ a chave LOCAL deste bloco/perfil → o autosave grava
        // por cima do rascunho antigo (não volta a defasar no próximo open).
        handleRef.current?.replaceProject({ ...(res.project as Project), id: projectId })
        setSyncOpen(false)
      } else {
        setSyncNote('Você ainda não enviou nenhum projeto para o professor.')
      }
    } catch {
      setSyncNote('Não consegui sincronizar agora. Tente de novo.')
    } finally {
      setSyncing(false)
    }
  }, [lessonId, blockId, projectId])

  // O Studio LATCHA o adapter uma vez (memoizado por lessonId/blockId), mas `onShared` pode
  // mudar por render — lê via ref pra manter o adapter estável e ainda chamar o handler ATUAL.
  const onSharedRef = useRef(onShared)
  useEffect(() => {
    onSharedRef.current = onShared
  }, [onShared])

  // Título/resumo do post pré-definidos pelo admin (vitrine): preenchem o Compartilhar e
  // ECONOMIZAM IA — com resumo, o dialog NÃO chama a IA (abre com este texto, editável). Vazio
  // (ou no Estúdio Completo, que nem passa isso) → a IA gera o rascunho.
  const presetTitle = content.showcase?.title
  const presetDescription = content.showcase?.summary
  // Capa padrão do curso (admin): fallback do print no dialog + preview. O servidor
  // re-resolve a URL de forma autoritativa ao publicar (não confia no cliente).
  const presetCoverUrl = content.showcase?.defaultCoverUrl

  // Adapter de COMPARTILHAR (Mural) — só no kids (`enableShare`). O Studio o LATCHA
  // uma vez, então memoizamos por (lessonId, blockId): I/O do servidor vive aqui, a
  // UX no editor. ⚠️ SEM `generateDescription`: na AULA o projeto já é conhecido e o
  // admin define o resumo (`presetDescription`) — a criança só ajusta, sem IA. A IA
  // (gerar resumo) vive SÓ no Estúdio Completo (`studio-full-client`), onde o projeto
  // é livre. `publish` sobe o projeto inteiro + print por multipart e devolve os links.
  const share = useMemo<StudioShareAdapter | undefined>(() => {
    if (!enableShare || !lessonId) return undefined
    return {
      presetTitle,
      titleEditable: false,
      presetDescription,
      presetCoverUrl,
      async publish({ project, coverDataUrl, useAdminCover, title, description }) {
        const form = new FormData()
        form.set('lessonId', lessonId)
        form.set('blockId', blockId)
        form.set('description', description)
        form.set('title', title)
        form.set('clientIdempotencyKey', crypto.randomUUID())
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          // ⚠️ NÃO usar fetch(data:) — a CSP (connect-src) bloqueia → "Failed to fetch".
          const blob = dataUrlBase64ToBlob(coverDataUrl)
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        } else if (useAdminCover) {
          // Sem print/upload: o servidor usa a capa padrão do curso (resolve a URL lá).
          form.set('useDefaultCover', '1')
        }
        const res = await fetch('/api/studio/publish', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          error?: { message?: string }
        } | null
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Não foi possível publicar agora.')
        }
        return { muralUrl: body?.muralUrl, playUrl: body?.playUrl }
      },
      // Publicou: TRAVA o compartilhar da aula (1 vez só, persistido local) e entrega os
      // links ao host (kids abre a celebração); o ShareDialog fecha sozinho.
      onPublished: (result) => {
        setAlreadyShared(true)
        writeSharedFlag(projectId)
        onSharedRef.current?.(result)
      },
    }
  }, [enableShare, lessonId, blockId, projectId, presetTitle, presetDescription, presetCoverUrl])

  const ready = StudioLesson !== null && seed !== null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        // Expandido: vira overlay em tela cheia por CSS (cobre a página; navbar = z-40).
        // O cabeçalho com "Reduzir" fica DENTRO do overlay → sempre clicável; menus/
        // diálogos portalados (z-50, depois no DOM) seguem por cima.
        expanded && 'fixed inset-0 z-50 rounded-none',
        // Modo guiada: o card cresce p/ preencher a coluna (pai = flex column com altura).
        fillHeight && !expanded && 'min-h-0 flex-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="sz-display text-base">Atividade no Estúdio</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleExpanded} disabled={!ready}>
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {expanded ? 'Reduzir' : 'Expandir'}
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting || !ready}>
            {submitting ? <Spinner /> : <Send className="size-4" />}
            {submitted ? 'Reenviar ao professor' : 'Enviar para o professor'}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          // Área generosa p/ programar (a página de aula já é largura total; aqui damos
          // mais ALTURA). `isolate`: PRENDE os z-index internos do Blockly (toolbox/flyout
          // têm z-index alto e VAZAVAM por cima do overlay de modais — ex.: o "Enviar ao
          // professor?"); isolando o container, o overlay de modal (z-50) cobre tudo atrás.
          'isolate overflow-hidden rounded-lg border border-border bg-muted',
          // Expandido/guiada: o editor cresce e ocupa todo o pai; normal: altura FIXA e
          // GENEROSA (mobile 44rem; desktop 60rem = bem mais espaço pra programar). Fixo de
          // propósito: `vh` dependia da altura da janela e em notebook ficava ≈ 44rem (sem
          // mudança visível) — rem garante o aumento em qualquer tela.
          expanded || fillHeight ? 'min-h-0 flex-1' : 'h-[44rem] lg:h-[60rem]',
        )}
      >
        {ready ? (
          // StudioLesson já desliga terminal/IA/profissional/export; aqui o
          // aluno corta também as extensões (editor enxuto na aula).
          <StudioLesson
            ref={handleRef}
            initialProject={seed as Project}
            persistence="local"
            level={content.level}
            allowBlocks={content.allowBlocks}
            allowCategories={content.allowCategories}
            allowedModes={content.allowedModes}
            allowLevelReveal={content.allowLevelReveal}
            activity={content.activity}
            features={{ extensions: false, professional: isProLesson, terminal: false }}
            proRuntime={proRuntime}
            share={share}
            // O "Compartilhar" da aula: (1) só habilita DEPOIS de enviar ao professor
            // (publicar exige a entrega; o members também barra com SHOWCASE_NOT_ELIGIBLE);
            // (2) é UMA vez só — depois de publicado, trava (o projeto da aula tem fim; o
            // Estúdio Completo não usa isso e segue ilimitado). Botão VISÍVEL porém
            // desabilitado com a dica em cada caso.
            shareDisabledReason={
              share
                ? !submitted
                  ? 'Envie o projeto para o professor primeiro para poder compartilhar.'
                  : alreadyShared
                    ? 'Você já compartilhou este jogo no Mural. 🎉'
                    : undefined
                : undefined
            }
            // Item ⋯ → "Sincronizar com o enviado" (só na aula; abre a confirmação).
            onCloudSync={lessonId ? openSync : undefined}
            blockUnloadWhenDirty={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Carregando o Estúdio...
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Nota da auto-correção (quando o bloco tem atividade). O feedback POR
          checagem é instantâneo no painel do editor (botão "Verificar"). */}
      {activity && score !== null ? (
        <p className="inline-flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Sua nota: {score}/100</span>
          {passingScore !== undefined ? (
            <span className={passed ? 'text-accent dark:text-primary' : 'text-muted-foreground'}>
              {passed
                ? '· você atingiu a nota mínima'
                : `· precisa de ${passingScore} para concluir`}
            </span>
          ) : null}
          {xp ? <span className="text-accent dark:text-primary">· +{xp} XP</span> : null}
        </p>
      ) : null}

      {submitted ? (
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
            <CheckCircle2 className="size-4" />
            Projeto enviado ao professor
            {submittedAt ? ` em ${new Date(submittedAt).toLocaleString('pt-BR')}` : ''}.
          </p>
          {/* O professor carimbou "já conferi". Não é nota: é ele dizendo que viu. */}
          {reviewed ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCheck className="size-4" />O professor já conferiu sua entrega.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {passingScore !== undefined
            ? 'Use "Verificar" no editor e envie ao professor — atinja a nota mínima para concluir a aula.'
            : 'Envie seu projeto ao professor para poder concluir a aula.'}
        </p>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={submitted ? 'Reenviar ao professor?' : 'Enviar ao professor?'}
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
              {submitted ? 'Reenviar' : 'Enviar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {submitted
            ? 'O professor vai receber a versão atual do seu projeto, no lugar da anterior.'
            : 'O professor vai receber o seu projeto do jeitinho que está agora.'}{' '}
          Você pode continuar editando e enviar de novo quando quiser.
          {passingScore !== undefined
            ? ' Dica: clique em "Verificar" no editor antes, para ver se já atingiu a nota.'
            : ''}
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="studio-teacher-message" className="font-medium text-sm">
            Recado para o professor{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="studio-teacher-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            maxLength={MESSAGE_MAX}
            rows={3}
            disabled={submitting}
            placeholder="Quer contar algo pro professor sobre o seu projeto? (não é obrigatório)"
          />
        </div>
      </Dialog>

      <Dialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        title="Sincronizar com o enviado?"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncOpen(false)}
              disabled={syncing}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doSync()} disabled={syncing}>
              {syncing ? <Spinner /> : null}
              Sincronizar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Isto substitui o que você está editando aqui pelo último projeto que você enviou ao
          professor. Use se você terminou em outro computador.
        </p>
        {syncNote ? <p className="mt-2 text-sm text-destructive">{syncNote}</p> : null}
      </Dialog>
    </div>
  )
}
