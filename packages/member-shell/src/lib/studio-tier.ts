import {
  type CareerLevelSlug,
  type CareerStudioBlockProfileId,
  type CareerStudioRewardId,
  CREATOR_CAREER_LEVELS,
  creatorCareerLevel,
} from '@sistemazero/core/career'
import type { BlockLevel, IDEMode } from '@sistemazero/studio'
import { ESSENTIAL_2D_ALLOW_BLOCKS } from '@sistemazero/studio/career'

/** Capacidades do Estúdio Completo já conquistadas pelo aluno. */
export interface StudioTier {
  freeStudio: boolean
  rewardId: CareerStudioRewardId
  blockProfileId: CareerStudioBlockProfileId
  level: BlockLevel
  allowBlocks?: readonly string[]
  allowedExtensions: readonly string[]
  initialExtensions: readonly string[]
  allowedModes: IDEMode[]
  allowLevelReveal: false
  bridge: boolean
  pro: boolean
  canCreateProProject: boolean
  canPromoteToPro: boolean
}

const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

export function isPrivilegedRole(role: string | undefined): boolean {
  return !!role && PRIVILEGED_ROLES.has(role)
}

const EXTENSIONS_BY_PROFILE: Record<CareerStudioBlockProfileId, readonly string[]> = {
  'lesson-only': [],
  '2d-essential': ['game-2d'],
  'iniciante-2d': ['game-2d'],
  'iniciante-3d': ['game-2d', 'game-3d'],
  'intermediario-2d': ['game-2d', 'game-3d', 'game-2d-advanced'],
  'intermediario-3d': ['game-2d', 'game-3d', 'game-2d-advanced', 'world-3d'],
  'avancado-2d': ['game-2d', 'game-3d', 'game-2d-advanced', 'world-3d'],
  'avancado-3d': ['game-2d', 'game-3d', 'game-2d-advanced', 'world-3d', 'game-3d-advanced'],
}

/**
 * Ferramentas que um jogo do Mural EXIGE p/ ser remixado: extensões instaladas +
 * modo Código (Pro). Vem do `studioMeta` do post (selo no card) OU do próprio
 * snapshot jogável (checagem AUTORITATIVA no clique do "Fazer a minha versão").
 */
export interface StudioRemixRequirement {
  pro: boolean
  extensions: readonly string[]
}

/**
 * Capacidade MÍNIMA p/ decidir um remix (subconjunto estrutural do `StudioTier`) —
 * é o que a página do Mural serializa pro client (`RemixTier`); o `freeStudio` já
 * foi exigido ao montá-la (sem Estúdio livre o remix nem aparece).
 */
export interface StudioRemixCapability {
  pro: boolean
  allowedExtensions: readonly string[]
}

/** A capacidade cobre as ferramentas do jogo? (modo Código + extensões.) */
export function studioRemixCovered(
  cap: StudioRemixCapability,
  req: StudioRemixRequirement,
): boolean {
  if (req.pro && !cap.pro) return false
  return req.extensions.every((id) => cap.allowedExtensions.includes(id))
}

/** O degrau atual cobre as ferramentas do jogo? (Estúdio livre + Pro + extensões.) */
export function studioTierCoversRemix(tier: StudioTier, req: StudioRemixRequirement): boolean {
  return tier.freeStudio && studioRemixCovered(tier, req)
}

/**
 * Extrai do SNAPSHOT jogável (`/api/studio/play/:id`, shape desconhecido na borda)
 * as ferramentas que o jogo exige — a checagem AUTORITATIVA do clique no "Fazer a
 * minha versão" (o `studioMeta` do post é só o selo; posts antigos nem o têm).
 */
export function remixRequirementFromSnapshot(snapshot: unknown): StudioRemixRequirement {
  const snap = (
    snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}
  ) as Record<string, unknown>
  const extensions = Array.isArray(snap.installedExtensions)
    ? snap.installedExtensions
        .map((ext) => (ext && typeof ext === 'object' ? (ext as { id?: unknown }).id : null))
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  return { pro: snap.kind === 'pro', extensions }
}

/**
 * PRIMEIRO nível da carreira cuja recompensa cobre as ferramentas do jogo (e já
 * libera o Estúdio livre) — o selo "remix a partir do nível X" do card do Mural.
 * `null` = nenhum nível cobre (extensão desconhecida/forjada no metadado) — a UI
 * cai num recado genérico; fail-closed cosmético, nunca destrava nada.
 */
export function minCareerLevelForRemix(req: StudioRemixRequirement): CareerLevelSlug | null {
  for (const level of CREATOR_CAREER_LEVELS) {
    const reward = level.reward
    if (!reward.freeStudio) continue
    if (req.pro && !reward.pro) continue
    const allowed = EXTENSIONS_BY_PROFILE[reward.blockProfileId] ?? []
    if (req.extensions.every((id) => allowed.includes(id))) return level.slug
  }
  return null
}

export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
): StudioTier {
  const effectiveSlug: CareerLevelSlug = isPrivilegedRole(role)
    ? 'god'
    : creatorCareerLevel(levelSlug).slug
  const reward = creatorCareerLevel(effectiveSlug).reward
  const pro = reward.pro
  return {
    freeStudio: reward.freeStudio,
    rewardId: reward.id,
    blockProfileId: reward.blockProfileId,
    level: reward.blockLevel,
    ...(reward.blockProfileId === '2d-essential' ? { allowBlocks: ESSENTIAL_2D_ALLOW_BLOCKS } : {}),
    allowedExtensions: EXTENSIONS_BY_PROFILE[reward.blockProfileId] ?? [],
    initialExtensions: reward.freeStudio ? ['game-2d'] : [],
    allowedModes: [...reward.modes],
    allowLevelReveal: false,
    bridge: reward.bridge,
    pro,
    canCreateProProject: pro,
    canPromoteToPro: pro,
  }
}
