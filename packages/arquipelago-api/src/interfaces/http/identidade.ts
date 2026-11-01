import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { safeEqual } from '@sistemazero/core/security'
import { type Equipe, type Jogador, PAPEIS_DA_EQUIPE, type Responsavel } from '../../domain/jogador'

type Cabecalhos = Record<string, string | undefined>

/**
 * Prova de origem do gateway (`x-internal-token`, header-inject). Sem ela, qualquer processo na
 * rede interna forjaria os `x-auth-*`. Sem `esperado` (dev/local) não confere.
 */
export function exigirGateway(recebido: string | undefined, esperado: string | undefined): void {
  if (!esperado) return
  if (!recebido || !safeEqual(recebido, esperado)) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
}

function uuid(valor: string | undefined): string | null {
  const r = IdentityUuidSchema.safeParse(valor)
  return r.success ? r.data : null
}

function base(h: Cabecalhos): { id: string; papel: string; somenteLeitura: boolean } {
  const id = uuid(h['x-auth-user-id'])
  const papel = h['x-auth-user-role']
  if (!id || !papel || !h['x-auth-user-status'])
    throw new UnauthorizedError('Autenticação necessária')
  if (h['x-auth-user-status'] !== 'active') throw new ForbiddenError('Conta inativa')
  // Suporte é SEMPRE só leitura aqui: o gateway não injeta nem limpa `x-auth-impersonation-mode`,
  // então esse cabeçalho poderia vir do navegador (régua do `resolveStudioFreeActor` do Members).
  return { id, papel, somenteLeitura: h['x-auth-impersonator-id'] !== undefined }
}

/**
 * Quem joga. Sessão de perfil do Kids (`x-auth-account-id`, contexto `student` ou ausente) é
 * uma criança; sem perfil e sem contexto do Kids é um membro da comunidade adulta. O
 * responsável do Kids (contexto `parent`) não joga.
 */
export function lerJogador(h: Cabecalhos): Jogador {
  const { id, papel, somenteLeitura } = base(h)
  const contexto = h['x-auth-kids-context']
  const contaBruta = h['x-auth-account-id']
  if (contaBruta !== undefined) {
    const contaId = uuid(contaBruta)
    if (!contaId || (contexto !== undefined && contexto !== 'student')) {
      throw new ForbiddenError('Sessão inconsistente')
    }
    return { id, publico: 'kids', contaId, equipe: PAPEIS_DA_EQUIPE.has(papel), somenteLeitura }
  }
  if (contexto === 'parent') throw new ForbiddenError('O jogo é aberto pelo perfil da criança')
  if (contexto !== undefined) throw new ForbiddenError('Sessão inconsistente')
  return {
    id,
    publico: 'adulto',
    contaId: null,
    equipe: PAPEIS_DA_EQUIPE.has(papel),
    somenteLeitura,
  }
}

/** O responsável do Kids, na própria conta (sem perfil). */
export function lerResponsavel(h: Cabecalhos): Responsavel {
  const { id, papel, somenteLeitura } = base(h)
  if (h['x-auth-account-id'] !== undefined || h['x-auth-kids-context'] !== 'parent') {
    throw new ForbiddenError('Só o responsável muda o tempo do jogo')
  }
  return { contaId: id, equipe: PAPEIS_DA_EQUIPE.has(papel), somenteLeitura }
}

/** Quem pode o quê na seção Jogo do Admin: ler (equipe) e escrever (só administração). */
export const PAPEIS_QUE_ESCREVEM_DESAFIOS = new Set(['superadmin', 'admin'])

/**
 * A equipe na própria conta: papel de equipe, sem perfil do Kids e sem contexto do Kids. Sessão de
 * suporte só lê. É a terceira barreira do Admin do jogo (o gateway confere os papéis e a política
 * do Kids recusa `/arquipelago/admin/*` ao aluno e ao responsável).
 */
export function lerEquipe(h: Cabecalhos): Equipe {
  const { id, papel, somenteLeitura } = base(h)
  if (!PAPEIS_DA_EQUIPE.has(papel)) throw new ForbiddenError('Só a equipe cuida dos desafios')
  if (h['x-auth-account-id'] !== undefined || h['x-auth-kids-context'] !== undefined) {
    throw new ForbiddenError('Use a conta da equipe, sem perfil')
  }
  return {
    id,
    podeEscrever: PAPEIS_QUE_ESCREVEM_DESAFIOS.has(papel) && !somenteLeitura,
    podeRevisar: !somenteLeitura,
  }
}
