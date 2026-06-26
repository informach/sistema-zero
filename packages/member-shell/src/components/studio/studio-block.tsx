'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioHandle, StudioShareAdapter } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2, Maximize2, Minimize2, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { StudioBlock, StudioStateView, StudioSubmissionResultView } from '../../lib/types'
import { useLessonPlayer } from '../lesson-player-context'

interface Props {
  blockId: string
  content: StudioBlock
  /** Estado da entrega vindo do GET da aula (já enviou? quando?). */
  studioState: StudioStateView | null
  /**
   * Liga o botão "Compartilhar" (publicar no Mural) na Topbar do editor. Só o app
   * KIDS passa `true` (o Mural é da vitrine kids); a elegibilidade real é do backend
   * (o publish 409 quando o bloco não é de vitrine). Default OFF.
   */
  enableShare?: boolean
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
export function StudioBlockView({ blockId, content, studioState, enableShare }: Props) {
  const player = useLessonPlayer()
  const lessonId = player?.lessonId ?? ''
  // Id estável por bloco — o autosave local retoma o WIP no mesmo navegador.
  const projectId = `sz-lesson-studio:${blockId}`

  const [StudioLesson, setStudioLesson] = useState<StudioComponent | null>(null)
  const [seed, setSeed] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(studioState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(studioState?.submittedAt ?? null)
  const [score, setScore] = useState<number | null>(studioState?.lastScore ?? null)
  const [passed, setPassed] = useState<boolean>(studioState?.passed ?? false)
  const [xp, setXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  // Confirmação antes de enviar: o envio destrava/regrava a entrega no professor —
  // um clique sem querer mandava um projeto vazio (relatado pela usuária).
  const [confirmOpen, setConfirmOpen] = useState(false)

  const activity = content.activity
  const passingScore = activity?.passingScore

  const handleRef = useRef<StudioHandle | null>(null)

  // Client-only: carrega o editor e semeia na ordem rascunho LOCAL → carryover da
  // aula contínua anterior → projeto inicial do admin. Semear DEPOIS do read evita
  // re-hidratar por cima do WIP.
  useEffect(() => {
    let active = true
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
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
      // 2) Projeto contínuo (cadeia) e sem rascunho local: semeia do que o aluno
      //    enviou na aula contínua anterior. Lazy + best-effort: falha de rede NÃO
      //    trava o editor (cai no initialProject).
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
      // 3) 1ª da cadeia / não enviou ainda / aula independente → template do bloco.
      setSeed({ ...(content.initialProject as Project), id: projectId })
    })()
    return () => {
      active = false
    }
  }, [projectId, content.initialProject, content.chain, lessonId, blockId])

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

  // (O editor relayouta sozinho ao mudar de tamanho — BlocklyPanel/MonacoTabs têm
  // ResizeObserver no container; não precisa disparar resize manual.)
  const toggleExpanded = useCallback(() => setExpanded((v) => !v), [])

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
      const res = await apiSend<StudioSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
        'POST',
        activity ? { project, results } : { project },
      )
      setSubmitted(true)
      setSubmittedAt(res.submittedAt)
      if (res.score !== undefined) setScore(res.score)
      if (res.passed !== undefined) setPassed(res.passed)
      setXp(res.gamification?.xpAwarded ?? null)
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
  }, [lessonId, blockId, player, activity])

  // Adapter de COMPARTILHAR (Mural) — só no kids (`enableShare`). O Studio o LATCHA
  // uma vez, então memoizamos por (lessonId, blockId): I/O do servidor vive aqui, a
  // UX no editor. `generateDescription` manda só os 3 arquivos (sem assets); `publish`
  // sobe o projeto inteiro + print por multipart e devolve os links.
  const share = useMemo<StudioShareAdapter | undefined>(() => {
    if (!enableShare || !lessonId) return undefined
    return {
      async generateDescription({ project, title }) {
        try {
          const res = await apiSend<{ description?: string }>('/api/studio/describe', 'POST', {
            files: {
              html: project.files['index.html'],
              css: project.files['style.css'],
              js: project.files['script.js'],
            },
            title,
          })
          return res.description ?? ''
        } catch {
          return '' // fail-soft: a criança escreve do zero
        }
      },
      async publish({ project, coverDataUrl, title, description }) {
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
          const blob = await (await fetch(coverDataUrl)).blob()
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
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
    }
  }, [enableShare, lessonId, blockId])

  const ready = StudioLesson !== null && seed !== null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        // Expandido: vira overlay em tela cheia por CSS (cobre a página; navbar = z-40).
        // O cabeçalho com "Reduzir" fica DENTRO do overlay → sempre clicável; menus/
        // diálogos portalados (z-50, depois no DOM) seguem por cima.
        expanded && 'fixed inset-0 z-50 rounded-none',
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
          // Expandido: o editor cresce e ocupa todo o overlay; normal: altura fixa.
          expanded ? 'min-h-0 flex-1' : 'h-[44rem]',
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
            features={{ extensions: false }}
            share={share}
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
        <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
          <CheckCircle2 className="size-4" />
          Projeto enviado ao professor
          {submittedAt ? ` em ${new Date(submittedAt).toLocaleString('pt-BR')}` : ''}.
        </p>
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
      </Dialog>
    </div>
  )
}
