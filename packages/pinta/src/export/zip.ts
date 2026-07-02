/**
 * "Baixar tudo": um ZIP organizado por tipo com TODOS os assets + LEIA-ME com
 * as receitas em PT (os números de cada bloco do Estúdio). fflate carregado
 * SOB DEMANDA (padrão studio/src/export/zip.ts).
 *
 * Estrutura:
 *   personagens/<nome>/spritesheet.png + spritesheet.json + animacoes/<anim>.png
 *   cenarios/<nome>.png
 *   tilesets/<nome>.png
 *   mapas/<nome>.png + <nome>.grade.txt + <nome>.pinta-tilemap.json
 *   vetores/<nome>.svg
 *   galeria.pinta.json (o backup completo, re-importável)
 *   LEIA-ME.txt
 */
import type { PintaAsset, TilesetAsset } from '../core/project'
import { tilesetPngDataUrl } from '../tiles/packTileset'
import { tilemapPngDataUrl } from '../tiles/renderTilemap'
import { vectorPngDataUrl } from '../vector/rasterize'
import { vectorToSvg } from '../vector/svg'
import { bitmapToPngDataUrl, composeSheetPngDataUrl, dataUrlToBlob } from './png'
import { galleryToPintaJson } from './projectJson'
import { packSpritesheet, spritesheetMetadata, spritesheetRecipe } from './spritesheet'
import { tilemapExportJson, tilemapRecipe, tilemapToStudioGrid } from './studioGrid'

type FileMap = Record<string, Uint8Array | string>

async function dataUrlBytes(dataUrl: string | null): Promise<Uint8Array | null> {
  const blob = dataUrl ? dataUrlToBlob(dataUrl) : null
  if (!blob) return null
  return new Uint8Array(await blob.arrayBuffer())
}

/** Monta o mapa de arquivos (async: rasterizações). Pula o que não renderizar. */
export async function buildGalleryFileMap(assets: PintaAsset[]): Promise<{
  files: FileMap
  readme: string[]
}> {
  const files: FileMap = {}
  const readme: string[] = [
    'Seus desenhos do Pinta! 🎨',
    'Cada pasta tem um tipo de desenho, prontos para usar no Estúdio ou em qualquer editor.',
    '',
  ]
  const tilesetsById = new Map<string, TilesetAsset>()
  for (const asset of assets) {
    if (asset.kind === 'tileset') tilesetsById.set(asset.id, asset)
  }

  for (const asset of assets) {
    switch (asset.kind) {
      case 'pixel-sprite': {
        const pack = packSpritesheet(asset)
        const sheet = await dataUrlBytes(
          composeSheetPngDataUrl({
            cells: pack.cells,
            cellWidth: pack.frameWidth,
            cellHeight: pack.frameHeight,
            columns: pack.columns,
            rows: pack.rows,
            paletteId: asset.paletteId,
          }),
        )
        if (sheet) files[`personagens/${asset.name}/spritesheet.png`] = sheet
        files[`personagens/${asset.name}/spritesheet.json`] = spritesheetMetadata(pack)
        for (const animation of asset.animations) {
          const strip = await dataUrlBytes(
            composeSheetPngDataUrl({
              cells: animation.frames.map((bitmap, col) => ({ bitmap, col, row: 0 })),
              cellWidth: asset.frameWidth,
              cellHeight: asset.frameHeight,
              columns: animation.frames.length,
              rows: 1,
              paletteId: asset.paletteId,
            }),
          )
          if (strip) files[`personagens/${asset.name}/animacoes/${animation.name}.png`] = strip
        }
        readme.push(`— Personagem "${asset.name}":`, spritesheetRecipe(pack), '')
        break
      }
      case 'pixel-background': {
        const png = await dataUrlBytes(bitmapToPngDataUrl(asset.bitmap, asset.paletteId))
        if (png) files[`cenarios/${asset.name}.png`] = png
        break
      }
      case 'tileset': {
        const png = await dataUrlBytes(tilesetPngDataUrl(asset))
        if (png) files[`tilesets/${asset.name}.png`] = png
        break
      }
      case 'tilemap': {
        const tileset = tilesetsById.get(asset.tilesetId)
        if (!tileset) break
        const png = await dataUrlBytes(tilemapPngDataUrl(asset, tileset))
        if (png) files[`mapas/${asset.name}.png`] = png
        files[`mapas/${asset.name}.grade.txt`] = tilemapToStudioGrid(asset)
        files[`mapas/${asset.name}.pinta-tilemap.json`] = tilemapExportJson(asset, tileset)
        readme.push(`— Mapa "${asset.name}":`, tilemapRecipe(asset, tileset), '')
        break
      }
      case 'vector': {
        files[`vetores/${asset.name}.svg`] = vectorToSvg(asset)
        const png = await dataUrlBytes(await vectorPngDataUrl(asset))
        if (png) files[`vetores/${asset.name}.png`] = png
        break
      }
    }
  }

  files['galeria.pinta.json'] = galleryToPintaJson(assets)
  return { files, readme }
}

/** Zipa o mapa (fflate sob demanda; chaves com `/` viram pastas). */
export async function zipGallery(assets: PintaAsset[]): Promise<Uint8Array> {
  const { files, readme } = await buildGalleryFileMap(assets)
  files['LEIA-ME.txt'] = readme.join('\n')
  const { strToU8, zipSync } = await import('fflate')
  const flat: Record<string, Uint8Array> = {}
  for (const [path, content] of Object.entries(files)) {
    flat[path] = typeof content === 'string' ? strToU8(content) : content
  }
  return zipSync(flat, { level: 6 })
}
