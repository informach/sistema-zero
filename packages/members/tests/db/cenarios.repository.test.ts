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
  AguaSchema,
  apoioNaAgua,
  apoioNaSuperficie,
  type BaseDeTerreno,
  CaminhoSchema,
  type ComandoDeCenario,
  capturarFragmento,
  conteudoDoCenarioDeConjunto,
  criarAmostradorDeEspalhamento,
  criarDocumentoVazio,
  type DefinicaoDeConjunto,
  executarLote,
  IluminacaoSchema,
  MarcadorSchema,
} from '@sistemazero/molda-cenarios-core/v2'
import postgres from 'postgres'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import { chaveDoBlob } from '../../src/domain/cenarios/cenarios'
import {
  BibliotecaRestritaError,
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
  CenariosSemEspacoError,
} from '../../src/domain/cenarios/cenarios.errors'
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
    const conjuntosDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0158_fluffy_maggott.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of conjuntosDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const operacoesDeConjuntosDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0159_wise_lady_bullseye.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of operacoesDeConjuntosDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const fontesDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0160_flaky_marvel_zombies.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of fontesDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const retratosDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0161_lonely_zemo.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of retratosDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    const soloDdl = readFileSync(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0162_young_roulette.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const comando of soloDdl.split('--> statement-breakpoint'))
      if (comando.trim()) await conn.sql.unsafe(comando)
    repo = new DrizzleCenariosRepository(conn.db)
  })
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    await conn.sql.unsafe('truncate members.cenario_espacos cascade')
  })

  async function conjuntoComDuasCopias() {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const fonte = criarDocumentoVazio('fonte', 'Jardim')
    fonte.formas = [{ id: 'f', nome: 'Flor', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
    fonte.instancias = [
      {
        id: 'flor',
        nome: 'Flor',
        modelo: 'f',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 0, y: 0, z: 0 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
      },
    ]
    const conteudo = capturarFragmento(fonte, ['flor'], espaco.id)
    const conjunto = (await repo.criarConjunto(
      {
        id: randomUUID(),
        bibliotecaId: biblioteca.id,
        operacaoId: randomUUID(),
        nome: 'Jardim',
        pasta: '',
        etiquetas: [],
        conteudo,
        autorId: CONTA,
      },
      10,
      AGORA,
    ))!
    const definicao: DefinicaoDeConjunto = {
      id: 'd',
      biblioteca: biblioteca.id,
      conjunto: conjunto.id,
      revisao: 1,
      nome: 'Jardim',
      conteudo,
    }
    const mundo = await s.criarMundo(ator, espaco.id, 'Mundo'),
      cenarios: string[] = []
    for (const nome of ['Primeiro', 'Falhar publicação']) {
      const c = await s.criarCenario(ator, mundo.id, nome)
      cenarios.push(c.id)
      await s.editarCenario(ator, c.id, {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [
          { tipo: 'conjunto.definir', definicao },
          {
            tipo: 'montagem.definir',
            montagem: {
              id: 'jardim',
              nome: 'Jardim',
              grupo: null,
              bloqueado: false,
              oculto: false,
              definicao: 'd',
              transformacao: {
                posicao: { x: 0, y: 0, z: 0 },
                rotacao: { x: 0, y: 0, z: 0 },
                escala: { x: 1, y: 1, z: 1 },
              },
            },
          },
        ],
      })
    }
    return { espaco, conjunto, conteudo, cenarios, ator, s }
  }

  test('rascunho compartilhado usa o histórico real e publica somente a revisão salva, sem apagar edições pendentes', async () => {
    const { conjunto, conteudo, cenarios, s, ator, espaco } = await conjuntoComDuasCopias()
    const aberturas = await Promise.all([
      repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA),
      repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA),
    ])
    expect(aberturas[0]).toEqual(aberturas[1])
    const fonte = aberturas[0]!
    expect((await repo.mundos(espaco.id)).map((m) => m.id)).not.toContain(fonte.mundoId)
    expect((await repo.mundo(fonte.mundoId))!.bibliotecaConjuntosId).toBe(conjunto.bibliotecaId)
    expect((await repo.conjuntoDoCenario(fonte.cenarioId))!.id).toBe(conjunto.id)
    const c0 = await s.abrirCenario(ator, fonte.cenarioId)
    const d1 = structuredClone(c0.documento)
    d1.instancias[0]!.nome = 'Flor do rascunho'
    d1.instancias[0]!.transformacao.posicao.x += 3
    await s.editarCenario(ator, fonte.cenarioId, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'cenario.restaurar', documento: d1 }],
    })
    const base = {
      id: conjunto.id,
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
      conteudo,
      autorId: CONTA,
    }
    expect(await repo.publicarConjunto(base, 1000, AGORA).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    expect((await repo.conjunto(conjunto.id))!.revisao).toBe(1)
    expect((await repo.cenario(cenarios[0]!))!.revisao).toBe(1)
    const salvo = conteudoDoCenarioDeConjunto(d1, espaco.id)
    expect(
      await repo
        .publicarConjunto(
          { ...base, conteudo: salvo, rascunho: { cenarioId: fonte.cenarioId, revisao: 0 } },
          1000,
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenarioDesatualizadoError)
    expect(
      await repo
        .publicarConjunto(
          { ...base, rascunho: { cenarioId: fonte.cenarioId, revisao: 1 } },
          1000,
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    const pedido = {
      ...base,
      conteudo: salvo,
      rascunho: { cenarioId: fonte.cenarioId, revisao: 1 },
    }
    const r = (await repo.publicarConjunto(pedido, 1000, AGORA))!
    expect(r.conjunto.revisao).toBe(2)
    expect(r.conjunto.revisaoPublicadaDoCenario).toBe(1)
    expect(r.cenarios.map((c) => c.id).sort()).toEqual([...cenarios].sort())
    expect((await repo.cenario(fonte.cenarioId))!.documento).toEqual(d1)
    expect(await s.documentoNaRevisao(ator, fonte.cenarioId, 0)).toEqual(c0.documento)
    // Desfazer no rascunho não desfaz uma publicação já aplicada em outros cenários.
    await s.moverHistorico(ator, fonte.cenarioId, {
      acao: 'desfazer',
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
    })
    expect((await repo.cenario(fonte.cenarioId))!.documento).toEqual(c0.documento)
    expect((await repo.conjunto(conjunto.id))!.revisaoPublicadaDoCenario).toBe(1)
    expect((await repo.cenario(cenarios[0]!))!.revisao).toBe(2)
    // Repetição idempotente continua válida mesmo depois de uma nova edição do rascunho.
    expect((await repo.publicarConjunto(pedido, 1000, AGORA))!.conjunto.revisao).toBe(2)
    expect(await s.apagarCenario(ator, fonte.cenarioId).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    expect(await s.duplicarCenario(ator, fonte.cenarioId).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    expect(await s.criarCenario(ator, fonte.mundoId, 'Extra').catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    expect(await s.apagarMundo(ator, fonte.mundoId).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    await repo.apagarConjunto(conjunto.id, AGORA)
    expect(await repo.cenario(fonte.cenarioId)).toBeNull()
    expect(await repo.mundo(fonte.mundoId)).toBeNull()
    expect((await repo.cenario(cenarios[0]!))!.documento.definicoesConjuntos![0]!.conteudo).toEqual(
      salvo,
    )
  })

  test('publicação direta sincroniza somente rascunho limpo e conserva o mundo interno enquanto outra definição o usa', async () => {
    const { conjunto, conteudo, espaco } = await conjuntoComDuasCopias()
    const fonte = (await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA))!
    const segundo = (await repo.criarConjunto(
      {
        id: randomUUID(),
        bibliotecaId: conjunto.bibliotecaId,
        nome: 'Outro jardim',
        pasta: '',
        etiquetas: [],
        operacaoId: randomUUID(),
        conteudo,
        autorId: CONTA,
      },
      10,
      AGORA,
    ))!
    const outraFonte = (await repo.prepararEdicaoDeConjunto(segundo.id, CONTA, AGORA))!
    expect(outraFonte.mundoId).toBe(fonte.mundoId)
    const novo = structuredClone(conteudo)
    novo.instancias[0]!.nome = 'Publicada pelo agente'
    const pedido = {
      id: conjunto.id,
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
      conteudo: novo,
      autorId: CONTA,
    }
    const publicado = (await repo.publicarConjunto(pedido, 1000, AGORA))!
    const repetido = (await repo.publicarConjunto(pedido, 1000, AGORA))!
    expect(repetido.cenarios.map((c) => c.id).sort()).toEqual(
      publicado.cenarios.map((c) => c.id).sort(),
    )
    const c = (await repo.cenario(fonte.cenarioId))!
    expect(c.revisao).toBe(1)
    expect(c.documento.instancias[0]!.nome).toBe('Publicada pelo agente')
    expect((await repo.conjunto(conjunto.id))!.revisaoPublicadaDoCenario).toBe(1)
    await repo.apagarConjunto(conjunto.id, AGORA)
    expect(await repo.cenario(fonte.cenarioId)).toBeNull()
    expect((await repo.cenario(outraFonte.cenarioId))!.revisao).toBe(0)
    expect(await repo.mundo(fonte.mundoId)).not.toBeNull()
    await repo.apagarBiblioteca(conjunto.bibliotecaId, AGORA)
    expect(await repo.cenario(outraFonte.cenarioId)).toBeNull()
    expect(await repo.mundo(fonte.mundoId)).toBeNull()
    expect((await repo.mundos(espaco.id)).length).toBe(1)
  })

  test('rascunho recusa sistemas não representados na definição e cópia de si mesmo, sem gravar parcialmente', async () => {
    const { conjunto, s, ator, cenarios } = await conjuntoComDuasCopias()
    const fonte = (await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA))!
    const d = structuredClone((await repo.cenario(fonte.cenarioId))!.documento)
    d.aguas = [
      {
        id: 'mar',
        nome: 'Mar',
        tipo: 'mar',
        nivel: 0,
        grupo: null,
        bloqueado: false,
        oculto: false,
      },
    ]
    const lote = {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'cenario.restaurar' as const, documento: d }],
    }
    expect(await s.editarCenario(ator, fonte.cenarioId, lote).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    expect((await repo.cenario(fonte.cenarioId))!.revisao).toBe(0)
    const copia = (await repo.cenario(cenarios[0]!))!.documento
    d.aguas = []
    d.definicoesConjuntos = copia.definicoesConjuntos
    d.montagens = copia.montagens
    expect(
      await s
        .editarCenario(ator, fonte.cenarioId, { ...lote, operacaoId: randomUUID() })
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    expect((await repo.cenario(fonte.cenarioId))!.revisao).toBe(0)
    expect(await repo.pilhasDoHistorico(fonte.cenarioId)).toEqual({ passado: [], futuro: [] })
  })

  test('arquivo presente só no histórico do rascunho sobrevive ao catálogo de modelos e é liberado com o conjunto', async () => {
    const { conjunto, s, ator, espaco } = await conjuntoComDuasCopias()
    const acervo = (await repo.criarBiblioteca(
      {
        id: randomUUID(),
        espacoId: espaco.id,
        nome: 'Peças',
        licenca: 'restrita',
        criadoPor: CONTA,
      },
      10,
      AGORA,
    ))!
    await guardar(espaco.id, 'b')
    const [m] = (await repo.criarModelos(acervo.id, [modelo('b', 'Banco')], 10, CONTA, AGORA))!
    const fonte = (await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA))!
    const d = structuredClone((await repo.cenario(fonte.cenarioId))!.documento)
    d.modelos.push({
      id: 'banco',
      biblioteca: acervo.id,
      modelo: m!.id,
      digest: m!.digest,
      volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 3, z: 1 } },
    })
    d.instancias.push({ ...structuredClone(d.instancias[0]!), id: 'banco', modelo: 'banco' })
    await s.editarCenario(ator, fonte.cenarioId, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'cenario.restaurar', documento: d }],
    })
    await s.moverHistorico(ator, fonte.cenarioId, {
      acao: 'desfazer',
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
    })
    expect((await repo.cenario(fonte.cenarioId))!.documento.modelos).toHaveLength(0)
    expect(await repo.apagarBiblioteca(acervo.id, AGORA)).toEqual([])
    expect((await repo.blobsConfirmados(espaco.id, [digest('b')])).size).toBe(1)
    expect(await repo.apagarConjunto(conjunto.id, AGORA)).toEqual([digest('b')])
    expect((await repo.blobsConfirmados(espaco.id, [digest('b')])).size).toBe(0)
  })

  test('miniatura confirma e associa em uma transação; falha no commit e exclusão não deixam arquivo confirmado sem dono', async () => {
    const { conjunto, espaco } = await conjuntoComDuasCopias()
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    await repo.reservarBlobs(espaco.id, [{ ...imagem, tipo: 'miniatura' }], AGORA, DEPOIS)
    const bytes = (await repo.espaco(espaco.id))!.usadoBytes
    await conn.sql.unsafe(
      "create function members.falhar_miniatura_qa() returns trigger language plpgsql as $$ begin raise exception 'Falha da miniatura no commit'; end $$",
    )
    await conn.sql.unsafe(
      'create constraint trigger falhar_miniatura_qa after update on members.cenario_conjunto_versoes deferrable initially deferred for each row when (new.miniatura is not null) execute function members.falhar_miniatura_qa()',
    )
    try {
      const erro = await repo
        .definirMiniaturaDoConjunto(conjunto.id, 1, imagem.digest, AGORA, {
          espacoId: espaco.id,
          conferido: imagem,
        })
        .catch((e) => e)
      expect(String(erro)).toContain('Falha da miniatura no commit')
      expect((await repo.blobsConfirmados(espaco.id, [imagem.digest])).size).toBe(0)
      expect((await repo.versaoDoConjunto(conjunto.id, 1))!.miniatura).toBeNull()
      expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(bytes)
    } finally {
      await conn.sql.unsafe('drop trigger falhar_miniatura_qa on members.cenario_conjunto_versoes')
      await conn.sql.unsafe('drop function members.falhar_miniatura_qa()')
    }
    expect(
      await repo.definirMiniaturaDoConjunto(conjunto.id, 1, imagem.digest, AGORA, {
        espacoId: espaco.id,
        conferido: imagem,
      }),
    ).toBe(true)
    expect((await repo.blobsConfirmados(espaco.id, [imagem.digest])).size).toBe(1)
    const outra = { ...imagem, digest: digest('f') }
    await repo.reservarBlobs(espaco.id, [{ ...outra, tipo: 'miniatura' }], AGORA, DEPOIS)
    expect(
      await repo
        .definirMiniaturaDoConjunto(conjunto.id, 1, outra.digest, AGORA, {
          espacoId: randomUUID(),
          conferido: outra,
        })
        .catch((e) => e),
    ).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.blobsConfirmados(espaco.id, [outra.digest])).size).toBe(0)
    await repo.apagarConjunto(conjunto.id, AGORA)
    expect(
      await repo.definirMiniaturaDoConjunto(conjunto.id, 1, outra.digest, AGORA, {
        espacoId: espaco.id,
        conferido: outra,
      }),
    ).toBe(false)
    expect((await repo.blobsConfirmados(espaco.id, [outra.digest])).size).toBe(0)
  })

  test('publicações concorrentes disputam a mesma revisão sem duplicar lotes ou versões', async () => {
    const { conjunto, conteudo, cenarios, s, ator } = await conjuntoComDuasCopias()
    const editar = (cor: string) => {
      const c = structuredClone(conteudo)
      c.instancias[0]!.aparencia = { cor }
      return c
    }
    const pedidos = ['#bb4477', '#334455'].map((cor) => ({
      id: conjunto.id,
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
      conteudo: editar(cor),
      autorId: CONTA,
    }))
    const resultados = await Promise.allSettled(
      pedidos.map((p) => repo.publicarConjunto(p, 1000, AGORA)),
    )
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejeitada = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejeitada.reason).toBeInstanceOf(CenarioDesatualizadoError)
    expect((await repo.conjunto(conjunto.id))!.revisao).toBe(2)
    const cabecas = await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))
    expect(cabecas.map((c) => c.revisao)).toEqual([2, 2])
    const [quantidade] =
      await conn.sql`select count(*)::int as n from members.cenario_conjunto_versoes where conjunto_id = ${conjunto.id}`
    expect(quantidade!.n).toBe(2)
    const vencedora = pedidos[resultados.findIndex((r) => r.status === 'fulfilled')]!
    const repetidos = await Promise.all([
      repo.publicarConjunto(vencedora, 1000, AGORA),
      repo.publicarConjunto(vencedora, 1000, AGORA),
    ])
    expect(repetidos.map((r) => r!.conjunto.revisao)).toEqual([2, 2])
    expect(await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))).toEqual(cabecas)
  })

  test('falha adiada até o commit desfaz a definição, todas as cabeças e seus históricos', async () => {
    const { conjunto, conteudo, cenarios, s, ator, espaco } = await conjuntoComDuasCopias()
    const fonte = (await repo.prepararEdicaoDeConjunto(conjunto.id, CONTA, AGORA))!
    const fonteAntes = await s.abrirCenario(ator, fonte.cenarioId)
    const antes = await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id))),
      bytes = (await repo.espaco(espaco.id))!.usadoBytes
    await conn.sql.unsafe(
      "create function members.falhar_publicacao_qa() returns trigger language plpgsql as $$ begin raise exception 'Falha transacional de ensaio'; end $$",
    )
    await conn.sql.unsafe(
      "create constraint trigger falhar_publicacao_qa after update on members.cenario_cenarios deferrable initially deferred for each row when (new.nome = 'Falhar publicação' and new.revisao = 2) execute function members.falhar_publicacao_qa()",
    )
    try {
      const novo = structuredClone(conteudo)
      novo.instancias[0]!.aparencia = { cor: '#bb4477' }
      const erro = await repo
        .publicarConjunto(
          {
            id: conjunto.id,
            revisaoEsperada: 1,
            operacaoId: randomUUID(),
            conteudo: novo,
            autorId: CONTA,
          },
          1000,
          AGORA,
        )
        .catch((e) => e)
      expect(String(erro)).toContain('Falha transacional de ensaio')
      expect((await repo.conjunto(conjunto.id))!.revisao).toBe(1)
      expect(await repo.versaoDoConjunto(conjunto.id, 2)).toBeNull()
      expect(await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))).toEqual(antes)
      expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(bytes)
      expect(await s.abrirCenario(ator, fonte.cenarioId)).toEqual(fonteAntes)
      expect((await repo.conjunto(conjunto.id))!.revisaoPublicadaDoCenario).toBe(0)
    } finally {
      await conn.sql.unsafe('drop trigger falhar_publicacao_qa on members.cenario_cenarios')
      await conn.sql.unsafe('drop function members.falhar_publicacao_qa()')
    }
  })

  test('colagem confirma espaço e papéis; arquivos só no fragmento do histórico sobrevivem à remoção do catálogo e são liberados no fim', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    await guardar(espaco.id, 'a')
    const [m] = (await repo.criarModelos(biblioteca.id, [modelo('a', 'Caixa')], 10, CONTA, AGORA))!
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    await s.reservarTexturas(ator, biblioteca.id, [imagem])
    const [t] = await s.registrarTexturas(
      ator,
      biblioteca.id,
      [
        {
          nome: 'Terra',
          pasta: '',
          etiquetas: [],
          digest: imagem.digest,
          largura: 2,
          altura: 2,
          repeticaoMetros: 2,
        },
      ],
      [{ ...imagem, largura: 2, altura: 2 }],
      espaco.id,
    )
    const origem = criarDocumentoVazio('origem', 'Origem')
    origem.modelos = [
      {
        id: 'modelo',
        biblioteca: biblioteca.id,
        modelo: m!.id,
        digest: m!.digest,
        volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 3, z: 1 } },
      },
    ]
    origem.texturas = [
      { id: 't', biblioteca: biblioteca.id, textura: t!.id, digest: imagem.digest },
    ]
    origem.instancias = [
      {
        id: 'o',
        nome: 'Objeto',
        grupo: null,
        bloqueado: false,
        oculto: false,
        modelo: 'modelo',
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 0, y: 0, z: 0 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
        aparencia: { textura: { id: 't', repeticaoMetros: 2 } },
      },
    ]
    const fragmento = capturarFragmento(origem, ['o'], espaco.id)
    const mundo = await s.criarMundo(ator, espaco.id, 'Mundo'),
      c = await s.criarCenario(ator, mundo.id, 'Destino')
    const comando: ComandoDeCenario = {
      tipo: 'fragmento.colar',
      fragmento,
      prefixo: 'p',
      ponto: { x: 4, y: 0, z: 4 },
    }
    const malformado = {
      ...comando,
      fragmento: { origem: { espaco: espaco.id } },
    } as unknown as ComandoDeCenario
    expect(
      await s
        .editarCenario(ator, c.id, {
          revisaoEsperada: 0,
          comandos: [malformado],
          operacaoId: randomUUID(),
        })
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    const estrangeiro: ComandoDeCenario = {
      ...comando,
      fragmento: { ...fragmento, origem: { ...fragmento.origem, espaco: randomUUID() } },
    }
    expect(
      await s
        .editarCenario(ator, c.id, {
          revisaoEsperada: 0,
          comandos: [estrangeiro],
          operacaoId: randomUUID(),
        })
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    const documentoEstrangeiro = executarLote(
      { documento: criarDocumentoVazio(c.id, 'Destino'), revisao: 0 },
      { revisaoEsperada: 0, comandos: [estrangeiro] },
    ).documento
    expect(
      await repo
        .gravarLote(
          {
            cenarioId: c.id,
            revisaoEsperada: 0,
            documento: documentoEstrangeiro,
            comandos: [estrangeiro],
            operacaoId: randomUUID(),
            autorId: CONTA,
          },
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    const papelErrado = structuredClone(comando)
    papelErrado.fragmento.texturas[0]!.digest = m!.digest
    expect(
      await s
        .editarCenario(ator, c.id, {
          revisaoEsperada: 0,
          comandos: [papelErrado],
          operacaoId: randomUUID(),
        })
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    expect((await repo.cenario(c.id))!.revisao).toBe(0)
    await s.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      comandos: [comando],
      operacaoId: randomUUID(),
    })
    const colado = (await s.abrirCenario(ator, c.id)).documento
    await s.moverHistorico(ator, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
    })
    expect((await repo.cenario(c.id))!.documento.modelos).toEqual([])
    expect((await repo.cenario(c.id))!.documento.texturas).toBeUndefined()
    expect((await s.apagarBiblioteca(ator, biblioteca.id)).apagar).toEqual([])
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(1128)
    const reaberto = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    expect(
      (
        await reaberto.moverHistorico(ator, c.id, {
          acao: 'refazer',
          revisaoEsperada: 2,
          operacaoId: randomUUID(),
        })
      ).documento,
    ).toEqual(colado)
    expect(await reaberto.documentoNaRevisao(ator, c.id, 1)).toEqual(colado)
    await reaberto.moverHistorico(ator, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 3,
      operacaoId: randomUUID(),
    })
    expect((await repo.cenario(c.id))!.documento.modelos).toEqual([])
    expect((await reaberto.apagarCenario(ator, c.id)).apagar.sort()).toEqual(
      [
        `cenarios/${espaco.id}/blobs/${m!.digest}`,
        `cenarios/${espaco.id}/blobs/${imagem.digest}`,
      ].sort(),
    )
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
  })

  test('textura do cenário permanece nos lotes após remover da cabeça e apagar a biblioteca; a última cópia solta a imagem', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    await servico.reservarTexturas(ator, biblioteca.id, [imagem])
    const [t] = await servico.registrarTexturas(
      ator,
      biblioteca.id,
      [
        {
          nome: 'Terra',
          pasta: '',
          etiquetas: [],
          digest: imagem.digest,
          largura: 2,
          altura: 2,
          repeticaoMetros: 2,
        },
      ],
      [{ ...imagem, largura: 2, altura: 2 }],
      espaco.id,
    )
    const mundo = await servico.criarMundo(ator, espaco.id, 'Ilha'),
      c = await servico.criarCenario(ator, mundo.id, 'Material')
    const ref = { id: 'terra', textura: t!.id, biblioteca: biblioteca.id, digest: imagem.digest }
    await servico.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      operacaoId: 'fixar-textura-01',
      comandos: [{ tipo: 'textura.definir', textura: ref }],
    })
    await servico.editarCenario(ator, c.id, {
      revisaoEsperada: 1,
      operacaoId: 'retirar-textura-1',
      comandos: [{ tipo: 'textura.remover', id: 'terra' }],
    })
    expect((await servico.apagarBiblioteca(ator, biblioteca.id)).apagar).toEqual([])
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(128)
    expect((await servico.arquivo(ator, espaco.id, imagem.digest)).bytes).toBe(128)
    const reaberto = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const volta = await reaberto.moverHistorico(ator, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 2,
      operacaoId: 'voltar-textura-01',
    })
    expect(volta.documento.texturas).toEqual([ref])
    const copia = await reaberto.duplicarCenario(ator, c.id)
    expect((await reaberto.apagarCenario(ator, c.id)).apagar).toEqual([])
    expect((await repo.cenario(copia.id))!.documento.texturas).toEqual([ref])
    expect((await reaberto.apagarCenario(ator, copia.id)).apagar).toEqual([
      `cenarios/${espaco.id}/blobs/${imagem.digest}`,
    ])
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
  })

  test('serviço e transação recusam textura de outro espaço, papel incorreto e arquivo que desapareceu antes da trava', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const mundo = await s.criarMundo(ator, espaco.id, 'Mundo'),
      c = await s.criarCenario(ator, mundo.id, 'Sem textura')
    const lote = (d: string) => ({
      revisaoEsperada: 0,
      operacaoId: `negar-textura-${d.slice(0, 8)}`,
      comandos: [
        {
          tipo: 'textura.definir',
          textura: { id: 't', textura: 't', biblioteca: biblioteca.id, digest: d },
        },
      ] satisfies ComandoDeCenario[],
    })
    for (const [letra, tipo] of [
      ['b', 'modelo'],
      ['c', 'miniatura'],
    ] as const) {
      await repo.reservarBlobs(
        espaco.id,
        [{ digest: digest(letra), bytes: 1000, tipo }],
        AGORA,
        DEPOIS,
      )
      await repo.confirmarBlobs(
        espaco.id,
        [
          {
            digest: digest(letra),
            bytes: 1000,
            tipoDoConteudo: tipo === 'modelo' ? 'model/gltf-binary' : 'image/png',
          },
        ],
        AGORA,
      )
      const erro = await s.editarCenario(ator, c.id, lote(digest(letra))).catch((e) => e)
      expect(erro).toBeInstanceOf(CenarioInvalidoError)
    }
    const outro = await repo.espacoDaConta(randomUUID(), 10000, AGORA)
    await repo.reservarBlobs(
      outro.id,
      [{ digest: digest('d'), bytes: 128, tipo: 'textura' }],
      AGORA,
      DEPOIS,
    )
    await repo.confirmarBlobs(
      outro.id,
      [{ digest: digest('d'), bytes: 128, tipoDoConteudo: 'image/png' }],
      AGORA,
    )
    expect(await s.editarCenario(ator, c.id, lote(digest('d'))).catch((e) => e)).toBeInstanceOf(
      CenarioInvalidoError,
    )
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    await s.reservarTexturas(ator, biblioteca.id, [imagem])
    await s.registrarTexturas(
      ator,
      biblioteca.id,
      [
        {
          nome: 'Terra',
          pasta: '',
          etiquetas: [],
          digest: imagem.digest,
          largura: 2,
          altura: 2,
          repeticaoMetros: 2,
        },
      ],
      [{ ...imagem, largura: 2, altura: 2 }],
      espaco.id,
    )
    const atual = (await repo.cenario(c.id))!,
      pedido = lote(imagem.digest)
    const depois = executarLote(
      { documento: atual.documento, revisao: 0 },
      { revisaoEsperada: pedido.revisaoEsperada, comandos: pedido.comandos },
    ).documento
    await s.apagarBiblioteca(ator, biblioteca.id)
    const erroDaTrava = await repo
      .gravarLote(
        {
          cenarioId: c.id,
          revisaoEsperada: 0,
          documento: depois,
          comandos: pedido.comandos,
          operacaoId: pedido.operacaoId,
          autorId: CONTA,
        },
        DEPOIS,
      )
      .catch((e) => e)
    expect(erroDaTrava).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.cenario(c.id))!.revisao).toBe(0)
    expect((await repo.cenario(c.id))!.documento.texturas).toBeUndefined()
  })

  test('formas, espelho, cor e contato local sobrevivem ao JSONB e ao histórico sem criar blobs', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const [espaco] = await servico.espacos(ator)
    const mundo = await servico.criarMundo(ator, espaco!.id, 'Blocos')
    const c = await servico.criarCenario(ator, mundo.id, 'Rascunho')
    const forma = {
      id: 'forma/caixa',
      nome: 'Caixa',
      tipo: 'caixa',
      largura: 4,
      altura: 1,
      comprimento: 4,
    } as const
    const instancia = {
      id: 'base',
      nome: 'Base',
      modelo: forma.id,
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'malha',
      apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
      espelho: { x: true, y: false, z: false },
      aparencia: { cor: '#dd8844' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    } as const
    await servico.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      operacaoId: 'criar-formas-001',
      comandos: [
        { tipo: 'forma.definir', forma },
        { tipo: 'instancia.criar', instancia },
        {
          tipo: 'instancia.criar',
          instancia: {
            ...instancia,
            id: 'filho',
            nome: 'Filho',
            apoio: {
              tipo: 'objeto',
              objeto: 'base',
              contato: { x: 0.5, y: 1, z: 0.25 },
              deslocamento: 0,
            },
          },
        },
      ],
    })
    const novaSessao = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const d = (await novaSessao.abrirCenario(ator, c.id)).documento
    expect(d.formas).toEqual([forma])
    expect(d.modelos).toHaveLength(0)
    expect(d.instancias[1]!.apoio).toMatchObject({
      tipo: 'objeto',
      contato: { x: 0.5, y: 1, z: 0.25 },
    })
    expect(d.instancias[0]!.espelho).toEqual(instancia.espelho)
    expect(d.instancias[0]!.aparencia).toEqual(instancia.aparencia)
    expect((await repo.espaco(espaco!.id))!.usadoBytes).toBe(0)
    const volta = await novaSessao.moverHistorico(ator, c.id, {
      acao: 'desfazer',
      revisaoEsperada: 1,
      operacaoId: 'desfazer-forma-01',
    })
    expect(volta.documento.formas).toBeUndefined()
    const refaz = await novaSessao.moverHistorico(ator, c.id, {
      acao: 'refazer',
      revisaoEsperada: 2,
      operacaoId: 'refazer-forma-01',
    })
    expect(refaz.documento.formas).toEqual([forma])
    expect(refaz.documento.instancias).toEqual(d.instancias)
  })

  test('pintura e buracos exigem prova do papel e das camadas, com histórico e coleta por último dono', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const servico = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const [espaco] = await servico.espacos(ator)
    const mundo = await servico.criarMundo(ator, espaco!.id, 'Mundo')
    const cenario = await servico.criarCenario(ator, mundo.id, 'Solo')
    const a = digest('a'),
      b = digest('b')
    const base: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: 0, z: 0 },
      passo: 1,
      colunas: 64,
      linhas: 64,
      min: -10,
      max: 40,
      fundo: 0,
      pecas: [],
      solo: {
        camadas: [
          { id: 'grama', nome: 'Grama', cor: '#80b050' },
          { id: 'terra', nome: 'Terra', cor: '#907050' },
        ],
        pecas: [{ coluna: 0, linha: 0, digest: a }],
      },
      buracos: [{ coluna: 0, linha: 0, digest: b }],
    }
    const prova = [
      {
        digest: a,
        bytes: 8458,
        tipoDoConteudo: 'application/octet-stream' as const,
        terreno: { tipo: 'pintura' as const, camadas: 2 },
      },
      {
        digest: b,
        bytes: 520,
        tipoDoConteudo: 'application/octet-stream' as const,
        terreno: { tipo: 'buracos' as const },
      },
    ]
    await servico.reservarRecursos(
      ator,
      cenario.id,
      prova.map(({ digest, bytes }) => ({ digest, bytes })),
    )
    const lote = {
      revisaoEsperada: 0,
      operacaoId: 'solo-prova-0001',
      comandos: [{ tipo: 'base.definir' as const, base }],
    }
    const semProva = await servico.editarCenario(ator, cenario.id, lote).catch((e: unknown) => e)
    expect(semProva).toBeInstanceOf(CenarioArquivoAusenteError)
    const divergente = {
      ...base,
      solo: {
        ...base.solo!,
        camadas: [...base.solo!.camadas, { id: 'areia', nome: 'Areia', cor: '#ccb060' }],
      },
    }
    const falha = await servico
      .editarCenario(
        ator,
        cenario.id,
        { ...lote, comandos: [{ tipo: 'base.definir', base: divergente }] },
        { espacoId: espaco!.id, conferidos: prova },
      )
      .catch((e: unknown) => e)
    expect(falha).toBeInstanceOf(CenarioArquivoAusenteError)
    expect((await repo.blobsConfirmados(espaco!.id, [a, b])).size).toBe(0)
    expect((await repo.cenario(cenario.id))!.revisao).toBe(0)
    await servico.editarCenario(ator, cenario.id, lote, { espacoId: espaco!.id, conferidos: prova })
    expect((await repo.blobsConfirmados(espaco!.id, [a, b])).size).toBe(2)
    const semBuracos = { ...base, buracos: [] }
    await servico.editarCenario(ator, cenario.id, {
      revisaoEsperada: 1,
      operacaoId: 'solo-prova-0002',
      comandos: [{ tipo: 'base.definir', base: semBuracos }],
    })
    const desfeito = await servico.moverHistorico(ator, cenario.id, {
      revisaoEsperada: 2,
      acao: 'desfazer',
      operacaoId: 'solo-undo-0001',
    })
    expect(desfeito.documento.base).toEqual(base)
    const copia = await servico.duplicarCenario(ator, cenario.id)
    expect((await servico.apagarCenario(ator, cenario.id)).apagar).not.toContain(
      chaveDoBlob(espaco!.id, b),
    )
    expect((await repo.blobsConfirmados(espaco!.id, [a, b])).size).toBe(2)
    const removidos = await servico.apagarCenario(ator, copia.id)
    expect(removidos.apagar).toContain(chaveDoBlob(espaco!.id, a))
    expect(removidos.apagar).toContain(chaveDoBlob(espaco!.id, b))
    expect((await repo.blobsConfirmados(espaco!.id, [a, b])).size).toBe(0)
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

  test('exportação reabre revisão e licença reais no Postgres, inclusive modelo fixado removido do catálogo', async () => {
    const { espaco, biblioteca } = await comBiblioteca(),
      ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      comum = { ...ator, equipe: false },
      abrir = () => new CenariosService(repo, () => AGORA, { modo: 'aberto', lista: new Set() }),
      s = abrir()
    await guardar(espaco.id, 'a')
    const [m] = (await repo.criarModelos(
        biblioteca.id,
        [modelo('a', 'Árvore')],
        10,
        CONTA,
        AGORA,
      ))!,
      mundo = await s.criarMundo(ator, espaco.id, 'Mundo'),
      c = await s.criarCenario(ator, mundo.id, 'Vila')
    await s.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [
        {
          tipo: 'modelo.definir',
          modelo: { id: 'm', modelo: m!.id, biblioteca: biblioteca.id, digest: digest('a') },
        },
        {
          tipo: 'instancia.criar',
          instancia: {
            id: 'o',
            nome: 'Árvore',
            grupo: null,
            modelo: 'm',
            oculto: false,
            bloqueado: false,
            apoio: { tipo: 'absoluto' },
            colisao: 'caixa',
            transformacao: {
              posicao: { x: 0, y: 0, z: 0 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        },
      ],
    })
    const antes = await repo.cenario(c.id),
      p = await abrir().exportacao.preparar(ator, c.id, 1)
    expect(p.documento).toEqual(antes!.documento)
    expect(p.contexto.bibliotecas).toEqual([
      { id: biblioteca.id, nome: 'Aventura', licenca: 'restrita' },
    ])
    // Esperar a consulta antes da asserção evita o bloqueio de IO do matcher
    // rejects do Bun 1.3.11 com uma conexão postgres.js já aquecida.
    expect(
      await abrir()
        .exportacao.preparar(comum, c.id, 1)
        .catch((e) => e),
    ).toBeInstanceOf(BibliotecaRestritaError)
    expect(
      await abrir()
        .exportacao.preparar(ator, c.id, 0)
        .catch((e) => e),
    ).toBeInstanceOf(CenarioDesatualizadoError)
    expect(
      await abrir()
        .exportacao.preparar({ ...comum, contaId: randomUUID() }, c.id, 1)
        .catch((e) => e),
    ).toBeInstanceOf(CenarioNaoEncontradoError)
    await repo.editarBiblioteca(biblioteca.id, { nome: 'Meus modelos', licenca: 'propria' }, AGORA)
    expect(await repo.apagarModelos(biblioteca.id, [m!.id], AGORA)).toEqual([])
    const livre = await abrir().exportacao.preparar(comum, c.id, 1)
    expect(livre.contexto).toEqual({
      equipe: false,
      bibliotecas: [{ id: biblioteca.id, nome: 'Meus modelos', licenca: 'propria' }],
    })
    expect(livre.digest).toBe(p.digest)
    expect(await repo.cenario(c.id)).toEqual(antes)
  })

  test('retratos: imagem da revisão atrasada não troca a capa; repetição, histórico e coleta são coerentes', async () => {
    const { espaco } = await comBiblioteca(),
      ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const mundo = await s.criarMundo(ator, espaco.id, 'Retratos'),
      c = await s.criarCenario(ator, mundo.id, 'Praça')
    const imagens = ['a', 'b', 'c'].map((l) => ({
      digest: digest(l),
      bytes: 128,
      tipoDoConteudo: 'image/png' as const,
    }))
    await repo.reservarBlobs(
      espaco.id,
      imagens.map((i) => ({ ...i, tipo: 'capa' as const })),
      AGORA,
      DEPOIS,
    )
    await s.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      operacaoId: 'foto-editar-cenario',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Praça habitada' }],
    })
    const gravar = (revisao: number, n: number, agora = AGORA) =>
      repo.definirCapa(
        {
          cenarioId: c.id,
          revisao,
          digest: imagens[n]!.digest,
          autorId: CONTA,
          recurso: { espacoId: espaco.id, conferido: imagens[n]! },
        },
        agora,
      )
    expect(await gravar(1, 1)).toMatchObject({ revisao: 1, digest: digest('b'), atual: true })
    const antes = await repo.cenario(c.id)
    expect(await gravar(0, 0, new Date(AGORA.getTime() + 1000))).toMatchObject({
      revisao: 0,
      digest: digest('a'),
      atual: false,
    })
    expect(await repo.cenario(c.id)).toEqual(antes)
    expect(await gravar(0, 2)).toMatchObject({ digest: digest('a') })
    expect((await repo.blobsConfirmados(espaco.id, [digest('c')])).size).toBe(0)
    expect(await gravar(2, 2).catch((e) => e)).toBeInstanceOf(CenarioInvalidoError)
    expect((await repo.blobsConfirmados(espaco.id, [digest('c')])).size).toBe(0)
    expect([...(await repo.retratos(c.id, [0, 1, 2]))].sort((a, b) => a[0] - b[0])).toEqual([
      [0, digest('a')],
      [1, digest('b')],
    ])
    expect((await repo.apagarCenario(c.id)).sort()).toEqual([digest('a'), digest('b')])
    expect((await repo.blobsConfirmados(espaco.id, [digest('a'), digest('b')])).size).toBe(0)
  })

  test('retratos: falha adiada até commit não confirma arquivo nem associa imagem/capa', async () => {
    const { espaco } = await comBiblioteca(),
      ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() }),
      mundo = await s.criarMundo(ator, espaco.id, 'Falha do retrato'),
      c = await s.criarCenario(ator, mundo.id, 'Vila')
    const imagem = { digest: digest('e'), bytes: 128, tipoDoConteudo: 'image/png' as const }
    await repo.reservarBlobs(espaco.id, [{ ...imagem, tipo: 'capa' }], AGORA, DEPOIS)
    await conn.sql.unsafe(
      "create function members.falhar_retrato_qa() returns trigger language plpgsql as $$ begin raise exception 'falha no commit do retrato'; end $$",
    )
    await conn.sql.unsafe(
      'create constraint trigger falhar_retrato_qa after insert on members.cenario_retratos deferrable initially deferred for each row execute function members.falhar_retrato_qa()',
    )
    try {
      const erro = await repo
        .definirCapa(
          {
            cenarioId: c.id,
            revisao: 0,
            digest: imagem.digest,
            autorId: CONTA,
            recurso: { espacoId: espaco.id, conferido: imagem },
          },
          AGORA,
        )
        .catch((e) => e)
      expect(erro).toBeInstanceOf(Error)
      expect((await repo.retratos(c.id, [0])).size).toBe(0)
      expect((await repo.blobsConfirmados(espaco.id, [imagem.digest])).size).toBe(0)
      expect((await repo.cenario(c.id))!.capa).toBeNull()
    } finally {
      await conn.sql.unsafe(
        'drop trigger falhar_retrato_qa on members.cenario_retratos; drop function members.falhar_retrato_qa()',
      )
    }
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
    await repo.reservarBlobs(
      espaco.id,
      [{ digest: digest('f'), bytes: 128, tipo: 'capa', tipoDoConteudo: 'image/png' }],
      AGORA,
      DEPOIS,
    )
    await repo.definirCapa(
      {
        cenarioId: id,
        revisao: 0,
        digest: digest('f'),
        autorId: CONTA,
        recurso: {
          espacoId: espaco.id,
          conferido: { digest: digest('f'), bytes: 128, tipoDoConteudo: 'image/png' },
        },
      },
      AGORA,
    )
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

  test('camadas, organização e cadeados persistem em JSONB e conservam undo após reabrir o serviço', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const montar = () =>
      new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const servico = montar()
    const [espaco] = await servico.espacos(ator)
    const mundo = await servico.criarMundo(ator, espaco!.id, 'Organização')
    const cenario = await servico.criarCenario(ator, mundo.id, 'Camadas')
    await servico.editarCenario(ator, cenario.id, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [
        {
          tipo: 'camada.definir',
          camada: { id: 'natureza', nome: 'Natureza', bloqueado: false, oculto: false },
        },
        {
          tipo: 'grupo.definir',
          grupo: {
            id: 'grupo',
            nome: 'Jardim',
            grupo: null,
            camada: 'natureza',
            bloqueado: false,
            oculto: false,
          },
        },
        {
          tipo: 'forma.definir',
          forma: {
            id: 'forma',
            nome: 'Caixa',
            tipo: 'caixa',
            largura: 1,
            altura: 1,
            comprimento: 1,
          },
        },
        {
          tipo: 'instancia.criar',
          instancia: {
            id: 'objeto',
            nome: 'Caixa',
            modelo: 'forma',
            grupo: 'grupo',
            bloqueado: false,
            oculto: false,
            colisao: 'caixa',
            apoio: { tipo: 'absoluto' },
            transformacao: {
              posicao: { x: 1, y: 2, z: 3 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        },
      ],
    })
    await servico.editarCenario(ator, cenario.id, {
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
      comandos: [
        {
          tipo: 'camada.definir',
          camada: { id: 'natureza', nome: 'Natureza', bloqueado: true, oculto: true },
        },
      ],
    })
    const recusado = await servico
      .editarCenario(ator, cenario.id, {
        revisaoEsperada: 2,
        operacaoId: randomUUID(),
        comandos: [
          { tipo: 'elementos.organizar', ids: ['objeto'], destino: { grupo: null, camada: null } },
        ],
      })
      .catch((e: unknown) => e)
    expect(recusado).toBeInstanceOf(CenarioInvalidoError)
    expect((await servico.abrirCenario(ator, cenario.id)).revisao).toBe(2)
    const reaberto = montar()
    const desfeito = await reaberto.moverHistorico(ator, cenario.id, {
      revisaoEsperada: 2,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.camadas![0]).toMatchObject({ bloqueado: false, oculto: false })
    expect(desfeito.documento.instancias[0]!.grupo).toBe('grupo')
    const refeito = await reaberto.moverHistorico(ator, cenario.id, {
      revisaoEsperada: 3,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento.camadas![0]).toMatchObject({ bloqueado: true, oculto: true })
    expect(refeito.documento.instancias[0]!.transformacao.posicao).toEqual({ x: 1, y: 2, z: 3 })
    expect((await reaberto.documentoNaRevisao(ator, cenario.id, 1)).camadas![0]!.bloqueado).toBe(
      false,
    )
    expect((await reaberto.documentoNaRevisao(ator, cenario.id, 2)).camadas![0]!.bloqueado).toBe(
      true,
    )
  })

  test('snapshots de conjuntos em comandos, clipboard e restauração conservam arquivos sem catálogo e os liberam na última exclusão', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    await guardar(espaco.id, 'a')
    const [m] = (await repo.criarModelos(biblioteca.id, [modelo('a', 'Banco')], 10, CONTA, AGORA))!
    const texturas = []
    for (const letra of ['e', 'f']) {
      const imagem = { digest: digest(letra), bytes: 128, tipoDoConteudo: 'image/png' as const }
      await s.reservarTexturas(ator, biblioteca.id, [imagem])
      const [t] = await s.registrarTexturas(
        ator,
        biblioteca.id,
        [
          {
            nome: letra,
            pasta: '',
            etiquetas: [],
            digest: imagem.digest,
            largura: 2,
            altura: 2,
            repeticaoMetros: 2,
          },
        ],
        [{ ...imagem, largura: 2, altura: 2 }],
        espaco.id,
      )
      texturas.push(t!)
    }
    const fonte = criarDocumentoVazio('fonte', 'Banco')
    fonte.modelos = [
      {
        id: 'banco',
        biblioteca: biblioteca.id,
        modelo: m!.id,
        digest: m!.digest,
        volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 3, z: 1 } },
      },
    ]
    fonte.texturas = [
      { id: 't', biblioteca: biblioteca.id, textura: texturas[0]!.id, digest: texturas[0]!.digest },
    ]
    fonte.instancias = [
      {
        id: 'b',
        nome: 'Banco',
        modelo: 'banco',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'malha',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 0, y: 0, z: 0 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
        aparencia: { textura: { id: 't', repeticaoMetros: 2 } },
      },
    ]
    const definicao: DefinicaoDeConjunto = {
      id: 'def',
      biblioteca: biblioteca.id,
      conjunto: randomUUID(),
      revisao: 1,
      nome: 'Banco',
      conteudo: capturarFragmento(fonte, ['b'], espaco.id),
    }
    const montagem = {
      id: 'copia',
      nome: 'Banco',
      grupo: null,
      bloqueado: false,
      oculto: false,
      definicao: 'def',
      transformacao: {
        posicao: { x: 5, y: 0, z: 5 },
        rotacao: { x: 0, y: 0.5, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    }
    const mundo = await s.criarMundo(ator, espaco.id, 'Conjuntos'),
      cenarios: string[] = []
    for (const modo of ['definicao', 'clipboard', 'restauracao']) {
      const c = await s.criarCenario(ator, mundo.id, modo)
      cenarios.push(c.id)
      const doc = {
        ...criarDocumentoVazio(c.id, modo),
        definicoesConjuntos: [definicao],
        montagens: [montagem],
      }
      const comandos: ComandoDeCenario[] =
        modo === 'definicao'
          ? [
              { tipo: 'conjunto.definir', definicao },
              { tipo: 'montagem.definir', montagem },
            ]
          : modo === 'clipboard'
            ? [
                {
                  tipo: 'fragmento.colar',
                  fragmento: capturarFragmento(doc, ['copia'], espaco.id),
                  prefixo: 'colar',
                  ponto: { x: 0, y: 0, z: 0 },
                },
              ]
            : [{ tipo: 'cenario.restaurar', documento: doc }]
      await s.editarCenario(ator, c.id, { revisaoEsperada: 0, operacaoId: randomUUID(), comandos })
      if (modo === 'definicao') {
        const nova = structuredClone(definicao)
        nova.id = 'def-2'
        nova.revisao = 2
        nova.conteudo.texturas = [
          {
            id: 't',
            biblioteca: biblioteca.id,
            textura: texturas[1]!.id,
            digest: texturas[1]!.digest,
          },
        ]
        await s.editarCenario(ator, c.id, {
          revisaoEsperada: 1,
          operacaoId: randomUUID(),
          comandos: [{ tipo: 'conjunto.atualizar', definicao: nova }],
        })
      }
      const atual = await s.abrirCenario(ator, c.id)
      await s.editarCenario(ator, c.id, {
        revisaoEsperada: atual.revisao,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'cenario.restaurar', documento: criarDocumentoVazio(c.id, modo) }],
      })
    }
    expect(await repo.apagarBiblioteca(biblioteca.id, AGORA)).toEqual([])
    expect(
      (await repo.blobsConfirmados(espaco.id, [digest('a'), digest('e'), digest('f')])).size,
    ).toBe(3)
    expect(
      (await s.documentoNaRevisao(ator, cenarios[0]!, 2)).definicoesConjuntos![0]!.conteudo
        .texturas[0]!.digest,
    ).toBe(digest('f'))
    expect(await repo.apagarCenario(cenarios[1]!)).toEqual([])
    expect(await repo.apagarCenario(cenarios[2]!)).toEqual([])
    expect((await repo.apagarCenario(cenarios[0]!)).sort()).toEqual(
      [digest('a'), digest('e'), digest('f')].sort(),
    )
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
  })

  test('catálogo publica conjuntos nas cabeças em uma transação, com cota, conflito, limite e histórico preservados', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    await conn.sql`update members.cenario_espacos set limite_bytes = 10000000 where id = ${espaco.id}`
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const s = new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const fonte = criarDocumentoVazio('fonte', 'Jardim')
    fonte.formas = [
      { id: 'f', nome: 'Flor', tipo: 'caixa', largura: 0.4, altura: 0.8, comprimento: 0.4 },
    ]
    fonte.instancias = [
      {
        id: 'flor',
        nome: 'Flor',
        modelo: 'f',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 0, y: 0, z: 0 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
      },
    ]
    const conteudo = capturarFragmento(fonte, ['flor'], espaco.id),
      operacaoId = randomUUID()
    const dados = {
      id: randomUUID(),
      bibliotecaId: biblioteca.id,
      operacaoId,
      nome: 'Jardim',
      pasta: 'Vila',
      etiquetas: ['flores'],
      conteudo,
      autorId: CONTA,
    }
    const conjunto = (await repo.criarConjunto(dados, 10, AGORA))!
    expect(conjunto.revisao).toBe(1)
    expect(conjunto.objetos).toBe(1)
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(conjunto.bytes)
    expect((await repo.criarConjunto({ ...dados, id: randomUUID() }, 10, AGORA))!.id).toBe(
      conjunto.id,
    )
    expect(
      (await repo.conjuntos(biblioteca.id, { termos: ['jardim'], inicio: 0, limite: 10 })).total,
    ).toBe(1)
    const v1 = (await repo.versaoDoConjunto(conjunto.id, 1))!
    const definicao: DefinicaoDeConjunto = {
      id: 'def',
      biblioteca: biblioteca.id,
      conjunto: conjunto.id,
      revisao: 1,
      nome: v1.nome,
      conteudo: v1.conteudo,
    }
    const mundo = await s.criarMundo(ator, espaco.id, 'Mundo'),
      cenarios: string[] = []
    for (let i = 0; i < 2; i++) {
      const c = await s.criarCenario(ator, mundo.id, `C${i}`)
      cenarios.push(c.id)
      await s.editarCenario(ator, c.id, {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [
          { tipo: 'conjunto.definir', definicao },
          {
            tipo: 'montagem.definir',
            montagem: {
              id: 'jardim',
              nome: 'Jardim',
              grupo: null,
              bloqueado: false,
              oculto: false,
              definicao: 'def',
              apoio: { tipo: 'terreno', deslocamento: 0 },
              transformacao: {
                posicao: { x: i * 10, y: 0, z: 0 },
                rotacao: { x: 0, y: i * 0.3, z: 0 },
                escala: { x: 1, y: 1, z: 1 },
              },
            },
          },
        ],
      })
    }
    const modificado = structuredClone(conteudo)
    modificado.instancias[0]!.aparencia = { cor: '#bb4477' }
    const publicacao = {
      id: conjunto.id,
      revisaoEsperada: 1,
      operacaoId: randomUUID(),
      conteudo: modificado,
      autorId: CONTA,
    }
    const publicado = (await repo.publicarConjunto(publicacao, 1000, AGORA))!
    expect(publicado.conjunto.revisao).toBe(2)
    expect(publicado.cenarios.map((c) => c.id).sort()).toEqual([...cenarios].sort())
    const cabecas = await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))
    for (let i = 0; i < cabecas.length; i++) {
      expect(cabecas[i]!.revisao).toBe(2)
      expect(cabecas[i]!.documento.montagens![0]!.transformacao.posicao.x).toBe(i * 10)
      expect(cabecas[i]!.documento.montagens![0]!.apoio).toEqual({
        tipo: 'terreno',
        deslocamento: 0,
      })
      expect(
        cabecas[i]!.documento.definicoesConjuntos![0]!.conteudo.instancias[0]!.aparencia!.cor,
      ).toBe('#bb4477')
      expect(
        (await s.documentoNaRevisao(ator, cenarios[i]!, 1)).definicoesConjuntos![0]!.revisao,
      ).toBe(1)
    }
    expect((await repo.publicarConjunto(publicacao, 1000, AGORA))!.conjunto.revisao).toBe(2)
    expect((await s.abrirCenario(ator, cenarios[0]!)).revisao).toBe(2)
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(
      conjunto.bytes + publicado.conjunto.bytes,
    )
    expect(
      await repo
        .publicarConjunto({ ...publicacao, operacaoId: randomUUID() }, 1000, AGORA)
        .catch((e) => e),
    ).toBeInstanceOf(CenarioDesatualizadoError)
    await s.editarCenario(ator, cenarios[0]!, {
      revisaoEsperada: 2,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'montagem.atualizar', id: 'jardim', alteracoes: { bloqueado: true } }],
    })
    const bloqueadas = await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))
    expect(
      await repo
        .publicarConjunto(
          { ...publicacao, revisaoEsperada: 2, operacaoId: randomUUID() },
          1000,
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    expect(await repo.versaoDoConjunto(conjunto.id, 3)).toBeNull()
    expect(await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))).toEqual(bloqueadas)
    await s.editarCenario(ator, cenarios[0]!, {
      revisaoEsperada: 3,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'montagem.atualizar', id: 'jardim', alteracoes: { bloqueado: false } }],
    })
    const copias: ComandoDeCenario[] = Array.from({ length: 10 }, (_, i) => ({
      tipo: 'montagem.duplicar',
      id: 'jardim',
      novoId: `jardim-${i}`,
      deslocamento: { x: 2 * i, y: 0, z: 3 },
    }))
    await s.editarCenario(ator, cenarios[1]!, {
      revisaoEsperada: 2,
      operacaoId: randomUUID(),
      comandos: copias,
    })
    const grande = structuredClone(modificado)
    grande.instancias = Array.from({ length: 2000 }, (_, i) => ({
      ...structuredClone(modificado.instancias[0]!),
      id: `flor-${i}`,
    }))
    grande.raizes = grande.instancias.map((o) => o.id)
    const antesDoLimite = await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))
    expect(
      await repo
        .publicarConjunto(
          { ...publicacao, revisaoEsperada: 2, operacaoId: randomUUID(), conteudo: grande },
          1000,
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenarioInvalidoError)
    expect(await Promise.all(cenarios.map((id) => s.abrirCenario(ator, id)))).toEqual(antesDoLimite)
    expect((await repo.conjunto(conjunto.id))!.revisao).toBe(2)
    await conn.sql`update members.cenario_espacos set limite_bytes = ${(await repo.espaco(espaco.id))!.usadoBytes} where id = ${espaco.id}`
    expect(
      await repo
        .publicarConjunto(
          { ...publicacao, revisaoEsperada: 2, operacaoId: randomUUID() },
          1000,
          AGORA,
        )
        .catch((e) => e),
    ).toBeInstanceOf(CenariosSemEspacoError)
    expect((await repo.conjunto(conjunto.id))!.revisao).toBe(2)
    expect(await repo.apagarConjunto(conjunto.id, AGORA)).toEqual([])
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
    expect(
      (await s.abrirCenario(ator, cenarios[0]!)).documento.definicoesConjuntos![0]!.revisao,
    ).toBe(2)
    const [usos] = await conn.sql`select count(*)::int as n from members.cenario_conjunto_usos`
    expect(usos!.n).toBe(0)
  })

  test('catálogo protege modelos e retratos de cada revisão sem confundir miniatura atrasada com a cabeça', async () => {
    const { espaco, biblioteca } = await comBiblioteca()
    await guardar(espaco.id, 'a')
    for (const letra of ['e', 'f']) {
      await repo.reservarBlobs(
        espaco.id,
        [{ digest: digest(letra), bytes: 128, tipo: 'miniatura', tipoDoConteudo: 'image/png' }],
        AGORA,
        DEPOIS,
      )
      await repo.confirmarBlobs(
        espaco.id,
        [{ digest: digest(letra), bytes: 128, tipoDoConteudo: 'image/png' }],
        AGORA,
      )
    }
    const [m] = (await repo.criarModelos(
      biblioteca.id,
      [modelo('a', 'Banco', { miniatura: digest('e') })],
      10,
      CONTA,
      AGORA,
    ))!
    const catalogo = (await repo.criarBiblioteca(
      {
        id: randomUUID(),
        espacoId: espaco.id,
        nome: 'Conjuntos',
        licenca: 'propria',
        criadoPor: CONTA,
      },
      10,
      AGORA,
    ))!
    const fonte = criarDocumentoVazio('fonte', 'Banco')
    fonte.modelos = [
      {
        id: 'banco',
        biblioteca: biblioteca.id,
        modelo: m!.id,
        digest: m!.digest,
        volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 3, z: 1 } },
      },
    ]
    fonte.instancias = [
      {
        id: 'o',
        nome: 'Banco',
        modelo: 'banco',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'malha',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 0, y: 0, z: 0 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
      },
    ]
    const conteudo = capturarFragmento(fonte, ['o'], espaco.id)
    const c = (await repo.criarConjunto(
      {
        id: randomUUID(),
        bibliotecaId: catalogo.id,
        operacaoId: randomUUID(),
        nome: 'Banco',
        pasta: '',
        etiquetas: [],
        conteudo,
        autorId: CONTA,
      },
      10,
      AGORA,
    ))!
    expect(await repo.definirMiniaturaDoConjunto(c.id, 1, digest('e'), AGORA)).toBe(true)
    const editado = structuredClone(conteudo)
    editado.instancias[0]!.aparencia = { cor: '#bb4477' }
    await repo.publicarConjunto(
      { id: c.id, revisaoEsperada: 1, operacaoId: randomUUID(), conteudo: editado, autorId: CONTA },
      1000,
      AGORA,
    )
    expect((await repo.conjunto(c.id))!.miniatura).toBeNull()
    expect(await repo.apagarBiblioteca(biblioteca.id, AGORA)).toEqual([])
    expect((await repo.blobsConfirmados(espaco.id, [digest('a'), digest('e')])).size).toBe(2)
    expect(
      await repo.definirMiniaturaDoConjunto(c.id, 2, digest('a'), AGORA).catch((e) => e),
    ).toBeInstanceOf(CenarioArquivoAusenteError)
    expect(await repo.definirMiniaturaDoConjunto(c.id, 1, digest('f'), AGORA)).toBe(true)
    expect((await repo.versaoDoConjunto(c.id, 1))!.miniatura).toBe(digest('f'))
    expect((await repo.conjunto(c.id))!.miniatura).toBeNull()
    expect((await repo.blobsConfirmados(espaco.id, [digest('e')])).size).toBe(0)
    expect(await repo.definirMiniaturaDoConjunto(c.id, 2, digest('f'), AGORA)).toBe(true)
    expect((await repo.conjunto(c.id))!.miniatura).toBe(digest('f'))
    expect((await repo.apagarConjunto(c.id, AGORA)).sort()).toEqual(
      [digest('a'), digest('f')].sort(),
    )
    expect((await repo.espaco(espaco.id))!.usadoBytes).toBe(0)
  })

  test('pincelada preserva receita e amostras em JSONB; replay e undo não sorteiam novamente após reabrir', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }
    const montar = () =>
      new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() })
    const s = montar(),
      [espaco] = await s.espacos(ator)
    const m = await s.criarMundo(ator, espaco!.id, 'Pincel'),
      c = await s.criarCenario(ator, m.id, 'Jardim')
    const doc = criarDocumentoVazio(c.id, 'Jardim')
    doc.formas = [
      { id: 'flor', nome: 'Flor', tipo: 'caixa', largura: 0.4, altura: 0.8, comprimento: 0.4 },
    ]
    const receita = {
      prototipos: [
        {
          nome: 'Flor',
          modelo: 'flor',
          colisao: 'caixa' as const,
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
          aparencia: { cor: '#334455' },
        },
      ],
      traco: [
        { x: 0, z: 0 },
        { x: 3, z: 2 },
      ],
      raio: 5,
      densidade: 20,
      afastamento: 1,
      giro: Math.PI,
      tamanhoMin: 0.8,
      tamanhoMax: 1.2,
      semente: 77,
      limite: 50,
      evitarObjetos: true,
      grupo: null,
      camada: null,
    }
    const amostras = criarAmostradorDeEspalhamento(doc, receita)
      .gerar()
      .amostras.map((a, i) => ({ ...a, id: `flor-${i}` }))
    const comando: ComandoDeCenario = { tipo: 'objetos.espalhar', pincelada: { receita, amostras } }
    await s.editarCenario(ator, c.id, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'forma.definir', forma: doc.formas[0]! }, comando],
    })
    const salvo = await s.abrirCenario(ator, c.id)
    expect(salvo.documento.instancias.length).toBeGreaterThan(5)
    const [lote] = await repo.lotesEntre(c.id, 0, 1)
    expect(lote!.comandos[1]).toEqual(comando)
    const reaberto = montar()
    expect(await reaberto.documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await reaberto.moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.instancias).toEqual([])
    expect(desfeito.documento.formas ?? []).toEqual([])
    const refeito = await reaberto.moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
    const recusado = await reaberto
      .editarCenario(ator, c.id, {
        revisaoEsperada: 3,
        operacaoId: randomUUID(),
        comandos: [comando],
      })
      .catch((e: unknown) => e)
    expect(recusado).toBeInstanceOf(CenarioInvalidoError)
    expect((await reaberto.abrirCenario(ator, c.id)).revisao).toBe(3)
  })

  test('água e pose de apoio conservam variantes e aparência no JSONB, replay, resposta repetida e histórico', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      montar = () =>
        new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set<string>() }),
      s = montar(),
      [espaco] = await s.espacos(ator),
      m = await s.criarMundo(ator, espaco!.id, 'Água'),
      c = await s.criarCenario(ator, m.id, 'Lago')
    const doc = criarDocumentoVazio(c.id, 'Lago'),
      comum = { nome: 'Água', grupo: null, oculto: false, bloqueado: false },
      contorno = [
        { x: -8, z: -8 },
        { x: 8, z: -8 },
        { x: 8, z: 8 },
        { x: -8, z: 8 },
      ],
      lago = {
        ...comum,
        tipo: 'lago',
        id: 'lago',
        modelo: null,
        centro: { x: 0, z: 0 },
        giro: 0.4,
        escala: 2,
        nivel: 3,
        profundidade: 2,
        contorno,
        recorte: contorno,
        origemPreenchimento: { x: 1, z: 1 },
        ilhas: [
          [
            { x: -1, z: -1 },
            { x: 1, z: -1 },
            { x: 0, z: 1 },
          ],
        ],
        aparencia: { corRasa: '#abcdef', ondas: { altura: 0.1, comprimento: 2, velocidade: 0.5 } },
      }
    doc.aguas = [
      AguaSchema.parse(lago),
      AguaSchema.parse({ ...comum, tipo: 'mar', id: 'mar', nivel: -2, nado: false }),
      AguaSchema.parse({
        ...lago,
        tipo: 'represa',
        id: 'represa',
        barragem: { de: { x: -3, z: -5 }, ate: { x: 3, z: -5 }, crista: 4, largura: 2 },
      }),
      AguaSchema.parse({
        ...comum,
        tipo: 'rio',
        id: 'rio',
        largura: 3,
        profundidade: 1.4,
        profundidadeDoLeito: 2,
        correnteza: 1,
        suave: true,
        controle: [
          { x: 20, z: 0 },
          { x: 30, z: 0 },
        ],
        pontos: [
          { x: 20, y: 4, z: 0 },
          { x: 30, y: 2, z: 0 },
        ],
      }),
      AguaSchema.parse({
        ...comum,
        tipo: 'cachoeira',
        id: 'queda',
        largura: 3,
        giro: 0,
        topo: { x: 30, y: 4, z: 0 },
        base: { x: 30, y: 0, z: 0 },
        nado: false,
      }),
    ]
    doc.formas = [
      { id: 'f', nome: 'Barco de teste', tipo: 'caixa', largura: 2, altura: 1, comprimento: 4 },
    ]
    const t = {
      posicao: { x: 3, y: 3.2, z: 3 },
      rotacao: { x: 0.1, y: 0.2, z: 0.3 },
      escala: { x: 2, y: 3, z: 1 },
    }
    doc.instancias = [
      {
        ...comum,
        id: 'barco',
        modelo: 'f',
        colisao: 'caixa',
        transformacao: t,
        apoio: apoioNaAgua(doc, 'lago', t),
      },
    ]
    const comandos: ComandoDeCenario[] = [
      { tipo: 'forma.definir', forma: doc.formas[0]! },
      ...doc.aguas.map((agua) => ({ tipo: 'agua.definir' as const, agua })),
      { tipo: 'instancia.criar', instancia: doc.instancias[0]! },
    ]
    const lote = { revisaoEsperada: 0, operacaoId: randomUUID(), comandos }
    await s.editarCenario(ator, c.id, lote)
    await montar().editarCenario(ator, c.id, lote)
    const salvo = await montar().abrirCenario(ator, c.id)
    expect(salvo.revisao).toBe(1)
    expect(salvo.documento.aguas).toEqual(doc.aguas)
    expect(salvo.documento.instancias[0]!.apoio).toEqual(doc.instancias[0]!.apoio)
    expect((await repo.lotesEntre(c.id, 0, 1))[0]!.comandos).toEqual(comandos)
    expect(await montar().documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.aguas).toEqual([])
    expect(desfeito.documento.instancias).toEqual([])
    const refeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
  })

  test('seis variantes de caminho conservam parâmetros e material no JSONB e histórico', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      montar = () =>
        new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set<string>() })
    const s = montar(),
      [espaco] = await s.espacos(ator),
      mundo = await s.criarMundo(ator, espaco!.id, 'Caminhos'),
      c = await s.criarCenario(ator, mundo.id, 'Circulação')
    const comum = {
      nome: 'Caminho',
      grupo: null,
      bloqueado: false,
      oculto: false,
      acabamento: null,
      largura: 2.5,
      pontos: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
    }
    const caminhos = [
      { ...comum, id: 'trilha', tipo: 'trilha', suave: true, aparencia: { cor: '#b89163' } },
      { ...comum, id: 'praca', tipo: 'praca', pontos: [...comum.pontos, { x: 5, z: 5 }] },
      {
        ...comum,
        id: 'estrada',
        tipo: 'estrada',
        molde: { borda: 1, suavizacao: 8, deslocamento: -0.2 },
      },
      { ...comum, id: 'cerca', tipo: 'cerca', altura: 1.2, comprimentoDoModulo: 2 },
      { ...comum, id: 'muro', tipo: 'muro', altura: 2.4, comprimentoDoModulo: 3 },
      {
        ...comum,
        id: 'ponte',
        tipo: 'ponte',
        cotas: { de: 3, ate: 4 },
        pilares: { espacamento: 4, largura: 0.4, afastamentoLateral: 0.6 },
      },
    ].map((caminho) => CaminhoSchema.parse(caminho))
    const lote = {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: caminhos.map((caminho) => ({ tipo: 'caminho.definir' as const, caminho })),
    }
    await s.editarCenario(ator, c.id, lote)
    await montar().editarCenario(ator, c.id, lote)
    const salvo = await montar().abrirCenario(ator, c.id)
    expect(salvo.revisao).toBe(1)
    expect(salvo.documento.caminhos).toEqual(caminhos)
    expect((await repo.lotesEntre(c.id, 0, 1))[0]!.comandos).toEqual(lote.comandos)
    expect(await montar().documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.caminhos).toEqual([])
    const refeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
  })

  test('caminhos copiados usam o mesmo JSONB e histórico sem copiar o terreno', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      montar = () =>
        new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set<string>() }),
      s = montar(),
      [espaco] = await s.espacos(ator),
      mundo = await s.criarMundo(ator, espaco!.id, 'Passeio'),
      c = await s.criarCenario(ator, mundo.id, 'Destino'),
      origem = criarDocumentoVazio('origem', 'Origem')
    origem.caminhos = [
      CaminhoSchema.parse({
        id: 'ponte',
        nome: 'Ponte',
        grupo: null,
        bloqueado: false,
        oculto: false,
        tipo: 'ponte',
        acabamento: null,
        largura: 3,
        cotas: { de: 4, ate: 5 },
        pontos: [
          { x: 0, z: 0 },
          { x: 20, z: 0 },
        ],
      }),
    ]
    origem.formas = [
      { id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 },
    ]
    const t = {
      posicao: { x: 10, y: 4.5, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    }
    origem.instancias = [
      {
        id: 'o',
        nome: 'Caixa',
        modelo: 'f',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'caixa',
        transformacao: t,
        apoio: apoioNaSuperficie(origem, 'ponte', t.posicao, undefined, 'tabuleiro/0'),
      },
    ]
    const fragmento = capturarFragmento(origem, ['ponte', 'o'], espaco!.id),
      lote = {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [
          {
            tipo: 'fragmento.colar' as const,
            fragmento,
            prefixo: 'p',
            ponto: {
              x: fragmento.ancora.x + 10,
              y: fragmento.ancora.y + 2,
              z: fragmento.ancora.z + 4,
            },
          },
        ],
      }
    await s.editarCenario(ator, c.id, lote)
    await montar().editarCenario(ator, c.id, lote)
    const salvo = await montar().abrirCenario(ator, c.id)
    expect(salvo.revisao).toBe(1)
    expect(salvo.documento.caminhos[0]).toMatchObject({
      id: 'p/caminho/0',
      cotas: { de: 6, ate: 7 },
      pontos: [
        { x: 10, z: 4 },
        { x: 30, z: 4 },
      ],
    })
    expect(salvo.documento.base).toEqual(origem.base)
    expect(salvo.documento.instancias[0]!.apoio).toMatchObject({
      tipo: 'objeto',
      objeto: 'p/caminho/0',
      parte: 'tabuleiro/0',
    })
    expect((await repo.lotesEntre(c.id, 0, 1))[0]!.comandos).toEqual(lote.comandos)
    expect(await montar().documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.caminhos).toEqual([])
    expect(desfeito.documento.instancias).toEqual([])
    const refeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
  })

  test('fragmento com água e apoio conserva JSONB, replay idempotente e undo/redo após reabrir', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      montar = () =>
        new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set<string>() })
    const s = montar(),
      [espaco] = await s.espacos(ator),
      mundo = await s.criarMundo(ator, espaco!.id, 'Água copiada'),
      c = await s.criarCenario(ator, mundo.id, 'Destino')
    const origem = criarDocumentoVazio('origem', 'Origem'),
      comum = { grupo: null, oculto: false, bloqueado: false },
      contorno = [
        { x: -8, z: -8 },
        { x: 8, z: -8 },
        { x: 8, z: 8 },
        { x: -8, z: 8 },
      ]
    origem.grupos = [{ ...comum, id: 'g', nome: 'Lago e barco' }]
    origem.aguas = [
      AguaSchema.parse({
        ...comum,
        id: 'lago',
        nome: 'Lago',
        grupo: 'g',
        tipo: 'lago',
        modelo: null,
        centro: { x: 0, z: 0 },
        nivel: 3,
        profundidade: 2,
        giro: 0.4,
        escala: 2,
        contorno,
        recorte: contorno,
        nado: false,
        aparencia: { corRasa: '#abcdef' },
      }),
    ]
    origem.formas = [
      { id: 'f', nome: 'Barco', tipo: 'caixa', largura: 2, altura: 1, comprimento: 4 },
    ]
    const t = {
      posicao: { x: 3, y: 3.2, z: 3 },
      rotacao: { x: 0.1, y: 0.2, z: 0.3 },
      escala: { x: 2, y: 3, z: 1 },
    }
    origem.instancias = [
      {
        ...comum,
        id: 'barco',
        nome: 'Barco',
        grupo: 'g',
        modelo: 'f',
        colisao: 'caixa',
        transformacao: t,
        apoio: apoioNaAgua(origem, 'lago', t),
      },
    ]
    const fragmento = capturarFragmento(origem, ['g'], espaco!.id),
      lote = {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [
          {
            tipo: 'fragmento.colar' as const,
            fragmento,
            prefixo: 'p',
            ponto: { x: fragmento.ancora.x + 20, y: fragmento.ancora.y + 2, z: fragmento.ancora.z },
          },
        ],
      }
    await s.editarCenario(ator, c.id, lote)
    await montar().editarCenario(ator, c.id, lote)
    const salvo = await montar().abrirCenario(ator, c.id)
    expect(salvo.revisao).toBe(1)
    expect(salvo.documento.aguas[0]).toMatchObject({
      id: 'p/agua/0',
      nivel: 5,
      nado: false,
      aparencia: { corRasa: '#abcdef' },
    })
    expect(salvo.documento.instancias[0]!.apoio).toMatchObject({ tipo: 'agua', agua: 'p/agua/0' })
    expect((await repo.lotesEntre(c.id, 0, 1))[0]!.comandos).toEqual(lote.comandos)
    expect(await montar().documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.aguas).toEqual([])
    expect(desfeito.documento.instancias).toEqual([])
    const refeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
  })

  test('metadados de jogo e ambiente conservam tipos, JSONB e histórico sem aba de editor', async () => {
    const ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false },
      montar = () => new CenariosService(repo, () => AGORA, { modo: 'equipe', lista: new Set() }),
      s = montar(),
      [espaco] = await s.espacos(ator),
      mundo = await s.criarMundo(ator, espaco!.id, 'Jogo'),
      c = await s.criarCenario(ator, mundo.id, 'Metadados')
    const configuracoes = [
        { tipo: 'inicio', principal: true },
        { tipo: 'zona', forma: { tipo: 'esfera', raio: 3.5 } },
        {
          tipo: 'rota',
          pontos: [
            { x: 0, y: 0, z: 0 },
            { x: 5, y: 1, z: 3 },
          ],
          fechada: false,
          seguirTerreno: false,
        },
        { tipo: 'camera', alvo: { x: 0, y: 0, z: -5 }, campoDeVisao: 48 },
        {
          tipo: 'luz',
          luz: {
            tipo: 'foco',
            cor: '#ffeebb',
            intensidade: 40,
            alcance: 12,
            decaimento: 2,
            sombra: true,
            alvo: { x: 0, y: -1, z: -2 },
            angulo: 35,
            penumbra: 0.3,
          },
        },
      ],
      marcadores = configuracoes.map((configuracao, i) =>
        MarcadorSchema.parse({
          id: `m${i}`,
          nome: `Marco ${i}`,
          grupo: null,
          bloqueado: false,
          oculto: false,
          posicao: { x: 2, y: 3, z: 4 },
          giro: 0.4,
          noChao: false,
          objeto: i === 1 ? 'objeto-jogo' : null,
          propriedades: { texto: 'Oficina', numero: 1.25, sim: true },
          configuracao,
        }),
      ),
      iluminacao = IluminacaoSchema.parse({
        hora: 18.5,
        ceu: { tipo: 'cor', cor: '#bcd9ee' },
        nevoa: { tipo: 'linear', cor: '#c3ddeb', perto: 20, longe: 250 },
        sol: { direcao: { x: 1, y: 2, z: 1 }, cor: '#ffdfba', intensidade: 2, sombra: true },
      }),
      lote = {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [
          {
            tipo: 'forma.definir' as const,
            forma: {
              id: 'forma-jogo',
              nome: 'Bloco',
              tipo: 'caixa' as const,
              largura: 1,
              altura: 1,
              comprimento: 1,
            },
          },
          {
            tipo: 'instancia.criar' as const,
            instancia: {
              id: 'objeto-jogo',
              nome: 'Oficina',
              modelo: 'forma-jogo',
              grupo: null,
              bloqueado: false,
              oculto: false,
              colisao: 'caixa' as const,
              apoio: { tipo: 'absoluto' as const },
              transformacao: {
                posicao: { x: 0, y: 0, z: 0 },
                rotacao: { x: 0, y: 0, z: 0 },
                escala: { x: 1, y: 1, z: 1 },
              },
            },
          },
          ...marcadores.map((marcador) => ({ tipo: 'marcador.definir' as const, marcador })),
          { tipo: 'iluminacao.definir' as const, iluminacao },
        ],
      }
    await s.editarCenario(ator, c.id, lote)
    await montar().editarCenario(ator, c.id, lote)
    const salvo = await montar().abrirCenario(ator, c.id)
    expect(salvo.revisao).toBe(1)
    expect(salvo.documento.marcadores).toEqual(marcadores)
    expect(salvo.documento.iluminacao).toEqual(iluminacao)
    expect(await montar().documentoNaRevisao(ator, c.id, 1)).toEqual(salvo.documento)
    const desfeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 1,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(desfeito.documento.marcadores).toEqual([])
    expect(desfeito.documento.iluminacao).toEqual({ hora: 12 })
    const refeito = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 2,
      acao: 'refazer',
      operacaoId: randomUUID(),
    })
    expect(refeito.documento).toEqual(salvo.documento)
    await montar().editarCenario(ator, c.id, {
      revisaoEsperada: 3,
      operacaoId: randomUUID(),
      comandos: [
        { tipo: 'marcadores.desassociar', objetos: ['objeto-jogo'] },
        { tipo: 'instancia.remover', id: 'objeto-jogo' },
      ],
    })
    const semObjeto = await montar().abrirCenario(ator, c.id)
    expect(semObjeto.documento.instancias).toEqual([])
    expect(semObjeto.documento.marcadores[1]!.objeto).toBeNull()
    expect(semObjeto.documento.marcadores[1]!.propriedades).toEqual(marcadores[1]!.propriedades)
    const restaurado = await montar().moverHistorico(ator, c.id, {
      revisaoEsperada: 4,
      acao: 'desfazer',
      operacaoId: randomUUID(),
    })
    expect(restaurado.documento).toEqual(salvo.documento)
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
