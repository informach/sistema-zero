'use client'
import {
  type ImportCalendarPreview,
  importCalendarPreviewSchema,
  importCalendarResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { workspaceAction } from './action-journal'
import type { WorkbenchPort } from './port'
import { useImportActions } from './use-import-actions'

export function ImportCalendarPanel({
  port,
  projectId,
  sourceId,
  editable,
  onOpen,
}: {
  port: WorkbenchPort
  projectId: string
  sourceId: string
  editable: boolean
  onOpen(id: string): void
}) {
  const [preview, setPreview] = useState<ImportCalendarPreview | null>(null)
  const {
    busy,
    error,
    notice,
    setNotice,
    run: task,
    batch,
    batchRunning,
    stop,
  } = useImportActions()
  async function refresh() {
    setPreview(
      importCalendarPreviewSchema.parse(
        await port.request(`/projects/${projectId}/import-sources/${sourceId}/calendar`),
      ),
    )
  }
  const applicable =
    preview?.entries.filter(
      (entry) => ['new', 'update'].includes(entry.state) && entry.pieceId && entry.revisionId,
    ) ?? []
  const applyEntry = (entry: ImportCalendarPreview['entries'][number]) => {
    if (!preview || !entry.pieceId || !entry.revisionId)
      throw new Error('Confira o vínculo antes de aplicar')
    return workspaceAction(
      port,
      `/projects/${projectId}/import-calendars`,
      {
        sourceVersionId: preview.sourceVersionId,
        parserVersion: preview.parserVersion,
        key: entry.key,
        pieceId: entry.pieceId,
        expectedRevisionId: entry.revisionId,
        expectedMappingId: entry.mappingId,
      },
      importCalendarResultSchema,
    )
  }
  return (
    <div className="space-y-2 border-t pt-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void task(refresh)}>
        Conferir calendário desta fonte
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
      {preview ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            O vínculo usa a referência exata da copy. Semanas sugeridas não definem datas nem
            agendam publicações.
          </p>
          {!preview.entries.length ? (
            <p className="text-sm">
              Nenhuma tabela de semanas e pautas foi reconhecida nesta fonte.
            </p>
          ) : null}
          {editable && applicable.length > 1 ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void batch(applicable, applyEntry, async () => {
                  await port.synchronize()
                  await refresh()
                })
              }
            >
              Vincular {applicable.length} pautas conferidas
            </Button>
          ) : null}
          {batchRunning ? (
            <Button size="sm" variant="outline" onClick={stop}>
              Interromper após esta pauta
            </Button>
          ) : null}
          <ul className="space-y-2">
            {preview.entries.map((entry) => (
              <li key={entry.key} className="space-y-1 rounded border p-2">
                <p className="font-medium">
                  {entry.key} · {entry.title}
                </p>
                <p className="text-xs">
                  Origem: semana {entry.week}, posição {entry.position}
                  {entry.currentWeek !== null
                    ? ` · App: semana ${entry.currentWeek}, posição ${entry.currentPosition}`
                    : ''}
                </p>
                <p className="text-sm">{entry.message}</p>
                {entry.state === 'missing' ? (
                  <p className="break-all text-xs text-muted-foreground">{entry.sourceKey}</p>
                ) : null}
                {entry.pieceId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => entry.pieceId && onOpen(entry.pieceId)}
                  >
                    Abrir peça
                  </Button>
                ) : null}
                {editable &&
                ['new', 'update'].includes(entry.state) &&
                entry.pieceId &&
                entry.revisionId ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void task(async () => {
                        const result = await applyEntry(entry)
                        setNotice(result.message)
                        await port.synchronize()
                        await refresh()
                      })
                    }
                  >
                    Vincular semana e ordem
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
