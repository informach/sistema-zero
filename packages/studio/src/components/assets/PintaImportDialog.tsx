import { type PintaImageRecipe, pintaImageRecipeKey } from '@sistemazero/core/studio/pinta-image'
import { type JSX, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { personalIdOf } from '../../asset-library/personalSync'
import { isPythonProject } from '../../core/editableProject'
import { normalizeSearchText } from '../../core/searchText'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import { type StudioPintaDrawingSummary, useStudioPintaLibrary } from '../../studio/pinta-library'
import {
  addPintaCreationToProject,
  projectAssetFromCreation,
  projectPintaImageFromRecipe,
} from './addCreationToProject'

const PintaImageSelection = lazy(() => import('./PintaImageSelection'))

/**
 * Modal "Trazer do Pinta" — o fluxo PULL de imagens: lista TODOS os desenhos
 * da galeria do Pinta (via o adapter do host), com busca por nome, e importa o
 * escolhido direto para o projeto. Fica ABERTA após adicionar (dá para trazer
 * vários); o selo "✓ no projeto" (derivado do `libId personal:<id>` dos assets
 * do projeto) atualiza na hora e responde o "o que eu já trouxe?".
 *
 * Modal aninhada sobre o AssetsPanel — mesmo precedente do TileConfigDialog
 * (`<dialog>.showModal()` empilha no top-layer nativo; Esc fecha só a de cima).
 */
export interface PintaImportDialogProps {
  onClose: () => void
  /** Chamado após um import bem-sucedido (o painel re-lista "Meus desenhos"). */
  onImported?: () => void
  /** Snapshot captured when reviewing this existing portable image. */
  initialTarget?: ProjectAsset
}

/** Filtro puro da busca (nome + nome do jogo, sem acento/caixa). */
export function filterPintaDrawings(
  drawings: readonly StudioPintaDrawingSummary[],
  query: string,
): StudioPintaDrawingSummary[] {
  const q = normalizeSearchText(query.trim())
  if (!q) return [...drawings]
  return drawings.filter((d) => normalizeSearchText(`${d.name} ${d.projectName ?? ''}`).includes(q))
}

const KIND_LABEL_KEY: Record<StudioPintaDrawingSummary['role'], string> = {
  sprite: 'pintaImport.kind.sprite',
  background: 'pintaImport.kind.background',
  tileset: 'pintaImport.kind.tileset',
  tilemap: 'pintaImport.kind.tilemap',
}

/** Emoji do tipo — fallback visual quando o desenho não tem miniatura. */
const KIND_EMOJI: Record<StudioPintaDrawingSummary['role'], string> = {
  sprite: '🧍',
  background: '🖼️',
  tileset: '🧩',
  tilemap: '🗺️',
}

const EMPTY_ASSETS: ProjectAsset[] = []

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; drawings: StudioPintaDrawingSummary[] }

