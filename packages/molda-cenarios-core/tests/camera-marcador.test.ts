import { expect, test } from 'bun:test'
import {
  alteracoesDaCamera,
  cameraDoMarcador,
  criarDocumentoVazio,
  MarcadorSchema,
  VistaDeCameraSchema,
} from '../src/v2'

test('guardar e restaurar câmera conserva giro, alvo mundial, campo de visão e relevo', () => {
  const d = criarDocumentoVazio('d', 'Câmeras')
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
  const m = MarcadorSchema.parse({
      id: 'm',
      nome: 'Vista',
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao: { x: 1, y: 2, z: 3 },
      giro: Math.PI * 0.75,
      noChao: true,
      objeto: null,
      configuracao: { tipo: 'camera', alvo: { x: 0, y: 0, z: -1 }, campoDeVisao: 48 },
    }),
    fonte = (x: number, z: number) => x / 10 + z / 20,
    vista = { posicao: { x: 8, y: 12, z: 10 }, alvo: { x: -4, y: 3, z: 1 }, campoDeVisao: 64 },
    antes = structuredClone(m),
    alteracoes = alteracoesDaCamera(d, m, vista, fonte),
    volta = cameraDoMarcador(d, { ...m, ...alteracoes }, fonte)
  expect(alteracoes.posicao.y).toBeCloseTo(10.7)
  expect(volta.posicao).toEqual(vista.posicao)
  for (const e of ['x', 'y', 'z'] as const) expect(volta.alvo[e]).toBeCloseTo(vista.alvo[e], 10)
  expect(volta.campoDeVisao).toBe(64)
  expect(m).toEqual(antes)
  expect(() => alteracoesDaCamera(d, m, vista)).toThrow('carregado')
})
test('câmera rejeita alvo coincidente, parâmetros não finitos e marcadores sem câmera', () => {
  const p = { x: 1, y: 2, z: 3 }
  expect(VistaDeCameraSchema.safeParse({ posicao: p, alvo: p, campoDeVisao: 48 }).success).toBe(
    false,
  )
  expect(
    VistaDeCameraSchema.safeParse({ posicao: p, alvo: { ...p, y: NaN }, campoDeVisao: 48 }).success,
  ).toBe(false)
  expect(
    VistaDeCameraSchema.safeParse({ posicao: p, alvo: { ...p, y: 4 }, campoDeVisao: 101 }).success,
  ).toBe(false)
  const d = criarDocumentoVazio('d', 'Câmeras'),
    m = MarcadorSchema.parse({
      id: 'm',
      nome: 'Ponto',
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao: p,
      giro: 0,
      noChao: false,
      objeto: null,
    })
  expect(() => cameraDoMarcador(d, m)).toThrow('câmera')
})
