import { createHash } from 'node:crypto'
import { AVATAR_CATALOG, type AvatarCatalog } from '@sistemazero/core/avatar'
import type postgres from 'postgres'
import { type AvatarConfig, defaultAvatarConfig } from '../../../domain/avatar/avatar-config'
import { inventoryIds } from '../../../domain/avatar/avatar3d-catalog'

/**
 * A troca do avatar antigo pelo do pack (13/11/2026, decisão da dona), rodada uma vez por
 * ambiente pelo `scripts/swap-avatar.ts`:
 *
 * 1. DEVOLVE as moedas gastas em peças do avatar antigo: a soma das compras `avatar-buy:` (as do
 *    pack usam `avatar-buy-v3:`) de cada perfil e vitrine volta ao saldo, num lançamento
 *    `admin_adjust` com a chave `avatar-refund-v3`. A chave única do extrato faz a devolução valer
 *    uma vez só, mesmo rodando de novo.
 * 2. APAGA do inventário as peças que não existem no pack.
 * 3. TROCA cada avatar que não está no formato novo por um dos `bank` avatares sorteados de
 *    menino (`filter: 'boy'`, grátis, vestido, rosto simpático), escolhido pelo id do perfil.
 *    A foto vem do banco de fotos quando há (`photos`); sem ela, a foto antiga sai (a tela mostra
 *    a inicial até a criança abrir o "Meu avatar").
 *
 * `dryRun` só conta. Nada é apagado de `coin_events` nem de `xp_events`: o histórico fica.
 */
export interface AvatarSwapOptions {
  dryRun: boolean
  now: Date
  /** Quantos avatares sorteados diferentes (o banco de fotos tem o mesmo tamanho). */
  bank?: number
  /** Índice do banco → URL da foto daquele avatar. */
  photos?: ReadonlyMap<number, string>
  catalog?: AvatarCatalog
}

export interface AvatarSwapResult {
  dryRun: boolean
  refunds: { userId: string; audience: string; coins: number }[]
  inventoryRemoved: number
  avatarsSwapped: number
}

export const AVATAR_SWAP_BANK = 200
export const AVATAR_REFUND_SOURCE_ID = 'avatar-refund-v3'

/** O avatar do banco que fica com este perfil (sempre o mesmo para o mesmo id). */
export function bankIndexFor(userId: string, bank = AVATAR_SWAP_BANK): number {
  return createHash('sha256').update(userId).digest().readUInt32BE(0) % bank
}

/** O avatar sorteado número `index` do banco da troca. */
export function bankAvatar(index: number, catalog: AvatarCatalog = AVATAR_CATALOG): AvatarConfig {
  return defaultAvatarConfig(`troca-${index}`, 'boy', catalog)
}

export async function swapAvatars(
  sql: postgres.Sql,
  options: AvatarSwapOptions,
): Promise<AvatarSwapResult> {
  const bank = options.bank ?? AVATAR_SWAP_BANK
  const catalog = options.catalog ?? AVATAR_CATALOG
  const validos = [...inventoryIds(catalog)]

  const gastos = await sql<{ user_id: string; audience: string; coins: number }[]>`
    select user_id, audience::text as audience, (-sum(amount))::int as coins
      from members.coin_events
     where source_type = 'spend_cosmetic' and source_id like 'avatar-buy:%' and amount < 0
     group by user_id, audience
     order by user_id, audience`
  const [{ count: inventario } = { count: 0 }] = await sql<{ count: number }[]>`
    select count(*)::int as count from members.avatar_inventory
     where part_id <> all(${validos})`
  const [{ count: avatares } = { count: 0 }] = await sql<{ count: number }[]>`
    select count(*)::int as count from members.avatar_configs
     where coalesce(equipped->>'version', '') <> '3'`

  const refunds: AvatarSwapResult['refunds'] = []
  if (options.dryRun) {
    for (const g of gastos)
      refunds.push({ userId: g.user_id, audience: g.audience, coins: g.coins })
    return { dryRun: true, refunds, inventoryRemoved: inventario, avatarsSwapped: avatares }
  }

  for (const g of gastos) {
    if (g.coins <= 0) continue
    const devolvida = await sql.begin(async (tx) => {
      const [ja] = await tx`
        select 1 from members.coin_events
         where user_id = ${g.user_id} and audience = ${g.audience}::members.course_audience
           and source_type = 'admin_adjust' and source_id = ${AVATAR_REFUND_SOURCE_ID}`
      if (ja) return false
      const [perfil] = await tx<{ coin_balance: number }[]>`
        update members.gamification_profiles
           set coin_balance = coin_balance + ${g.coins},
               updated_at = ${options.now.toISOString()}::timestamptz
         where user_id = ${g.user_id} and audience = ${g.audience}::members.course_audience
        returning coin_balance`
      if (!perfil) return false
      await tx`
        insert into members.coin_events
          (id, user_id, audience, source_type, source_id, amount, balance_after, created_at)
        values (gen_random_uuid(), ${g.user_id}, ${g.audience}::members.course_audience,
                'admin_adjust', ${AVATAR_REFUND_SOURCE_ID}, ${g.coins}, ${perfil.coin_balance},
                ${options.now.toISOString()}::timestamptz)`
      return true
    })
    if (devolvida) refunds.push({ userId: g.user_id, audience: g.audience, coins: g.coins })
  }

  const removidos = await sql`
    delete from members.avatar_inventory where part_id <> all(${validos}) returning id`

  const antigos = await sql<{ user_id: string; audience: string }[]>`
    select user_id, audience::text as audience from members.avatar_configs
     where coalesce(equipped->>'version', '') <> '3'`
  for (const linha of antigos) {
    const indice = bankIndexFor(linha.user_id, bank)
    const config = bankAvatar(indice, catalog)
    const foto = options.photos?.get(indice) ?? null
    await sql`
      update members.avatar_configs
         set equipped = ${JSON.stringify(config)}::jsonb, photo_url = ${foto},
             updated_at = ${options.now.toISOString()}::timestamptz
       where user_id = ${linha.user_id} and audience = ${linha.audience}::members.course_audience
         and coalesce(equipped->>'version', '') <> '3'`
  }

  return {
    dryRun: false,
    refunds,
    inventoryRemoved: removidos.length,
    avatarsSwapped: antigos.length,
  }
}
