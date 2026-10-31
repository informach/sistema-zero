import { randomUUID } from 'node:crypto'
import {
  type CompraHistoricaDaGaleria,
  CompraHistoricaDaGaleriaSchema,
  type DonoDaGaleria,
  DonoDaGaleriaSchema,
  GALERIA,
  IDS_DA_GALERIA,
  ITEM_DA_APARENCIA,
  type PedidoDePosseDaGaleria,
  PedidoDePosseDaGaleriaSchema,
  type PosseDaGaleria,
  type ResultadoDaCompraDaGaleria,
} from '@sistemazero/arquipelago-contracts'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './db'
import { spendCoinsInTransaction } from './gamification.repository'
import { lockLearningOwner } from './learning-owner-lock'
import { coinEvents, gamificationProfiles, roomInventory } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Não cria outro inventário: a galeria e o quarto leem room_inventory por perfil e público. */
export class ArquipelagoInventoryRepository {
  constructor(private readonly db: Database) {}

  /** Só a ferramenta operacional usa esta entrada. Não há rota HTTP de adoção. */
  async adotar(raw: CompraHistoricaDaGaleria, gravar = false) {
    const compra = CompraHistoricaDaGaleriaSchema.parse(raw)
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gallery-adoption:${compra.chave}`}, 0))`,
      )
      const origem = `${compra.chave}:${compra.aparencia}`
      // Usa o índice por pessoa do livro; não percorre o histórico inteiro da plataforma.
      const adocoes = await tx
        .select()
        .from(coinEvents)
        .where(
          and(
            eq(coinEvents.userId, compra.jogadorId),
            eq(coinEvents.sourceType, 'arquipelago_gallery_adoption'),
            inArray(
              coinEvents.sourceId,
              IDS_DA_GALERIA.map((id) => `${compra.chave}:${id}`),
            ),
          ),
        )
      const profiles = await tx
        .select()
        .from(gamificationProfiles)
        .where(eq(gamificationProfiles.userId, compra.jogadorId))
      const debitos = await tx
        .select()
        .from(coinEvents)
        .where(
          and(
            eq(coinEvents.userId, compra.jogadorId),
            eq(coinEvents.sourceType, 'arquipelago_debit'),
            eq(coinEvents.sourceId, compra.chave),
          ),
        )
      const impedir = (codigo: string) => ({ situacao: 'impedida' as const, codigo })
      const publico = compra.publico === 'adulto' ? 'adult' : compra.publico
      if (debitos.length > 1) return impedir('DEBITO_AMBIGUO')
      const debito = debitos[0]
      if (debito && (debito.amount !== -compra.moedas || (publico && publico !== debito.audience)))
        return impedir('DEBITO_DIVERGENTE')
      if (!debito && compra.situacao === 'pendente') return { situacao: 'nao-cobrada' as const }
      if (compra.moedas > 0 && !debito) return impedir('DEBITO_AUSENTE')
      if (compra.moedas === 0 && (compra.situacao !== 'paga' || !compra.pagaEm || !publico))
        return impedir('EQUIPE_SEM_COMPROVACAO')
      const audience = debito?.audience ?? publico
      if (!audience) return impedir('PUBLICO_AUSENTE')
      const profile = profiles.find((p) => p.audience === audience)
      if (debito && !profile) return impedir('PERFIL_AUSENTE')
      if (
        adocoes.some(
          (a) => a.userId !== compra.jogadorId || a.audience !== audience || a.sourceId !== origem,
        )
      )
        return impedir('CHAVE_JA_ADOTADA')
      const accountId =
        audience === 'adult' ? compra.jogadorId : (compra.contaId ?? profile?.accountId)
      if (!accountId) return impedir('CONTA_AUSENTE')
      if (profile && profile.accountId !== accountId) return impedir('CONTA_DIVERGENTE')
      if (compra.contaId && compra.contaId !== accountId) return impedir('CONTA_DIVERGENTE')
      const dono = { userId: compra.jogadorId, accountId, audience }
      await lockLearningOwner(tx, dono)
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${dono.userId}`}, 0))`,
      )
      // Relê depois das cercas: exclusão ou mudança concorrente nunca vira uma concessão órfã.
      const atual = await this.perfil(tx, dono)
      if (debito && !atual) return impedir('PERFIL_AUSENTE')
      if (atual && atual.accountId !== accountId) return impedir('CONTA_DIVERGENTE')
      const itemId = ITEM_DA_APARENCIA[compra.aparencia]
      const [owned] = await tx
        .select({ id: roomInventory.id })
        .from(roomInventory)
        .where(
          and(
            eq(roomInventory.userId, dono.userId),
            eq(roomInventory.audience, audience),
            eq(roomInventory.itemId, itemId),
          ),
        )
        .limit(1)
      if (gravar) {
        const agora = new Date()
        if (!atual)
          await tx.insert(gamificationProfiles).values({
            id: randomUUID(),
            userId: dono.userId,
            accountId,
            audience,
            coinBalance: 0,
            lifetimeCoinsEarned: 0,
            createdAt: agora,
            updatedAt: agora,
          })
        await tx
          .insert(roomInventory)
          .values({
            id: randomUUID(),
            userId: dono.userId,
            audience,
            itemId,
            acquiredAt: new Date(compra.pagaEm ?? compra.criadaEm),
          })
          .onConflictDoNothing()
        // Marca a origem sem crédito/débito. O livro e a compra histórica permanecem intactos.
        await tx
          .insert(coinEvents)
          .values({
            id: randomUUID(),
            userId: dono.userId,
            audience,
            sourceType: 'arquipelago_gallery_adoption',
            sourceId: origem,
            amount: 0,
            balanceAfter: atual?.coinBalance ?? 0,
            createdAt: agora,
          })
          .onConflictDoNothing()
      }
      return {
        situacao: owned ? ('ja-possuida' as const) : ('adotavel' as const),
        gravada: gravar,
        audience,
        itemId,
      }
    })
  }

  async ler(raw: DonoDaGaleria): Promise<PosseDaGaleria | null> {
    const dono = DonoDaGaleriaSchema.parse(raw)
    if (dono.audience === 'adult' && dono.userId !== dono.accountId) return null
    return this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, dono)
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${dono.userId}`}, 0))`,
      )
      const profile = await this.perfil(tx, dono)
      if (profile && profile.accountId !== dono.accountId) return null
      return this.posse(tx, dono, profile?.coinBalance ?? 0)
    })
  }

  async comprar(
    raw: PedidoDePosseDaGaleria,
    now = new Date(),
  ): Promise<ResultadoDaCompraDaGaleria> {
    const pedido = PedidoDePosseDaGaleriaSchema.parse(raw)
    if (pedido.audience === 'adult' && pedido.userId !== pedido.accountId)
      return { ok: false, codigo: 'DONO_DIFERENTE' }
    return this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, pedido)
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${pedido.userId}`}, 0))`,
      )
      const profile = await this.perfil(tx, pedido)
      if (profile && profile.accountId !== pedido.accountId)
        return { ok: false, codigo: 'DONO_DIFERENTE' }
      // O vínculo da equipe sem saldo também é guardado, para não perder a autoridade da conta.
      if (!profile && pedido.equipe) {
        await tx
          .insert(gamificationProfiles)
          .values({
            id: randomUUID(),
            userId: pedido.userId,
            accountId: pedido.accountId,
            audience: pedido.audience,
            coinBalance: 0,
            lifetimeCoinsEarned: 0,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
      }
      const itemId = ITEM_DA_APARENCIA[pedido.aparencia]
      const resultado = await spendCoinsInTransaction(tx, {
        userId: pedido.userId,
        audience: pedido.audience,
        amount: pedido.equipe ? 0 : GALERIA[pedido.aparencia].preco,
        reason: 'spend_room',
        idempotencyKey: `room-buy:${pedido.userId}:${itemId}`,
        now,
        grantInventory: { scope: 'room', itemId },
      })
      if (!resultado.ok && resultado.code === 'INSUFFICIENT_BALANCE')
        return { ok: false, codigo: 'SALDO_INSUFICIENTE' }
      return {
        ok: true,
        jaPossuia: !resultado.ok,
        posse: await this.posse(
          tx,
          pedido,
          resultado.ok ? resultado.balanceAfter : resultado.balance,
        ),
      }
    })
  }

  private async perfil(tx: Transaction, dono: DonoDaGaleria) {
    const [profile] = await tx
      .select()
      .from(gamificationProfiles)
      .where(
        and(
          eq(gamificationProfiles.userId, dono.userId),
          eq(gamificationProfiles.audience, dono.audience),
        ),
      )
      .limit(1)
    return profile
  }

  private async posse(
    tx: Transaction,
    dono: DonoDaGaleria,
    saldo: number,
  ): Promise<PosseDaGaleria> {
    const rows = await tx
      .select({ itemId: roomInventory.itemId })
      .from(roomInventory)
      .where(and(eq(roomInventory.userId, dono.userId), eq(roomInventory.audience, dono.audience)))
    const owned = new Set(rows.map((r) => r.itemId))
    return {
      versao: 1,
      possuidas: IDS_DA_GALERIA.filter((id) => owned.has(ITEM_DA_APARENCIA[id])),
      saldo,
    }
  }
}
