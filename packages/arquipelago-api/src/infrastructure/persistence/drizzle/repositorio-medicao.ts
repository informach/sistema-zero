import type { FiltroDaMedicao } from '@sistemazero/arquipelago-contracts'
import { and, between, gt, sql } from 'drizzle-orm'
import type {
  AgregadosDaMedicao,
  ContagemDaMedicao,
  RepositorioDaMedicao,
} from '../../../domain/medicao'
import type { Database } from './db'
import {
  desafiosConcluidos,
  diasDeJogo,
  minijogos,
  mudancasDeAparencia,
  salvamentos,
  sessoesDeTempo,
  tempoDiario,
} from './schema'

/** Só agregados saem do banco. Uma fotografia consistente, sem ler tabelas da plataforma. */
export class DrizzleRepositorioDaMedicao implements RepositorioDaMedicao {
  constructor(private readonly db: Database) {}

  async agregar(f: FiltroDaMedicao, hoje: string): Promise<AgregadosDaMedicao> {
    return this.db.transaction(
      async (tx) => {
        // O Kids conta pelo tempo do dia; o adulto, pelos dias de jogo (lacunas, 01/11/2026).
        const coortes =
          f.publico === 'adulto'
            ? await tx.execute<{
                dia: string
                pessoas: number
                seguinte: number
                dia7: number
              }>(sql`
        WITH entradas AS (
          SELECT ${diasDeJogo.jogadorId} AS jogador, min(${diasDeJogo.dia}) AS primeiro
          FROM ${diasDeJogo} WHERE ${diasDeJogo.publico} = 'adulto' AND ${diasDeJogo.dia} < ${hoje}::date
          GROUP BY ${diasDeJogo.jogadorId}
        ), coorte AS (
          SELECT * FROM entradas WHERE primeiro BETWEEN ${f.de}::date AND ${f.ate}::date
        )
        SELECT c.primeiro::text AS dia, count(*)::int AS pessoas,
          count(seguinte.dia)::int AS seguinte,
          count(sete.dia)::int AS dia7
        FROM coorte c
        LEFT JOIN ${diasDeJogo} seguinte ON seguinte.jogador_id = c.jogador AND seguinte.dia = c.primeiro + 1
        LEFT JOIN ${diasDeJogo} sete ON sete.jogador_id = c.jogador AND sete.dia = c.primeiro + 6
        GROUP BY c.primeiro ORDER BY c.primeiro
      `)
            : await tx.execute<{
                dia: string
                pessoas: number
                seguinte: number
                dia7: number
              }>(sql`
        WITH entradas AS (
          SELECT ${tempoDiario.jogadorId} AS jogador, min(${tempoDiario.dia}) AS primeiro
          FROM ${tempoDiario} WHERE ${tempoDiario.segundos} > 0 AND ${tempoDiario.dia} < ${hoje}::date
          GROUP BY ${tempoDiario.jogadorId}
        ), coorte AS (
          SELECT * FROM entradas WHERE primeiro BETWEEN ${f.de}::date AND ${f.ate}::date
        )
        SELECT c.primeiro::text AS dia, count(*)::int AS pessoas,
          count(*) FILTER (WHERE seguinte.segundos > 0)::int AS seguinte,
          count(*) FILTER (WHERE sete.segundos > 0)::int AS dia7
        FROM coorte c
        LEFT JOIN ${tempoDiario} seguinte ON seguinte.jogador_id = c.jogador AND seguinte.dia = c.primeiro + 1
        LEFT JOIN ${tempoDiario} sete ON sete.jogador_id = c.jogador AND sete.dia = c.primeiro + 6
        GROUP BY c.primeiro ORDER BY c.primeiro
      `)
        const origens = await tx.execute<{
          origem: string
          quantidade: number
          pessoas: number
        }>(sql`
        SELECT CASE WHEN projeto.value->'aparencia'->>'origem' IN ('pinta', 'molda')
          THEN 'pinta-molda' ELSE projeto.value->'aparencia'->>'origem' END AS origem, count(*)::int AS quantidade,
          count(DISTINCT ${salvamentos.jogadorId})::int AS pessoas
        FROM ${salvamentos}
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(${salvamentos.dados}->'projetos') = 'object'
          THEN ${salvamentos.dados}->'projetos' ELSE '{}'::jsonb END) projeto
        WHERE ${salvamentos.publico} = ${f.publico}
          AND (projeto.value->>'ganhoEm')::timestamptz >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
          AND (projeto.value->>'ganhoEm')::timestamptz < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        GROUP BY 1
      `)
        const mudancas = await tx.execute<{
          origem: string
          quantidade: number
          pessoas: number
        }>(sql`
          SELECT CASE WHEN ${mudancasDeAparencia.origem} IN ('pinta', 'molda')
            THEN 'pinta-molda' ELSE ${mudancasDeAparencia.origem} END AS origem,
            count(*)::int AS quantidade, count(DISTINCT ${mudancasDeAparencia.jogadorId})::int AS pessoas
          FROM ${mudancasDeAparencia}
          WHERE ${mudancasDeAparencia.publico} = ${f.publico}
            AND ${mudancasDeAparencia.registradoEm} >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND ${mudancasDeAparencia.registradoEm} < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
          GROUP BY 1
        `)
        const mudanca = (nome: string): ContagemDaMedicao => {
          const linha = mudancas.find((r) => r.origem === nome)
          return { quantidade: linha?.quantidade ?? 0, pessoas: linha?.pessoas ?? 0 }
        }
        const aprovados = await tx.execute<{ quantidade: number; pessoas: number }>(sql`
        SELECT count(*)::int AS quantidade, count(DISTINCT ${desafiosConcluidos.jogadorId})::int AS pessoas
        FROM ${desafiosConcluidos}
        WHERE ${desafiosConcluidos.publico} = ${f.publico}
          AND ${desafiosConcluidos.concluidoEm} >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
          AND ${desafiosConcluidos.concluidoEm} < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      `)
        const origem = (nome: string): ContagemDaMedicao => {
          const linha = origens.find((r) => r.origem === nome)
          return { quantidade: linha?.quantidade ?? 0, pessoas: linha?.pessoas ?? 0 }
        }
        const jogos = await tx.execute<{ quantidade: number; pessoas: number }>(sql`
          SELECT count(*)::int AS quantidade, count(DISTINCT ${minijogos.jogadorId})::int AS pessoas
          FROM ${minijogos} WHERE ${minijogos.publico} = ${f.publico}
          AND ${minijogos.aprovadoEm} >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
          AND ${minijogos.aprovadoEm} < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        `)
        const [medidas] = await tx.execute<{
          medidas: number
          pessoasMedidas: number
          primeira: number
          pessoasPrimeira: number
          tentativas: number
          semDica: number
          pessoasSemDica: number
          dicas: number
        }>(sql`
          SELECT count(*) FILTER (WHERE ${desafiosConcluidos.tentativas} IS NOT NULL)::int AS "medidas",
            count(DISTINCT ${desafiosConcluidos.jogadorId}) FILTER (WHERE ${desafiosConcluidos.tentativas} IS NOT NULL)::int AS "pessoasMedidas",
            count(*) FILTER (WHERE ${desafiosConcluidos.tentativas} = 1)::int AS "primeira",
            count(DISTINCT ${desafiosConcluidos.jogadorId}) FILTER (WHERE ${desafiosConcluidos.tentativas} = 1)::int AS "pessoasPrimeira",
            coalesce(sum(${desafiosConcluidos.tentativas}), 0)::int AS "tentativas",
            count(*) FILTER (WHERE ${desafiosConcluidos.dicas} = 0)::int AS "semDica",
            count(DISTINCT ${desafiosConcluidos.jogadorId}) FILTER (WHERE ${desafiosConcluidos.dicas} = 0)::int AS "pessoasSemDica",
            coalesce(sum(${desafiosConcluidos.dicas}), 0)::int AS "dicas"
          FROM ${desafiosConcluidos}
          WHERE ${desafiosConcluidos.publico} = ${f.publico}
            AND ${desafiosConcluidos.concluidoEm} >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND ${desafiosConcluidos.concluidoEm} < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        `)
        const [reenvios] = await tx.execute<{ quantidade: number; pessoas: number }>(sql`
          SELECT coalesce(sum(${minijogos.envios} - 1), 0)::int AS quantidade,
            count(DISTINCT ${minijogos.jogadorId}) FILTER (WHERE ${minijogos.envios} > 1)::int AS pessoas
          FROM ${minijogos} WHERE ${minijogos.publico} = ${f.publico}
          AND ${minijogos.atualizadoEm} >= (${f.de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
          AND ${minijogos.atualizadoEm} < ((${f.ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        `)
        const m = medidas ?? {
          medidas: 0,
          pessoasMedidas: 0,
          primeira: 0,
          pessoasPrimeira: 0,
          tentativas: 0,
          semDica: 0,
          pessoasSemDica: 0,
          dicas: 0,
        }
        return {
          aprendizagem: {
            conclusoesMedidas: { quantidade: m.medidas, pessoas: m.pessoasMedidas },
            acertoNaPrimeira: { quantidade: m.primeira, pessoas: m.pessoasPrimeira },
            tentativas: { quantidade: m.tentativas, pessoas: m.pessoasMedidas },
            semDica: { quantidade: m.semDica, pessoas: m.pessoasSemDica },
            dicas: { quantidade: m.dicas, pessoas: m.pessoasMedidas },
            reenvios: reenvios ?? { quantidade: 0, pessoas: 0 },
          },
          mudancasDeAparencia: {
            pintaMolda: mudanca('pinta-molda'),
            criacaoGuardada: mudanca('criacao'),
            galeria: mudanca('galeria'),
          },
          minijogos: jogos[0] ?? { quantidade: 0, pessoas: 0 },
          coortes: [...coortes],
          pintaMolda: origem('pinta-molda'),
          criacaoGuardada: origem('criacao'),
          galeria: origem('galeria'),
          desafiosAprovados: aprovados[0] ?? { quantidade: 0, pessoas: 0 },
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }

  /** Os salvamentos do público com alguma rotina montada (A26): o documento, sem mais nada. */
  async salvamentosComRotina(publico: FiltroDaMedicao['publico']) {
    return this.db
      .select({ jogadorId: salvamentos.jogadorId, dados: salvamentos.dados })
      .from(salvamentos)
      .where(
        and(
          sql`${salvamentos.publico} = ${publico}`,
          sql`jsonb_typeof(${salvamentos.dados}->'rotinas') = 'object'`,
          sql`${salvamentos.dados}->'rotinas' <> '{}'::jsonb`,
        ),
      )
  }

  /** O mesmo recorte do cartão dos pais: sessão que só abriu e não contou tempo não é jogar. */
  /**
   * O adulto não tem sessões: o fim de cada dia de jogo (a última vez que abriu ou gravou o jogo)
   * faz o papel do fim da sessão na volta ao curso em 24 horas (lacunas, 01/11/2026).
   */
  async finsDosDiasDeJogo(de: Date, ate: Date): Promise<Map<string, Date[]>> {
    const linhas = await this.db
      .select({ jogadorId: diasDeJogo.jogadorId, fim: diasDeJogo.ultimoEm })
      .from(diasDeJogo)
      .where(and(sql`${diasDeJogo.publico} = 'adulto'`, between(diasDeJogo.ultimoEm, de, ate)))
    const fins = new Map<string, Date[]>()
    for (const l of linhas) fins.set(l.jogadorId, [...(fins.get(l.jogadorId) ?? []), l.fim])
    return fins
  }

  async finsDeSessao(de: Date, ate: Date): Promise<Map<string, Date[]>> {
    const linhas = await this.db
      .select({ jogadorId: sessoesDeTempo.jogadorId, fim: sessoesDeTempo.cursor })
      .from(sessoesDeTempo)
      .where(
        and(
          between(sessoesDeTempo.cursor, de, ate),
          gt(sessoesDeTempo.cursor, sessoesDeTempo.criadoEm),
        ),
      )
    const fins = new Map<string, Date[]>()
    for (const l of linhas) fins.set(l.jogadorId, [...(fins.get(l.jogadorId) ?? []), l.fim])
    return fins
  }
}
