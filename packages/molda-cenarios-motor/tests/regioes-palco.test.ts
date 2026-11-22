import { expect, test } from 'bun:test'
import { criarDocumentoVazio, type DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, LineSegments } from 'three'
import { bordaDaRegiao, centroDaRegiao, RegioesDoPalco } from '../src/jogo/desenho-de-regiao'

/**
 * As regiões como guias da aba Jogo (lote 7 da conclusão, 22/11/2026): a borda acompanha o chão a
 * cada 2 m no máximo, 15 cm acima dele, e some com as guias.
 */

const vertices = (dados: Float32Array) => {
  const pontos: [number, number, number][] = []
  for (let i = 0; i < dados.length; i += 3) pontos.push([dados[i]!, dados[i + 1]!, dados[i + 2]!])
  return pontos
}

test('a borda fecha os quatro lados e acompanha o relevo', () => {
  const morro = (x: number, z: number) => x * 0.5 + z * 0.25
  const borda = bordaDaRegiao({ x0: 0, z0: 0, x1: 10, z1: 4 }, morro)
  const pontos = vertices(borda)
  // 10 m em passos de 2 m = 5 segmentos; 4 m = 2 segmentos. Dois lados de cada: 14 segmentos.
  expect(pontos.length).toBe(14 * 2)
  for (const [x, y, z] of pontos) expect(y).toBeCloseTo(morro(x, z) + 0.15, 5)
  // Fecha: o último ponto volta ao primeiro canto.
  expect(pontos[0]?.[0]).toBe(0)
  expect(pontos[0]?.[1]).toBeCloseTo(0.15, 6)
  expect(pontos[0]?.[2]).toBe(0)
  expect(pontos.at(-1)?.[0]).toBeCloseTo(0, 6)
  expect(pontos.at(-1)?.[2]).toBeCloseTo(0, 6)
  expect(centroDaRegiao({ x0: 0, z0: 0, x1: 10, z1: 4 })).toEqual({ x: 5, z: 2 })
})

test('o palco desenha as regiões do documento e limpa quando as guias saem', () => {
  const doc: DocumentoDeCenario = {
    ...criarDocumentoVazio('ilha', 'Ilha'),
    regioes: [
      {
        id: 'vila',
        nome: 'Vila',
        caixa: { x0: -8, z0: -8, x1: 0, z1: 8 },
        vizinhas: ['floresta'],
      },
      {
        id: 'floresta',
        nome: 'Floresta',
        caixa: { x0: 0, z0: -8, x1: 8, z1: 8 },
        vizinhas: ['vila'],
      },
    ],
  }
  const palco = new RegioesDoPalco()
  const linhas = palco.grupo.children.find((c) => c instanceof LineSegments) as LineSegments
  palco.definir(doc)
  const posicoes = (linhas.geometry as BufferGeometry).getAttribute('position')
  // Duas regiões de 8 x 16 m: (4 + 8) * 2 segmentos cada, dois pontos por segmento.
  expect(posicoes.count).toBe(2 * 24 * 2)
  // No chão plano a borda fica a 15 cm.
  expect(posicoes.getY(0)).toBeCloseTo(0.15, 6)
  palco.limpar()
  expect((linhas.geometry as BufferGeometry).getAttribute('position')).toBeUndefined()
  // Depois de limpar, uma mudança do relevo não volta a desenhar o documento antigo.
  palco.atualizarTerreno()
  expect((linhas.geometry as BufferGeometry).getAttribute('position')).toBeUndefined()
  // Sem regiões, nada.
  palco.definir(criarDocumentoVazio('vazio', 'Vazio'))
  expect((linhas.geometry as BufferGeometry).getAttribute('position')).toBeUndefined()
  palco.descartar()
})

test('no terreno sem relevo carregado, o palco espera', () => {
  const doc = {
    ...criarDocumentoVazio('ilha', 'Ilha'),
    base: {
      tipo: 'terreno' as const,
      cobertura: 'grade' as const,
      origem: { x: 0, z: 0 },
      passo: 1,
      colunas: 16,
      linhas: 16,
      min: 0,
      max: 1,
      fundo: 0,
      pecas: [],
    },
    regioes: [{ id: 'a', nome: 'A', caixa: { x0: 0, z0: 0, x1: 8, z1: 8 }, vizinhas: [] }],
  } as unknown as DocumentoDeCenario
  const palco = new RegioesDoPalco()
  const linhas = palco.grupo.children.find((c) => c instanceof LineSegments) as LineSegments
  palco.definir(doc)
  expect((linhas.geometry as BufferGeometry).getAttribute('position')).toBeUndefined()
  palco.definir(doc, () => 2)
  expect((linhas.geometry as BufferGeometry).getAttribute('position').getY(0)).toBeCloseTo(2.15, 6)
  palco.descartar()
})
