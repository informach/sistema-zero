import type { Ator } from '../../../domain/cenarios/cenarios'
import { isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'

/** Identidade já verificada pelo gateway, compartilhada pelas rotas da oficina. */
export function atorDosCenarios(headers: Record<string, string | undefined>): Ator {
  return {
    usuarioId: resolveUserId(headers),
    contaId: resolveAccountId(headers),
    equipe: isPrivilegedActor(headers),
    suporte: Boolean(headers['x-auth-impersonator-id']?.trim()),
  }
}
