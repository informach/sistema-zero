'use client'
import {
  type Delivery,
  deliveryFormatSchema,
  deliveryFormatsFor,
  deliveryOptionsSchema,
  deliveryPageSchema,
  deliverySchema,
  type Project,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { z } from 'zod'
import { workspaceAction } from './action-journal'
import { DeliveryMetrics } from './delivery-metrics'
import { DeliveryResolution } from './delivery-resolution'
import { errorMessage, type WorkbenchPort } from './port'

const labels: Record<Delivery['format'], string> = {
  ig_feed: 'Post no Instagram',
  ig_carousel: 'Carrossel no Instagram',
  ig_reels: 'Reels no Instagram',
  ig_story: 'Stories no Instagram',
  fb_post: 'Post no Facebook',
  fb_reels: 'Reels no Facebook',
  yt_video: 'Vídeo no YouTube',
  yt_short: 'Short no YouTube',
  tt_video: 'Vídeo no TikTok',
}
const statuses: Record<Delivery['status'], string> = {
  draft: 'Preparada',
  ready: 'Pronta',
  scheduled: 'Agendada',
  publishing: 'Enviando',
  awaiting_manual: 'Aguardando publicação manual',
  published: 'Publicada',
  failed: 'Precisa de atenção',
  canceled: 'Cancelada',
}
const networkOf = (format: Delivery['format']) =>
  format.startsWith('ig_')
    ? 'instagram'
    : format.startsWith('fb_')
      ? 'facebook'
      : format.startsWith('yt_')
        ? 'youtube'
        : 'tiktok'
function localTime(iso: string | null) {
  const time = iso ? new Date(iso) : new Date(Date.now() + 3600000)
  return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function DeliveryPanel({
  port,
  project,
  representationId,
  edition,
  onSelectEdition,
  onOpenAnalysis,
}: {
  port: WorkbenchPort
  project: Project
  representationId: string
  edition: { id: string; hash: string; format: string } | null
  onSelectEdition: (id: string) => Promise<void>
  onOpenAnalysis?: (id: string) => Promise<void>
}) {
  const id = useId(),
    base = `/projects/${project.id}`,
    canPublish = project.permissions.includes('publish')
  const [options, setOptions] = useState<z.infer<typeof deliveryOptionsSchema>>({
    automaticFormats: [],
    verifiableNetworks: [],
    accounts: [],
  })
  const [items, setItems] = useState<Delivery[]>([]),
    [cursor, setCursor] = useState<string | null | undefined>(undefined),
    [selectedId, setSelectedId] = useState(''),
    [reviewedVersion, setReviewedVersion] = useState<number | null>(null)
  const [format, setFormat] = useState<Delivery['format']>('ig_feed'),
    [origin, setOrigin] = useState<{ publicationId: string; editionId: string } | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [date, setDate] = useState(localTime(null)),
    [mode, setMode] = useState<'manual' | 'auto'>('manual'),
    [account, setAccount] = useState('')
  const [url, setUrl] = useState(''),
    [confirmed, setConfirmed] = useState(false)
  const selected = items.find((item) => item.id === selectedId),
    loading = useRef(false)
  const refresh = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const page = deliveryPageSchema.parse(
        await port.request(`${base}/representations/${representationId}/deliveries`),
      )
      setItems((old) => [
        ...page.items,
        ...old.filter((item) => !page.items.some((fresh) => fresh.id === item.id)),
      ])
      setCursor((old) => (old === undefined ? page.nextCursor : old))
    } finally {
      loading.current = false
    }
  }, [port, base, representationId])
  useEffect(() => {
    let live = true
    void port
      .request(`${base}/delivery-options`)
      .then((raw) => {
        if (live) setOptions(deliveryOptionsSchema.parse(raw))
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    void refresh().catch((error) => {
      if (live) setError(errorMessage(error))
    })
    const timer = setInterval(() => {
      if (live && document.visibilityState === 'visible')
        void refresh().catch((error) => {
          if (live) setError(errorMessage(error))
        })
    }, 10000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, base, refresh])
  useEffect(() => {
    setFormat(
      edition?.format === 'story'
        ? 'ig_story'
        : edition?.format === 'carousel'
          ? 'ig_carousel'
          : edition?.format === 'reel'
            ? 'ig_reels'
            : edition?.format === 'long-video'
              ? 'yt_video'
              : 'ig_feed',
    )
  }, [edition?.format])
  const work = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const select = (item: Delivery) => {
    setSelectedId(item.id)
    setReviewedVersion(item.version)
    setDate(localTime(item.scheduledAt))
    setMode(item.publishMode)
    setAccount(item.socialAccountId ?? '')
    setUrl(item.externalUrl ?? '')
    setConfirmed(false)
  }
  const changed = (item: Delivery) => {
    setItems((old) => [item, ...old.filter((previous) => previous.id !== item.id)])
    select(item)
  }
  const act = async (input: Record<string, unknown>) => {
    if (!selected || selected.version !== reviewedVersion)
      throw new Error(
        'A entrega foi atualizada por outra pessoa ou pelo publicador. Recarregue a conferência.',
      )
    const result = await workspaceAction(
      port,
      `${base}/deliveries/${selected.id}/actions`,
      { schemaVersion: 1, version: selected.version, expectedHash: selected.editionHash, ...input },
      deliverySchema,
    )
    changed(result)
    setMessage('Entrega atualizada no servidor.')
    await port.synchronize()
  }
  const selectedOrigin = origin && origin.editionId === edition?.id ? origin.publicationId : null
  const actionable =
    selected &&
    selected.version === reviewedVersion &&
    !selected.started &&
    !['published', 'publishing', 'canceled'].includes(selected.status)
  return (
    <section className="mt-4 space-y-3 border-t pt-4" aria-label="Distribuição da edição aprovada">
      <h4 className="font-semibold">Distribuição</h4>
      <p className="text-sm text-muted-foreground">
        Cada entrega usa os arquivos e a copy de uma edição aprovada. Uma repostagem conserva o
        histórico da anterior.
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
      {edition ? (
        <div className="space-y-2 rounded-lg border p-3">
          <label htmlFor={`${id}-destination`} className="text-sm">
            Destino da edição conferida
            <Select
              id={`${id}-destination`}
              value={format}
              disabled={busy || !canPublish}
              onChange={(event) => setFormat(deliveryFormatSchema.parse(event.target.value))}
            >
              {deliveryFormatsFor(edition.format).map((value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ))}
            </Select>
          </label>
          {selectedOrigin ? (
            <p className="text-xs">Nova entrega vinculada à publicação anterior selecionada.</p>
          ) : null}
          <Button
            disabled={busy || !canPublish}
            variant="outline"
            size="sm"
            onClick={() =>
              void work(async () => {
                const created = await workspaceAction(
                  port,
                  `${base}/deliveries`,
                  {
                    schemaVersion: 1,
                    editionId: edition.id,
                    expectedHash: edition.hash,
                    format,
                    sourcePublicationId: selectedOrigin,
                  },
                  deliverySchema,
                )
                changed(created)
                setOrigin(null)
                setMessage('Entrega preparada. Escolha o horário e o modo de publicação.')
                await port.synchronize()
              })
            }
          >
            Preparar {selectedOrigin ? 'repostagem' : 'entrega'}
          </Button>
        </div>
      ) : (
        <p className="text-sm">Abra uma edição aprovada acima para preparar a entrega.</p>
      )}
      {!canPublish ? (
        <p className="text-sm text-muted-foreground">
          O agendamento e a confirmação exigem permissão de publicação neste projeto.
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void work(refresh)}>
          Atualizar entregas
        </Button>
        <span className="text-xs text-muted-foreground">{items.length} entrega(s)</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Button
              variant={selectedId === item.id ? 'secondary' : 'ghost'}
              size="sm"
              className="h-auto whitespace-normal text-left"
              onClick={() => select(item)}
            >
              {labels[item.format]} · {statuses[item.status]} ·{' '}
              {new Date(item.scheduledAt ?? item.createdAt).toLocaleString('pt-BR')}
            </Button>
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            void work(async () => {
              const page = deliveryPageSchema.parse(
                await port.request(
                  `${base}/representations/${representationId}/deliveries?before=${cursor}`,
                ),
              )
              setItems((old) => [
                ...old,
                ...page.items.filter((item) => !old.some((previous) => previous.id === item.id)),
              ])
              setCursor(page.nextCursor)
            })
          }
        >
          Carregar entregas anteriores
        </Button>
      ) : null}
      {selected ? (
        <div className="space-y-3 rounded-lg bg-muted/50 p-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void work(() => onSelectEdition(selected.editionId))}
            >
              Conferir edição desta entrega
            </Button>
            {selected.status === 'published' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !canPublish}
                onClick={() =>
                  void work(async () => {
                    await onSelectEdition(selected.editionId)
                    setOrigin({ publicationId: selected.id, editionId: selected.editionId })
                    setFormat(selected.format)
                    setMessage(
                      'Confira a edição e clique em Preparar repostagem. A publicação anterior será preservada.',
                    )
                  })
                }
              >
                Preparar uma repostagem
              </Button>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm">{selected.caption}</p>
          {selected.version !== reviewedVersion ? (
            <p className="text-sm">
              Esta entrega recebeu uma atualização.{' '}
              <Button variant="outline" size="sm" onClick={() => select(selected)}>
                Recarregar conferência
              </Button>
            </p>
          ) : null}
          {selected.lastError ? (
            <p role="alert" className="text-sm text-destructive">
              {selected.lastError}
            </p>
          ) : null}
          {selected.started ? (
            <p className="text-sm">
              O provedor já iniciou este envio. Os dados permanecem fixos até a reconciliação do
              resultado.
            </p>
          ) : null}
          {actionable && canPublish ? (
            <>
              <label htmlFor={`${id}-time`} className="block text-sm">
                Horário ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                <Input
                  id={`${id}-time`}
                  type="datetime-local"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  disabled={busy}
                />
              </label>
              <label htmlFor={`${id}-mode`} className="block text-sm">
                Modo
                <Select
                  id={`${id}-mode`}
                  value={mode}
                  disabled={busy}
                  onChange={(event) => setMode(event.target.value === 'auto' ? 'auto' : 'manual')}
                >
                  <option value="manual">Publicação manual com confirmação</option>
                  {options.automaticFormats.includes(selected.format) ? (
                    <option value="auto">Envio automático</option>
                  ) : null}
                </Select>
              </label>
              {mode === 'auto' ? (
                <label htmlFor={`${id}-account`} className="block text-sm">
                  Conta conectada
                  <Select
                    id={`${id}-account`}
                    value={account}
                    disabled={busy}
                    onChange={(event) => setAccount(event.target.value)}
                  >
                    <option value="">Escolha uma conta</option>
                    {options.accounts
                      .filter((item) => item.network === networkOf(selected.format))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayName}
                        </option>
                      ))}
                  </Select>
                </label>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy || !date || (mode === 'auto' && !account)}
                  onClick={() =>
                    void work(() =>
                      act({
                        action: 'schedule',
                        scheduledAt: new Date(date).toISOString(),
                        publishMode: mode,
                        socialAccountId: mode === 'auto' ? account : null,
                      }),
                    )
                  }
                >
                  {mode === 'auto' ? 'Agendar envio automático' : 'Agendar entrega manual'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void work(() => act({ action: 'cancel' }))}
                >
                  Cancelar entrega
                </Button>
              </div>
              {selected.publishMode === 'manual' ? (
                <details>
                  <summary className="cursor-pointer text-sm">
                    Confirmar publicação manual realizada
                  </summary>
                  <div className="mt-3 space-y-3">
                    <label htmlFor={`${id}-url`} className="block text-sm">
                      Link da publicação
                      <Input
                        id={`${id}-url`}
                        type="url"
                        value={url}
                        disabled={busy}
                        onChange={(event) => setUrl(event.target.value)}
                      />
                    </label>
                    <label className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={busy}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      Publiquei exatamente a edição desta entrega, com todos os arquivos na ordem
                      conferida.
                    </label>
                    <Button
                      size="sm"
                      disabled={busy || !confirmed || !url}
                      onClick={() =>
                        void work(() =>
                          act({
                            action: 'mark-published',
                            externalUrl: url,
                            externalPostId: null,
                            confirmedEdition: true,
                          }),
                        )
                      }
                    >
                      Confirmar publicação desta edição
                    </Button>
                  </div>
                </details>
              ) : null}
            </>
          ) : null}
          {selected.externalUrl ? (
            <p className="break-all text-sm">Link registrado: {selected.externalUrl}</p>
          ) : null}
          {canPublish ? (
            <DeliveryResolution
              key={`${selected.id}:${reviewedVersion}`}
              delivery={selected}
              options={options}
              disabled={busy || selected.version !== reviewedVersion}
              onAction={(input) => work(() => act(input))}
            />
          ) : null}
          {selected.status === 'published' ? (
            <DeliveryMetrics
              key={selected.id}
              port={port}
              delivery={selected}
              onOpenAnalysis={project.permissions.includes('edit') ? onOpenAnalysis : undefined}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
