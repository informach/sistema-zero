/**
 * Literais base de roteamento. Ficam no domínio (sem imports) para que tanto o
 * schema Zod (infra) quanto as portas (LB, auth) derivem destes — sem ciclos.
 */
export const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export const LB_STRATEGIES = ['round-robin', 'least-connections', 'weighted', 'p2c-ewma'] as const
export type LbStrategyName = (typeof LB_STRATEGIES)[number]

export const AUTH_STRATEGY_KINDS = ['jwt', 'session', 'hmac'] as const
export type AuthStrategyKind = (typeof AUTH_STRATEGY_KINDS)[number]

/** Como o gateway autentica a chamada de SAÍDA ao upstream. */
export type UpstreamAuthMode = 'passthrough' | 'resign'
