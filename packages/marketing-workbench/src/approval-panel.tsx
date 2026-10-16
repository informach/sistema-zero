'use client'
import {
  approvalPreviewSchema,
  approvedEditionSchema,
  type EditionSummary,
  editionPageSchema,
  editorialCaption,
  type Project,
} from '@sistemazero/marketing-contracts'
import { timelineWebVtt } from '@sistemazero/marketing-production/data'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useId, useState } from 'react'
import type { z } from 'zod'
import { workspaceAction } from './action-journal'
import { AssetPreview } from './asset-preview'
import { DeliveryPanel } from './delivery-panel'
import { EditionExport } from './edition-export'
import { errorMessage, type WorkbenchPort } from './port'

export function ApprovalPanel({
  port,
  project,
  representationId,
  pending,
  onChanged,
  onOpenAnalysis,
}: {
  port: WorkbenchPort
  project: Project
  representationId: string
  pending: boolean
  onChanged: () => Promise<void>
  onOpenAnalysis?: (id: string) => Promise<void>
}) {
  const fieldId = useId(),
    base = `/projects/${project.id}`
  const [preview, setPreview] = useState<z.infer<typeof approvalPreviewSchema> | null>(null)
  const [editions, setEditions] = useState<EditionSummary[]>([]),
    [cursor, setCursor] = useState<string | null | undefined>(undefined)
  const [approvedId, setApprovedId] = useState<string | null>(null)
  const [checked, setChecked] = useState({ copy: false, visual: false, destination: false }),
    [selectedComponentId, setSelectedComponentId] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  useEffect(() => {
    let live = true,
      loading = false
    const refresh = async () => {
      if (!live || loading) return
      loading = true
      try {
        const page = editionPageSchema.parse(
          await port.request(`${base}/representations/${representationId}/editions`),
        )
        if (live) {
          setEditions((old) => [
            ...page.items,
            ...old.filter((item) => !page.items.some((fresh) => fresh.id === item.id)),
          ])
          setCursor((old) => (old === undefined ? page.nextCursor : old))
        }
      } catch (error) {
        if (live) setError(errorMessage(error))
      } finally {
        loading = false
      }
    }
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 10000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, base, representationId])
  const work = async (operation: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await operation()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const load = () =>
    work(async () => {
      const next = approvalPreviewSchema.parse(
        await port.request(`${base}/representations/${representationId}/approval-preview`),
      )
      setPreview(next)
      setApprovedId(null)
      setChecked({ copy: false, visual: false, destination: false })
      setSelectedComponentId(next.snapshot.orderedAssets[0]?.componentId ?? '')
    })
  const approve = () =>
    work(async () => {
      if (!preview || pending || !checked.copy || !checked.visual || !checked.destination)
        throw new Error('Confira os arquivos finais e confirme os três itens antes de aprovar')
      const edition = await workspaceAction(
        port,
        `${base}/editions`,
        {
          schemaVersion: 1,
          representationId,
          expectedHash: preview.hash,
          checks: { copy: true, visual: true, destination: true },
        },
        approvedEditionSchema,
      )
      setEditions((current) => [
        {
          id: edition.id,
          hash: edition.hash,
          approvedBy: edition.approvedBy,
          approvedAt: edition.approvedAt,
          assetCount: edition.snapshot.orderedAssets.length,
        },
        ...current.filter((item) => item.id !== edition.id),
      ])
      setPreview({ hash: edition.hash, snapshot: edition.snapshot })
      setApprovedId(edition.id)
      setMessage(
        'Edição aprovada e fixada aos arquivos conferidos. A entrega ainda não foi agendada nem publicada.',
      )
      await port.synchronize()
      await onChanged()
    })
  const final =
    preview?.snapshot.orderedAssets.find((item) => item.componentId === selectedComponentId) ??
    preview?.snapshot.orderedAssets[0]
  const representation = preview?.snapshot.revisions.find(
    (revision) => revision.entityId === representationId,
  )?.document
  const component = preview?.snapshot.revisions.find(
    (revision) => revision.entityId === final?.componentId,
  )?.document
  return (
    <section className="rounded-xl border p-4" aria-label="Conferência da entrega">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Conferência da entrega</h3>
        <Button variant="outline" size="sm" disabled={busy || pending} onClick={() => void load()}>
          Conferir arquivos finais
        </Button>
      </div>
      {pending ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Sincronize os rascunhos antes de conferir a entrega.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      ) : null}
      {preview ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            A aprovação fixa esta copy, esta ordem e estes arquivos. Alterações futuras criam um
            rascunho novo.
          </p>
          {representation?.kind === 'representation' ? (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="whitespace-pre-wrap">
                {editorialCaption(representation, preview.snapshot.revisions)}
              </p>
              {representation.cta ? <p className="mt-2">{representation.cta}</p> : null}
            </div>
          ) : null}
          <label htmlFor={`${fieldId}-file`} className="block text-sm">
            Item da entrega
            <Select
              id={`${fieldId}-file`}
              value={final?.componentId ?? ''}
              onChange={(event) => setSelectedComponentId(event.target.value)}
            >
              {preview.snapshot.orderedAssets.map((item, index) => (
                <option key={item.componentId} value={item.componentId}>
                  {index + 1}. {item.asset.name}
                </option>
              ))}
            </Select>
          </label>
          {final ? (
            <>
              <AssetPreview
                port={port}
                projectId={project.id}
                assetId={final.asset.id}
                mediaType={final.asset.mime.startsWith('video/') ? 'video' : 'image'}
                alt={final.alt}
                captionsVtt={
                  component?.kind === 'video' ? timelineWebVtt(component.timeline) : undefined
                }
              />
              <p className="text-xs text-muted-foreground">Descrição acessível: {final.alt}</p>
              {component?.kind === 'component' ? (
                <p className="whitespace-pre-wrap text-sm">{component.body}</p>
              ) : null}
            </>
          ) : null}
          {approvedId ? (
            <>
              <p role="status" className="text-sm">
                Esta é a edição já aprovada, preservada como foi conferida.
              </p>
              <EditionExport
                key={approvedId}
                port={port}
                editionId={approvedId}
                hash={preview.hash}
                snapshot={preview.snapshot}
              />
            </>
          ) : (
            <>
              {(
                [
                  { id: 'copy', label: 'Conferi a copy, a legenda e a chamada para ação.' },
                  {
                    id: 'visual',
                    label: 'Conferi todos os arquivos finais, textos e áudio, quando houver.',
                  },
                  {
                    id: 'destination',
                    label: 'Conferi formato, ordem e descrição acessível para o destino.',
                  },
                ] as const
              ).map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={checked[item.id]}
                    onChange={(event) =>
                      setChecked((current) => ({ ...current, [item.id]: event.target.checked }))
                    }
                  />
                  {item.label}
                </label>
              ))}
              <Button
                disabled={
                  busy ||
                  pending ||
                  !project.permissions.includes('approve') ||
                  !checked.copy ||
                  !checked.visual ||
                  !checked.destination
                }
                onClick={() => void approve()}
              >
                Aprovar esta edição
              </Button>
              {!project.permissions.includes('approve') ? (
                <p className="text-xs text-muted-foreground">
                  Uma pessoa com permissão de aprovação precisa confirmar esta edição.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {editions.length ? (
        <details className="mt-4 text-sm">
          <summary>Edições aprovadas ({editions.length})</summary>
          <ul className="mt-2 space-y-2">
            {editions.map((edition) => (
              <li key={edition.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void work(async () => {
                      const saved = approvedEditionSchema.parse(
                        await port.request(`${base}/editions/${edition.id}`),
                      )
                      setPreview({ hash: saved.hash, snapshot: saved.snapshot })
                      setApprovedId(saved.id)
                      setSelectedComponentId(saved.snapshot.orderedAssets[0]?.componentId ?? '')
                    })
                  }
                >
                  {new Date(edition.approvedAt).toLocaleString('pt-BR')} · {edition.assetCount}{' '}
                  arquivo(s)
                </Button>
              </li>
            ))}
          </ul>
          {cursor ? (
            <Button
              className="mt-2"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                void work(async () => {
                  const page = editionPageSchema.parse(
                    await port.request(
                      `${base}/representations/${representationId}/editions?before=${cursor}`,
                    ),
                  )
                  setEditions((current) => [
                    ...current,
                    ...page.items.filter((item) => !current.some((old) => old.id === item.id)),
                  ])
                  setCursor(page.nextCursor)
                })
              }
            >
              Carregar anteriores
            </Button>
          ) : null}
        </details>
      ) : null}
      <DeliveryPanel
        onOpenAnalysis={onOpenAnalysis}
        port={port}
        project={project}
        representationId={representationId}
        edition={
          approvedId && preview && representation?.kind === 'representation'
            ? { id: approvedId, hash: preview.hash, format: representation.format }
            : null
        }
        onSelectEdition={async (editionId) => {
          const saved = approvedEditionSchema.parse(
            await port.request(`${base}/editions/${editionId}`),
          )
          setPreview({ hash: saved.hash, snapshot: saved.snapshot })
          setApprovedId(saved.id)
          setSelectedComponentId(saved.snapshot.orderedAssets[0]?.componentId ?? '')
        }}
      />
    </section>
  )
}
