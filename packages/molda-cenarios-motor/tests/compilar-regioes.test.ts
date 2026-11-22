import { afterAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  type CenaCompilada,
  calcularPertencaDasRegioes,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { RegiaoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { juntarEstaticosDoPacote } from '../src/compilar/juncao'
import { exemplo, glb } from './fixtures/glb-compilacao'

/**
 * O "Juntar peças" com regiões (lote 5 da conclusão, 22/11/2026): os lotes são nós novos, então a
 * pertença é calculada de novo sobre eles; um lote não mistura peças de regiões diferentes; e o
 * objeto com propriedades fica fora dos lotes (o estado dele nunca descarrega). Sem regiões, o
 * pacote sai como antes.
 */

// O exportador glTF do three lê o arquivo pronto com o FileReader do navegador, que o Bun não
// tem. Um mínimo, só neste arquivo (o motor roda no navegador de verdade, na oficina).
const semFileReader = !('FileReader' in globalThis)
if (semFileReader)
  Object.assign(globalThis, {
    FileReader: class {
      result: ArrayBuffer | string | null = null
      onloadend: (() => void) | null = null
      readAsArrayBuffer(blob: Blob) {
        void blob.arrayBuffer().then((bytes) => {
          this.result = bytes
          this.onloadend?.()
        })
      }
      readAsDataURL(blob: Blob) {
        void blob.arrayBuffer().then((bytes) => {
          this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`
          this.onloadend?.()
        })
      }
    },
  })
afterAll(() => {
  if (semFileReader) Reflect.deleteProperty(globalThis, 'FileReader')
})

const REGIOES: RegiaoDeCenario[] = [
  { id: 'vila', nome: 'Vila', caixa: { x0: -0.5, z0: -5, x1: 4.5, z1: 5 }, vizinhas: ['floresta'] },
  {
    id: 'floresta',
    nome: 'Floresta',
    caixa: { x0: 4.5, z0: -5, x1: 20, z1: 5 },
    vizinhas: ['vila'],
  },
]

function pacote(regioes?: RegiaoDeCenario[]): PacoteCompilado {
  const m = exemplo()
  m.j.nodes = [{ mesh: 0 }]
  m.j.scenes = [{ nodes: [0] }]
  const bytes = glb(m.j, m.bin)
  const arquivo = {
    caminho: 'modelos/arvore.glb',
    digest: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
    mime: 'model/gltf-binary' as const,
    papel: 'modelo' as const,
    malhas: 1,
    triangulos: 1,
    verticesMaximos: 3,
  }
  const cena: CenaCompilada = {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Vale',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'vale', revisao: 3, digest: 'a'.repeat(64) },
    arquivos: [arquivo],
    entidades: [
      {
        id: 'casa',
        nome: 'Casa',
        tipo: 'objeto',
        grupo: null,
        propriedades: { uso: 'oficina' },
        oculto: false,
      },
    ],
    nos: Array.from({ length: 10 }, (_, i) => ({
      id: `no-${i}`,
      entidade: i === 3 ? 'casa' : null,
      arquivo: arquivo.caminho,
      matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, i, 0, 0, 1],
      volume: { min: { x: i, y: 0, z: 0 }, max: { x: i, y: 0, z: 0 } },
    })),
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
  if (regioes) cena.regioes = calcularPertencaDasRegioes(regioes, cena)
  return { cena, arquivos: new Map([[arquivo.caminho, bytes]]) }
}

test('sem regiões, a junção junta tudo como antes (a casa entra no lote)', async () => {
  const { cena } = await juntarEstaticosDoPacote(pacote(), new AbortController().signal)
  expect(cena.regioes).toBeUndefined()
  expect(cena.nos.some((n) => n.entidade === 'casa')).toBe(false)
  expect(cena.nos).toHaveLength(1)
})

test('com regiões, os lotes não misturam regiões, a casa fica fora e a pertença é refeita', async () => {
  const entrada = pacote(REGIOES)
  const antes = JSON.stringify(entrada.cena)
  const { cena } = await juntarEstaticosDoPacote(entrada, new AbortController().signal)
  // A entrada não muda.
  expect(JSON.stringify(entrada.cena)).toBe(antes)
  const casa = cena.nos.find((n) => n.entidade === 'casa')
  expect(casa?.id).toBe('no-3')
  const lotes = cena.nos.filter((n) => n.faixas)
  expect(lotes).toHaveLength(2)
  const [vila, floresta] = cena.regioes ?? []
  // Cada região leva só o lote dela; a casa é de todas.
  expect(vila?.nos).toHaveLength(1)
  expect(floresta?.nos).toHaveLength(1)
  expect(vila?.nos[0]).not.toBe(floresta?.nos[0])
  expect([...(vila?.nos ?? []), ...(floresta?.nos ?? [])]).not.toContain('no-3')
  expect(cena.regioes).toEqual(calcularPertencaDasRegioes(REGIOES, cena))
})
