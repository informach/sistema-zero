import {
  type CareerLevelSlug,
  type CareerStudioBlockProfileId,
  type CareerStudioRewardId,
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
