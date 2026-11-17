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
import {
  type BaseDeTerreno,
  type ComandoDeCenario,
  criarDocumentoVazio,
} from '@sistemazero/molda-cenarios-core/v2'
import postgres from 'postgres'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import { CenarioArquivoAusenteError } from '../../src/domain/cenarios/cenarios.errors'
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
    const fonteDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0152_young_nomad.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of fonteDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const capaDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0153_silky_the_hand.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of capaDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const historicoDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0154_cloudy_the_twelve.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of historicoDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const conteudoDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0155_sour_vector.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of conteudoDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const texturasDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0156_hesitant_lorna_dane.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of texturasDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const terrenoDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0157_tiresome_shen.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of terrenoDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    repo = new DrizzleCenariosRepository(conn.db)
  })
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    await conn.sql.unsafe('truncate members.cenario_espacos cascade')
  })

  test('peças do relevo só confirmam junto com o lote válido; conflito e falha desfazem toda a confirmação', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const [espaco] = await servico.espacos(ator)
    const mundo = await servico.criarMundo(ator, espaco!.id, 'Mundo')
    const cenario = await servico.criarCenario(ator, mundo.id, 'Terreno')
    const a = digest('a'),
      b = digest('b')
    const base = (d: string): BaseDeTerreno => ({
      tipo: 'terreno',
      origem: { x: -128, z: 0 },
      passo: 4,
      colunas: 64,
      linhas: 64,
      min: -10,
      max: 40,
      fundo: -10,
      pecas: [{ coluna: 0, linha: 0, digest: d }],
    })
    const prova = (d: string) => ({
      digest: d,
      bytes: 8474,
      tipoDoConteudo: 'application/octet-stream' as const,
      terreno: { min: -10, max: 40 },
    })
    await servico.reservarRecursos(
      ator,
      cenario.id,
      [a, b].map((digest) => ({ digest, bytes: 8474 })),
    )
    const lote = (d: string, revisaoEsperada: number, op: string) => ({
      revisaoEsperada,
      operacaoId: op,
      comandos: [{ tipo: 'base.definir' as const, base: base(d) }],
    })
    const erro = await servico
      .editarCenario(ator, cenario.id, lote(a, 0, 'sem-prova-0001'))
      .catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.cenario(cenario.id))!.revisao).toBe(0)
    expect(
      await servico.editarCenario(ator, cenario.id, lote(a, 0, 'com-prova-0001'), {
        espacoId: espaco!.id,
        conferidos: [prova(a)],
      }),
    ).toEqual({ revisao: 1 })
    expect((await repo.blobsConfirmados(espaco!.id, [a])).size).toBe(1)
    const conflito = await servico
      .editarCenario(ator, cenario.id, lote(b, 0, 'conflito-0001'), {
        espacoId: espaco!.id,
        conferidos: [prova(b)],
      })
      .catch((e: unknown) => e)
    expect(conflito).toBeInstanceOf(Error)
    expect((await repo.blobsConfirmados(espaco!.id, [b])).size).toBe(0)
    const atual = (await repo.cenario(cenario.id))!
    const modeloAusente = {
      id: 'ausente',
      biblioteca: randomUUID(),
      modelo: randomUUID(),
      digest: digest('c'),
    }
    const comandos: ComandoDeCenario[] = [
      ...lote(b, 1, 'x').comandos,
      { tipo: 'modelo.definir', modelo: modeloAusente },
    ]
    const falha = await repo
      .gravarLote(
        {
          cenarioId: cenario.id,
          revisaoEsperada: 1,
          documento: { ...atual.documento, base: base(b), modelos: [modeloAusente] },
          comandos,
          operacaoId: 'rollback-0001',
          autorId: CONTA,
          recursosConferidos: [prova(b)],
        },
        AGORA,
      )
      .catch((e: unknown) => e)
    expect(falha).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.blobsConfirmados(espaco!.id, [b])).size).toBe(0)
    expect((await repo.cenario(cenario.id))!.revisao).toBe(1)
    const intervaloErrado = await servico
      .editarCenario(ator, cenario.id, lote(b, 1, 'intervalo-0001'), {
        espacoId: espaco!.id,
        conferidos: [{ ...prova(b), terreno: { min: -11, max: 40 } }],
      })
      .catch((e: unknown) => e)
    expect(intervaloErrado).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.blobsConfirmados(espaco!.id, [b])).size).toBe(0)
    await servico.editarCenario(ator, cenario.id, lote(b, 1, 'com-prova-0002'), {
      espacoId: espaco!.id,
      conferidos: [prova(b)],
    })
    const reaberto = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const desfeito = await reaberto.moverHistorico(ator, cenario.id, {
      acao: 'desfazer',
      revisaoEsperada: 2,
      operacaoId: 'desfazer-relevo-01',
    })
    expect(desfeito.documento.base).toEqual(base(a))
    expect((await reaberto.documentoNaRevisao(ator, cenario.id, 2)).base).toEqual(base(b))
    const repetido = await reaberto.editarCenario(ator, cenario.id, lote(b, 1, 'com-prova-0002'), {
      espacoId: espaco!.id,
      conferidos: [],
    })
    expect(repetido).toEqual({ revisao: 2 })
    expect((await repo.cenario(cenario.id))!.revisao).toBe(3)
    const outroEspaco = await repo.espacoDaConta(randomUUID(), 50000, AGORA)
    await repo.reservarBlobs(
      outroEspaco.id,
      [{ digest: a, bytes: 8474, tipo: 'terreno', tipoDoConteudo: 'application/octet-stream' }],
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(outroEspaco.id, [prova(a)], AGORA)
    const copia = await servico.duplicarCenario(ator, cenario.id)
    expect((await servico.apagarCenario(ator, cenario.id)).apagar).toEqual([
      `cenarios/${espaco!.id}/blobs/${b}`,
    ])
    expect((await repo.blobsConfirmados(espaco!.id, [a, b])).size).toBe(1)
    expect((await repo.cenario(copia.id))!.documento.base).toEqual(base(a))
    expect((await servico.apagarMundo(ator, mundo.id)).apagar).toEqual([
      `cenarios/${espaco!.id}/blobs/${a}`,
    ])
    expect((await repo.espaco(espaco!.id))!.usadoBytes).toBe(0)
    expect((await repo.blobsConfirmados(outroEspaco.id, [a])).size).toBe(1)
  })

  test('banco recusa cabeçalho incompleto e peça confirmada com formato ou tamanho errado', async () => {
    const espaco = await repo.espacoDaConta(CONTA, 50000, AGORA)
    await repo.reservarBlobs(
      espaco.id,
      [
        {
          digest: digest('a'),
          bytes: 8474,
          tipo: 'terreno',
          tipoDoConteudo: 'application/octet-stream',
        },
      ],
      AGORA,
      DEPOIS,
    )
    const erro =
      await conn.sql`update members.cenario_blobs set confirmado_em = ${AGORA.toISOString()}, terreno = ${JSON.stringify({ min: 0 })}::jsonb where espaco_id = ${espaco.id}`.catch(
        (e: unknown) => e,
      )
    expect((erro as { code: string }).code).toBe('23514')
    const bytes =
      await conn.sql`update members.cenario_blobs set bytes = 1 where espaco_id = ${espaco.id}`.catch(
        (e: unknown) => e,
      )
    expect((bytes as { code: string }).code).toBe('23514')
    const mime =
      await conn.sql`update members.cenario_blobs set tipo_do_conteudo = 'image/png' where espaco_id = ${espaco.id}`.catch(
        (e: unknown) => e,
      )
    expect((mime as { code: string }).code).toBe('23514')
    expect((await repo.blobsConfirmados(espaco.id, [digest('a')])).size).toBe(0)
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

  test('uma fonte por perfil nasce uma vez sob concorrência e não depende do nome', async () => {
    const espaco = await repo.espacoDaConta(CONTA, 5000, AGORA)
    const criar = () =>
      repo.criarBiblioteca(
        {
          id: randomUUID(),
          espacoId: espaco.id,
          nome: 'Meus moldes',
          licenca: 'propria',
          criadoPor: CONTA,
          fonte: `molda:${CONTA}`,
        },
        10,
        AGORA,
      )
    const [a, b] = await Promise.all([criar(), criar()])
    expect(a?.id).toBe(b?.id)
    await repo.editarBiblioteca(a!.id, { nome: 'Outro nome' }, DEPOIS)
    expect((await criar())?.id).toBe(a!.id)
    expect(await repo.bibliotecas(espaco.id)).toHaveLength(1)
  })

  test('capa usa miniatura existente e volta à automática quando o modelo sai, sem reter bytes', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    await repo.reservarBlobs(
      espaco.id,
      ['a', 'b', 'c', 'd'].map((l) => ({
        digest: digest(l),
        bytes: 1000,
        tipo: l < 'c' ? ('modelo' as const) : ('miniatura' as const),
      })),
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      espaco.id,
      ['a', 'b', 'c', 'd'].map((l) => ({
        digest: digest(l),
        bytes: 1000,
        tipoDoConteudo: l < 'c' ? ('model/gltf-binary' as const) : ('image/webp' as const),
      })),
      AGORA,
    )
    const [a, b] = (await repo.criarModelos(
      biblioteca.id,
      [
        modelo('a', 'Árvore', { miniatura: digest('c') }),
        modelo('b', 'Pedra', { miniatura: digest('d') }),
      ],
      10,
      CONTA,
      AGORA,
    ))!
    const editada = await repo.editarBiblioteca(
      biblioteca.id,
      { descricao: 'Coisas da vila', capaModelo: b!.id },
      AGORA,
    )
    expect(editada).toMatchObject({
      descricao: 'Coisas da vila',
      capaModelo: b!.id,
      capa: digest('d'),
    })
    const soltos = await repo.apagarModelos(biblioteca.id, [b!.id], DEPOIS)
    expect(soltos.sort()).toEqual([digest('b'), digest('d')].sort())
    expect(await repo.biblioteca(biblioteca.id)).toMatchObject({
      capaModelo: null,
      capa: digest('c'),
    })
    expect((await repo.modelo(a!.id))?.miniatura).toBe(digest('c'))
    await repo.editarBiblioteca(biblioteca.id, { capaModelo: a!.id }, DEPOIS)
    expect((await repo.apagarBiblioteca(biblioteca.id, DEPOIS)).sort()).toEqual(
      [digest('a'), digest('c')].sort(),
    )
    expect(await repo.biblioteca(biblioteca.id)).toBeNull()
  })
  async function guardar(espacoId: string, ...letras: string[]) {
    await repo.reservarBlobs(
      espacoId,
      letras.map((l) => ({ digest: digest(l), bytes: 1000, tipo: 'modelo' as const })),
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      espacoId,
      letras.map((l) => ({
        digest: digest(l),
        bytes: 1000,
        tipoDoConteudo: 'model/gltf-binary' as const,
      })),
      AGORA,
    )
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
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 2000, tipoDoConteudo: 'model/gltf-binary' }],
      AGORA,
    )
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
  test('o mesmo hash não troca tamanho ou tipo durante uma reserva ativa para escapar da cota', async () => {
    const { espaco } = await comBiblioteca()
    await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 1, tipo: 'modelo' }],
      AGORA,
      DEPOIS,
    )
    const tamanho = await repo
      .reservarBlobs(
        espaco.id,
        [{ digest: digest('a'), bytes: 5000, tipo: 'modelo' }],
        AGORA,
        DEPOIS,
      )
      .then(
        () => null,
        (erro: unknown) => erro,
      )
    expect(tamanho).toMatchObject({ message: expect.stringContaining('outro tamanho ou tipo') })
    const tipo = await repo
      .reservarBlobs(
        espaco.id,
        [{ digest: digest('a'), bytes: 1, tipo: 'miniatura' }],
        AGORA,
        DEPOIS,
      )
      .then(
        () => null,
        (erro: unknown) => erro,
      )
    expect(tipo).toMatchObject({ message: expect.stringContaining('outro tamanho ou tipo') })
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(1)
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

  test('a confirmação exige bytes e MIME reservados, e imagens reutilizam o mesmo conteúdo', async () => {
    const { espaco } = await comBiblioteca()
    await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 100, tipo: 'miniatura', tipoDoConteudo: 'image/png' }],
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 101, tipoDoConteudo: 'image/png' }],
      AGORA,
    )
    expect((await repo.blobsConfirmados(espaco.id, [digest('a')])).size).toBe(0)
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 100, tipoDoConteudo: 'image/webp' }],
      AGORA,
    )
    expect((await repo.blobsConfirmados(espaco.id, [digest('a')])).size).toBe(0)
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: digest('a'), bytes: 100, tipoDoConteudo: 'image/png' }],
      AGORA,
    )
    expect((await repo.blobsConfirmados(espaco.id, [digest('a')])).get(digest('a'))).toMatchObject({
      bytes: 100,
      tipoDoConteudo: 'image/png',
    })
    expect(
      (
        await repo.reservarBlobs(
          espaco.id,
          [{ digest: digest('a'), bytes: 100, tipo: 'capa', tipoDoConteudo: 'image/png' }],
          AGORA,
          DEPOIS,
        )
      )?.faltam,
    ).toEqual([])
    expect((await repo.espaco(espaco.id))?.usadoBytes).toBe(100)
    await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('b'), bytes: 100, tipo: 'modelo' }],
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: digest('b'), bytes: 100, tipoDoConteudo: 'model/gltf-binary' }],
      new Date(DEPOIS.getTime() + 1),
    )
    expect((await repo.blobsConfirmados(espaco.id, [digest('b')])).size).toBe(0)
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
    // A árvore sai da cabeça, mas continua necessária para desfazer e para a fotografia inicial.
    await repo.gravarLote(
      {
        cenarioId,
        revisaoEsperada: 0,
        documento: criarDocumentoVazio(cenarioId, 'Praia'),
        comandos: [{ tipo: 'modelo.remover', id: 'arvore' }],
        operacaoId: 'remover-arvore',
        autorId: CONTA,
      },
      DEPOIS,
    )
    expect((await repo.cenario(cenarioId))!.documento.modelos).toHaveLength(0)
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
    expect(await repo.apagarMundo(mundo.id)).toBeInstanceOf(Array)
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
    expect(await repo.pilhasDoHistorico(id)).toEqual({ passado: [1, 2], futuro: [] })
    expect((await repo.passoDoHistorico(id, 2))!.inversos).toEqual([
      { tipo: 'cenario.renomear', nome: guardado.nome },
    ])
    expect((await repo.fotografia(id, 2))!.revisao).toBe(0)
    expect((await repo.lotesEntre(id, 0, 2)).map((l) => l.revisao)).toEqual([1, 2])
    const desfaz = await repo.gravarLote(
      {
        cenarioId: id,
        revisaoEsperada: 2,
        documento: guardado.documento,
        comandos: [{ tipo: 'cenario.renomear', nome: guardado.nome }],
        operacaoId: 'op-desfaz',
        autorId: CONTA,
        movimento: { acao: 'desfazer', alvo: 2 },
      },
      DEPOIS,
    )
    expect(desfaz).toEqual({ revisao: 3, repetido: false })
    expect(await repo.pilhasDoHistorico(id)).toEqual({ passado: [1], futuro: [2] })
    expect((await repo.revisoes(id, 3, 1)).map((l) => l.revisao)).toEqual([2])
  })
  test('chãos usam a mesma cota e reserva; repetição da importação não duplica, busca e remoção preservam imagens ainda usadas', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    const textura = {
      digest: imagem.digest,
      nome: 'Grama da Íris',
      pasta: 'natureza/solo',
      etiquetas: ['Verde'],
      largura: 2,
      altura: 2,
      repeticaoMetros: 2,
    }
    expect((await servico.reservarTexturas(ator, biblioteca.id, [imagem])).enviar).toHaveLength(1)
    const [guardada] = await servico.registrarTexturas(
      ator,
      biblioteca.id,
      [textura],
      [{ ...imagem, largura: 2, altura: 2 }],
      espaco.id,
    )
    expect(guardada).toMatchObject({ ...textura, bytes: 128 })
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(128)
    expect((await servico.reservarTexturas(ator, biblioteca.id, [imagem])).enviar).toEqual([])
    expect(
      await servico.registrarTexturas(
        ator,
        biblioteca.id,
        [textura],
        [{ ...imagem, largura: 2, altura: 2 }],
        espaco.id,
      ),
    ).toEqual([])
    expect(
      (await servico.texturas(ator, biblioteca.id, { busca: 'IRIS VERDE', limite: 1 })).itens,
    ).toHaveLength(1)
    expect((await repo.biblioteca(biblioteca.id))!).toMatchObject({
      modelos: 0,
      texturas: 1,
      capa: imagem.digest,
    })
    expect(
      (await servico.editarTextura(ator, guardada!.id, { nome: 'Terra', repeticaoMetros: 3 }))
        .repeticaoMetros,
    ).toBe(3)
    expect((await servico.texturas(ator, biblioteca.id, { busca: 'grama' })).total).toBe(0)
    const m = modelo('b', 'Canteiro', { miniatura: imagem.digest })
    await repo.reservarBlobs(
      espaco.id,
      [{ digest: m.digest, bytes: m.bytes, tipo: 'modelo' }],
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      espaco.id,
      [{ digest: m.digest, bytes: m.bytes, tipoDoConteudo: 'model/gltf-binary' }],
      AGORA,
    )
    await repo.criarModelos(biblioteca.id, [m], 50, CONTA, AGORA)
    expect((await servico.apagarTexturas(ator, biblioteca.id, [guardada!.id])).apagar).toEqual([])
    expect((await repo.blobsConfirmados(espaco.id, [imagem.digest])).has(imagem.digest)).toBe(true)
    expect((await repo.apagarModelos(biblioteca.id, [m.id], AGORA)).sort()).toEqual(
      [m.digest, imagem.digest].sort(),
    )
  })

  test('chão exige dimensões conferidas, reserva íntegra e espaço correto; a biblioteca remove seus arquivos órfãos', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/webp' as const }
    const textura = {
      digest: imagem.digest,
      nome: 'Areia',
      pasta: '',
      etiquetas: [],
      largura: 2,
      altura: 2,
      repeticaoMetros: 2,
    }
    const provas = [{ ...imagem, largura: 2, altura: 2 }]
    await servico.reservarTexturas(ator, biblioteca.id, [imagem])
    const dimensoesErradas = await servico
      .registrarTexturas(ator, biblioteca.id, [{ ...textura, largura: 4 }], provas, espaco.id)
      .catch((e: unknown) => e)
    expect(dimensoesErradas).toBeInstanceOf(CenarioArquivoAusenteError)
    const outroEspaco = await servico
      .registrarTexturas(ator, biblioteca.id, [textura], provas, randomUUID())
      .catch((e: unknown) => e)
    expect(outroEspaco).toBeInstanceOf(CenarioArquivoAusenteError)
    const tamanhoErrado = await servico
      .registrarTexturas(ator, biblioteca.id, [textura], [{ ...provas[0]!, bytes: 129 }], espaco.id)
      .catch((e: unknown) => e)
    expect(tamanhoErrado).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.texturas(biblioteca.id, { termos: [], inicio: 0, limite: 50 })).total).toBe(
      0,
    )
    await servico.registrarTexturas(ator, biblioteca.id, [textura], provas, espaco.id)
    const apagados = await servico.apagarBiblioteca(ator, biblioteca.id)
    expect(apagados.apagar).toEqual([`cenarios/${espaco.id}/blobs/${imagem.digest}`])
    expect(await repo.biblioteca(biblioteca.id)).toBeNull()
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
  })

  test('registro de chão é atômico: teto ou metadados inválidos não deixam arquivos confirmados sem textura', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const criar = (letra: string, largura = 2) => ({
      id: randomUUID(),
      nome: 'Grama',
      pasta: '',
      etiquetas: [],
      digest: digest(letra),
      bytes: 128,
      largura,
      altura: 2,
      repeticaoMetros: 2,
    })
    const primeira = criar('e'),
      segunda = criar('f')
    const provas = [primeira, segunda].map((t) => ({
      digest: t.digest,
      bytes: t.bytes,
      tipoDoConteudo: 'image/png' as const,
    }))
    await repo.reservarBlobs(
      espaco.id,
      provas.map((p) => ({ ...p, tipo: 'textura' as const })),
      AGORA,
      DEPOIS,
    )
    expect(
      await repo.criarTexturas(biblioteca.id, [primeira], 1, CONTA, AGORA, [provas[0]!]),
    ).toHaveLength(1)
    expect(
      await repo.criarTexturas(biblioteca.id, [segunda], 1, CONTA, AGORA, [provas[1]!]),
    ).toBeNull()
    expect((await repo.blobsConfirmados(espaco.id, [segunda.digest])).size).toBe(0)
    const erro = await repo
      .criarTexturas(biblioteca.id, [{ ...segunda, largura: 0 }], 2, CONTA, AGORA, [provas[1]!])
      .catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(Error)
    expect((await repo.blobsConfirmados(espaco.id, [segunda.digest])).size).toBe(0)
    expect((await repo.texturas(biblioteca.id, { termos: [], inicio: 0, limite: 50 })).total).toBe(
      1,
    )
  })

  test('fotografias esparsas e lotes reconstroem qualquer revisão; undo permanece após reabrir o serviço', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const montarServico = () =>
      new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const servico = montarServico()
    const [espaco] = await servico.espacos(ator)
    const mundo = await servico.criarMundo(ator, espaco!.id, 'Mundo')
    const cenario = await servico.criarCenario(ator, mundo.id, 'Começo')
    for (let i = 0; i < 51; i++)
      await servico.editarCenario(ator, cenario.id, {
        revisaoEsperada: i,
        operacaoId: `editar-${i.toString().padStart(8, '0')}`,
        comandos: [{ tipo: 'cenario.renomear', nome: `Etapa ${i + 1}` }],
      })
    expect((await repo.fotografia(cenario.id, 51))!.revisao).toBe(50)
    expect(await repo.lotesEntre(cenario.id, 50, 51)).toHaveLength(1)
    const [quantidade] =
      await conn.sql`select count(*)::int as n from members.cenario_revisoes where cenario_id = ${cenario.id}`
    expect(quantidade!.n).toBe(2)
    const novoServico = montarServico()
    expect((await novoServico.documentoNaRevisao(ator, cenario.id, 13)).nome).toBe('Etapa 13')
    expect((await novoServico.documentoNaRevisao(ator, cenario.id, 0)).nome).toBe('Começo')
    const desfeito = await novoServico.moverHistorico(ator, cenario.id, {
      acao: 'desfazer',
      revisaoEsperada: 51,
      operacaoId: 'desfazer-0001',
    })
    expect(desfeito.nome).toBe('Etapa 50')
    expect(desfeito.historico).toEqual({ revisao: 52, desfazer: 50, refazer: 1 })
    expect((await novoServico.revisoes(ator, cenario.id)).proximo).toBe(3)
  })
})
