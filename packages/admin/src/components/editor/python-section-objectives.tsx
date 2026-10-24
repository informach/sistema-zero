'use client'

import {
  pythonProjectCheckGraphics,
  type SectionPythonProjectCheck,
  SectionPythonProjectCheckDraftSchema,
  validateSectionPythonProjectChecks,
} from '@sistemazero/core/learning'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useMemo } from 'react'
import { ZodError } from 'zod'
import { ExecutionRuleEditor, type PythonExecutionEditorEnvironment } from './execution-rule-editor'

export function newPythonSectionRule(type: string): SectionPythonProjectCheck['rule'] {
  if (type === 'usesLoop' || type === 'usesConditional') return { type }
  if (type === 'declaresVariable' || type === 'definesFunction' || type === 'callsFunction')
    return { type, name: '' }
  if (type === 'behavior')
    return {
      type,
      steps: [],
      expect: { target: { kind: 'console' }, compare: 'contains', value: 'Olá' },
    }
  if (type === 'functionReturns')
    return { type, name: 'somar', cases: [{ args: [2, 3], expected: 5 }] }
  throw new Error('Regra Python desconhecida.')
}

export function PythonSectionObjectives({
  checks,
  project,
  onChange,
}: {
  checks: SectionPythonProjectCheck[]
  project?: unknown
  onChange(checks: SectionPythonProjectCheck[]): void
}) {
  const parsed = useMemo(() => StudioProjectDocumentSchema.safeParse(project), [project])
  const environment: PythonExecutionEditorEnvironment = {
    language: 'python',
    graphics: parsed.success ? pythonProjectCheckGraphics(parsed.data.installedExtensions) : 'none',
  }
  const patch = (id: string, update: Partial<SectionPythonProjectCheck>) =>
    onChange(checks.map((check) => (check.id === id ? { ...check, ...update } : check)))
  let issue: string | undefined
  if (checks.length) {
    try {
      validateSectionPythonProjectChecks(checks)
    } catch (error) {
      issue =
        error instanceof ZodError
          ? error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : 'Complete os objetivos Python.'
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        O servidor executa o projeto para conferir comportamento e funções. A estrutura é conferida
        quando o objetivo pede um conceito de programação.
      </p>
      {checks.map((check, index) => {
        const execution = check.rule.type === 'behavior' || check.rule.type === 'functionReturns'
        return (
          <fieldset key={check.id} className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm">Objetivo Python {index + 1}</legend>
            <label className="block space-y-1 text-sm">
              <span>O que o aluno precisa fazer</span>
              <Input
                value={check.label}
                maxLength={200}
                onChange={(event) => patch(check.id, { label: event.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Dica quando ainda faltar (opcional)</span>
              <Input
                value={check.hint ?? ''}
                maxLength={300}
                onChange={(event) => patch(check.id, { hint: event.target.value || undefined })}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={check.optional === true}
                onChange={(event) => {
                  const { optional: _optional, ...required } = check
                  onChange(
                    checks.map((item) =>
                      item.id === check.id
                        ? event.target.checked
                          ? { ...required, optional: true }
                          : required
                        : item,
                    ),
                  )
                }}
              />
              <span>Desafio extra: não tranca a parte e vale 5 XP uma vez.</span>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Como conferir o objetivo</span>
              <Select
                value={check.rule.type}
                onChange={(event) => {
                  const rule = newPythonSectionRule(event.target.value)
                  const { stdin: _stdin, ...rest } = check
                  onChange(
                    checks.map((item) =>
                      item.id !== check.id
                        ? item
                        : {
                            ...rest,
                            rule:
                              rule.type !== 'behavior' &&
                              rule.type !== 'functionReturns' &&
                              'file' in check.rule &&
                              check.rule.file
                                ? { ...rule, file: check.rule.file }
                                : rule,
                          },
                    ),
                  )
                }}
              >
                <optgroup label="Executar o programa">
                  <option value="behavior">O programa faz algo</option>
                  <option value="functionReturns">A função responde certo</option>
                </optgroup>
                <optgroup label="Conceitos no código">
                  <option value="usesLoop">Usar uma repetição</option>
                  <option value="usesConditional">Usar uma condição</option>
                  <option value="declaresVariable">Criar uma variável</option>
                  <option value="definesFunction">Definir uma função</option>
                  <option value="callsFunction">Chamar uma função</option>
                </optgroup>
              </Select>
            </label>
            {check.rule.type === 'behavior' || check.rule.type === 'functionReturns' ? (
              <>
                <ExecutionRuleEditor
                  rule={check.rule}
                  index={index}
                  isPro={parsed.success && parsed.data.kind === 'pro'}
                  isKit={false}
                  environment={environment}
                  onChange={(rule) => {
                    const next = SectionPythonProjectCheckDraftSchema.safeParse({ ...check, rule })
                    if (next.success) patch(check.id, { rule: next.data.rule })
                  }}
                />
                <fieldset className="space-y-2 text-sm">
                  <legend className="font-medium">Entradas para input() neste teste</legend>
                  {(check.stdin ?? []).map((line, at) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: linhas são campos controlados e não possuem identidade externa.
                    <div key={at} className="flex items-center gap-2">
                      <Input
                        aria-label={`Entrada ${at + 1} do objetivo ${index + 1}`}
                        value={line}
                        maxLength={4096}
                        placeholder="Pode ser uma linha em branco"
                        onChange={(event) =>
                          patch(check.id, {
                            stdin: check.stdin?.map((value, i) =>
                              i === at ? event.target.value : value,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remover entrada ${at + 1}`}
                        onClick={() =>
                          patch(check.id, { stdin: check.stdin?.filter((_, i) => i !== at) })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(check.stdin?.length ?? 0) >= 4}
                    onClick={() => patch(check.id, { stdin: [...(check.stdin ?? []), ''] })}
                  >
                    Adicionar entrada
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Cada linha responde a uma chamada de input(). Os valores esperados continuam
                    privados no servidor.
                  </p>
                </fieldset>
              </>
            ) : (
              <>
                {'name' in check.rule && (
                  <label className="block space-y-1 text-sm">
                    <span>Nome esperado</span>
                    <Input
                      value={check.rule.name}
                      maxLength={256}
                      onChange={(event) => {
                        if ('name' in check.rule)
                          patch(check.id, { rule: { ...check.rule, name: event.target.value } })
                      }}
                    />
                  </label>
                )}
                <label className="block space-y-1 text-sm">
                  <span>Arquivo Python (opcional)</span>
                  <Input
                    value={check.rule.file ?? ''}
                    placeholder="Todos os arquivos Python"
                    maxLength={1024}
                    onChange={(event) => {
                      if (check.rule.type === 'behavior' || check.rule.type === 'functionReturns')
                        return
                      const { file: _file, ...rule } = check.rule
                      patch(check.id, {
                        rule: event.target.value ? { ...rule, file: event.target.value } : rule,
                      })
                    }}
                  />
                </label>
              </>
            )}
            {execution && environment.graphics === 'none' && (
              <p className="text-xs text-muted-foreground">
                Instale uma extensão gráfica no projeto para conferir teclado e cliques.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(checks.filter((item) => item.id !== check.id))}
            >
              Remover objetivo
            </Button>
          </fieldset>
        )
      })}
      {issue && (
        <p role="alert" className="text-xs text-destructive">
          {issue}
        </p>
      )}
    </div>
  )
}
