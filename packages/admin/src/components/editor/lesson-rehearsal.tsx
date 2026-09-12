'use client'

import {
  evaluateLearning,
  type LearningAnswers,
  type LearningResult,
  type LessonDraftDocument,
  sectionProgressView,
} from '@sistemazero/core/learning'
import { LessonPreviewProvider } from '@sistemazero/member-shell/components/lesson-preview-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import type { LessonBlockView, LessonDetailView } from '@sistemazero/member-shell/lib/types'
import type { Project } from '@sistemazero/studio'
import { evaluateStudioSectionProject } from '@sistemazero/studio/server-project-checks'
import { Button } from '@sistemazero/ui/button'
import { type ReactNode, useRef, useState } from 'react'
import type { LessonBlockContent } from '@/lib/types'

interface RehearsalState {
  answers: Record<string, LearningAnswers>
  hintsUsed: Record<string, number>
  results: Record<string, LearningResult>
  completedBlocks: Set<string>
  completedProjects: Set<string>
  fixtures: Set<string>
  workspaces: Record<string, Project>
}
const empty = (): RehearsalState => ({
  answers: {},
  hintsUsed: {},
  results: {},
  completedBlocks: new Set(),
  completedProjects: new Set(),
  fixtures: new Set(),
  workspaces: {},
})

/** Local-only rehearsal. Native discoveries, quiz and project structure use production evaluators.
 * Explicit fixtures stand in for actions requiring a real account or an external submission. */
export function LessonRehearsal({
  lesson,
  document,
  renderBlocks,
}: {
  lesson: LessonDetailView
  document: LessonDraftDocument<LessonBlockContent>
  renderBlocks: (blocks: LessonBlockView[]) => ReactNode
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
  const completed = new Set<string>()
  const pending = new Map<string, string[]>()
  for (const s of document.sections) {
    const missing: string[] = []
    for (const id of s.completion?.blockIds ?? [])
      if (!state.completedBlocks.has(id)) missing.push('Realize a atividade desta seção.')
    if (s.completion?.projectChecks?.length && !state.completedProjects.has(s.id))
      missing.push('Confira o objetivo no projeto desta seção.')
    if (s.completion?.platformAction && !state.fixtures.has(s.id))
      missing.push('Verifique a ação da plataforma.')
    if (
      !s.completion ||
      (!s.completion.blockIds.length &&
        !s.completion.projectChecks?.length &&
        !s.completion.platformAction)
    )
      missing.push('Configure um critério de conclusão na autoria.')
    if (missing.length === 0) completed.add(s.id)
    pending.set(s.id, [...new Set(missing)])
  }
  const progress = sectionProgressView('local-rehearsal', document.sections, completed, pending)
  function confirm() {
    if (failRef.current) {
      failRef.current = false
      setFailNext(false)
      throw new Error(
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
          onWorkspaceChange: (blockId, project) =>
            setState((s) => ({ ...s, workspaces: { ...s.workspaces, [blockId]: project } })),
          onProjectCheck: async (blockId, project) => {
            confirm()
            if (
              !section ||
              section.workspaceBlockId !== blockId ||
              !section.completion?.projectChecks?.length
            )
              return 'Esta seção não tem um objetivo estrutural para conferir.'
            const checks = evaluateStudioSectionProject(section.completion.projectChecks, project)
            if (checks.every((c) => c.passed))
              setState((s) => ({
                ...s,
                completedProjects: new Set([...s.completedProjects, section.id]),
              }))
            return checks.map((c) => `${c.passed ? 'Cumprido' : 'Falta'}: ${c.label}`).join('\n')
          },
        }}
      >
        <LessonSections
          key={epoch}
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
      </LessonPreviewProvider>
    </div>
  )
}
