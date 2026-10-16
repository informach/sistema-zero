import {
  type AiRunView,
  type AutomationEvaluation,
  type AutomationPolicy,
  DEFAULT_AUTOMATION_POLICY,
  type HandoffReason,
} from '@sistemazero/helpdesk-contracts'
import type {
  AutomationJob,
  AutomationRepository,
} from '../../src/domain/ports/automation-repository.port'
import { applyHumanTakeover } from '../../src/domain/ticket/automation'
import type { InMemoryTicketRepository } from './in-memory'

/** HTTP policy fake. Job concurrency and publication are tested against PostgreSQL. */
export class InMemoryAutomationRepository implements AutomationRepository {
  async diagnostics(at: Date) {
    return {
      windowDays: 30,
      asOf: at.toISOString(),
      latency: {},
      health: {},
      cycles: {},
      copilot: {},
      usage: [],
      handoffs: [],
    }
  }
  private version = 0
  private config = structuredClone(DEFAULT_AUTOMATION_POLICY)
  private reports: AutomationEvaluation[] = []
  constructor(private readonly tickets: InMemoryTicketRepository) {}
  async policy(_at: Date) {
    return {
      version: this.version,
      policy: structuredClone(this.config),
      updatedAt: null,
      usage: { reservedMicros: 0, knownMicros: 0, unknownAttempts: 0 },
    }
  }
  async updatePolicy(policy: AutomationPolicy, version: number, _actorId: string, at: Date) {
    if (version !== this.version) return null
    this.config = structuredClone(policy)
    this.version++
    return this.policy(at)
  }
  async saveEvaluation(evaluation: AutomationEvaluation) {
    this.reports.push(structuredClone(evaluation))
  }
  async evaluations() {
    return structuredClone(this.reports)
  }
  async claim(_at: Date) {
    return null
  }
  async expire(_at: Date) {
    return 0
  }
  async reserve(_job: AutomationJob, _at: Date) {
    return false
  }
  async reconcile(_job: AutomationJob, _cost: number | null, _at: Date) {}
  async complete(_job: AutomationJob, _run: AiRunView, _at: Date) {
    return 'superseded' as const
  }
  async fail(_job: AutomationJob, _reason: HandoffReason, _at: Date) {}
  private commands = new Map<string, { id: string; version: number }>()
  async takeover(
    id: string,
    actorId: string,
    actorName: string,
    version: number,
    commandKey: string,
    at: Date,
  ) {
    const key = `${actorId}:${commandKey}`
    const previous = this.commands.get(key)
    if (previous)
      return previous.id === id && previous.version === version ? this.tickets.byId(id) : null
    const ticket = this.tickets.rows.get(id)
    if (!ticket || ticket.version !== version) return null
    applyHumanTakeover(ticket, at)
    ticket.version++
    ticket.assignedTo = actorId
    ticket.assignedToName = actorName
    this.commands.set(key, { id, version })
    return structuredClone(ticket)
  }
}
