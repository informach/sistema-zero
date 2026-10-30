import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'
import { and, eq, sql } from 'drizzle-orm'
import { CompraPendenteError } from '../../../domain/insumos.port'
import type {
  RepositorioDoJogo,
  ResultadoDaGravacao,
  SalvamentoNoBanco,
} from '../../../domain/repositorio.port'
import { EventoTempoConflitanteError } from '../../../domain/tempo-erros'
import type { Database } from './db'
import {
  comprasDeInsumos,
  eventosTempo,
  limitesDaFamilia,
  perfisDaConta,
  salvamentos,
  tempoDiario,
} from './schema'

const TETO_DO_DIA = 86_400

export class DrizzleRepositorioDoJogo implements RepositorioDoJogo {
  constructor(private readonly db: Database) {}

  async lerSalvamento(jogadorId: string): Promise<SalvamentoNoBanco | null> {
    const [linha] = await this.db
      .select({
        revisao: salvamentos.revisao,
        dados: salvamentos.dados,
        atualizadoEm: salvamentos.atualizadoEm,
      })
      .from(salvamentos)
      .where(eq(salvamentos.jogadorId, jogadorId))
    return linha ?? null
  }

  async gravarSalvamento(e: Parameters<RepositorioDoJogo['gravarSalvamento']>[0]) {
    return this.db.transaction(async (tx) => {
      const colunas = {
        revisao: salvamentos.revisao,
        dados: salvamentos.dados,
        atualizadoEm: salvamentos.atualizadoEm,
      }
      // O comando de compra usa a mesma linha: um PUT não apaga a entrega nem muda a
      // base enquanto a carteira ainda pode ter um débito sem resposta.
      await tx
        .select({ id: salvamentos.jogadorId })
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, e.jogadorId))
        .for('update')
      const [pendente] = await tx
        .select({ chave: comprasDeInsumos.chave })
        .from(comprasDeInsumos)
        .where(
          and(
            eq(comprasDeInsumos.jogadorId, e.jogadorId),
            eq(comprasDeInsumos.situacao, 'pendente'),
          ),
        )
      if (pendente) throw new CompraPendenteError()
      const gravadas =
        e.revisaoBase === 0
          ? await tx
              .insert(salvamentos)
              .values({
                jogadorId: e.jogadorId,
                publico: e.publico,
                revisao: 1,
                dados: e.salvamento,
                criadoEm: e.agora,
                atualizadoEm: e.agora,
              })
              .onConflictDoNothing({ target: salvamentos.jogadorId })
              .returning(colunas)
          : await tx
              .update(salvamentos)
              .set({
                revisao: sql`${salvamentos.revisao} + 1`,
                dados: e.salvamento,
                atualizadoEm: e.agora,
              })
              .where(
                and(eq(salvamentos.jogadorId, e.jogadorId), eq(salvamentos.revisao, e.revisaoBase)),
              )
              .returning(colunas)
      const [guardado] = gravadas
      if (guardado && e.contaId) {
        // Uma criança nunca muda de conta: a primeira gravação vale.
        await tx
          .insert(perfisDaConta)
          .values({ jogadorId: e.jogadorId, contaId: e.contaId, criadoEm: e.agora })
          .onConflictDoNothing({ target: perfisDaConta.jogadorId })
      }
      if (guardado) return { ok: true, guardado } satisfies ResultadoDaGravacao
      return {
        ok: false,
        atual:
          (
            await tx.select(colunas).from(salvamentos).where(eq(salvamentos.jogadorId, e.jogadorId))
          )[0] ?? null,
      } satisfies ResultadoDaGravacao
    })
  }

  async somarTempo(
    jogadorId: string,
    dia: string,
    segundos: number,
    agora: Date,
    eventoId?: string,
  ): Promise<number> {
    return this.db.transaction(async (tx) => {
      // Uma fila antiga pode ter sido criada com o relógio do aparelho adiantado.
      // A data original identifica o evento; uma data futura é contabilizada hoje.
      const diaEfetivo = dia > diaDeSaoPaulo(agora) ? diaDeSaoPaulo(agora) : dia
      if (eventoId) {
        const [evento] = await tx
          .insert(eventosTempo)
          .values({ jogadorId, eventoId, dia, segundos, criadoEm: agora })
          .onConflictDoNothing({ target: [eventosTempo.jogadorId, eventosTempo.eventoId] })
          .returning({ eventoId: eventosTempo.eventoId })
        if (!evento) {
          const [anterior] = await tx
            .select()
            .from(eventosTempo)
            .where(and(eq(eventosTempo.jogadorId, jogadorId), eq(eventosTempo.eventoId, eventoId)))
          if (!anterior || anterior.segundos !== segundos || anterior.dia !== dia)
            throw new EventoTempoConflitanteError()
          const diaAnterior =
            dia > diaDeSaoPaulo(anterior.criadoEm) ? diaDeSaoPaulo(anterior.criadoEm) : dia
          const [atual] = await tx
            .select({ segundos: tempoDiario.segundos })
            .from(tempoDiario)
            .where(and(eq(tempoDiario.jogadorId, jogadorId), eq(tempoDiario.dia, diaAnterior)))
          return atual?.segundos ?? 0
        }
      }
      const [linha] = await tx
        .insert(tempoDiario)
        .values({
          jogadorId,
          dia: diaEfetivo,
          segundos: Math.min(segundos, TETO_DO_DIA),
          atualizadoEm: agora,
        })
        .onConflictDoUpdate({
          target: [tempoDiario.jogadorId, tempoDiario.dia],
          set: {
            segundos: sql`least(${tempoDiario.segundos} + excluded.segundos, ${TETO_DO_DIA})`,
            atualizadoEm: agora,
          },
        })
        .returning({ segundos: tempoDiario.segundos })
      return linha?.segundos ?? 0
    })
  }

  async lerTempo(jogadorId: string, dia: string): Promise<number> {
    const [linha] = await this.db
      .select({ segundos: tempoDiario.segundos })
      .from(tempoDiario)
      .where(and(eq(tempoDiario.jogadorId, jogadorId), eq(tempoDiario.dia, dia)))
    return linha?.segundos ?? 0
  }

  async lerLimite(contaId: string): Promise<number | null> {
    const [linha] = await this.db
      .select({ minutos: limitesDaFamilia.minutos })
      .from(limitesDaFamilia)
      .where(eq(limitesDaFamilia.contaId, contaId))
    return linha?.minutos ?? null
  }

  async gravarLimite(contaId: string, minutos: number, agora: Date): Promise<number> {
    const [linha] = await this.db
      .insert(limitesDaFamilia)
      .values({ contaId, minutos, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: limitesDaFamilia.contaId,
        set: { minutos, atualizadoEm: agora },
      })
      .returning({ minutos: limitesDaFamilia.minutos })
    return linha?.minutos ?? minutos
  }
}
