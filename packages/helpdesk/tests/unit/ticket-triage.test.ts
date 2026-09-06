import { describe, expect, it } from 'bun:test'
import { TRIAGE_KINDS } from '@sistemazero/helpdesk-contracts'
import {
  canRetriage,
  demoteTicket,
  isManualTriageRule,
  MANUAL_DEMOTED_RULE,
  MANUAL_PROMOTED_RULE,
  promoteTicket,
} from '../../src/domain/ticket/ticket-triage'
import { triageKindEnum } from '../../src/infrastructure/persistence/drizzle/schema'
import { makeTicket } from '../helpers'

describe('conformidade do enum de triagem', () => {
  it('o enum do banco é construído a partir de TRIAGE_KINDS do contrato', () => {
    expect([...triageKindEnum.enumValues]).toEqual([...TRIAGE_KINDS])
  })
})

describe('promoteTicket / demoteTicket', () => {
  const now = new Date('2026-09-06T12:00:00Z')

  it('promover volta para a fila como novo, SLA a partir do último inbound humano, IA numa geração nova', () => {
    const ticket = makeTicket({
      status: 'closed',
      resolvedAt: new Date('2026-09-05T12:00:00Z'),
      triage: 'system',
      triageRule: 'system:sender-local-part',
      triagedAt: new Date('2026-09-05T12:00:00Z'),
      lastInboundAt: null,
      aiGeneration: 0,
      aiStatus: 'skipped',
      aiSummary: 'resumo velho',
    })
    const lastHumanInboundAt = new Date('2026-09-05T11:00:00Z')
    promoteTicket(ticket, {
      rule: MANUAL_PROMOTED_RULE,
      at: now,
      lastHumanInboundAt,
      aiEnabled: true,
    })
    expect(ticket).toMatchObject({
      triage: 'human',
      triageRule: 'manual:promoted',
      triagedAt: null,
      status: 'new',
      resolvedAt: null,
      lastInboundAt: lastHumanInboundAt,
      aiGeneration: 1,
      aiStatus: 'pending',
      aiNextAttemptAt: now,
      aiSummary: null,
      updatedAt: now,
    })
  })

  it('promover sem IA configurada fica skipped (e mesmo assim avança a geração)', () => {
    const ticket = makeTicket({ triage: 'bulk', triageRule: 'bulk:list-header', aiGeneration: 3 })
    promoteTicket(ticket, {
      rule: MANUAL_PROMOTED_RULE,
      at: now,
      lastHumanInboundAt: null,
      aiEnabled: false,
    })
    expect(ticket).toMatchObject({ aiStatus: 'skipped', aiNextAttemptAt: null, aiGeneration: 4 })
  })

  it('rebaixar encerra, marca a hora da triagem e só carimba resolvedAt se ainda não era terminal', () => {
    const open = makeTicket({ status: 'open', resolvedAt: null, aiStatus: 'pending' })
    demoteTicket(open, { kind: 'system', rule: MANUAL_DEMOTED_RULE, at: now })
    expect(open).toMatchObject({
      triage: 'system',
      triageRule: 'manual:demoted',
      triagedAt: now,
      status: 'closed',
      resolvedAt: now,
      aiStatus: 'skipped',
      aiNextAttemptAt: null,
    })

    const resolvedAt = new Date('2026-09-01T12:00:00Z')
    const resolved = makeTicket({ status: 'resolved', resolvedAt })
    demoteTicket(resolved, { kind: 'system', rule: MANUAL_DEMOTED_RULE, at: now })
    expect(resolved.resolvedAt).toEqual(resolvedAt) // preserva o encerramento original
    expect(resolved.status).toBe('closed')
  })

  it('decisão manual nunca é re-triada; a automática pode', () => {
    expect(isManualTriageRule('manual:promoted')).toBe(true)
    expect(isManualTriageRule('manual:demoted')).toBe(true)
    expect(isManualTriageRule('promoted:inbound')).toBe(false)
    expect(isManualTriageRule(null)).toBe(false)
    expect(canRetriage(makeTicket({ triageRule: 'manual:demoted' }))).toBe(false)
    expect(canRetriage(makeTicket({ triageRule: 'system:ignored-sender' }))).toBe(true)
    expect(canRetriage(makeTicket({ triageRule: null }))).toBe(true)
  })
})
