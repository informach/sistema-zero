/**
 * O repositório Drizzle do Molda Cenários contra Postgres de verdade, com o DDL REAL da
 * migration `0151_cenarios`. O repositório em memória dos outros testes reimplementa estas
 * regras em JS; aqui roda o SQL: cota com reservas vencidas, arquivos sem dono, busca, a troca
 * de revisão sob concorrência e as cascatas.
 *
 * Opt-in: `CENARIOS_TEST_DATABASE_URL` apontando para um banco DESCARTÁVEL cujo nome começa com
 * `cenarios_` (o teste recria o schema `members` dentro dele). Sem a variável, é pulado.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import postgres from 'postgres'
import type {
  CenariosRepository,
  NovoModelo,
} from '../../src/domain/ports/cenarios-repository.port'
import { DrizzleCenariosRepository } from '../../src/infrastructure/persistence/drizzle/cenarios.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

const url = process.env.CENARIOS_TEST_DATABASE_URL
const nomeDoBanco = url ? new URL(url).pathname.slice(1) : ''
if (url && !/^cenarios_[a-z0-9_]+$/.test(nomeDoBanco))
  throw new Error('CENARIOS_TEST_DATABASE_URL precisa apontar para um banco `cenarios_*`')

const digest = (letra: string) => letra.repeat(64)
// Em volta do relógio de verdade: `repo.espaco(id)` conta as reservas que ainda não venceram AGORA.
const AGORA = new Date()
const DEPOIS = new Date(AGORA.getTime() + 3_600_000)
const CONTA = randomUUID()

const modelo = (letra: string, nome: string, extra: Partial<NovoModelo> = {}): NovoModelo => ({
  id: randomUUID(),
  nome,
  pasta: 'natureza',
  etiquetas: ['verde'],
  digest: digest(letra),
  bytes: 1000,
  triangulos: 12,
  min: [-1, 0, -1],
  max: [1, 3, 1],
  miniatura: null,
  ...extra,
})

describe.skipIf(!url)('repositório dos cenários (Postgres)', () => {
  let conn: DbConnection
  // Pela porta, como o serviço o usa.
  let repo: CenariosRepository

  beforeAll(async () => {
    // Cria o banco descartável, se ainda não existe, pelo banco de manutenção do servidor.
    const manutencao = new URL(url as string)
    manutencao.pathname = '/postgres'
    const admin = postgres(manutencao.toString(), { max: 1, onnotice: () => {} })
    try {
      await admin.unsafe(`create database ${nomeDoBanco}`)
    } catch (erro) {
      if ((erro as { code?: string }).code !== '42P04') throw erro
    } finally {
      await admin.end({ timeout: 2 })
    }
    conn = createDbConnection(url as string, { max: 6 })
    await conn.sql.unsafe('drop schema if exists members cascade; create schema members')
    const ddl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0151_cenarios.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of ddl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    repo = new DrizzleCenariosRepository(conn.db)
  })
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    await conn.sql.unsafe('truncate members.cenario_espacos cascade')
  })

  async function comBiblioteca() {
    const espaco = await repo.espacoDaConta(CONTA, 5000, AGORA)
    const biblioteca = await repo.criarBiblioteca(
      {
        id: randomUUID(),
        espacoId: espaco.id,
        nome: 'Aventura',
        licenca: 'restrita',
        criadoPor: CONTA,
      },
      10,
      AGORA,
    )
    return { espaco, biblioteca: biblioteca! }
  }
  async function guardar(espacoId: string, ...letras: string[]) {
    await repo.reservarBlobs(
      espacoId,
      letras.map((l) => ({ digest: digest(l), bytes: 1000, tipo: 'modelo' as const })),
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(espacoId, letras.map(digest), AGORA)
  }

  test('o espaço da conta nasce uma vez só, mesmo com dois pedidos juntos', async () => {
    const [a, b] = await Promise.all([
      repo.espacoDaConta(CONTA, 5000, AGORA),
      repo.espacoDaConta(CONTA, 5000, AGORA),
    ])
    expect(a.id).toBe(b.id)
    expect(a).toMatchObject({ tipo: 'conta', contaId: CONTA, usadoBytes: 0, limiteBytes: 5000 })
    const [equipe, deNovo] = await Promise.all([
      repo.espacoDaEquipe(9000, AGORA),
      repo.espacoDaEquipe(9000, AGORA),
    ])
    expect(equipe.id).toBe(deNovo.id)
    expect(equipe).toMatchObject({ tipo: 'equipe', contaId: null })
  })

  test('a cota conta o confirmado e a reserva que não venceu', async () => {
    const { espaco } = await comBiblioteca()
    const reserva = await repo.reservarBlobs(
      espaco.id,
      [
        { digest: digest('a'), bytes: 2000, tipo: 'modelo' },
        { digest: digest('b'), bytes: 1000, tipo: 'miniatura' },
      ],
      AGORA,
      DEPOIS,
    )
    expect(reserva?.faltam).toHaveLength(2)
    await repo.confirmarBlobs(espaco.id, [digest('a')], AGORA)
    // Reserva de 1000 ainda vale: 2000 confirmados + 1000 reservados + 2500 novos passam de 5000.
    expect(
      await repo.reservarBlobs(
        espaco.id,
        [{ digest: digest('c'), bytes: 2500, tipo: 'modelo' }],
        AGORA,
        DEPOIS,
      ),
    ).toBeNull()
    // Uma hora depois a reserva não confirmada venceu e deixa de pesar.
    const maisTarde = new Date(DEPOIS.getTime() + 1)
    const depois = await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('c'), bytes: 2500, tipo: 'modelo' }],
      maisTarde,
      new Date(maisTarde.getTime() + 3_600_000),
    )
    expect(depois?.faltam).toHaveLength(1)
    // O que já está confirmado não sobe de novo.
    const repetida = await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 2000, tipo: 'modelo' }],
      maisTarde,
      DEPOIS,
    )
    expect(repetida?.faltam).toEqual([])
    expect((await repo.blobsConfirmados(espaco.id, [digest('a'), digest('b')])).size).toBe(1)
  })

  test('duas reservas simultâneas não passam juntas da cota', async () => {
    const { espaco } = await comBiblioteca()
    const resultados = await Promise.all(
      ['a', 'b', 'c'].map((letra) =>
        repo.reservarBlobs(
          espaco.id,
          [{ digest: digest(letra), bytes: 2000, tipo: 'modelo' }],
          AGORA,
          DEPOIS,
        ),
      ),
    )
    expect(resultados.filter(Boolean)).toHaveLength(2)
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(4000)
  })

  test('modelos: sem repetir conteúdo, com teto, busca e páginas', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    await guardar(espaco.id, 'a', 'b', 'c')
    const criados = await repo.criarModelos(
      biblioteca.id,
      [
        modelo('a', 'Árvore grande', { miniatura: digest('m') }),
        modelo('b', 'Pedra', { pasta: 'chão', etiquetas: ['cinza'] }),
        modelo('a', 'Árvore repetida'),
      ],
      10,
      CONTA,
      AGORA,
    )
    expect(criados?.map((m) => m.nome)).toEqual(['Árvore grande', 'Pedra'])
    expect(criados?.[0]).toMatchObject({ min: [-1, 0, -1], max: [1, 3, 1], etiquetas: ['verde'] })
    expect(
      await repo.criarModelos(biblioteca.id, [modelo('a', 'De novo')], 10, CONTA, AGORA),
    ).toEqual([])
    expect(
      await repo.criarModelos(biblioteca.id, [modelo('c', 'Cerca')], 2, CONTA, AGORA),
    ).toBeNull()

    const achar = async (termos: string[], pasta?: string) =>
      (
        await repo.modelos(biblioteca.id, {
          termos,
          inicio: 0,
          limite: 10,
          ...(pasta ? { pasta } : {}),
        })
      ).itens.map((m) => m.nome)
    expect(await achar(['arvore'])).toEqual(['Árvore grande'])
    expect(await achar(['cinza', 'pedra'])).toEqual(['Pedra'])
    expect(await achar([], 'chão')).toEqual(['Pedra'])
    const pagina = await repo.modelos(biblioteca.id, { termos: [], inicio: 1, limite: 1 })
    expect(pagina).toMatchObject({ total: 2 })
    expect(pagina.itens.map((m) => m.nome)).toEqual(['Pedra'])

    const [lida] = await repo.bibliotecas(espaco.id)
    expect(lida).toMatchObject({ modelos: 2, capa: digest('m'), licenca: 'restrita' })
    const editado = await repo.editarModelo(
      criados![1]!.id,
      { nome: 'Rocha', etiquetas: ['dura'] },
      DEPOIS,
    )
    expect(editado).toMatchObject({ nome: 'Rocha', pasta: 'chão' })
    expect(await achar(['dura'])).toEqual(['Rocha'])
    expect(await repo.organizacao(biblioteca.id)).toEqual({
      pastas: ['chão', 'natureza'],
      etiquetas: ['dura', 'verde'],
    })
  })

  test('apagar modelos solta só os arquivos que ninguém mais usa', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    await guardar(espaco.id, 'a', 'b', 'c')
    const outra = await repo.criarBiblioteca(
      { id: randomUUID(), espacoId: espaco.id, nome: 'Cidade', licenca: 'livre', criadoPor: CONTA },
      10,
      AGORA,
    )
    const [arvore, pedra, cerca] = (await repo.criarModelos(
      biblioteca.id,
      [modelo('a', 'Árvore'), modelo('b', 'Pedra'), modelo('c', 'Cerca')],
      10,
      CONTA,
      AGORA,
    ))!
    // A pedra também está em outra biblioteca; a árvore é usada por um cenário.
    await repo.criarModelos(outra!.id, [modelo('b', 'Pedra da cidade')], 10, CONTA, AGORA)
    const mundo = await repo.criarMundo(
      { id: randomUUID(), espacoId: espaco.id, nome: 'Ilha', criadoPor: CONTA },
      10,
      AGORA,
    )
    const cenarioId = randomUUID()
    await repo.criarCenario(
      {
        id: cenarioId,
        mundoId: mundo!.id,
        nome: 'Praia',
        documento: {
          ...criarDocumentoVazio(cenarioId, 'Praia'),
          modelos: [
            { id: 'arvore', biblioteca: biblioteca.id, modelo: arvore!.id, digest: digest('a') },
          ],
        },
        criadoPor: CONTA,
      },
      10,
      AGORA,
    )
    const orfaos = await repo.apagarModelos(
      biblioteca.id,
      [arvore!.id, pedra!.id, cerca!.id],
      DEPOIS,
    )
    expect(orfaos).toEqual([digest('c')])
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(2000)
    // Apagar a outra biblioteca solta a pedra, que era a última a usá-la.
    expect(await repo.apagarBiblioteca(outra!.id, DEPOIS)).toEqual([digest('b')])
  })

  test('mundos: bibliotecas ligadas, contagem e capa do cenário mais recente', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const mundo = (await repo.criarMundo(
      { id: randomUUID(), espacoId: espaco.id, nome: 'Ilha do Farol', criadoPor: CONTA },
      10,
      AGORA,
    ))!
    expect(mundo).toMatchObject({ cenarios: 0, bibliotecas: [], capa: null })
    const editado = await repo.editarMundo(
      mundo.id,
      { nome: 'Ilha', bibliotecas: [biblioteca.id] },
      DEPOIS,
    )
    expect(editado).toMatchObject({ nome: 'Ilha', bibliotecas: [biblioteca.id] })
    const id = randomUUID()
    await repo.criarCenario(
      {
        id,
        mundoId: mundo.id,
        nome: 'Praia',
        documento: criarDocumentoVazio(id, 'Praia'),
        criadoPor: CONTA,
      },
      10,
      AGORA,
    )
    await repo.definirCapa(id, digest('f'), DEPOIS)
    expect((await repo.mundos(espaco.id))[0]).toMatchObject({ cenarios: 1, capa: digest('f') })
    // Apagar a biblioteca a tira do mundo; apagar o mundo leva cenários e lotes.
    await repo.apagarBiblioteca(biblioteca.id, DEPOIS)
    expect((await repo.mundo(mundo.id))!.bibliotecas).toEqual([])
    expect(await repo.apagarMundo(mundo.id)).toBe(true)
    expect(await repo.cenario(id)).toBeNull()
  })

  test('lotes: só troca na revisão esperada, e a operação repetida não grava de novo', async () => {
    const { espaco } = await comBiblioteca()
    const mundo = (await repo.criarMundo(
      { id: randomUUID(), espacoId: espaco.id, nome: 'Ilha', criadoPor: CONTA },
      10,
      AGORA,
    ))!
    const id = randomUUID()
    await repo.criarCenario(
      {
        id,
        mundoId: mundo.id,
        nome: 'Praia',
        documento: criarDocumentoVazio(id, 'Praia'),
        criadoPor: CONTA,
      },
      10,
      AGORA,
    )
    const lote = (operacaoId: string, nome: string, revisaoEsperada = 0) =>
      repo.gravarLote(
        {
          cenarioId: id,
          revisaoEsperada,
          documento: { ...criarDocumentoVazio(id, nome) },
          comandos: [{ tipo: 'cenario.renomear', nome }],
          operacaoId,
          autorId: CONTA,
        },
        DEPOIS,
      )
    // Duas edições sobre a mesma revisão, ao mesmo tempo: uma ganha.
    const corrida = await Promise.all([lote('op-a', 'Um'), lote('op-b', 'Dois')])
    expect(corrida.filter(Boolean)).toHaveLength(1)
    const guardado = (await repo.cenario(id))!
    expect(guardado.revisao).toBe(1)
    expect(['Um', 'Dois']).toContain(guardado.nome)
    expect(guardado.documento.nome).toBe(guardado.nome)

    // Quem ganhou manda de novo (resposta perdida): mesma revisão, sem gravar outra vez.
    const vencedora = corrida[0] ? 'op-a' : 'op-b'
    expect(await lote(vencedora, 'Outra coisa')).toEqual({ revisao: 1, repetido: true })
    expect(await repo.operacaoAplicada(id, vencedora)).toBe(1)
    expect(await repo.operacaoAplicada(id, 'nunca')).toBeNull()
    expect(await lote('op-c', 'Três', 1)).toEqual({ revisao: 2, repetido: false })
    expect((await repo.cenarios(mundo.id))[0]).toMatchObject({ nome: 'Três', revisao: 2 })
  })
})
