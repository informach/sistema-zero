import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  inicioDoCenario,
  MarcadorSchema,
  pontoDoMarcador,
  pontoLocalDoMarcador,
  rotaDoMarcador,
  validarDocumento,
  volumeDoMarcador,
  zonaContemPonto,
} from '../src/v2'

const marcador = (configuracao: unknown) =>
  MarcadorSchema.parse({
    id: 'm',
    nome: 'M',
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 10, y: 2, z: 20 },
    giro: Math.PI / 2,
    noChao: false,
    objeto: null,
    configuracao,
  })
test('pose de marcador e câmera giram o alvo local uma vez; ida e volta conservam o ponto', () => {
  const d = criarDocumentoVazio('d', 'Giro'),
    m = marcador({ tipo: 'camera', alvo: { x: 3, y: 1, z: 0 }, campoDeVisao: 48 })
  expect(pontoDoMarcador(d, m, { x: 3, y: 1, z: 0 })).toEqual({ x: 10, y: 3, z: 17 })
  const volta = pontoLocalDoMarcador(d, m, { x: 10, y: 3, z: 17 })
  expect(volta.x).toBeCloseTo(3)
  expect(volta.y).toBe(1)
  expect(volta.z).toBeCloseTo(0)
})
test('zona rotacionada inclui bordas e altura, respeitando a concavidade do polígono', () => {
  const d = criarDocumentoVazio('d', 'Zona'),
    m = marcador({
      tipo: 'zona',
      forma: {
        tipo: 'poligono',
        altura: 3,
        pontos: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 1 },
          { x: 1, z: 1 },
          { x: 1, z: 4 },
          { x: 0, z: 4 },
        ],
      },
    })
  const local = (x: number, y: number, z: number) => pontoDoMarcador(d, m, { x, y, z })
  expect(zonaContemPonto(d, m, local(0.5, 1, 3))).toBe(true)
  expect(zonaContemPonto(d, m, local(3, 1, 3))).toBe(false)
  expect(zonaContemPonto(d, m, local(4, 3, 1))).toBe(true)
  expect(zonaContemPonto(d, m, local(0.5, 3.1, 0.5))).toBe(false)
  expect(volumeDoMarcador(d, m)).toEqual({
    min: { x: 10, y: 2, z: 16 },
    max: { x: 14, y: 5, z: 20 },
  })
})
test('rota com relevo amostra os mesmos pontos do campo, mede comprimento 3D e conserva controles', () => {
  const d = criarDocumentoVazio('d', 'Rota'),
    m = marcador({
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ],
      fechada: false,
      seguirTerreno: true,
    })
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
  m.noChao = true
  const antes = structuredClone(m),
    fonte = (_x: number, z: number) => Math.max(0, 2 - Math.abs(z - 18)),
    r = rotaDoMarcador(d, m, fonte, 1)
  expect(r.pontos).toHaveLength(5)
  expect(r.pontos[2]).toEqual({ x: 10, y: 4, z: 18 })
  expect(r.comprimento).toBeCloseTo(4 * Math.sqrt(2), 6)
  expect(m).toEqual(antes)
  const livre = { ...m, noChao: false, posicao: { ...m.posicao, z: 18 } }
  expect(rotaDoMarcador(d, livre, fonte, 1).pontos[0]!.y).toBe(2)
  expect(() => rotaDoMarcador(d, m, undefined, 1)).toThrow('carregado')
  expect(() => rotaDoMarcador(d, m, fonte, 0)).toThrow('passo')
})
test('início principal oculto por camada é ignorado; marcador antigo não vira início por seu nome', () => {
  const d = criarDocumentoVazio('d', 'Início'),
    m = marcador({ tipo: 'inicio', principal: true })
  m.camada = 'c'
  d.camadas = [{ id: 'c', nome: 'Escondidos', bloqueado: false, oculto: true }]
  d.marcadores = [m, { ...m, id: 'antigo', nome: 'inicio', camada: null, configuracao: undefined }]
  expect(inicioDoCenario(d)).toBeNull()
  d.camadas[0]!.oculto = false
  expect(inicioDoCenario(d)?.id).toBe('m')
  expect(inicioDoCenario(d)?.posicao).toEqual(m.posicao)
})

test('orçamento de rota é conferido antes de consultar o terreno, incluindo o total do documento', () => {
  const d = criarDocumentoVazio('d', 'Orçamento'),
    m = marcador({
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 20_000, y: 0, z: 0 },
      ],
      fechada: false,
      seguirTerreno: true,
    })
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: 0, z: 0 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  let leituras = 0
  expect(() =>
    rotaDoMarcador(d, m, () => {
      leituras++
      return 0
    }),
  ).toThrow('amostras demais')
  expect(leituras).toBe(0)
  const longa = {
    ...m,
    configuracao: {
      tipo: 'rota' as const,
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 16_000, y: 0, z: 0 },
      ],
      fechada: false,
      seguirTerreno: false,
    },
  }
  expect(() =>
    validarDocumento({
      ...d,
      marcadores: Array.from({ length: 17 }, (_, i) => ({ ...longa, id: `r${i}` })),
    }),
  ).toThrow('amostragem das rotas')
})
