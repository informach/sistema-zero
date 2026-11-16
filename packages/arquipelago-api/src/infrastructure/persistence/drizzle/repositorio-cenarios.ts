import { and, desc, eq, lt } from 'drizzle-orm'
import type { RepositorioDeCenarios, RevisaoDeCenario } from '../../../domain/cenarios.port'
import type { Database } from './db'
import { cenarioProjetos as projetos, cenarioRevisoes as revisoes } from './schema'

const iso = <T extends { criadoEm: string }>(r: T): T => ({
  ...r,
  criadoEm: new Date(r.criadoEm).toISOString(),
})

export class DrizzleRepositorioDeCenarios implements RepositorioDeCenarios {
  constructor(private readonly db: Database) {}
  async listar() {
    const lista = await this.db
      .select()
      .from(projetos)
      .orderBy(desc(projetos.atualizadoEm))
      .limit(200)
    return lista.map((r) => ({ ...r, atualizadoEm: new Date(r.atualizadoEm).toISOString() }))
  }
  async criar(r: RevisaoDeCenario) {
    return this.db.transaction(async (tx) => {
      const inseridos = await tx
        .insert(projetos)
        .values({
          id: r.projetoId,
          nome: r.documento.nome,
          revisao: 0,
          atualizadoEm: r.criadoEm,
          autorId: r.autorId,
        })
        .onConflictDoNothing()
        .returning({ id: projetos.id })
      if (!inseridos.length) return false
      await tx.insert(revisoes).values(r)
      return true
    })
  }
  async ler(id: string, revisao?: number) {
    if (revisao !== undefined) {
      const [r] = await this.db
        .select()
        .from(revisoes)
        .where(and(eq(revisoes.projetoId, id), eq(revisoes.revisao, revisao)))
      return r ? iso(r) : null
    }
    const [r] = await this.db
      .select({ r: revisoes })
      .from(projetos)
      .innerJoin(
        revisoes,
        and(eq(revisoes.projetoId, projetos.id), eq(revisoes.revisao, projetos.revisao)),
      )
      .where(eq(projetos.id, id))
    return r?.r ? iso(r.r) : null
  }
  async historico(id: string, antesDe?: number) {
    const lista = await this.db
      .select({
        projetoId: revisoes.projetoId,
        revisao: revisoes.revisao,
        autorId: revisoes.autorId,
        criadoEm: revisoes.criadoEm,
        operacaoId: revisoes.operacaoId,
        impressao: revisoes.impressao,
      })
      .from(revisoes)
      .where(
        and(
          eq(revisoes.projetoId, id),
          antesDe === undefined ? undefined : lt(revisoes.revisao, antesDe),
        ),
      )
      .orderBy(desc(revisoes.revisao))
      .limit(30)
    return lista.map(iso)
  }
  async operacao(id: string, op: string) {
    const [r] = await this.db
      .select()
      .from(revisoes)
      .where(and(eq(revisoes.projetoId, id), eq(revisoes.operacaoId, op)))
    return r ? iso(r) : null
  }
  async gravar(r: RevisaoDeCenario, revisaoEsperada: number) {
    return this.db.transaction(async (tx) => {
      const alterados = await tx
        .update(projetos)
        .set({
          nome: r.documento.nome,
          revisao: r.revisao,
          atualizadoEm: r.criadoEm,
          autorId: r.autorId,
        })
        .where(and(eq(projetos.id, r.projetoId), eq(projetos.revisao, revisaoEsperada)))
        .returning({ id: projetos.id })
      if (!alterados.length) return false
      await tx.insert(revisoes).values(r)
      return true
    })
  }
  async aplicar(id: string, revisao: number) {
    const alterados = await this.db
      .update(projetos)
      .set({ revisaoAplicada: revisao })
      .where(and(eq(projetos.id, id), eq(projetos.revisao, revisao)))
      .returning({ id: projetos.id })
    return alterados.length === 1
  }
}
