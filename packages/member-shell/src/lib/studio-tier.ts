import {
  type StudioRuntimeSelection,
  StudioRuntimeSelectionSchema,
} from '@sistemazero/core/studio/project-environment'
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

const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

export function isPrivilegedRole(role: string | undefined): boolean {
  return !!role && PRIVILEGED_ROLES.has(role)
}

/**
 * Ferramentas que um jogo do Mural EXIGE p/ ser remixado: extensões instaladas +
 * modo Código (Pro). Vem do `studioMeta` do post (selo no card) OU do próprio
 * snapshot jogável (checagem AUTORITATIVA no clique do "Fazer a minha versão").
 */
export interface StudioRemixRequirement {
  pro: boolean
  extensions: readonly string[]
  programmingLanguage?: 'javascript' | 'python'
  runtime?: StudioRuntimeSelection
}

/**
 * Capacidade MÍNIMA p/ decidir um remix (subconjunto estrutural do `StudioTier`) —
 * é o que a página do Mural serializa pro client (`RemixTier`); o `freeStudio` já
 * foi exigido ao montá-la (sem Estúdio livre o remix nem aparece).
 */
export interface StudioRemixCapability {
  pro: boolean
  allowedExtensions: readonly string[]
  python?: readonly {
    kind: 'classic' | 'pro'
    runtime: StudioRuntimeSelection
    allowedExtensions: readonly string[]
  }[]
}

/** A capacidade cobre as ferramentas do jogo? (modo Código + extensões.) */
export function studioRemixCovered(
  cap: StudioRemixCapability,
  req: StudioRemixRequirement,
): boolean {
  if (req.pro && !cap.pro) return false
  if (req.programmingLanguage === 'python') {
    const runtime = req.runtime
    if (!runtime) return false
    return (
      cap.python?.some(
        (environment) =>
          environment.kind === (req.pro ? 'pro' : 'classic') &&
          environment.runtime.profileId === runtime.profileId &&
          environment.runtime.releaseId === runtime.releaseId &&
          environment.runtime.manifestSha256 === runtime.manifestSha256 &&
          req.extensions.every((id) => environment.allowedExtensions.includes(id)),
      ) === true
    )
  }
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
  return {
    pro: snap.kind === 'pro',
    extensions,
    ...(snap.programmingLanguage === 'python'
      ? {
          programmingLanguage: 'python' as const,
          runtime: StudioRuntimeSelectionSchema.safeParse(snap.runtime).data,
        }
      : {}),
  }
}
