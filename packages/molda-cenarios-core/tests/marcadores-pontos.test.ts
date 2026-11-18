import { expect, test } from 'bun:test'
import {
  configuracaoDosControles,
  controlesDoMarcador,
  criarDocumentoVazio,
  MarcadorSchema,
} from '../src/v2'

test('alças de rota girada fazem ida e volta com raiz livre ou no chão e controles elevados', () => {
  const d = criarDocumentoVazio('d', 'Pontos')
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  const fonte = (x: number, z: number) => (x * x) / 30 + z * 0.1
  for (const noChao of [false, true])
    for (const seguirTerreno of [false, true]) {
      const m = MarcadorSchema.parse({
          id: 'm',
          nome: 'Rota',
          grupo: null,
          oculto: false,
          bloqueado: false,
          posicao: { x: 2, y: 1.5, z: 3 },
          giro: Math.PI * 0.75,
          noChao,
          objeto: null,
          configuracao: {
            tipo: 'rota',
            pontos: [
              { x: 1, y: 2, z: 0 },
              { x: 4, y: 3, z: 2 },
            ],
            fechada: false,
            seguirTerreno,
          },
        }),
        antes = structuredClone(m),
        pontos = controlesDoMarcador(d, m, fonte),
        volta = configuracaoDosControles(d, m, pontos, fonte)
      expect(volta.tipo).toBe('rota')
      if (volta.tipo !== 'rota' || m.configuracao?.tipo !== 'rota') throw Error('Rota esperada')
      for (let i = 0; i < volta.pontos.length; i++)
        for (const e of ['x', 'y', 'z'] as const)
          expect(volta.pontos[i]![e]).toBeCloseTo(m.configuracao.pontos[i]![e], 10)
      expect(m).toEqual(antes)
    }
})
test('polígono conserva o plano, rejeita controles fora dele e a mesma validação recusa auto-interseções', () => {
  const d = criarDocumentoVazio('d', 'Zona'),
    m = MarcadorSchema.parse({
      id: 'm',
      nome: 'Zona',
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao: { x: 4, y: 2, z: 3 },
      giro: Math.PI / 2,
      noChao: false,
      objeto: null,
      configuracao: {
        tipo: 'zona',
        forma: {
          tipo: 'poligono',
          altura: 2,
          pontos: [
            { x: 0, z: 0 },
            { x: 2, z: 0 },
            { x: 2, z: 2 },
            { x: 0, z: 2 },
          ],
        },
      },
    }),
    pontos = controlesDoMarcador(d, m)
  expect(pontos.every((p) => p.y === 2)).toBe(true)
  const volta = configuracaoDosControles(d, m, pontos)
  expect(volta).toMatchObject({ tipo: 'zona', forma: { altura: 2 } })
  expect(() =>
    configuracaoDosControles(
      d,
      m,
      pontos.map((p, i) => ({ ...p, y: p.y + i })),
    ),
  ).toThrow('plano')
  expect(() =>
    configuracaoDosControles(d, m, [pontos[0]!, pontos[2]!, pontos[1]!, pontos[3]!]),
  ).toThrow()
  expect(() => configuracaoDosControles(d, m, [])).toThrow()
})
