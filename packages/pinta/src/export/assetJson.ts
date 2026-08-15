/**
 * UM desenho como texto — o formato que atravessa a fronteira do pacote.
 *
 * É o que a aula precisa em três momentos: a criança ENVIA o desenho ao professor, ela RETOMA de
 * onde parou ao reabrir o bloco, e ela BAIXA o arquivo para levar ao Pinta completo.
 *
 * ⭐ **O envelope é o MESMO `pinta-gallery` v1 do backup da galeria**, com um asset no array. Isso
 * não é economia de código, é o que faz o "baixar aqui, importar lá" funcionar sem nenhuma ponte
 * nova: o arquivo que o bloco gera é exatamente um `.pinta.json` que a galeria já sabe restaurar.
 *
 * ⚠️⚠️ **A identidade é PRESERVADA aqui, e isso é o ponto todo.** O `importPintaJson` só decodifica
 * e sanitiza — quem troca o id e sufixa o nome é o `galleryStore.importAssets`, de propósito
 * ("import nunca sobrescreve"). Para trazer uma cópia à galeria pessoal aquele comportamento é o
 * certo; para RETOMAR o próprio trabalho seria fatal, porque cada abertura do bloco criaria um
 * desenho novo. Por isso este módulo fala com o `importPintaJson` DIRETO e nunca com o store.
 */
import { isTilesetKind, type PintaAsset } from '../core/project'
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
 * Quase todo asset é autônomo. O mapa é a exceção: sem o tileset apontado por `tilesetId` ele
 * volta como uma grade sem aparência. Por isso o arquivo de UM mapa leva primeiro as peças e
 * depois o mapa; `galleryStore.importAssets` já troca os ids e religa os dois no restauro.
 *
 * `null` recusa produzir um mapa quebrado. Esta função é interna da UI e não muda o contrato de
 * `assetToJson`, que precisa continuar sendo exatamente UM asset para o bloco de aula.
 */
export function assetBundleToJson(
  asset: PintaAsset,
  galleryAssets: readonly PintaAsset[],
): string | null {
  if (asset.kind !== 'tilemap') return assetToJson(asset)
  const tileset = galleryAssets.find(
    (candidate) => isTilesetKind(candidate) && candidate.id === asset.tilesetId,
  )
  return tileset ? galleryToPintaJson([tileset, asset]) : null
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
