import { expect, test } from 'bun:test'
import {
  capturarConteudoDeConjunto,
  conteudoDoCenarioDeConjunto,
  criarDocumentoVazio,
  referenciarConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import { CenarioDesatualizado } from '../src/oficina/portas'

async function base() {
  const host = criarHostEmMemoria({ equipe: true }),
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Jardins', licenca: 'propria' })
  const d = criarDocumentoVazio('origem', 'Jardim')
  d.formas = [{ id: 'f', nome: 'Base', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  d.instancias = [
    {
      id: 'base',
      nome: 'Base',
      grupo: null,
      modelo: 'f',
      oculto: false,
      bloqueado: false,
      apoio: { tipo: 'absoluto' },
      colisao: 'caixa',
      transformacao: {
        posicao: { x: 10, y: 2, z: 20 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 2, y: 1, z: 1 },
      },
    },
  ]
  d.instancias.push({
    ...structuredClone(d.instancias[0]!),
    id: 'flor',
    nome: 'Flor',
    apoio: { tipo: 'objeto', objeto: 'base', deslocamento: 0.1 },
    transformacao: {
      ...d.instancias[0]!.transformacao,
      posicao: { x: 0, y: 0, z: 0 },
      escala: { x: 0.2, y: 0.5, z: 0.2 },
    },
  })
  const conteudo = capturarConteudoDeConjunto(d, ['base', 'flor'], 'conta')
  const dados = {
    nome: 'Jardim',
    pasta: 'Campos',
    etiquetas: ['flores'],
    conteudo,
    operacaoId: 'criar-conjunto-01',
  }
  const conjunto = await host.criarConjunto(biblioteca.id, dados)
  return { host, biblioteca, conjunto, conteudo, dados }
}

test('host local publica cópias e reabre fonte/histórico sem deformar a composição ou alterar revisões antigas', async () => {
  const { host, biblioteca, conjunto, dados, conteudo } = await base()
  expect((await host.criarConjunto(biblioteca.id, dados)).id).toBe(conjunto.id)
  expect((await host.listarConjuntos(biblioteca.id, { busca: 'FLORES', limite: 1 })).total).toBe(1)
  const mundo = await host.criarMundo('conta', 'Mundo'),
    cenas: string[] = []
  for (let i = 0; i < 2; i++) {
    const c = await host.criarCenario(mundo.id, `Cena ${i}`),
      doc = criarDocumentoVazio(c.id, c.nome)
    const { definicao, comandos } = referenciarConjunto(doc, {
      biblioteca: biblioteca.id,
      conjunto: conjunto.id,
      revisao: 1,
      nome: conjunto.nome,
      conteudo,
    })
    await host.editarCenario(
      c.id,
      0,
      [
        ...comandos,
        {
          tipo: 'montagem.definir',
          montagem: {
            id: 'jardim',
            nome: 'Jardim',
            grupo: null,
            oculto: false,
            bloqueado: false,
            definicao: definicao.id,
            transformacao: {
              posicao: { x: i * 10, y: 0, z: 0 },
              rotacao: { x: 0, y: 0.4, z: 0 },
              escala: { x: 2, y: 2, z: 2 },
            },
          },
        },
      ],
      `colocar-jardim-${i}`,
    )
    cenas.push(c.id)
  }
  const antes = await Promise.all(cenas.map((id) => host.abrirCenario(id)))
  const fonte = await host.editarConjuntoNaOficina(conjunto.id)
  expect((await host.editarConjuntoNaOficina(conjunto.id)).cenario.resumo.id).toBe(
    fonte.cenario.resumo.id,
  )
  expect((await host.listarMundos('conta')).map((m) => m.id)).toEqual([mundo.id])
  const doc = structuredClone(fonte.cenario.documento)
  doc.instancias[1]!.nome = 'Flor da Íris'
  await host.editarCenario(
    doc.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: doc }],
    'editar-jardim-01',
  )
  await expect(
    host.publicarConjunto(conjunto.id, {
      revisaoEsperada: 1,
      operacaoId: 'publicar-jardim-01',
      conteudo,
    }),
  ).rejects.toThrow('não publicadas')
  const pedido = {
    revisaoEsperada: 1,
    operacaoId: 'publicar-jardim-01',
    conteudo: conteudoDoCenarioDeConjunto(doc, 'conta'),
    rascunho: { cenarioId: doc.id, revisao: 1 },
  }
  const r = await host.publicarConjunto(conjunto.id, pedido)
  expect(r.conjunto).toMatchObject({ revisao: 2, revisaoPublicadaDoCenario: 1 })
  expect(r.cenarios.map((c) => c.id)).toEqual(cenas)
  expect((await host.versaoDoConjunto(conjunto.id, 1)).conteudo).toEqual(conteudo)
  for (let i = 0; i < 2; i++) {
    const atual = await host.abrirCenario(cenas[i]!)
    expect(atual.documento.montagens![0]!.transformacao).toEqual(
      antes[i]!.documento.montagens![0]!.transformacao,
    )
    expect(atual.documento.definicoesConjuntos![0]!.revisao).toBe(2)
    expect(
      (await host.moverHistorico(cenas[i]!, 2, 'desfazer', `desfazer-publicacao-${i}`)).documento,
    ).toEqual(antes[i]!.documento)
  }
  await host.moverHistorico(doc.id, 1, 'desfazer', 'desfazer-fonte-01')
  expect((await host.publicarConjunto(conjunto.id, pedido)).cenarios).toEqual(r.cenarios)
  expect((await host.editarConjuntoNaOficina(conjunto.id)).cenario.documento).toEqual(
    fonte.cenario.documento,
  )
  await expect(host.apagarCenario(doc.id)).rejects.toThrow('biblioteca')
  await host.apagarConjunto(conjunto.id)
  await expect(host.abrirCenario(doc.id)).rejects.toThrow('não existe')
  expect((await host.abrirCenario(cenas[0]!)).documento.definicoesConjuntos![0]!.conteudo).toEqual(
    conteudo,
  )
})

test('host local recusa publicação inteira quando uma cópia está bloqueada e sincroniza fonte limpa sem repetir', async () => {
  const { host, biblioteca, conjunto, conteudo } = await base()
  const mundo = await host.criarMundo('conta', 'Mundo'),
    cenas: string[] = []
  for (let i = 0; i < 2; i++) {
    const c = await host.criarCenario(mundo.id, `Cena ${i}`)
    const { definicao, comandos } = referenciarConjunto(criarDocumentoVazio(c.id, c.nome), {
      biblioteca: biblioteca.id,
      conjunto: conjunto.id,
      revisao: 1,
      nome: conjunto.nome,
      conteudo,
    })
    await host.editarCenario(
      c.id,
      0,
      [
        ...comandos,
        {
          tipo: 'montagem.definir',
          montagem: {
            id: 'jardim',
            nome: 'Jardim',
            grupo: null,
            oculto: false,
            bloqueado: i === 1,
            definicao: definicao.id,
            transformacao: {
              posicao: { x: i * 10, y: 0, z: 0 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        },
      ],
      `colocar-jardim-${i}`,
    )
    cenas.push(c.id)
  }
  const fonte = await host.editarConjuntoNaOficina(conjunto.id)
  const antes = await Promise.all(cenas.map((id) => host.abrirCenario(id)))
  const novo = structuredClone(conteudo)
  novo.instancias[1]!.nome = 'Nova flor'
  await expect(
    host.publicarConjunto(conjunto.id, {
      revisaoEsperada: 1,
      operacaoId: 'publicar-jardim-01',
      conteudo: novo,
    }),
  ).rejects.toThrow()
  expect(await Promise.all(cenas.map((id) => host.abrirCenario(id)))).toEqual(antes)
  expect((await host.editarConjuntoNaOficina(conjunto.id)).cenario).toEqual(fonte.cenario)
  expect((await host.obterConjunto(conjunto.id)).revisao).toBe(1)
  await host.apagarCenario(cenas[1]!)
  const pedido = { revisaoEsperada: 1, operacaoId: 'publicar-jardim-01', conteudo: novo }
  const r = await host.publicarConjunto(conjunto.id, pedido)
  expect((await host.editarConjuntoNaOficina(conjunto.id)).cenario.revisao).toBe(1)
  expect((await host.publicarConjunto(conjunto.id, pedido)).cenarios).toEqual(r.cenarios)
  await expect(
    host.publicarConjunto(conjunto.id, { ...pedido, operacaoId: 'publicar-jardim-02' }),
  ).rejects.toBeInstanceOf(CenarioDesatualizado)
})

test('miniaturas locais compartilham recurso por conteúdo, respeitam a revisão e liberam a cota com a biblioteca', async () => {
  const { host, biblioteca, conjunto } = await base()
  const imagem = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
  const antes = (await host.espacos())[0]!.usadoBytes
  await host.guardarMiniaturaDoConjunto(conjunto.id, 1, imagem)
  const url = (await host.obterConjunto(conjunto.id)).miniatura
  expect(url).toStartWith('blob:')
  await host.guardarMiniaturaDoConjunto(conjunto.id, 1, imagem)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + imagem.size)
  const v1 = await host.versaoDoConjunto(conjunto.id, 1)
  await host.publicarConjunto(conjunto.id, {
    revisaoEsperada: 1,
    operacaoId: 'publicar-jardim-01',
    conteudo: v1.conteudo,
  })
  expect((await host.obterConjunto(conjunto.id)).miniatura).toBeNull()
  await host.guardarMiniaturaDoConjunto(conjunto.id, 2, imagem)
  expect((await host.obterConjunto(conjunto.id)).miniatura).toBe(url)
  expect((await host.espacos())[0]!.usadoBytes).toBe(antes + v1.bytes + imagem.size)
  await host.apagarBiblioteca(biblioteca.id)
  expect((await host.espacos())[0]!.usadoBytes).toBe(0)
  await expect(host.guardarMiniaturaDoConjunto(conjunto.id, 2, imagem)).rejects.toThrow(
    'não existe',
  )
})

test('host local recusa snapshot divergente de uma revisão ainda existente no catálogo', async () => {
  const { host, conjunto, biblioteca, conteudo } = await base()
  const mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'Cena')
  const f = structuredClone(conteudo)
  f.instancias[0]!.nome = 'Conteúdo forjado'
  const { definicao, comandos } = referenciarConjunto(criarDocumentoVazio(c.id, c.nome), {
    biblioteca: biblioteca.id,
    conjunto: conjunto.id,
    revisao: 1,
    nome: conjunto.nome,
    conteudo: f,
  })
  await expect(
    host.editarCenario(
      c.id,
      0,
      [
        ...comandos,
        {
          tipo: 'montagem.definir',
          montagem: {
            id: 'jardim',
            nome: 'Jardim',
            definicao: definicao.id,
            grupo: null,
            bloqueado: false,
            oculto: false,
            transformacao: {
              posicao: { x: 0, y: 0, z: 0 },
              rotacao: { x: 0, y: 0, z: 0 },
              escala: { x: 1, y: 1, z: 1 },
            },
          },
        },
      ],
      'snapshot-divergente-01',
    ),
  ).rejects.toThrow('diverge')
  expect((await host.abrirCenario(c.id)).revisao).toBe(0)
})

test('host HTTP converte contexto/miniaturas e envia a fotografia da revisão pelo protocolo existente', async () => {
  const { conjunto, conteudo } = await base(),
    pedidos: Array<{ caminho: string; corpo: any }> = [],
    puts: RequestInit[] = []
  const espacoId = 'conta'
  const host = criarHostHttp({
    buscar: async (url, op) => {
      const caminho = url.replace('/api/cenarios/', ''),
        corpo = op?.body ? JSON.parse(String(op.body)) : undefined
      pedidos.push({ caminho, corpo })
      if (caminho === `conjuntos/${conjunto.id}`)
        return Response.json({ espacoId, conjunto: { ...conjunto, miniatura: 'a'.repeat(64) } })
      if (caminho.endsWith('/miniatura/reservar'))
        return Response.json({
          espacoId,
          enviar: [
            {
              digest: corpo.digest,
              url: 'https://r2.exemplo/arquivo',
              tipoDoConteudo: 'image/png',
              criarUmaVez: true,
            },
          ],
        })
      if (caminho.endsWith('/versoes/1'))
        return Response.json({
          conjuntoId: conjunto.id,
          revisao: 1,
          nome: conjunto.nome,
          conteudo,
          miniatura: null,
          bytes: conjunto.bytes,
          objetos: 2,
          criadoEm: conjunto.atualizadoEm,
        })
      return Response.json({ ok: true })
    },
    enviar: async (_url, op) => {
      puts.push(op!)
      return new Response(null, { status: 200 })
    },
  })
  expect((await host.obterConjunto(conjunto.id)).miniatura).toBe(
    `/api/cenarios/espacos/${espacoId}/arquivos/${'a'.repeat(64)}`,
  )
  expect((await host.versaoDoConjunto(conjunto.id, 1)).conteudo).toEqual(conteudo)
  await host.guardarMiniaturaDoConjunto(
    conjunto.id,
    1,
    new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
  )
  expect(puts).toHaveLength(1)
  expect(new Headers(puts[0]!.headers).get('if-none-match')).toBe('*')
  expect(pedidos.at(-1)!).toMatchObject({
    caminho: `conjuntos/${conjunto.id}/versoes/1/miniatura`,
    corpo: { espacoId },
  })
})
