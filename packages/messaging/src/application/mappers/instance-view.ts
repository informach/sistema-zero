import type {
  InstanceStatus,
  WhatsAppInstance,
} from '../../domain/lane/whatsapp-instance.aggregate'

export interface InstanceView {
  id: string
  instanceName: string
  phoneNumber: string
  status: InstanceStatus
  enabled: boolean
  dailyCap: number
  sentToday: number
  warmupStartedAt: string | null
  nextAvailableAt: string
  createdAt: string
}

export function toInstanceView(instance: WhatsAppInstance): InstanceView {
  const s = instance.state
  return {
    id: instance.id,
    instanceName: s.instanceName,
    phoneNumber: s.phoneNumber,
    status: s.status,
    enabled: s.enabled,
    dailyCap: s.dailyCap,
    sentToday: s.sentToday,
    warmupStartedAt: s.warmupStartedAt?.toISOString() ?? null,
    nextAvailableAt: s.nextAvailableAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }
}
