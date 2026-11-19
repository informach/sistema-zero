import { expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { criarHostHttp } from '../src/oficina/host-http'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import type { DestinoDaPublicacao } from '../src/oficina/publicacoes'

const CENARIO = '11111111-1111-4111-8111-111111111111'
const ESPACO = '22222222-2222-4222-8222-222222222222'
const PESSOA = '33333333-3333-4333-8333-333333333333'
const destino = (): DestinoDaPublicacao => ({
  perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
  versaoEsperada: 0,
  operacaoId: crypto.randomUUID(),
})
function pacote(fonte = { cenario: CENARIO, revisao: 0, digest: 'a'.repeat(64) }): PacoteCompilado {
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
      ambiente: { hora: 12 },
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
