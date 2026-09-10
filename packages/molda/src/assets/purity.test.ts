/**
 * `@sistemazero/molda/assets` e `./studio-library` são faces SEM UI: o host
 * kids e o Estúdio os importam dinamicamente fora do app. Este teste anda o
 * grafo de módulos a partir de cada entrada e reprova qualquer import de
 * React, zustand, three, lucide ou de `components/`.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const SRC = resolve(import.meta.dir, '..')
const FORBIDDEN_BARE = ['react', 'react-dom', 'zustand', 'three', 'lucide-react', 'clsx']
const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g

function resolveRelative(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith(SRC)) {
      try {
        readFileSync(candidate)
        return candidate
      } catch {
        // diretório
      }
    }
  }
  return null
}

function walk(entry: string): { files: Set<string>; bare: Set<string> } {
  const files = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop()
    if (!file || files.has(file)) continue
    files.add(file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1]
      if (!spec) continue
      if (spec.startsWith('.')) {
        const next = resolveRelative(file, spec)
        if (!next) throw new Error(`Import relativo não resolvido em ${file}: ${spec}`)
        queue.push(next)
      } else {
        bare.add(spec)
      }
    }
  }
  return { files, bare }
}

describe('pureza das faces sem UI', () => {
  test('Data URI e caminhos literais compartilhados não dependem de formatos', () => {
    for (const entry of ['import/importDataUri.ts', 'import/literalResourcePath.ts']) {
      const { files } = walk(join(SRC, entry))
      expect(
        [...files].filter((file) => /[/\\]import[/\\](?:bbmodel|gltf|obj|mtl)/.test(file)),
      ).toEqual([])
    }
  })
  test('núcleo raster compartilhado não depende dos importadores de contêiner', () => {
    const { files } = walk(join(SRC, 'import/rasterBatch.ts'))
    expect([...files].filter((file) => /[/\\]import[/\\](?:gltf|obj|mtl)/.test(file))).toEqual([])
  })
  for (const entry of [
    'assets/index.ts',
    'export/studioLibrary.ts',
    'scene/readDocument.ts',
    'scene/documentJson.ts',
    'scene/migrateLegacy.ts',
    'scene/commands.ts',
    'scene/geometry.ts',
    'scene/composite.ts',
    'core/rgbaRows.ts',
    'scene/skinPose.ts',
    'scene/skinWeights.ts',
    'scene/skinDraw.ts',
    'scene/skinCommands.ts',
    'scene/skinSuggestion.ts',
    'scene/skinPaint.ts',
    'scene/skinPaintWeights.ts',
    'scene/meshDistanceField.ts',
    'scene/twoBoneReach.ts',
    'scene/twoBonePose.ts',
    'scene/bendLimitCommands.ts',
    'scene/animationPoseSet.ts',
    'import/gltfEnvelope.ts',
    'import/importJson.ts',
    'import/bbmodelEnvelope.ts',
    'import/bbmodelAnimationStructure.ts',
    'import/bbmodelAnimationKeyframes.ts',
    'import/bbmodelAnimationConstantKey.ts',
    'import/bbmodelAnimationBindings.ts',
    'import/bbmodelAnimationTrack.ts',
    'import/bbmodelAnimationSample.ts',
    'import/bbmodelAnimationSchedule.ts',
    'import/bbmodelAnimationPose.ts',
    'import/bbmodelNativeClips.ts',
    'import/bbmodelClipPlan.ts',
    'import/bbmodelClips.ts',
    'import/bbmodelAnimationBounds.ts',
    'import/animationSampleTimes.ts',
    'import/bbmodelGraph.ts',
    'import/bbmodelGeometry.ts',
    'import/bbmodelAppearance.ts',
    'import/bbmodelTextureBinding.ts',
    'import/importDataUri.ts',
    'import/literalResourcePath.ts',
    'import/bbmodelImageDataUri.ts',
    'import/bbmodelResourcePath.ts',
    'import/bbmodelResources.ts',
    'import/bbmodelRasters.ts',
    'import/bbmodelPaintLayers.ts',
    'import/bbmodelPaintRasters.ts',
    'import/bbmodelPaintImages.ts',
    'workers/bbmodelImportPaintReport.ts',
    'import/bbmodelSelection.ts',
    'import/bbmodelTransforms.ts',
    'import/bbmodelNodeProperties.ts',
    'import/bbmodelNodeMetadata.ts',
    'import/bbmodelNativeGeometryPlan.ts',
    'import/bbmodelPositions.ts',
    'import/bbmodelFaceUvs.ts',
    'import/bbmodelUvDimensions.ts',
    'import/bbmodelNativeUvs.ts',
    'import/bbmodelTextureLayouts.ts',
    'import/bbmodelGeometries.ts',
    'import/bbmodelImages.ts',
    'import/bbmodelTextureMaterials.ts',
    'import/bbmodelHierarchy.ts',
    'import/bbmodelSurfaceMetadata.ts',
    'import/bbmodelSurfaces.ts',
    'import/bbmodelNativeOptions.ts',
    'import/bbmodelReportLimits.ts',
    'import/bbmodelRemainder.ts',
    'import/bbmodelOptionGroup.ts',
    'import/bbmodelConversionReport.ts',
    'import/bbmodelNativeDocument.ts',
    'import/bbmodelNodeMaterials.ts',
    'import/gltfBuffers.ts',
    'import/gltfAccessors.ts',
    'import/gltfMeshes.ts',
    'import/gltfGeometries.ts',
    'import/gltfGraph.ts',
    'import/gltfAppearance.ts',
    'import/gltfResources.ts',
    'import/gltfPng.ts',
    'import/gltfJpeg.ts',
    'import/gltfRasters.ts',
    'import/gltfSkins.ts',
    'import/gltfSkinWeights.ts',
    'import/gltfAnimations.ts',
    'import/gltfAnimationSample.ts',
    'import/gltfDocument.ts',
    'import/gltfSelection.ts',
    'import/gltfHierarchy.ts',
    'import/gltfSkinBindings.ts',
    'import/gltfNativeMaterials.ts',
    'import/gltfNativeClips.ts',
    'import/gltfNativeDocument.ts',
    'workers/gltfImportRequest.ts',
    'workers/bbmodelImportRequest.ts',
    'workers/bbmodelImportReport.ts',
    'workers/bbmodelImportAnimationReport.ts',
    'workers/bbmodelImportProtocol.ts',
    'import/bbmodelLocalBundle.ts',
    'workers/nativeImportReport.ts',
    'workers/gltfImportReport.ts',
    'import/gltfLocalBundle.ts',
    'import/objDocument.ts',
    'import/objGeometries.ts',
    'import/mtlDocument.ts',
    'import/objBundle.ts',
    'import/objMaterialSelection.ts',
    'import/mtlBase.ts',
    'import/mtlTextures.ts',
    'import/rasterBatch.ts',
    'import/objRasters.ts',
    'import/objAppearance.ts',
    'import/objNativeMaterials.ts',
    'import/objHierarchy.ts',
    'import/objNativeDocument.ts',
  ]) {
    test(`${entry} não puxa React, zustand, three nem components/`, () => {
      const { files, bare } = walk(join(SRC, entry))
      const offending = [...bare].filter((spec) =>
        FORBIDDEN_BARE.some((f) => spec === f || spec.startsWith(`${f}/`)),
      )
      expect(offending).toEqual([])
      const ui = [...files].filter(
        (file) => file.includes(`${SRC}${'/'}components`) || file.includes('components\\'),
      )
      expect(ui).toEqual([])
      // Small modules are valid too; unresolved edges fail in walk instead of using a size heuristic.
      expect(files.size).toBeGreaterThan(0)
    })
  }

  test('assets/index.ts não importa idb-keyval (só o studio-library lê o banco)', () => {
    const { bare } = walk(join(SRC, 'assets/index.ts'))
    expect([...bare]).not.toContain('idb-keyval')
  })
})
