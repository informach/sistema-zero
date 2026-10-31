import type { PermissoesDaFamilia } from '@sistemazero/arquipelago-contracts'
import { and, asc, between, eq, gt, gte, inArray, lte, ne } from 'drizzle-orm'
import type {
  AparenciaAplicada,
  RepositorioDaFamilia,
  TempoNaJanela,
} from '../../../domain/familia.port'
import type { Database } from './db'
import {
  mudancasDeAparencia,
  perfisDaConta,
  permissoesDaFamilia,
  salvamentos,
  sessoesDeTempo,
  tempoDiario,
} from './schema'

export class DrizzleRepositorioDaFamilia implements RepositorioDaFamilia {
  constructor(private readonly db: Database) {}

  async perfisDaConta(contaId: string, perfis: readonly string[]): Promise<string[]> {
    if (perfis.length === 0) return []
    const linhas = await this.db
      .select({ jogadorId: perfisDaConta.jogadorId })
      .from(perfisDaConta)
      .where(and(eq(perfisDaConta.contaId, contaId), inArray(perfisDaConta.jogadorId, [...perfis])))
    return linhas.map((l) => l.jogadorId)
  }

  async outrosPerfisDaConta(contaId: string, menos: string, limite: number): Promise<string[]> {
    const linhas = await this.db
      .select({ jogadorId: perfisDaConta.jogadorId })
      .from(perfisDaConta)
      .where(and(eq(perfisDaConta.contaId, contaId), ne(perfisDaConta.jogadorId, menos)))
      .orderBy(asc(perfisDaConta.criadoEm), asc(perfisDaConta.jogadorId))
      .limit(limite)
    return linhas.map((l) => l.jogadorId)
  }

  async tempoNaJanela(
    perfis: readonly string[],
    inicio: string,
    fim: string,
  ): Promise<Map<string, TempoNaJanela>> {
    const tempos = new Map<string, TempoNaJanela>()
    if (perfis.length === 0) return tempos
    const linhas = await this.db
      .select({ jogadorId: tempoDiario.jogadorId, segundos: tempoDiario.segundos })
      .from(tempoDiario)
      .where(
        and(
          inArray(tempoDiario.jogadorId, [...perfis]),
          between(tempoDiario.dia, inicio, fim),
          gt(tempoDiario.segundos, 0),
        ),
      )
    for (const l of linhas) {
      const atual = tempos.get(l.jogadorId) ?? { segundos: 0, dias: 0 }
      tempos.set(l.jogadorId, { segundos: atual.segundos + l.segundos, dias: atual.dias + 1 })
    }
    return tempos
  }

  async sessoesNaJanela(
    perfis: readonly string[],
    de: Date,
    ate: Date,
  ): Promise<Map<string, Date[]>> {
    const fins = new Map<string, Date[]>()
    if (perfis.length === 0) return fins
    const linhas = await this.db
      .select({ jogadorId: sessoesDeTempo.jogadorId, fim: sessoesDeTempo.cursor })
      .from(sessoesDeTempo)
      .where(
        and(
          inArray(sessoesDeTempo.jogadorId, [...perfis]),
          between(sessoesDeTempo.cursor, de, ate),
          // Sessão que só abriu e não contou tempo não é "jogar".
          gt(sessoesDeTempo.cursor, sessoesDeTempo.criadoEm),
        ),
      )
    for (const l of linhas) fins.set(l.jogadorId, [...(fins.get(l.jogadorId) ?? []), l.fim])
    return fins
  }

  async aparenciasNaJanela(
    perfis: readonly string[],
    de: Date,
    ate: Date,
  ): Promise<Map<string, AparenciaAplicada[]>> {
    const mapa = new Map<string, AparenciaAplicada[]>()
    if (perfis.length === 0) return mapa
    // O índice (jogador_id, registrado_em) da 0024 atende esta leitura.
    const linhas = await this.db
      .select({
        jogadorId: mudancasDeAparencia.jogadorId,
        objeto: mudancasDeAparencia.objeto,
        revisao: mudancasDeAparencia.revisao,
        origem: mudancasDeAparencia.origem,
        criacao: mudancasDeAparencia.criacao,
        registradoEm: mudancasDeAparencia.registradoEm,
      })
      .from(mudancasDeAparencia)
      .where(
        and(
          inArray(mudancasDeAparencia.jogadorId, [...perfis]),
          gte(mudancasDeAparencia.registradoEm, de),
          lte(mudancasDeAparencia.registradoEm, ate),
        ),
      )
    for (const { jogadorId, ...linha } of linhas) {
      const lista = mapa.get(jogadorId) ?? []
      lista.push(linha)
      mapa.set(jogadorId, lista)
    }
    return mapa
  }

  async salvamentos(perfis: readonly string[]): Promise<Map<string, unknown>> {
    if (perfis.length === 0) return new Map()
    const linhas = await this.db
      .select({ jogadorId: salvamentos.jogadorId, dados: salvamentos.dados })
      .from(salvamentos)
      .where(inArray(salvamentos.jogadorId, [...perfis]))
    return new Map(linhas.map((l) => [l.jogadorId, l.dados]))
  }

  async lerPermissoes(contaId: string): Promise<PermissoesDaFamilia | null> {
    const [linha] = await this.db
      .select({
        visitasDeIrmaos: permissoesDaFamilia.visitasDeIrmaos,
        visitasDeOutrasCriancas: permissoesDaFamilia.visitasDeOutrasCriancas,
        fotosNoClube: permissoesDaFamilia.fotosNoClube,
      })
      .from(permissoesDaFamilia)
      .where(eq(permissoesDaFamilia.contaId, contaId))
    return linha ?? null
  }

  async gravarPermissoes(
    contaId: string,
    p: PermissoesDaFamilia,
    agora: Date,
  ): Promise<PermissoesDaFamilia> {
    const valores = {
      visitasDeIrmaos: p.visitasDeIrmaos,
      visitasDeOutrasCriancas: p.visitasDeOutrasCriancas,
      fotosNoClube: p.fotosNoClube,
    }
    const [linha] = await this.db
      .insert(permissoesDaFamilia)
      .values({ contaId, ...valores, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: permissoesDaFamilia.contaId,
        set: { ...valores, atualizadoEm: agora },
      })
      .returning({
        visitasDeIrmaos: permissoesDaFamilia.visitasDeIrmaos,
        visitasDeOutrasCriancas: permissoesDaFamilia.visitasDeOutrasCriancas,
        fotosNoClube: permissoesDaFamilia.fotosNoClube,
      })
    return linha ?? valores
  }
}
