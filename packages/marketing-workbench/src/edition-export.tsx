'use client'
import { type EditionSnapshot, editionDownloadSchema } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

export function EditionExport({
  port,
  editionId,
  hash,
  snapshot,
}: {
  port: WorkbenchPort
  editionId: string
  hash: string
  snapshot: EditionSnapshot
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [download, setDownload] = useState<{
    componentId: string
    url: string
    filename: string
  } | null>(null)
  const representation = snapshot.revisions.find(
    (row) => row.entityId === snapshot.representationId,
  )?.document
  const copy = representation?.kind === 'representation' ? representation.caption : ''
  const work = async (operation: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setMessage('')
    setDownload(null)
    try {
      await operation()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="space-y-3 rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Arquivos para publicação manual
      </summary>
      <p className="text-sm text-muted-foreground">
        Salve os arquivos desta edição na ordem abaixo. A legenda e as descrições acessíveis também
        estão preservadas.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          void work(async () => {
            await navigator.clipboard.writeText(copy)
            setMessage('Legenda aprovada copiada.')
          })
        }
      >
        Copiar legenda aprovada
      </Button>
      <ol className="space-y-3">
        {snapshot.orderedAssets.map((file, index) => (
          <li key={`${file.componentId}:${file.asset.id}`} className="space-y-1 text-sm">
            <p>
              {index + 1}. {file.asset.mime.startsWith('video/') ? 'Vídeo' : 'Imagem'} ·{' '}
              {(file.asset.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <p className="whitespace-pre-wrap text-muted-foreground">{file.alt}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void work(async () => {
                    if (port.exportEditionFile) {
                      const saved = await port.exportEditionFile({
                        projectId: snapshot.projectId,
                        editionId,
                        componentId: file.componentId,
                        assetId: file.asset.id,
                        expectedHash: hash,
                      })
                      setMessage(
                        saved ? `Arquivo ${index + 1} salvo e conferido.` : 'Exportação cancelada.',
                      )
                      return
                    }
                    const result = editionDownloadSchema.parse(
                      await port.request(
                        `/projects/${snapshot.projectId}/editions/${editionId}/files/${file.componentId}`,
                      ),
                    )
                    if (
                      result.editionId !== editionId ||
                      result.componentId !== file.componentId ||
                      result.editionHash !== hash ||
                      result.manifest.id !== file.asset.id ||
                      result.manifest.sha256 !== file.asset.sha256
                    )
                      throw new Error('O download diverge da edição conferida')
                    const url = new URL(result.url)
                    if (url.protocol !== 'https:' || url.username || url.password)
                      throw new Error('Endereço de download inválido')
                    setDownload({
                      componentId: file.componentId,
                      url: url.toString(),
                      filename: result.filename,
                    })
                  })
                }
              >
                {port.location === 'desktop' ? 'Salvar arquivo' : 'Preparar download'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void work(async () => {
                    await navigator.clipboard.writeText(file.alt)
                    setMessage(`Descrição do arquivo ${index + 1} copiada.`)
                  })
                }
              >
                Copiar descrição
              </Button>
              {download?.componentId === file.componentId ? (
                <a
                  className="self-center underline"
                  href={download.url}
                  download={download.filename}
                  rel="noreferrer"
                >
                  Baixar arquivo {index + 1} (link válido por 5 minutos)
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}
