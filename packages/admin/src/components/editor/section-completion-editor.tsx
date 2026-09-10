'use client'

import type { SectionCompletion, SectionStructureRule } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

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
  onChange,
}: {
  value: SectionCompletion
  candidates: { id: string; label: string }[]
  hasStudio: boolean
  onChange: (value: SectionCompletion) => void
}) {
  const checks = value.projectChecks ?? []
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-2 font-medium">Para liberar a próxima seção</legend>
      <p className="text-sm text-muted-foreground">
        O aluno precisa cumprir todos os critérios selecionados. Vídeo assistido e confirmação de
        leitura não contam.
      </p>
      {candidates.length === 0 && (
        <p className="text-sm">
          Adicione uma descoberta com pergunta curta ou configure um objetivo do Estúdio.
        </p>
      )}
      {candidates.map((c) => (
        <label key={c.id} className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={value.blockIds.includes(c.id)}
            onChange={(e) =>
              onChange({
                ...value,
                blockIds: e.target.checked
                  ? [...value.blockIds, c.id]
                  : value.blockIds.filter((id) => id !== c.id),
              })
            }
          />
          {c.label}
        </label>
      ))}
      {checks.map((check, index) => (
        <div key={check.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
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
          {check.rule.type !== 'usesLoop' && (
            <Input
              aria-label={`Nome esperado no objetivo ${index + 1}`}
              maxLength={200}
              value={check.rule.type === 'usesBlock' ? check.rule.blockType : check.rule.name}
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
      ))}
      {hasStudio && (
        <Button
          variant="outline"
          size="sm"
          disabled={checks.length >= 20}
          onClick={() =>
            onChange({
              ...value,
              projectChecks: [
                ...checks,
                { id: crypto.randomUUID(), label: '', rule: { type: 'usesBlock', blockType: '' } },
              ],
            })
          }
        >
          Adicionar objetivo do Estúdio
        </Button>
      )}
    </fieldset>
  )
}
