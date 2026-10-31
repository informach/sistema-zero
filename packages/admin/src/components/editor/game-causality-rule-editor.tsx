'use client'
import {
  GAME_CAUSALITY_STEPS,
  type GameCausalityRule,
  type GameCausalityStep,
} from '@sistemazero/core/learning'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

/** O que cada passo confere, na língua de quem escreve o objetivo. */
export const GAME_CAUSALITY_STEP_LABELS: Record<GameCausalityStep, string> = {
  encounter: 'Um encontro tem efeito',
  memory: 'O encontro guarda uma informação',
  decision: 'Um Se usa o que foi guardado',
  restart: 'Uma tecla recomeça o jogo',
  removal: 'Algo sai da tela num encontro',
}

export function describeGameCausality(rule: GameCausalityRule): string {
  return `${GAME_CAUSALITY_STEP_LABELS[rule.step]} (personagem ${rule.actor || '(definir)'}; só conta código que roda)`
}

export function GameCausalityRuleEditor({
  rule,
  onChange,
}: {
  rule: GameCausalityRule
  onChange(rule: GameCausalityRule): void
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm">
        Personagem que a criança controla
        <Input value={rule.actor} onChange={(e) => onChange({ ...rule, actor: e.target.value })} />
      </label>
      <label className="text-sm">
        O que conferir
        <Select
          value={rule.step}
          onChange={(e) => onChange({ ...rule, step: e.target.value as GameCausalityStep })}
        >
          {GAME_CAUSALITY_STEPS.map((step) => (
            <option key={step} value={step}>
              {GAME_CAUSALITY_STEP_LABELS[step]}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-xs text-muted-foreground">
        Nomes e desenhos ficam livres. Código dentro de um Se que nunca é verdadeiro não conta.
      </p>
    </div>
  )
}
