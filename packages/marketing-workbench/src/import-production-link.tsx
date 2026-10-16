'use client'
import {
  type ProductionLinkPreview,
  productionLinkPreviewSchema,
  productionLinkResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import type { WorkbenchPort } from './port'

export function ImportProductionLink({
  port,
  projectId,
  reportId,
  editable,
  busy,
  run,
  onOpenPiece,
}: {
  port: WorkbenchPort
  projectId: string
  reportId: string
  editable: boolean
  busy: boolean
  run(work: () => Promise<void>): void
  onOpenPiece(id: string): void
}) {
  const [preview, setPreview] = useState<ProductionLinkPreview | null>(null)
  const [notice, setNotice] = useState('')
  async function check() {
    setPreview(
      productionLinkPreviewSchema.parse(
        await port.request(`/projects/${projectId}/production-reports/${reportId}/link`),
      ),
    )
    setNotice('')
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Vínculo das artes à peça">
      <p className="text-sm font-medium">Continuar a peça com estas artes</p>
      <p className="text-xs text-muted-foreground">
        O vínculo preserva a copy, a ordem e os originais. Alterações da equipe exigem nova
        conferência; aprovação e publicação continuam separadas.
      </p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(check)}>
        Conferir vínculo com a peça atual
      </Button>
      {preview?.status === 'blocked' ? (
        <ul className="space-y-1 text-sm">
          {preview.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {preview?.status === 'linked' ? (
        <>
          <p className="text-sm" role="status">
            {preview.link.components.length} artes vinculadas em{' '}
            {new Date(preview.link.createdAt).toLocaleString('pt-BR')}. Este registro preserva a
            importação; revisões posteriores da equipe permanecem na peça.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenPiece(preview.link.pieceId)}
          >
            Abrir peça
          </Button>
        </>
      ) : null}
      {preview?.status === 'ready' ? (
        <>
          <ol className="space-y-1 text-sm">
            {preview.components.map((component) => (
              <li key={component.componentId}>
                {component.position}. {component.path.split('/').at(-1)} · {component.alt}
              </li>
            ))}
          </ol>
          {editable && port.inventory ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const inventory = port.inventory
                  if (!inventory) return
                  const result = productionLinkResultSchema.parse(
                    await inventory.linkProduction(projectId, reportId, preview.planHash),
                  )
                  if (result.status === 'linked') {
                    setPreview(result)
                    setNotice('')
                  } else
                    setNotice(
                      `${result.pending} arquivos aguardam verificação do servidor. Use o mesmo botão para retomar; os envios confirmados serão reutilizados.`,
                    )
                })
              }
            >
              Vincular {preview.components.length} artes à peça
            </Button>
          ) : !port.inventory ? (
            <p className="text-sm">
              A preparação dos arquivos finais é feita no app desktop. Abra esta conferência lá; o
              vínculo aparecerá também na web.
            </p>
          ) : null}
        </>
      ) : null}
      {notice ? (
        <p className="text-sm" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  )
}
