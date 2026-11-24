import { expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import {
  type DestinoDaPublicacao,
  PublicacaoDesatualizada,
  type PublicacoesDeCenariosHost,
} from '../src/oficina/publicacoes'
import { criarPublicacoesEmMemoria } from '../src/oficina/publicacoes-em-memoria'

const CENARIO = '11111111-1111-4111-8111-111111111111'
const ESPACO = '22222222-2222-4222-8222-222222222222'
const PESSOA = '33333333-3333-4333-8333-333333333333'
const destino = (): DestinoDaPublicacao => ({
  perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
  versaoEsperada: 0,
  operacaoId: crypto.randomUUID(),
})
function pacote(
  fonte = { cenario: CENARIO, revisao: 0, digest: 'a'.repeat(64) },
  hora = 12,
): PacoteCompilado {
  return {
    cena: lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Praça',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte,
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
      ambiente: { hora },
    }),
    arquivos: new Map(),
  }
}

test('host HTTP publica pelo BFF, reutiliza PUT imutável e mantém a identidade só nos pedidos da oficina', async () => {
  const pedidos: { caminho: string; opcoes: RequestInit }[] = [],
    envios: RequestInit[] = []
  const host = criarHostHttp({
    pessoaId: PESSOA,
    buscar: async (caminho, opcoes = {}) => {
      pedidos.push({ caminho, opcoes })
      if (caminho.endsWith('/perfis/sua-ilha')) return Response.json({ publicacao: null })
      const pedido = JSON.parse(String(opcoes.body))
      if (caminho.endsWith('/preparar'))
        return Response.json({ espacoId: ESPACO, pedido, publicacao: null })
      if (caminho.endsWith('/manifesto/reservar'))
        return Response.json({
          espacoId: ESPACO,
          enviar: [
            {
              digest: pedido.manifesto.digest,
              tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json',
              url: 'https://armazenamento.exemplo/manifesto',
              criarUmaVez: true,
            },
          ],
        })
      if (caminho.endsWith('/confirmar'))
        return Response.json({
          publicacao: {
            id: crypto.randomUUID(),
            perfil: pedido.pedido.perfil,
            versao: 1,
            fonte: pedido.pedido.fonte,
            manifesto: pedido.pedido.manifesto,
          },
          repetido: false,
        })
      throw Error(`Pedido inesperado: ${caminho}`)
    },
    enviar: async (_url, o = {}) => {
      envios.push(o)
      return new Response(null, { status: 200 })
    },
  })
  const alvo = destino()
  expect(await host.publicacoes!.obter(alvo.perfil)).toBeNull()
  const resultado = await host.publicacoes!.publicar(pacote(), alvo)
  expect(resultado.publicacao.versao).toBe(1)
  expect(resultado.publicacao.perfil).toEqual(alvo.perfil)
  expect(envios).toHaveLength(1)
  expect(new Headers(envios[0]!.headers).get('if-none-match')).toBe('*')
  expect(new Headers(envios[0]!.headers).get('x-sz-viewer')).toBeNull()
  expect(pedidos.every((p) => new Headers(p.opcoes.headers).get('x-sz-viewer') === PESSOA)).toBe(
    true,
  )
  expect(pedidos.map((p) => p.caminho)).toEqual([
    '/api/cenarios/publicacoes/perfis/sua-ilha',
    '/api/cenarios/publicacoes/preparar',
    '/api/cenarios/publicacoes/manifesto/reservar',
    '/api/cenarios/publicacoes/confirmar',
  ])
})

