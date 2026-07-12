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
   * O aluno pode criar/abrir projetos PRO (modo Código / WebContainer)? Só a
   * **Lenda** (`god`) e a EQUIPE. É a CAPACIDADE (o host oferece a escolha
   * "Básico/PRO" e roteia projetos pro para a rota isolada com COOP/COEP); NÃO é
   * um modo do editor clássico.
   */
  pro: boolean
}

/** Papéis de EQUIPE tratados como `god` (acesso máximo) — espelha o members. */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Deriva os MODOS + o PERFIL de blocos + a capacidade PRO do Estúdio Completo a
 * partir do rank do aluno (gamificação kids: `noob→coder→hacker→elite→god`) e do
 * papel. Equipe (admin/staff/superadmin) = `god`.
 * - `noob`/`coder` (Faísca/Construtor) → só **Blocos** + `iniciante`
 * - `hacker`/`elite` (Inventor/Mestre dos Jogos) → **Blocos + Ponte** + `intermediario`
 * - `god` (Lenda) → **Blocos + Ponte** + `avancado` + **PRO** (modo Código)
 * Slug desconhecido/ausente → `noob` (degrada seguro).
 */
export function resolveStudioTier(
  levelSlug: string | undefined,
  role: string | undefined,
): StudioTier {
  const rank = role && PRIVILEGED_ROLES.has(role) ? 'god' : levelSlug
  switch (rank) {
    case 'god':
      return {
        level: 'avancado',
        allowedModes: ['blocks', 'bridge'],
        allowLevelReveal: false,
        pro: true,
      }
    case 'hacker':
    case 'elite':
      return {
        level: 'intermediario',
        allowedModes: ['blocks', 'bridge'],
        allowLevelReveal: false,
        pro: false,
      }
    default:
      // noob, coder, ou qualquer slug desconhecido/ausente.
      return {
        level: 'iniciante',
        allowedModes: ['blocks'],
        allowLevelReveal: false,
        pro: false,
      }
  }
}
