'use client'
import {
  isExecutionRule,
  type SectionJavaScriptProjectCheck,
  type SectionObjectiveRule,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { challengeRule } from '@/lib/game-challenge-authoring'
import { ExecutionRuleEditor } from './execution-rule-editor'
import { ProjectRuleEditor } from './project-rule-editor'
import { ScriptRuleEditor } from './script-rule-editor'

export function GameObjectivesEditor({
  value,
  onChange,
  gabarito,
}: {
  value: SectionJavaScriptProjectCheck[]
  onChange(value: SectionJavaScriptProjectCheck[]): void
  gabarito: unknown
}) {
  function update(index: number, patch: Partial<SectionJavaScriptProjectCheck>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }
  function rule(index: number, next: SectionObjectiveRule) {
    update(index, { rule: next })
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escreva o que a pessoa precisa construir. Use comportamento para conferir o jogo rodando;
        preserve a liberdade de cor, aparência e valores quando não forem essenciais.
      </p>
      {value.map((check, index) => (
        <fieldset key={check.id} className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Objetivo {index + 1}</legend>
          <label className="block text-sm">
            O que a pessoa vai ler
            <Input
              value={check.label}
              maxLength={200}
              onChange={(e) => update(index, { label: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Dica quando faltar
            <Input
              value={check.hint ?? ''}
              maxLength={300}
              onChange={(e) => update(index, { hint: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Como conferir
            <Select
              value={check.rule.type}
              onChange={(e) => rule(index, challengeRule(e.target.value))}
            >
              <option value="usesBlock">Bloco e seus parâmetros</option>
              <option value="behavior">Comportamento do jogo</option>
              <option value="functionReturns">Resultado de uma função</option>
              <option value="script">Regra em JavaScript</option>
              <option value="usesLoop">Usa repetição</option>
              <option value="declaresVariable">Declara variável</option>
              <option value="definesFunction">Define função</option>
              <option value="callsFunction">Chama função</option>
            </Select>
          </label>
          {check.rule.type === 'usesBlock' ? (
            <ProjectRuleEditor
              rule={check.rule}
              workspace={{ initialProject: gabarito }}
              onChange={(r) => rule(index, r)}
            />
          ) : check.rule.type === 'script' ? (
            <ScriptRuleEditor
              rule={check.rule}
              index={index}
              isPro={false}
              isKit={false}
              onChange={(r) => rule(index, r)}
            />
          ) : isExecutionRule(check.rule) ? (
            <ExecutionRuleEditor
              rule={check.rule}
              index={index}
              isPro={false}
              isKit={false}
              onChange={(r) => rule(index, r)}
            />
          ) : 'name' in check.rule ? (
            <label className="block text-sm">
              Nome
              <Input
                value={check.rule.name}
                onChange={(e) => {
                  const r = check.rule
                  if ('name' in r) rule(index, { ...r, name: e.target.value })
                }}
              />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!check.optional}
                onChange={(e) => update(index, { optional: e.target.checked ? true : undefined })}
              />
              Faz parte do desafio extra
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Remover objetivo
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= 20}
        onClick={() =>
          onChange([
            ...value,
            { id: crypto.randomUUID(), label: '', rule: challengeRule('usesBlock') },
          ])
        }
      >
        Adicionar objetivo
      </Button>
    </div>
  )
}
