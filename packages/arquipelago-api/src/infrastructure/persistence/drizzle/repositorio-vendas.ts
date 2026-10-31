import { randomUUID } from 'node:crypto'
import {
  diaDeSaoPaulo,
  prepararVendaNaFeira,
  SalvamentoSchema,
  VenderNaFeiraSchema,
} from '@sistemazero/arquipelago-contracts'
import { and, asc, eq, ne } from 'drizzle-orm'
import { CompraPendenteError, type DonoDaCompra } from '../../../domain/insumos.port'
import {
  type RepositorioDasVendas,
  type VendaFeita,
  VendaRecusadaError,
} from '../../../domain/vendas.port'
import type { Database } from './db'
import { comprasDeInsumos, perfisDaConta, salvamentos, vendasNaFeira as vendas } from './schema'

type Linha = typeof vendas.$inferSelect
function ler(r: Linha, dono: DonoDaCompra): VendaFeita {
  if (r.jogadorId !== dono.jogadorId || r.contaId !== dono.contaId || r.publico !== dono.publico)
    throw new VendaRecusadaError('incompativel')
  return {
    dono,
    comando: VenderNaFeiraSchema.parse({
      versao: r.versao,
      chave: r.chave,
      revisaoBase: r.revisaoBase,
      dia: r.dia,
      itens: r.itens,
    }),
    pagamentoId: r.pagamentoId,
    pagamento: r.pagamento,
    tetoSemana: r.tetoSemana,
    moedas: r.moedas,
  }
}

const mesmosItens = (a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([id, n]) => b[id] === n)

/** A mesma forma da entrega de pedidos: consumo e venda atômicos sob a trava do save. */
export class DrizzleRepositorioDasVendas implements RepositorioDasVendas {
  constructor(private readonly db: Database) {}
  async vender(
    dono: DonoDaCompra,
    bruto: Parameters<RepositorioDasVendas['vender']>[1],
    agora: Date,
  ) {
    const c = VenderNaFeiraSchema.parse(bruto)
    return this.db.transaction(async (tx) => {
      const [save] = await tx
        .select()
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
        .for('update')
      if (!save || save.publico !== dono.publico) throw new VendaRecusadaError('incompativel')
      const [perfil] = await tx
        .select()
        .from(perfisDaConta)
        .where(eq(perfisDaConta.jogadorId, dono.jogadorId))
      if (!perfil || perfil.contaId !== dono.contaId) throw new VendaRecusadaError('incompativel')
      const [anterior] = await tx.select().from(vendas).where(eq(vendas.chave, c.chave))
      if (anterior) {
        const r = ler(anterior, dono)
        if (
          r.comando.revisaoBase !== c.revisaoBase ||
          r.comando.dia !== c.dia ||
          !mesmosItens(r.comando.itens, c.itens)
        )
          throw new VendaRecusadaError('incompativel')
        return r
      }
      const [repetida] = await tx
        .select({ chave: vendas.chave })
        .from(vendas)
        .where(
          and(
            eq(vendas.jogadorId, dono.jogadorId),
            eq(vendas.publico, dono.publico),
            eq(vendas.dia, c.dia),
          ),
        )
      if (repetida) throw new VendaRecusadaError('repetida')
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
      if (save.revisao !== c.revisaoBase) throw new VendaRecusadaError('revisao')
      if (c.dia !== diaDeSaoPaulo(agora)) throw new VendaRecusadaError('dia')
      const preparado = prepararVendaNaFeira(SalvamentoSchema.parse(save.dados), c.itens)
      if (!preparado.ok)
        throw new VendaRecusadaError(preparado.motivo === 'salvamento-cheio' ? 'espaco' : 'pratos')
      const [linha] = await tx
        .insert(vendas)
        .values({
          ...dono,
          ...c,
          moedas: preparado.moedas,
          pagamentoId: randomUUID(),
          pagamento: 'pendente',
          vendidaEm: agora,
        })
        .onConflictDoNothing({ target: vendas.chave })
        .returning()
      if (!linha) throw new VendaRecusadaError('incompativel')
      await tx
        .update(salvamentos)
        .set({ dados: preparado.salvamento, revisao: save.revisao + 1, atualizadoEm: agora })
        .where(eq(salvamentos.jogadorId, dono.jogadorId))
      return ler(linha, dono)
    })
  }
  async ler(dono: DonoDaCompra, chave: string) {
    const [r] = await this.db
      .select({ venda: vendas, guardado: salvamentos })
      .from(vendas)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, vendas.jogadorId))
      .where(
        and(
          eq(vendas.chave, chave),
          eq(vendas.jogadorId, dono.jogadorId),
          eq(vendas.publico, dono.publico),
        ),
      )
    return r ? { venda: ler(r.venda, dono), guardado: r.guardado } : null
  }
  async pendente(dono: DonoDaCompra) {
    const [r] = await this.db
      .select()
      .from(vendas)
      .where(
        and(
          eq(vendas.jogadorId, dono.jogadorId),
          eq(vendas.publico, dono.publico),
          eq(vendas.pagamento, 'pendente'),
        ),
      )
      .orderBy(asc(vendas.vendidaEm), asc(vendas.chave))
      .limit(1)
    return r ? ler(r, dono) : null
  }
  async confirmarPagamento(
    dono: DonoDaCompra,
    chave: string,
    semana: string,
    creditar: Parameters<RepositorioDasVendas['confirmarPagamento']>[3],
  ) {
    await this.db.transaction(async (tx) => {
      const [linha] = await tx.select().from(vendas).where(eq(vendas.chave, chave)).for('update')
      if (!linha) throw new VendaRecusadaError('incompativel')
      const venda = ler(linha, dono)
      const espera =
        venda.pagamento === 'pendente' ||
        (venda.pagamento === 'teto' && venda.tetoSemana !== null && venda.tetoSemana < semana)
      if (!espera) return
      // Como nos pedidos: só a linha deste crédito fica retida durante o S2S, não o save.
      const pagamento = await creditar(venda)
      await tx
        .update(vendas)
        .set({ pagamento, tetoSemana: pagamento === 'teto' ? semana : null })
        .where(eq(vendas.chave, chave))
    })
  }
  async esperandoOTeto(dono: DonoDaCompra, semana: string, limite: number) {
    const linhas = await this.db
      .select()
      .from(vendas)
      .where(
        and(
          eq(vendas.jogadorId, dono.jogadorId),
          eq(vendas.publico, dono.publico),
          eq(vendas.pagamento, 'teto'),
          ne(vendas.tetoSemana, semana),
        ),
      )
      .orderBy(asc(vendas.vendidaEm), asc(vendas.chave))
      .limit(limite)
    return linhas
      .filter((r) => r.tetoSemana !== null && r.tetoSemana < semana)
      .map((r) => ler(r, dono))
  }
}