export function PintaImportDialog({
  onClose,
  onImported,
  initialTarget,
}: PintaImportDialogProps): JSX.Element {
  const t = useT()
  const adapter = useStudioPintaLibrary()
  const assets = useProjectStore(useShallow((s) => s.project?.assets ?? EMPTY_ASSETS))
  const storeApi = useProjectStoreApi()
  const python = useProjectStore((s) => !!s.project && isPythonProject(s.project))

  const [load, setLoad] = useState<LoadState>({ phase: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const owner = useMemo(
    () => ({
      adapter,
      storeApi,
      active: false,
      lifetime: new AbortController(),
      pending: null as AbortController | null,
      preview: null as AbortController | null,
    }),
    [adapter, storeApi],
  )
  const [selection, setSelection] = useState<{ owner: typeof owner; drawingId: string } | null>(
    () =>
      initialTarget?.pintaImage
        ? { owner, drawingId: initialTarget.pintaImage.recipe.drawingId }
        : null,
  )
  const selectedDrawingId = selection?.owner === owner ? selection.drawingId : null
  const setSelectedDrawingId = (drawingId: string | null) =>
    setSelection(drawingId ? { owner, drawingId } : null)
  useLayoutEffect(() => {
    if (owner.lifetime.signal.aborted) owner.lifetime = new AbortController()
    owner.active = true
    setBusyId(null)
    setError(null)
    // Observe every transition, including A→B→A batched into one React render.
    // Ordinary source/name edits keep the same project id and remain valid.
    const unsubscribe = storeApi.subscribe((state, previous) => {
      if (
        state.project?.id !== previous.project?.id ||
        state.editingAccess !== previous.editingAccess ||
        (state.project?.programmingLanguage ?? 'javascript') !==
          (previous.project?.programmingLanguage ?? 'javascript')
      ) {
        owner.pending?.abort()
        owner.preview?.abort()
        if (owner.active) setSelection(null)
      }
    })
    return () => {
      owner.active = false
      owner.lifetime.abort()
      unsubscribe()
    }
  }, [owner, storeApi])
  const close = () => {
    if (!owner.active) return
    owner.active = false
    owner.lifetime.abort()
    onClose()
  }

  useEffect(() => {
    if (!adapter) return
    // `reloadKey` re-dispara a listagem no "Tentar de novo".
    void reloadKey
    // StrictMode monta→limpa→monta: a flag descarta a resposta da montagem morta.
    let cancelled = false
    const controller = new AbortController()
    const scope = captureProjectStorageScope()
    const signal = AbortSignal.any([
      controller.signal,
      owner.lifetime.signal,
      ...(scope.signal ? [scope.signal] : []),
    ])
    setLoad({ phase: 'loading' })
    adapter
      .list({ signal, ...(python ? { includeImageSelection: true } : {}) })
      .then((drawings) => {
        if (!cancelled && owner.active && !signal.aborted) setLoad({ phase: 'ready', drawings })
      })
      .catch(() => {
        if (!cancelled && owner.active && !signal.aborted) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [adapter, owner, python, reloadKey])

  // Quais desenhos já estão NESTE projeto (o elo é o libId `personal:<id>`).
  const inProject = new Set(assets.map((a) => personalIdOf(a)).filter(Boolean))

  const handleAdd = async (
    drawing: StudioPintaDrawingSummary,
    requestedRecipe?: PintaImageRecipe,
  ): Promise<void> => {
    const initial = storeApi.getState()
    if (
      !adapter ||
      !owner.active ||
      owner.pending ||
      !initial.project ||
      initial.editingAccess !== 'author'
    )
      return
    const recipe = requestedRecipe ? structuredClone(requestedRecipe) : undefined
    if (isPythonProject(initial.project) !== !!recipe || (recipe && !adapter.previewImage)) {
      setError(t('pintaImport.image.unavailable'))
      return
    }
    const expectedTarget = recipe
      ? structuredClone(initialTarget ?? projectPintaImageFromRecipe(initial, recipe) ?? null)
      : undefined
    const projectId = initial.project.id
    const controller = new AbortController()
    const scope = captureProjectStorageScope()
    const signal = AbortSignal.any([
      controller.signal,
      owner.lifetime.signal,
      ...(scope.signal ? [scope.signal] : []),
    ])
    if (signal.aborted) return
    owner.pending = controller
    const current = () =>
      owner.active &&
      owner.pending === controller &&
      !signal.aborted &&
      storeApi.getState().project?.id === projectId &&
      !!storeApi.getState().project &&
      isPythonProject(storeApi.getState().project!) === !!recipe &&
      storeApi.getState().editingAccess === 'author'
    const aborted = () => {
      if (owner.pending !== controller) return
      owner.pending = null
      if (owner.active) setBusyId(null)
    }
    signal.addEventListener('abort', aborted, { once: true })
    setBusyId(drawing.id)
    setError(null)
    try {
      const imageModel = recipe ? await import('../../asset-library/pintaImageTarget') : undefined
      if (!current()) return
      const result = await adapter.import(drawing.id, {
        signal,
        ...(recipe && imageModel
          ? {
              image: {
                recipe,
                limits: imageModel.pintaImageTargetLimits(
                  storeApi.getState().project?.assets ?? [],
                  expectedTarget?.id,
                ),
              },
            }
          : {}),
      })
      if (!current()) return
      if (!result.ok) {
        setError(result.error)
        if (result.code === 'not-found' && load.phase === 'ready') {
          // Apagado no Pinta entre listar e importar → o card sai da lista.
          setLoad({ phase: 'ready', drawings: load.drawings.filter((d) => d.id !== drawing.id) })
        }
        return
      }
      const state = storeApi.getState()
      if (recipe && imageModel) {
        if (!result.asset.pintaImage) {
          setError(t('pintaImport.image.selectionChanged'))
          return
        }
        imageModel.assertPintaImageFits(
          { dataUrl: result.asset.dataUrl, derivation: result.asset.pintaImage },
          imageModel.pintaImageTargetLimits(state.project?.assets ?? [], expectedTarget?.id),
        )
        if (pintaImageRecipeKey(result.asset.pintaImage.recipe) !== pintaImageRecipeKey(recipe)) {
          setError(t('pintaImport.image.selectionChanged'))
          return
        }
      }
      // Já no projeto, este botão é o "Atualizar vetor": só faz sentido se o Pinta mandou SVG.
      if (
        !recipe &&
        projectAssetFromCreation(state, result.asset.id) &&
        !result.asset.dataUrl.startsWith('data:image/svg+xml')
      ) {
        setError(t('pintaImport.vectorTooLarge'))
        return
      }
      // O MESMO "adicionar ao projeto" do Molda e da equipe (atualiza se já estiver lá).
      const err = addPintaCreationToProject(state, result.asset, expectedTarget)
      if (err) {
        setError(err)
        return
      }
      if (current()) onImported?.()
      if (initialTarget && current()) close()
    } catch (cause) {
      if (current())
        setError(recipe && cause instanceof Error ? cause.message : t('pintaImport.importError'))
    } finally {
      const active = current()
      signal.removeEventListener('abort', aborted)
      if (owner.pending === controller) owner.pending = null
      if (active) setBusyId(null)
    }
  }

  const visible = load.phase === 'ready' ? filterPintaDrawings(load.drawings, query) : []
  const selectedDrawing =
    load.phase === 'ready' ? load.drawings.find((item) => item.id === selectedDrawingId) : undefined
  const backToGallery = () => {
    owner.preview?.abort()
    if (initialTarget) {
      close()
      return
    }
    setSelectedDrawingId(null)
    setReloadKey((value) => value + 1)
    setError(null)
  }

  return (
    <Modal
      open
      onClose={close}
      title={t('pintaImport.title')}
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={close}>
          {t('pintaImport.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-sz-fg-soft">{t('pintaImport.subtitle')}</p>

        <input
          type="search"
          name="pinta-drawing-search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label={t('pintaImport.search.label')}
          placeholder={t('pintaImport.search.placeholder')}
          className="h-9 min-w-0 rounded-md border border-sz-border bg-sz-bg px-3 text-sm font-normal text-sz-fg outline-none focus:border-sz-accent"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </p>
        ) : null}
        {python && !adapter?.previewImage ? (
          <p role="alert" className="text-sm text-sz-fg-soft">
            {t('pintaImport.image.unavailable')}
          </p>
        ) : null}
        {python && selectedDrawing && adapter ? (
          <Suspense fallback={<p role="status">{t('pintaImport.image.preparing')}</p>}>
            <PintaImageSelection
              key={`${selectedDrawing.id}:${initialTarget?.id ?? ''}`}
              drawing={selectedDrawing}
              adapter={adapter}
              owner={owner}
              target={initialTarget}
              busy={busyId !== null}
              onBack={backToGallery}
              onConfirm={(recipe) => void handleAdd(selectedDrawing, recipe)}
            />
          </Suspense>
        ) : null}
        {python && selectedDrawingId && !selectedDrawing && load.phase === 'ready' ? (
          <div role="alert">
            <p>{t('pintaImport.image.selectionMissing')}</p>
            <Button variant="ghost" size="sm" onClick={backToGallery}>
              {t('pintaImport.image.back')}
            </Button>
          </div>
        ) : null}

        {load.phase === 'loading' ? (
          <p role="status" className="text-sm text-sz-fg-soft">
            {t('pintaImport.loading')}
          </p>
        ) : null}

        {load.phase === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-sz-fg-soft">{t('pintaImport.loadError')}</p>
            <Button variant="subtle" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              {t('pintaImport.retry')}
            </Button>
          </div>
        ) : null}

        {load.phase === 'ready' && load.drawings.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('pintaImport.empty')}</p>
        ) : null}

        {load.phase === 'ready' && load.drawings.length > 0 && visible.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('pintaImport.noResults')}</p>
        ) : null}

        {visible.length > 0 && !(python && selectedDrawingId) ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((drawing) => {
              const added = inProject.has(drawing.id)
              return (
                <li
                  key={drawing.id}
                  className="flex flex-col gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <div className="flex items-center gap-2">
                    {drawing.thumbDataUrl ? (
                      <img
                        src={drawing.thumbDataUrl}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={
                          drawing.style === 'pixel' ? { imageRendering: 'pixelated' } : undefined
                        }
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sz-bg text-2xl"
                      >
                        {KIND_EMOJI[drawing.role]}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-xs text-sz-fg" title={drawing.name}>
                        {drawing.name}
                      </span>
                      <span className="text-[10px] text-sz-fg-soft">
                        {t(KIND_LABEL_KEY[drawing.role])}
                      </span>
                      {drawing.projectName ? (
                        <span
                          className="truncate text-[10px] text-sz-fg-soft"
                          title={drawing.projectName}
                        >
                          {t('pintaImport.gameBadge', { name: drawing.projectName })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex min-h-8 items-center justify-end gap-2">
                    {/* Já no projeto → SÓ o selinho (decisão da dona: sem
                        "Adicionar de novo" — re-add acidental não existe). */}
                    {python ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId !== null || !adapter?.previewImage}
                        onClick={() => {
                          owner.preview?.abort()
                          setSelectedDrawingId(drawing.id)
                          setError(null)
                        }}
                      >
                        {t(added ? 'pintaImport.image.chooseAnother' : 'pintaImport.image.choose')}
                      </Button>
                    ) : added ? (
                      <>
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                          {t('pintaImport.inProject')}
                        </span>
                        {drawing.style === 'vector' &&
                        assets.some(
                          (asset) =>
                            personalIdOf(asset) === drawing.id &&
                            !asset.dataUrl.startsWith('data:image/svg+xml'),
                        ) ? (
                          <Button
                            variant="subtle"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => void handleAdd(drawing)}
                          >
                            {busyId === drawing.id
                              ? t('pintaImport.adding')
                              : t('pintaImport.refreshVector')}
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void handleAdd(drawing)}
                      >
                        {busyId === drawing.id ? t('pintaImport.adding') : t('pintaImport.add')}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </Modal>
  )
}
