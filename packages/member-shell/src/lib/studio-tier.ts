import type { BlockLevel, IDEMode } from '@sistemazero/studio'

/**
 * Config do Estúdio Completo derivada do RANK do aluno. Reusável entre os apps
 * (kids hoje; adulto quando o Estúdio Completo virar produto dele).
 */
export interface StudioTier {
  /** Perfil de blocos (curadoria da paleta) do editor CLÁSSICO. */
  level: BlockLevel
  /** Modos liberados na barra do editor CLÁSSICO. */
  allowedModes: IDEMode[]
  /** Sempre `false`: o rank é o portão ESTRITO (sem "Mostrar blocos avançados"). */
  allowLevelReveal: boolean
  /**
   * O aluno pode criar/abrir projetos PRO (modo Código / WebContainer)? Do
   * **Gênio da Criação** (`champion`) em diante + a EQUIPE. É a CAPACIDADE (o
   * host oferece a escolha "Básico/PRO" e roteia projetos pro para a rota
   * isolada com COOP/COEP); NÃO é um modo do editor clássico.
   */
  pro: boolean
}

/** Papéis de EQUIPE tratados como `god` (acesso máximo) — espelha o members. */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Degrau de blocos + modos por RANK (escada de 8 — reforma 2D/3D 07/2026).
 * Cada nível de carreira libera o degrau que o aluno vai ESTUDAR em seguida:
 * concluiu os requisitos do degrau N → a paleta abre o N+1.
 * - Ponte (código junto dos blocos) libera no **Mestre dos Jogos** (`elite`).
 * - PRO libera no **Gênio da Criação** (`champion`) — um degrau antes da Lenda.
 * (Decisões da usuária 17/07; Inventor/Explorador perderam a Ponte que tinham —
 * regressão aceita junto com a da carreira.)
 */
const TIER_BY_SLUG: Record<string, Pick<StudioTier, 'level' | 'allowedModes'> & { pro?: true }> = {
  /* Faísca        */ noob: { level: 'iniciante-2d', allowedModes: ['blocks'] },
  /* Construtor(a) */ coder: { level: 'iniciante-2d', allowedModes: ['blocks'] },
  /* Inventor(a)   */ hacker: { level: 'iniciante-3d', allowedModes: ['blocks'] },
  /* Explorador(a) */ explorer: { level: 'intermediario-2d', allowedModes: ['blocks'] },
  /* Mestre        */ elite: { level: 'intermediario-3d', allowedModes: ['blocks', 'bridge'] },
  /* Arquiteto(a)  */ architect: { level: 'avancado-2d', allowedModes: ['blocks', 'bridge'] },
  /* Gênio         */ champion: {
    level: 'avancado-3d',
    allowedModes: ['blocks', 'bridge'],
    pro: true,
  },
  /* Lenda         */ god: { level: 'avancado-3d', allowedModes: ['blocks', 'bridge'], pro: true },
}

/**
 * Deriva os MODOS + o PERFIL de blocos + a capacidade PRO do Estúdio Completo a
 * partir do rank do aluno (gamificação kids, 8 níveis: `noob→coder→hacker→
 * explorer→elite→architect→champion→god`) e do papel. Equipe
 * (admin/staff/superadmin) = `god`. Slug desconhecido/ausente → `noob`
 * (degrada seguro — cobre também um members antigo emitindo só os 5 slugs).
 */
export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
): StudioTier {
  const rank = role && PRIVILEGED_ROLES.has(role) ? 'god' : (levelSlug ?? 'noob')
  const tier = TIER_BY_SLUG[rank] ?? TIER_BY_SLUG.noob
  if (!tier) throw new Error('studio-tier: escada sem degrau noob')
  return {
    level: tier.level,
    allowedModes: [...tier.allowedModes],
    allowLevelReveal: false,
    pro: tier.pro ?? false,
  }
}
