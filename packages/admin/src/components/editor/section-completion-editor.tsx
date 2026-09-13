'use client'

import type { SectionCompletion, SectionStructureRule } from '@sistemazero/core/learning'
import {
  isPlatformAction,
  PLATFORM_ACTION_LABELS,
  PLATFORM_ACTIONS,
} from '@sistemazero/core/learning'
import {
  evaluateStudioSectionProject,
  projectCheckAuthoring,
} from '@sistemazero/studio/server-project-checks'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ProjectRuleEditor } from './project-rule-editor'

function newRule(type: string): SectionStructureRule {
  switch (type) {
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

export function SectionCompletionEditor({
  value,
  candidates,
  hasStudio,
  allowBlocks,
  workspace,
  allowPlatformAction = true,
  onChange,
}: {
  value: SectionCompletion
  candidates: { id: string; label: string; model?: string; issue?: string }[]
  hasStudio: boolean
  allowBlocks?: string[]
  workspace?: unknown
  allowPlatformAction?: boolean
  onChange: (value: SectionCompletion) => void
}) {
  const checks = value.projectChecks ?? []
  const [expandedChecks, setExpandedChecks] = useState<string[]>([])
  const fallbackAllowBlocks = workspace === undefined ? allowBlocks : undefined
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
      : evaluateStudioSectionProject(checks, simulationProject)
          .map((result) => `${result.passed ? 'Cumprido' : 'Falta'}: ${result.label}`)
          .join('\n')
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-2 font-medium">Para liberar a próxima seção</legend>
      <p className="font-medium">O que o aluno precisa demonstrar para continuar?</p>
      <p className="text-sm text-muted-foreground">
        Selecione a ação que mostra que esta etapa foi realizada. Exploração, criação, entrega e
        acesso ao caderno têm critérios diferentes. Todos os critérios selecionados precisam ser
        cumpridos.
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
          Adicione uma exploração, um caderno ou uma atividade de criação para escolher seu
          critério.
        </p>
      )}
      {!value.platformAction &&
        candidates.map((c) => (
          <label key={c.id} className="flex min-h-11 items-center gap-3 text-sm">
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
        ))}
      {checks.map((check, index) => (
        <div key={check.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {check.label || `Objetivo ${index + 1} · falta preencher`}
              </p>
              <p className="text-xs text-muted-foreground">
                {check.rule.type === 'usesBlock'
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
              onChange={(e) =>
                onChange({
                  ...value,
                  projectChecks: checks.map((c) =>
                    c.id === check.id ? { ...c, label: e.target.value } : c,
                  ),
                })
              }
            />
            <Select
              aria-label={`Regra do objetivo ${index + 1}`}
              value={check.rule.type}
              onChange={(e) =>
                onChange({
                  ...value,
                  projectChecks: checks.map((c) =>
                    c.id === check.id ? { ...c, rule: newRule(e.target.value) } : c,
                  ),
                })
              }
            >
              <option value="usesBlock">Usar um bloco</option>
              <option value="usesLoop">Usar repetição</option>
              <option value="declaresVariable">Criar variável</option>
              <option value="definesFunction">Definir função</option>
              <option value="callsFunction">Chamar função</option>
            </Select>
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
            {check.rule.type !== 'usesLoop' && check.rule.type !== 'usesBlock' && (
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
                              c.rule.type === 'usesBlock'
                                ? { ...c.rule, blockType: e.target.value }
                                : c.rule.type === 'usesLoop'
                                  ? c.rule
                                  : { ...c.rule, name: e.target.value },
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
                { id, label: '', rule: { type: 'usesBlock', blockType: '' } },
              ],
            })
          }}
        >
          Adicionar objetivo do Estúdio
        </Button>
      )}
      {checks.length > 0 && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm">Simular com um projeto salvo</summary>
          <p className="text-xs">
            Usa o mesmo avaliador estrutural. Não registra progresso nem conclui a aula.
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
