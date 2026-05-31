/**
 * Consumidor sistema-a-sistema do GATEWAY (cliente HMAC), análogo ao `consumers`
 * do payments mas mantido localmente no gateway (estático via config/env).
 */
export interface Consumer {
  readonly id: string
  readonly hmacSecret: string
  readonly allowedCidrs: readonly string[]
  readonly isActive: boolean
}

export interface ConsumerRepository {
  findById(id: string): Promise<Consumer | undefined>
}
