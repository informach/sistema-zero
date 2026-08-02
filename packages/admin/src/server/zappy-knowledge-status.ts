import type { GatewayResponse } from './gateway'

/** Expõe ao autor quando o bloco foi salvo, mas a reindexação ainda está pendente. */
export function zappyKnowledgeMutationResult(
  result: GatewayResponse<unknown>,
  synced: boolean,
): GatewayResponse<unknown> {
  if (result.status < 200 || result.status >= 300) return result
  const body =
    result.body && typeof result.body === 'object' && !Array.isArray(result.body)
      ? { ...result.body, zappyKnowledgeStatus: synced ? 'ready' : 'pending' }
      : result.body
  return { status: synced ? result.status : 202, body }
}
