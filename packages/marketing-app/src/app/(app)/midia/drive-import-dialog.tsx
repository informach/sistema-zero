'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDateOnly } from '@/lib/format'
import type { AssetView, DriveFilesResponse, DriveFileView } from '@/lib/types'
import { formatBytes } from './media-utils'

const IMPORT_STARTED_TOAST = 'Importação iniciada. O arquivo aparece na biblioteca quando terminar.'

function importErrorMessage(error: ApiError): string {
  if (error.code === 'ACCOUNT_NOT_CONNECTED') {
    return 'Conecte a conta do Google em Conexões para importar do Drive.'
  }
  if (error.code === 'OAUTH_NOT_CONFIGURED') {
    return 'A integração com o Google não está configurada neste ambiente.'
  }
  return error.message
}

/**
 * Importação do Google Drive: colar um link OU escolher no picker (busca
 * debounced na conta conectada). O backend transfere em background — o asset
 * entra no grid como `importing` e vira `ready` num "Atualizar" depois.
 */
export function DriveImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  /** Recebe o asset `importing` recém-criado p/ entrar no grid. */
  onImported: (asset: AssetView) => void
}) {
  const [driveUrl, setDriveUrl] = useState('')
  const [importingUrl, setImportingUrl] = useState(false)
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<DriveFileView[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [listing, setListing] = useState(false)
  const [listError, setListError] = useState<ApiError | null>(null)
  const [importingFileId, setImportingFileId] = useState<string | null>(null)

  // Lista do picker: carrega ao abrir e re-busca com debounce quando `query` muda.
  useEffect(() => {
    if (!open) return
    let alive = true
    setListing(true)
    setListError(null)
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const search = params.size > 0 ? `?${params}` : ''
      apiGet<DriveFilesResponse>(`/api/marketing/drive/files${search}`)
        .then((data) => {
          if (!alive) return
          setFiles(data.files)
          setNextPageToken(data.nextPageToken)
          setListing(false)
        })
        .catch((error) => {
          if (!alive) return
          setListError(error as ApiError)
          setFiles([])
          setNextPageToken(null)
          setListing(false)
        })
    }, 300)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [open, query])

  async function loadMore() {
    if (!nextPageToken) return
    setListing(true)
    try {
      const params = new URLSearchParams({ pageToken: nextPageToken })
      if (query.trim()) params.set('q', query.trim())
      const data = await apiGet<DriveFilesResponse>(`/api/marketing/drive/files?${params}`)
      setFiles((current) => [...current, ...data.files])
      setNextPageToken(data.nextPageToken)
    } catch (error) {
      toast.error(importErrorMessage(error as ApiError))
    } finally {
      setListing(false)
    }
  }

  async function importByUrl() {
    const url = driveUrl.trim()
    if (!url) return
    setImportingUrl(true)
    try {
      const asset = await apiSend<AssetView>('/api/marketing/media/import', 'POST', {
        driveUrl: url,
      })
      toast.success(IMPORT_STARTED_TOAST)
      onImported(asset)
      setDriveUrl('')
      onClose()
    } catch (error) {
      toast.error(importErrorMessage(error as ApiError))
    } finally {
      setImportingUrl(false)
    }
  }

  async function importFile(file: DriveFileView) {
    setImportingFileId(file.id)
    try {
      const asset = await apiSend<AssetView>('/api/marketing/media/import', 'POST', {
        driveFileId: file.id,
      })
      toast.success(IMPORT_STARTED_TOAST)
      onImported(asset)
    } catch (error) {
      toast.error(importErrorMessage(error as ApiError))
    } finally {
      setImportingFileId(null)
    }
  }

  const notConnected = listError?.code === 'ACCOUNT_NOT_CONNECTED'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar do Drive"
      description="Cole o link de um arquivo ou escolha na conta do Google conectada."
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-end gap-2">
          <Field label="Link do arquivo no Drive" htmlFor="drive-url" className="flex-1">
            <Input
              id="drive-url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              inputMode="url"
            />
          </Field>
          <Button onClick={importByUrl} disabled={importingUrl || !driveUrl.trim()}>
            {importingUrl ? <Spinner /> : null}
            Importar
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ou escolha um arquivo</p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no Drive pelo nome"
            aria-label="Buscar arquivos no Drive"
          />
          {listError ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">{importErrorMessage(listError)}</p>
              {notConnected ? (
                <Link
                  href="/conexoes"
                  className="mt-1 inline-block font-medium text-primary hover:underline"
                >
                  Ir para Conexões
                </Link>
              ) : null}
            </div>
          ) : listing && files.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : files.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum arquivo encontrado no Drive.
            </p>
          ) : (
            <>
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.sizeBytes !== null
                          ? formatBytes(file.sizeBytes)
                          : 'Tamanho desconhecido'}
                        {file.modifiedTime ? ` · ${formatDateOnly(file.modifiedTime)}` : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={importingFileId !== null}
                      onClick={() => void importFile(file)}
                    >
                      {importingFileId === file.id ? <Spinner /> : null}
                      Importar
                    </Button>
                  </li>
                ))}
              </ul>
              {nextPageToken ? (
                <Button variant="ghost" size="sm" onClick={loadMore} disabled={listing}>
                  {listing ? <Spinner /> : null}
                  Carregar mais
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