test('cancelamento anterior à publicação não faz pedido nem envio', async () => {
  let chamadas = 0
  const host = criarHostHttp({
    buscar: async () => {
      chamadas++
      return Response.json({})
    },
  })
  const c = new AbortController()
  c.abort()
  await expect(host.publicacoes!.publicar(pacote(), destino(), c.signal)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(chamadas).toBe(0)
})

test('host de ensaio publica no espaço da equipe, conserva revisão e recusa fonte pessoal', async () => {
  const host = criarHostEmMemoria({ equipe: true })
  const mundo = await host.criarMundo('equipe', 'Faísca'),
    c = await host.criarCenario(mundo.id, 'Praça')
  const p = await host.prepararExportacao(c.id, 0),
    alvo = destino(),
    conteudo = pacote({ ...p.fonte, digest: p.digest })
  const primeira = await host.publicacoes!.publicar(conteudo, alvo)
  expect(primeira.publicacao.versao).toBe(1)
  expect(await host.publicacoes!.publicar(conteudo, alvo)).toEqual({ ...primeira, repetido: true })
  expect(await host.publicacoes!.obter(alvo.perfil)).toEqual(primeira.publicacao)
  expect((await host.abrirCenario(c.id)).revisao).toBe(0)
  const pessoal = await host.criarMundo('conta', 'Privado'),
    privada = await host.criarCenario(pessoal.id, 'Casa')
  const pp = await host.prepararExportacao(privada.id, 0)
  await expect(
    host.publicacoes!.publicar(pacote({ ...pp.fonte, digest: pp.digest }), destino()),
  ).rejects.toThrow(/equipe/i)
  expect(criarHostEmMemoria().publicacoes).toBeUndefined()
})

test('duas publicações de ensaio concorrentes não sobrescrevem a versão e a repetição resiste à exclusão da fonte', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('equipe', 'Faísca')
  const c = await host.criarCenario(mundo.id, 'Praça'),
    p = await host.prepararExportacao(c.id, 0)
  const conteudo = pacote({ ...p.fonte, digest: p.digest }),
    a = destino(),
    b = destino()
  const r = await Promise.allSettled([
    host.publicacoes!.publicar(conteudo, a),
    host.publicacoes!.publicar(conteudo, b),
  ])
  expect(r.filter((v) => v.status === 'fulfilled')).toHaveLength(1)
  expect(r.filter((v) => v.status === 'rejected')).toHaveLength(1)
  const vencedor = r[0]!.status === 'fulfilled' ? a : b
  const atual = await host.publicacoes!.obter(a.perfil)
  expect(atual).not.toBeNull()
  await host.apagarCenario(c.id)
  expect((await host.publicacoes!.publicar(conteudo, vencedor)).publicacao).toEqual(atual!)
  expect((await host.espacos()).find((e) => e.tipo === 'equipe')!.usadoBytes).toBeGreaterThan(0)
})

/** Uma cena guardada no espaço da equipe, publicada na v1 (meio-dia) e na v2 (fim de tarde). */
async function duasVersoes(
  publicacoes?: (host: ReturnType<typeof criarHostEmMemoria>) => PublicacoesDeCenariosHost,
) {
  const host = criarHostEmMemoria({ equipe: true })
  const porta = publicacoes ? publicacoes(host) : host.publicacoes!
  const mundo = await host.criarMundo('equipe', 'Faísca'),
    c = await host.criarCenario(mundo.id, 'Praça')
  const p = await host.prepararExportacao(c.id, 0),
    fonte = { ...p.fonte, digest: p.digest }
  const v1 = await porta.publicar(pacote(fonte), destino())
  const v2 = await porta.publicar(pacote(fonte, 18), { ...destino(), versaoEsperada: 1 })
  const lista = await porta.listarVersoes(destino().perfil)
  const anterior = lista.versoes.find((v) => v.id === v1.publicacao.id)!
  const volta = {
    perfil: destino().perfil,
    versaoEsperada: 2,
    operacaoId: crypto.randomUUID(),
    versao: anterior,
  }
  return { host, porta, v1: v1.publicacao, v2: v2.publicacao, lista, volta }
}

