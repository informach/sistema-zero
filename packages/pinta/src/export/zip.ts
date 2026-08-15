/**
 * "Baixar tudo": um ZIP organizado por PAPEL com TODOS os assets (os dois
 * estilos lado a lado) + LEIA-ME com as receitas em PT (os números de cada
 * bloco do Estúdio). fflate carregado SOB DEMANDA (padrão studio/export/zip).
 *
 * Estrutura:
 *   personagens/<nome>/spritesheet.png + spritesheet.json [+ .svg]
 *     + animacoes/<anim>.png
 *   cenarios/<nome>.png [+ <nome>.svg]
 *   tilesets/<nome>.png [+ <nome>.svg]
 *   mapas/<nome>.png + <nome>.grade.txt + <nome>.pinta-tilemap.json
 *   galeria.pinta.json (o backup completo, re-importável)
 *   LEIA-ME.txt
 */
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
} from '../core/project'
import { flattenCels } from '../pixel/layers'
import { tilesetPngDataUrl } from '../tiles/packTileset'
import { vectorTilesetPngDataUrl, vectorTilesetPortableSvg } from '../tiles/packVectorTileset'
import { tilemapPngDataUrl } from '../tiles/renderTilemap'
import { vectorTilemapPngDataUrl } from '../tiles/renderVectorTilemap'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { vectorPngDataUrl } from '../vector/rasterize'
import { PINTA_GALLERY_ZIP_ENTRY } from './backupFormat'
import { bitmapToPngDataUrl, composeSheetPngDataUrl, dataUrlToBlob } from './png'
import { galleryToPintaJson } from './projectJson'
import { packSpritesheet, spritesheetMetadata, spritesheetRecipe } from './spritesheet'
import { tilemapExportJson, tilemapRecipe, tilemapToStudioGrid } from './studioGrid'
import {
  packVectorSpritesheet,
  vectorSheetPngDataUrl,
  vectorSheetPortableSvg,
  vectorStripPngDataUrl,
} from './vectorSheet'

type FileMap = Record<string, Uint8Array | string>

async function dataUrlBytes(dataUrl: string | null): Promise<Uint8Array | null> {
  const blob = dataUrl ? dataUrlToBlob(dataUrl) : null
  if (!blob) return null
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Nome de ANIMAÇÃO → nome de arquivo seguro: o nome é texto livre (pode ter
 * `/`, `..`) e vira caminho dentro do ZIP — sem sanear, um nome esperto cria
 * pastas/traversal e dois nomes iguais sobrescrevem a mesma entrada.
 */
function safeFileName(name: string, index: number, taken: Set<string>): string {
  const cleaned =
    name
      .replace(/\.\./g, '-')
      .replace(/[/\\:*?"<>|]/g, '-')
      .trim() || `animacao-${index}`
  let candidate = cleaned
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${cleaned}-${n}`
    n += 1
  }
  taken.add(candidate)
  return candidate
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
  const tilesetsById = new Map<string, AnyTilesetAsset>()
  for (const asset of assets) {
    if (isTilesetKind(asset)) tilesetsById.set(asset.id, asset)
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
            colors: resolveAssetPalette(asset),
          }),
        )
        if (sheet) files[`personagens/${asset.name}/spritesheet.png`] = sheet
        files[`personagens/${asset.name}/spritesheet.json`] = spritesheetMetadata(pack)
        const takenNames = new Set<string>()
        for (const [animationIndex, animation] of asset.animations.entries()) {
          const strip = await dataUrlBytes(
            composeSheetPngDataUrl({
              cells: animation.frames.flatMap((cels, col) => {
                const bitmap = flattenCels(cels, asset.layers)
                return bitmap ? [{ bitmap, col, row: 0 }] : []
              }),
              cellWidth: asset.frameWidth,
              cellHeight: asset.frameHeight,
              columns: animation.frames.length,
              rows: 1,
              colors: resolveAssetPalette(asset),
            }),
          )
          if (strip) {
            const fileName = safeFileName(animation.name, animationIndex, takenNames)
            files[`personagens/${asset.name}/animacoes/${fileName}.png`] = strip
          }
        }
        readme.push(`• Personagem "${asset.name}":`, spritesheetRecipe(pack), '')
        break
      }
      case 'pixel-background': {
        const flat = flattenCels(asset.cels, asset.layers)
        const png = flat
          ? await dataUrlBytes(bitmapToPngDataUrl(flat, resolveAssetPalette(asset)))
          : null
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
        const png = await dataUrlBytes(
          tileset.kind === 'tileset'
            ? tilemapPngDataUrl(asset, tileset)
            : await vectorTilemapPngDataUrl(asset, tileset),
        )
        if (png) files[`mapas/${asset.name}.png`] = png
        files[`mapas/${asset.name}.grade.txt`] = tilemapToStudioGrid(asset)
        files[`mapas/${asset.name}.pinta-tilemap.json`] = tilemapExportJson(asset, tileset)
        readme.push(`• Mapa "${asset.name}":`, tilemapRecipe(asset, tileset), '')
        break
      }
      case 'vector-sprite': {
        const pack = packVectorSpritesheet(asset)
        const sheet = await dataUrlBytes(await vectorSheetPngDataUrl(pack))
        if (sheet) files[`personagens/${asset.name}/spritesheet.png`] = sheet
        files[`personagens/${asset.name}/spritesheet.svg`] = await vectorSheetPortableSvg(pack)
        files[`personagens/${asset.name}/spritesheet.json`] = spritesheetMetadata(pack)
        const takenNames = new Set<string>()
        for (const [animationIndex, animation] of asset.animations.entries()) {
          const strip = await dataUrlBytes(await vectorStripPngDataUrl(asset, animation))
          if (strip) {
            const fileName = safeFileName(animation.name, animationIndex, takenNames)
            files[`personagens/${asset.name}/animacoes/${fileName}.png`] = strip
          }
        }
        readme.push(`• Personagem "${asset.name}":`, spritesheetRecipe(pack), '')
        break
      }
      case 'vector-background': {
        files[`cenarios/${asset.name}.svg`] = await vectorToPortableSvg(asset)
        const png = await dataUrlBytes(await vectorPngDataUrl(asset))
        if (png) files[`cenarios/${asset.name}.png`] = png
        break
      }
      case 'vector-tileset': {
        files[`tilesets/${asset.name}.svg`] = await vectorTilesetPortableSvg(asset)
        const png = await dataUrlBytes(await vectorTilesetPngDataUrl(asset))
        if (png) files[`tilesets/${asset.name}.png`] = png
        break
      }
    }
  }

  files[PINTA_GALLERY_ZIP_ENTRY] = galleryToPintaJson(assets)
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
