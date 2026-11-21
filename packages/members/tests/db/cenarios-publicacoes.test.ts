import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  criarSnapshotDePublicacao,
  type PedidoDePublicacao,
  resumirPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
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
import {
  PublicacaoDeCenarioConflitanteError,
  PublicacaoSemArquivosError,
} from '../../src/domain/cenarios/publicacoes'
import { DrizzleCenariosRepository } from '../../src/infrastructure/persistence/drizzle/cenarios.repository'
import { DrizzlePublicacoesDeCenariosRepository } from '../../src/infrastructure/persistence/drizzle/cenarios-publicacoes.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

/** O que o BFF manda depois de ler e conferir o manifesto no armazenamento. */
const resumoDe = async (pedido: PedidoDePublicacao, bytes: Uint8Array) =>
  resumirPublicacao(await criarSnapshotDePublicacao(pedido, bytes))
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
  // A equipe na PRÓPRIA conta (usuário = conta, fora de perfil): só ela publica no jogo.
  const contaDaEquipe = crypto.randomUUID()
  const ator: Ator = {
    usuarioId: contaDaEquipe,
    contaId: contaDaEquipe,
    equipe: true,
    suporte: false,
    perfil: false,
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
      (e) =>
        (e.idx >= 151 && e.idx <= 162) ||
        e.tag === '0164_cenarios_publicacoes' ||
        e.tag === '0165_cenarios_blobs_saindo',
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
    const resumo = await resumoDe(pedido, bytes)
    return { espaco, mundo, cenario, bytes, resumo, pedido, conferidos }
  }

  test('migração real, confirmação de arquivos e repetição preservam uma versão imutável', async () => {
    const b = await preparar()
    const a = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)
    expect(a.publicacao.versao).toBe(1)
    expect(await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)).toEqual({
      ...a,
      repetido: true,
    })
    expect(await repo.atual(b.pedido.perfil)).toEqual(a.publicacao)
    expect((await autoria.blobsConfirmados(b.espaco.id, [b.pedido.manifesto.digest])).size).toBe(1)
    expect(await repo.recursos(a.publicacao.id)).toHaveLength(1)
    expect(await repo.recurso(a.publicacao.id, b.pedido.manifesto.digest)).toMatchObject({
      digest: b.pedido.manifesto.digest,
      bytes: b.bytes.length,
      papel: 'manifesto',
    })
    expect(await repo.recurso(a.publicacao.id, 'f'.repeat(64))).toBeNull()
    expect(await servico.arquivoDoJogo(a.publicacao.id, b.pedido.manifesto.digest)).toMatchObject({
      chave: `cenarios/${b.espaco.id}/blobs/${b.pedido.manifesto.digest}`,
    })
  })

  test('concorrência troca apontador apenas uma vez; versão anterior continua consultável', async () => {
    const b = await preparar()
    const resultados = await Promise.allSettled([
      servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos),
      servico.publicarConferido(
        ator,
        { ...b.pedido, operacaoId: crypto.randomUUID() },
        b.resumo,
        b.conferidos,
      ),
    ])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1)
    const primeira = (await repo.atual(b.pedido.perfil))!
    const segunda = await servico.publicarConferido(
      ator,
      { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 1 },
      b.resumo,
      b.conferidos,
    )
    expect(segunda.publicacao.versao).toBe(2)
    expect(await repo.porId(primeira.id)).toEqual(primeira)
  })

  test('arquivo sem reserva recusa tudo e não deixa publicação nem confirmação parcial', async () => {
    const b = await preparar()
    await conn.sql`delete from members.cenario_blobs where espaco_id=${b.espaco.id}`
    const resultado = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos).then(
      () => null,
      (erro) => erro,
    )
    expect(resultado).toBeInstanceOf(CenarioArquivoAusenteError)
    expect(await repo.atual(b.pedido.perfil)).toBeNull()
    expect(await repo.operacao(b.pedido.operacaoId)).toBeNull()
  })

  test('fonte apagada não apaga versão publicada e seus arquivos seguem na cota', async () => {
    const b = await preparar()
    const a = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)
    expect(await cenarios.apagarMundo(ator, b.mundo.id)).toEqual({ apagar: [] })
    expect(await repo.porId(a.publicacao.id)).toEqual(a.publicacao)
    expect((await autoria.espaco(b.espaco.id))!.usadoBytes).toBe(b.bytes.length)
    const repetida = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)
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
    const erro = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos).then(
      () => null,
      (e) => e,
    )
    expect(erro).toBeInstanceOf(CenarioArquivoAusenteError)
    expect(await repo.atual(b.pedido.perfil)).toBeNull()
    await servico.reservarManifesto(ator, b.pedido)
    const a = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)
    await servico.publicarConferido(
      ator,
      { ...b.pedido, versaoEsperada: 1, operacaoId: crypto.randomUUID() },
      b.resumo,
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
    const resumo = await resumoDe(pedido, bytes)
    const reserva = await servico.reservarRecursosDoManifesto(
      ator,
      pedido,
      resumo.recursos.filter((r) => r.papel === 'recurso'),
    )
    expect(reserva.arquivos).toEqual([])
    const a = await servico.publicarConferido(ator, pedido, resumo, [
      { ...pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
      { digest, bytes: recurso.length, tipoDoConteudo: 'model/gltf-binary' },
    ])
    expect(await cenarios.apagarBiblioteca(ator, biblioteca.id)).toEqual({ apagar: [] })
    expect((await autoria.blobsConfirmados(b.espaco.id, [digest])).size).toBe(1)
    expect((await repo.recursos(a.publicacao.id)).map((r) => r.digest)).toContain(digest)
  })

  /** A v1 (meio-dia) e uma v2 com outro manifesto (fim de tarde), publicadas de verdade. */
  async function duasVersoes() {
    const b = await preparar()
    const v1 = await servico.publicarConferido(ator, b.pedido, b.resumo, b.conferidos)
    const cena = JSON.parse(new TextDecoder().decode(b.bytes))
    const bytes = new TextEncoder().encode(JSON.stringify({ ...cena, ambiente: { hora: 18 } }))
    const pedido = {
      ...b.pedido,
      operacaoId: crypto.randomUUID(),
      versaoEsperada: 1,
      manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
    }
    await servico.reservarManifesto(ator, pedido)
    const v2 = await servico.publicarConferido(ator, pedido, await resumoDe(pedido, bytes), [
      { ...pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
    ])
    const volta = {
      operacaoId: crypto.randomUUID(),
      perfil: b.pedido.perfil,
      versaoEsperada: 2,
      publicacaoId: v1.publicacao.id,
    }
    return { ...b, v1: v1.publicacao, v2: v2.publicacao, pedido2: pedido, volta }
  }
  const contar = async () =>
    Number((await conn.sql`select count(*)::int as n from members.cenario_publicacoes`)[0]!.n)

  test('lista da mais nova à mais antiga e volta copiando manifesto e arquivos para a versão nova', async () => {
    const b = await duasVersoes()
    const antes = await repo.listarVersoes(b.pedido.perfil, 20)
    expect(antes.map((v) => [v.versao, v.atual])).toEqual([
      [2, true],
      [1, false],
    ])
    expect(antes[1]).toMatchObject({ ...b.v1, atual: false })
    expect(await repo.listarVersoes({ tipo: 'arquipelago-v2', ilha: 'bosque' }, 20)).toEqual([])
    expect((await repo.listarVersoes(b.pedido.perfil, 1)).map((v) => v.versao)).toEqual([2])

    const r = await servico.voltarParaVersao(ator, b.volta)
    expect(r.repetido).toBe(false)
    expect(r.publicacao).toMatchObject({
      versao: 3,
      espacoId: b.espaco.id,
      fonte: b.v1.fonte,
      manifesto: b.v1.manifesto,
      autorId: ator.usuarioId,
    })
    expect(await repo.atual(b.pedido.perfil)).toEqual(r.publicacao)
    expect(await repo.recursos(r.publicacao.id)).toEqual(await repo.recursos(b.v1.id))
    expect((await repo.listarVersoes(b.pedido.perfil, 20)).map((v) => [v.versao, v.atual])).toEqual(
      [
        [3, true],
        [2, false],
        [1, false],
      ],
    )
    // A fonte apagada não impede a volta: o manifesto e os arquivos são da versão guardada.
    expect(await cenarios.apagarMundo(ator, b.mundo.id)).toEqual({ apagar: [] })
    const outra = await servico.voltarParaVersao(ator, {
      ...b.volta,
      operacaoId: crypto.randomUUID(),
      versaoEsperada: 3,
      publicacaoId: b.v2.id,
    })
    expect(outra.publicacao).toMatchObject({ versao: 4, manifesto: b.v2.manifesto })
    expect(
      (await servico.arquivoDoJogo(outra.publicacao.id, b.pedido2.manifesto.digest)).chave,
    ).toBe(`cenarios/${b.espaco.id}/blobs/${b.pedido2.manifesto.digest}`)
  })

  test('versão esperada vencida recusa; a mesma operação repetida devolve a mesma versão', async () => {
    const b = await duasVersoes()
    const vencida = await servico.voltarParaVersao(ator, { ...b.volta, versaoEsperada: 1 }).then(
      () => null,
      (e) => e,
    )
    expect(vencida).toBeInstanceOf(PublicacaoDeCenarioConflitanteError)
    expect(await contar()).toBe(2)
    const a = await servico.voltarParaVersao(ator, b.volta)
    // A repetição precede o CAS: mesmo com a v3 já no ar, devolve a mesma versão.
    expect(await servico.voltarParaVersao(ator, b.volta)).toEqual({ ...a, repetido: true })
    // Direto no repositório (outra réplica que passou pela leitura antes do commit), idem.
    const repetida = await repo.voltar(
      {
        id: crypto.randomUUID(),
        espacoId: b.espaco.id,
        autorId: ator.usuarioId,
        pedido: b.volta,
        digestDaOperacao: (await repo.operacao(b.volta.operacaoId))!.digestDaOperacao,
      },
      new Date(),
    )
    expect(repetida).toEqual({ ...a, repetido: true })
    expect(await contar()).toBe(3)
  })

  test('arquivo saindo do espaço impede a volta sem gravar versão nem trocar o apontador', async () => {
    const b = await duasVersoes()
    await conn.sql`insert into members.cenario_blobs_saindo (espaco_id, digest, desde) values (${b.espaco.id}, ${b.pedido.manifesto.digest}, now())`
    const erro = await servico.voltarParaVersao(ator, b.volta).then(
      () => null,
      (e) => e,
    )
    expect(erro).toBeInstanceOf(PublicacaoSemArquivosError)
    expect(erro.digests).toEqual([b.pedido.manifesto.digest])
    expect(await contar()).toBe(2)
    expect((await repo.atual(b.pedido.perfil))?.id).toBe(b.v2.id)
    expect(await repo.operacao(b.volta.operacaoId)).toBeNull()
  })

  test('voltar e publicar ao mesmo tempo, da mesma versão esperada, trocam o apontador uma vez', async () => {
    const b = await duasVersoes()
    const resultados = await Promise.allSettled([
      servico.voltarParaVersao(ator, b.volta),
      servico.publicarConferido(
        ator,
        { ...b.pedido, operacaoId: crypto.randomUUID(), versaoEsperada: 2 },
        b.resumo,
        b.conferidos,
      ),
    ])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const recusa = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(recusa.reason).toBeInstanceOf(PublicacaoDeCenarioConflitanteError)
    expect(await contar()).toBe(3)
    expect((await repo.atual(b.pedido.perfil))?.versao).toBe(3)
  })
})
