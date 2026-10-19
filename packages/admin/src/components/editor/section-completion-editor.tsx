'use client'

import type {
  SectionCompletion,
  SectionJavaScriptProjectCheck,
  SectionObjectiveRule,
} from '@sistemazero/core/learning'
import {
  isExecutionRule,
  isPlatformAction,
  PLATFORM_ACTION_LABELS,
  PLATFORM_ACTIONS,
  PROJECT_CHECK_HINT_MAX,
  ProjectStructureAnalysisLimitError,
} from '@sistemazero/core/learning'
import { studioProTemplate } from '@sistemazero/core/studio/pro-templates'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  evaluateStudioSectionObjectives,
  kitStateFields,
  projectCheckAuthoring,
} from '@sistemazero/studio/server-project-checks'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useMemo, useRef, useState } from 'react'
import { describeExecutionRule, newExecutionRule } from '@/lib/execution-rule'
import {
  type ExecutedProjects,
  ExecutionTestRejectedError,
  executionChecksOf,
  OBJECTIVE_PROJECT_ROLES,
  type ObjectiveVerdict,
  resolveSectionObjectiveProjects,
  runExecutionTest,
  testResolvedSectionObjectives,
} from '@/lib/objectives-test'
import type { StudioAuthoringRuntimeScope } from '../studio/use-studio-authoring-runtime'
import { ExecutionRuleEditor } from './execution-rule-editor'
import { ObjectiveTools } from './objective-tools'
import { ProjectRuleEditor } from './project-rule-editor'
import { PythonSectionObjectives } from './python-section-objectives'
import { ScriptRuleEditor } from './script-rule-editor'

function newRule(type: string, isPro: boolean, isKit: boolean): SectionObjectiveRule {
  switch (type) {
    case 'behavior':
    case 'functionReturns':
    case 'script':
      return newExecutionRule(type, isPro, isKit)
    case 'usesLoop':
      return { type }
    case 'declaresVariable':
    case 'definesFunction':
    case 'callsFunction':
      return { type, name: '' }
    default:
      return { type: 'usesBlock', blockType: '' }
  }
}

/** Constante, e não `{}` a cada renderização: um objeto novo desfaria o `useMemo` do relatório. */
const NOT_EXECUTED: ExecutedProjects = {}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function verdictLabel(verdict: ObjectiveVerdict, none: string, running: boolean): string {
  if (verdict === null) return none
  if (verdict === 'pending') return running ? 'testando…' : 'aperte Testar agora'
  if (verdict === 'error') return 'não deu para testar'
  if (verdict === 'inconclusive') return 'inconclusivo'
  return verdict ? 'cumpre' : 'falta'
}

