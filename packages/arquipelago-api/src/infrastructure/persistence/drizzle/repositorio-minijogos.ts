import {
  capaDoMinijogo,
  capaQueCabe,
  MinijogoAbertoSchema,
  ProjetoDoMinijogoSchema,
} from '@sistemazero/arquipelago-contracts'
import { and, desc, eq, lte, sql } from 'drizzle-orm'
import type { RepositorioDosMinijogos } from '../../../domain/minijogos.port'
import type { Database } from './db'
import { desafios, minijogos, perfisDaConta } from './schema'

export class DrizzleRepositorioDosMinijogos implements RepositorioDosMinijogos {
  constructor(private readonly db: Database) {}
  async guardar(e: Parameters<RepositorioDosMinijogos['guardar']>[0]) {
    if (e.jogador.somenteLeitura) return
    // Serializar antes de aguardar o banco congela a entrada, mesmo que o chamador a edite.
    const projeto = JSON.stringify(ProjetoDoMinijogoSchema.parse(e.projeto))
    const capa = capaDoMinijogo(e.projeto)
    await this.db
      .insert(minijogos)
      .values({
        jogadorId: e.jogador.id,
        publico: e.jogador.publico,
        desafioId: e.desafioId,
        titulo: e.titulo,
        projeto,
        capa,
        aprovadoEm: e.agora,
        atualizadoEm: e.agora,
      })
      .onConflictDoUpdate({
        target: [minijogos.jogadorId, minijogos.desafioId],
        set: {
          projeto,
          capa,
          titulo: e.titulo,
          atualizadoEm: e.agora,
          // Mais um envio do mesmo minijogo (A26, os reenvios na medição).
          envios: sql`${minijogos.envios} + 1`,
        },
        setWhere: lte(minijogos.atualizadoEm, e.agora),
      })
  }
  async listar(jogadorId: string) {
    const linhas = await this.db
      .select({
        desafioId: minijogos.desafioId,
        titulo: minijogos.titulo,
        aprovadoEm: minijogos.aprovadoEm,
        atualizadoEm: minijogos.atualizadoEm,
        capa: minijogos.capa,
        // A ilha publicada do desafio (B10): a barraca e o quiosque mostram os da própria ilha.
        ilha: sql<
          string | null
        >`coalesce(${desafios.metadadosPublicados}->>'ilha', ${desafios.ilha})`,
      })
      .from(minijogos)
      .leftJoin(desafios, eq(desafios.id, minijogos.desafioId))
      .where(eq(minijogos.jogadorId, jogadorId))
      .orderBy(desc(minijogos.atualizadoEm), minijogos.desafioId)
    return linhas.map(({ ilha, ...v }) => ({
      ...v,
      ...(ilha ? { ilha } : {}),
      capa: capaQueCabe(v.capa),
      aprovadoEm: v.aprovadoEm.toISOString(),
      atualizadoEm: v.atualizadoEm.toISOString(),
    }))
  }
  async abrir(jogadorId: string, desafioId: string) {
    const [linha] = await this.db
      .select({ minijogo: minijogos, revisao: desafios.revisaoPublicada })
      .from(minijogos)
      .leftJoin(desafios, eq(desafios.id, minijogos.desafioId))
      .where(and(eq(minijogos.jogadorId, jogadorId), eq(minijogos.desafioId, desafioId)))
    if (!linha) return null
    const v = linha.minijogo
    const projeto: unknown = JSON.parse(v.projeto)
    const python =
      projeto !== null &&
      typeof projeto === 'object' &&
      'programmingLanguage' in projeto &&
      projeto.programmingLanguage === 'python'
    return MinijogoAbertoSchema.parse({
      desafioId: v.desafioId,
      titulo: v.titulo,
      projeto,
      aprovadoEm: v.aprovadoEm.toISOString(),
      atualizadoEm: v.atualizadoEm.toISOString(),
      capa: capaQueCabe(v.capa),
      // O minijogo em Python pede o ambiente do desafio com a revisão publicada (lacunas).
      ...(python && linha.revisao ? { revisao: linha.revisao } : {}),
    })
  }
  async pertenceAConta(jogadorId: string, contaId: string) {
    return (
      (
        await this.db
          .select({ id: perfisDaConta.jogadorId })
          .from(perfisDaConta)
          .where(and(eq(perfisDaConta.jogadorId, jogadorId), eq(perfisDaConta.contaId, contaId)))
      ).length > 0
    )
  }
}
