import { afterAll, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  LIMITE_DE_ARQUIVOS,
  LIMITE_DO_CONJUNTO,
} from '../../molda-cenarios-motor/src/importacao/conjunto'
import { criarContexto, executarFerramenta } from '../src/oficina/ferramentas'
import type { ExportacaoFeita, ModelosPreparados } from '../src/oficina/oficina-pagina'
import {
  arquivosParaTrazer,
  type ExecutarPagina,
  exportarCenario,
  TETO_DE_ARQUIVOS,
  TETO_DE_BYTES,
  trazerModelos,
} from '../src/oficina/trazer-e-exportar'

const pasta = mkdtempSync(join(tmpdir(), 'sz-agente-teste-'))
afterAll(() => rmSync(pasta, { recursive: true, force: true }))

/** Um dublê da página sem janela que fala com as rotas do agente como a página de verdade. */
function pagina(
  responder: (
    pronta: string,
    pedir: (caminho: string, corpo?: Uint8Array) => Promise<Response>,
  ) => Promise<unknown>,
): ExecutarPagina {
  return async <T>(
    pronta: string,
    rotas: (url: URL, pedido: Request) => Promise<Response | null> | Response | null,
  ) => {
    const pedir = async (caminho: string, corpo?: Uint8Array) => {
      const url = `http://127.0.0.1/${caminho.replace(/^\//, '')}`
      const r = await rotas(
        new URL(url),
        new Request(url, corpo ? { method: 'POST', body: new Blob([corpo.slice()]) } : {}),
      )
      if (!r) throw Error(`rota ausente: ${caminho}`)
      return r
    }
    return (await responder(pronta, pedir)) as T
  }
}

test('os tetos do agente são os mesmos da conversão da oficina', () => {
  expect(TETO_DE_ARQUIVOS).toBe(LIMITE_DE_ARQUIVOS)
  expect(TETO_DE_BYTES).toBe(LIMITE_DO_CONJUNTO)
})

test('trazer aceita arquivos soltos e pastas inteiras, com a pasta escolhida no caminho', () => {
  const pacote = join(pasta, 'Pacote')
  mkdirSync(join(pacote, 'sub'), { recursive: true })
  writeFileSync(join(pacote, 'arvore.glb'), 'a')
  writeFileSync(join(pacote, 'sub', 'pedra.obj'), 'bb')
  writeFileSync(join(pacote, '.oculto'), 'x')
  writeFileSync(join(pasta, 'solto.fbx'), 'ccc')
  const lista = arquivosParaTrazer([pacote, join(pasta, 'solto.fbx')])
  expect(lista.map((a) => a.caminho)).toEqual([
    'Pacote/arvore.glb',
    'Pacote/sub/pedra.obj',
    'solto.fbx',
  ])
  expect(lista.map((a) => a.bytes)).toEqual([1, 2, 3])
  expect(() => arquivosParaTrazer([join(pasta, 'nao-existe.glb')])).toThrow('Não achei')
})

test('trazer_modelos: a página converte, o agente envia à biblioteca e devolve as medidas', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Trazidos', licenca: 'propria' }),
    arquivo = join(pasta, 'farol.glb')
  writeFileSync(arquivo, 'glb de ensaio: farol')
  let pedidoVisto: unknown = null
  const executar = pagina(async (pronta, pedir) => {
    expect(pronta).toBe('prepararModelos')
    pedidoVisto = await (await pedir('/pedido')).json()
    const bytes = new Uint8Array(await (await pedir('/entrada/0')).arrayBuffer())
    await pedir('/pronto/0/conteudo', bytes)
    await pedir('/pronto/0/retrato', new Uint8Array([7, 7]))
    return {
      prontos: [
        {
          nome: 'Farol',
          pasta: '',
          etiquetas: [],
          digest: await digestDosBytes(bytes),
          min: [-1.5, 0, -1.5],
          max: [1.5, 9, 1.5],
          triangulos: 840,
          tipoDoRetrato: 'image/webp',
        },
      ],
      recusados: [{ arquivo: 'textura-solta.png', motivo: 'Formato não suportado' }],
    } satisfies ModelosPreparados
  })
  const valor = await trazerModelos(host, biblioteca.id, [arquivo], executar)
  expect(pedidoVisto).toEqual({ arquivos: [{ caminho: 'farol.glb', nome: 'farol.glb' }] })
  expect(valor.trazidos).toHaveLength(1)
  expect(valor.trazidos[0]).toMatchObject({
    nome: 'Farol',
    triangulos: 840,
    medidas: { largura: 3, altura: 9, profundidade: 3 },
  })
  expect(valor.recusados).toHaveLength(1)
  const pagina1 = await host.listarModelos(biblioteca.id, {})
  expect(pagina1.itens.map((m) => m.id)).toContain(valor.trazidos[0]!.id)
})

