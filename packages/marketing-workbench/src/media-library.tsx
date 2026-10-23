'use client'
import {
  type AssetLibraryPage,
  type AssetManifest,
  assetLibraryPageSchema,
  type Project,
  type UploadView,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AssetFileActions } from './asset-file-actions'
import { AssetPreview } from './asset-preview'
import { mergeMediaEntries, pendingMedia, pollMediaLibrary } from './media-library-state'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

const stateLabels = {
  preparing: 'Preparando envio',
  uploading: 'Envio incompleto',
  verifying: 'Conferindo no servidor',
  confirmed: 'Confirmado',
  failed: 'Precisa de atenção',
}
const roleLabels: Record<AssetManifest['role'], string> = {
  original: 'Original',
  proxy: 'Prévia preparada',
  final: 'Arquivo final',
  thumbnail: 'Miniatura',
  font: 'Fonte',
  reference: 'Referência',
  transcript: 'Transcrição',
  waveform: 'Forma de onda',
}
export function MediaLibrary({
  port,
  project,
  target,
  onClose,
  onChanged,
}: {
  port: WorkbenchPort
  project: Project
  target?: EditorialEntry
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const id = useId(),
    [page, setPage] = useState<AssetLibraryPage>({ items: [], nextCursor: null }),
    [error, setError] = useState(''),
    [readError, setReadError] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [progress, setProgress] = useState({ message: '', fraction: 0 }),
    [search, setSearch] = useState(''),
    [preview, setPreview] = useState<AssetManifest | null>(null)
  const abort = useRef<AbortController | null>(null),
    live = useRef(true),
    lock = useRef(false),
    receivedId = useRef<string | null>(null),
    readVersion = useRef(0)
  const editable = project.permissions.includes('edit')
  const refresh = useCallback(async () => {
    const version = ++readVersion.current
    const [remote, local] = await Promise.allSettled([
      port
        .request(`/projects/${project.id}/assets`)
        .then((value) => assetLibraryPageSchema.parse(value)),
      port.view(project.id),
    ])
    if (!live.current || version !== readVersion.current) return
    setLoaded(true)
    const result = remote.status === 'fulfilled' ? remote.value : { items: [], nextCursor: null }
    const transfers = local.status === 'fulfilled' ? (local.value.transfers ?? []) : []
    const localOnly = transfers
      .filter(
        (transfer) =>
          transfer.state !== 'confirmed' &&
          !result.items.some((item) => item.manifest.id === transfer.input.manifest.id),
      )
      .map((transfer) => ({
        manifest: transfer.input.manifest,
        state: transfer.state === 'local' ? ('preparing' as const) : transfer.state,
        error: transfer.error,
      }))
    setPage((current) => {
      const known = new Set(current.items.map((item) => item.manifest.id))
      return {
        ...mergeMediaEntries(current, [
          ...localOnly.filter((item) => !known.has(item.manifest.id)),
          ...result.items,
        ]),
        nextCursor: remote.status === 'fulfilled' ? result.nextCursor : current.nextCursor,
      }
    })
    // Explicit refreshes keep visible files and restart discovery, so another
    // author's new files can be found. Background status polling keeps the cursor.
    setReadError(
      [remote, local]
        .flatMap((value) => (value.status === 'rejected' ? [errorMessage(value.reason)] : []))
        .join(' '),
    )
  }, [port, project.id])
  useEffect(() => {
    const received = page.items.find((item) => item.manifest.id === receivedId.current)
    if (received?.state === 'confirmed') {
      receivedId.current = null
      setProgress({ message: 'Arquivo confirmado', fraction: 1 })
    } else if (received?.state === 'failed') {
      receivedId.current = null
      setProgress({ message: 'A conferência do arquivo precisa de atenção.', fraction: 1 })
      setError(received.error ?? 'O servidor recusou o arquivo. Confira o original.')
    }
  }, [page.items])
  useEffect(() => {
    live.current = true
    void refresh().catch((e) => setError(errorMessage(e)))
    return () => {
      live.current = false
      readVersion.current++
      abort.current?.abort()
    }
  }, [refresh])
  useEffect(() => {
    if (busy || !pendingMedia(page).length) return
    // Verification happens on the server after the transfer. Poll only this
    // visible dialog and only while verification is pending, never retry bytes.
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      const version = readVersion.current
      try {
        if (lock.current) return
        const updates = await pollMediaLibrary(port.request.bind(port), project.id, page)
        if (!active || version !== readVersion.current) return
        setPage((current) => mergeMediaEntries(current, updates))
        setReadError('')
      } catch (error) {
        if (active && version === readVersion.current) setReadError(errorMessage(error))
      } finally {
        if (active) timer = setTimeout(() => void poll(), 5000)
      }
    }
    timer = setTimeout(() => void poll(), 5000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [busy, page, port, project.id])
  const task = async (work: () => Promise<unknown>, reload = true) => {
    if (lock.current) return
    lock.current = true
    readVersion.current++
    setBusy(true)
    setError('')
    try {
      await work()
      if (reload) await refresh()
      await onChanged()
    } catch (e) {
      if (live.current) setError(errorMessage(e))
    } finally {
      lock.current = false
      if (live.current) setBusy(false)
    }
  }
  const received = (view: UploadView | null) => {
    if (view) {
      setPage((current) => mergeMediaEntries(current, [view]))
      receivedId.current = ['confirmed', 'failed'].includes(view.state) ? null : view.manifest.id
      if (view.state === 'failed')
        setError(view.error ?? 'O servidor recusou o arquivo. Confira o original.')
      setProgress({
        message:
          view.state === 'confirmed'
            ? 'Arquivo confirmado'
            : view.state === 'failed'
              ? 'A conferência do arquivo precisa de atenção.'
              : 'Arquivo recebido. Aguardando a conferência do servidor.',
        fraction: 1,
      })
    }
  }
  const attach = async (asset: AssetManifest) => {
    if (!target?.confirmed || target.pending.length || target.conflict)
      throw new Error('Confirme o componente antes de vincular uma referência')
    const document = target.confirmed.document
    if (document.kind !== 'component' && document.kind !== 'evidence' && document.kind !== 'video')
      throw new Error('Selecione um componente ou uma fonte para vincular o arquivo')
    const updated =
      document.kind === 'component' || document.kind === 'video'
        ? {
            ...document,
            referenceAssetIds: [...new Set([...(document.referenceAssetIds ?? []), asset.id])],
          }
        : { ...document, assetIds: [...new Set([...(document.assetIds ?? []), asset.id])] }
    await port.save(
      {
        schemaVersion: 1,
        operationId: crypto.randomUUID(),
        projectId: project.id,
        entityId: target.id,
        baseRevisionId: target.confirmed.revisionId,
        action: 'save',
        document: updated,
      },
      null,
    )
    setProgress({ message: `Referência vinculada a ${document.title}.`, fraction: 1 })
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Arquivos do projeto"
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Originais, fontes, gravações e resultados da equipe. Arquivos confirmados podem ser
          vinculados à peça como referência para a IA.
        </p>
        {editable && port.chooseMedia ? (
          <Button
            disabled={busy}
            onClick={() =>
              void task(async () => received((await port.chooseMedia?.(project.id)) ?? null))
            }
          >
            Adicionar arquivo do computador
          </Button>
        ) : null}
        {editable && port.uploadFile ? (
          <>
            <label htmlFor={`${id}-file`} className="block text-sm font-medium">
              Enviar arquivo ou retomar um envio
            </label>
            <Input
              id={`${id}-file`}
              type="file"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file)
                  void task(async () => {
                    const controller = new AbortController()
                    abort.current = controller
                    received(
                      (await port.uploadFile?.(
                        project.id,
                        file,
                        controller.signal,
                        (message, fraction) => {
                          if (live.current) setProgress({ message, fraction })
                        },
                      )) ?? null,
                    )
                  })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Até 2 GB. Para continuar após uma interrupção, selecione o mesmo original; as partes
              confirmadas são aproveitadas.
            </p>
          </>
        ) : null}
        {progress.message ? (
          <div role="status" className="text-sm">
            <p>{progress.message}</p>
            {busy ? (
              <progress
                max={1}
                value={progress.fraction}
                className="w-full"
                aria-label="Progresso do envio"
              />
            ) : null}
          </div>
        ) : null}
        {busy && port.uploadFile ? (
          <Button
            variant="outline"
            onClick={() =>
              abort.current?.abort(
                new Error('Envio interrompido. Selecione o mesmo arquivo para continuar.'),
              )
            }
          >
            Interromper envio
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {readError ? (
          <p role="alert" className="text-sm text-destructive">
            {readError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Input
            aria-label="Filtrar arquivos carregados"
            placeholder="Filtrar pelo nome"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={() => void task(refresh, false)}>
            Atualizar
          </Button>
        </div>
        <ul className="max-h-96 space-y-3 overflow-auto">
          {page.items
            .filter((item) =>
              item.manifest.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
            .map((item) => (
              <li key={item.manifest.id} className="space-y-2 rounded-lg border p-3">
                <p className="break-words text-sm font-medium">{item.manifest.name}</p>
                <p className="text-xs text-muted-foreground">
                  {stateLabels[item.state]} · {(item.manifest.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                  {roleLabels[item.manifest.role]}
                </p>
                {item.error ? <p className="text-sm text-destructive">{item.error}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {item.state === 'confirmed' ? (
                    <>
                      <AssetFileActions port={port} manifest={item.manifest} />
                      {/^(image|video|audio)\//.test(item.manifest.mime) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreview(item.manifest)}
                        >
                          {item.manifest.mime.startsWith('image/')
                            ? 'Ver imagem'
                            : item.manifest.mime.startsWith('video/')
                              ? 'Ver vídeo'
                              : 'Ouvir áudio'}
                        </Button>
                      ) : null}
                      {editable &&
                      target &&
                      ['component', 'evidence', 'video'].includes(target.document.kind) ? (
                        <Button
                          size="sm"
                          disabled={
                            busy || Boolean(target.pending.length) || Boolean(target.conflict)
                          }
                          onClick={() => void task(() => attach(item.manifest))}
                        >
                          Usar como referência
                        </Button>
                      ) : null}
                    </>
                  ) : port.resumeMedia && editable ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void task(async () =>
                          received(
                            (await port.resumeMedia?.(project.id, item.manifest.id)) ?? null,
                          ),
                        )
                      }
                    >
                      Retomar neste computador
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
        </ul>
        {!loaded ? <p role="status">Carregando arquivos…</p> : null}
        {loaded && !error && !readError && !page.items.length ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo registrado neste projeto.</p>
        ) : null}
        {page.nextCursor ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void task(async () => {
                const next = assetLibraryPageSchema.parse(
                  await port.request(`/projects/${project.id}/assets?after=${page.nextCursor}`),
                )
                setPage((current) => ({
                  items: [
                    ...new Map(
                      [...current.items, ...next.items].map((item) => [item.manifest.id, item]),
                    ).values(),
                  ],
                  nextCursor: next.nextCursor,
                }))
              }, false)
            }
          >
            Carregar mais arquivos
          </Button>
        ) : null}
        {preview ? (
          <div className="rounded-lg border p-3">
            <AssetPreview
              port={port}
              projectId={project.id}
              assetId={preview.id}
              alt={preview.name}
              mediaType={
                preview.mime.startsWith('video/')
                  ? 'video'
                  : preview.mime.startsWith('audio/')
                    ? 'audio'
                    : 'image'
              }
            />
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Fechar prévia
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
