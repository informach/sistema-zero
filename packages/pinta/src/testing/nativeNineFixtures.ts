/** The frozen native-9 files (`src/export/__fixtures__`) as the workshop opens them. */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { pintaWorkshopAssetToJson, readPintaWorkshopBackup } from '../export/workshopDocument'
import { decodeWorkshopProjectedMap } from '../export/workshopProjection'
import { isPintaAuthoredMap } from '../tiles/automapping/model'

export function nativeNineFixture(name: string): string {
  return gunzipSync(
    readFileSync(new URL(`../export/__fixtures__/${name}`, import.meta.url)),
  ).toString('utf8')
}

/** Hexagonal projection with a rulebook (`mapa-hex`) and isometric without one (`mapa-iso`). */
export const PROJECTED_HEX = nativeNineFixture('pinta-nativo-9-projecao-livro.json.gz')
export const PROJECTED_ISO = nativeNineFixture('pinta-nativo-9-projecao.json.gz')

export function projectedFixture(text: string): WorkshopProjectedMap {
  const map = decodeWorkshopProjectedMap(JSON.parse(text).assets[0])
  if (!map) throw Error('Fixture projetada recusada')
  return map
}

/** Sheet `folha-chao`, the rulebook map `cenario-vila` and the three native-9 variants. */
export async function nativeNineGallery() {
  const { assets, warnings } = await readPintaWorkshopBackup(
    nativeNineFixture('pinta-nativo-9-livro.json.gz'),
  )
  const [sheet, authored, plain] = assets
  if (warnings.length || !sheet || !authored || !plain || !isPintaAuthoredMap(authored))
    throw Error('Fixture do livro recusada')
  const book = pintaWorkshopAssetToJson(authored)
  if (!book) throw Error('Parte com livro recusada')
  const hex = projectedFixture(PROJECTED_HEX)
  const iso = projectedFixture(PROJECTED_ISO)
  const variants: { asset: PintaWorkshopAsset; text: string }[] = [
    { asset: authored, text: book },
    { asset: hex, text: PROJECTED_HEX },
    { asset: iso, text: PROJECTED_ISO },
  ]
  return { sheet, authored, plain, hex, iso, variants }
}

/** Session provenance (`localAssetOrigin`) is a symbol; IndexedDB and files never carry it. */
export const withoutSession = <T>(value: T): T => structuredClone(value)
