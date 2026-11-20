import { expect, test } from 'bun:test'
import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import {
  MIME_DO_MANIFESTO,
  type PublicacaoParaOJogo,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { exemplo, glb } from '../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { lerCenarioPublicado } from '../src/sistemas/ler-cenario-publicado'

async function montar(
  o: {
    ausente?: boolean
    outraIlha?: boolean
    alterado?: boolean
    metaErrada?: boolean
    status?: number
  } = {},
) {
  const cena = {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'ensaio', revisao: 1, digest: 'a'.repeat(64) },
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
  const publicacao: PublicacaoParaOJogo = {
    id: crypto.randomUUID(),
    perfil: { tipo: 'arquipelago-v2', ilha: o.outraIlha ? 'bosque' : 'sua-ilha' },
    versao: 1,
    fonte: cena.fonte,
    manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
  }
  const acessos: string[] = [],
    downloads: RequestInit[] = []
  const porta: CenariosPublicadosDoJogo = {
    async perfil(ilha) {
      acessos.push(ilha)
      return { status: o.status ?? 200, corpo: { publicacao: o.ausente ? null : publicacao } }
    },
    async arquivo(id, digest) {
      acessos.push(`${id}:${digest}`)
      return {
        status: 200,
        corpo: {
          url: 'https://armazenamento.exemplo/imutavel?assinatura=teste',
          bytes: bytes.length,
          tipoDoConteudo: o.metaErrada ? 'text/html' : MIME_DO_MANIFESTO,
        },
      }
    },
  }
  const buscar = (async (_url, init) => {
    downloads.push(init!)
    return new Response(o.alterado ? new Uint8Array(bytes.length) : bytes)
  }) as typeof fetch
  return { porta, buscar, acessos, downloads, publicacao, cena }
}
test('carregador publicado preserva fonte e identidade da versão, sem levar credenciais ao blob', async () => {
  const b = await montar()
  const r = await lerCenarioPublicado(b.porta, 'sua-ilha', new AbortController().signal, b.buscar)
  expect(r?.publicacao).toEqual(b.publicacao)
  expect(r?.pacote.cena.fonte).toEqual(b.cena.fonte)
  expect(b.acessos).toHaveLength(2)
  expect(b.downloads[0]).toMatchObject({ credentials: 'omit', redirect: 'error' })
})
test('somente ausência explícita usa composição em código; acesso negado permanece erro', async () => {
  const b = await montar({ ausente: true })
  expect(
    await lerCenarioPublicado(b.porta, 'sua-ilha', new AbortController().signal, b.buscar),
  ).toBeNull()
  expect(b.downloads).toHaveLength(0)
  const negado = await montar({ status: 403 })
  await expect(
    lerCenarioPublicado(negado.porta, 'sua-ilha', new AbortController().signal, negado.buscar),
  ).rejects.toThrow(/403/)
  expect(negado.acessos).toHaveLength(1)
})
test('perfil errado, MIME divergente e hash adulterado não produzem pacote publicado', async () => {
  for (const o of [{ outraIlha: true }, { metaErrada: true }, { alterado: true }]) {
    const b = await montar(o)
    await expect(
      lerCenarioPublicado(b.porta, 'sua-ilha', new AbortController().signal, b.buscar),
    ).rejects.toThrow()
    if (!o.alterado) expect(b.downloads).toHaveLength(0)
  }
})
test('cancelamento anterior não consulta perfil ou arquivo', async () => {
  const b = await montar(),
    c = new AbortController()
  c.abort()
  await expect(lerCenarioPublicado(b.porta, 'sua-ilha', c.signal, b.buscar)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(b.acessos).toHaveLength(0)
  expect(b.downloads).toHaveLength(0)
})

test('GLB real com dois aliases é lido uma vez e recurso adulterado impede o pacote inteiro', async () => {
  const b = await montar(),
    origem = exemplo(),
    recurso = glb(origem.j, origem.bin)
  const digest = await digestDosBytes(recurso)
  const ref = {
    caminho: 'modelos/peca.glb',
    digest,
    bytes: recurso.length,
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  }
  const cena = { ...b.cena, arquivos: [ref, { ...ref, caminho: 'modelos/alias.glb' }] }
  const manifesto = new TextEncoder().encode(JSON.stringify(cena))
  const hash = await digestDosBytes(manifesto)
  const publicacao = { ...b.publicacao, manifesto: { digest: hash, bytes: manifesto.length } }
  const downloads: string[] = []
  let adulterar = false
  const porta: CenariosPublicadosDoJogo = {
    perfil: async () => ({ status: 200, corpo: { publicacao } }),
    arquivo: async (_id, d) => ({
      status: 200,
      corpo: {
        url: `https://armazenamento.exemplo/${d}`,
        bytes: d === hash ? manifesto.length : recurso.length,
        tipoDoConteudo: d === hash ? MIME_DO_MANIFESTO : ref.mime,
      },
    }),
  }
  const buscar = (async (url) => {
    const d = new URL(String(url)).pathname.slice(1)
    downloads.push(d)
    return new Response(
      d === hash ? manifesto : adulterar ? new Uint8Array(recurso.length) : recurso,
    )
  }) as typeof fetch
  const r = await lerCenarioPublicado(porta, 'sua-ilha', new AbortController().signal, buscar)
  expect(downloads).toEqual([hash, digest])
  expect(r!.pacote.arquivos.get(ref.caminho)).toEqual(recurso)
  expect(r!.pacote.arquivos.get('modelos/alias.glb')).toBe(r!.pacote.arquivos.get(ref.caminho))
  adulterar = true
  await expect(
    lerCenarioPublicado(porta, 'sua-ilha', new AbortController().signal, buscar),
  ).rejects.toThrow(/conteúdo/)
})

test('host com leitura em lote pede os endereços num pedido só e baixa cada hash uma vez', async () => {
  const b = await montar(),
    origem = exemplo(),
    recurso = glb(origem.j, origem.bin)
  const digest = await digestDosBytes(recurso)
  const ref = {
    caminho: 'modelos/peca.glb',
    digest,
    bytes: recurso.length,
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  }
  const cena = { ...b.cena, arquivos: [ref, { ...ref, caminho: 'modelos/alias.glb' }] }
  const manifesto = new TextEncoder().encode(JSON.stringify(cena))
  const hash = await digestDosBytes(manifesto)
  const publicacao = { ...b.publicacao, manifesto: { digest: hash, bytes: manifesto.length } }
  const pedidos: string[] = []
  const porta: CenariosPublicadosDoJogo = {
    perfil: async () => ({ status: 200, corpo: { publicacao } }),
    arquivo: async (_id, d) => {
      pedidos.push(`um:${d}`)
      return {
        status: 200,
        corpo: {
          url: `https://armazenamento.exemplo/${d}`,
          bytes: manifesto.length,
          tipoDoConteudo: MIME_DO_MANIFESTO,
        },
      }
    },
    arquivos: async (_id, ds) => {
      pedidos.push(`lote:${ds.length}`)
      return {
        status: 200,
        corpo: {
          arquivos: ds.map((d) => ({
            digest: d,
            url: `https://armazenamento.exemplo/${d}`,
            bytes: recurso.length,
            tipoDoConteudo: 'model/gltf-binary',
          })),
        },
      }
    },
  }
  const baixados: string[] = []
  const buscar = (async (url: string | URL) => {
    const caminho = new URL(String(url)).pathname.slice(1)
    baixados.push(caminho)
    return new Response(caminho === hash ? manifesto : recurso)
  }) as typeof fetch
  const r = await lerCenarioPublicado(porta, 'sua-ilha', new AbortController().signal, buscar)
  // Manifesto pelo pedido unitário; os dois aliases do GLB viram um lote com um hash só.
  expect(pedidos).toEqual([`um:${hash}`, 'lote:1'])
  expect(baixados.sort()).toEqual([digest, hash].sort())
  expect(r?.pacote.arquivos.get('modelos/peca.glb')).toEqual(recurso)
  expect(r?.pacote.arquivos.get('modelos/alias.glb')).toEqual(recurso)
  // Lote que responde fora da ordem ou com outro hash é recusado inteiro.
  const torta = {
    ...porta,
    arquivos: async () => ({ status: 200, corpo: { arquivos: [{ digest: 'f'.repeat(64) }] } }),
  }
  await expect(
    lerCenarioPublicado(torta, 'sua-ilha', new AbortController().signal, buscar),
  ).rejects.toThrow(/inventário/)
})
