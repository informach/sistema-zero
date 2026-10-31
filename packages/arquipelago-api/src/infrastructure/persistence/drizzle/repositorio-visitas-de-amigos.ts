import { and, count, eq, inArray, sql } from 'drizzle-orm'
import type {
  RepositorioDasVisitasDeAmigos,
  ResultadoDoAceite,
} from '../../../domain/visitas-de-amigos.port'
import type { Database } from './db'
import { casasDeAmigos, convitesDeAmigos, salvamentos } from './schema'

/**
 * Visitas de outras crianças (N08a): convites (hash) e casas aceitas por família.
 *
 * O aceite vale para o convite que o originou: apagar ou trocar o código apaga, na mesma
 * transação, as casas aceitas daquela criança (sem isso, um código novo reencontrava os aceites
 * antigos pelo perfil e devolvia o acesso a quem foi revogado). O aceite confere, dentro da
 * transação e travando a linha, que o código ainda é o do convite; e as mudanças de uma família
 * visitante passam por uma trava dela, para a contagem do teto valer com aceites simultâneos.
 */
export class DrizzleRepositorioDasVisitasDeAmigos implements RepositorioDasVisitasDeAmigos {
  constructor(private readonly db: Database) {}

  async convitesAtivos(perfis: readonly string[]) {
    if (perfis.length === 0) return new Set<string>()
    const linhas = await this.db
      .select({ id: convitesDeAmigos.perfilId })
      .from(convitesDeAmigos)
      .where(inArray(convitesDeAmigos.perfilId, [...perfis]))
    return new Set(linhas.map((l) => l.id))
  }

  async gerarConvite(perfilId: string, contaId: string, hash: string, agora: Date) {
    return this.db.transaction(async (tx) => {
      const [s] = await tx
        .select({ id: salvamentos.jogadorId })
        .from(salvamentos)
        .where(and(eq(salvamentos.jogadorId, perfilId), eq(salvamentos.publico, 'kids')))
        .for('update')
      if (!s) return false
      await tx
        .insert(convitesDeAmigos)
        .values({ perfilId, contaId, hash, criadoEm: agora })
        .onConflictDoUpdate({
          target: convitesDeAmigos.perfilId,
          set: { contaId, hash, criadoEm: agora },
        })
      // Código novo é convite novo: quem aceitou o anterior precisa aceitar este.
      await tx.delete(casasDeAmigos).where(eq(casasDeAmigos.perfilAnfitriao, perfilId))
      return true
    })
  }

  async apagarConvite(perfilId: string, contaId: string) {
    await this.db.transaction(async (tx) => {
      const apagados = await tx
        .delete(convitesDeAmigos)
        .where(and(eq(convitesDeAmigos.perfilId, perfilId), eq(convitesDeAmigos.contaId, contaId)))
        .returning({ id: convitesDeAmigos.perfilId })
      if (apagados.length > 0)
        await tx.delete(casasDeAmigos).where(eq(casasDeAmigos.perfilAnfitriao, perfilId))
    })
  }

  async conviteDoCodigo(hash: string) {
    const [r] = await this.db
      .select({ perfilId: convitesDeAmigos.perfilId, contaId: convitesDeAmigos.contaId })
      .from(convitesDeAmigos)
      .where(eq(convitesDeAmigos.hash, hash))
    return r ?? null
  }

  async aceitar(
    contaVisitante: string,
    convite: { perfilId: string; hash: string },
    apelido: string,
    agora: Date,
    maximo: number,
  ) {
    const perfilAnfitriao = convite.perfilId
    return this.db.transaction(async (tx): Promise<ResultadoDoAceite> => {
      // Uma família visitante por vez: dois aceites ao mesmo tempo contam o teto um depois do outro.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`casas-de-amigos:${contaVisitante}`}, 0))`,
      )
      // O código ainda é o do convite (apagar ou trocar no meio do caminho recusa o aceite).
      const [vigente] = await tx
        .select({ id: convitesDeAmigos.perfilId })
        .from(convitesDeAmigos)
        .where(
          and(
            eq(convitesDeAmigos.perfilId, perfilAnfitriao),
            eq(convitesDeAmigos.hash, convite.hash),
          ),
        )
        .for('share')
      if (!vigente) return { situacao: 'sem-convite' }
      const [existente] = await tx
        .select({ id: casasDeAmigos.id })
        .from(casasDeAmigos)
        .where(
          and(
            eq(casasDeAmigos.contaVisitante, contaVisitante),
            eq(casasDeAmigos.perfilAnfitriao, perfilAnfitriao),
          ),
        )
        .for('update')
      if (existente) {
        await tx.update(casasDeAmigos).set({ apelido }).where(eq(casasDeAmigos.id, existente.id))
        return { situacao: 'ok', id: existente.id }
      }
      const [quantas] = await tx
        .select({ n: count() })
        .from(casasDeAmigos)
        .where(eq(casasDeAmigos.contaVisitante, contaVisitante))
      if ((quantas?.n ?? 0) >= maximo) return { situacao: 'limite' }
      const [nova] = await tx
        .insert(casasDeAmigos)
        .values({ contaVisitante, perfilAnfitriao, apelido, criadoEm: agora })
        .returning({ id: casasDeAmigos.id })
      if (!nova) throw new Error('A casa aceita não voltou do banco.')
      return { situacao: 'ok', id: nova.id }
    })
  }

  async remover(contaVisitante: string, id: string) {
    await this.db
      .delete(casasDeAmigos)
      .where(and(eq(casasDeAmigos.id, id), eq(casasDeAmigos.contaVisitante, contaVisitante)))
  }

  async casasDaConta(contaVisitante: string) {
    const linhas = await this.db
      .select({
        id: casasDeAmigos.id,
        apelido: casasDeAmigos.apelido,
        perfilAnfitriao: casasDeAmigos.perfilAnfitriao,
        contaAnfitria: convitesDeAmigos.contaId,
      })
      .from(casasDeAmigos)
      .leftJoin(convitesDeAmigos, eq(convitesDeAmigos.perfilId, casasDeAmigos.perfilAnfitriao))
      .where(eq(casasDeAmigos.contaVisitante, contaVisitante))
      .orderBy(casasDeAmigos.criadoEm)
    return linhas.map((l) => ({ ...l, conviteAtivo: l.contaAnfitria !== null }))
  }
}
