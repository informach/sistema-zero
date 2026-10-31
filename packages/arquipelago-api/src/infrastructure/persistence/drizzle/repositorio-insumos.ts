import {
  CompraDeInsumosSchema,
  prepararEntregaDeInsumos,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { and, eq } from 'drizzle-orm'
import {
  type CompraDeInsumosGuardada,
  CompraDesatualizadaError,
  CompraIncompativelError,
  CompraPendenteError,
  CompraSemEspacoError,
  type DonoDaCompra,
  type RepositorioDosInsumos,
} from '../../../domain/insumos.port'
import type { Database } from './db'
import { comprasDeInsumos as compras, perfisDaConta, salvamentos } from './schema'

type Linha = typeof compras.$inferSelect
function lerCompra(r: Linha, dono: DonoDaCompra): CompraDeInsumosGuardada {
  if (r.jogadorId !== dono.jogadorId || r.contaId !== dono.contaId || r.publico !== dono.publico)
    throw new CompraIncompativelError()
  return {
    dono,
    pedido: CompraDeInsumosSchema.parse({
      versao: r.versao,
      chave: r.chave,
      revisaoBase: r.revisaoBase,
      item: r.item,
      quantidade: r.quantidade,
    }),
    moedas: r.moedas,
    situacao: r.situacao,
    saldo: r.saldo,
  }
}

/** Todos os escritores econômicos e o PUT travam a mesma linha de salvamento primeiro. */
export class DrizzleRepositorioDosInsumos implements RepositorioDosInsumos {
  constructor(private readonly db: Database) {}

  async pendente(dono: DonoDaCompra) {
    const [r] = await this.db
      .select()
      .from(compras)
      .where(and(eq(compras.jogadorId, dono.jogadorId), eq(compras.situacao, 'pendente')))
    return r ? lerCompra(r, dono) : null
  }

  async reservar(
    dono: DonoDaCompra,
    bruto: Parameters<RepositorioDosInsumos['reservar']>[1],
    agora: Date,
  ) {
    const pedido = CompraDeInsumosSchema.parse(bruto)
    return this.db.transaction(async (tx) => {
      const [save] = await tx
        .select()
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
        .for('update')
      if (!save) throw new CompraDesatualizadaError(null)
      if (save.publico !== dono.publico) throw new CompraIncompativelError()
      const [perfil] = await tx
        .select()
        .from(perfisDaConta)
        .where(eq(perfisDaConta.jogadorId, dono.jogadorId))
      if (perfil && perfil.contaId !== dono.contaId) throw new CompraIncompativelError()
      const [anterior] = await tx.select().from(compras).where(eq(compras.chave, pedido.chave))
      if (anterior) {
        const r = lerCompra(anterior, dono)
        if (
          r.pedido.item !== pedido.item ||
          r.pedido.quantidade !== pedido.quantidade ||
          r.pedido.revisaoBase !== pedido.revisaoBase
        )
          throw new CompraIncompativelError()
        return r
      }
      const [pendente] = await tx
        .select({ chave: compras.chave })
        .from(compras)
        .where(and(eq(compras.jogadorId, dono.jogadorId), eq(compras.situacao, 'pendente')))
      if (pendente) throw new CompraPendenteError()
      if (save.revisao !== pedido.revisaoBase) throw new CompraDesatualizadaError(save)
      const entrega = prepararEntregaDeInsumos(SalvamentoSchema.parse(save.dados), pedido)
      if (!entrega.ok) throw new CompraSemEspacoError(entrega.motivo)
      const [r] = await tx
        .insert(compras)
        .values({
          ...dono,
          ...pedido,
          moedas: entrega.moedas,
          situacao: 'pendente',
          criadaEm: agora,
        })
        .onConflictDoNothing({ target: compras.chave })
        .returning()
      // Pode haver a mesma chave em outro perfil. Não entregar nem revelar a compra alheia.
      if (!r) throw new CompraIncompativelError()
      return lerCompra(r, dono)
    })
  }

  async concluir(
    dono: DonoDaCompra,
    chave: string,
    debitar: Parameters<RepositorioDosInsumos['concluir']>[2],
    agora: Date,
  ): ReturnType<RepositorioDosInsumos['concluir']> {
    return this.db.transaction(async (tx) => {
      const [save] = await tx
        .select()
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
        .for('update')
      const [linha] = await tx.select().from(compras).where(eq(compras.chave, chave))
      if (!linha || !save || save.publico !== dono.publico) throw new CompraIncompativelError()
      const compra = lerCompra(linha, dono)
      if (compra.situacao !== 'pendente') return { compra, guardado: save }
      if (save.revisao !== compra.pedido.revisaoBase) throw new CompraDesatualizadaError(save, true)
      const entrega = prepararEntregaDeInsumos(SalvamentoSchema.parse(save.dados), compra.pedido)
      if (!entrega.ok) throw new CompraSemEspacoError(entrega.motivo, true)
      if (entrega.moedas !== compra.moedas) throw new CompraIncompativelError()
      // A porta de produção tem prazo de 5 s. Se falhar, a transação desfaz, mas a reserva
      // anterior continua bloqueando PUT. Retomar usa exatamente a mesma chave e o mesmo preço.
      const resposta = await debitar(compra)
      const situacao =
        resposta.situacao === 'debitado'
          ? 'entregue'
          : resposta.situacao === 'saldo-insuficiente'
            ? 'saldo-insuficiente'
            : 'recusada'
      const saldo = resposta.situacao === 'debitado' ? resposta.saldo : null
      let guardado = save
      if (situacao === 'entregue') {
        const [novo] = await tx
          .update(salvamentos)
          .set({ dados: entrega.salvamento, revisao: save.revisao + 1, atualizadoEm: agora })
          .where(eq(salvamentos.jogadorId, dono.jogadorId))
          .returning()
        if (!novo) throw new CompraIncompativelError()
        guardado = novo
      }
      await tx
        .update(compras)
        .set({ situacao, saldo, concluidaEm: agora })
        .where(eq(compras.chave, chave))
      return { compra: { ...compra, situacao, saldo }, guardado }
    })
  }
}