export function SectionCompletionEditor({
  value,
  candidates,
  hasStudio,
  allowBlocks,
  workspace,
  sectionId,
  workspaceBlockId,
  runtimeScope,
  allowPlatformAction = true,
  allowSubmissionUpToDate = false,
  onChange,
}: {
  value: SectionCompletion
  candidates: {
    id: string
    label: string
    model?: string
    issue?: string
    files?: { id: string; label: string }[]
  }[]
  hasStudio: boolean
  allowBlocks?: string[]
  workspace?: unknown
  sectionId?: string
  workspaceBlockId?: string | null
  runtimeScope?: StudioAuthoringRuntimeScope
  allowPlatformAction?: boolean
  /** A seção trabalha num Estúdio ou Pinta incorporado (não a galeria): o "envio em dia" cabe. */
  allowSubmissionUpToDate?: boolean
  onChange: (value: SectionCompletion) => void
}) {
  const allChecks = value.projectChecks ?? []
  const initialProject = record(workspace) ? workspace.initialProject : undefined
  const python = record(initialProject) && initialProject.programmingLanguage === 'python'
  const parsedProject = useMemo(
    () => (python ? StudioProjectDocumentSchema.safeParse(initialProject) : null),
    [python, initialProject],
  )
  const pythonProfile =
    parsedProject?.success && parsedProject.data.programmingLanguage === 'python'
      ? parsedProject.data.runtime.profileId
      : null
  const pythonChecks = useMemo(
    () => allChecks.filter((check) => check.programmingLanguage === 'python'),
    [allChecks],
  )
  const checks = useMemo(
    () => allChecks.filter((check) => check.programmingLanguage !== 'python'),
    [allChecks],
  )
  const mismatched = allChecks.some(
    (check) =>
      (check.programmingLanguage === 'python') !== python ||
      (check.programmingLanguage === 'python' && check.profileId !== pythonProfile),
  )
  const [expandedChecks, setExpandedChecks] = useState<string[]>([])
  const fallbackAllowBlocks = workspace === undefined ? allowBlocks : undefined
  // Projeto Pro não tem blocos: os objetivos são as ideias de programação, lidas no código.
  const isPro =
    typeof workspace === 'object' &&
    workspace !== null &&
    'initialProject' in workspace &&
    typeof workspace.initialProject === 'object' &&
    workspace.initialProject !== null &&
    'kind' in workspace.initialProject &&
    workspace.initialProject.kind === 'pro'
  const proTemplateId =
    isPro && typeof workspace === 'object' && workspace !== null && 'initialProject' in workspace
      ? (workspace.initialProject as { proMeta?: { templateId?: unknown } }).proMeta?.templateId
      : undefined
  const isKit = Boolean(studioProTemplate(proTemplateId)?.kitVersion)
  // A Ponte liberada (ou nenhum modo restrito): os modelos de código cabem no clássico.
  const allowedModes =
    typeof workspace === 'object' && workspace !== null && 'allowedModes' in workspace
      ? workspace.allowedModes
      : undefined
  const bridge =
    !Array.isArray(allowedModes) || allowedModes.length === 0 || allowedModes.includes('bridge')
  const authoring = useMemo(
    () => projectCheckAuthoring(workspace ?? { allowBlocks: fallbackAllowBlocks }),
    [workspace, fallbackAllowBlocks],
  )
  const [simulationProject, setSimulationProject] = useState<unknown>(null)
  const [simulationMessage, setSimulationMessage] = useState('')
  const simulationRequest = useRef(0)
  const simulationLifetime = useRef<AbortController | null>(null)
  const criteriaKey = JSON.stringify(allChecks)
  const scopeKey = JSON.stringify(runtimeScope)
  const simulationContext = useRef({
    criteria: criteriaKey,
    initialProject,
    scope: scopeKey,
  })
  simulationContext.current = {
    criteria: criteriaKey,
    initialProject,
    scope: scopeKey,
  }
  const simulationOwner = useRef<typeof simulationContext.current | null>(null)
  useEffect(
    () => () => {
      const owner = simulationOwner.current
      if (
        owner?.criteria !== criteriaKey ||
        owner.initialProject !== initialProject ||
        owner.scope !== scopeKey
      )
        return
      simulationRequest.current++
      simulationLifetime.current?.abort()
    },
    [criteriaKey, initialProject, scopeKey],
  )
  const simulation = (() => {
    if (python)
      return simulationOwner.current === simulationContext.current
        ? simulationMessage
        : simulationOwner.current?.criteria === simulationContext.current.criteria &&
            simulationOwner.current?.initialProject === initialProject &&
            simulationOwner.current?.scope === simulationContext.current.scope
          ? simulationMessage
          : ''
    if (mismatched || simulationProject === null) return simulationMessage
    try {
      return evaluateStudioSectionObjectives(
        checks,
        simulationProject,
        typeof workspace === 'object' && workspace !== null && 'initialProject' in workspace
          ? workspace.initialProject
          : undefined,
      )
        .results.map((result, index) => {
          const check = checks.find((c) => c.id === result.checkId)
          const name = check?.label.trim() || `Objetivo ${index + 1}`
          if (check && isExecutionRule(check.rule))
            return `Roda o jogo (use "Testar agora"): ${name}`
          return `${result.passed ? 'Cumprido' : 'Falta'}: ${name}${result.optional ? ' (extra)' : ''}`
        })
        .join('\n')
    } catch (error) {
      if (error instanceof ProjectStructureAnalysisLimitError) return error.message
      throw error
    }
  })()
  // Structure updates immediately. Execution belongs to one captured part/revision/context.
  const [tested, setTested] = useState(false)
  const references = useMemo(
    () => resolveSectionObjectiveProjects(workspace, sectionId),
    [workspace, sectionId],
  )
  const executionOwner = useMemo(
    () => ({ sectionId, workspaceBlockId, references, criteriaKey, scopeKey }),
    [sectionId, workspaceBlockId, references, criteriaKey, scopeKey],
  )
  const latestExecutionOwner = useRef(executionOwner)
  latestExecutionOwner.current = executionOwner
  const executionLifetime = useRef<{
    owner: typeof executionOwner
    controller: AbortController
  } | null>(null)
  const [run, setRun] = useState<{
    owner: typeof executionOwner
    executed: ExecutedProjects
  } | null>(null)
  useEffect(
    () => () => {
      if (executionLifetime.current?.owner === executionOwner)
        executionLifetime.current.controller.abort()
    },
    [executionOwner],
  )
  const runCurrent = run?.owner === executionOwner
  const executed: ExecutedProjects = runCurrent && run ? run.executed : NOT_EXECUTED
  const running = runCurrent && OBJECTIVE_PROJECT_ROLES.some((role) => executed[role] === 'pending')
  const report = useMemo(
    () => (tested ? testResolvedSectionObjectives(checks, references, executed) : null),
    [tested, checks, references, executed],
  )
  const runExecution = () => {
    const execution = executionChecksOf(checks)
    executionLifetime.current?.controller.abort()
    if (!execution.length || references.problems.length) return
    const controller = new AbortController()
    const owner = executionOwner
    executionLifetime.current = { owner, controller }
    // Queueing the three roles must not observe a later mutation of the editor's objects.
    const projects = structuredClone(references)
    const capturedChecks = structuredClone(checks)
    const executedNow: ExecutedProjects = {}
    const syncing = (project: unknown) => record(project) && project.bridgeCodeAhead === true
    for (const role of OBJECTIVE_PROJECT_ROLES)
      if (projects[role] != null && !syncing(projects[role]) && !syncing(projects.initial))
        executedNow[role] = 'pending'
    const current = () => !controller.signal.aborted && latestExecutionOwner.current === owner
    setRun({ owner, executed: { ...executedNow } })
    // Keep one executor request in flight; checkpoints do not create three parallel games.
    void (async () => {
      for (const role of OBJECTIVE_PROJECT_ROLES) {
        if (!current()) return
        if (executedNow[role] !== 'pending') continue
        try {
          executedNow[role] = await runExecutionTest(
            projects[role],
            capturedChecks,
            fetch,
            projects.initial,
            controller.signal,
          )
        } catch (error) {
          if (!current()) return
          executedNow[role] =
            error instanceof ExecutionTestRejectedError ? { rejected: error.message } : 'error'
        }
        if (current()) setRun({ owner, executed: { ...executedNow } })
      }
    })()
  }
  const patchCheck = (
    id: string,
    change: (check: SectionJavaScriptProjectCheck) => SectionJavaScriptProjectCheck,
  ) => onChange({ ...value, projectChecks: checks.map((c) => (c.id === id ? change(c) : c)) })
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-2 font-medium">Para liberar a próxima seção</legend>
      <p className="font-medium">O que o aluno precisa demonstrar para continuar?</p>
      <p className="text-sm text-muted-foreground">
        Marque exatamente o que precisa acontecer nesta seção. Se escolher vídeo e arquivos, o aluno
        terá de assistir ao vídeo e baixar os arquivos selecionados para avançar.
      </p>
      <label className="block space-y-2 text-sm">
        <span>Realizar uma ação na plataforma</span>
        <Select
          value={value.platformAction ?? ''}
          onChange={(event) => {
            const action = event.target.value
            if (isPlatformAction(action))
              onChange({ version: 1, blockIds: [], platformAction: action })
            else {
              const { platformAction: _action, ...criteria } = value
              onChange(criteria)
            }
          }}
        >
          <option value="">Usar atividades desta seção</option>
          {PLATFORM_ACTIONS.map((action) => (
            <option
              key={action}
              value={action}
              disabled={!allowPlatformAction && value.platformAction !== action}
            >
              {PLATFORM_ACTION_LABELS[action]}
            </option>
          ))}
        </Select>
        {!allowPlatformAction && !value.platformAction && (
          <span className="block text-xs text-muted-foreground">
            Ações de perfil precisam de uma seção sem ferramenta associada e fora de Material do
            curso.
          </span>
        )}
        {value.platformAction && (
          <span className="block text-muted-foreground">
            O botão “Verificar minha ação” consulta o que o perfil salvou. Uma personalização
            anterior também vale. Abrir a tela ou salvar o padrão não conclui a etapa.
          </span>
        )}
      </label>
      {candidates.length === 0 && !value.platformAction && (
        <p className="text-sm">
          Adicione um vídeo, Livro 3D, arquivo para baixar ou atividade verificável para escolher o
          critério.
        </p>
      )}
      {!value.platformAction &&
        candidates.map((c) => (
          <div key={c.id} className="space-y-1">
            {c.files ? (
              <div className="space-y-1 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {c.model}: {c.label}
                </p>
                {c.files.map((file) => {
                  const selected =
                    value.materialItems?.find((entry) => entry.blockId === c.id)?.itemIds ?? []
                  return (
                    <label key={file.id} className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(file.id)}
                        disabled={Boolean(c.issue) && !selected.includes(file.id)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...selected, file.id]
                            : selected.filter((id) => id !== file.id)
                          onChange({
                            ...value,
                            blockIds: next.length
                              ? [...new Set([...value.blockIds, c.id])]
                              : value.blockIds.filter((id) => id !== c.id),
                            materialItems: [
                              ...(value.materialItems ?? []).filter(
                                (entry) => entry.blockId !== c.id,
                              ),
                              ...(next.length ? [{ blockId: c.id, itemIds: next }] : []),
                            ],
                          })
                        }}
                      />
                      <span>Exigir download: {file.label}</span>
                    </label>
                  )
                })}
                {c.issue && <p className="text-xs text-destructive">{c.issue}</p>}
              </div>
            ) : (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={value.blockIds.includes(c.id)}
                  disabled={Boolean(c.issue) && !value.blockIds.includes(c.id)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      blockIds: e.target.checked
                        ? [...value.blockIds, c.id]
                        : value.blockIds.filter((id) => id !== c.id),
                    })
                  }
                />
                <span>
                  {c.model ? `${c.model}: ` : ''}
                  {c.label}
                  {c.issue && <span className="block text-xs text-destructive">{c.issue}</span>}
                </span>
              </label>
            )}
          </div>
        ))}
      {mismatched && (
        <div role="alert" className="space-y-2 text-sm">
          <p>
            Os objetivos guardados pertencem a outro ambiente. Limpe-os para configurar os objetivos
            deste projeto.
          </p>
          <Button variant="outline" onClick={() => onChange({ ...value, projectChecks: [] })}>
            Limpar objetivos de outro ambiente
          </Button>
        </div>
      )}
      {python && !mismatched && (
        <PythonSectionObjectives
          checks={pythonChecks}
          onChange={(projectChecks) => onChange({ ...value, projectChecks })}
        />
      )}
      {!python &&
        !mismatched &&
        checks.map((check, index) => (
          <div key={check.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span>{check.label || `Objetivo ${index + 1} · falta preencher`}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      check.optional
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {check.optional ? 'Desafio extra' : 'Obrigatório'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {isExecutionRule(check.rule)
                    ? describeExecutionRule(check.rule)
                    : check.rule.type === 'usesBlock'
                      ? `Conferir bloco ${check.rule.blockType || '(escolher bloco)'}`
                      : check.rule.type === 'usesLoop'
                        ? 'Usar repetição'
                        : `${({ declaresVariable: 'Criar variável', definesFunction: 'Definir função', callsFunction: 'Chamar função' } as const)[check.rule.type]}: ${check.rule.name || '(definir nome)'}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={expandedChecks.includes(check.id)}
                aria-controls={`check-editor-${check.id}`}
                onClick={() =>
                  setExpandedChecks((ids) =>
                    ids.includes(check.id)
                      ? ids.filter((id) => id !== check.id)
                      : [...ids, check.id],
                  )
                }
              >
                {expandedChecks.includes(check.id) ? 'Recolher objetivo' : 'Editar objetivo'}
              </Button>
            </div>
            <div
              id={`check-editor-${check.id}`}
              hidden={!expandedChecks.includes(check.id)}
              className="space-y-3"
            >
              <Input
                aria-label={`Objetivo ${index + 1}`}
                placeholder="Objetivo que o aluno deve cumprir"
                value={check.label}
                maxLength={200}
                onChange={(e) => patchCheck(check.id, (c) => ({ ...c, label: e.target.value }))}
              />
              <label className="block space-y-1 text-sm">
                <span>Dica (aparece só depois de verificar e não passar)</span>
                <Input
                  aria-label={`Dica do objetivo ${index + 1}`}
                  placeholder="Ex.: procure o bloco na gaveta Laços"
                  value={check.hint ?? ''}
                  maxLength={PROJECT_CHECK_HINT_MAX}
                  onChange={(e) =>
                    patchCheck(check.id, (c) => {
                      const { hint: _hint, ...rest } = c
                      return e.target.value ? { ...rest, hint: e.target.value } : rest
                    })
                  }
                />
              </label>
              <label className="flex min-h-11 items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={check.optional === true}
                  onChange={(e) =>
                    patchCheck(check.id, (c) => {
                      const { optional: _optional, ...rest } = c
                      return e.target.checked ? { ...rest, optional: true } : rest
                    })
                  }
                />
                <span>
                  <span className="font-medium">Desafio extra</span>
                  <span className="block text-muted-foreground">
                    Não tranca a parte. Cumprido, vale 5 XP uma vez (sem moedas).
                  </span>
                </span>
              </label>
              <Select
                aria-label={`Regra do objetivo ${index + 1}`}
                value={check.rule.type}
                onChange={(e) =>
                  onChange({
                    ...value,
                    projectChecks: checks.map((c) =>
                      c.id === check.id ? { ...c, rule: newRule(e.target.value, isPro, isKit) } : c,
                    ),
                  })
                }
              >
                <option value="usesBlock" disabled={isPro && check.rule.type !== 'usesBlock'}>
                  Usar um bloco
                </option>
                <option value="usesLoop">Usar repetição</option>
                <option value="declaresVariable">Criar variável</option>
                <option value="definesFunction">Definir função</option>
                <option value="callsFunction">Chamar função</option>
                <option value="behavior">O jogo faz algo (roda o jogo)</option>
                <option value="functionReturns">A função responde certo (roda a função)</option>
                <option value="script">Regra em JavaScript (para quem programa)</option>
              </Select>
              {check.rule.type === 'script' && (
                <ScriptRuleEditor
                  rule={check.rule}
                  index={index}
                  isPro={isPro}
                  isKit={isKit}
                  onChange={(rule) => patchCheck(check.id, (c) => ({ ...c, rule }))}
                />
              )}
              {isExecutionRule(check.rule) && check.rule.type !== 'script' && (
                <ExecutionRuleEditor
                  rule={check.rule}
                  index={index}
                  isPro={isPro}
                  isKit={isKit}
                  kitFields={kitStateFields(proTemplateId)}
                  onChange={(rule) => patchCheck(check.id, (c) => ({ ...c, rule }))}
                />
              )}
              {check.rule.type === 'usesBlock' && (
                <ProjectRuleEditor
                  rule={check.rule}
                  allowBlocks={allowBlocks}
                  workspace={workspace}
                  onChange={(rule) =>
                    onChange({
                      ...value,
                      projectChecks: checks.map((c) => (c.id === check.id ? { ...c, rule } : c)),
                    })
                  }
                />
              )}
              {(check.rule.type === 'declaresVariable' ||
                check.rule.type === 'definesFunction' ||
                check.rule.type === 'callsFunction') && (
                <Input
                  aria-label={`Nome esperado no objetivo ${index + 1}`}
                  maxLength={200}
                  value={check.rule.name}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      projectChecks: checks.map((c) =>
                        c.id !== check.id
                          ? c
                          : {
                              ...c,
                              rule:
                                c.rule.type === 'declaresVariable' ||
                                c.rule.type === 'definesFunction' ||
                                c.rule.type === 'callsFunction'
                                  ? { ...c.rule, name: e.target.value }
                                  : c.rule,
                            },
                      ),
                    })
                  }
                />
              )}
              {check.rule.type !== 'usesBlock' &&
                authoring.issues(check.rule).map((issue) => (
                  <p key={issue} role="alert" className="text-xs text-destructive">
                    {issue}
                  </p>
                ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...value, projectChecks: checks.filter((c) => c.id !== check.id) })
                }
              >
                Remover objetivo
              </Button>
            </div>
          </div>
        ))}
      {(allowSubmissionUpToDate || value.submissionUpToDate) && !value.platformAction && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={value.submissionUpToDate === true}
            onChange={(event) => {
              if (event.target.checked) {
                onChange({ ...value, submissionUpToDate: true })
                return
              }
              const { submissionUpToDate: _envio, ...criteria } = value
              onChange(criteria)
            }}
          />
          <span>
            <span className="font-medium">Exigir envio em dia</span>
            <span className="block text-muted-foreground">
              O aluno só avança se o último envio for igual ao projeto de agora. Mudou depois de
              enviar? Ele precisa enviar de novo. Vale quando o projeto já foi entregue numa seção
              de entrega anterior.
            </span>
          </span>
        </label>
      )}
      {hasStudio && !value.platformAction && (
        <Button
          variant="outline"
          size="sm"
          disabled={allChecks.length >= 20 || mismatched || (python && !pythonProfile)}
          onClick={() => {
            const id = crypto.randomUUID()
            setExpandedChecks((ids) => [...ids, id])
            onChange({
              ...value,
              projectChecks: [
                ...allChecks,
                ...(python && pythonProfile
                  ? [
                      {
                        id,
                        label: '',
                        programmingLanguage: 'python' as const,
                        profileId: pythonProfile,
                        rule: { type: 'usesLoop' as const },
                      },
                    ]
                  : [
                      {
                        id,
                        label: '',
                        rule: isPro
                          ? { type: 'usesLoop' as const }
                          : { type: 'usesBlock' as const, blockType: '' },
                      },
                    ]),
              ],
            })
          }}
        >
          Adicionar objetivo do Estúdio
        </Button>
      )}
      {hasStudio && !value.platformAction && !python && !mismatched && (
        <ObjectiveTools
          checks={checks}
          isPro={isPro}
          {...(isKit && typeof proTemplateId === 'string' ? { kitTemplateId: proTemplateId } : {})}
          bridge={bridge}
          issuesOf={(rule) => authoring.issues(rule)}
          onAdd={(added) => {
            setExpandedChecks((ids) => [...ids, ...added.map((check) => check.id)])
            onChange({ ...value, projectChecks: [...checks, ...added] })
          }}
        />
      )}
      {hasStudio && !value.platformAction && !python && !mismatched && checks.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            disabled={running === true}
            onClick={() => {
              setTested(true)
              runExecution()
            }}
          >
            {running ? 'Rodando o jogo…' : 'Testar agora'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Confere o projeto inicial, o exemplo de entrada (se houver) e uma solução possível desta
            parte. Pré-requisitos preparados podem estar cumpridos. Os testes de execução rodam um
            projeto por vez e levam alguns segundos.
          </p>
          {report && (
            <div role="status" className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <ul className="space-y-1">
                {report.rows.map((row) => (
                  <li key={row.id} className="space-y-1">
                    <span>
                      <span className="font-medium">{row.label}</span>
                      {row.optional ? ' (extra)' : ''}: inicial{' '}
                      {verdictLabel(row.initial, 'sem projeto', running === true)} · entrada desta
                      parte {verdictLabel(row.checkpoint, 'sem exemplo', running === true)} ·
                      gabarito {verdictLabel(row.solution, 'sem gabarito', running === true)}
                    </span>
                    {row.solutionDetail && (
                      <span className="block text-xs text-muted-foreground">
                        No gabarito: {row.solutionDetail}
                      </span>
                    )}
                    {row.screenshot && (
                      <details>
                        <summary className="cursor-pointer text-xs">Ver a tela do gabarito</summary>
                        {/* biome-ignore lint/performance/noImgElement: captura em base64, não um asset do Next */}
                        <img
                          src={`data:image/jpeg;base64,${row.screenshot}`}
                          alt={`Tela do gabarito no fim do teste de "${row.label}"`}
                          className="mt-1 max-w-full rounded border border-border"
                        />
                      </details>
                    )}
                  </li>
                ))}
              </ul>
              {report.problems.map((problem) => (
                <p key={problem} className="text-destructive">
                  {problem}
                </p>
              ))}
              {report.notes.map((note) => (
                <p key={note} className="text-muted-foreground">
                  {note}
                </p>
              ))}
              {report.problems.length === 0 &&
                report.rows.every(
                  (row) => typeof row.initial === 'boolean' && typeof row.solution === 'boolean',
                ) &&
                report.rows.every(
                  (row) => row.checkpoint === null || typeof row.checkpoint === 'boolean',
                ) && <p className="text-success-foreground">Nenhum problema nos objetivos.</p>}
            </div>
          )}
        </div>
      )}
      {allChecks.length > 0 && !mismatched && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm">Testar com outro projeto (arquivo)</summary>
          <p className="text-xs">
            Usa o mesmo avaliador da verificação. Não registra progresso nem conclui a aula.
          </p>
          <input
            type="file"
            accept=".json,.sz"
            aria-label="Projeto para simulação"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              const request = ++simulationRequest.current
              simulationLifetime.current?.abort()
              const controller = new AbortController()
              simulationLifetime.current = controller
              const owner = simulationContext.current
              simulationOwner.current = owner
              const assertCurrent = () => {
                controller.signal.throwIfAborted()
                const current = simulationContext.current
                if (
                  simulationRequest.current !== request ||
                  current.criteria !== owner.criteria ||
                  current.initialProject !== owner.initialProject ||
                  current.scope !== owner.scope
                )
                  throw new DOMException('O objetivo ou ambiente mudou.', 'AbortError')
              }
              setSimulationProject(null)
              setSimulationMessage('')
              if (!file) return
              if (file.size > 2 * 1024 * 1024) {
                setSimulationMessage('O projeto excede 2 MB.')
                return
              }
              try {
                setSimulationMessage('Lendo projeto…')
                const project: unknown = JSON.parse(await file.text())
                assertCurrent()
                if (!project || typeof project !== 'object' || Array.isArray(project))
                  throw new Error('Invalid project')
                const source = 'project' in project ? project.project : project
                if (python) {
                  if (!runtimeScope || mismatched)
                    throw new Error(
                      'Salve o rascunho e confirme o ambiente Python antes de simular.',
                    )
                  setSimulationMessage('Conferindo o código Python…')
                  const { inspectPythonSectionProject } = await import(
                    '../studio/inspect-python-section-project'
                  )
                  assertCurrent()
                  const results = await inspectPythonSectionProject({
                    project: source,
                    referenceProject: initialProject,
                    checks: pythonChecks,
                    scope: runtimeScope,
                    signal: controller.signal,
                    assertCurrent,
                  })
                  assertCurrent()
                  setSimulationMessage(
                    results
                      .map((result) => `${result.passed ? 'Cumprido' : 'Falta'}: ${result.label}`)
                      .join('\n'),
                  )
                } else {
                  if (record(source) && source.programmingLanguage === 'python')
                    throw new Error('Escolha um projeto JavaScript para estes objetivos.')
                  setSimulationProject(source)
                  setSimulationMessage('')
                }
              } catch (error) {
                if (simulationRequest.current === request && !controller.signal.aborted)
                  setSimulationMessage(
                    error instanceof Error ? error.message : 'Arquivo de projeto inválido.',
                  )
              }
            }}
          />
          {simulation && (
            <p role="status" className="whitespace-pre-line text-sm">
              {simulation}
            </p>
          )}
        </details>
      )}
    </fieldset>
  )
}
