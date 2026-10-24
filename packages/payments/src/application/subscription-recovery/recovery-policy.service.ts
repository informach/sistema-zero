import { DomainError, ValidationError } from '../../domain/shared/errors'
import type {
  RecoveryPolicyConfiguration,
  RecoveryPolicyRepository,
} from '../../domain/subscription-recovery/recovery-policy-repository.port'

export class RecoveryConfigurationUnavailableError extends DomainError {
  readonly code = 'RECOVERY_CONFIGURATION_UNAVAILABLE'
  constructor() {
    super('A configuração de cobrança e avisos precisa ser concluída antes da ativação.')
  }
}
export class RecoveryPolicyService {
  constructor(
    private readonly policies: RecoveryPolicyRepository,
    private readonly configurationReady: () => boolean,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async get() {
    return {
      configuration: view(await this.policies.get()),
      configurationReady: this.configurationReady(),
    }
  }
  async update(
    input: {
      expectedVersion: number
      windowDays: number
      reminderDays: readonly number[]
      enabled: boolean
    },
    actorId: string,
  ) {
    if (!actorId.trim() || actorId.length > 128)
      throw new ValidationError('Autor da configuração não identificado')
    if (input.enabled && !this.configurationReady())
      throw new RecoveryConfigurationUnavailableError()
    const saved = await this.policies.update({ ...input, actorId, now: this.clock() })
    return { configuration: view(saved), configurationReady: this.configurationReady() }
  }
}
function view(item: RecoveryPolicyConfiguration | null) {
  return item
    ? {
        ...item.policy,
        enabled: item.enabled,
        activatedAt: item.activatedAt?.toISOString() ?? null,
        updatedAt: item.updatedAt.toISOString(),
        updatedBy: item.updatedBy,
      }
    : null
}