test('host de ensaio lista as versões da ilha, a mais nova no ar e as outras guardadas', async () => {
  const b = await duasVersoes()
  expect(b.lista.perfil).toEqual(destino().perfil)
  expect(b.lista.versoes.map((v) => [v.versao, v.atual])).toEqual([
    [2, true],
    [1, false],
  ])
  expect(b.lista.versoes[1]).toMatchObject({
    id: b.v1.id,
    fonte: { cenario: b.v1.fonte.cenario, revisao: 0 },
    manifesto: b.v1.manifesto,
  })
  expect(b.lista.versoes[1]).not.toHaveProperty('espacoId')
  expect((await b.porta.listarVersoes({ tipo: 'arquipelago-v2', ilha: 'bosque' })).versoes).toEqual(
    [],
  )
})

test('host de ensaio volta para uma versão anterior como versão nova, com CAS e repetição', async () => {
  const b = await duasVersoes()
  const r = await b.porta.voltarParaVersao(b.volta)
  expect(r.repetido).toBe(false)
  expect(r.publicacao).toMatchObject({ versao: 3, fonte: b.v1.fonte, manifesto: b.v1.manifesto })
  expect(r.publicacao.id).not.toBe(b.v1.id)
  expect(await b.porta.obter(destino().perfil)).toEqual(r.publicacao)
  expect(
    (await b.porta.listarVersoes(destino().perfil)).versoes.map((v) => [v.versao, v.atual]),
  ).toEqual([
    [3, true],
    [2, false],
    [1, false],
  ])
  // A mesma operação de novo devolve a mesma versão, sem criar outra.
  expect(await b.porta.voltarParaVersao(b.volta)).toEqual({ ...r, repetido: true })
  expect((await b.porta.listarVersoes(destino().perfil)).versoes).toHaveLength(3)
  // Quem viu a v2 no ar e pede de novo (outra operação) recebe o conflito: agora é a v3.
  await expect(
    b.porta.voltarParaVersao({ ...b.volta, operacaoId: crypto.randomUUID() }),
  ).rejects.toBeInstanceOf(PublicacaoDesatualizada)
  // A versão no ar não "volta"; o id da operação de outra coisa também não serve.
  const noAr = (await b.porta.listarVersoes(destino().perfil)).versoes[0]!
  await expect(
    b.porta.voltarParaVersao({
      ...b.volta,
      operacaoId: crypto.randomUUID(),
      versaoEsperada: 3,
      versao: noAr,
    }),
  ).rejects.toThrow(/já está no ar/)
  await expect(
    b.porta.voltarParaVersao({ ...b.volta, versao: { ...b.volta.versao, id: b.v2.id } }),
  ).rejects.toThrow(/operação/)
  // E a numeração só cresce: publicar depois da volta é a v4.
  const p = await b.host.prepararExportacao(b.v1.fonte.cenario, 0)
  const v4 = await b.porta.publicar(pacote({ ...p.fonte, digest: p.digest }), {
    ...destino(),
    versaoEsperada: 3,
  })
  expect(v4.publicacao.versao).toBe(4)
})

test('host de ensaio recusa voltar quando um arquivo da versão saiu do espaço', async () => {
  const soltos = new Set<string>()
  const b = await duasVersoes((host) =>
    criarPublicacoesEmMemoria({
      preparar: (id, revisao, sinal) => host.prepararExportacao(id, revisao, sinal),
      guardar: () => {},
      presente: (_espacoId, digest) => !soltos.has(digest),
    }),
  )
  soltos.add(b.v1.manifesto.digest)
  await expect(b.porta.voltarParaVersao(b.volta)).rejects.toThrow(
    /arquivos desta versão já saíram do espaço da equipe/,
  )
  expect((await b.porta.obter(destino().perfil))?.id).toBe(b.v2.id)
  expect((await b.porta.listarVersoes(destino().perfil)).versoes).toHaveLength(2)
})

