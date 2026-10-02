import { creatorJourneyLevel, type JourneyLevelSlug } from '@sistemazero/core/journey'
import type { BlockLevel, IDEMode } from '@sistemazero/studio'

/** Capacidades do Estúdio Completo já conquistadas pelo aluno. */
export interface StudioTier {
  freeStudio: boolean
  level: BlockLevel
  /**
   * Os blocos que a criança conquistou nos cursos: a paleta inteira dela. Ausente só para a
   * EQUIPE, que vê tudo pelo `level`. ⚠️ Pode vir VAZIA, e o Estúdio lê lista vazia como
   * "sem restrição": quem decide se o editor abre é o `hasPalette`.
   */
  allowBlocks?: readonly string[]
  allowedExtensions: readonly string[]
  /** Há bloco para a criança usar? Sem nenhum curso concluído, o Estúdio livre fica trancado. */
  hasPalette: boolean
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
/**
 * Ferramentas de criação livre — Estúdio Completo e Pinta — abrem no **Construtor(a)**,
 * o 2º degrau (decisão da usuária, 14/08: o Pinta desceu do Inventor).
 *
 * Não custam por uso, então a régua é só pedagógica: a criança já publicou o primeiro
 * projeto e pode criar sozinha. ⚠️ Casa com o `reward.freeStudio` do core — o Estúdio
 * continua sendo gateado por ele; esta constante existe para o Pinta e para a copy.
 */
/**
 * A oficina 3D (Molda: modelos low poly, texturas e céus HDR) abre no **Explorador(a) de
 * Mundos** (`docs/jornada-do-criador.md`). Decisão da usuária (05/09/2026; de 04 a 05/09 era
 * o Inventor(a)): o consumidor do que o Molda produz é o kit Jogo 3D, que no perfil do Estúdio
 * é recompensa do Explorador(a) (`iniciante-3d`) — abrir a oficina um degrau antes dava um
 * modelo sem lugar para ser usado.
 *
 * Não custa por uso (tudo roda no navegador), então a régua é só pedagógica. Terceira
 * constante ao lado das duas acima, e agora as três são distintas (`coder` cria, `hacker`
 * usa IA, `explorer` modela em 3D); NUNCA colapsar duas mesmo que os valores coincidam.
 */
export {
  AI_APPS_MIN_LEVEL,
  FREE_CREATION_MIN_LEVEL,
  THREE_D_CREATION_MIN_LEVEL,
} from '@sistemazero/core/journey'

const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

export function isPrivilegedRole(role: string | undefined): boolean {
  return !!role && PRIVILEGED_ROLES.has(role)
}

/** O passe livre da EQUIPE: todas as extensões oficiais, para conferir o Estúdio inteiro. */
const STAFF_EXTENSIONS: readonly string[] = [
  'game-2d',
  'game-3d',
  'game-2d-advanced',
  'world-3d',
  'game-3d-advanced',
]

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
