import type { LaneState, PacingUpdate } from '../services/pacing'
import { AggregateRoot } from '../shared/aggregate-root'
import { ValidationError } from '../shared/errors'

export type InstanceStatus = 'CONNECTED' | 'DISCONNECTED' | 'PAUSED' | 'BANNED'

export interface WhatsAppInstanceProps {
  instanceName: string
  phoneNumber: string
  status: InstanceStatus
  enabled: boolean
  dailyCap: number
  sentToday: number
  dayCursor: string | null
  messagesSinceRest: number
  nextAvailableAt: Date
  warmupStartedAt: Date | null
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateWhatsAppInstanceInput {
  id: string
  instanceName: string
  phoneNumber: string
  dailyCap?: number
  /** Inicia em aquecimento (teto reduzido nos primeiros dias). */
  warmup?: boolean
  now: Date
}

/**
 * Instância de WhatsApp = UM número = uma "lane" de envio. Guarda o estado de
 * ritmo (anti-ban) que o `pacing` (serviço puro) lê e atualiza. Vários destes
 * formam o POOL que o worker reveza (rotação).
 */
export class WhatsAppInstance extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: WhatsAppInstanceProps,
  ) {
    super(id)
  }

  static create(input: CreateWhatsAppInstanceInput): WhatsAppInstance {
    if (!input.instanceName?.trim()) throw new ValidationError('instance_name é obrigatório')
    if (!input.phoneNumber?.trim()) throw new ValidationError('phone_number é obrigatório')
    const dailyCap = input.dailyCap ?? 200
    if (!Number.isInteger(dailyCap) || dailyCap <= 0) {
      throw new ValidationError('daily_cap deve ser inteiro positivo')
    }
    return new WhatsAppInstance(input.id, {
      instanceName: input.instanceName.trim(),
      phoneNumber: input.phoneNumber.trim(),
      status: 'DISCONNECTED',
      enabled: true,
      dailyCap,
      sentToday: 0,
      dayCursor: null,
      messagesSinceRest: 0,
      nextAvailableAt: input.now,
      warmupStartedAt: input.warmup ? input.now : null,
      version: 0,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static fromState(id: string, props: WhatsAppInstanceProps): WhatsAppInstance {
    return new WhatsAppInstance(id, props)
  }

  /** Snapshot puro para o serviço de ritmo (`pacing`). */
  snapshot(): LaneState {
    return {
      enabled: this.props.enabled,
      status: this.props.status,
      dailyCap: this.props.dailyCap,
      sentToday: this.props.sentToday,
      dayCursor: this.props.dayCursor,
      messagesSinceRest: this.props.messagesSinceRest,
      nextAvailableAt: this.props.nextAvailableAt,
      warmupStartedAt: this.props.warmupStartedAt,
    }
  }

  /** Aplica o resultado de um envio (contadores + próximo horário disponível). */
  applyPacing(update: PacingUpdate, now: Date): void {
    this.props.sentToday = update.sentToday
    this.props.messagesSinceRest = update.messagesSinceRest
    this.props.dayCursor = update.dayCursor
    this.props.nextAvailableAt = update.nextAvailableAt
    this.props.updatedAt = now
  }

  /** Reserva/atrasa a lane até `at` (sem mexer nos contadores de cota). */
  setNextAvailableAt(at: Date, now: Date): void {
    this.props.nextAvailableAt = at
    this.props.updatedAt = now
  }

  setStatus(status: InstanceStatus, now: Date): void {
    this.props.status = status
    this.props.updatedAt = now
  }

  setEnabled(enabled: boolean, now: Date): void {
    this.props.enabled = enabled
    this.props.updatedAt = now
  }

  setDailyCap(cap: number, now: Date): void {
    if (!Number.isInteger(cap) || cap <= 0)
      throw new ValidationError('daily_cap deve ser inteiro positivo')
    this.props.dailyCap = cap
    this.props.updatedAt = now
  }

  startWarmup(now: Date): void {
    this.props.warmupStartedAt = now
    this.props.updatedAt = now
  }

  get instanceName(): string {
    return this.props.instanceName
  }
  get status(): InstanceStatus {
    return this.props.status
  }
  get enabled(): boolean {
    return this.props.enabled
  }
  get version(): number {
    return this.props.version
  }
  get state(): Readonly<WhatsAppInstanceProps> {
    return this.props
  }
}
