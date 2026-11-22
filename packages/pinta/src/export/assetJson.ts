/**
 * UM desenho como texto — o formato que atravessa a fronteira do pacote.
 *
 * É o que a aula precisa em três momentos: a criança ENVIA o desenho ao professor, ela RETOMA de
 * onde parou ao reabrir o bloco, e ela BAIXA o arquivo para levar ao Pinta completo.
 *
 * ⭐ **O envelope é o MESMO `pinta-gallery` do backup da galeria** (v1; v2 só quando um mapa tem
 * objetos ou peças por camada), com um asset no array. Isso
 * não é economia de código, é o que faz o "baixar aqui, importar lá" funcionar sem nenhuma ponte
 * nova: o arquivo que o bloco gera é exatamente um `.pinta.json` que a galeria já sabe restaurar.
 *
 * ⚠️⚠️ **A identidade é PRESERVADA aqui, e isso é o ponto todo.** O `importPintaJson` só decodifica
 * e sanitiza — quem troca o id e sufixa o nome é o `galleryStore.importAssets`, de propósito
 * ("import nunca sobrescreve"). Para trazer uma cópia à galeria pessoal aquele comportamento é o
 * certo; para RETOMAR o próprio trabalho seria fatal, porque cada abertura do bloco criaria um
 * desenho novo. Por isso este módulo fala com o `importPintaJson` DIRETO e nunca com o store.
 */
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  PINTA_DEPENDENCY_ASSET_LIMIT,
  type PintaAsset,
  pintaAssetDependencyIds,
} from '../core/project'
import { pintaDoorDependencyIds, SceneMapClosureError } from '../core/sceneMapClosure'
import { galleryToPintaJson, importPintaJson } from './projectJson'

export interface AssetImportResult {
  /** `null` quando o texto não é legível ou o desenho estava corrompido. */
  asset: PintaAsset | null
  /** Descartes explicados (padrão do pacote: nada some em silêncio). */
  warnings: string[]
}

/** Um desenho → texto `.pinta.json`. */
export function assetToJson(asset: PintaAsset): string {
  return galleryToPintaJson([asset])
}

/**
 * Um desenho PORTÁTIL para baixar no Pinta completo.
 *
 * O mapa precisa dos seus tilesets e as propriedades tipadas podem apontar para outros recursos
 * em mapas ou peças. O pacote conserva essa cadeia inteira, com dependências antes de quem as
 * usa quando não há ciclos; `galleryStore.importAssets` troca e religa os ids no restauro.
 *
 * `null` recusa produzir um mapa quebrado. Esta função é interna da UI e não muda o contrato de
 * `assetToJson`, que precisa continuar sendo exatamente UM asset para o bloco de aula.
 */
export function assetBundleToJson(
  asset: PintaAsset,
  galleryAssets: readonly PintaAsset[],
): string | null {
  const byId = new Map(galleryAssets.map((a) => [a.id, a]))
  byId.set(asset.id, asset)
  const bundle = collectAssetBundle(asset, byId, new Map())
  return bundle ? galleryToPintaJson(bundle) : null
}

/** References only: the detector never repeatedly encodes cells or images. */
export function collectAssetBundle<Asset extends PintaMemoryAsset>(
  asset: Asset,
  byId: ReadonlyMap<string, Asset>,
  cache: Map<string, readonly string[] | null>,
): Asset[] | null {
  const dependenciesOf = (item: Asset): readonly string[] | null => {
    if (cache.has(item.id)) return cache.get(item.id) ?? null
    try {
      const ids = [
        ...new Set([...pintaAssetDependencyIds(item), ...pintaDoorDependencyIds(item, byId)]),
      ]
      cache.set(item.id, ids)
      return ids
    } catch (error) {
      if (!(error instanceof SceneMapClosureError)) throw error
      cache.set(item.id, null)
      return null
    }
  }
  const dependencies = dependenciesOf(asset)
  if (!dependencies) return null
  const seen = new Set<string>([asset.id]),
    ordered: Asset[] = []
  // Iterativo: propriedades podem ligar recursos em ciclos ou cadeias longas. O teto é o da
  // captura de imagens; ultrapassá-lo recusa o pacote inteiro em vez de omitir referências.
  const pending = [{ asset, dependencies, next: 0 }]
  while (pending.length) {
    const frame = pending[pending.length - 1]!
    const id = frame.dependencies[frame.next++]
    if (id === undefined) {
      ordered.push(frame.asset)
      pending.pop()
      continue
    }
    if (seen.has(id)) continue
    const dependency = byId.get(id)
    if (!dependency || seen.size >= PINTA_DEPENDENCY_ASSET_LIMIT) return null
    const next = dependenciesOf(dependency)
    if (!next) return null
    seen.add(id)
    pending.push({ asset: dependency, dependencies: next, next: 0 })
  }
  return ordered
}

/**
 * O arquivo é um cenário conectado completo? Inclui mundos com portas e ciclos.
 * A galeria restaura o pacote de forma ATÔMICA (ou volta tudo, ou nada).
 */
export function isTilemapBundle(assets: readonly PintaAsset[]): boolean {
  if (assets.length < 2 || assets.length > PINTA_DEPENDENCY_ASSET_LIMIT) return false
  if (!assets.some((asset) => asset.kind === 'tilemap')) return false
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  if (byId.size !== assets.length) return false
  const cache = new Map<string, readonly string[] | null>()
  // Portable exports put their root last. Other gallery ordering remains supported.
  for (const root of [...assets].reverse())
    if (collectAssetBundle(root, byId, cache)?.length === assets.length) return true
  return false
}

/**
 * Texto `.pinta.json` → o PRIMEIRO desenho. NUNCA lança.
 *
 * Aceitar um arquivo com vários é deliberado: a criança pode escolher um backup inteiro da galeria
 * no lugar do desenho da aula, e recusar seria um beco sem saída. Leva o primeiro e avisa.
 */
export function assetFromJson(text: string): AssetImportResult {
  const { assets, warnings } = importPintaJson(text)
  const [asset] = assets
  if (!asset) {
    return {
      asset: null,
      warnings: warnings.length > 0 ? warnings : ['O arquivo não tem nenhum desenho.'],
    }
  }
  if (assets.length > 1) {
    warnings.push('O arquivo tinha mais de um desenho; usei o primeiro.')
  }
  return { asset, warnings }
}
