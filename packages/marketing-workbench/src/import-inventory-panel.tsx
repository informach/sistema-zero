'use client'
import {
  type ImportInventory,
  type ImportRun,
  type ImportSourceResult,
  type InventoryEntry,
  importPageSchema,
  importRunSchema,
  importSourceIsText,
  type PreparedImport,
  type Project,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import { ImportBatchControls } from './import-batch-controls'
import { errorMessage, type WorkbenchPort } from './port'

const categories: Record<InventoryEntry['category'], string> = {
  direction: 'Direção / oferta',
  calendar: 'Calendário',
  copy: 'Copy',
  research: 'Pesquisa',
  'final-media': 'Candidata a entrega',
  'support-media': 'Mídia de apoio',
  'production-source': 'Fonte de produção',
  history: 'Histórico',
  pedagogy: 'Referência pedagógica',
  technical: 'Arquivo técnico',
  unclassified: 'Classificação pendente',
}
const dispositions: Record<InventoryEntry['disposition'], string> = {
  eligible: 'Elegível',
  review: 'Requer conferência',
  excluded: 'Excluído da carga',
  blocked: 'Origem pendente',
}
const states: Record<ImportRun['state'], string> = {
  receiving: 'Registro em andamento',
  inventoried: 'Inventário confirmado',
  retired: 'Carga desativada',
}
const origins: Record<ImportInventory['origin'], string> = {
  'sistema-zero': 'Sistema Zero',
  'fluxo-criativo': 'Fluxo Criativo',
}
export function ImportInventoryPanel({
  port,
  project,
  onClose,
  onOpenSource,
}: {
  port: WorkbenchPort
  project: Project
  onClose(): void
  onOpenSource(id: string): void
}) {
  const fieldId = useId(),
    live = useRef(true),
    lock = useRef(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false)
  const [local, setLocal] = useState<PreparedImport[]>([]),
    [remote, setRemote] = useState<ImportRun[]>([])
  const [localCursor, setLocalCursor] = useState<string | null>(null),
    [remoteCursor, setRemoteCursor] = useState<string | null>(null)
  const [origin, setOrigin] = useState<ImportInventory['origin']>('sistema-zero')
  const [selected, setSelected] = useState<string | null>(null),
    [entries, setEntries] = useState<InventoryEntry[]>([]),
    [cursor, setCursor] = useState<number | null>(null)
  const [offset, setOffset] = useState(0),
    [notice, setNotice] = useState('')
  const [results, setResults] = useState<Record<string, ImportSourceResult | null>>({})
  const [progress, setProgress] = useState('')
  const [verifying, setVerifying] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!busy) return
    return port.inventory?.onProgress(setProgress)
  }, [port, busy])
  const editable = project.permissions.includes('edit')
  const refresh = useCallback(async () => {
    const [remote, local] = await Promise.all([
      port
        .request(`/projects/${project.id}/imports`)
        .then((value) => z.array(importRunSchema).max(30).parse(value)),
      port.inventory?.list(project.id) ?? Promise.resolve({ items: [], nextCursor: null }),
    ])
    if (!live.current) return
    setRemote(remote)
    setLocal(local.items)
    setRemoteCursor(remote.length === 30 ? (remote.at(-1)?.id ?? null) : null)
    setLocalCursor(local.nextCursor)
    setLoaded(true)
  }, [port, project.id])
  async function task(work: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    setProgress('')
    try {
      await work()
    } catch (error) {
      if (live.current) setError(errorMessage(error))
    } finally {
      lock.current = false
      if (live.current) setBusy(false)
    }
  }
  useEffect(() => {
    live.current = true
    void refresh().catch((error) => {
      if (live.current) setError(errorMessage(error))
    })
    return () => {
      live.current = false
    }
  }, [refresh])
  async function open(id: string, next = 0) {
    const prepared =
      local.some((value) => value.id === id) && port.inventory
        ? await port.inventory.page(project.id, id, next)
        : null
    const page =
      !prepared || remote.some((run) => run.id === id)
        ? importPageSchema.parse(
            await port.request(`/projects/${project.id}/imports/${id}?cursor=${next}`),
          )
        : null
    if (!live.current) return
    setEntries(prepared?.entries ?? page?.entries.map((entry) => entry.source) ?? [])
    setCursor(prepared ? prepared.nextCursor : (page?.nextCursor ?? null))
    setSelected(id)
    setOffset(next)
    setResults(
      Object.fromEntries(page?.entries.map((entry) => [entry.source.path, entry.result]) ?? []),
    )
  }
  const all = [...new Set([...local.map((r) => r.id), ...remote.map((r) => r.id)])]
  const selectedLocal = local.find((value) => value.id === selected)
  return (
    <Dialog
      open
      className="max-w-4xl"
      title="Importar acervo existente"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          O inventário preserva a origem, as versões e as pendências. Registrar a lista compartilha
          os nomes e a classificação com a equipe deste projeto. Textos e mídias têm uma etapa
          própria de carga; nenhuma peça é aprovada ou publicada aqui.
        </p>
        {port.inventory && editable ? (
          <div className="space-y-2">
            <label htmlFor={`${fieldId}-origin`} className="text-sm font-medium">
              Origem do acervo
            </label>
            <Select
              id={`${fieldId}-origin`}
              value={origin}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'sistema-zero' || value === 'fluxo-criativo') setOrigin(value)
              }}
            >
              <option value="sistema-zero">Sistema Zero · docs/marketing e output</option>
              <option value="fluxo-criativo">Fluxo Criativo · meus-produtos</option>
            </Select>
            <Button
              disabled={busy}
              onClick={() =>
                void task(async () => {
                  const value = await port.inventory?.choose(project.id, origin)
                  if (!live.current || !value) return
                  setLocal((items) => [value, ...items.filter((item) => item.id !== value.id)])
                  const page = await port.inventory?.page(project.id, value.id, 0)
                  if (page && live.current) {
                    setSelected(value.id)
                    setResults({})
                    setEntries(page.entries)
                    setCursor(page.nextCursor)
                    setOffset(0)
                  }
                })
              }
            >
              Selecionar pasta e ler acervo
            </Button>
            <p className="text-xs text-muted-foreground">
              A leitura fica neste computador até você registrar o inventário no projeto.
            </p>
          </div>
        ) : !port.inventory ? (
          <p className="rounded-lg border p-3 text-sm">
            A leitura das pastas é feita no app desktop. Os inventários registrados ficam
            disponíveis aqui para toda a equipe autorizada.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void task(refresh)}>
            Atualizar cargas
          </Button>
          {busy ? (
            <span role="status" className="text-sm">
              {progress || 'Processando…'}
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {busy && progress && port.inventory ? (
          <Button
            variant="outline"
            onClick={() =>
              void port.inventory
                ?.cancel(project.id)
                .catch((error) => setError(errorMessage(error)))
            }
          >
            Interromper importação
          </Button>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm">
            {notice}
          </p>
        ) : null}
        {loaded && !all.length ? <p className="text-sm">Nenhum inventário neste projeto.</p> : null}
        <ul className="max-h-64 space-y-2 overflow-auto" aria-label="Cargas do acervo">
          {all.map((id) => {
            const shared = remote.find((r) => r.id === id),
              prepared = local.find((r) => r.id === id),
              row = shared ?? prepared
            if (!row) return null
            return (
              <li key={id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {origins[row.origin]} · {new Date(row.capturedAt).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.entryCount} registros ·{' '}
                  {shared ? states[shared.state] : 'Somente neste computador'}
                  {shared?.state === 'receiving' ? ` · ${shared.received} recebidos` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    aria-pressed={selected === id}
                    onClick={() => void task(() => open(id))}
                  >
                    Conferir origens
                  </Button>
                  {prepared && editable && (!shared || shared.state === 'receiving') ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void task(async () => {
                          await port.inventory?.synchronize(project.id, id)
                          await refresh()
                          if (live.current)
                            setNotice(
                              'Inventário confirmado no servidor. A lista de origens já pode ser conferida pela equipe.',
                            )
                        })
                      }
                    >
                      {shared ? 'Retomar registro' : 'Registrar inventário no projeto'}
                    </Button>
                  ) : null}
                  {shared && shared.state !== 'retired' && project.permissions.includes('admin') ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void task(async () => {
                          importRunSchema.parse(
                            await port.request(
                              `/projects/${project.id}/imports/${id}/retire`,
                              'POST',
                              {},
                            ),
                          )
                          await refresh()
                          if (live.current)
                            setNotice(
                              'Carga desativada. As origens e o histórico foram preservados.',
                            )
                        })
                      }
                    >
                      Desativar carga
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-2">
          {localCursor && port.inventory ? (
            <Button
              size="sm"
              disabled={busy}
              variant="outline"
              onClick={() =>
                void task(async () => {
                  const page = await port.inventory?.list(project.id, localCursor)
                  if (page && live.current) {
                    setLocal((items) => [
                      ...items,
                      ...page.items.filter((r) => !items.some((i) => i.id === r.id)),
                    ])
                    setLocalCursor(page.nextCursor)
                  }
                })
              }
            >
              Mais cargas locais
            </Button>
          ) : null}
          {remoteCursor ? (
            <Button
              size="sm"
              disabled={busy}
              variant="outline"
              onClick={() =>
                void task(async () => {
                  const rows = z
                    .array(importRunSchema)
                    .max(30)
                    .parse(
                      await port.request(`/projects/${project.id}/imports?before=${remoteCursor}`),
                    )
                  if (live.current) {
                    setRemote((items) => [
                      ...items,
                      ...rows.filter((r) => !items.some((i) => i.id === r.id)),
                    ])
                    setRemoteCursor(rows.length === 30 ? (rows.at(-1)?.id ?? null) : null)
                  }
                })
              }
            >
              Mais cargas compartilhadas
            </Button>
          ) : null}
        </div>
        {selected ? (
          <section className="space-y-3" aria-label="Origens inventariadas">
            {selectedLocal &&
            port.inventory &&
            editable &&
            remote.some((run) => run.id === selected && run.state === 'inventoried') ? (
              <ImportBatchControls
                key={selected}
                prepared={selectedLocal}
                project={project}
                inventory={port.inventory}
                busy={busy}
                labels={categories}
                run={(work) =>
                  void task(async () => {
                    try {
                      const notice = await work()
                      if (live.current) setNotice(notice)
                    } finally {
                      await open(selected, offset)
                    }
                  })
                }
              />
            ) : null}
            {selectedLocal ? (
              <p className="text-sm">
                {selectedLocal.summary.eligible} elegíveis · {selectedLocal.summary.review} para
                conferir · {selectedLocal.summary.blocked} pendentes ·{' '}
                {selectedLocal.summary.excluded} exclusões de arquivos ou pastas.{' '}
                {selectedLocal.summary.duplicates} arquivos com conteúdo repetido, mantidos em suas
                origens.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Itens {offset + 1}–{offset + entries.length}. Pastas excluídas não foram percorridas.
              A classificação inicial não define vigência, publicação nem a versão que será adotada.
            </p>
            <ul className="max-h-96 space-y-2 overflow-auto">
              {entries.map((entry, index) => (
                <li key={entry.path} className="rounded-md border p-3 text-sm">
                  <p className="break-all font-medium">{entry.path}</p>
                  <p>
                    {categories[entry.category]} · {dispositions[entry.disposition]} ·{' '}
                    {entry.product}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.reason}</p>
                  {results[entry.path] ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs">
                        Referência carregada
                        {results[entry.path]?.previousSourceVersion
                          ? ' · versão anterior da origem preservada'
                          : ''}
                      </p>
                      {results[entry.path]?.classificationReview ? (
                        <p className="text-xs text-amber-400">
                          A classificação desta origem mudou desde a primeira carga. Confira o
                          produto e a categoria; a referência anterior foi preservada.
                        </p>
                      ) : null}
                      {results[entry.path]?.destinations.map((destination, index) => (
                        <Button
                          key={destination.entityId}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => onOpenSource(destination.entityId)}
                        >
                          Abrir referência
                          {(results[entry.path]?.destinations.length ?? 0) > 1
                            ? ` ${index + 1}`
                            : ''}
                        </Button>
                      ))}
                    </div>
                  ) : selectedLocal &&
                    port.inventory &&
                    editable &&
                    remote.some((run) => run.id === selected && run.state === 'inventoried') &&
                    ['eligible', 'review'].includes(entry.disposition) &&
                    importSourceIsText(entry) ? (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void task(async () => {
                          const result = await port.inventory?.loadText(
                            project.id,
                            selected,
                            offset + index,
                          )
                          if (result && live.current) {
                            setResults((previous) => ({ ...previous, [entry.path]: result }))
                            setNotice(
                              'Referência carregada com origem e versão preservadas. Você pode abri-la na biblioteca.',
                            )
                          }
                        })
                      }
                    >
                      Carregar referência
                    </Button>
                  ) : selectedLocal &&
                    port.inventory &&
                    editable &&
                    remote.some((run) => run.id === selected && run.state === 'inventoried') &&
                    ['eligible', 'review'].includes(entry.disposition) &&
                    (entry.bytes ?? 0) > 0 ? (
                    <div className="mt-2 space-y-1">
                      {verifying[`${selected}:${entry.path}`] ? (
                        <p className="text-xs text-muted-foreground">
                          Arquivo recebido; aguardando a conferência de integridade no servidor.
                        </p>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void task(async () => {
                            const outcome = await port.inventory?.loadFile(
                              project.id,
                              selected,
                              offset + index,
                            )
                            if (!outcome || !live.current) return
                            if (outcome.status === 'loaded') {
                              setResults((previous) => ({
                                ...previous,
                                [entry.path]: outcome.result,
                              }))
                              setNotice('Arquivo confirmado e vinculado à referência da origem.')
                            } else {
                              setVerifying((previous) => ({
                                ...previous,
                                [`${selected}:${entry.path}`]: outcome.assetId,
                              }))
                              setNotice(
                                'O arquivo foi recebido. Você pode continuar trabalhando e conferir o carregamento depois.',
                              )
                            }
                          })
                        }
                      >
                        {verifying[`${selected}:${entry.path}`]
                          ? 'Conferir carregamento'
                          : 'Carregar arquivo de origem'}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              {offset > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void task(() => open(selected, Math.max(0, offset - 100)))}
                >
                  Anteriores
                </Button>
              ) : null}
              {cursor !== null ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void task(() => open(selected, cursor))}
                >
                  Próximas origens
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </Dialog>
  )
}
