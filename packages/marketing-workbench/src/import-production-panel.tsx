'use client'
import {
  type ImportProductionPreview,
  importProductionPreviewSchema,
  type ProductionFolder,
  type ProductionReport,
  productionFolderSchema,
  productionShareResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import { sharedProductionReports } from './import-production-receipts'
import { applyImportSequence } from './import-sequence'
import type { WorkbenchPort } from './port'
import { ProductionReviewDetails } from './production-review-details'
export function ImportProductionPanel({
  inventory,
  request,
  projectId,
  inventoryId,
  busy,
  run,
  canShare,
  onShared,
}: {
  inventory: NonNullable<WorkbenchPort['inventory']>
  request: WorkbenchPort['request']
  projectId: string
  inventoryId: string
  busy: boolean
  run(work: () => Promise<void>): void
  canShare(product: string): boolean
  onShared(report: ProductionReport): void
}) {
  const fieldId = useId(),
    live = useRef(true),
    stopBatch = useRef(false)
  const [folders, setFolders] = useState<ProductionFolder[] | null>(null),
    [selected, setSelected] = useState(''),
    [preview, setPreview] = useState<ImportProductionPreview | null>(null)
  const [shareNotice, setShareNotice] = useState('')
  const [batchActive, setBatchActive] = useState(false)
  const [batchNotice, setBatchNotice] = useState('')
  const shareable = (folders ?? []).filter((folder) => canShare(folder.product))
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      stopBatch.current = true
    }
  }, [])
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Conferência das artes locais">
      <p className="text-sm font-medium">Conferir artes com as copies de origem</p>
      <p className="text-xs text-muted-foreground">
        O desktop confere os arquivos deste inventário. A conferência compara as fontes locais;
        ainda é preciso vincular a mídia à revisão da peça no projeto e revisar o resultado visual.
      </p>
      {folders === null ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const rows = z
                .array(productionFolderSchema)
                .max(1000)
                .parse(await inventory.productionFolders(projectId, inventoryId))
              if (live.current) {
                setFolders(rows)
                setSelected(rows[0]?.path ?? '')
              }
            })
          }
        >
          Localizar peças produzidas
        </Button>
      ) : folders.length ? (
        <>
          <label className="block text-sm" htmlFor={fieldId}>
            Peça e pasta de produção
          </label>
          <Select
            id={fieldId}
            disabled={busy}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value)
              setPreview(null)
              setShareNotice('')
            }}
          >
            {folders.map((folder) => (
              <option key={folder.path} value={folder.path}>
                {folder.key} · {folder.product} · {folder.path.split('/').at(-1)}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !selected}
            onClick={() =>
              run(async () => {
                if (live.current) setPreview(null)
                const value = importProductionPreviewSchema.parse(
                  await inventory.reviewProduction(projectId, inventoryId, selected),
                )
                if (value.inventoryId !== inventoryId || value.review.folder.path !== selected)
                  throw new Error('A conferência retornou outra origem')
                if (live.current) setPreview(value)
              })
            }
          >
            Conferir integridade e versões
          </Button>
          {shareable.length ? (
            <div className="space-y-2 rounded border p-3">
              <p className="text-xs text-muted-foreground">
                Compartilhe as {shareable.length} conferências do produto vinculado. Cada pasta é
                conferida antes do primeiro envio; versões divergentes e peças incompletas continuam
                identificadas no relatório. A retomada conserva os relatórios já compartilhados.
                Para arquivos locais alterados, confira novamente a pasta e compare os inventários.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    stopBatch.current = false
                    setBatchActive(true)
                    setBatchNotice('Conferindo as pastas do produto…')
                    let shared = 0,
                      pending = 0,
                      reviewed = 0
                    const describe = () =>
                      `${shared} conferências compartilhadas; ${pending} aguardam verificação de arquivos; ${reviewed} de ${shareable.length} pastas processadas.`
                    try {
                      const saved = new Map(
                        (
                          await sharedProductionReports(
                            request,
                            projectId,
                            inventoryId,
                            () => !live.current || stopBatch.current,
                          )
                        ).map((report) => [report.review.folder.path, report]),
                      )
                      const result = await applyImportSequence(
                        shareable,
                        async (folder) => {
                          const existing = saved.get(folder.path)
                          const result = productionShareResultSchema.parse(
                            existing
                              ? { status: 'shared', report: existing }
                              : await inventory.shareProduction(
                                  projectId,
                                  inventoryId,
                                  folder.path,
                                ),
                          )
                          if (result.status === 'verifying') pending++
                          else {
                            if (
                              result.report.projectId !== projectId ||
                              result.report.inventoryId !== inventoryId ||
                              result.report.review.folder.path !== folder.path
                            )
                              throw new Error(
                                'O relatório retornou outra origem; a sequência foi interrompida',
                              )
                            shared++
                            if (live.current) onShared(result.report)
                          }
                          return { status: result.status, message: '' }
                        },
                        () => stopBatch.current || !live.current,
                        (completed) => {
                          reviewed = completed
                          if (live.current) setBatchNotice(describe())
                        },
                      )
                      if (live.current)
                        setBatchNotice(
                          `${describe()} ${result.stopped ? 'Sequência pausada.' : 'Sequência concluída.'} ${pending ? 'Use o mesmo botão para retomar as pendentes.' : ''}`,
                        )
                    } catch (error) {
                      if (live.current)
                        setBatchNotice(
                          `${describe()} Sequência interrompida; as conferências confirmadas foram preservadas.`,
                        )
                      throw error
                    } finally {
                      if (live.current) setBatchActive(false)
                    }
                  })
                }
              >
                Compartilhar {shareable.length} conferências do produto
              </Button>
              {batchActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    stopBatch.current = true
                    setBatchNotice('A sequência será pausada ao terminar esta peça.')
                  }}
                >
                  Pausar após esta peça
                </Button>
              ) : null}
              {batchNotice ? (
                <p role="status" className="text-sm">
                  {batchNotice}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm">
          Nenhuma pasta no formato de produção reconhecido. As demais origens continuam disponíveis
          para carga e conferência individual.
        </p>
      )}
      {preview ? (
        <div className="space-y-2 text-sm" aria-live="polite">
          <p className="text-xs text-muted-foreground">
            {preview.review.files.length} arquivos numerados ·{' '}
            {new Date(preview.reviewedAt).toLocaleString('pt-BR')} · Conferência local; não aprova
            nem publica.
          </p>
          <ProductionReviewDetails review={preview.review} />
          <p className="text-xs text-muted-foreground">
            Compartilhar envia os metadados e originais usados na conferência. O servidor recalcula
            o relatório; a copy e a arte da peça ainda não são alteradas.
          </p>
          <Button
            size="sm"
            disabled={busy || !canShare(preview.review.folder.product)}
            onClick={() =>
              run(async () => {
                setShareNotice('')
                const result = productionShareResultSchema.parse(
                  await inventory.shareProduction(
                    projectId,
                    inventoryId,
                    preview.review.folder.path,
                  ),
                )
                if (!live.current) return
                if (result.status === 'verifying')
                  setShareNotice(
                    `${result.pending} arquivos aguardam a conferência no servidor. Use o mesmo botão para retomar; os originais recebidos foram preservados.`,
                  )
                else {
                  setShareNotice('Relatório e originais disponíveis para a equipe.')
                  onShared(result.report)
                }
              })
            }
          >
            Compartilhar conferência e originais
          </Button>
          {!canShare(preview.review.folder.product) ? (
            <p className="text-xs text-muted-foreground">
              Confirme o inventário e o vínculo do produto para compartilhar.
            </p>
          ) : null}
          {shareNotice ? <p role="status">{shareNotice}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
