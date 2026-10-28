import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import {
  type AnaliseDosMembros,
  ManifestoDeDesafiosSchema,
  POSTOS_DA_JORNADA,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import type { Equipe } from '../../src/domain/jogador'
import type { PortaDosMembros } from '../../src/domain/membros.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDeDesafios } from '../../src/infrastructure/persistence/drizzle/repositorio-de-desafios'
import { membrosDeMentira } from '../fakes/membros'

/**
 * O que só o Postgres real prova no manifesto: o `jsonb` guarda o conteúdo com as chaves em outra
 * ordem, e mesmo assim subir o mesmo arquivo de novo dá tudo igual (sem nova revisão). Banco
 * DESCARTÁVEL `arquipelago_test` num Postgres local (porta 5433, ou `TEST_DATABASE_URL`).
 */
const NOME = 'arquipelago_test'
const BASE = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/postgres'

async function prepararBanco(): Promise<string | null> {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const admin = postgres(BASE, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    try {
      await admin.unsafe(`CREATE DATABASE ${NOME}`)
    } catch (erro) {
      if ((erro as { code?: string }).code !== '42P04') throw erro
    }
    const u = new URL(BASE)
    u.pathname = `/${NOME}`
    return u.toString()
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const url = await prepararBanco()
if (!url) console.warn('[tests/db] Postgres indisponível: testes do manifesto PULADOS.')

const ADMIN = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-28T15:00:00Z')
const analise: AnaliseDosMembros = {
  blocosDoGabarito: [],
  blocosDesconhecidos: [],
  vista: [{ id: 'o1', label: 'Chega', kind: 'game' }],
  problemas: [],
  gabarito: [{ id: 'o1', passou: true }],
  inicial: [{ id: 'o1', passou: false }],
}
// Chaves fora de ordem de propósito, num projeto com aninhamento (o jsonb devolve em outra ordem).
const projeto = {
  zeta: 1,
  files: { 'script.js': 'mover()', 'index.html': '<main></main>', 'style.css': '' },
  alfa: { b: [3, { y: 1, x: 2 }], a: true },
}
const manifesto = ManifestoDeDesafiosSchema.parse({
  formato: 'arquipelago-desafios',
  versao: 1,
  escopo: 'ilha',
  desafios: [
    {
      slug: 'corrida-dos-bichos',
      publico: 'kids',
      ilha: 'bosque',
      tipo: 'quadro-das-cores',
      quadro: 6,
      ordem: 60,
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: 'A corrida dos bichos',
        enunciado: 'Os bichos querem apostar corrida.',
        dicas: ['Comece pela largada.'],
        projetoInicial: projeto,
        gabarito: { ...projeto, zeta: 2 },
        objetivos: [{ id: 'o1', label: 'Chega', rule: { type: 'usesBlock', block: 'x' } }],
        recompensa: { cor: true, moedas: 20, moedasExtra: 0 },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    },
  ],
})
const equipe = { id: ADMIN, podeEscrever: true } as Equipe

describe.skipIf(!url)('manifesto de desafios (Postgres real)', () => {
  let conexao: DbConnection
  let servico: ServicoDaEquipe

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 4 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    const membros = membrosDeMentira({
      analisarObjetivos: (async () => analise) as PortaDosMembros['analisarObjetivos'],
      lerCurriculo: async () => ({ versao: 1, cursos: [], catalogo: [] }),
      lerJornada: async () => ({
        kids: { versao: 1, postos: [...POSTOS_DA_JORNADA] },
        adulto: { versao: 0, configurada: false, etapas: [] },
      }),
    })
    servico = new ServicoDaEquipe(
      new DrizzleRepositorioDeDesafios(conexao.db),
      membros,
      new LeiturasDosMembros(membros),
      new ConferenciaDoMapa(membros, createLogger({ level: 'error' })),
      () => AGORA,
    )
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.desafios cascade`
  })

  test('subir, exportar e subir de novo: tudo igual, sem revisão nova', async () => {
    const c1 = await servico.conferirManifesto(equipe, manifesto)
    expect(c1.contagem).toMatchObject({ criar: 1, publica: 1 })
    const a1 = await servico.aplicarManifesto(equipe, { manifesto, impressao: c1.impressao })
    expect(a1.itens[0]).toMatchObject({ acao: 'criar', publicado: true })

    const c2 = await servico.conferirManifesto(equipe, manifesto)
    expect(c2.itens[0]?.acao).toBe('igual')
    expect(c2.contagem.publica).toBe(0)
    await servico.aplicarManifesto(equipe, { manifesto, impressao: c2.impressao })

    const exportado = await servico.exportarManifesto(equipe, { publico: 'kids', ilha: 'bosque' })
    if (!exportado) throw new Error('nada exportado')
    expect((await servico.conferirManifesto(equipe, exportado)).itens[0]?.acao).toBe('igual')

    const [linha] = await conexao.sql`select revisao, situacao from arquipelago.desafios`
    expect(linha).toMatchObject({ revisao: 1, situacao: 'publicado' })
  })

  test('o quadro muda de dono em fila contra o índice único de verdade', async () => {
    const [base] = manifesto.desafios
    if (!base) throw new Error('sem desafio')
    const com = (desafios: { slug: string; quadro: number }[]) =>
      ManifestoDeDesafiosSchema.parse({
        ...manifesto,
        desafios: desafios.map((d) => ({ ...base, ...d })),
      })
    const subir = async (m: typeof manifesto) => {
      const c = await servico.conferirManifesto(equipe, m)
      return servico.aplicarManifesto(equipe, { manifesto: m, impressao: c.impressao })
    }
    await subir(
      com([
        { slug: 'a', quadro: 1 },
        { slug: 'b', quadro: 2 },
      ]),
    )
    // "a" vem primeiro no arquivo e vai para o 2, que só fica livre depois que "b" grava.
    const a = await subir(
      com([
        { slug: 'a', quadro: 2 },
        { slug: 'b', quadro: 3 },
      ]),
    )
    expect(a.itens.map((i) => [i.slug, i.acao])).toEqual([
      ['a', 'atualizar'],
      ['b', 'atualizar'],
    ])
    const linhas = await conexao.sql`
      select slug, coalesce((metadados_publicados->>'quadro')::int, quadro) as quadro
      from arquipelago.desafios order by 1`
    expect(linhas.map((l) => [l.slug, l.quadro])).toEqual([
      ['a', 2],
      ['b', 3],
    ])
  })
})
