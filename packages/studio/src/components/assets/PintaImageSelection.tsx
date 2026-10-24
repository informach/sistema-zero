import {
  assertPintaImageDimensions,
  type PintaImageRecipe,
  PintaImageRecipeSchema,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import { useEffect, useMemo, useState } from 'react'
import type { ProjectAsset } from '#core'
import { Button } from '#ui'
import { assertPintaImageFits, pintaImageTargetLimits } from '../../asset-library/pintaImageTarget'
import { isPythonProject } from '../../core/editableProject'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import type {
  StudioPintaDrawingSummary,
  StudioPintaImagePreview,
  StudioPintaLibraryAdapter,
} from '../../studio/pinta-library'
import { pintaImageOutputFor, projectPintaImageFromRecipe } from './addCreationToProject'

type Preview =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; key: string; image: StudioPintaImagePreview; signal: AbortSignal }

export default function PintaImageSelection({
  drawing,
  adapter,
  owner,
  target,
  busy,
  onBack,
  onConfirm,
}: {
  drawing: StudioPintaDrawingSummary
  adapter: StudioPintaLibraryAdapter
  owner: { active: boolean; lifetime: AbortController; preview: AbortController | null }
  target?: ProjectAsset
  busy: boolean
  onBack: () => void
  onConfirm: (recipe: PintaImageRecipe) => void
}) {
  const t = useT()
  const store = useProjectStoreApi()
  const facts = drawing.imageSelection
  const initial = target?.pintaImage?.recipe
  const [animationId, setAnimationId] = useState(
    initial?.selection.kind === 'frame'
      ? initial.selection.animationId
      : facts?.kind === 'frame'
        ? (facts.animations[0]?.id ?? '')
        : '',
  )
  const [position, setPosition] = useState(
    initial?.selection.kind === 'frame'
      ? initial.selection.frameIndex
      : initial?.selection.kind === 'tile'
        ? initial.selection.tileIndex
        : 0,
  )
  const [scale, setScale] = useState(initial?.scale ?? 1)
  const [preview, setPreview] = useState<Preview>({ phase: 'loading' })
  // The destination decides the format (a primitive, so the selector never re-renders by identity).
  const output = useProjectStore((state) => pintaImageOutputFor(state.project, facts, initial))
  const recipe = useMemo<PintaImageRecipe | null>(() => {
    if (!facts || facts.kind === 'unavailable') return null
    if (facts.kind === 'frame') {
      const animation = facts.animations.find((item) => item.id === animationId)
      if (!animation || position < 0 || position >= animation.frameCount) return null
    }
    if (facts.kind === 'tile' && (position < 0 || position >= facts.tileCount)) return null
    return PintaImageRecipeSchema.parse({
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: drawing.id,
      scale,
      ...(output ? { output } : {}),
      selection:
        facts.kind === 'frame'
          ? { kind: 'frame', animationId, frameIndex: position }
          : facts.kind === 'tile'
            ? { kind: 'tile', tileIndex: position }
            : { kind: facts.kind },
    })
  }, [facts, drawing.id, animationId, position, scale, output])
  const recipeKey = recipe ? pintaImageRecipeKey(recipe) : null
  const revokePreview = () => {
    owner.preview?.abort()
    setPreview({ phase: 'loading' })
  }
  useEffect(() => {
    const controller = new AbortController()
    owner.preview?.abort()
    owner.preview = controller
    const scope = captureProjectStorageScope()
    const signal = AbortSignal.any([
      controller.signal,
      owner.lifetime.signal,
      ...(scope.signal ? [scope.signal] : []),
    ])
    let current = true
    const valid = () => current && owner.active && !signal.aborted && owner.preview === controller
    if (!recipe || !facts || facts.kind === 'unavailable' || !adapter.previewImage) {
      setPreview({
        phase: 'error',
        message: t(
          facts?.kind === 'unavailable'
            ? 'pintaImport.image.needsTileset'
            : !recipe
              ? 'pintaImport.image.selectionMissing'
              : 'pintaImport.image.unavailable',
        ),
      })
    } else {
      setPreview({ phase: 'loading' })
      void (async () => {
        try {
          signal.throwIfAborted()
          const state = store.getState()
          if (!state.project || !isPythonProject(state.project) || state.editingAccess !== 'author')
            return
          const replacing = target ?? projectPintaImageFromRecipe(state, recipe)
          const limits = pintaImageTargetLimits(state.project.assets ?? [], replacing?.id)
          assertPintaImageDimensions(
            Math.round(facts.width * recipe.scale),
            Math.round(facts.height * recipe.scale),
            limits,
          )
          const image = await adapter.previewImage!(recipe, limits, { signal })
          if (!valid()) return
          assertPintaImageFits(image, limits)
          if (pintaImageRecipeKey(image.derivation.recipe) !== recipeKey)
            throw new Error(t('pintaImport.image.selectionChanged'))
          setPreview({ phase: 'ready', key: recipeKey!, image, signal })
        } catch (error) {
          if (valid())
            setPreview({
              phase: 'error',
              message: error instanceof Error ? error.message : t('pintaImport.importError'),
            })
        }
      })()
    }
    return () => {
      current = false
      controller.abort()
      if (owner.preview === controller) owner.preview = null
    }
  }, [adapter, facts, owner, recipe, recipeKey, store, t, target])
  const animation =
    facts?.kind === 'frame' ? facts.animations.find((item) => item.id === animationId) : undefined
  const count = facts?.kind === 'tile' ? facts.tileCount : (animation?.frameCount ?? 0)
  const selectedExists =
    recipe !== null && projectPintaImageFromRecipe(store.getState(), recipe) !== undefined
  const scaleOptions = [...new Set([0.25, 0.5, 1, 2, initial?.scale ?? 1])].sort((a, b) => a - b)
  return (
    <section aria-label={t('pintaImport.image.selection')} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="truncate text-sm">{drawing.name}</strong>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onBack}>
          {t('pintaImport.image.back')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {facts?.kind === 'frame' ? (
          <label className="flex flex-col gap-1 text-sm">
            {t('pintaImport.image.animation')}
            <select
              aria-label={t('pintaImport.image.animation')}
              disabled={busy}
              value={animationId}
              className="min-h-11 rounded border border-sz-border bg-sz-bg px-2"
              onChange={(event) => {
                revokePreview()
                setAnimationId(event.currentTarget.value)
                setPosition(0)
              }}
            >
              {!animation ? (
                <option value={animationId}>{t('pintaImport.image.selectionMissing')}</option>
              ) : null}
              {facts.animations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {facts?.kind === 'frame' || facts?.kind === 'tile' ? (
          <label className="flex flex-col gap-1 text-sm">
            {t(facts.kind === 'frame' ? 'pintaImport.image.frame' : 'pintaImport.image.tile')}
            <select
              aria-label={t(
                facts.kind === 'frame' ? 'pintaImport.image.frame' : 'pintaImport.image.tile',
              )}
              disabled={busy || count === 0}
              value={position}
              className="min-h-11 rounded border border-sz-border bg-sz-bg px-2"
              onChange={(event) => {
                revokePreview()
                setPosition(Number(event.currentTarget.value))
              }}
            >
              {position >= count ? (
                <option value={position}>{t('pintaImport.image.selectionMissing')}</option>
              ) : null}
              {Array.from({ length: count }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: The contract selects positions, not persistent frame identities.
                <option key={index} value={index}>
                  {index + 1} / {count}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          {t('pintaImport.image.scale')}
          <select
            aria-label={t('pintaImport.image.scale')}
            disabled={busy}
            value={scale}
            className="min-h-11 rounded border border-sz-border bg-sz-bg px-2"
            onChange={(event) => {
              revokePreview()
              setScale(Number(event.currentTarget.value))
            }}
          >
            {scaleOptions.map((value) => (
              <option key={value} value={value}>
                {value * 100}%
              </option>
            ))}
          </select>
        </label>
      </div>
      {facts?.kind === 'frame' ? (
        <p className="text-sm text-sz-fg-soft">{t('pintaImport.image.staticFrame')}</p>
      ) : null}
      {facts?.kind === 'tilemap' ? (
        <p className="text-sm text-sz-fg-soft">{t('pintaImport.image.fullMap')}</p>
      ) : null}
      {output === 'svg' ? (
        <p className="text-sm text-sz-fg-soft">{t('pintaImport.image.vector')}</p>
      ) : null}
      {preview.phase === 'loading' ? <p role="status">{t('pintaImport.image.preparing')}</p> : null}
      {preview.phase === 'error' ? (
        <p role="alert" className="text-sm text-red-400">
          {preview.message}
        </p>
      ) : null}
      {preview.phase === 'ready' && preview.key === recipeKey ? (
        <figure className="flex flex-col items-center gap-2 rounded border border-sz-border bg-sz-panel-soft p-3">
          <img
            src={preview.image.dataUrl}
            alt={t('pintaImport.image.preview')}
            width={preview.image.derivation.output.width}
            height={preview.image.derivation.output.height}
            className="max-h-52 max-w-full object-contain"
            style={drawing.style === 'pixel' ? { imageRendering: 'pixelated' } : undefined}
          />
          <figcaption className="text-xs text-sz-fg-soft">
            {preview.image.derivation.output.width} × {preview.image.derivation.output.height} px
          </figcaption>
        </figure>
      ) : null}
      <Button
        variant="primary"
        disabled={
          busy ||
          preview.phase !== 'ready' ||
          preview.key !== recipeKey ||
          preview.signal.aborted ||
          !recipe
        }
        onClick={() => {
          if (
            recipe &&
            preview.phase === 'ready' &&
            !preview.signal.aborted &&
            owner.active &&
            !owner.lifetime.signal.aborted &&
            !owner.preview?.signal.aborted
          )
            onConfirm(recipe)
        }}
      >
        {busy
          ? t('pintaImport.adding')
          : t(target || selectedExists ? 'pintaImport.image.update' : 'pintaImport.image.add')}
      </Button>
    </section>
  )
}
