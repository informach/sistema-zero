import { randomUUID } from 'node:crypto'
import type { CommerceContact, CommerceOrigin } from '@sistemazero/core/commerce'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import type { MemberCheckoutPresentation, PreparedMemberCharge } from '../db/member-commerce-types'
import { createFunnelRepo, type FunnelRepo } from '../db/repo'
import {
  leads,
  type MemberCheckoutContext,
  memberCheckouts,
  memberCustomers,
  memberProductClaims,
} from '../db/schema'
import type { AddressFormInput } from '../lib/checkout-schema'
import type { CheckoutPlan } from './checkout-plan'
import { commerceOriginKey } from './member-commerce-origin'

export type MemberCheckout = typeof memberCheckouts.$inferSelect
export type MemberCustomer = typeof memberCustomers.$inferSelect
export type MemberProductClaim = typeof memberProductClaims.$inferSelect
export interface MemberCustomerInput {
  contact: CommerceContact
  birth?: string
  address?: AddressFormInput
}
export interface PrepareCheckoutInput {
  accountId: string
  offerId: string
  offerRef: string
  origin: CommerceOrigin
  contact: CommerceContact
  context: MemberCheckoutContext
  presentation: MemberCheckoutPresentation
  replaceCheckoutId?: string
}
export interface MemberCommerceUnit {
  repo: FunnelRepo
  claim: MemberProductClaim | null
  owned(id: string): Promise<MemberCheckout | null>
  registerOrigins(checkout: MemberCheckout, originKeys: string[]): Promise<MemberCheckout>
  savePlan(
    checkout: MemberCheckout,
    request: PreparedMemberCharge,
    plan: CheckoutPlan,
    customer: MemberCustomerInput,
  ): Promise<MemberCheckout>
}
export interface MemberCommerceStore {
  customer(accountId: string): Promise<MemberCustomer | null>
  prepare(input: PrepareCheckoutInput): Promise<MemberCheckout>
  owned(id: string, accountId: string): Promise<MemberCheckout | null>
  pending(accountId: string, audience: 'kids' | 'adult'): Promise<MemberCheckout[]>
  recover(
    accountId: string,
    audience: 'kids' | 'adult',
    origin: CommerceOrigin,
  ): Promise<MemberCheckout | null>
  withProductLock<T>(
    accountId: string,
    productId: string,
    task: (unit: MemberCommerceUnit) => Promise<T>,
  ): Promise<T>
  rejectPlan(checkoutId: string, accountId: string, planId: string): Promise<void>
  clearRecordedPlan(checkoutId: string, accountId: string, planId: string): Promise<void>
}
type MemberSql = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>
async function owned(db: MemberSql, id: string, accountId: string) {
  return (
    (
      await db
        .select()
        .from(memberCheckouts)
        .where(and(eq(memberCheckouts.id, id), eq(memberCheckouts.accountId, accountId)))
        .limit(1)
    )[0] ?? null
  )
}
function pendingForAccount(accountId: string, audience: 'kids' | 'adult') {
  return and(
    eq(memberCheckouts.accountId, accountId),
    sql`${memberCheckouts.presentation}->'offer'->'product'->>'audience' = ${audience}`,
    sql`exists (select 1 from ${leads} where ${leads.id} = ${memberCheckouts.leadId} and (${memberCheckouts.pendingRequest} is not null or ${memberCheckouts.dispatchPlan} is not null or ${leads.paymentId} is not null or ${leads.subscriptionId} is not null) and not (${leads.paidAt} is not null and ${leads.membersGrantedAt} is not null))`,
  )
}
export function createMemberCommerceStore(db: Database): MemberCommerceStore {
  const lock = <T>(
    accountId: string,
    productId: string,
    task: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
  ) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`member-product:${accountId}:${productId}`}, 0))`,
      )
      return task(tx)
    })
  const finish = async (id: string, accountId: string, planId: string, rejected: boolean) => {
    const initial = await owned(db, id, accountId)
    if (!initial) return
    await lock(accountId, initial.presentation.offer.product.id, async (tx) => {
      const current = await owned(tx, id, accountId)
      if (current?.dispatchPlan?.id !== planId) return
      await tx
        .update(memberCheckouts)
        .set({
          pendingRequest: null,
          dispatchPlan: null,
          attemptPhase: rejected ? 'rejected' : 'recorded',
          ...(rejected ? { cardAttemptId: randomUUID() } : {}),
        })
        .where(eq(memberCheckouts.id, id))
      if (rejected)
        await tx
          .delete(memberProductClaims)
          .where(
            and(
              eq(memberProductClaims.accountId, accountId),
              eq(memberProductClaims.productId, current.presentation.offer.product.id),
              eq(memberProductClaims.checkoutId, id),
              eq(memberProductClaims.leadId, current.leadId),
            ),
          )
    })
  }
  return {
    async customer(accountId) {
      return (
        (
          await db
            .select()
            .from(memberCustomers)
            .where(eq(memberCustomers.accountId, accountId))
            .limit(1)
        )[0] ?? null
      )
    },
    async prepare(input) {
      return lock(input.accountId, input.presentation.offer.product.id, async (tx) => {
        const existing = (
          await tx
            .select()
            .from(memberCheckouts)
            .where(
              and(
                eq(memberCheckouts.accountId, input.accountId),
                eq(memberCheckouts.offerId, input.offerId),
              ),
            )
            .limit(1)
        )[0]
        const originKeys = [
          ...new Set([...(existing?.originKeys ?? []), commerceOriginKey(input.origin)]),
        ]
        if (existing && input.replaceCheckoutId !== existing.id) {
          const [updated] = await tx
            .update(memberCheckouts)
            .set({ originKeys })
            .where(eq(memberCheckouts.id, existing.id))
            .returning()
          return updated ?? existing
        }
        const [lead] = await tx
          .insert(leads)
          .values({
            funnel: `${input.context.audience}/member-commerce`,
            nome: input.contact.nome,
            email: input.contact.email,
            telefone: input.contact.telefone,
            document: input.contact.cpf || null,
            offerRef: input.offerRef,
            buyerUserId: input.accountId,
            buyerIsNew: false,
            buyerRegisteredAt: new Date(),
            memberContext: input.context,
          })
          .returning({ id: leads.id })
        if (!lead) throw new Error('Não foi possível iniciar a compra.')
        const values = {
          accountId: input.accountId,
          offerId: input.offerId,
          offerRef: input.offerRef,
          leadId: lead.id,
          origin: input.origin,
          originKeys,
          presentation: input.presentation,
        }
        const [checkout] = existing
          ? await tx
              .update(memberCheckouts)
              .set({
                ...values,
                id: randomUUID(),
                cardAttemptId: randomUUID(),
                pendingRequest: null,
                dispatchPlan: null,
                attemptPhase: 'ready',
                createdAt: new Date(),
              })
              .where(eq(memberCheckouts.id, existing.id))
              .returning()
          : await tx.insert(memberCheckouts).values(values).returning()
        if (!checkout) throw new Error('Não foi possível registrar a compra.')
        return checkout
      })
    },
    owned: (id, accountId) => owned(db, id, accountId),
    pending: (accountId, audience) =>
      db
        .select()
        .from(memberCheckouts)
        .where(pendingForAccount(accountId, audience))
        .orderBy(desc(memberCheckouts.createdAt))
        .limit(50),
    async recover(accountId, audience, origin) {
      return (
        (
          await db
            .select()
            .from(memberCheckouts)
            .where(
              and(
                pendingForAccount(accountId, audience),
                or(
                  sql`${commerceOriginKey(origin)} = ANY(${memberCheckouts.originKeys})`,
                  sql`${memberCheckouts.origin} = ${JSON.stringify(origin)}::jsonb`,
                  ...(origin.kind === 'promotion' || origin.kind === 'offer'
                    ? [eq(memberCheckouts.offerRef, origin.offerRef)]
                    : []),
                ),
              ),
            )
            .orderBy(desc(memberCheckouts.createdAt))
            .limit(1)
        )[0] ?? null
      )
    },
    async withProductLock(accountId, productId, task) {
      return lock(accountId, productId, async (tx) => {
        const claim =
          (
            await tx
              .select()
              .from(memberProductClaims)
              .where(
                and(
                  eq(memberProductClaims.accountId, accountId),
                  eq(memberProductClaims.productId, productId),
                ),
              )
              .limit(1)
          )[0] ?? null
        return task({
          repo: createFunnelRepo(tx),
          claim,
          owned: (id) => owned(tx, id, accountId),
          async registerOrigins(checkout, keys) {
            const originKeys = [...new Set([...checkout.originKeys, ...keys])]
            const [updated] = await tx
              .update(memberCheckouts)
              .set({ originKeys })
              .where(
                and(eq(memberCheckouts.id, checkout.id), eq(memberCheckouts.accountId, accountId)),
              )
              .returning()
            if (!updated) throw new Error('Compra não encontrada.')
            return updated
          },
          async savePlan(checkout, pendingRequest, dispatchPlan, customer) {
            if (
              checkout.accountId !== accountId ||
              checkout.presentation.offer.product.id !== productId
            )
              throw new Error('Compra incompatível com o produto.')
            const [saved] = await tx
              .update(memberCheckouts)
              .set({
                pendingRequest,
                dispatchPlan,
                attemptPhase: 'dispatched',
                presentation: checkout.presentation,
              })
              .where(
                and(eq(memberCheckouts.id, checkout.id), eq(memberCheckouts.accountId, accountId)),
              )
              .returning()
            if (!saved) throw new Error('Compra não encontrada.')
            await tx
              .insert(memberProductClaims)
              .values({ accountId, productId, checkoutId: saved.id, leadId: saved.leadId })
              .onConflictDoUpdate({
                target: [memberProductClaims.accountId, memberProductClaims.productId],
                set: { checkoutId: saved.id, leadId: saved.leadId, createdAt: new Date() },
              })
            await tx
              .insert(memberCustomers)
              .values({ accountId, ...customer })
              .onConflictDoUpdate({
                target: memberCustomers.accountId,
                set: { ...customer, updatedAt: new Date() },
              })
            return saved
          },
        })
      })
    },
    rejectPlan: (id, accountId, planId) => finish(id, accountId, planId, true),
    clearRecordedPlan: (id, accountId, planId) => finish(id, accountId, planId, false),
  }
}
