import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { SequenciaDeTempoInvalidaError } from '../../src/domain/tempo-erros'
import { RepositorioDeSessoesDeTempo } from '../../src/infrastructure/persistence/drizzle/repositorio-sessoes-tempo'

const url = process.env.TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.pathname !== '/arquipelago_test'
  )
    throw new Error('Use somente o banco local descartável arquipelago_test')
}

describe.skipIf(!url)('sessões de tempo no Postgres', () => {
  let conexao: DbConnection
  let repo: RepositorioDeSessoesDeTempo
  let jogadorId: string
  let contaId: string
  let sessaoId: string
  const inicio = new Date('2026-10-27T12:00:00.000Z')

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    repo = new RepositorioDeSessoesDeTempo(conexao.db)
  })
  afterAll(async () => conexao?.close())
  beforeEach(() => {
    jogadorId = randomUUID()
    contaId = randomUUID()
    sessaoId = randomUUID()
  })

  function pedido(acao: 'iniciar' | 'pulsar' | 'pausar', sequencia: number, ms: number) {
    return { jogadorId, contaId, sessaoId, acao, sequencia, agora: new Date(inicio.getTime() + ms) }
  }

  test('pulsos simultâneos e pausa repetida não contam o tempo duas vezes', async () => {
    expect((await repo.executar(pedido('iniciar', 0, 0))).situacao).toBe('ativa')
    const respostas = await Promise.all([
      repo.executar(pedido('pulsar', 1, 10_000)),
      repo.executar(pedido('pulsar', 1, 10_000)),
    ])
    expect(respostas.map((r) => r.usadoHojeSegundos)).toEqual([10, 10])
    expect(await repo.executar(pedido('pausar', 2, 15_000))).toMatchObject({
      situacao: 'encerrada',
      usadoHojeSegundos: 15,
    })
    expect(await repo.executar(pedido('pausar', 2, 16_000))).toMatchObject({
      situacao: 'encerrada',
      usadoHojeSegundos: 15,
    })
  })

  test('a segunda aba substitui a primeira sem duplicar o intervalo', async () => {
    await repo.executar(pedido('iniciar', 0, 0))
    const nova = { ...pedido('iniciar', 0, 10_000), sessaoId: randomUUID() }
    expect(await repo.executar(nova)).toMatchObject({ situacao: 'ativa', usadoHojeSegundos: 10 })
    expect(await repo.executar(pedido('pulsar', 1, 11_000))).toMatchObject({
      situacao: 'substituida',
      usadoHojeSegundos: 10,
    })
    expect(
      await repo.executar({
        ...nova,
        acao: 'pulsar',
        sequencia: 1,
        agora: new Date(inicio.getTime() + 20_000),
      }),
    ).toMatchObject({
      situacao: 'ativa',
      usadoHojeSegundos: 20,
    })
  })

  test('duas abas que começam ao mesmo tempo deixam apenas uma sessão ativa', async () => {
    const outra = { ...pedido('iniciar', 0, 0), sessaoId: randomUUID() }
    await Promise.all([repo.executar(pedido('iniciar', 0, 0)), repo.executar(outra)])
    const respostas = await Promise.all([
      repo.executar(pedido('pulsar', 1, 10_000)),
      repo.executar({
        ...outra,
        acao: 'pulsar',
        sequencia: 1,
        agora: new Date(inicio.getTime() + 10_000),
      }),
    ])
    expect(respostas.map((r) => r.situacao).sort()).toEqual(['ativa', 'substituida'])
    expect(Math.max(...respostas.map((r) => r.usadoHojeSegundos))).toBe(10)
  })

  test('a virada do dia é persistida separadamente sem usar o relógio do aparelho', async () => {
    const pertoDaVirada = new Date('2026-10-28T02:59:55.000Z')
    const iniciar = { ...pedido('iniciar', 0, 0), agora: pertoDaVirada }
    await repo.executar(iniciar)
    expect(
      await repo.executar({
        ...iniciar,
        acao: 'pulsar',
        sequencia: 1,
        agora: new Date(pertoDaVirada.getTime() + 10_000),
      }),
    ).toMatchObject({
      situacao: 'ativa',
      usadoHojeSegundos: 5,
    })
    const linhas =
      await conexao.sql`select dia::text, segundos from arquipelago.tempo_diario where jogador_id = ${jogadorId} order by dia`
    expect(Array.from(linhas)).toEqual([
      { dia: '2026-10-27', segundos: 5 },
      { dia: '2026-10-28', segundos: 5 },
    ])
  })

  test('uma resposta repetida não renova a concessão e a expiração limita a cobrança', async () => {
    await repo.executar(pedido('iniciar', 0, 0))
    await repo.executar(pedido('pulsar', 1, 10_000))
    expect(await repo.executar(pedido('pulsar', 1, 35_000))).toMatchObject({
      situacao: 'expirada',
      usadoHojeSegundos: 30,
    })
    expect(await repo.executar(pedido('pulsar', 1, 40_000))).toMatchObject({
      situacao: 'expirada',
      usadoHojeSegundos: 30,
    })
  })

  test('retomar após abandono contabiliza a concessão antiga antes de iniciar outra', async () => {
    await repo.executar(pedido('iniciar', 0, 0))
    const nova = { ...pedido('iniciar', 0, 60_000), sessaoId: randomUUID() }
    expect(await repo.executar(nova)).toMatchObject({
      situacao: 'ativa',
      usadoHojeSegundos: 20,
    })
    expect(await repo.executar(pedido('pulsar', 1, 61_000))).toMatchObject({
      situacao: 'substituida',
      usadoHojeSegundos: 20,
    })
  })

  test('repetir o início perdido não cria outra sessão nem renova a concessão', async () => {
    const primeiro = await repo.executar(pedido('iniciar', 0, 0))
    const repetido = await repo.executar(pedido('iniciar', 0, 10_000))
    expect(repetido.vencimento).toEqual(primeiro.vencimento)
    expect(repetido.usadoHojeSegundos).toBe(0)
    expect(await repo.executar(pedido('pulsar', 1, 15_000))).toMatchObject({
      situacao: 'ativa',
      usadoHojeSegundos: 15,
    })
  })

  test('recusa sequências puladas ou reaproveitadas para outra ação', async () => {
    await repo.executar(pedido('iniciar', 0, 0))
    await expect(repo.executar(pedido('pulsar', 2, 10_000))).rejects.toBeInstanceOf(
      SequenciaDeTempoInvalidaError,
    )
    await repo.executar(pedido('pulsar', 1, 10_000))
    await expect(repo.executar(pedido('pausar', 1, 11_000))).rejects.toBeInstanceOf(
      SequenciaDeTempoInvalidaError,
    )
    await expect(repo.executar(pedido('pulsar', 2_147_483_648, 11_000))).rejects.toBeInstanceOf(
      SequenciaDeTempoInvalidaError,
    )
  })

  test('o limite atualizado pelo responsável é aplicado no pulso seguinte', async () => {
    await conexao.sql`insert into arquipelago.limites_da_familia (conta_id,minutos,atualizado_em) values (${contaId}, 10, ${inicio.toISOString()})`
    await conexao.sql`insert into arquipelago.tempo_diario (jogador_id,dia,segundos,atualizado_em) values (${jogadorId}, '2026-10-27', 590, ${inicio.toISOString()})`
    await repo.executar(pedido('iniciar', 0, 0))
    expect(await repo.executar(pedido('pulsar', 1, 10_000))).toMatchObject({
      situacao: 'limite',
      usadoHojeSegundos: 600,
      limiteDiarioMinutos: 10,
    })
    expect(await repo.executar(pedido('pulsar', 1, 11_000))).toMatchObject({
      situacao: 'limite',
      usadoHojeSegundos: 600,
    })
  })

  test('repetir uma resposta perdida respeita um limite reduzido pelos pais', async () => {
    await conexao.sql`insert into arquipelago.limites_da_familia (conta_id,minutos,atualizado_em) values (${contaId}, 15, ${inicio.toISOString()})`
    await conexao.sql`insert into arquipelago.tempo_diario (jogador_id,dia,segundos,atualizado_em) values (${jogadorId}, '2026-10-27', 600, ${inicio.toISOString()})`
    await repo.executar(pedido('iniciar', 0, 0))
    await repo.executar(pedido('pulsar', 1, 1_000))
    await conexao.sql`update arquipelago.limites_da_familia set minutos = 10 where conta_id = ${contaId}`
    expect(await repo.executar(pedido('pulsar', 1, 2_000))).toMatchObject({
      situacao: 'limite',
      usadoHojeSegundos: 602,
      limiteDiarioMinutos: 10,
    })
  })
})
