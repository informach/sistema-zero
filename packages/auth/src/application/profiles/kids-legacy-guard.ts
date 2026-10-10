import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import { KidsContextForbiddenError } from '../../domain/study-access/errors'

/**
 * O fluxo ANTIGO de perfis (entrar num perfil com um clique; sair dele pela senha) não
 * serve a sessões do Kids: o aluno entra pela autorização do aparelho e o responsável
 * entra pelo próprio login. O Gateway já barra esses caminhos pelo contexto `kids`; aqui
 * o Auth confere de novo (defesa em profundidade) pelo header do Gateway e, quando o BFF
 * manda o refresh vigente, pela família dele.
 */
export async function assertNotKidsSession(
  refreshTokens: RefreshTokenRepository,
  kidsContext: string | null | undefined,
  refreshToken: string | null | undefined,
): Promise<void> {
  if (kidsContext) throw new KidsContextForbiddenError()
  const presented = refreshToken?.trim()
  if (!presented) return
  const record = await refreshTokens.findByHash(sha256Hex(presented))
  if (record?.kidsContext) throw new KidsContextForbiddenError()
}
