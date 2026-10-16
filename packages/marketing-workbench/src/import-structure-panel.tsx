'use client'
import {
  type ImportStructurePreview,
  importStructurePreviewSchema,
  importStructureResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { workspaceAction } from './action-journal'
import { formatLabels } from './editorial-form'
import type { WorkbenchPort } from './port'
import { useImportActions } from './use-import-actions'

export function ImportStructurePanel({
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
  const [preview, setPreview] = useState<ImportStructurePreview | null>(null)
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
      importStructurePreviewSchema.parse(
        await port.request(`/projects/${projectId}/import-sources/${sourceId}/structure`),
      ),
    )
  }
  const applicable =
    preview?.pieces.filter((piece) => ['new', 'update'].includes(piece.state)) ?? []
  const applyPiece = (piece: ImportStructurePreview['pieces'][number]) => {
    if (!preview) throw new Error('Confira a fonte antes de converter')
    return workspaceAction(
      port,
      `/projects/${projectId}/import-structures`,
      {
        sourceVersionId: preview.sourceVersionId,
        parserVersion: preview.parserVersion,
        key: piece.key,
        expectedMappingId: piece.mappingId,
      },
      importStructureResultSchema,
    )
  }
  return (
    <div className="space-y-2 border-t pt-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void task(refresh)}>
        Conferir peças desta fonte
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
            Copy, cenas e notas de produção entram separadas. As peças ficam em preparação.
            Mensagens de direct são uma versão de texto própria, sem configurar ou enviar
            automações.
          </p>
          {preview.issues.map((issue) => (
            <p key={issue.key} className="text-sm">
              {issue.key}: {issue.message}
            </p>
          ))}
          {!preview.pieces.length ? (
            <p className="text-sm">
              Esta fonte foi preservada como referência. Nenhuma ficha editorial foi reconhecida
              para conversão.
            </p>
          ) : null}
          {editable && applicable.length > 1 ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void batch(applicable, applyPiece, async () => {
                  await port.synchronize()
                  await refresh()
                })
              }
            >
              Aplicar {applicable.length} conversões conferidas
            </Button>
          ) : null}
          {batchRunning ? (
            <Button size="sm" variant="outline" onClick={stop}>
              Interromper após esta peça
            </Button>
          ) : null}
          <ul className="space-y-2">
            {preview.pieces.map((piece) => (
              <li key={piece.key} className="space-y-1 rounded border p-2">
                <p className="font-medium">
                  {piece.key} · {piece.title}
                </p>
                <p className="text-xs">
                  {formatLabels[piece.format]} · {piece.components} componentes
                  {piece.directMessages ? ` · ${piece.directMessages} mensagens de direct` : ''}
                </p>
                {piece.state === 'conflict' ? (
                  <p className="text-sm">
                    A equipe alterou esta peça. A versão do app foi preservada; confira as duas
                    origens antes de continuar.
                  </p>
                ) : null}
                {piece.state === 'imported' || piece.state === 'conflict' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onOpen(piece.pieceId)}
                  >
                    Abrir peça preservada
                  </Button>
                ) : null}
                {editable && (piece.state === 'new' || piece.state === 'update') ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void task(async () => {
                        const result = await applyPiece(piece)
                        setNotice(result.message)
                        await port.synchronize()
                        await refresh()
                      })
                    }
                  >
                    {piece.state === 'new' ? 'Criar peça editável' : 'Aplicar revisão da origem'}
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
