'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Spinner } from '@sistemazero/ui/spinner'
import { CloudDownload, HardDriveUpload, ImageOff, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { type ApiError, apiGet } from '@/lib/api'
import type { AssetView, MarketingPage } from '@/lib/types'
import { AssetCard } from './asset-card'
import { AssetDetailDialog } from './asset-detail-dialog'
import { DriveImportDialog } from './drive-import-dialog'
import { UploadDropzone } from './upload-dropzone'

const PAGE_SIZE = 50

/**
 * Biblioteca de mídia: grid paginado ("Carregar mais"), upload presigned com
 * fila de progresso, importação do Drive e detalhe com vínculo/kind. O filtro
 * por nome é CLIENT-SIDE sobre a página carregada (o backend não tem `q`).
 */
export function MidiaClient() {
  const [assets, setAssets] = useState<AssetView[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const [filter, setFilter] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [driveOpen, setDriveOpen] = useState(false)
  const openPickerRef = useRef<(() => void) | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const page = await apiGet<MarketingPage<AssetView>>(
        `/api/marketing/media?limit=${PAGE_SIZE}&offset=0`,
      )
      setAssets(page.items)
      setHasMore(page.hasMore)
      setNotConfigured(false)
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 503 && apiError.code === 'MEDIA_NOT_CONFIGURED') {
        setNotConfigured(true)
      } else {
        setFailed(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const page = await apiGet<MarketingPage<AssetView>>(
        `/api/marketing/media?limit=${PAGE_SIZE}&offset=${assets.length}`,
      )
      // Dedupe por id: um upload recém-inserido no topo também vem na página.
      setAssets((current) => {
        const seen = new Set(current.map((a) => a.id))
        return [...current, ...page.items.filter((a) => !seen.has(a.id))]
      })
      setHasMore(page.hasMore)
    } catch (error) {
      const apiError = error as ApiError
      setFailed(apiError.status !== 503)
    } finally {
      setLoadingMore(false)
    }
  }

  const upsertAsset = useCallback((asset: AssetView) => {
    setAssets((current) => {
      const exists = current.some((a) => a.id === asset.id)
      return exists ? current.map((a) => (a.id === asset.id ? asset : a)) : [asset, ...current]
    })
  }, [])

  const onStorageUnavailable = useCallback(() => setNotConfigured(true), [])

  const normalizedFilter = filter.trim().toLowerCase()
  const visible = useMemo(
    () =>
      normalizedFilter
        ? assets.filter((a) => a.filename.toLowerCase().includes(normalizedFilter))
        : assets,
    [assets, normalizedFilter],
  )
  const detailAsset = detailId ? (assets.find((a) => a.id === detailId) ?? null) : null

  if (notConfigured) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Armazenamento não configurado neste ambiente"
        description="Defina as credenciais de mídia no backend de marketing para usar a biblioteca."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nome"
            aria-label="Filtrar arquivos por nome"
          />
          <p className="mt-1 text-xs text-muted-foreground">Filtra os itens desta página.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => setDriveOpen(true)}>
            <CloudDownload aria-hidden />
            Importar do Drive
          </Button>
          <Button onClick={() => openPickerRef.current?.()}>
            <HardDriveUpload aria-hidden />
            Enviar arquivos
          </Button>
        </div>
      </div>

      <UploadDropzone
        onUploaded={upsertAsset}
        onStorageUnavailable={onStorageUnavailable}
        openPickerRef={openPickerRef}
      />

      {failed ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar a biblioteca.
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Tentar de novo
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title={
            normalizedFilter ? 'Nenhum arquivo com esse nome nesta página' : 'Biblioteca vazia'
          }
          description={
            normalizedFilter
              ? 'O filtro busca só nos itens já carregados. Limpe o filtro ou carregue mais.'
              : 'Envie arquivos ou importe do Drive para começar.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onClick={() => setDetailId(asset.id)} />
            ))}
          </div>
          {hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Spinner /> : null}
                Carregar mais
              </Button>
            </div>
          ) : null}
        </>
      )}

      {detailAsset ? (
        <AssetDetailDialog
          asset={detailAsset}
          open
          onClose={() => setDetailId(null)}
          onUpdated={upsertAsset}
        />
      ) : null}
      <DriveImportDialog
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        onImported={upsertAsset}
      />
    </div>
  )
}
