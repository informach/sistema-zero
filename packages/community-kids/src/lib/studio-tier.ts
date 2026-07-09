import type { BlockLevel, IDEMode } from '@sistemazero/studio'

/** Config do Estúdio Completo derivada do RANK do aluno. */
export interface StudioTier {
  /** Perfil de blocos (curadoria da paleta). */
  level: BlockLevel
  /** Modos liberados na barra do editor. */
  allowedModes: IDEMode[]
  /** Sempre `false`: o rank é o portão ESTRITO (sem "Mostrar blocos avançados"). */
  allowLevelReveal: boolean
}

/** Papéis de EQUIPE tratados como `god` (acesso máximo) — espelha o members. */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Deriva os MODOS + o PERFIL de blocos do Estúdio Completo a partir do rank do
 * aluno (gamificação kids: `noob→coder→hacker→elite→god`) e do papel. Equipe
 * (admin/staff/superadmin) = `god`. O modo **Código** fica ADIADO (só existe em
 * projeto pro/WebContainer), então ninguém recebe `'code'` por enquanto.
 * - `noob`/`coder` (Faísca/Construtor) → só **Blocos** + `iniciante`
 * - `hacker`/`elite` (Inventor/Mestre dos Jogos) → **Blocos + Ponte** + `intermediario`
 * - `god` (Lenda) → **Blocos + Ponte** + `avancado`
 * Slug desconhecido/ausente → `noob` (degrada seguro).
 */
export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
): StudioTier {
  const rank = role && PRIVILEGED_ROLES.has(role) ? 'god' : levelSlug
  switch (rank) {
    case 'god':
      return { level: 'avancado', allowedModes: ['blocks', 'bridge'], allowLevelReveal: false }
    case 'hacker':
    case 'elite':
      return { level: 'intermediario', allowedModes: ['blocks', 'bridge'], allowLevelReveal: false }
    default:
      // noob, coder, ou qualquer slug desconhecido/ausente.
      return { level: 'iniciante', allowedModes: ['blocks'], allowLevelReveal: false }
  }
}
