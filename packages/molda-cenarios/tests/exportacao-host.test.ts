import { expect, test } from 'bun:test'
import {
  conferirPreparoDeExportacao,
  digestDoDocumentoDeCenario,
} from '@sistemazero/molda-cenarios-core/compilar'
import { criarDocumentoVazio, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import { CenarioDesatualizado } from '../src/oficina/portas'

test('host de ensaio prepara só a revisão salva, licencia modelos visíveis e conserva autoria', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Aventura', licenca: 'restrita' }),
    conteudo = new Uint8Array([1, 2, 3]),
    digest = await digestDosBytes(conteudo),
    [modelo] = await host.importarModelos(biblioteca.id, [
      {
        nome: 'Árvore',
        pasta: '',
        etiquetas: [],
        conteudo,
        digest,
        miniatura: new Blob(),
        min: [-1, 0, -1],
        max: [1, 3, 1],
        triangulos: 12,
      },
    ]),
    mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'Vila')
  expect((await host.prepararExportacao(c.id, 0)).contexto.bibliotecas).toEqual([])
  await host.editarCenario(
    c.id,
    0,
    [
      {
        tipo: 'modelo.definir',
        modelo: { id: 'm', biblioteca: biblioteca.id, modelo: modelo!.id, digest },
      },
      {
        tipo: 'instancia.criar',
        instancia: {
          id: 'o',
          nome: 'Árvore',
          modelo: 'm',
          grupo: null,
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
    'guardar-arvore',
  )
  const antes = await host.abrirCenario(c.id),
    p = await host.prepararExportacao(c.id, 1)
  expect(p.contexto).toEqual({
    equipe: true,
    bibliotecas: [{ id: biblioteca.id, nome: 'Aventura', licenca: 'restrita' }],
  })
  expect(await conferirPreparoDeExportacao(p, c.id, 1)).toEqual(p)
  expect(await host.abrirCenario(c.id)).toEqual(antes)
  await expect(host.prepararExportacao(c.id, 0)).rejects.toBeInstanceOf(CenarioDesatualizado)
  const cancelado = new AbortController()
  cancelado.abort()
  await expect(host.prepararExportacao(c.id, 1, cancelado.signal)).rejects.toThrow()
  await host.editarCenario(
    c.id,
    1,
    [
      {
        tipo: 'textura.definir',
        textura: { id: 't', biblioteca: biblioteca.id, textura: 't', digest },
      },
      {
        tipo: 'instancia.atualizar',
        id: 'o',
        alteracoes: { aparencia: { textura: { id: 't', repeticaoMetros: 1 } } },
      },
    ],
    'textura-com-papel-errado',
  )
  await expect(host.prepararExportacao(c.id, 2)).rejects.toThrow(/recurso usado/)
})

test('bytes dos modelos no ensaio pertencem ao espaço, mesmo com digest igual', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    conteudo = new Uint8Array([1, 2, 3]),
    digest = await digestDosBytes(conteudo),
    dados = {
      nome: 'Modelo',
      pasta: '',
      etiquetas: [],
      conteudo,
      digest,
      miniatura: new Blob(),
      min: [0, 0, 0] as [number, number, number],
      max: [1, 1, 1] as [number, number, number],
      triangulos: 1,
    },
    a = await host.criarBiblioteca('conta', { nome: 'Conta', licenca: 'propria' }),
    b = await host.criarBiblioteca('equipe', { nome: 'Equipe', licenca: 'restrita' })
  await host.importarModelos(a.id, [dados])
  await expect(host.conteudoDoModelo({ biblioteca: b.id, digest })).rejects.toThrow()
  await host.importarModelos(b.id, [dados])
  expect(new Uint8Array(await host.conteudoDoModelo({ biblioteca: b.id, digest }))).toEqual(
    conteudo,
  )
  expect((await host.espacos()).map((e) => e.usadoBytes)).toEqual([3, 3])
})

test('apagar o cenário durante o preparo não entrega a cópia já removida do ensaio', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'Vila'),
    preparo = host.prepararExportacao(c.id, 0)
  await host.apagarCenario(c.id)
  const resultado = await preparo.catch((e) => e)
  expect(resultado).toBeInstanceOf(Error)
})

test('host HTTP manda somente revisão e prova de perfil, valida resposta e respeita cancelamento', async () => {
  const documento = criarDocumentoVazio('c', 'Vila'),
    resposta = {
      espacoId: 'conta',
      fonte: { cenario: 'c', revisao: 2 },
      digest: await digestDoDocumentoDeCenario(documento),
      documento,
      contexto: { equipe: false, bibliotecas: [] },
    },
    pedidos: { url: string; opcoes?: RequestInit }[] = [],
    host = criarHostHttp({
      pessoaId: 'perfil',
      buscar: async (url, opcoes) => {
        pedidos.push({ url, opcoes })
        return Response.json(resposta)
      },
    }),
    c = new AbortController()
  expect(await host.prepararExportacao('c', 2, c.signal)).toEqual(resposta)
  expect(pedidos[0]!.url).toBe('/api/cenarios/cenarios/c/exportacao')
  expect(JSON.parse(pedidos[0]!.opcoes!.body as string)).toEqual({ revisaoEsperada: 2 })
  expect(new Headers(pedidos[0]!.opcoes!.headers).get('x-sz-viewer')).toBe('perfil')
  // O sinal de quem pediu vai junto com o prazo do pedido: cancelar continua cancelando.
  expect(pedidos[0]!.opcoes!.signal).toBeInstanceOf(AbortSignal)
  resposta.documento.nome = 'Adulterado'
  await expect(host.prepararExportacao('c', 2)).rejects.toThrow(/documento/)
  c.abort()
  const total = pedidos.length
  await expect(host.prepararExportacao('c', 2, c.signal)).rejects.toThrow()
  expect(pedidos).toHaveLength(total)
  const durante = new AbortController(),
    interrompido = criarHostHttp({
      buscar: async () => {
        durante.abort()
        return new Response('resposta interrompida', { status: 200 })
      },
    })
  await expect(interrompido.prepararExportacao('c', 2, durante.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
})
