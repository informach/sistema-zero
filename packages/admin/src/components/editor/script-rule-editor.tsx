'use client'

import { EXECUTION_LIMITS, type SectionExecutionRule } from '@sistemazero/core/learning'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId } from 'react'
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
  isKit,
  onChange,
}: {
  rule: Script
  index: number
  isPro: boolean
  isKit: boolean
  onChange: (rule: Script) => void
}) {
  const id = useId()
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
          {isPro && isKit ? (
            <>
              <code>jogo</code> (uma foto do estado do kit depois dos passos:{' '}
              <code>jogo.score</code>, <code>jogo.phase</code>, <code>jogo.goal</code>)
            </>
          ) : isPro ? (
            <>
              <code>jogo</code> (vazio: este projeto Pro não é um kit; use o texto e o console)
            </>
          ) : (
            <>
              <code>jogo</code> (uma foto das variáveis do jogo depois dos passos:{' '}
              <code>jogo.pontos</code>, <code>jogo.heroi.x</code>)
            </>
          )}
          , <code>texto</code> (o texto da página; <code>null</code> se passar de 50 mil letras) e{' '}
          <code>console</code> (a LISTA do que o jogo escreveu no console:{' '}
          <code>console.includes('venceu')</code>; não dá para usar <code>console.log</code>).
        </p>
        <p>
          Exemplo:{' '}
          <code>
            {isPro && isKit
              ? "return jogo.score >= 3 && texto.includes('Pontos')"
              : isPro
                ? "return texto.includes('Você venceu')"
                : "return jogo.pontos >= 3 && console.includes('venceu')"}
          </code>
          . Só <code>true</code> passa; erro ou mais de 3 segundos não passam.
        </p>
      </div>
    </div>
  )
}
