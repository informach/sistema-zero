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
import type { PintaAsset } from '../core/project'
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
  if (asset.kind !== 'tilemap' && asset.kind !== 'map-set') return assetToJson(asset)
  const byId = new Map(galleryAssets.map((a) => [a.id, a])),
    seen = new Set<string>(),
    ordered: PintaAsset[] = []
  const visit = (a: PintaAsset): boolean => {
    if (seen.has(a.id)) return true
    seen.add(a.id)
    const map = a.kind === 'tilemap' ? a : a.kind === 'map-set' ? a.map : null
    if (map) {
      const refs = [
        ...new Set([
          map.tilesetId,
          ...map.layers.flatMap((l) =>
            l.kind === 'objects'
              ? l.objects.flatMap((o) => [
                  ...(o.art ? [o.art.assetId] : []),
                  ...(o.setId ? [o.setId] : []),
                ])
              : l.kind === 'group'
                ? []
                : l.tilesetId
                  ? [l.tilesetId]
                  : [],
          ),
        ]),
      ]
      for (const id of refs) {
        const dep = byId.get(id)
        if (!dep || !visit(dep)) return false
      }
    }
    ordered.push(a)
    return true
  }
  return visit(asset) ? galleryToPintaJson(ordered) : null
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
