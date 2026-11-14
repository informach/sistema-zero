import { randomUUID } from 'node:crypto'
import {
  isMoradaFree,
  isMoradaFunctionInstance,
  isMoradaTrophyTier,
  MORADA_CATALOG,
} from '@sistemazero/core/morada'
import type postgres from 'postgres'
import type { CourseAudience } from '../../../domain/course/course'

export interface MoradaGrantReport {
  dryRun: boolean
  houses: number
  /** Peças pagas que entram no inventário agora (no ensaio: as que entrariam). */
  granted: number
  perProfile: { userId: string; audience: string; pieces: number }[]
}

/**
 * As peças pagas (nem grátis, nem troféu) que estão numa casa: as instâncias e o bichinho. As
 * funções do jogo (a geladeira conquistada…) valem pela função e não viram posse da peça.
 */
export function paidPiecesInHouse(house: {
  instances?: { pieceId?: unknown; behavior?: unknown }[]
  pet?: unknown
}): string[] {
  const ids = new Set<string>()
  const add = (id: unknown) => {
    if (typeof id !== 'string' || !MORADA_CATALOG.pieces[id]) return
    if (isMoradaFree(id) || isMoradaTrophyTier(id)) return
    ids.add(id)
  }
  for (const instance of house.instances ?? []) {
    const funcao =
      typeof instance.pieceId === 'string' &&
      typeof instance.behavior === 'string' &&
      isMoradaFunctionInstance({ pieceId: instance.pieceId, behavior: instance.behavior })
    if (!funcao) add(instance.pieceId)
  }
  add(house.pet)
  return [...ids].sort()
}

/**
 * A Morada ganhou preço (14/11/2026) depois de as casas já existirem em produção: o que cada
 * criança já pôs na casa (convertida do quarto antigo ou montada enquanto tudo era grátis) passa a
 * ser dela, no `room_inventory`. Sem moeda e sem apagar nada; repetir não muda nada (o índice
 * único do inventário). Operação explícita, ensaio por padrão.
 */
export async function grantMoradaHouses(
  sql: postgres.Sql,
  options: { dryRun: boolean; now: Date },
): Promise<MoradaGrantReport> {
  const houses = await sql<{ user_id: string; audience: CourseAudience; house: unknown }[]>`
    select user_id, audience, house from members.morada_houses order by user_id, audience`
  const report: MoradaGrantReport = {
    dryRun: options.dryRun,
    houses: houses.length,
    granted: 0,
    perProfile: [],
  }
  for (const row of houses) {
    const house = (typeof row.house === 'string' ? JSON.parse(row.house) : row.house) as {
      instances?: { pieceId?: unknown }[]
      pet?: unknown
    }
    const pieces = paidPiecesInHouse(house)
    if (!pieces.length) continue
    const have = await sql<{ item_id: string }[]>`
      select item_id from members.room_inventory
      where user_id=${row.user_id} and audience=${row.audience}::members.course_audience
        and item_id=any(${pieces}::text[])`
    const missing = pieces.filter((id) => !have.some((h) => h.item_id === id))
    if (!missing.length) continue
    let added = missing.length
    if (!options.dryRun) {
      added = 0
      for (const id of missing) {
        const inserted = await sql`
          insert into members.room_inventory(id,user_id,audience,item_id,acquired_at)
          values(${randomUUID()},${row.user_id},${row.audience}::members.course_audience,${id},${options.now.toISOString()}::timestamptz)
          on conflict(user_id,audience,item_id) do nothing returning id`
        added += inserted.length
      }
    }
    report.granted += added
    report.perProfile.push({ userId: row.user_id, audience: row.audience, pieces: added })
  }
  return report
}