test('exportar_cenario: a revisão conferida vai à página e o pacote é gravado sem sobrescrever', async () => {
  const host = criarHostEmMemoria({ equipe: true }),
    mundo = await host.criarMundo('conta', 'Mundo'),
    cenario = await host.criarCenario(mundo.id, 'Ilha'),
    saida = join(pasta, 'exportados')
  mkdirSync(saida)
  const pedidos: unknown[] = []
  const executar = pagina(async (pronta, pedir) => {
    expect(pronta).toBe('exportarCenario')
    pedidos.push(await (await pedir('/pedido')).json())
    await pedir('/resultado', new TextEncoder().encode('PK pacote'))
    return {
      nome: 'ilha-r0-three.zip',
      bytes: 9,
      medidas: { malhas: 1, triangulos: 2, recursos: 3, bytesDosRecursos: 4 },
      avisos: [],
    } satisfies ExportacaoFeita
  })
  const exportar = (
    extra: { juntar?: boolean; tamanhoDaRegiao?: number; revisaoEsperada?: number } = {},
  ) => exportarCenario(host, cenario.id, { destino: 'three', saida, ...extra }, executar)
  const a = await exportar({ juntar: true, tamanhoDaRegiao: 128 })
  expect(a.arquivo).toBe(join(saida, 'ilha-r0-three.zip'))
  expect(readFileSync(a.arquivo, 'utf8')).toBe('PK pacote')
  expect(pedidos[0]).toMatchObject({
    preparo: { fonte: { cenario: cenario.id, revisao: 0 } },
    opcoes: { destino: 'three', juntar: true, tamanhoDaRegiao: 128 },
  })
  // De novo no mesmo lugar: o arquivo anterior fica, o novo ganha " (2)".
  const segunda = await exportar()
  expect(segunda.arquivo).toBe(join(saida, 'ilha-r0-three (2).zip'))
  expect(pedidos[1]).toMatchObject({ opcoes: { juntar: false, tamanhoDaRegiao: 64 } })
  // Revisão vencida: o servidor recusa e nada é gravado.
  await expect(exportar({ revisaoEsperada: 5 })).rejects.toThrow()
  expect(pedidos).toHaveLength(2)
})

test('as duas ferramentas conferem a entrada antes de abrir a página', async () => {
  let abriu = false
  const contexto = {
    ...criarContexto(criarHostEmMemoria({ equipe: true })),
    executarPagina: (async () => {
      abriu = true
      return {}
    }) as ExecutarPagina,
  }
  const uuid = '00000000-0000-4000-8000-000000000000'
  for (const [nome, entrada] of [
    ['trazer_modelos', { bibliotecaId: uuid, caminhos: [] }],
    ['trazer_modelos', { bibliotecaId: 'x', caminhos: ['a.glb'] }],
    ['exportar_cenario', { cenarioId: uuid, destino: 'fbx' }],
    ['exportar_cenario', { cenarioId: uuid, destino: 'glb', tamanhoDaRegiao: 4 }],
  ] as const) {
    const r = await executarFerramenta(contexto, nome, entrada)
    expect(r.ok).toBe(false)
  }
  expect(abriu).toBe(false)
})
