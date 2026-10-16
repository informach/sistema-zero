'use client'
import {
  type ImportDecision,
  importDecisionApplySchema,
  importDecisionSchema,
  importDecisionStateSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import type { WorkbenchPort } from './port'

export function ImportDecisionForm({
  port,
  projectId,
  inventoryId,
  ordinal,
  decision,
  busy,
  run,
  onSaved,
}: {
  port: WorkbenchPort
  projectId: string
  inventoryId: string
  ordinal: number
  decision: ImportDecision | null
  busy: boolean
  run(work: () => Promise<void>): void
  onSaved(): Promise<void>
}) {
  const field = useId()
  const [state, setState] = useState<ImportDecision['state']>(decision?.state ?? 'deferred')
  const [reason, setReason] = useState(decision?.reason ?? '')
  return (
    <details className="mt-2 space-y-2">
      <summary className="cursor-pointer">Registrar como continuar esta origem</summary>
      <label htmlFor={`${field}-state`} className="block">
        Decisão sobre a carga
      </label>
      <Select
        id={`${field}-state`}
        disabled={busy}
        value={state}
        onChange={(event) => setState(importDecisionStateSchema.parse(event.target.value))}
      >
        <option value="deferred">Conferir depois: manter na fila de pendências</option>
        <option value="omitted">Não carregar esta origem</option>
        <option value="pending">Reabrir para carga</option>
      </Select>
      <label htmlFor={`${field}-reason`} className="block">
        Motivo e próximo passo
      </label>
      <Textarea
        id={`${field}-reason`}
        disabled={busy}
        value={reason}
        minLength={10}
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
      />
      <p>
        O motivo fica registrado para a equipe. A decisão não apaga arquivos nem aprova conteúdo;
        pode ser revista aqui.
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || reason.trim().length < 10}
        onClick={() =>
          run(async () => {
            const input = importDecisionApplySchema.parse({
              operationId: crypto.randomUUID(),
              ordinal,
              expectedRevisionId: decision?.revisionId ?? null,
              state,
              reason,
            })
            const saved = importDecisionSchema.parse(
              await port.request(
                `/projects/${projectId}/imports/${inventoryId}/decisions`,
                'PUT',
                input,
              ),
            )
            if (saved.inventoryId !== inventoryId || saved.ordinal !== ordinal)
              throw new Error('A decisão retornou outra origem')
            await onSaved()
          })
        }
      >
        Salvar decisão sobre a origem
      </Button>
    </details>
  )
}
