'use client'

import type {
  SectionCompletion,
  SectionObjectiveRule,
  SectionProjectCheck,
} from '@sistemazero/core/learning'
import {
  isExecutionRule,
  isPlatformAction,
  PLATFORM_ACTION_LABELS,
  PLATFORM_ACTIONS,
  PROJECT_CHECK_HINT_MAX,
} from '@sistemazero/core/learning'
import { studioProTemplate } from '@sistemazero/core/studio/pro-templates'
import {
  evaluateStudioSectionObjectives,
  projectCheckAuthoring,
} from '@sistemazero/studio/server-project-checks'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useMemo, useRef, useState } from 'react'
import { describeExecutionRule, newExecutionRule } from '@/lib/execution-rule'
import {
  type ExecutedProjects,
  executionChecksOf,
  runExecutionTest,
  testSectionObjectives,
} from '@/lib/objectives-test'
import { ExecutionRuleEditor } from './execution-rule-editor'
import { ProjectRuleEditor } from './project-rule-editor'

function newRule(type: string, isPro: boolean): SectionObjectiveRule {
  switch (type) {
    case 'behavior':
    case 'functionReturns':
      return newExecutionRule(type, isPro)
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

function verdictLabel(
  verdict: boolean | null | 'pending' | 'error',
  none: string,
  running: boolean,
): string {
  if (verdict === null) return none
  if (verdict === 'pending') return running ? 'testando…' : 'aperte Testar agora'
  if (verdict === 'error') return 'não deu para testar'
  return verdict ? 'cumpre' : 'falta'
}

export function SectionCompletionEditor({
  value,
  candidates,
  hasStudio,
  allowBlocks,
  workspace,
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
  allowPlatformAction?: boolean
  /** A seção trabalha num Estúdio ou Pinta incorporado (não a galeria): o "envio em dia" cabe. */
  allowSubmissionUpToDate?: boolean
  onChange: (value: SectionCompletion) => void
}) {
  const checks = value.projectChecks ?? []
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
  const authoring = useMemo(
    () => projectCheckAuthoring(workspace ?? { allowBlocks: fallbackAllowBlocks }),
    [workspace, fallbackAllowBlocks],
  )
  const [simulationProject, setSimulationProject] = useState<unknown>(null)
  const [simulationMessage, setSimulationMessage] = useState('')
  const simulationRequest = useRef(0)
  useEffect(
    () => () => {
      simulationRequest.current++
    },
    [],
  )
  const simulation =
    simulationProject === null
      ? simulationMessage
      : evaluateStudioSectionObjectives(
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
  // O "Testar agora" fica vivo depois do primeiro clique: mexer num objetivo ou no gabarito
  // (que chega pelo autosave) atualiza o resultado na hora.
  const [tested, setTested] = useState(false)
  // Os objetivos que RODAM o jogo vão ao executor (segundos): o resultado vale para os objetivos
  // e os projetos daquele clique. Mudou algum? A linha pede um teste novo.
  const content =
    typeof workspace === 'object' && workspace !== null
      ? (workspace as Record<string, unknown>)
      : {}
  const executionKey = JSON.stringify(
    executionChecksOf(checks).map((check) => [check.id, check.rule]),
  )
  const [run, setRun] = useState<{
    key: string
    initial: unknown
    solution: unknown
    executed: ExecutedProjects
  } | null>(null)
  const runRequest = useRef(0)
  const runCurrent =
    run &&
    run.key === executionKey &&
    run.initial === content.initialProject &&
    run.solution === content.solutionProject
  const executed: ExecutedProjects = runCurrent && run ? run.executed : {}
  const running = runCurrent && (executed.initial === 'pending' || executed.solution === 'pending')
  const report = useMemo(
    () => (tested ? testSectionObjectives(checks, workspace, executed) : null),
    [tested, checks, workspace, executed],
  )
  const runExecution = () => {
    const execution = executionChecksOf(checks)
    if (!execution.length) return
    const request = ++runRequest.current
    const base = {
      key: executionKey,
      initial: content.initialProject,
      solution: content.solutionProject,
    }
    const projects = { initial: content.initialProject, solution: content.solutionProject } as const
    const executedNow: ExecutedProjects = {}
    for (const which of ['initial', 'solution'] as const)
      if (projects[which] !== undefined) executedNow[which] = 'pending'
    setRun({ ...base, executed: { ...executedNow } })
    for (const which of ['initial', 'solution'] as const) {
      if (projects[which] === undefined) continue
      runExecutionTest(projects[which], checks)
        .then((outcome) => {
          executedNow[which] = outcome
        })
        .catch(() => {
          executedNow[which] = 'error'
        })
        .finally(() => {
          if (runRequest.current === request) setRun({ ...base, executed: { ...executedNow } })
        })
    }
  }
  const patchCheck = (id: string, change: (check: SectionProjectCheck) => SectionProjectCheck) =>
    onChange({ ...value, projectChecks: checks.map((c) => (c.id === id ? change(c) : c)) })
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
      {checks.map((check, index) => (
        <div key={check.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span>{check.label || `Objetivo ${index + 1} · falta preencher`}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    check.optional ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
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
                  ids.includes(check.id) ? ids.filter((id) => id !== check.id) : [...ids, check.id],
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
                    c.id === check.id ? { ...c, rule: newRule(e.target.value, isPro) } : c,
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
            </Select>
            {isExecutionRule(check.rule) && (
              <ExecutionRuleEditor
                rule={check.rule}
                index={index}
                isPro={isPro}
                isKit={isKit}
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
          disabled={checks.length >= 20}
          onClick={() => {
            const id = crypto.randomUUID()
            setExpandedChecks((ids) => [...ids, id])
            onChange({
              ...value,
              projectChecks: [
                ...checks,
                {
                  id,
                  label: '',
                  rule: isPro ? { type: 'usesLoop' } : { type: 'usesBlock', blockType: '' },
                },
              ],
            })
          }}
        >
          Adicionar objetivo do Estúdio
        </Button>
      )}
      {hasStudio && !value.platformAction && checks.length > 0 && (
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
            Confere os objetivos no projeto inicial (deve faltar) e no gabarito (deve cumprir). Os
            que rodam o jogo levam alguns segundos.
          </p>
          {report && (
            <div role="status" className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <ul className="space-y-1">
                {report.rows.map((row) => (
                  <li key={row.id} className="space-y-1">
                    <span>
                      <span className="font-medium">{row.label}</span>
                      {row.optional ? ' (extra)' : ''}: inicial{' '}
                      {verdictLabel(row.initial, 'sem projeto', running === true)} · gabarito{' '}
                      {verdictLabel(row.solution, 'sem gabarito', running === true)}
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
              {report.problems.length === 0 && (
                <p className="text-success-foreground">Nenhum problema nos objetivos.</p>
              )}
            </div>
          )}
        </div>
      )}
      {checks.length > 0 && (
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
              setSimulationProject(null)
              setSimulationMessage('')
              if (!file) return
              if (file.size > 2 * 1024 * 1024) {
                setSimulationMessage('O projeto excede 2 MB.')
                return
              }
              try {
                setSimulationMessage('Lendo projeto…')
                const project = JSON.parse(await file.text())
                if (simulationRequest.current !== request) return
                if (!project || typeof project !== 'object' || Array.isArray(project))
                  throw new Error('Invalid project')
                setSimulationProject(project.project ?? project)
                setSimulationMessage('')
              } catch {
                if (simulationRequest.current === request)
                  setSimulationMessage('Arquivo de projeto inválido.')
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
