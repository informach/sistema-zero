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

/**
 * Apps que CHAMAM a IA — Pensa e Zappy — abrem no **Inventor(a)**, o 3º degrau.
 *
 * O motivo é custo por uso: cada pergunta é uma chamada paga, e a criança precisa de um
 * mínimo de repertório antes de perguntar qualquer coisa. Não confundir com o portão de
 * criação livre abaixo.
 */
export const AI_APPS_MIN_LEVEL: CareerLevelSlug = 'hacker'

/**
 * Ferramentas de criação livre — Estúdio Completo e Pinta — abrem no **Construtor(a)**,
 * o 2º degrau (decisão da usuária, 14/08: o Pinta desceu do Inventor).
 *
 * Não custam por uso, então a régua é só pedagógica: a criança já publicou o primeiro
 * projeto e pode criar sozinha. ⚠️ Casa com o `reward.freeStudio` do core — o Estúdio
 * continua sendo gateado por ele; esta constante existe para o Pinta e para a copy.
 */
export const FREE_CREATION_MIN_LEVEL: CareerLevelSlug = 'coder'

/**
 * A oficina 3D (Molda: modelos low poly, texturas e céus HDR) abre no **Explorador(a) de
 * Mundos** (`docs/carreira-do-criador.md`). Decisão da usuária (05/09/2026; de 04 a 05/09 era
 * o Inventor(a)): o consumidor do que o Molda produz é o kit Jogo 3D, que no perfil do Estúdio
 * é recompensa do Explorador(a) (`iniciante-3d`) — abrir a oficina um degrau antes dava um
 * modelo sem lugar para ser usado.
 *
 * Não custa por uso (tudo roda no navegador), então a régua é só pedagógica. Terceira
 * constante ao lado das duas acima, e agora as três são distintas (`coder` cria, `hacker`
 * usa IA, `explorer` modela em 3D); NUNCA colapsar duas mesmo que os valores coincidam.
 */
export const THREE_D_CREATION_MIN_LEVEL: CareerLevelSlug = 'explorer'

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
  // Arquiteto (intermediario-3d): Mundo 3D + Jogo 3D Avançado (decisão 26/07 — o kit
  // `game-3d-advanced` foi reclassificado p/ intermediario-3d no studio). `avancado-2d`
  // (Gênio) o mantém por monotonicidade; `avancado-3d` (Lenda) já tinha.
  'intermediario-3d': ['game-2d', 'game-3d', 'game-2d-advanced', 'world-3d', 'game-3d-advanced'],
  'avancado-2d': ['game-2d', 'game-3d', 'game-2d-advanced', 'world-3d', 'game-3d-advanced'],
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

/**
 * O que o CURRÍCULO já entregou: os blocos dos cursos que a criança concluiu E publicou
 * no Mural, com as extensões derivadas deles (`server/studio-unlocks.ts` — a derivação
 * mora lá porque importa o catálogo inteiro e este módulo roda no cliente).
 */
export interface StudioCurriculumUnlocks {
  blocks: readonly string[]
  extensions: readonly string[]
}

export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
  /**
   * Paleta conquistada nos cursos. Quando presente e NÃO vazia, ela MANDA: a paleta do
   * Estúdio livre passa a ser o currículo (`allowBlocks` já é soberano sobre o `level`
   * dentro do editor), e não mais o conjunto fixo do degrau.
   * ⚠️ **Fail-open deliberado:** vazia/ausente → cai no perfil do NÍVEL, o comportamento
   * histórico. Sem isso, o dia em que este código sobe (com nenhum curso etiquetado
   * ainda) a criança abriria o Estúdio com a caixa de blocos VAZIA.
   */
  unlocks?: StudioCurriculumUnlocks,
): StudioTier {
  const privileged = isPrivilegedRole(role)
  const effectiveSlug: CareerLevelSlug = privileged ? 'god' : creatorCareerLevel(levelSlug).slug
  const reward = creatorCareerLevel(effectiveSlug).reward
  const pro = reward.pro
  // ⚠️ A EQUIPE ignora o currículo: o passe livre existe p/ testar o Estúdio inteiro, e
  // restringir staff ao que ela "concluiu" esconderia justamente o que ela vai conferir.
  const curriculum = !privileged && unlocks && unlocks.blocks.length > 0 ? unlocks : null
  return {
    freeStudio: reward.freeStudio,
    rewardId: reward.id,
    blockProfileId: reward.blockProfileId,
    level: reward.blockLevel,
    ...(curriculum
      ? { allowBlocks: curriculum.blocks }
      : reward.blockProfileId === '2d-essential'
        ? { allowBlocks: ESSENTIAL_2D_ALLOW_BLOCKS }
        : {}),
    allowedExtensions: curriculum
      ? curriculum.extensions
      : (EXTENSIONS_BY_PROFILE[reward.blockProfileId] ?? []),
    // ⚠️ NENHUMA extensão vem instalada. A criança abre o painel de Extensões e
    // instala a que quiser, entre as que a carreira dela já liberou
    // (`allowedExtensions`); os blocos continuam filtrados pelo `level`, então
    // instalar não adianta a paleta de um degrau acima. Decisão dela, 08/08:
    // instalar é parte do aprendizado, e o projeto novo nasce limpo.
    initialExtensions: [],
    allowedModes: [...reward.modes],
    allowLevelReveal: false,
    bridge: reward.bridge,
    pro,
    canCreateProProject: pro,
    canPromoteToPro: pro,
  }
}
