'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { ExternalLink, Link2, Link2Off } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { StageBadge } from '@/components/shared/stage-badge'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { AssetKind, AssetView, ContentSummaryView, MarketingPage } from '@/lib/types'
import { ASSET_KINDS } from '@/lib/types'
import { formatBytes, KIND_LABELS, resolveAssetUrl } from './media-utils'

/**
 * Detalhe do asset: preview grande (URL resolvida), metadados, troca de kind,
 * vínculo com conteúdo (busca debounced) e cópia do link temporário (24h).
 */
export function AssetDetailDialog({
  asset,
  open,
  onClose,
  onUpdated,
}: {
  asset: AssetView
  open: boolean
  onClose: () => void
  /** Recebe a view atualizada após PATCH (kind/vínculo) p/ o grid refletir. */
  onUpdated: (view: AssetView) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [linkedTitle, setLinkedTitle] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<ContentSummaryView[]>([])
  const [searching, setSearching] = useState(false)

  const isImage = asset.contentType.startsWith('image/')
  const isVideo = asset.contentType.startsWith('video/')
  const isAudio = asset.contentType.startsWith('audio/')
  const isPdf = asset.contentType === 'application/pdf'
  const ready = asset.status === 'ready'

  // Preview: resolve a URL ao abrir (cache module-level segura re-aberturas).
  useEffect(() => {
    if (!open || !ready) return
    let alive = true
    setPreviewFailed(false)
    resolveAssetUrl(asset.id)
      .then((url) => {
        if (alive) setPreviewUrl(url)
      })
      .catch(() => {
        if (alive) setPreviewFailed(true)
      })
    return () => {
      alive = false
    }
  }, [open, ready, asset.id])

  // Título do conteúdo vinculado (best-effort — sem título, mostra o id).
  useEffect(() => {
    if (!open || !asset.contentId) {
      setLinkedTitle(null)
      return
    }
    let alive = true
    apiGet<{ title?: string }>(`/api/marketing/contents/${asset.contentId}`)
      .then((detail) => {
        if (alive) setLinkedTitle(detail.title ?? null)
      })
      .catch(() => {
        if (alive) setLinkedTitle(null)
      })
    return () => {
      alive = false
    }
  }, [open, asset.contentId])

  // Busca de conteúdo debounced (300ms) p/ vincular.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) {
      setOptions([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      apiGet<MarketingPage<ContentSummaryView>>(
        `/api/marketing/contents?q=${encodeURIComponent(q)}&limit=20`,
      )
        .then((page) => {
          setOptions(page.items)
          setSearching(false)
        })
        .catch(() => {
          setOptions([])
          setSearching(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [open, query])

  async function patchAsset(body: { kind?: AssetKind; contentId?: string | null }) {
    setSaving(true)
    try {
      const view = await apiSend<AssetView>(`/api/marketing/media/${asset.id}`, 'PATCH', body)
      onUpdated(view)
      return true
    } catch (error) {
      toast.error((error as ApiError).message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function copyTemporaryLink() {
    setCopying(true)
    try {
      const url = await resolveAssetUrl(asset.id)
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado. Expira em 24 horas.')
    } catch {
      toast.error('Não foi possível copiar o link. Tente novamente.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={asset.filename}
      description={`${asset.contentType} · ${formatBytes(asset.sizeBytes)} · enviado em ${formatDate(asset.createdAt)}`}
      className="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="outline" onClick={copyTemporaryLink} disabled={copying || !ready}>
            {copying ? <Spinner /> : <Link2 aria-hidden />}
            Copiar link temporário
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {!ready ? (
            <p className="p-6 text-sm text-muted-foreground">
              O arquivo ainda não está pronto. Atualize a biblioteca em instantes.
            </p>
          ) : previewFailed ? (
            <p className="p-6 text-sm text-destructive">Não foi possível carregar o preview.</p>
          ) : !previewUrl ? (
            <Spinner className="my-10 size-5" />
          ) : isImage ? (
            // biome-ignore lint/performance/noImgElement: URL presigned 24h do R2 (host dinâmico) não passa pelo otimizador do next/image
            <img src={previewUrl} alt={asset.filename} className="max-h-80 w-full object-contain" />
          ) : isVideo ? (
            // biome-ignore lint/a11y/useMediaCaption: brutos/finais internos não têm legenda
            <video controls src={previewUrl} className="max-h-80 w-full" />
          ) : isAudio ? (
            // biome-ignore lint/a11y/useMediaCaption: áudios internos não têm legenda
            <audio controls src={previewUrl} className="w-full px-4 py-8" />
          ) : isPdf ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 p-8 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              Abrir PDF em outra aba
            </a>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Sem preview para este tipo.</p>
          )}
        </div>

        <Field label="Tipo do arquivo na biblioteca" htmlFor="asset-kind">
          <Select
            id="asset-kind"
            value={asset.kind}
            disabled={saving}
            onChange={(e) => void patchAsset({ kind: e.target.value as AssetKind })}
          >
            {ASSET_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-medium">Conteúdo vinculado</p>
          {asset.contentId ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="truncate text-sm" title={linkedTitle ?? asset.contentId}>
                {linkedTitle ?? asset.contentId}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void patchAsset({ contentId: null })}
              >
                <Link2Off aria-hidden />
                Desvincular
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem vínculo. Busque um conteúdo abaixo para vincular.
            </p>
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conteúdo pelo título"
            aria-label="Buscar conteúdo para vincular"
          />
          {searching ? (
            <p className="text-xs text-muted-foreground">Buscando…</p>
          ) : options.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {options.map((content) => (
                <li key={content.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      void patchAsset({ contentId: content.id }).then((ok) => {
                        if (ok) {
                          setQuery('')
                          setOptions([])
                        }
                      })
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <span className="truncate">{content.title}</span>
                    <StageBadge stage={content.stage} />
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="text-xs text-muted-foreground">Nenhum conteúdo encontrado.</p>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
