import { isValidAssetDataUrl, type ProjectAsset } from '#core'
import type { PersonalAsset } from './personal'

export const PERSONAL_LIB_PREFIX = 'personal:'

/** Identity and merge policy shared by import and live reconciliation. */
export function personalIdOf(asset: Pick<ProjectAsset, 'libId'>): string | null {
  const libId = asset.libId
  if (typeof libId !== 'string' || !libId.startsWith(PERSONAL_LIB_PREFIX)) return null
  const id = libId.slice(PERSONAL_LIB_PREFIX.length)
  return id.length > 0 ? id : null
}

export function mergeDrawingIntoAsset(
  asset: ProjectAsset,
  drawing: PersonalAsset,
): ProjectAsset | null {
  // Legacy canonical copies cannot replace an explicitly derived frame/map.
  if (asset.pintaImage !== undefined) return null
  const is3D = asset.kind === 'model3d' || asset.kind === 'environment3d'
  // 3D: o nome do arquivo faz parte da validação (extensão × MIME × assinatura), então
  // vale o da criação nova e, sem ele, o que o asset já tinha.
  const originalFileName = is3D
    ? typeof drawing.originalFileName === 'string' && drawing.originalFileName.trim()
      ? drawing.originalFileName.trim().slice(0, 128)
      : asset.originalFileName
    : undefined
  if (
    is3D
      ? !isValidAssetDataUrl(drawing.dataUrl, asset.kind, originalFileName)
      : !isValidAssetDataUrl(drawing.dataUrl, 'image')
  ) {
    return null
  }
  const width = typeof drawing.width === 'number' && drawing.width > 0 ? drawing.width : undefined
  const height =
    typeof drawing.height === 'number' && drawing.height > 0 ? drawing.height : undefined
  const sameGeometry =
    (width ?? asset.width) === asset.width && (height ?? asset.height) === asset.height
  const sprite = drawing.sprite ?? (sameGeometry ? asset.sprite : undefined)
  const tileset = drawing.tileset ?? (sameGeometry ? asset.tileset : undefined)
  // Desenho com cena manda no mapa inteiro: o mapa antigo que ele não traz SAI (sem herança
  // por geometria), senão o bloco antigo seguiria desenhando o mapa velho ao lado da cena nova.
  const inherit = sameGeometry && drawing.scene === undefined
  const tilemap = drawing.tilemap ?? (inherit ? asset.tilemap : undefined)
  const scene = drawing.scene ?? (sameGeometry ? asset.scene : undefined),
    tilemapFront = drawing.tilemapFront ?? (inherit ? asset.tilemapFront : undefined)
  // Nome/id/libId/source intocados — os blocos referenciam o asset pelo NOME.
  const next: ProjectAsset = {
    ...asset,
    dataUrl: drawing.dataUrl,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    libRevision: drawing.updatedAt,
    // 3D: o nome do arquivo que acabou de passar na validação (o novo ou o que já havia).
    ...(originalFileName ? { originalFileName } : {}),
  }
  if (sprite) next.sprite = sprite
  else delete next.sprite
  if (tileset) next.tileset = tileset
  else delete next.tileset
  if (tilemap) next.tilemap = tilemap
  else delete next.tilemap
  if (scene) next.scene = scene
  else delete next.scene
  if (tilemapFront) next.tilemapFront = tilemapFront
  else delete next.tilemapFront
  return next
}
