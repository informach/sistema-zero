import { ulid } from 'ulid'
import { mergeDrawingIntoAsset, personalIdOf } from '../asset-library/personalAssetMerge'
import { uniqueAssetName } from '../core/assetNames'
import {
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  projectAssetBudgetChars,
  sanitizeProjectAssets,
  sanitizeSceneMeta,
  sanitizeSpriteMeta,
  sanitizeTilemapMeta,
  sanitizeTilesetMeta,
} from '../core/projectAssets'
import { assertProjectContentPreserved } from '../core/projectDocument'
import { scene3DResourceChangeIssue } from '../core/scene3d/referencias'
import type { StudioPintaImportedAsset } from '../studio/pinta-library'

/** Pure preflight. No program, project identity or store mutation happens here. */
export function preparePintaMapBundle(
  current: readonly ProjectAsset[],
  source: StudioPintaImportedAsset,
): ProjectAsset[] {
  const inputs = [source, ...(source.maps ?? [])]
  if (
    source.pintaImage ||
    inputs.length > 16 ||
    new Set(inputs.map((a) => a.id)).size !== inputs.length
  )
    throw new Error('Este conjunto de mapas é inválido ou grande demais.')
  const next = [...current]
  for (const input of inputs) {
    const scene = sanitizeSceneMeta(input.scene)
    if (!input.id || input.id.includes(':') || !scene)
      throw new Error('Um dos mapas está incompleto ou passou do limite do Estúdio.')
    const previous = next.find((a) => personalIdOf(a) === input.id)
    if (
      previous &&
      (previous.kind !== 'image' || previous.libOrigin === 'molda' || previous.pintaImage)
    )
      throw new Error('Este mapa está ligado a outro tipo de material no projeto.')
    const drawing = {
      id: input.id,
      name: input.name,
      kind: 'image' as const,
      dataUrl: input.dataUrl,
      width: input.width,
      height: input.height,
      scene,
      sprite: sanitizeSpriteMeta(input.sprite),
      tileset: sanitizeTilesetMeta(input.tileset),
      tilemap: sanitizeTilemapMeta(input.tilemap),
      tilemapFront: sanitizeTilemapMeta(input.tilemapFront),
      updatedAt: input.libRevision ?? Date.now(),
    }
    const base: ProjectAsset = previous ?? {
      id: ulid(),
      name: uniqueAssetName(input.name, new Set(next.map((a) => a.name))),
      kind: 'image',
      dataUrl: input.dataUrl,
      source: 'library',
      libId: `personal:${input.id}`,
      libOrigin: 'pinta',
    }
    const asset = mergeDrawingIntoAsset(base, drawing)
    if (!asset) throw new Error('Não consegui atualizar um dos mapas deste conjunto.')
    if (previous) next[next.indexOf(previous)] = asset
    else next.push(asset)
  }
  if (next.length > PROJECT_ASSET_LIMITS.maxAssetsCount)
    throw new Error('Estes mapas ultrapassam o limite de arquivos do projeto. O jogo foi mantido.')
  if (
    next.reduce((sum, asset) => sum + projectAssetBudgetChars(asset), 0) >
    PROJECT_ASSET_LIMITS.maxAssetsTotalChars
  )
    throw new Error('Estes mapas ultrapassam o espaço do projeto. O jogo foi mantido.')
  const sanitized = sanitizeProjectAssets(next)
  const sceneIssue = scene3DResourceChangeIssue(current, sanitized)
  if (sceneIssue) throw new Error(sceneIssue)
  try {
    assertProjectContentPreserved({ assets: next }, { assets: sanitized })
  } catch (cause) {
    throw new Error('Não consegui preservar todos os detalhes destes mapas. O jogo foi mantido.', {
      cause,
    })
  }
  return sanitized
}
