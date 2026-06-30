import { and, asc, count, desc, eq, lte, sql } from 'drizzle-orm'
import { WhatsAppInstanceAlreadyExistsError } from '../../../domain/lane/lane.errors'
import {
  WhatsAppInstance,
  type WhatsAppInstanceProps,
} from '../../../domain/lane/whatsapp-instance.aggregate'
import type { WhatsAppInstanceRepository } from '../../../domain/ports/whatsapp-instance-repository.port'
import {
  isLaneAvailable,
  type PacingConfig,
  type PacingUpdate,
} from '../../../domain/services/pacing'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { whatsappInstances } from './schema'

type InstanceRow = typeof whatsappInstances.$inferSelect

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function toRow(i: WhatsAppInstance): typeof whatsappInstances.$inferInsert {
  const p = i.state
  return {
    id: i.id,
    instanceName: p.instanceName,
    phoneNumber: p.phoneNumber,
    status: p.status,
    enabled: p.enabled,
    dailyCap: p.dailyCap,
    sentToday: p.sentToday,
    dayCursor: p.dayCursor,
    messagesSinceRest: p.messagesSinceRest,
    nextAvailableAt: p.nextAvailableAt,
    warmupStartedAt: p.warmupStartedAt,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function toAggregate(row: InstanceRow): WhatsAppInstance {
  const props: WhatsAppInstanceProps = {
    instanceName: row.instanceName,
    phoneNumber: row.phoneNumber,
    status: row.status,
    enabled: row.enabled,
    dailyCap: row.dailyCap,
    sentToday: row.sentToday,
    dayCursor: row.dayCursor,
    messagesSinceRest: row.messagesSinceRest,
    nextAvailableAt: row.nextAvailableAt,
    warmupStartedAt: row.warmupStartedAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  return WhatsAppInstance.fromState(row.id, props)
}

export class DrizzleWhatsAppInstanceRepository implements WhatsAppInstanceRepository {
  constructor(private readonly db: Database) {}

  async create(instance: WhatsAppInstance): Promise<void> {
    try {
      await this.db.insert(whatsappInstances).values(toRow(instance))
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new WhatsAppInstanceAlreadyExistsError(
          `Instância ${instance.state.instanceName} já existe`,
        )
      }
      throw error
    }
  }

  async update(instance: WhatsAppInstance): Promise<void> {
    const updated = await this.db
      .update(whatsappInstances)
      .set({ ...toRow(instance), version: instance.version + 1 })
      .where(
        and(eq(whatsappInstances.id, instance.id), eq(whatsappInstances.version, instance.version)),
      )
      .returning({ id: whatsappInstances.id })
    if (updated.length === 0) throw new ConcurrencyConflictError(instance.id)
  }

  async findById(id: string): Promise<WhatsAppInstance | null> {
    const [row] = await this.db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.id, id))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async findByInstanceName(instanceName: string): Promise<WhatsAppInstance | null> {
    const [row] = await this.db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.instanceName, instanceName))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async list(query: { limit: number; offset: number }): Promise<{
    items: WhatsAppInstance[]
    total: number
  }> {
    const rows = await this.db
      .select()
      .from(whatsappInstances)
      .orderBy(desc(whatsappInstances.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    const totalRows = await this.db.select({ value: count() }).from(whatsappInstances)
    return { items: rows.map(toAggregate), total: totalRows[0]?.value ?? 0 }
  }

  async reserveAvailableLane(
    now: Date,
    leaseMs: number,
    config: PacingConfig,
  ): Promise<WhatsAppInstance | null> {
    return this.db.transaction(async (tx) => {
      const pageSize = 50
      const today = now.toISOString().slice(0, 10)
      let cursor: { nextAvailableAt: Date; id: string } | null = null

      while (true) {
        const rows = await tx
          .select()
          .from(whatsappInstances)
          .where(
            and(
              eq(whatsappInstances.enabled, true),
              eq(whatsappInstances.status, 'CONNECTED'),
              lte(whatsappInstances.nextAvailableAt, now),
              // Filtra no SQL as lanes já esgotadas pelo teto cheio do dia. O
              // aquecimento ainda é validado em memória, então continuamos
              // paginando até achar uma lane realmente disponível.
              sql`(${whatsappInstances.dayCursor} is null or ${whatsappInstances.dayCursor} <> ${today}::date or ${whatsappInstances.sentToday} < ${whatsappInstances.dailyCap})`,
              cursor
                ? sql`(${whatsappInstances.nextAvailableAt} > ${cursor.nextAvailableAt} or (${whatsappInstances.nextAvailableAt} = ${cursor.nextAvailableAt} and ${whatsappInstances.id} > ${cursor.id}::uuid))`
                : undefined,
            ),
          )
          .orderBy(asc(whatsappInstances.nextAvailableAt), asc(whatsappInstances.id))
          .limit(pageSize)
          .for('update', { skipLocked: true })

        if (rows.length === 0) return null

        for (const row of rows) {
          const inst = toAggregate(row)
          if (!isLaneAvailable(inst.snapshot(), config, now)) {
            cursor = { nextAvailableAt: row.nextAvailableAt, id: row.id }
            continue
          }
          // Reserva (lease): empurra o próximo horário p/ frente enquanto envia.
          // Bump de version: um update admin/webhook carregado ANTES desta escrita
          // conflita (em vez de regravar contadores de ritmo velhos por cima).
          await tx
            .update(whatsappInstances)
            .set({
              nextAvailableAt: new Date(now.getTime() + leaseMs),
              updatedAt: now,
              version: sql`${whatsappInstances.version} + 1`,
            })
            .where(eq(whatsappInstances.id, row.id))
          return inst
        }

        if (rows.length < pageSize) return null
      }
    })
  }

  async applyLanePacing(id: string, update: PacingUpdate): Promise<void> {
    await this.db
      .update(whatsappInstances)
      .set({
        sentToday: update.sentToday,
        messagesSinceRest: update.messagesSinceRest,
        dayCursor: update.dayCursor,
        nextAvailableAt: update.nextAvailableAt,
        updatedAt: new Date(),
        version: sql`${whatsappInstances.version} + 1`,
      })
      .where(eq(whatsappInstances.id, id))
  }

  async delayLane(id: string, until: Date): Promise<void> {
    await this.db
      .update(whatsappInstances)
      .set({
        nextAvailableAt: until,
        updatedAt: new Date(),
        version: sql`${whatsappInstances.version} + 1`,
      })
      .where(eq(whatsappInstances.id, id))
  }
}