test('host HTTP lista e volta pelo BFF, conferindo a resposta e o conflito do servidor', async () => {
  const versao = {
    id: '44444444-4444-4444-8444-444444444444',
    versao: 1,
    fonte: { cenario: CENARIO, revisao: 0 },
    manifesto: { digest: 'b'.repeat(64), bytes: 10 },
    publicadaEm: '2026-11-21T12:00:00.000Z',
    autorId: PESSOA,
    atual: false,
  }
  const lista = {
    perfil: destino().perfil,
    versoes: [
      {
        ...versao,
        id: '55555555-5555-4555-8555-555555555555',
        versao: 2,
        manifesto: { digest: 'c'.repeat(64), bytes: 12 },
        atual: true,
      },
      versao,
    ],
  }
  const pedidos: { caminho: string; metodo: string; corpo: unknown }[] = []
  let resposta: () => Response = () => Response.json(lista)
  const host = criarHostHttp({
    pessoaId: PESSOA,
    buscar: async (caminho, opcoes = {}) => {
      pedidos.push({
        caminho,
        metodo: opcoes.method ?? 'GET',
        corpo: opcoes.body ? JSON.parse(String(opcoes.body)) : undefined,
      })
      return resposta()
    },
  })
  expect(await host.publicacoes!.listarVersoes(destino().perfil)).toEqual(lista)
  expect(pedidos.at(-1)).toMatchObject({
    caminho: '/api/cenarios/publicacoes/perfis/sua-ilha/versoes',
    metodo: 'GET',
  })
  // Lista de outra ilha não chega à tela.
  resposta = () => Response.json({ ...lista, perfil: { tipo: 'arquipelago-v2', ilha: 'pico' } })
  await expect(host.publicacoes!.listarVersoes(destino().perfil)).rejects.toThrow()

  const volta = {
    perfil: destino().perfil,
    versaoEsperada: 2,
    operacaoId: crypto.randomUUID(),
    versao,
  }
  const publicacao = {
    id: crypto.randomUUID(),
    perfil: destino().perfil,
    versao: 3,
    fonte: { ...versao.fonte, digest: 'a'.repeat(64) },
    manifesto: versao.manifesto,
  }
  resposta = () => Response.json({ publicacao, repetido: false })
  expect(await host.publicacoes!.voltarParaVersao(volta)).toEqual({ publicacao, repetido: false })
  expect(pedidos.at(-1)).toEqual({
    caminho: '/api/cenarios/publicacoes/voltar',
    metodo: 'POST',
    corpo: {
      operacaoId: volta.operacaoId,
      perfil: volta.perfil,
      versaoEsperada: 2,
      publicacaoId: versao.id,
    },
  })
  // Conteúdo que não é o da versão escolhida não vira sucesso.
  resposta = () =>
    Response.json({
      publicacao: { ...publicacao, manifesto: { digest: 'f'.repeat(64), bytes: 1 } },
      repetido: false,
    })
  await expect(host.publicacoes!.voltarParaVersao(volta)).rejects.toThrow(/conteúdo/)
  resposta = () =>
    Response.json(
      {
        error: {
          code: 'PUBLICACAO_CENARIO_CONFLITANTE',
          message: 'O destino mudou em outro lugar',
        },
      },
      { status: 409 },
    )
  await expect(host.publicacoes!.voltarParaVersao(volta)).rejects.toBeInstanceOf(
    PublicacaoDesatualizada,
  )
  resposta = () =>
    Response.json(
      {
        error: {
          code: 'PUBLICACAO_CENARIO_SEM_ARQUIVOS',
          message: 'Alguns arquivos desta versão já saíram do espaço da equipe',
        },
      },
      { status: 409 },
    )
  await expect(host.publicacoes!.voltarParaVersao(volta)).rejects.toThrow(/já saíram do espaço/)
  expect(pedidos.every((p) => p.caminho.startsWith('/api/cenarios/publicacoes/'))).toBe(true)
})
