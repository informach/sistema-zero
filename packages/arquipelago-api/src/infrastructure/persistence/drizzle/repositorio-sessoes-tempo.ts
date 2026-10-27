import { diaDeSaoPaulo, LIMITE_DIARIO_PADRAO_MINUTOS } from '@sistemazero/arquipelago-contracts'
import { and, eq, sql } from 'drizzle-orm'
import type {
  PedidoDeSessaoDeTempo,
  RepositorioSessoesTempo,
  ResultadoDeSessaoDeTempo,
  SituacaoDeSessaoDeTempo,
} from '../../../domain/repositorio-sessoes-tempo.port'
import { acertarSessaoDeTempo, iniciarSessaoDeTempo } from '../../../domain/sessao-de-tempo'
import { SequenciaDeTempoInvalidaError } from '../../../domain/tempo-erros'
import type { Database } from './db'
import { controleDeTempo, limitesDaFamilia, sessoesDeTempo, tempoDiario } from './schema'

/** Transações por perfil impedem que abas concorrentes contem o mesmo intervalo. */
export class RepositorioDeSessoesDeTempo implements RepositorioSessoesTempo {
  constructor(private readonly db: Database) {}

  async executar(pedido: PedidoDeSessaoDeTempo): Promise<ResultadoDeSessaoDeTempo> {
    if (
      !Number.isSafeInteger(pedido.sequencia) ||
      pedido.sequencia < 0 ||
      pedido.sequencia > 2_147_483_647 ||
      !Number.isFinite(pedido.agora.getTime()) ||
      (pedido.acao === 'iniciar' && pedido.sequencia !== 0)
    )
      throw new SequenciaDeTempoInvalidaError()

    return this.db.transaction(async (tx) => {
      await tx.insert(controleDeTempo).values({ jogadorId: pedido.jogadorId }).onConflictDoNothing()
      const [controle] = await tx
        .select()
        .from(controleDeTempo)
        .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
        .for('update')
      if (!controle) throw new Error('Controle de tempo indisponível')

      const [preferencia] = await tx
        .select({ minutos: limitesDaFamilia.minutos })
        .from(limitesDaFamilia)
        .where(eq(limitesDaFamilia.contaId, pedido.contaId))
      const limite = preferencia?.minutos ?? LIMITE_DIARIO_PADRAO_MINUTOS
      const hoje = diaDeSaoPaulo(pedido.agora)

      async function resposta(situacao: SituacaoDeSessaoDeTempo, vencimento: Date | null = null) {
        const [linha] = await tx
          .select({ segundos: tempoDiario.segundos })
          .from(tempoDiario)
          .where(and(eq(tempoDiario.jogadorId, pedido.jogadorId), eq(tempoDiario.dia, hoje)))
        return {
          situacao,
          usadoHojeSegundos: linha?.segundos ?? 0,
          limiteDiarioMinutos: limite,
          vencimento,
        } satisfies ResultadoDeSessaoDeTempo
      }

      async function liquidar(
        sessao: typeof sessoesDeTempo.$inferSelect,
        acao: 'pulsar' | 'pausar',
      ) {
        const resultado = acertarSessaoDeTempo(
          { id: sessao.sessaoId, cursor: sessao.cursor, vencimento: sessao.vencimento },
          pedido.agora,
          acao,
        )
        for (const parcela of resultado.parcelas) {
          await tx
            .insert(tempoDiario)
            .values({
              jogadorId: pedido.jogadorId,
              dia: parcela.dia,
              segundos: parcela.segundos,
              atualizadoEm: pedido.agora,
            })
            .onConflictDoUpdate({
              target: [tempoDiario.jogadorId, tempoDiario.dia],
              set: {
                segundos: sql`least(${tempoDiario.segundos} + excluded.segundos, 86400)`,
                atualizadoEm: pedido.agora,
              },
            })
        }
        return resultado
      }

      async function respostaRepetida(sessao: typeof sessoesDeTempo.$inferSelect) {
        const atual = await resposta('ativa', sessao.vencimento)
        if (atual.usadoHojeSegundos < limite * 60) return atual
        await liquidar(sessao, 'pausar')
        await tx
          .update(sessoesDeTempo)
          .set({ estado: 'encerrada', atualizadoEm: pedido.agora })
          .where(
            and(
              eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
              eq(sessoesDeTempo.sessaoId, sessao.sessaoId),
            ),
          )
        await tx
          .update(controleDeTempo)
          .set({ sessaoAtual: null })
          .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
        return resposta('limite')
      }

      const [solicitada] = await tx
        .select()
        .from(sessoesDeTempo)
        .where(
          and(
            eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
            eq(sessoesDeTempo.sessaoId, pedido.sessaoId),
          ),
        )

      if (pedido.acao === 'iniciar') {
        if (solicitada) {
          if (controle.sessaoAtual !== pedido.sessaoId || solicitada.estado !== 'ativa')
            return resposta('substituida')
          if (pedido.agora.getTime() < solicitada.vencimento.getTime())
            return respostaRepetida(solicitada)
          await liquidar(solicitada, 'pausar')
          await tx
            .update(sessoesDeTempo)
            .set({ estado: 'expirada', atualizadoEm: pedido.agora })
            .where(
              and(
                eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
                eq(sessoesDeTempo.sessaoId, pedido.sessaoId),
              ),
            )
          await tx
            .update(controleDeTempo)
            .set({ sessaoAtual: null })
            .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
          return resposta('expirada')
        }

        if (controle.sessaoAtual) {
          const [anterior] = await tx
            .select()
            .from(sessoesDeTempo)
            .where(
              and(
                eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
                eq(sessoesDeTempo.sessaoId, controle.sessaoAtual),
              ),
            )
          if (!anterior || anterior.estado !== 'ativa')
            throw new Error('Sessão ativa inconsistente')
          const acerto = await liquidar(anterior, 'pausar')
          await tx
            .update(sessoesDeTempo)
            .set({
              estado: acerto.situacao === 'expirada' ? 'expirada' : 'encerrada',
              atualizadoEm: pedido.agora,
            })
            .where(
              and(
                eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
                eq(sessoesDeTempo.sessaoId, anterior.sessaoId),
              ),
            )
          await tx
            .update(controleDeTempo)
            .set({ sessaoAtual: null })
            .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
        }

        const atual = await resposta('limite')
        if (atual.usadoHojeSegundos >= limite * 60) return atual
        const nova = iniciarSessaoDeTempo(pedido.sessaoId, pedido.agora)
        await tx.insert(sessoesDeTempo).values({
          jogadorId: pedido.jogadorId,
          sessaoId: nova.id,
          cursor: nova.cursor,
          vencimento: nova.vencimento,
          estado: 'ativa',
          ultimaSequencia: 0,
          ultimaAcao: 'iniciar',
          criadoEm: pedido.agora,
          atualizadoEm: pedido.agora,
        })
        await tx
          .update(controleDeTempo)
          .set({ sessaoAtual: nova.id })
          .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
        return resposta('ativa', nova.vencimento)
      }

      if (
        solicitada &&
        solicitada.estado !== 'ativa' &&
        pedido.sequencia === solicitada.ultimaSequencia &&
        pedido.acao === solicitada.ultimaAcao
      ) {
        const atual = await resposta(solicitada.estado === 'expirada' ? 'expirada' : 'encerrada')
        return atual.usadoHojeSegundos >= limite * 60 ? { ...atual, situacao: 'limite' } : atual
      }
      if (!solicitada || controle.sessaoAtual !== pedido.sessaoId || solicitada.estado !== 'ativa')
        return resposta('substituida')
      if (pedido.sequencia === solicitada.ultimaSequencia && pedido.acao !== solicitada.ultimaAcao)
        throw new SequenciaDeTempoInvalidaError()
      const repetida = pedido.sequencia === solicitada.ultimaSequencia
      if (!repetida && pedido.sequencia !== solicitada.ultimaSequencia + 1)
        throw new SequenciaDeTempoInvalidaError()
      if (repetida && pedido.agora.getTime() < solicitada.vencimento.getTime())
        return respostaRepetida(solicitada)

      const acerto = await liquidar(solicitada, pedido.acao)
      const valor = await resposta(acerto.situacao)
      const atingiuLimite = valor.usadoHojeSegundos >= limite * 60
      const continua = acerto.situacao === 'ativa' && !atingiuLimite
      await tx
        .update(sessoesDeTempo)
        .set({
          estado: continua ? 'ativa' : acerto.situacao === 'expirada' ? 'expirada' : 'encerrada',
          ...(continua && acerto.situacao === 'ativa'
            ? { cursor: acerto.sessao.cursor, vencimento: acerto.sessao.vencimento }
            : {}),
          ultimaSequencia: pedido.sequencia,
          ultimaAcao: pedido.acao,
          atualizadoEm: pedido.agora,
        })
        .where(
          and(
            eq(sessoesDeTempo.jogadorId, pedido.jogadorId),
            eq(sessoesDeTempo.sessaoId, pedido.sessaoId),
          ),
        )
      if (!continua)
        await tx
          .update(controleDeTempo)
          .set({ sessaoAtual: null })
          .where(eq(controleDeTempo.jogadorId, pedido.jogadorId))
      return resposta(
        atingiuLimite ? 'limite' : acerto.situacao,
        continua && acerto.situacao === 'ativa' ? acerto.sessao.vencimento : null,
      )
    })
  }
}
