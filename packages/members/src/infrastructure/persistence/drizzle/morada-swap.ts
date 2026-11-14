import { randomUUID } from 'node:crypto'
import { validateMoradaHouse } from '@sistemazero/core/morada'
import type postgres from 'postgres'
import type { CourseAudience } from '../../../domain/course/course'
import { migrateLegacyRoom } from '../../../domain/room/morada-migration'
import { retiredRoomIds } from '../../../domain/room/morada-retirement'
import type { RoomState } from '../../../domain/room/room-catalog'

export { retiredRoomIds } from '../../../domain/room/morada-retirement'

export const MORADA_REFUND_SOURCE = 'morada-refund-v1'

export interface MoradaSwapReport {
  dryRun: boolean
  profiles: number
  housesCreated: number
  inventoryRemoved: number
  refunds: { userId: string; audience: string; coins: number }[]
}

/** Operação explícita, nunca chamada no startup; o padrão do CLI é somente ensaio. */
export async function swapMorada(
  sql: postgres.Sql,
  options: { dryRun: boolean; now: Date },
): Promise<MoradaSwapReport> {
  const retired = retiredRoomIds()
  const owners = await sql<{ user_id: string; audience: CourseAudience; account_id: string }[]>`
    select p.user_id, p.audience, p.account_id from members.gamification_profiles p
    where exists (select 1 from members.room_state s where s.user_id=p.user_id and s.audience=p.audience)
       or exists (select 1 from members.room_inventory i where i.user_id=p.user_id and i.audience=p.audience)
       or exists (select 1 from members.coin_events e where e.user_id=p.user_id and e.audience=p.audience and e.source_type='spend_room')
    order by p.user_id, p.audience`
  const report: MoradaSwapReport = {
    dryRun: options.dryRun,
    profiles: owners.length,
    housesCreated: 0,
    inventoryRemoved: 0,
    refunds: [],
  }
  for (const owner of owners) {
    const result = await sql.begin(async (tx) => {
      if (!options.dryRun)
        await tx`select pg_advisory_xact_lock(hashtextextended(${`gamification:${owner.user_id}`}, 0))`
      const [state] = await tx<
        { state: RoomState }[]
      >`select state from members.room_state where user_id=${owner.user_id} and audience=${owner.audience}::members.course_audience`
      const inventory = await tx<
        { item_id: string }[]
      >`select item_id from members.room_inventory where user_id=${owner.user_id} and audience=${owner.audience}::members.course_audience`
      const [refund] = await tx<{ coins: number }[]>`
        select coalesce(-sum(amount),0)::int as coins from members.coin_events e
        where e.user_id=${owner.user_id} and e.audience=${owner.audience}::members.course_audience
          and e.source_type='spend_room' and e.amount<0
          and exists (select 1 from unnest(${retired}::text[]) as r(item_id) where e.source_id='room-buy:'||e.user_id::text||':'||r.item_id)
          and not exists (select 1 from members.coin_events paid where paid.user_id=e.user_id and paid.audience=e.audience and paid.source_type='admin_adjust' and paid.source_id=${MORADA_REFUND_SOURCE})`
      const coins = refund?.coins ?? 0
      const [existing] =
        await tx`select 1 from members.morada_houses where user_id=${owner.user_id} and audience=${owner.audience}::members.course_audience`
      const removed = inventory.filter((i) => retired.includes(i.item_id)).length
      if (options.dryRun) return { coins, removed, created: !existing }
      if (coins > 0) {
        const [profile] = await tx<
          { coin_balance: number }[]
        >`update members.gamification_profiles set coin_balance=coin_balance+${coins},updated_at=${options.now.toISOString()}::timestamptz where user_id=${owner.user_id} and audience=${owner.audience}::members.course_audience returning coin_balance`
        if (!profile)
          throw new Error('Perfil da carteira não encontrado durante a devolução Morada.')
        await tx`insert into members.coin_events(id,user_id,audience,source_type,source_id,amount,balance_after,created_at) values(${randomUUID()},${owner.user_id},${owner.audience}::members.course_audience,'admin_adjust',${MORADA_REFUND_SOURCE},${coins},${profile.coin_balance},${options.now.toISOString()}::timestamptz)`
      }
      let created = false
      if (!existing) {
        const house = migrateLegacyRoom(
          state?.state ?? null,
          inventory.map((i) => i.item_id),
        )
        const errors = validateMoradaHouse(house)
        if (errors.length) throw new Error(`Casa migrada inválida: ${errors.join('; ')}`)
        const inserted =
          await tx`insert into members.morada_houses(id,user_id,account_id,audience,house,revision,created_at,updated_at) values(${randomUUID()},${owner.user_id},${owner.account_id},${owner.audience}::members.course_audience,${JSON.stringify(house)}::jsonb,1,${options.now.toISOString()}::timestamptz,${options.now.toISOString()}::timestamptz) on conflict(user_id,audience) do nothing returning id`
        created = inserted.length > 0
      }
      await tx`delete from members.room_inventory where user_id=${owner.user_id} and audience=${owner.audience}::members.course_audience and item_id=any(${retired}::text[])`
      return { coins, removed, created }
    })
    report.housesCreated += Number(result.created)
    report.inventoryRemoved += result.removed
    if (result.coins > 0)
      report.refunds.push({ userId: owner.user_id, audience: owner.audience, coins: result.coins })
  }
  return report
}
