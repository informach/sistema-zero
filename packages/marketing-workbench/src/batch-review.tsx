'use client'
import {
  type ExecutionRequest,
  type ExecutionRun,
  executionContextSchema,
  hashSchema,
  type Project,
  runCreateSchema,
  runViewSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useId, useState } from 'react'
import { z } from 'zod'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'
import { ProposalResult } from './proposal-result'

const planSchema = z.object({
  instruction: z.string(),
  provider: z.enum(['codex', 'claude']),
  selected: z.array(z.string().uuid()).max(10),
  requests: z.array(runCreateSchema).max(10),
})
export function BatchReview({
  port,
  project,
  entries,
  onChanged,
}: {
  port: WorkbenchPort
  project: Project
  entries: EditorialEntry[]
  onChanged: () => Promise<void>
}) {
  const id = useId(),
    key = `marketing-batch:${port.identity}:${project.id}`
  const [selected, setSelected] = useState<string[]>([]),
    [instruction, setInstruction] = useState(''),
    [provider, setProvider] = useState<'codex' | 'claude'>('codex'),
    [requests, setRequests] = useState<ExecutionRequest[]>([]),
    [runs, setRuns] = useState<ExecutionRun[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [restored, setRestored] = useState(false)
  const [archives, setArchives] = useState<string[]>([]),
    [invalid, setInvalid] = useState('')
  const pieces = entries.filter((entry) => entry.document.kind === 'piece' && !entry.archived)
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
      setArchives([
        ...new Set(
          Object.keys(localStorage)
            .filter((name) => name.startsWith(`${key}:history:`))
            .map((name) => localStorage.getItem(name) ?? ''),
        ),
      ])
      if (raw) {
        const value = planSchema.parse(JSON.parse(raw))
        setSelected(value.selected)
        setInstruction(value.instruction)
        setProvider(value.provider)
        setRequests(value.requests)
      }
      setRestored(true)
    } catch (error) {
      setInvalid(raw ?? '')
      setError(`O lote anterior foi preservado, mas não pôde ser aberto: ${errorMessage(error)}`)
    }
  }, [key])
  useEffect(() => {
    if (!restored) return
    try {
      localStorage.setItem(key, JSON.stringify({ instruction, provider, selected, requests }))
    } catch (error) {
      setError(errorMessage(error))
    }
  }, [key, instruction, provider, selected, requests, restored])
  useEffect(() => {
    let live = true,
      running = false
    const refresh = async () => {
      if (running) return
      running = true
      try {
        const values = await Promise.all(
          requests.map(async (request) => {
            try {
              return runViewSchema.parse(
                await port.request(`/projects/${project.id}/runs/${request.id}`),
              )
            } catch (error) {
              if (
                live &&
                !(error && typeof error === 'object' && 'status' in error && error.status === 404)
              )
                setError(errorMessage(error))
              return null
            }
          }),
        )
        if (live) setRuns(values.filter((run): run is ExecutionRun => run !== null))
      } finally {
        running = false
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 3000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [requests, port, project.id])
  async function submit() {
    setBusy(true)
    setError('')
    try {
      const prepared = [...requests]
      // Prepare all immutable requests before consuming any inference. Persist each identity before POST.
      for (const entityId of selected) {
        if (prepared.some((request) => request.entityId === entityId)) continue
        const piece = pieces.find((entry) => entry.id === entityId)
        if (!piece?.confirmed || piece.pending.length || piece.conflict)
          throw new Error('Sincronize as peças escolhidas antes da revisão')
        const representationIds =
          piece.document.kind === 'piece' ? piece.document.representationIds : []
        if (
          entries.some(
            (entry) =>
              (representationIds.includes(entry.id) ||
                (entry.document.kind === 'component' &&
                  representationIds.includes(entry.document.representationId))) &&
              (entry.pending.length || entry.conflict),
          )
        )
          throw new Error(`Sincronize os componentes de ${piece.document.title}`)
        const base = {
          schemaVersion: 1 as const,
          projectId: project.id,
          entityId,
          revisionId: piece.confirmed.revisionId,
          instruction,
          provider,
          intent: 'alternatives' as const,
          capability: 'copy' as const,
          selection: [],
          protectedIds: [],
          assignedTo: port.userId,
          limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
        }
        const context = z
          .object({ context: executionContextSchema, hash: hashSchema })
          .parse(await port.request('/context', 'POST', base))
        prepared.push(
          runCreateSchema.parse({
            ...base,
            id: crypto.randomUUID(),
            operationId: crypto.randomUUID(),
            contextHash: context.hash,
          }),
        )
        localStorage.setItem(
          key,
          JSON.stringify({ instruction, provider, selected, requests: prepared }),
        )
        setRequests([...prepared])
      }
      for (const request of prepared) {
        const created = runViewSchema.parse(await port.request('/runs', 'POST', request))
        const current = runViewSchema.parse(
          await port.request(`/projects/${project.id}/runs/${created.request.id}`),
        )
        if (port.execute && current.state === 'queued')
          await port.execute(project.id, request.id, 'start')
      }
      await onChanged()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function closeBatch() {
    setBusy(true)
    setError('')
    try {
      for (const request of requests) {
        let current: ExecutionRun
        try {
          current = runViewSchema.parse(
            await port.request(`/projects/${project.id}/runs/${request.id}`),
          )
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error && error.status === 404)
            continue
          throw error
        }
        if (current.state === 'running')
          throw new Error('Aguarde ou cancele a execução em andamento antes de encerrar o lote')
        if (['queued', 'waiting'].includes(current.state))
          await port.request(`/projects/${project.id}/runs/${request.id}/cancel`, 'POST', {
            operationId: crypto.randomUUID(),
          })
      }
      const raw = localStorage.getItem(key)
      if (raw) localStorage.setItem(`${key}:history:${crypto.randomUUID()}`, raw)
      if (raw) setArchives((old) => [...new Set([...old, raw])])
      setRequests([])
      setRuns([])
      setSelected([])
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer font-semibold">Revisar várias peças</summary>
      <p className="my-3 text-sm text-muted-foreground">
        Escolha até dez peças. Cada resultado conserva seu contexto e só entra no rascunho quando
        você o aceitar.
      </p>
      <div className="max-h-48 space-y-2 overflow-auto">
        {pieces.map((piece) => (
          <label key={piece.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={
                busy ||
                requests.length > 0 ||
                (!selected.includes(piece.id) && selected.length >= 10)
              }
              checked={selected.includes(piece.id)}
              onChange={(event) =>
                setSelected((old) =>
                  event.target.checked
                    ? [...old, piece.id]
                    : old.filter((value) => value !== piece.id),
                )
              }
            />
            {piece.document.title}
          </label>
        ))}
      </div>
      <label htmlFor={id} className="mt-3 block text-sm">
        O que revisar
        <Textarea
          id={id}
          rows={3}
          maxLength={12000}
          value={instruction}
          disabled={busy || requests.length > 0}
          onChange={(event) => setInstruction(event.target.value)}
        />
      </label>
      <label htmlFor={`${id}-provider`} className="mt-3 block text-sm">
        Sua assinatura
        <Select
          id={`${id}-provider`}
          value={provider}
          disabled={busy || requests.length > 0}
          onChange={(event) => {
            if (event.target.value === 'codex' || event.target.value === 'claude')
              setProvider(event.target.value)
          }}
        >
          <option value="codex">Codex</option>
          <option value="claude">Claude Code</option>
        </Select>
      </label>
      {port.location === 'web' ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Requer app desktop para executar. Os pedidos preparados ficarão disponíveis para abrir e
          produzir.
        </p>
      ) : null}
      <div className="my-3 flex gap-2">
        <Button
          disabled={busy || !restored || !selected.length || !instruction.trim()}
          onClick={() => void submit()}
        >
          {busy
            ? 'Revisando lote…'
            : requests.length
              ? 'Continuar lote'
              : port.location === 'web'
                ? 'Preparar lote no projeto'
                : 'Revisar peças escolhidas'}
        </Button>
        {requests.length ? (
          <Button variant="outline" disabled={busy} onClick={() => void closeBatch()}>
            Encerrar este lote
          </Button>
        ) : null}
      </div>
      {runs.map((run) => (
        <article key={run.request.id} className="mt-3 rounded-lg border p-4">
          <h4 className="font-medium">
            {pieces.find((piece) => piece.id === run.request.entityId)?.document.title ??
              run.context.source.document.title}
          </h4>
          {run.outcome?.status === 'succeeded' && run.outcome.editorial ? (
            <ProposalResult
              port={port}
              run={run}
              editable={project.permissions.includes('edit')}
              onChanged={onChanged}
            />
          ) : (
            <p className="mt-2 text-sm">
              {run.outcome && run.outcome.status !== 'succeeded'
                ? run.outcome.message
                : run.state === 'queued'
                  ? 'Pronto para executar'
                  : run.state === 'running'
                    ? 'Em revisão'
                    : 'Aguardando resultado'}
            </p>
          )}
          {port.location === 'web' && run.state === 'queued' ? (
            <Button
              className="mt-2"
              variant="outline"
              onClick={() =>
                void port
                  .openDesktop({
                    schemaVersion: 1,
                    projectId: project.id,
                    entityId: run.request.entityId,
                    revisionId: run.request.revisionId,
                    selection: run.request.selection,
                    intent: run.request.intent,
                    runId: run.request.id,
                  })
                  .catch((error) => setError(errorMessage(error)))
              }
            >
              Abrir no desktop
            </Button>
          ) : null}
        </article>
      ))}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!restored ? (
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            try {
              if (invalid) {
                localStorage.setItem(`${key}:history:${crypto.randomUUID()}`, invalid)
                setArchives((old) => [...new Set([...old, invalid])])
              }
              localStorage.setItem(
                key,
                JSON.stringify({ instruction: '', provider: 'codex', selected: [], requests: [] }),
              )
              setInstruction('')
              setSelected([])
              setRequests([])
              setRestored(true)
              setError('')
            } catch (error) {
              setError(errorMessage(error))
            }
          }}
        >
          Preservar lote anterior e preparar outro
        </Button>
      ) : null}
      {archives.length ? (
        <details className="mt-3 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm">
            Lotes locais preservados · {archives.length}
          </summary>
          {archives.map((value) => (
            <Textarea
              key={value}
              aria-label="Registro preservado do lote"
              readOnly
              rows={4}
              value={value}
              className="mt-3"
            />
          ))}
        </details>
      ) : null}
    </details>
  )
}
