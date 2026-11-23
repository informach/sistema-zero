/**
 * Os casos compartilhados do relevo em campo entre o núcleo TypeScript e o `cenario.py` do Raylib
 * (plano "Mundos de 2 km", lote 6, 23/11/2026). As entradas ficam aqui (um relevo pequeno de
 * 64 × 64 células, cinco camadas em dois PNG de pesos e alguns buracos); o esperado sai das funções
 * do núcleo, que são a régua: `malhaDoPedacoDoRelevo` (vértices, cores, triângulos e saias) e
 * `alturaDoCampo` (a altura que o personagem pisa). O teste TypeScript (`cenario-relevo.test.ts`)
 * recalcula e compara, e o Python (`__tests__/cenario_test.py`) confere a cópia dele.
 *
 * `bun scripts/gen-raylib-relevo-cases.ts` grava; `--check` só confere.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  malhaDoPedacoDoRelevo,
  type PedacoDoRelevoPython,
  saiaDoPedaco,
} from '@sistemazero/molda-cenarios-core/compilar'
import { alturaDoCampo, codificarPngDePesos } from '@sistemazero/molda-cenarios-core/v2'

const DESTINO = fileURLToPath(
  new URL('../src/runtime/python/raylib/__tests__/relevo-casos.json', import.meta.url),
)

const forma = { origem: { x: -30, z: 10 }, passo: 2, colunas: 64, linhas: 64 }
const largura = forma.colunas + 1

/** Gerador determinístico (LCG), para o arquivo não mudar a cada rodada. */
function sorteio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function entradasDoRelevo() {
  const r = sorteio(7)
  const alturas: number[] = []
  for (let j = 0; j <= forma.linhas; j++)
    for (let i = 0; i <= forma.colunas; i++)
      alturas.push(
        Math.fround(4 * Math.sin(i / 7) + 3 * Math.cos(j / 5) + (i * j) / 900 + r() * 0.8),
      )
  // Cinco camadas: os pesos somam 255 em quase todo vértice; uns poucos com o alfa 0 e outros
  // com tudo zero (o leitor não pode perder o peso de quem tem alfa 0).
  const a = new Uint8Array(largura * largura * 4),
    b = new Uint8Array(largura * largura * 4)
  for (let v = 0; v < largura * largura; v++) {
    const k = Math.floor(r() * 5),
      resto = Math.floor(r() * 120)
    const pesos = [0, 0, 0, 0, 0]
    if (v % 97 !== 0) {
      pesos[k] = 255 - resto
      pesos[(k + 1) % 5] = resto
    }
    a.set(pesos.slice(0, 4), v * 4)
    b[v * 4] = pesos[4]!
  }
  const buracos: number[] = []
  for (let j = 10; j < 13; j++) for (let i = 20; i < 24; i++) buracos.push(j * forma.colunas + i)
  const camadas = [
    { cor: '#ffffff', corMedia: '#6a8f3c' },
    { cor: '#e0d0b0', corMedia: '#ffffff' },
    { cor: '#ffffff', corMedia: '#8a7a66' },
    { cor: '#a0c8ff', corMedia: '#d0d0d0' },
    { cor: '#f0f0f0', corMedia: '#ffffff' },
  ]
  return { alturas, pesos: [a, b], buracos, camadas }
}

/** Os números em base64 (float32, bytes ou uint16, little-endian): exatos e curtos no JSON. */
const b64 = (a: Float32Array | Uint8Array | Uint16Array) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64')

const PEDACOS: PedacoDoRelevoPython[] = [
  // Um pedaço completo (um vértice por célula) que passa pelos buracos.
  { i0: 16, j0: 8, celulas: 16, passo: 1 },
  // O relevo inteiro no desenho grosso (um vértice a cada 8 células).
  { i0: 0, j0: 0, celulas: 64, passo: 8 },
  // Um pedaço grosso no canto de cima.
  { i0: 32, j0: 32, celulas: 32, passo: 8 },
]

const AMOSTRAS = [
  [-30, 10],
  [-29.3, 10.7],
  [0, 50],
  [12.25, 37.9],
  [97.9, 137.9],
  [15.5, 43.25],
]

export async function casosDoRelevo() {
  const e = entradasDoRelevo()
  const mascara = new Uint8Array(forma.colunas * forma.linhas)
  for (const i of e.buracos) mascara[i] = 1
  const dados = { forma, alturas: e.alturas, buracos: mascara, pesos: e.pesos, camadas: e.camadas }
  const png = async (rgba: Uint8Array) =>
    Buffer.from(await codificarPngDePesos({ largura, altura: largura, rgba })).toString('base64')
  return {
    forma,
    alturas: b64(Float32Array.from(e.alturas)),
    buracos: e.buracos,
    camadas: e.camadas,
    pesosPng: [await png(e.pesos[0]!), await png(e.pesos[1]!)],
    pedacos: PEDACOS.map((p) => {
      const m = malhaDoPedacoDoRelevo(dados, p)
      return {
        pedaco: p,
        saia: saiaDoPedaco(dados, p),
        vertices: b64(Float32Array.from(m.vertices)),
        cores: b64(Uint8Array.from(m.cores)),
        indices: b64(Uint16Array.from(m.indices)),
      }
    }),
    alturasNoPonto: AMOSTRAS.map(([x, z]) => ({
      x,
      z,
      altura: alturaDoCampo({ ...forma, alturas: e.alturas }, x!, z!),
    })),
  }
}

if (import.meta.main) {
  const casos = await casosDoRelevo()
  if (process.argv.includes('--check')) {
    const gravado = JSON.stringify(JSON.parse(readFileSync(DESTINO, 'utf8')))
    if (gravado !== JSON.stringify(casos)) {
      console.error(
        'Os casos do relevo do Raylib mudaram. Rode bun scripts/gen-raylib-relevo-cases.ts.',
      )
      process.exit(1)
    }
  } else {
    writeFileSync(DESTINO, `${JSON.stringify(casos)}\n`)
    console.log(`Gravado. Formate com: bunx biome format --write ${DESTINO}`)
  }
}
