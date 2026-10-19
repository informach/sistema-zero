/** Frozen pre-policy reference for migration/parity tests only. Never import from production. */
import { creatorJourneyLevel, type JourneyLevelSlug } from '@sistemazero/core/journey'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { isPrivilegedRole, type StudioTier } from '../../src/lib/studio-tier'
import { extensionsForBlocks } from '../../src/server/studio-unlocks'

const STAFF_EXTENSIONS: readonly string[] = [
  'game-2d',
  'game-3d',
  'game-2d-advanced',
  'world-3d',
  'game-3d-advanced',
]

export interface StudioCurriculumUnlocks {
  blocks: readonly string[]
  extensions: readonly string[]
}

export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
  /**
   * Os blocos conquistados nos cursos, com as extensões derivadas deles. ⭐ Decisão da dona
   * (02/10/2026): eles são a paleta INTEIRA da criança. Não há reserva: sem curso concluído
   * não há bloco, e o Estúdio livre mostra o recado de concluir um curso (`hasPalette`).
   * Ausente vale como vazio; só quem lê `freeStudio`/`pro` pode chamar sem ele.
   */
  unlocks?: StudioCurriculumUnlocks,
): StudioTier {
  const privileged = isPrivilegedRole(role)
  const effectiveSlug: JourneyLevelSlug = privileged ? 'god' : creatorJourneyLevel(levelSlug).slug
  const reward = creatorJourneyLevel(effectiveSlug).reward
  const pro = reward.pro
  // ⚠️ A EQUIPE ignora o currículo: o passe livre existe p/ testar o Estúdio inteiro, e
  // restringir staff ao que ela "concluiu" esconderia justamente o que ela vai conferir.
  const allowBlocks = privileged ? undefined : (unlocks?.blocks ?? [])
  return {
    freeStudio: reward.freeStudio,
    level: reward.blockLevel,
    ...(allowBlocks ? { allowBlocks } : {}),
    allowedExtensions: privileged ? STAFF_EXTENSIONS : (unlocks?.extensions ?? []),
    hasPalette: !allowBlocks || allowBlocks.length > 0,
    // ⚠️ NENHUMA extensão vem instalada. A criança abre o painel de Extensões e instala a
    // que quiser, entre as que os cursos dela liberaram (`allowedExtensions`). Decisão
    // dela, 08/08: instalar é parte do aprendizado, e o projeto novo nasce limpo.
    initialExtensions: [],
    allowedModes: [...reward.modes],
    allowLevelReveal: false,
    bridge: reward.bridge,
    pro,
    canCreateProProject: pro,
    canPromoteToPro: pro,
  }
}


const KNOWN_BLOCKS = new Set(SERVER_BLOCK_CATALOG.map((entry) => entry.type))

export function earnedStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
  blocks: readonly string[],
): StudioTier {
  const tier = resolveStudioTier(levelSlug, role, {
    blocks,
    extensions: extensionsForBlocks(blocks),
  })
  if (!tier.allowBlocks) return tier
  return { ...tier, hasPalette: tier.allowBlocks.some((type) => KNOWN_BLOCKS.has(type)) }
}
