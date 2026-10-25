/**
 * O PLANO de uma importação de desenhos (puro): nomes únicos contra a galeria, ids novos e
 * mapas religados às peças que vieram junto. Compartilhado pela galeria (`importAssets`, o
 * restauro de backup e o pacote) e pela biblioteca do Estúdio (`importDrawingsForStudio`, os
 * desenhos de um jogo de exemplo), que precisa saber QUAL id novo cada desenho ganhou.
 */
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  isTilesetKind,
  PINTA_LIMITS,
  type PintaAsset,
  remapTilemapTilesetIds,
} from '../core/project'

/** Nome único por sufixo numérico (`heroi` → `heroi-2`), respeitando o teto. */
export function uniqueName(base: string, taken: Set<string>): string | null {
  if (!taken.has(base)) return base
  // Sem teto de desenhos na galeria, o sufixo vai até 999 antes de desistir.
  for (let n = 2; n <= 999; n += 1) {
    const suffix = `-${n}`
    const prefix = base.slice(0, PINTA_LIMITS.maxNameChars - suffix.length).replace(/-+$/, '')
    const candidate = `${prefix}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return null
}

/** Clona um asset com ids NOVOS (asset + animações + camadas) p/ o Duplicar e a importação. */
export function cloneWithNewIds(asset: PintaAsset, name: string): PintaAsset {
  const now = Date.now()
  const copy = structuredClone(asset)
  copy.id = newId()
  copy.name = name
  copy.createdAt = now
  copy.updatedAt = now
  // A cópia é um desenho NOVO: a marca "sou a cópia daquele documento" fica com o original.
  delete copy.sourceRef
  if (copy.kind === 'pixel-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'vector-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'tilemap') {
    copy.layers = copy.layers.map((l) => ({ ...l, id: newId() }))
  }
  return copy
}

export interface ImportPlan {
  /** O desenho como veio e o que vai ao disco (id novo, nome único, peças religadas). */
  pairs: Array<{ source: PintaAsset; restored: PintaAsset }>
  /** id de origem → id novo. */
  idMap: Map<string, string>
  skipped: number
  error: string | null
}

/**
 * Planeja `eligible` (tilesets PRIMEIRO, já filtrado de mapas sem peças) contra os nomes
 * `taken`. Um mapa cujas peças vieram junto mas não entraram no plano é pulado (ficaria órfão).
 * A peça de camada que não veio segue apontando para o id de antes.
 */
export function planImport(
  eligible: readonly PintaAsset[],
  incomingTilesetIds: ReadonlySet<string>,
  taken: Set<string>,
): ImportPlan {
  const idMap = new Map<string, string>()
  const prepared: PintaAsset[] = []
  const preparedTilesetIds = new Set<string>()
  let skipped = 0
  let error: string | null = null
  for (const asset of eligible) {
    if (
      asset.kind === 'tilemap' &&
      incomingTilesetIds.has(asset.tilesetId) &&
      !preparedTilesetIds.has(asset.tilesetId)
    ) {
      skipped += 1
      error ??= COPY.gallery.restoreMissingTileset
      continue
    }
    const name = uniqueName(asset.name, taken)
    if (!name) {
      skipped += 1
      error ??= COPY.newAsset.nameTaken
      continue
    }
    const clone = cloneWithNewIds(asset, name)
    idMap.set(asset.id, clone.id)
    if (isTilesetKind(asset)) preparedTilesetIds.add(asset.id)
    prepared.push(clone)
    taken.add(name)
  }
  const pairs = prepared.map((source) => ({
    source,
    restored:
      source.kind === 'tilemap'
        ? remapTilemapTilesetIds(source, (id) => idMap.get(id) ?? id)
        : source,
  }))
  return { pairs, idMap, skipped, error }
}
