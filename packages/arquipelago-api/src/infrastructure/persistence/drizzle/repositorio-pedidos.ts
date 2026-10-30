import { randomUUID } from 'node:crypto'
import {
  diaDeSaoPaulo,
  EntregarPedidoSchema,
  prepararEntregaDoPedido,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { and, asc, eq } from 'drizzle-orm'
import { CompraPendenteError, type DonoDaCompra } from '../../../domain/insumos.port'
import {
  type PedidoEntregue,
  PedidoRecusadoError,
  type RepositorioDosPedidos,
} from '../../../domain/pedidos.port'
import type { Database } from './db'
import {
  comprasDeInsumos,
  pedidosRemunerados as pedidos,
  perfisDaConta,
  salvamentos,
} from './schema'

type Linha = typeof pedidos.$inferSelect
function ler(r: Linha, dono: DonoDaCompra): PedidoEntregue {
  if (r.jogadorId !== dono.jogadorId || r.contaId !== dono.contaId || r.publico !== dono.publico)
    throw new PedidoRecusadoError('incompativel')
  return {
    dono,
    comando: EntregarPedidoSchema.parse({
      versao: r.versao,
      chave: r.chave,
      revisaoBase: r.revisaoBase,
      morador: r.morador,
      dia: r.dia,
      pedido: r.pedido,
    }),
    pagamentoId: r.pagamentoId,
    pagamento: r.pagamento,
    moedas: r.moedas,
  }
}

export class DrizzleRepositorioDosPedidos implements RepositorioDosPedidos {
  constructor(private readonly db: Database) {}
  async entregar(
    dono: DonoDaCompra,
    bruto: Parameters<RepositorioDosPedidos['entregar']>[1],
    agora: Date,
  ) {
    const c = EntregarPedidoSchema.parse(bruto)
    return this.db.transaction(async (tx) => {
      const [save] = await tx
        .select()
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
        .for('update')
      if (!save || save.publico !== dono.publico) throw new PedidoRecusadoError('incompativel')
      const [perfil] = await tx
        .select()
        .from(perfisDaConta)
        .where(eq(perfisDaConta.jogadorId, dono.jogadorId))
      if (!perfil || perfil.contaId !== dono.contaId) throw new PedidoRecusadoError('incompativel')
      const [anterior] = await tx.select().from(pedidos).where(eq(pedidos.chave, c.chave))
      if (anterior) {
        const r = ler(anterior, dono)
        if (
          r.comando.revisaoBase !== c.revisaoBase ||
          r.comando.morador !== c.morador ||
          r.comando.pedido !== c.pedido ||
          r.comando.dia !== c.dia
        )
          throw new PedidoRecusadoError('incompativel')
        return r
      }
      const [repetido] = await tx
        .select({ chave: pedidos.chave })
        .from(pedidos)
        .where(
          and(
            eq(pedidos.jogadorId, dono.jogadorId),
            eq(pedidos.publico, dono.publico),
            eq(pedidos.morador, c.morador),
            eq(pedidos.dia, c.dia),
          ),
        )
      if (repetido) throw new PedidoRecusadoError('repetido')
      const [compra] = await tx
        .select({ chave: comprasDeInsumos.chave })
        .from(comprasDeInsumos)
        .where(
          and(
            eq(comprasDeInsumos.jogadorId, dono.jogadorId),
            eq(comprasDeInsumos.situacao, 'pendente'),
          ),
        )
      if (compra) throw new CompraPendenteError()
      if (save.revisao !== c.revisaoBase) throw new PedidoRecusadoError('revisao')
      if (c.dia !== diaDeSaoPaulo(agora)) throw new PedidoRecusadoError('dia')
      const s = SalvamentoSchema.parse(save.dados)
      if (s.moradores[c.morador].pedido?.id !== c.pedido) throw new PedidoRecusadoError('pedido')
      const preparado = prepararEntregaDoPedido(s, c.morador, c.dia)
      if (!preparado.ok)
        throw new PedidoRecusadoError(
          preparado.motivo.endsWith('cheio') || preparado.motivo === 'mochila-cheia'
            ? 'espaco'
            : 'pedido',
        )
      const [linha] = await tx
        .insert(pedidos)
        .values({
          ...dono,
          ...c,
          moedas: preparado.moedas,
          pagamentoId: randomUUID(),
          pagamento: 'pendente',
          entregueEm: agora,
        })
        .onConflictDoNothing({ target: pedidos.chave })
        .returning()
      if (!linha) throw new PedidoRecusadoError('incompativel')
      await tx
        .update(salvamentos)
        .set({ dados: preparado.salvamento, revisao: save.revisao + 1, atualizadoEm: agora })
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
      return ler(linha, dono)
    })
  }
  async ler(dono: DonoDaCompra, chave: string) {
    const [r] = await this.db
      .select({ entrega: pedidos, guardado: salvamentos })
      .from(pedidos)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, pedidos.jogadorId))
      .where(
        and(
          eq(pedidos.chave, chave),
          eq(pedidos.jogadorId, dono.jogadorId),
          eq(pedidos.publico, dono.publico),
        ),
      )
    return r ? { entrega: ler(r.entrega, dono), guardado: r.guardado } : null
  }
  async pendente(dono: DonoDaCompra) {
    const [r] = await this.db
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.jogadorId, dono.jogadorId),
          eq(pedidos.publico, dono.publico),
          eq(pedidos.pagamento, 'pendente'),
        ),
      )
      .orderBy(asc(pedidos.entregueEm), asc(pedidos.chave))
      .limit(1)
    return r ? ler(r, dono) : null
  }
  async confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    creditar: Parameters<RepositorioDosPedidos['confirmarPagamento']>[2],
  ) {
    await this.db.transaction(async (tx) => {
      const [linha] = await tx.select().from(pedidos).where(eq(pedidos.chave, chave)).for('update')
      if (!linha) throw new PedidoRecusadoError('incompativel')
      const pedido = ler(linha, dono)
      if (pedido.pagamento !== 'pendente') return
      // Prazo S2S de cinco segundos. Só a linha deste crédito fica retida, não o save.
      // Serializar evita respostas de teto/crédito fora de ordem na virada semanal.
      const pagamento = await creditar(pedido)
      await tx.update(pedidos).set({ pagamento }).where(eq(pedidos.chave, chave))
    })
  }
}
