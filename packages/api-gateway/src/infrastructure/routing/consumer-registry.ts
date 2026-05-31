import type { Consumer, ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import type { ConsumerConfig } from '../config/gateway-config.schema'

/** ConsumerRepository estático (em memória) a partir da config do gateway. */
export function createStaticConsumerRepository(
  consumers: readonly ConsumerConfig[],
): ConsumerRepository {
  const byId = new Map<string, Consumer>()
  for (const c of consumers) {
    byId.set(c.id, {
      id: c.id,
      hmacSecret: c.hmacSecret,
      allowedCidrs: c.allowedCidrs,
      isActive: c.isActive,
    })
  }
  return {
    async findById(id: string): Promise<Consumer | undefined> {
      return byId.get(id)
    },
  }
}
