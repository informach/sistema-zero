'use client'

import { EXECUTION_LIMITS, type SectionExecutionRule } from '@sistemazero/core/learning'
import { Textarea } from '@sistemazero/ui/textarea'
import { StepsEditor } from './execution-rule-editor'

type Script = Extract<SectionExecutionRule, { type: 'script' }>

/**
 * A Regra em JavaScript (etapa 4 dos objetivos, 18/10/2026): passos no jogo e, depois deles, o
 * corpo de uma função que devolve `true` para passar. Para quem programa: os outros tipos cobrem a
 * maior parte das aulas sem código.
 */
export function ScriptRuleEditor({
  rule,
  index,
  isPro,
  onChange,
}: {
  rule: Script
  index: number
  isPro: boolean
  onChange: (rule: Script) => void
}) {
  const id = `script-${index}`
  return (
    <div className="space-y-3">
      <StepsEditor
        steps={rule.steps}
        index={index}
        onChange={(steps) => onChange({ ...rule, steps })}
      />
      <label htmlFor={id} className="block space-y-1 text-sm">
        <span className="font-medium">Depois dos passos, a regra (devolva true para passar)</span>
        <Textarea
          id={id}
          className="font-mono text-xs"
          rows={6}
          spellCheck={false}
          maxLength={EXECUTION_LIMITS.maxScriptChars}
          value={rule.code}
          onChange={(event) => onChange({ ...rule, code: event.target.value })}
        />
      </label>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          A regra é o corpo de uma função e pode usar <code>await</code>. Ela recebe:{' '}
          {isPro ? (
            <>
              <code>jogo</code> (o estado do kit: <code>jogo.score</code>, <code>jogo.phase</code>,{' '}
              <code>jogo.goal</code>)
            </>
          ) : (
            <>
              <code>jogo</code> (as variáveis do jogo: <code>jogo.pontos</code>,{' '}
              <code>jogo.heroi.x</code>)
            </>
          )}
          , <code>texto</code> (o texto da página) e <code>console</code> (a lista do que o jogo
          escreveu no console).
        </p>
        <p>
          Exemplo:{' '}
          <code>
            {isPro
              ? "return jogo.score >= 3 && texto.includes('Pontos')"
              : "return jogo.pontos >= 3 && console.includes('venceu')"}
          </code>
          . Só <code>true</code> passa; erro ou mais de 3 segundos não passam.
        </p>
      </div>
    </div>
  )
}
