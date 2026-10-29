import type { FiltroDaMedicao } from '@sistemazero/arquipelago-contracts'
import { and, between, gt, sql } from 'drizzle-orm'
import type {
  AgregadosDaMedicao,
  ContagemDaMedicao,
  RepositorioDaMedicao,
} from '../../../domain/medicao'
import type { Database } from './db'
import { desafiosConcluidos, salvamentos, sessoesDeTempo, tempoDiario } from './schema'

/** Só agregados saem do banco. Uma fotografia consistente, sem ler tabelas da plataforma. */
export class DrizzleRepositorioDaMedicao implements RepositorioDaMedicao {
  constructor(private readonly db: Database) {}

  async agregar(f: FiltroDaMedicao, hoje: string): Promise<AgregadosDaMedicao> {
    return this.db.transaction(
      async (tx) => {
        const coortes =
          f.publico === 'kids'
            ? await tx.execute<{
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
            : []
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
        return {
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

  /** O mesmo recorte do cartão dos pais: sessão que só abriu e não contou tempo não é jogar. */
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
