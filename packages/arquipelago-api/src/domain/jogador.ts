import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'

/**
 * Quem está chamando, como o gateway injetou nos headers `x-auth-*`.
 * - Criança do Kids: `id` é o perfil e `contaId` é a conta do responsável (limite da família).
 * - Membro da comunidade adulta: `id` é a conta e não há `contaId`.
 * - Responsável do Kids não joga: só ajusta o limite da família (`Responsavel`).
 */
export interface Jogador {
  id: string
  publico: PublicoJogo
  contaId: string | null
  equipe: boolean
  /** Suporte navegando como a pessoa sem permissão de escrita: só lê. */
  somenteLeitura: boolean
}

export interface Responsavel {
  contaId: string
  /** Papel de equipe na conta: os perfis das crianças entram com o mesmo papel. */
  equipe: boolean
  somenteLeitura: boolean
}

/** Alguém da equipe na seção Jogo do Admin. */
export interface Equipe {
  id: string
  /** Administração (superadmin/admin) fora de sessão de suporte; o resto da equipe só lê. */
  podeEscrever: boolean
}

export const PAPEIS_DA_EQUIPE = new Set(['superadmin', 'admin', 'staff'])
