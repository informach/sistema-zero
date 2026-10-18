'use client'

import {
  evaluateLearning,
  isExecutionRule,
  type LearningAnswers,
  type LearningResult,
  type LessonDraftDocument,
  type SectionPendingItem,
  sectionProgressView,
} from '@sistemazero/core/learning'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonPreviewProvider } from '@sistemazero/member-shell/components/lesson-preview-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { ADULT_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import type { LessonBlockView, LessonDetailView } from '@sistemazero/member-shell/lib/types'
import type { EditableStudioProject } from '@sistemazero/studio'
import { evaluateStudioSectionProject } from '@sistemazero/studio/server-project-checks'
import { Button } from '@sistemazero/ui/button'
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LessonBlockContent } from '@/lib/types'

interface RehearsalState {
  answers: Record<string, LearningAnswers>
  hintsUsed: Record<string, number>
  results: Record<string, LearningResult>
  completedBlocks: Set<string>
  completedProjects: Set<string>
  fixtures: Set<string>
  workspaces: Record<string, EditableStudioProject>
  workspaceRevisions: Record<string, string>
}
/**
 * A falha que o botão "Falhar na próxima confirmação" simula. Leva `code` como um erro do
 * servidor: sem ele o `erroDoServidor` do player trata o erro como falha de rede e mostra a frase
 * padrão do componente, e o professor não leria a falha que pediu.
 */
class FalhaSimulada extends Error {
  readonly code = 'ENSAIO_FALHA_SIMULADA'
}

const empty = (): RehearsalState => ({
  answers: {},
  hintsUsed: {},
  results: {},
  completedBlocks: new Set(),
  completedProjects: new Set(),
  fixtures: new Set(),
  workspaces: {},
  workspaceRevisions: {},
})

/** Local-only rehearsal. Native discoveries, quiz and project structure use production evaluators.
 * Explicit fixtures stand in for actions requiring a real account or an external submission. */
