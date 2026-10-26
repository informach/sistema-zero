import { createHash } from 'node:crypto'
import postgres, { type Sql } from 'postgres'
import type { BusinessAudience } from '../src/domain/business-audience'
import { verifiedBillingAudience } from '../src/domain/subscription-recovery/billing-audience'

type Database = Pick<Sql, 'unsafe'>
type Row = {
  kind: 'payment' | 'subscription'
  id: string
  metadata: Record<string, unknown>
  audience: BusinessAudience | null
  catalogAudience: BusinessAudience | null
  productId: string | null
  parentId: string | null
}
type Change = {
  kind: Row['kind']
  id: string
  audience: BusinessAudience
  offerId: string | null
  productId: string | null
  parentId: string | null
}

/** Offline reviewed backfill. No checkout/recovery authority, no email, no changes to dates or amounts. */
export async function inspectBusinessAudience(db: Database) {
  const rows = await db.unsafe<Row[]>(`
    select 'subscription' as kind, s.id, s.metadata, s.reporting_audience as audience,
      p.audience::text as "catalogAudience", p.id as "productId", null::uuid as "parentId"
    from payments.subscriptions s
    left join catalog.offers o on o.id::text = s.metadata->>'offerId'
    left join catalog.products p on p.id = o.product_id
    union all
    select 'payment' as kind, s.id, s.metadata, s.reporting_audience as audience,
      p.audience::text as "catalogAudience", p.id as "productId", s.subscription_id as "parentId"
    from payments.payments s
    left join catalog.offers o on o.id::text = s.metadata->>'offerId'
    left join catalog.products p on p.id = o.product_id
    order by kind desc, id
  `)
  const parents = new Map<string, BusinessAudience | null>()
  const changes: Change[] = []
  const unresolved: { kind: Row['kind']; id: string }[] = []
  const conflicts: { kind: Row['kind']; id: string }[] = []
  for (const row of rows) {
    const candidates = new Set<BusinessAudience>()
    for (const value of [
      row.audience,
      row.catalogAudience,
      verifiedBillingAudience(row.metadata),
      row.parentId ? parents.get(row.parentId) : null,
    ]) {
      if (value) candidates.add(value)
    }
    if (candidates.size > 1) {
      conflicts.push({ kind: row.kind, id: row.id })
      continue
    }
    const audience = [...candidates][0] ?? null
    if (row.kind === 'subscription') parents.set(row.id, audience)
    if (!audience) unresolved.push({ kind: row.kind, id: row.id })
    if (audience && !row.audience)
      changes.push({
        kind: row.kind,
        id: row.id,
        audience,
        offerId: typeof row.metadata.offerId === 'string' ? row.metadata.offerId : null,
        productId: row.productId,
        parentId: row.parentId,
      })
  }
  const state = { changes, unresolved, conflicts }
  const digest = createHash('sha256').update(JSON.stringify(state)).digest('hex')
  return { digest, ...state }
}

export async function applyBusinessAudience(sql: Sql, expectedDigest: string) {
  return sql.begin('isolation level serializable', async (tx) => {
    const plan = await inspectBusinessAudience(tx)
    if (plan.digest !== expectedDigest)
      throw new Error('The reviewed snapshot changed. Inspect the new plan before applying.')
    if (plan.conflicts.length)
      throw new Error('Conflicting community evidence; no changes applied.')
    for (const change of plan.changes) {
      const table = change.kind === 'payment' ? 'payments.payments' : 'payments.subscriptions'
      const updated = await tx.unsafe(
        `update ${table} set reporting_audience=$1 where id=$2 and reporting_audience is null returning id`,
        [change.audience, change.id],
      )
      if (updated.length !== 1)
        throw new Error('Concurrent classification detected; transaction rolled back.')
    }
    return {
      reviewedDigest: plan.digest,
      applied: plan.changes.length,
      unresolved: plan.unresolved.length,
    }
  })
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    const apply = process.argv.includes('--apply')
    const expected = process.argv.find((arg) => arg.startsWith('--expected-sha256='))?.split('=')[1]
    if (apply && !expected)
      throw new Error('--apply requires --expected-sha256 from a reviewed dry run')
    const result =
      apply && expected
        ? await applyBusinessAudience(sql, expected)
        : await inspectBusinessAudience(sql)
    // Only opaque IDs and classification references; never names, email, card or credentials.
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await sql.end({ timeout: 5 })
  }
}
