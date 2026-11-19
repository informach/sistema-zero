import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { criarSnapshotDePublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import postgres from 'postgres'
import { exemplo, glb } from '../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import { PublicacoesDeCenariosService } from '../../src/application/cenarios/publicacoes.service'
import type { Ator } from '../../src/domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
} from '../../src/domain/cenarios/cenarios.errors'
import { DrizzleCenariosRepository } from '../../src/infrastructure/persistence/drizzle/cenarios.repository'
import { DrizzlePublicacoesDeCenariosRepository } from '../../src/infrastructure/persistence/drizzle/cenarios-publicacoes.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

const url = process.env.CENARIOS_TEST_DATABASE_URL
const nome = url ? new URL(url).pathname.slice(1) : ''
if (
  url &&
  (!/^cenarios_[a-z0-9_]+$/.test(nome) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname))
)
  throw Error('A publicação deve ser ensaiada em PostgreSQL local descartável cenarios_*')

describe.skipIf(!url)('publicação versionada de cenários (PostgreSQL)', () => {
  let conn: DbConnection
  let autoria: DrizzleCenariosRepository
  let repo: DrizzlePublicacoesDeCenariosRepository
  let cenarios: CenariosService
  let servico: PublicacoesDeCenariosService
  const ator: Ator = {
    usuarioId: crypto.randomUUID(),
    contaId: crypto.randomUUID(),
    equipe: true,
    suporte: false,
  }
  beforeAll(async () => {
    const manutencao = new URL(url!)
    manutencao.pathname = '/postgres'
    const admin = postgres(manutencao.toString(), { max: 1, onnotice: () => {} })
    try {
      await admin.unsafe(`create database ${nome}`)
    } catch (e) {
      if ((e as { code?: string }).code !== '42P04') throw e
    } finally {
      await admin.end({ timeout: 2 })
    }
    conn = createDbConnection(url!, { max: 6 })
    await conn.sql.unsafe('drop schema if exists members cascade; create schema members')
    const base = new URL(
      '../../src/infrastructure/persistence/drizzle/migrations/',
      import.meta.url,
    )
    const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', base), 'utf8')) as {
      entries: { idx: number; tag: string }[]
    }
    for (const entrada of journal.entries.filter(
      (e) => (e.idx >= 151 && e.idx <= 162) || e.tag === '0164_cenarios_publicacoes',
    )) {
      const ddl = readFileSync(new URL(`${entrada.tag}.sql`, base), 'utf8')
      for (const comando of ddl.split('--> statement-breakpoint'))
        if (comando.trim()) await conn.sql.unsafe(comando)
    }
    autoria = new DrizzleCenariosRepository(conn.db)
    repo = new DrizzlePublicacoesDeCenariosRepository(conn.db)
    cenarios = new CenariosService(autoria, () => new Date(), { modo: 'equipe', lista: new Set() })
    servico = new PublicacoesDeCenariosService(repo, autoria, cenarios, () => new Date())
  })
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    await conn.sql.unsafe('truncate members.cenario_espacos cascade')
  })

  async function preparar() {
    const espaco = (await cenarios.espacos(ator)).find((e) => e.tipo === 'equipe')!
    const mundo = await cenarios.criarMundo(ator, espaco.id, 'Faísca')
    const cenario = await cenarios.criarCenario(ator, mundo.id, 'Praça')
    const p = await cenarios.exportacao.preparar(ator, cenario.id, 0)
    const cena = {
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Praça',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { ...p.fonte, digest: p.digest },
      arquivos: [],
      entidades: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
    }
    const bytes = new TextEncoder().encode(JSON.stringify(cena))
    const pedido = {
      operacaoId: crypto.randomUUID(),
      perfil: { tipo: 'arquipelago-v2' as const, ilha: 'sua-ilha' as const },
      versaoEsperada: 0,
      fonte: cena.fonte,
      manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
    }
    const conferidos = [
      {
        ...pedido.manifesto,
        tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' as const,
      },
    ]
    await servico.reservarManifesto(ator, pedido)
    return { espaco, mundo, cenario, bytes, pedido, conferidos }
  }

  test('migração real, confirmação de arquivos e repetição preservam uma versão imutável', async () => {
    const b = await preparar()
    const a = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos)
    expect(a.publicacao.versao).toBe(1)
    expect(await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos)).toEqual({
      ...a,
      repetido: true,
    })
    expect(await repo.atual(b.pedido.perfil)).toEqual(a.publicacao)
    expect((await autoria.blobsConfirmados(b.espaco.id, [b.pedido.manifesto.digest])).size).toBe(1)
    expect(await repo.recursos(a.publicacao.id)).toHaveLength(1)
  })

  test('concorrência troca apontador apenas uma vez; versão anterior continua consultável', async () => {
    const b = await preparar()
    const resultados = await Promise.allSettled([
      servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos),
      servico.publicarConferido(
        ator,
        { ...b.pedido, operacaoId: crypto.randomUUID() },
        b.bytes,
        b.conferidos,
      ),
    ])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1)
    const primeira = (await repo.atual(b.pedido.perfil))!
    const segunda = await servico.publicarConferido(
      ator,
      { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 1 },
      b.bytes,
      b.conferidos,
    )
    expect(segunda.publicacao.versao).toBe(2)
    expect(await repo.porId(primeira.id)).toEqual(primeira)
  })

  test('arquivo sem reserva recusa tudo e não deixa publicação nem confirmação parcial', async () => {
    const b = await preparar()
    await conn.sql`delete from members.cenario_blobs where espaco_id=${b.espaco.id}`
    const resultado = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos).then(
      () => null,
      (erro) => erro,
    )
    expect(resultado).toBeInstanceOf(CenarioArquivoAusenteError)
    expect(await repo.atual(b.pedido.perfil)).toBeNull()
    expect(await repo.operacao(b.pedido.operacaoId)).toBeNull()
  })

  test('fonte apagada não apaga versão publicada e seus arquivos seguem na cota', async () => {
    const b = await preparar()
    const a = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos)
    expect(await cenarios.apagarMundo(ator, b.mundo.id)).toEqual({ apagar: [] })
    expect(await repo.porId(a.publicacao.id)).toEqual(a.publicacao)
    expect((await autoria.espaco(b.espaco.id))!.usadoBytes).toBe(b.bytes.length)
    const repetida = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos)
    expect(repetida.repetido).toBe(true)
  })

  test('a transação reconfere a revisão salva e não confirma arquivos se a fonte mudou', async () => {
    const b = await preparar(),
      snapshot = await criarSnapshotDePublicacao(b.pedido, b.bytes)
    await cenarios.editarCenario(ator, b.cenario.id, {
      revisaoEsperada: 0,
      operacaoId: 'alterar-fonte-antes-da-transacao',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Outra praça' }],
    })
    const erro = await repo
      .gravar(
        {
          id: crypto.randomUUID(),
          espacoId: b.espaco.id,
          autorId: ator.usuarioId,
          pedido: snapshot.pedido,
          digestDaOperacao: snapshot.digestDaOperacao,
          recursos: snapshot.recursos,
          conferidos: b.conferidos,
          licencas: [],
        },
        new Date(),
      )
      .then(
        () => null,
        (e) => e,
      )
    expect(erro).toBeInstanceOf(CenarioDesatualizadoError)
    expect(await repo.atual(b.pedido.perfil)).toBeNull()
    expect((await autoria.blobsConfirmados(b.espaco.id, [b.pedido.manifesto.digest])).size).toBe(0)
  })

  test('reserva vencida não vira publicação; o banco também protege blobs de versões antigas', async () => {
    const b = await preparar()
    await conn.sql`update members.cenario_blobs set vence_em = now() - interval '1 second' where espaco_id=${b.espaco.id}`
    const erro = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos).then(
      () => null,
      (e) => e,
    )
    expect(erro).toBeInstanceOf(CenarioArquivoAusenteError)
    expect(await repo.atual(b.pedido.perfil)).toBeNull()
    await servico.reservarManifesto(ator, b.pedido)
    const a = await servico.publicarConferido(ator, b.pedido, b.bytes, b.conferidos)
    await servico.publicarConferido(
      ator,
      { ...b.pedido, versaoEsperada: 1, operacaoId: crypto.randomUUID() },
      b.bytes,
      b.conferidos,
    )
    const bloqueio =
      await conn.sql`delete from members.cenario_blobs where espaco_id=${b.espaco.id}`.then(
        () => null,
        (e) => e,
      )
    expect(bloqueio?.code).toBe('23503')
    expect(await repo.porId(a.publicacao.id)).toEqual(a.publicacao)
  })

  test('papéis compilados exigem MIME explícito no banco', async () => {
    const b = await preparar()
    const erro =
      await conn.sql`update members.cenario_blobs set tipo_do_conteudo=null where espaco_id=${b.espaco.id}`.then(
        () => null,
        (e) => e,
      )
    expect(erro?.code).toBe('23514')
  })

  test('publicação reaproveita GLB confirmado e o protege ao apagar a biblioteca', async () => {
    const b = await preparar(),
      origem = exemplo(),
      recurso = glb(origem.j, origem.bin)
    const digest = await digestDosBytes(recurso)
    const biblioteca = await cenarios.criarBiblioteca(ator, b.espaco.id, {
      nome: 'Peças',
      licenca: 'propria',
    })
    await cenarios.reservarModelos(ator, biblioteca.id, [{ digest, bytes: recurso.length }])
    await cenarios.registrarModelos(
      ator,
      biblioteca.id,
      [
        {
          nome: 'Peça',
          pasta: '',
          etiquetas: [],
          digest,
          triangulos: 2,
          min: [0, 0, 0],
          max: [0, 0, 0],
        },
      ],
      [{ digest, bytes: recurso.length, tipoDoConteudo: 'model/gltf-binary' }],
    )
    const cena = JSON.parse(new TextDecoder().decode(b.bytes))
    cena.arquivos = [
      {
        caminho: 'modelos/peca.glb',
        digest,
        bytes: recurso.length,
        mime: 'model/gltf-binary',
        papel: 'modelo',
        malhas: 2,
        triangulos: 2,
        verticesMaximos: 3,
      },
    ]
    const bytes = new TextEncoder().encode(JSON.stringify(cena))
    const pedido = {
      ...b.pedido,
      manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
    }
    await servico.reservarManifesto(ator, pedido)
    const reserva = await servico.reservarRecursosDoManifesto(ator, pedido, bytes, [digest])
    expect(reserva.arquivos).toEqual([])
    const a = await servico.publicarConferido(ator, pedido, bytes, [
      { ...pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
      { digest, bytes: recurso.length, tipoDoConteudo: 'model/gltf-binary' },
    ])
    expect(await cenarios.apagarBiblioteca(ator, biblioteca.id)).toEqual({ apagar: [] })
    expect((await autoria.blobsConfirmados(b.espaco.id, [digest])).size).toBe(1)
    expect((await repo.recursos(a.publicacao.id)).map((r) => r.digest)).toContain(digest)
  })
})
