import { AvatarInvalidError, AvatarPartNotOwnedError } from './avatar.errors'
import {
  AVATAR_LAYERS,
  AVATAR_PARTS_BY_ID,
  AVATAR_STYLE,
  type AvatarLayer,
  DEFAULT_AVATAR_PART_IDS,
} from './parts-catalog'

/**
 * Config EQUIPADA do avatar: estilo (DiceBear, mantido p/ forward-compat) + uma
 * peça escolhida por camada. JSON opaco persistido em `avatar_configs.equipped`.
 * Leitura é TOLERANTE (camada faltando/ id desconhecido → cai no default no render);
 * escrita é ESTRITA (`assertEquippableConfig`).
 */
export interface AvatarConfig {
  style: string
  parts: Partial<Record<AvatarLayer, string>>
}

/** Avatar inicial GRÁTIS — determinístico (sem `Date.now`/random). */
export function defaultAvatarConfig(): AvatarConfig {
  return { style: AVATAR_STYLE, parts: { ...DEFAULT_AVATAR_PART_IDS } }
}

const LAYER_SET = new Set<string>(AVATAR_LAYERS)

/**
 * Valida (ESCRITA) que toda peça equipada existe no catálogo, está na camada certa
 * e é grátis OU possuída. Estrito de propósito: o servidor é o portão — uma peça
 * paga só entra na config se o inventário a tiver. `ownedPartIds` = inventário do aluno
 * (peças grátis NÃO precisam estar lá — são implicitamente possuídas).
 */
export function assertEquippableConfig(
  config: AvatarConfig,
  ownedPartIds: ReadonlySet<string>,
): void {
  for (const [layer, partId] of Object.entries(config.parts)) {
    if (!partId) continue
    if (!LAYER_SET.has(layer)) {
      throw new AvatarInvalidError(`Camada de avatar desconhecida: ${layer}`)
    }
    const part = AVATAR_PARTS_BY_ID.get(partId)
    if (!part) throw new AvatarInvalidError(`Peça de avatar desconhecida: ${partId}`)
    if (part.layer !== layer) {
      throw new AvatarInvalidError(`Peça ${partId} não pertence à camada ${layer}`)
    }
    if (part.tier === 'coins' && !ownedPartIds.has(partId)) {
      throw new AvatarPartNotOwnedError()
    }
  }
}

/**
 * Normaliza uma config crua (do banco/cliente) para render: descarta camadas/peças
 * desconhecidas e preenche o que falta com o default GRÁTIS — o avatar nunca quebra
 * (forward-compat, espelha `badgeInfo()` devolvendo null).
 */
export function canonicalizeAvatarConfig(raw: AvatarConfig | null): AvatarConfig {
  const parts: Partial<Record<AvatarLayer, string>> = {}
  for (const layer of AVATAR_LAYERS) {
    const candidate = raw?.parts?.[layer]
    const part = candidate ? AVATAR_PARTS_BY_ID.get(candidate) : undefined
    parts[layer] = part && part.layer === layer ? candidate : DEFAULT_AVATAR_PART_IDS[layer]
  }
  return { style: AVATAR_STYLE, parts }
}
