import { canonicalJson } from '@sistemazero/core/creations'
import {
  type PintaImageDerivation,
  PintaImageDerivationSchema,
  pintaImageDependencyRule,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import type { ProjectAsset } from '#core'
import { assertPintaImageAssets, readPintaImageAssetMetadata } from '../core/pintaImageAsset'
import type { StudioPintaImagePreview, StudioPintaLibraryAdapter } from '../studio/pinta-library'
import { assertPintaImageFits, pintaImageTargetLimits } from './pintaImageTarget'

/** One sweep owns small provenance records and at most one completed, quota-bounded PNG.
 * Native drawings remain in Pinta. This module is loaded only for an actual Python derivative. */
export function createPintaImageSync(
  adapter: StudioPintaLibraryAdapter | null | undefined,
  signal: AbortSignal,
) {
  const inspected = new Map<string, Promise<PintaImageDerivation['provenance']>>()
  let latest: { key: string; image: StudioPintaImagePreview } | undefined

  function assertFits(asset: ProjectAsset, assets: readonly ProjectAsset[]) {
    const derivation = readPintaImageAssetMetadata(asset)
    if (!derivation) throw new Error('Este material não tem uma receita do Pinta.')
    assertPintaImageFits(
      { dataUrl: asset.dataUrl, derivation },
      pintaImageTargetLimits(assets, asset.id),
    )
  }

  return {
    assertFits,
    async reconcile(
      assetInput: ProjectAsset,
      assets: readonly ProjectAsset[],
    ): Promise<ProjectAsset | null> {
      signal.throwIfAborted()
      const asset = structuredClone(assetInput)
      const previous = readPintaImageAssetMetadata(asset)
      if (!previous) return null
      if (!adapter?.inspectImage || !adapter.previewImage)
        throw new Error(
          'Não consegui consultar a receita do Pinta agora. A última imagem foi mantida.',
        )
      const drawingId = previous.recipe.drawingId
      const selection = previous.recipe.selection.kind
      // The fingerprint depends on which tilesets the kind uses (a `map` reads all of them),
      // so one sweep inspects a drawing once per dependency rule, not once per drawing.
      const inspectionKey = `${drawingId}\u0000${pintaImageDependencyRule(selection)}`
      let inspection = inspected.get(inspectionKey)
      if (!inspection) {
        inspection = adapter.inspectImage(drawingId, { signal, selection }).then((value) => {
          signal.throwIfAborted()
          return PintaImageDerivationSchema.shape.provenance.parse(value)
        })
        inspected.set(inspectionKey, inspection)
      }
      const provenance = await inspection
      signal.throwIfAborted()
      if (canonicalJson(previous.provenance) === canonicalJson(provenance)) return null
      const limits = pintaImageTargetLimits(assets, asset.id)
      const key = canonicalJson({ recipe: pintaImageRecipeKey(previous.recipe), provenance })
      const image =
        latest?.key === key
          ? structuredClone(latest.image)
          : structuredClone(
              await adapter.previewImage(
                structuredClone(previous.recipe),
                structuredClone(limits),
                {
                  signal,
                  expectedProvenance: structuredClone(provenance),
                },
              ),
            )
      signal.throwIfAborted()
      if (
        pintaImageRecipeKey(image.derivation.recipe) !== pintaImageRecipeKey(previous.recipe) ||
        canonicalJson(image.derivation.provenance) !== canonicalJson(provenance)
      )
        throw new Error('O desenho mudou durante o preparo. A última imagem foi mantida.')
      assertPintaImageFits(image, limits)
      const next: ProjectAsset = {
        ...asset,
        dataUrl: image.dataUrl,
        width: image.derivation.output.width,
        height: image.derivation.output.height,
        pintaImage: image.derivation,
      }
      await assertPintaImageAssets([next])
      signal.throwIfAborted()
      latest = { key, image: structuredClone(image) }
      return next
    },
  }
}