export function LessonRehearsal({
  lesson,
  document,
  renderBlocks,
  kids,
  authorId,
  draftRevision,
}: {
  lesson: LessonDetailView
  document: LessonDraftDocument<LessonBlockContent>
  renderBlocks: (blocks: LessonBlockView[]) => ReactNode
  /**
   * Curso infantil: o ensaio tem que montar a aula como a CRIANÇA vai ver. Desde
   * 13/09/2026 os dois layouts divergem de verdade (no kids a barra "O que falta
   * para concluir / Índice da aula" não existe e o índice mora no cabeçalho da
   * seção), então ensaiar sem isto mostraria ao professor uma tela que ninguém tem.
   * ⚠️ O admin não carrega o CSS do kids: aqui sai a ESTRUTURA certa, sem a pele.
   */
  kids?: boolean
  authorId?: string
  draftRevision?: string
}) {
  const [state, setState] = useState(empty)
  const [epoch, setEpoch] = useState(0)
  const [sectionId, setSectionId] = useState(document.sections[0]?.id ?? '')
  const [failNext, setFailNext] = useState(false)
  const failRef = useRef(false)
  const [status, setStatus] = useState(
    'Comece pela primeira seção. As seguintes respeitam seus critérios.',
  )
  const section = document.sections.find((s) => s.id === sectionId)
  const context = useMemo(
    () => ({ document, sectionId, epoch, draftRevision, authorId, lessonId: lesson.id }),
    [document, sectionId, epoch, draftRevision, authorId, lesson.id],
  )
  const inspection = useRef<{
    controller: AbortController
    blockId: string
    project: string
    context: typeof context
  } | null>(null)
  const currentContext = useRef(context)
  currentContext.current = context
  useLayoutEffect(
    () => () => {
      if (inspection.current?.context === context) inspection.current.controller.abort()
    },
    [context],
  )
  const completed = new Set<string>()
  // Itens TIPADOS (30/09/2026), como o members manda: a faixa "o que falta para seguir" do
  // rodapé escolhe o ícone pelo `kind`, e o ensaio mostra ao professor a mesma faixa (com os
  // textos DO ENSAIO: o ensaio não passa pelo `lessonCompletionRequirements` do members).
  const pending = new Map<string, SectionPendingItem[]>()
  for (const s of document.sections) {
    const missing: SectionPendingItem[] = []
    for (const id of s.completion?.blockIds ?? [])
      if (!state.completedBlocks.has(id))
        missing.push({
          kind: 'LEARNING_GATE_INCOMPLETE',
          text: kids ? 'Termine o que esta parte pede' : 'Realize a atividade desta seção',
        })
    if (s.completion?.projectChecks?.length && !state.completedProjects.has(s.id))
      missing.push({
        kind: 'project-check',
        text: kids
          ? 'Confira o objetivo desta parte no seu projeto'
          : 'Confira o objetivo no projeto desta seção',
      })
    if (s.completion?.platformAction && !state.fixtures.has(s.id))
      missing.push({ kind: 'platform-action', text: 'Verifique a ação da plataforma' })
    if (
      !s.completion ||
      (!s.completion.blockIds.length &&
        !s.completion.projectChecks?.length &&
        !s.completion.platformAction &&
        !s.completion.submissionUpToDate)
    )
      missing.push({ kind: 'authoring', text: 'Configure um critério de conclusão na autoria' })
    if (missing.length === 0) completed.add(s.id)
    const vistos = new Set<string>()
    pending.set(
      s.id,
      missing.filter((item) => !vistos.has(item.text) && vistos.add(item.text)),
    )
  }
  const progress = sectionProgressView('local-rehearsal', document.sections, completed, pending)
  function confirm() {
    if (failRef.current) {
      failRef.current = false
      setFailNext(false)
      throw new FalhaSimulada(
        'Falha de salvamento simulada. Sua descoberta continua aqui. Tente salvar novamente.',
      )
    }
  }
  const externalBlockIds =
    section?.completion?.blockIds.filter((id) => {
      const block = lesson.blocks.find((b) => b.id === id)
      return block && ['studio', 'pinta', 'video', 'ebook'].includes(block.kind)
    }) ?? []
  const fixtureApplicable = Boolean(section?.completion?.platformAction || externalBlockIds.length)
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="font-semibold">Ensaio como aluno de teste · somente neste navegador</p>
        <p className="text-sm text-muted-foreground">
          Experimente as cenas e o projeto. O quiz e a checagem estrutural usam os mesmos
          avaliadores. Entrega, vídeo, material e ações externas usam os exemplos de confirmação
          abaixo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setState(empty())
              setSectionId(document.sections[0]?.id ?? '')
              setEpoch((n) => n + 1)
              setStatus('Ensaio voltou ao estado inicial.')
              failRef.current = false
              setFailNext(false)
            }}
          >
            Estado inicial
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEpoch((n) => n + 1)
              setStatus(
                'Retomada: respostas e o mesmo projeto foram recuperados da memória do ensaio.',
              )
            }}
          >
            Ensaiar retomada
          </Button>
          <Button
            variant={failNext ? 'default' : 'outline'}
            aria-pressed={failNext}
            onClick={() => {
              failRef.current = !failNext
              setFailNext(!failNext)
            }}
          >
            Falhar na próxima confirmação
          </Button>
          {fixtureApplicable && (
            <Button
              variant="outline"
              onClick={() => {
                try {
                  confirm()
                  if (section)
                    setState((s) => ({
                      ...s,
                      completedBlocks: new Set([...s.completedBlocks, ...externalBlockIds]),
                      fixtures: section.completion?.platformAction
                        ? new Set([...s.fixtures, section.id])
                        : s.fixtures,
                    }))
                  setStatus('Exemplo local de confirmação aplicado. Nada foi enviado ou publicado.')
                } catch (error) {
                  setStatus(error instanceof Error ? error.message : 'Falha no ensaio.')
                }
              }}
            >
              Simular confirmação da ação externa
            </Button>
          )}
        </div>
        <p role="status" className="text-sm">
          {status}
        </p>
      </div>
      <LessonPreviewProvider
        value={{
          ...state,
          onChange: (blockId, answers, hintsUsed) =>
            setState((s) => ({
              ...s,
              answers: { ...s.answers, [blockId]: answers },
              hintsUsed: { ...s.hintsUsed, [blockId]: hintsUsed },
            })),
          onAttempt: async (blockId, content, answers) => {
            confirm()
            const result = evaluateLearning(content, answers)
            setState((s) => ({
              ...s,
              results: { ...s.results, [blockId]: result },
              completedBlocks: result.passed
                ? new Set([...s.completedBlocks, blockId])
                : s.completedBlocks,
            }))
            return result
          },
          onQuiz: async (blockId, grade) => {
            confirm()
            if (grade.passed)
              setState((s) => ({ ...s, completedBlocks: new Set([...s.completedBlocks, blockId]) }))
          },
          onWorkspaceChange: (blockId, project, draftRevision) => {
            if (
              inspection.current?.blockId === blockId &&
              inspection.current.project !== JSON.stringify(project)
            )
              inspection.current.controller.abort()
            setState((s) => ({
              ...s,
              workspaces: { ...s.workspaces, [blockId]: project },
              workspaceRevisions: draftRevision
                ? { ...s.workspaceRevisions, [blockId]: draftRevision }
                : s.workspaceRevisions,
              completedProjects: new Set(
                [...s.completedProjects].filter(
                  (id) =>
                    !document.sections.some(
                      (section) => section.id === id && section.workspaceBlockId === blockId,
                    ),
                ),
              ),
            }))
          },
          onProjectCheck: async (blockId, project) => {
            if (currentContext.current !== context)
              throw new DOMException('O ensaio ou o rascunho mudou.', 'AbortError')
            confirm()
            if (
              !section ||
              section.workspaceBlockId !== blockId ||
              !section.completion?.projectChecks?.length
            )
              return 'Esta seção não tem um objetivo estrutural para conferir.'
            const criteria = section.completion.projectChecks
            let checks: { checkId: string; label: string; passed: boolean }[]
            if (criteria.some((criterion) => criterion.programmingLanguage === 'python')) {
              if (!authorId || !draftRevision)
                throw new Error('Salve o rascunho antes de conferir os objetivos Python.')
              if (criteria.some((criterion) => criterion.programmingLanguage !== 'python'))
                throw new Error('Os objetivos precisam usar a mesma linguagem do projeto.')
              inspection.current?.controller.abort()
              const owner = {
                controller: new AbortController(),
                blockId,
                project: JSON.stringify(project),
                context,
              }
              inspection.current = owner
              const assertCurrent = () => {
                owner.controller.signal.throwIfAborted()
                if (inspection.current !== owner || currentContext.current !== context)
                  throw new DOMException('O ensaio ou o rascunho mudou.', 'AbortError')
              }
              try {
                const { inspectPythonSectionProject } = await import(
                  '../studio/inspect-python-section-project'
                )
                assertCurrent()
                checks = await inspectPythonSectionProject({
                  project,
                  checks: criteria.filter(
                    (criterion) => criterion.programmingLanguage === 'python',
                  ),
                  scope: {
                    userId: authorId,
                    context: {
                      kind: 'authoring',
                      lessonId: lesson.id,
                      draftRevision,
                      blockId,
                      purpose: 'rehearsal',
                    },
                  },
                  signal: owner.controller.signal,
                  assertCurrent,
                })
                assertCurrent()
              } finally {
                owner.controller.abort()
                if (inspection.current === owner) inspection.current = null
              }
            } else {
              const initial = lesson.blocks.find((b) => b.id === blockId)?.content as
                | { initialProject?: unknown }
                | undefined
              checks = evaluateStudioSectionProject(
                criteria.filter((criterion) => criterion.programmingLanguage !== 'python'),
                project,
                initial?.initialProject,
              )
            }
            const required = new Set(
              criteria.filter((criterion) => !criterion.optional).map((criterion) => criterion.id),
            )
            if (
              required.size > 0 &&
              checks.filter((check) => required.has(check.checkId)).every((c) => c.passed)
            )
              setState((s) => ({
                ...s,
                completedProjects: new Set([...s.completedProjects, section.id]),
              }))
            // Os que RODAM o jogo só o executor confere: o ensaio aponta para o "Testar agora".
            const runsGame = new Set(
              section.completion.projectChecks
                .filter((c) => isExecutionRule(c.rule))
                .map((c) => c.id),
            )
            return checks
              .map((c) =>
                runsGame.has(c.checkId)
                  ? `Roda o jogo (confira no "Testar agora"): ${c.label}`
                  : `${c.passed ? 'Cumprido' : 'Falta'}: ${c.label}`,
              )
              .join('\n')
          },
        }}
      >
        {/* O ensaio existe para ver a aula como a criança vê, e desde 18/09/2026
            isso inclui o cabeçalho "aula · seção". Sem o título aqui, o professor
            conferiria uma tela que o aluno não tem. Pelo mesmo motivo, num curso kids
            a aula fala o vocabulário da criança (fase, parte, guia). */}
        <LessonCopyProvider value={kids ? KIDS_LESSON_COPY : ADULT_LESSON_COPY}>
          <LessonSections
            lessonTitle={lesson.title}
            key={epoch}
            kids={kids}
            lesson={{
              ...lesson,
              sectionProgress: progress,
              learningProgress: { sectionId, blocks: [] },
            }}
            renderBlocks={renderBlocks}
            onSectionChange={({ index }) => {
              const next = document.sections[index]
              if (next) setSectionId(next.id)
            }}
          />
        </LessonCopyProvider>
      </LessonPreviewProvider>
    </div>
  )
}
