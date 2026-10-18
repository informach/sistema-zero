'use client'

import type { SectionPythonProjectCheck } from '@sistemazero/core/learning'
import { StudioPythonStructureRuleSchema } from '@sistemazero/core/studio/python-activity-structure'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

export function newPythonSectionRule(type: string): SectionPythonProjectCheck['rule'] {
  if (type === 'usesLoop' || type === 'usesConditional') return { type }
  if (type === 'declaresVariable' || type === 'definesFunction' || type === 'callsFunction')
    return { type, name: '' }
  throw new Error('Regra Python desconhecida.')
}

export function PythonSectionObjectives({
  checks,
  onChange,
}: {
  checks: SectionPythonProjectCheck[]
  onChange(checks: SectionPythonProjectCheck[]): void
}) {
  const patch = (id: string, update: Partial<SectionPythonProjectCheck>) =>
    onChange(checks.map((check) => (check.id === id ? { ...check, ...update } : check)))
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Objetivos Python: o servidor confere a estrutura do código para liberar a próxima parte.
      </p>
      {checks.map((check, index) => (
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
            <span>Conferir no código</span>
            <Select
              value={check.rule.type}
              onChange={(event) =>
                patch(check.id, {
                  rule: {
                    ...newPythonSectionRule(event.target.value),
                    ...(check.rule.file ? { file: check.rule.file } : {}),
                  },
                })
              }
            >
              <option value="usesLoop">Usar uma repetição</option>
              <option value="usesConditional">Usar uma condição</option>
              <option value="declaresVariable">Criar uma variável</option>
              <option value="definesFunction">Definir uma função</option>
              <option value="callsFunction">Chamar uma função</option>
            </Select>
          </label>
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
                const { file: _file, ...rule } = check.rule
                patch(check.id, {
                  rule: event.target.value ? { ...rule, file: event.target.value } : rule,
                })
              }}
            />
          </label>
          {!StudioPythonStructureRuleSchema.safeParse(check.rule).success && (
            <p role="alert" className="text-xs text-destructive">
              Preencha o nome esperado e um caminho de arquivo Python válido, se informar um
              arquivo.
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
      ))}
    </div>
  )
}
