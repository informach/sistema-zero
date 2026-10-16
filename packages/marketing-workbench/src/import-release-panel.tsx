'use client'
import {
  type ImportReleasePreview,
  importReleasePreviewSchema,
  importReleaseSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import type { WorkbenchPort } from './port'

const labels: Record<ImportReleasePreview['state'], string> = {
  preparing: 'Acervo em preparação',
  current: 'Acervo liberado para continuidade',
  changed: 'A carga mudou depois da última liberação',
  retired: 'Carga desativada; histórico preservado',
}
export function ImportReleasePanel({
  port,
  projectId,
  inventoryId,
  admin,
  busy,
  run,
}: {
  port: WorkbenchPort
  projectId: string
  inventoryId: string
  admin: boolean
  busy: boolean
  run(work: () => Promise<void>): void
}) {
  const [plan, setPlan] = useState<ImportReleasePreview | null>(null)
  const [notice, setNotice] = useState('')
  async function load() {
    const value = importReleasePreviewSchema.parse(
      await port.request(`/projects/${projectId}/imports/${inventoryId}/release`),
    )
    if (value.run.id !== inventoryId || value.run.projectId !== projectId)
      throw new Error('A conferência retornou outra carga')
    setPlan(value)
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Liberação do acervo">
      <p className="text-sm font-medium">
        {plan ? labels[plan.state] : 'Conferir o acervo para continuar no app'}
      </p>
      <p className="text-xs text-muted-foreground">
        Cada origem do produto precisa estar preservada ou ter uma decisão com motivo. As pendências
        de produção continuam na fila; liberar o acervo não aprova peças, altera a direção vigente,
        agenda ou publica.
      </p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(load)}>
        Conferir liberação do acervo
      </Button>
      {plan ? (
        <>
          <p className="text-sm">
            {plan.summary.preserved} origens preservadas · {plan.summary.deferred} pendências
            identificadas · {plan.summary.omitted} decisões de não carregar · {plan.summary.pending}{' '}
            sem destino ou decisão
          </p>
          <p className="text-sm">
            {plan.summary.productionLinked} pastas com artes vinculadas ·{' '}
            {plan.summary.productionPending} conferências de produção para continuar ·{' '}
            {plan.summary.blocked} origens bloqueadas
          </p>
          <p className="text-xs text-muted-foreground">
            No projeto: {plan.summary.structuredGroups} peças/grupos estruturados e{' '}
            {plan.summary.calendars} fontes de calendário estruturadas. Última conferência recebida:{' '}
            {new Date(plan.verification.createdAt).toLocaleString('pt-BR')}.
          </p>
          <p className="text-xs text-muted-foreground">
            Confira novamente a pasta no desktop antes da liberação. Uma mudança encontrada no
            inventário mais recente impede liberar uma carga anterior sem reconciliação.
          </p>
          {plan.blockers.length ? (
            <ul className="list-disc pl-5 text-sm" aria-label="Pendências para liberar o acervo">
              {plan.blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {plan.latest ? (
            <p className="text-xs">
              Última liberação registrada em{' '}
              {new Date(plan.latest.createdAt).toLocaleString('pt-BR')}; recibo e pendências daquela
              revisão preservados.
            </p>
          ) : null}
          {admin && plan.state !== 'current' && plan.state !== 'retired' ? (
            <Button
              size="sm"
              disabled={busy || plan.blockers.length > 0}
              onClick={() =>
                run(async () => {
                  const saved = importReleaseSchema.parse(
                    await port.request(
                      `/projects/${projectId}/imports/${inventoryId}/release`,
                      'POST',
                      { operationId: crypto.randomUUID(), expectedPlanHash: plan.planHash },
                    ),
                  )
                  if (saved.inventoryId !== inventoryId || saved.projectId !== projectId)
                    throw new Error('A liberação retornou outra carga')
                  await load()
                  setNotice(
                    'Acervo liberado para continuidade. As pendências e os originais permanecem disponíveis; nenhuma peça foi aprovada ou publicada.',
                  )
                })
              }
            >
              Liberar acervo com as pendências identificadas
            </Button>
          ) : null}
        </>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
    </section>
  )
}
