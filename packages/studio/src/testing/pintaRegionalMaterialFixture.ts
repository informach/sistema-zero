import { createRequire } from 'node:module'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { encodeAssetBase64 } from '../core/assetBinary'
import { admitPintaRegionalMaterial, type PintaRegionalMarker } from '../core/pintaRegionalMaterial'
import type { ProjectAsset } from '../core/project'

/**
 * Um cenário regional do Pinta pronto para entrar num projeto (a Vila de quatro áreas, com a arte
 * e os tilesets em PNG de verdade), admitido pela mesma porta que o editor usa.
 */
const { createCanvas, loadImage } = createRequire(
  new URL('../../../pinta/package.json', import.meta.url),
)('@napi-rs/canvas') as typeof import('../../../pinta/node_modules/@napi-rs/canvas')

const png = (width: number, height: number, color = '#3355dd') => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`

/**
 * A admissão mede o PNG com `createImageBitmap`, que o happy-dom não decodifica. Liga um que lê o
 * PNG de verdade e devolve como desligar (chame no `afterAll`).
 */
export function installPngImageBitmap(): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async (bytes: Blob) => {
      const { width, height } = await loadImage(Buffer.from(await bytes.arrayBuffer()))
      return { width, height, close: () => {} }
    },
  })
  return () => {
    if (descriptor) Object.defineProperty(globalThis, 'createImageBitmap', descriptor)
    else Reflect.deleteProperty(globalThis, 'createImageBitmap')
  }
}

export async function regionalSceneMaterial(
  overviewColor = '#002244',
): Promise<
  ProjectAsset & { kind: 'image'; width: number; height: number; regional: PintaRegionalMarker }
> {
  const fixture = scene4Fixture()
  const scene = JSON.stringify({
    ...fixture,
    physics: 'precise',
    tilesets: fixture.tilesets.map((sheet) => ({ ...sheet, image: url(png(64, 16)) })),
    art: fixture.art.map((art) => ({ ...art, image: url(png(art.width, art.height)) })),
  })
  const { png: bytes } = await embedPintaRegionImage(png(64, 32, overviewColor), scene)
  const dataUrl = url(bytes)
  const { regional } = await admitPintaRegionalMaterial({
    dataUrl,
    sourceId: 'world',
    width: 64,
    height: 32,
  })
  return {
    id: 'vila',
    name: 'vila',
    kind: 'image',
    source: 'library',
    libOrigin: 'pinta',
    libId: 'personal:world',
    proPath: 'public/assets/vila.png',
    width: 64,
    height: 32,
    dataUrl,
    regional,
  }
}

/** Native projected documents use the same producer and admission as the Pinta→Studio bridge. */
export async function projectedSceneMaterial(kind: 'isometric' | 'hexagonal') {
  const { nativeNineGallery } = await import('../../../pinta/src/testing/nativeNineFixtures')
  const { exportPintaProjectedScene } = await import('../../../pinta/src/export/projectedScene')
  const { nativeImageOf } = await import('../../../pinta/scripts/homologacao/generate')
  const { readPngDataUrl } = await import('@sistemazero/core/studio/pinta-png-binary')
  const { PINTA_REGION_IMAGE_PNG_LIMITS } = await import(
    '@sistemazero/core/studio/pinta-region-image-limits'
  )
  const { sheet, hex, iso } = await nativeNineGallery()
  const map = kind === 'hexagonal' ? hex : iso
  const scene = await exportPintaProjectedScene(
    map,
    (id) => (id === sheet.id ? sheet : null),
    nativeImageOf,
  )
  const cover = readPngDataUrl(scene.wire.tilesets[0]!.image, PINTA_REGION_IMAGE_PNG_LIMITS)
  const { png } = await embedPintaRegionImage(cover.bytes, scene.json)
  const admitted = await admitPintaRegionalMaterial({
    png,
    sourceId: map.id,
    width: cover.width,
    height: cover.height,
  })
  return {
    id: `material-${map.id}`,
    name: map.name,
    kind: 'image' as const,
    source: 'library' as const,
    libOrigin: 'pinta' as const,
    libId: `personal:${map.id}`,
    proPath: `public/assets/${map.name}.png`,
    width: cover.width,
    height: cover.height,
    dataUrl: admitted.dataUrl,
    regional: admitted.regional,
  }
}
