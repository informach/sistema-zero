import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { type ConferenciaDeBlob, LIMITES_DOS_CENARIOS } from '../../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioInvalidoError,
} from '../../../domain/cenarios/cenarios.errors'
import type { CenariosRepository } from '../../../domain/ports/cenarios-repository.port'
import type { TransacaoDeCenarios as Transacao } from './cenarios-transacao'
import type { Database } from './db'
import {
  cenarioBlobs,
  cenarioCenarios,
  cenarioLotes,
  cenarioMundos,
  cenarioRetratos,
  cenarioRevisoes,
} from './schema'

interface TransacoesDosRetratos {
  comTrava<T>(espacoId: string, tarefa: (tx: Transacao) => Promise<T>): Promise<T>
  confirmarBlobs(
    tx: Transacao,
    espacoId: string,
    conferidos: readonly ConferenciaDeBlob[],
    agora: Date,
  ): Promise<void>
  soltarOrfaos(tx: Transacao, espacoId: string, digests: readonly string[]): Promise<string[]>
}

/** Mesma trava/cota dos documentos; sem fotografar ou reconstituir JSON para anexar uma imagem. */
export class RetratosNoPostgres {
  constructor(
    private readonly db: Database,
    private readonly transacoes: TransacoesDosRetratos,
  ) {}

  async retratos(cenarioId: string, revisoes: readonly number[]): Promise<Map<number, string>> {
    if (!revisoes.length) return new Map()
    const linhas = await this.db
      .select({ revisao: cenarioRetratos.revisao, digest: cenarioRetratos.digest })
      .from(cenarioRetratos)
      .where(
        and(
          eq(cenarioRetratos.cenarioId, cenarioId),
          inArray(cenarioRetratos.revisao, [...revisoes]),
        ),
      )
    return new Map(linhas.map((r) => [r.revisao, r.digest]))
  }

  async definirCapa(
    dados: Parameters<CenariosRepository['definirCapa']>[0],
    agora: Date,
  ): ReturnType<CenariosRepository['definirCapa']> {
    const { cenarioId, revisao, digest } = dados
    if (!Number.isInteger(revisao) || revisao < 0)
      throw new CenarioInvalidoError(['Revisão fora do histórico deste cenário'])
    const [dono] = await this.db
      .select({ espacoId: cenarioMundos.espacoId })
      .from(cenarioCenarios)
      .innerJoin(cenarioMundos, eq(cenarioMundos.id, cenarioCenarios.mundoId))
      .where(eq(cenarioCenarios.id, cenarioId))
      .limit(1)
    if (!dono) return null
    const { espacoId } = dono
    return this.transacoes.comTrava(espacoId, async (tx) => {
      const [cabeca] = await tx
        .select({ revisao: cenarioCenarios.revisao, capa: cenarioCenarios.capa })
        .from(cenarioCenarios)
        .where(eq(cenarioCenarios.id, cenarioId))
        .limit(1)
      if (!cabeca) return null
      const [inicio] = await tx
        .select({ revisao: cenarioRevisoes.revisao })
        .from(cenarioRevisoes)
        .where(eq(cenarioRevisoes.cenarioId, cenarioId))
        .orderBy(asc(cenarioRevisoes.revisao))
        .limit(1)
      if (revisao > cabeca.revisao || revisao < (inicio?.revisao ?? cabeca.revisao))
        throw new CenarioInvalidoError(['Revisão fora do histórico deste cenário'])
      if (revisao !== cabeca.revisao && revisao !== inicio?.revisao) {
        const [passo] = await tx
          .select({ revisao: cenarioLotes.revisao })
          .from(cenarioLotes)
          .where(and(eq(cenarioLotes.cenarioId, cenarioId), eq(cenarioLotes.revisao, revisao)))
          .limit(1)
        if (!passo) throw new CenarioInvalidoError(['Esta revisão não está disponível'])
      }
      const [existente] = await tx
        .select({ digest: cenarioRetratos.digest })
        .from(cenarioRetratos)
        .where(and(eq(cenarioRetratos.cenarioId, cenarioId), eq(cenarioRetratos.revisao, revisao)))
        .limit(1)
      if (existente)
        return { revisao, digest: existente.digest, atual: revisao === cabeca.revisao, apagar: [] }
      if (dados.recurso) {
        const c = dados.recurso.conferido
        if (
          dados.recurso.espacoId !== espacoId ||
          !c ||
          c.digest !== digest ||
          c.bytes < 1 ||
          c.bytes > LIMITES_DOS_CENARIOS.capaBytes ||
          !['image/png', 'image/webp'].includes(c.tipoDoConteudo)
        )
          throw new CenarioArquivoAusenteError([digest])
        await this.transacoes.confirmarBlobs(tx, espacoId, [c], agora)
      }
      const [imagem] = await tx
        .select({ digest: cenarioBlobs.digest })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            eq(cenarioBlobs.digest, digest),
            isNotNull(cenarioBlobs.confirmadoEm),
            inArray(cenarioBlobs.tipo, ['miniatura', 'capa', 'textura']),
            sql`${cenarioBlobs.bytes} <= ${LIMITES_DOS_CENARIOS.capaBytes}`,
          ),
        )
        .limit(1)
      if (!imagem) throw new CenarioArquivoAusenteError([digest])
      await tx
        .insert(cenarioRetratos)
        .values({ cenarioId, revisao, espacoId, digest, autorId: dados.autorId, createdAt: agora })
      const atual = revisao === cabeca.revisao
      if (atual)
        await tx
          .update(cenarioCenarios)
          .set({ capa: digest, updatedAt: agora })
          .where(and(eq(cenarioCenarios.id, cenarioId), eq(cenarioCenarios.revisao, revisao)))
      const apagar =
        atual && cabeca.capa && cabeca.capa !== digest
          ? await this.transacoes.soltarOrfaos(tx, espacoId, [cabeca.capa])
          : []
      return { revisao, digest, atual, apagar }
    })
  }
}
