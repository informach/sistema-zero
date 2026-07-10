import { describe, expect, it } from 'bun:test'
import { SetInstanceConnectionService } from '../../src/application/instances/instance-admin.service'
import {
  type InstanceStatus,
  WhatsAppInstance,
} from '../../src/domain/lane/whatsapp-instance.aggregate'
import type { Clock } from '../../src/domain/ports/clock.port'
import type { InstanceAlerter } from '../../src/domain/ports/instance-alert.port'
import { InMemoryWhatsAppInstanceRepository, silentLogger } from '../fakes/in-memory'

const NOW = new Date('2026-07-10T12:00:00Z')
const clock: Clock = { now: () => NOW }

function recordingAlerter() {
  const calls: Array<{ instanceName: string; phoneNumber: string; detail?: string }> = []
  const alerter: InstanceAlerter = {
    async laneDisconnected(input) {
      calls.push(input)
    },
  }
  return { alerter, calls }
}

async function seed(
  repo: InMemoryWhatsAppInstanceRepository,
  status: InstanceStatus,
): Promise<void> {
  const lane = WhatsAppInstance.create({
    id: 'lane-1',
    instanceName: 'principal',
    phoneNumber: '5531999999999',
    now: NOW,
  })
  lane.setStatus(status, NOW)
  await repo.create(lane)
}

describe('SetInstanceConnectionService — alerta de queda', () => {
  it('CONECTADA → cai: marca DISCONNECTED e ALERTA (só na transição)', async () => {
    const repo = new InMemoryWhatsAppInstanceRepository()
    await seed(repo, 'CONNECTED')
    const { alerter, calls } = recordingAlerter()
    const svc = new SetInstanceConnectionService(repo, clock, silentLogger, alerter)

    await svc.execute('principal', false, 'state=close reason=401')

    expect((await repo.findByInstanceName('principal'))?.status).toBe('DISCONNECTED')
    expect(calls).toEqual([
      { instanceName: 'principal', phoneNumber: '5531999999999', detail: 'state=close reason=401' },
    ])
  })

  it('já DISCONNECTED → cai de novo: NÃO alerta (sem transição, sem spam)', async () => {
    const repo = new InMemoryWhatsAppInstanceRepository()
    await seed(repo, 'DISCONNECTED')
    const { alerter, calls } = recordingAlerter()
    const svc = new SetInstanceConnectionService(repo, clock, silentLogger, alerter)

    await svc.execute('principal', false)

    expect(calls).toHaveLength(0)
  })

  it('reconecta (open): marca CONNECTED e NÃO alerta', async () => {
    const repo = new InMemoryWhatsAppInstanceRepository()
    await seed(repo, 'DISCONNECTED')
    const { alerter, calls } = recordingAlerter()
    const svc = new SetInstanceConnectionService(repo, clock, silentLogger, alerter)

    await svc.execute('principal', true)

    expect((await repo.findByInstanceName('principal'))?.status).toBe('CONNECTED')
    expect(calls).toHaveLength(0)
  })

  it('PAUSED: reconexão da Evolution NÃO sobrescreve nem alerta', async () => {
    const repo = new InMemoryWhatsAppInstanceRepository()
    await seed(repo, 'PAUSED')
    const { alerter, calls } = recordingAlerter()
    const svc = new SetInstanceConnectionService(repo, clock, silentLogger, alerter)

    await svc.execute('principal', false)

    expect((await repo.findByInstanceName('principal'))?.status).toBe('PAUSED')
    expect(calls).toHaveLength(0)
  })
})
