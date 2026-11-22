/**
 * Os casos compartilhados das regiões entre o núcleo TypeScript e o `cenario.py` do Raylib (lote 7b
 * da conclusão do plano do Estúdio, 22/11/2026). As entradas ficam aqui; o esperado sai das funções
 * do núcleo (`calcularPertencaDasRegioes` e `criarPlanoDaCarga`), que são a régua. O teste
 * TypeScript (`cenario-regioes.test.ts`) recalcula e compara, e o Python
 * (`__tests__/cenario_test.py`) confere a cópia dele contra o mesmo arquivo.
 *
 * `bun scripts/gen-raylib-region-cases.ts` grava; `--check` só confere.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  calcularPertencaDasRegioes,
  criarPlanoDaCarga,
  type ItensDasRegioes,
  type RegiaoDaCarga,
} from '@sistemazero/molda-cenarios-core/compilar'
import { errosDasRegioesNoRetangulo } from '@sistemazero/molda-cenarios-core/v2'

const DESTINO = fileURLToPath(
  new URL('../src/runtime/python/raylib/__tests__/regioes-casos.json', import.meta.url),
)

const caixa = (x0: number, z0: number, x1: number, z1: number) => ({ x0, z0, x1, z1 })
const vol = (x0: number, z0: number, x1: number, z1: number) => ({
  min: { x: x0, y: 0, z: z0 },
  max: { x: x1, y: 2, z: z1 },
})

// Duas regiões encostadas pela borda x = 0.
const DUAS = [
  { id: 'vila', nome: 'Vila', caixa: caixa(-50, -50, 0, 50), vizinhas: ['praia'] },
  { id: 'praia', nome: 'Praia', caixa: caixa(0, -50, 50, 50), vizinhas: ['vila'] },
]

const ITENS: ItensDasRegioes = {
  entidades: [
    { id: 'casa', propriedades: {} },
    { id: 'bau', propriedades: { moedas: 3 } },
    { id: 'lago' },
    { id: 'mar' },
  ],
  nos: [
    { id: 'so-na-vila', entidade: null, volume: vol(-20, -5, -10, 5) },
    { id: 'na-borda', entidade: null, volume: vol(-2, -2, 2, 2) },
    { id: 'plano-na-borda', entidade: null, volume: vol(0, -2, 0, 2) },
    { id: 'encosta-na-borda', entidade: null, volume: vol(-4, -2, 0, 2) },
    { id: 'fora', entidade: null, volume: vol(60, 60, 70, 70) },
    {
      id: 'ator',
      entidade: 'casa',
      volume: vol(-20, -20, -18, -18),
      preservarHierarquia: true,
    },
    { id: 'bau-no', entidade: 'bau', volume: vol(10, 10, 12, 12) },
    {
      id: 'lote',
      entidade: null,
      volume: vol(-30, 0, -25, 5),
      faixas: [{ entidade: 'casa' }, { entidade: 'bau' }],
    },
    {
      id: 'lote-simples',
      entidade: null,
      volume: vol(20, 0, 25, 5),
      faixas: [{ entidade: 'casa' }],
    },
    { id: 'lago-a', entidade: 'lago', volume: vol(-10, 20, -5, 25), efeito: 'agua' },
    { id: 'lago-b', entidade: 'lago', volume: vol(-5, 20, -1, 25), efeito: 'agua' },
    { id: 'mar-no', entidade: 'mar', volume: vol(-100, -100, 100, 100), efeito: 'agua' },
  ],
  colisoes: [
    { id: 'chao', entidade: null, tipo: 'terreno', volume: vol(-50, -50, 50, 50) },
    { id: 'piso', entidade: null, tipo: 'caixa', volume: vol(-50, -50, 50, 50) },
    { id: 'pedra', entidade: null, tipo: 'caixa', volume: vol(30, 30, 32, 32) },
    { id: 'bau-col', entidade: 'bau', tipo: 'caixa', volume: vol(10, 10, 12, 12) },
    // A colisão da água fica só na Vila, mas a pegada inteira do lago chega à Praia.
    { id: 'lago-col', entidade: 'lago', tipo: 'agua', volume: vol(-10, 20, -6, 25) },
    { id: 'lago-fundo', entidade: 'lago', tipo: 'caixa', volume: vol(-3, 20, 3, 25) },
  ],
  aguas: [
    { id: 'lago', tipo: 'lago' },
    { id: 'mar', tipo: 'mar' },
    { id: 'poca', tipo: 'lago' },
  ],
  plano: { colisao: 'piso' },
}

// Três regiões em fila (A, B e C), vizinhas em par.
const FILA: RegiaoDaCarga[] = [
  { id: 'a', nome: 'Vila', caixa: caixa(0, 0, 100, 100), vizinhas: ['b'] },
  { id: 'b', nome: 'Floresta', caixa: caixa(100, 0, 200, 100), vizinhas: ['a', 'c'] },
  { id: 'c', nome: 'Caverna', caixa: caixa(200, 0, 300, 100), vizinhas: ['b'] },
]

type Passo = { foco: [number, number]; agora: number; camera?: [number, number] }

const ROTA: Passo[] = [
  { foco: [50, 50], agora: 0 },
  { foco: [99.8, 50], agora: 1 },
  { foco: [100.3, 50], agora: 2 },
  { foco: [100.6, 50], agora: 3 },
  { foco: [150, 50], agora: 4 },
  { foco: [50, 50], agora: 5 },
  { foco: [50, 50], agora: 6.5 },
  { foco: [50, 50], agora: 7.1 },
  { foco: [50, 50], agora: 8, camera: [50, -100] },
  { foco: [50, 150], agora: 9 },
  { foco: [50, 50], agora: 10 },
]
const DE_FORA: Passo[] = [
  { foco: [350, 50], agora: 0 },
  { foco: [250, 50], agora: 1 },
]

function percorrer(regioes: RegiaoDaCarga[], passos: Passo[]) {
  const plano = criarPlanoDaCarga(regioes),
    ordem = (ids: ReadonlySet<string>) => regioes.map((r) => r.id).filter((id) => ids.has(id))
  return passos.map((p) => {
    const e = plano.atualizar(
      { x: p.foco[0], z: p.foco[1] },
      p.agora,
      p.camera ? { x: p.camera[0], z: p.camera[1] } : undefined,
    )
    return {
      ...p,
      esperado: {
        atual: e.atual,
        segura: e.segura,
        obrigatorias: ordem(e.obrigatorias),
        carregadas: ordem(e.carregadas),
        entradas: [...e.entradas],
      },
    }
  })
}

// A régua do documento (revisão do lote 7b): cada conjunto de regiões e o chão, e os recados que
// o núcleo dá, na ordem.
type R = { id: string; nome: string; caixa: ReturnType<typeof caixa>; vizinhas: string[] }
const r = (id: string, nome: string, c: ReturnType<typeof caixa>, vizinhas: string[] = []): R => ({
  id,
  nome,
  caixa: c,
  vizinhas,
})
const CHAO = caixa(-100, -100, 100, 100)
const NOVE = Array.from({ length: 9 }, (_, i) =>
  r(`v${i}`, `V${i}`, caixa(-90 + i * 10, 50, -80 + i * 10, 60), ['a']),
)
const REGUA: { regioes: R[]; limite: ReturnType<typeof caixa> | null }[] = [
  {
    regioes: [r('a', 'Vila', caixa(0, 0, 10, 10)), r('b', 'Mata', caixa(10, 0, 20, 10))],
    limite: CHAO,
  },
  {
    regioes: [r('a', 'Vila', caixa(0, 0, 10, 10)), r('a', 'Outra', caixa(20, 20, 30, 30))],
    limite: CHAO,
  },
  { regioes: [r('a', '   ', caixa(0, 0, 10, 10))], limite: CHAO },
  {
    regioes: [r('a', 'Vila', caixa(0, 0, 10, 10)), r('b', ' vila ', caixa(20, 20, 30, 30))],
    limite: CHAO,
  },
  { regioes: [r('a', 'Vila', caixa(5, 0, 5, 10))], limite: CHAO },
  { regioes: [r('a', 'Vila', caixa(90, 0, 140, 10))], limite: CHAO },
  { regioes: [r('a', 'Vila', caixa(90, 0, 140, 10))], limite: null },
  { regioes: [r('a', 'Vila', caixa(0, 0, 10, 10), ['a'])], limite: CHAO },
  { regioes: [r('a', 'Vila', caixa(0, 0, 10, 10), ['zz'])], limite: CHAO },
  {
    regioes: [
      r('a', 'Vila', caixa(0, 0, 10, 10), ['b', 'b']),
      r('b', 'Mata', caixa(10, 0, 20, 10), ['a']),
    ],
    limite: CHAO,
  },
  {
    regioes: [r('a', 'Vila', caixa(0, 0, 10, 10), ['b']), r('b', 'Mata', caixa(10, 0, 20, 10))],
    limite: CHAO,
  },
  {
    regioes: [r('a', 'Vila', caixa(0, 0, 10, 10)), r('b', 'Mata', caixa(9, 0, 20, 10))],
    limite: CHAO,
  },
  {
    regioes: [
      r(
        'a',
        'Vila',
        caixa(-90, 0, 0, 50),
        NOVE.map((v) => v.id),
      ),
      ...NOVE,
    ],
    limite: CHAO,
  },
]

export function casosDasRegioes() {
  return {
    pertenca: {
      regioes: DUAS,
      itens: ITENS,
      esperado: calcularPertencaDasRegioes(DUAS, ITENS).map(({ id, nos, colisoes, aguas }) => ({
        id,
        nos,
        colisoes,
        aguas,
      })),
    },
    regua: REGUA.map((caso) => ({
      ...caso,
      esperado: errosDasRegioesNoRetangulo(caso.regioes, caso.limite),
    })),
    plano: [
      { regioes: FILA, passos: percorrer(FILA, ROTA) },
      { regioes: FILA, passos: percorrer(FILA, DE_FORA) },
    ],
  }
}

if (import.meta.main) {
  const texto = `${JSON.stringify(casosDasRegioes(), null, 2)}\n`
  if (process.argv.includes('--check')) {
    // Compara o conteúdo: o arquivo gravado passa pelo formatador do repositório (biome).
    const gravado = JSON.stringify(JSON.parse(readFileSync(DESTINO, 'utf8')))
    if (gravado !== JSON.stringify(casosDasRegioes())) {
      console.error(
        'Os casos das regiões do Raylib mudaram. Rode bun scripts/gen-raylib-region-cases.ts.',
      )
      process.exit(1)
    }
  } else {
    writeFileSync(DESTINO, texto)
    console.log(`Gravado. Formate com: bunx biome format --write ${DESTINO}`)
  }
}
