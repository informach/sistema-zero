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
import {
  PINTA_DEPENDENCY_ASSET_LIMIT,
  type PintaAsset,
  pintaAssetDependencyIds,
} from '../core/project'
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
  const dependencies = pintaAssetDependencyIds(asset)
  if (dependencies.length === 0) return assetToJson(asset)
  const byId = new Map(galleryAssets.map((a) => [a.id, a])),
    seen = new Set<string>([asset.id]),
    ordered: PintaAsset[] = []
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
    seen.add(id)
    pending.push({ asset: dependency, dependencies: pintaAssetDependencyIds(dependency), next: 0 })
  }
  return galleryToPintaJson(ordered)
}

/**
 * O arquivo é o pacote de UM mapa (o que `assetBundleToJson` gera)? Um mapa só +
 * tilesets que ele usa, com as peças padrão dele presentes. A galeria restaura
 * esse pacote de forma ATÔMICA (ou volta tudo, ou nada).
 */
export function isTilemapBundle(assets: readonly PintaAsset[]): boolean {
  const maps = assets.filter((asset) => asset.kind === 'tilemap')
  const map = maps[0]
  if (maps.length !== 1 || map?.kind !== 'tilemap') return false
  const bundle = assetBundleToJson(map, assets)
  if (!bundle) return false
  const ids = new Set(importPintaJson(bundle).assets.map((a) => a.id))
  return assets.length > 1 && ids.size === assets.length && assets.every((a) => ids.has(a.id))
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
