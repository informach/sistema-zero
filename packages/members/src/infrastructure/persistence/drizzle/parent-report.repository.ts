import { and, eq, inArray } from 'drizzle-orm'
import type { ParentReportRepository } from '../../../domain/ports/parent-report-repository.port'
import type { Database } from './db'
import { parentReportPrefs, parentReportsSent } from './schema'

export class DrizzleParentReportRepository implements ParentReportRepository {
  constructor(private readonly db: Database) {}

  async listSentAccounts(weekKey: string, accountIds: string[]): Promise<Set<string>> {
    if (accountIds.length === 0) return new Set()
    const rows = await this.db
      .select({ accountId: parentReportsSent.accountId })
      .from(parentReportsSent)
      .where(
        and(
          eq(parentReportsSent.weekKey, weekKey),
          inArray(parentReportsSent.accountId, accountIds),
        ),
      )
    return new Set(rows.map((r) => r.accountId))
  }

  async markSent(accountId: string, weekKey: string, now: Date): Promise<void> {
    await this.db
      .insert(parentReportsSent)
      .values({ accountId, weekKey, sentAt: now })
      .onConflictDoNothing({ target: [parentReportsSent.accountId, parentReportsSent.weekKey] })
  }

  async listDisabledAccounts(accountIds: string[]): Promise<Set<string>> {
    if (accountIds.length === 0) return new Set()
    const rows = await this.db
      .select({ accountId: parentReportPrefs.accountId })
      .from(parentReportPrefs)
      .where(
        and(eq(parentReportPrefs.disabled, true), inArray(parentReportPrefs.accountId, accountIds)),
      )
    return new Set(rows.map((r) => r.accountId))
  }

  async isDisabled(accountId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ disabled: parentReportPrefs.disabled })
      .from(parentReportPrefs)
      .where(eq(parentReportPrefs.accountId, accountId))
      .limit(1)
    return row?.disabled ?? false
  }

  async setDisabled(accountId: string, disabled: boolean, now: Date): Promise<void> {
    await this.db
      .insert(parentReportPrefs)
      .values({ accountId, disabled, updatedAt: now })
      .onConflictDoUpdate({
        target: parentReportPrefs.accountId,
        set: { disabled, updatedAt: now },
      })
  }
}
