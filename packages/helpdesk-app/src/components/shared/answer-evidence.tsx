'use client'

import type { AiRunView } from '@sistemazero/helpdesk-contracts'

export function AnswerEvidence({ run }: { run: AiRunView }) {
  const knownCost = run.attempts.reduce((sum, attempt) => sum + (attempt.costUsd ?? 0), 0)
  const unknown = run.attempts.filter((attempt) => attempt.costUsd === null).length
  return (
    <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
      <p>
        {run.purpose === 'classification'
          ? 'Classificação da conversa'
          : run.coverage === 'covered'
            ? 'Resposta com fontes'
            : run.coverage === 'partial'
              ? 'Cobertura parcial: revise antes de usar'
              : 'Sem fonte suficiente para responder'}
      </p>
      {run.reply ? <p className="whitespace-pre-wrap">{run.reply}</p> : null}
      <ul className="space-y-2">
        {run.evidence.map((source) => (
          <li key={source.chunkId}>
            <details>
              <summary className="cursor-pointer font-medium">
                {source.title} · revisão {source.revisionNumber} · {source.section}
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{source.text}</p>
            </details>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {run.attempts.length} tentativa(s) · custo informado US$ {knownCost.toFixed(5)}
        {unknown ? ` · ${unknown} com custo ainda desconhecido` : ''}
      </p>
    </div>
  )
}
