'use client'
import {
  type AssetManifest,
  assetDownloadSchema,
  assetFilename,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AssetPreview } from './asset-preview'
import { errorMessage, type WorkbenchPort } from './port'

export function AssetFileActions({
  port,
  manifest,
}: {
  port: WorkbenchPort
  manifest: AssetManifest
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [download, setDownload] = useState<string | null>(null)
  const lock = useRef(false),
    live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  return (
    <div className="space-y-2 text-sm">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (lock.current) return
          lock.current = true
          setBusy(true)
          setError('')
          setMessage('')
          setDownload(null)
          void (async () => {
            if (port.exportAssetFile) {
              const saved = await port.exportAssetFile({
                projectId: manifest.projectId,
                assetId: manifest.id,
                expectedHash: manifest.sha256,
              })
              if (live.current)
                setMessage(saved ? 'Arquivo salvo e conferido.' : 'Exportação cancelada.')
            } else {
              const file = assetDownloadSchema.parse(
                await port.request(`/projects/${manifest.projectId}/assets/${manifest.id}/export`),
              )
              if (
                file.manifest.id !== manifest.id ||
                file.manifest.projectId !== manifest.projectId ||
                file.manifest.sha256 !== manifest.sha256
              )
                throw new Error('O arquivo recebido não corresponde à referência selecionada')
              if (live.current) setDownload(file.url)
            }
          })()
            .catch((error) => {
              if (live.current) setError(errorMessage(error))
            })
            .finally(() => {
              lock.current = false
              if (live.current) setBusy(false)
            })
        }}
      >
        {port.exportAssetFile ? 'Salvar arquivo' : 'Preparar download'}
      </Button>
      {download ? (
        <p>
          <a
            href={download}
            download={assetFilename(manifest.name)}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Baixar {manifest.name}
          </a>
          <span className="block text-xs text-muted-foreground">
            Link disponível por cinco minutos. Prepare outro se expirar.
          </span>
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ReferenceFile({
  port,
  projectId,
  assetId,
}: {
  port: WorkbenchPort
  projectId: string
  assetId: string
}) {
  const [manifest, setManifest] = useState<AssetManifest | null>(null),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false)
  const latest = useRef(0)
  const load = useCallback(async () => {
    const request = ++latest.current
    setError('')
    await port
      .request(`/projects/${projectId}/assets/${assetId}`)
      .then((value) => {
        const file = uploadViewSchema.parse(value)
        if (
          file.manifest.projectId !== projectId ||
          file.manifest.id !== assetId ||
          file.state !== 'confirmed'
        )
          throw new Error('Arquivo ainda não confirmado neste projeto')
        if (request === latest.current) setManifest(file.manifest)
      })
      .catch((error) => {
        if (request === latest.current) setError(errorMessage(error))
      })
  }, [port, projectId, assetId])
  useEffect(() => {
    void load()
    return () => {
      latest.current++
    }
  }, [load])
  return (
    <li className="space-y-2 rounded-lg border p-3">
      {error ? (
        <>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Conferir novamente
          </Button>
        </>
      ) : manifest ? (
        <>
          <p className="break-all text-sm font-medium">{manifest.name}</p>
          <AssetFileActions port={port} manifest={manifest} />
          {/^(image|video|audio)\//.test(manifest.mime) ? (
            <Button variant="ghost" size="sm" onClick={() => setPreview((value) => !value)}>
              {preview ? 'Fechar prévia' : 'Conferir mídia'}
            </Button>
          ) : null}
          {preview ? (
            <AssetPreview
              port={port}
              projectId={projectId}
              assetId={assetId}
              alt={manifest.name}
              mediaType={
                manifest.mime.startsWith('video/')
                  ? 'video'
                  : manifest.mime.startsWith('audio/')
                    ? 'audio'
                    : 'image'
              }
            />
          ) : null}
        </>
      ) : (
        <p role="status">Carregando arquivo…</p>
      )}
    </li>
  )
}
export function EvidenceAttachments({
  port,
  projectId,
  assetIds,
}: {
  port: WorkbenchPort
  projectId: string
  assetIds: string[]
}) {
  const [open, setOpen] = useState(false),
    [limit, setLimit] = useState(10)
  return (
    <div className="mt-4 space-y-3">
      <Button variant="outline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Arquivos desta referência ({assetIds.length})
      </Button>
      {open ? (
        <>
          <ul className="space-y-3">
            {assetIds.slice(0, limit).map((assetId) => (
              <ReferenceFile key={assetId} port={port} projectId={projectId} assetId={assetId} />
            ))}
          </ul>
          {limit < assetIds.length ? (
            <Button variant="outline" onClick={() => setLimit((value) => value + 10)}>
              Mais arquivos
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
