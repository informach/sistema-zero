'use client'
import type { AiRunView } from '@sistemazero/helpdesk-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { AnswerEvidence } from '@/components/shared/answer-evidence'
import { apiGet } from '@/lib/api'

export function AiHistory({ ticketId }: { ticketId: string }) {
  const [runs, setRuns] = useState<AiRunView[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false)
  async function load() {
    setBusy(true)
    setError(false)
    try {
      setRuns(await apiGet(`/api/helpdesk/tickets/${ticketId}/runs`))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Histórico da IA">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Histórico da IA</h2>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
          {busy ? 'Carregando…' : 'Consultar execuções'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Até 20 execuções recentes. Sombra e copiloto não enviam respostas automaticamente.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível consultar as execuções.
        </p>
      ) : null}
      {runs.map((run) => (
        <details key={run.id} className="rounded border p-2">
          <summary className="cursor-pointer text-sm">
            {
              {
                automatic: 'Resposta automática',
                shadow: 'Avaliação em sombra',
                copilot: 'Copiloto',
                classification: 'Classificação',
                test: 'Teste',
              }[run.purpose]
            }{' '}
            · {new Date(run.createdAt).toLocaleString('pt-BR')} ·{' '}
            {run.status === 'completed'
              ? 'Concluída'
              : run.status === 'failed'
                ? 'Falhou'
                : run.status === 'superseded'
                  ? 'Conversa alterada'
                  : 'Em andamento'}
          </summary>
          <div className="mt-2">
            <AnswerEvidence run={run} />
          </div>
        </details>
      ))}
    </section>
  )
}
