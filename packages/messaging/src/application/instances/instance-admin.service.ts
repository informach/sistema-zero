import {
  WhatsAppInstanceAlreadyExistsError,
  WhatsAppInstanceNotFoundError,
} from '../../domain/lane/lane.errors'
import {
  type InstanceStatus,
  WhatsAppInstance,
} from '../../domain/lane/whatsapp-instance.aggregate'
import type { Clock } from '../../domain/ports/clock.port'
import type { WhatsAppInstanceRepository } from '../../domain/ports/whatsapp-instance-repository.port'
import { type InstanceView, toInstanceView } from '../mappers/instance-view'

export interface CreateInstanceInput {
  instanceName: string
  phoneNumber: string
  dailyCap?: number
  warmup?: boolean
}

export interface UpdateInstanceInput {
  status?: InstanceStatus
  enabled?: boolean
  dailyCap?: number
  /** `true` (re)inicia o aquecimento a partir de agora. */
  warmup?: boolean
}

export class CreateInstanceService {
  constructor(
    private readonly instances: WhatsAppInstanceRepository,
    private readonly clock: Clock,
    private readonly idGen: () => string,
  ) {}

  async execute(input: CreateInstanceInput): Promise<InstanceView> {
    const existing = await this.instances.findByInstanceName(input.instanceName)
    if (existing)
      throw new WhatsAppInstanceAlreadyExistsError(`Instância ${input.instanceName} já existe`)
    const instance = WhatsAppInstance.create({ id: this.idGen(), ...input, now: this.clock.now() })
    await this.instances.create(instance)
    return toInstanceView(instance)
  }
}

export class UpdateInstanceService {
  constructor(
    private readonly instances: WhatsAppInstanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, patch: UpdateInstanceInput): Promise<InstanceView> {
    const instance = await this.instances.findById(id)
    if (!instance) throw new WhatsAppInstanceNotFoundError(`Instância ${id} não encontrada`)
    const now = this.clock.now()
    if (patch.status !== undefined) instance.setStatus(patch.status, now)
    if (patch.enabled !== undefined) instance.setEnabled(patch.enabled, now)
    if (patch.dailyCap !== undefined) instance.setDailyCap(patch.dailyCap, now)
    if (patch.warmup === true) instance.startWarmup(now)
    await this.instances.update(instance)
    return toInstanceView(instance)
  }
}

/** Atualiza o estado de conexão de uma instância (webhook `connection.update`). */
export class SetInstanceConnectionService {
  constructor(
    private readonly instances: WhatsAppInstanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(instanceName: string, connected: boolean): Promise<void> {
    const instance = await this.instances.findByInstanceName(instanceName)
    if (!instance) return
    // PAUSED/BANNED são decisões do ADMIN — uma reconexão da Evolution não pode
    // sobrescrevê-las (a lane voltaria a enviar contra a intenção do operador).
    // Só o admin (PATCH) tira a instância desses estados.
    if (instance.status === 'PAUSED' || instance.status === 'BANNED') return
    instance.setStatus(connected ? 'CONNECTED' : 'DISCONNECTED', this.clock.now())
    await this.instances.update(instance)
  }
}

export class ListInstancesService {
  constructor(private readonly instances: WhatsAppInstanceRepository) {}

  async execute(query: { limit: number; offset: number }): Promise<{
    items: InstanceView[]
    total: number
  }> {
    const { items, total } = await this.instances.list(query)
    return { items: items.map(toInstanceView), total }
  }
}
