import { expect, test } from 'bun:test'
import {
  alteracoesDoGestoDoMarcador,
  criarDocumentoVazio,
  MarcadorSchema,
  marcadorRedimensionavel,
  pontoDoMarcador,
  transformacaoDoMarcador,
} from '../src/v2'

const doc = () => criarDocumentoVazio('d', 'Gestos')
const marcador = (configuracao: unknown) =>
  MarcadorSchema.parse({
    id: 'm',
    nome: 'Marco',
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 2, y: 1, z: 3 },
    giro: 0,
    noChao: false,
    objeto: null,
    configuracao,
  })

test('giro de gizmo conserva a orientação além de 90 graus e rejeita inclinação', () => {
  const d = doc(),
    m = marcador({ tipo: 'ponto' }),
    t = transformacaoDoMarcador(d, m)
  // Euler XYZ arredondado pelo palco para o mesmo giro de 135 graus.
  t.rotacao = { x: Number(Math.PI.toFixed(5)), y: 0.7854, z: Number(Math.PI.toFixed(5)) }
  const mudanca = alteracoesDoGestoDoMarcador(d, m, t)
  expect(mudanca.giro).toBeCloseTo(Math.PI * 0.75, 4)
  const frente = pontoDoMarcador(d, { ...m, ...mudanca }, { x: 0, y: 0, z: 1 })
  expect(frente.x).toBeCloseTo(2 + Math.SQRT1_2, 4)
  expect(frente.z).toBeCloseTo(3 - Math.SQRT1_2, 4)
  t.rotacao = { x: 0.1, y: 0, z: 0 }
  expect(() => alteracoesDoGestoDoMarcador(d, m, t)).toThrow('vertical')
})
test('gizmo grava deslocamento relativo ao relevo sem incorporar a altura do chão', () => {
  const d = doc(),
    m = { ...marcador({ tipo: 'inicio', principal: true }), noChao: true }
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
  const fonte = (x: number, z: number) => x * 0.1 + z * 0.2,
    t = transformacaoDoMarcador(d, m, fonte)
  t.posicao = { x: 8, y: fonte(8, 6) + 1.25, z: 6 }
  const mudanca = alteracoesDoGestoDoMarcador(d, m, t, fonte)
  expect(mudanca.posicao).toEqual({ x: 8, y: 1.25, z: 6 })
  expect(transformacaoDoMarcador(d, { ...m, ...mudanca }, fonte).posicao).toEqual(t.posicao)
  expect(() => alteracoesDoGestoDoMarcador(d, m, t)).toThrow('carregado')
})
test('tamanho altera medidas e pontos locais uma vez, sem deformar esferas ou humanos', () => {
  const d = doc(),
    caixa = marcador({ tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 2, y: 3, z: 4 } } }),
    t = transformacaoDoMarcador(d, caixa)
  t.escala = { x: 2, y: 3, z: 4 }
  expect(alteracoesDoGestoDoMarcador(d, caixa, t).configuracao).toEqual({
    tipo: 'zona',
    forma: { tipo: 'caixa', tamanho: { x: 4, y: 9, z: 16 } },
  })
  for (const config of [
    { tipo: 'zona', forma: { tipo: 'esfera', raio: 2 } },
    { tipo: 'escala', altura: 1.16 },
  ])
    expect(() => alteracoesDoGestoDoMarcador(d, marcador(config), t)).toThrow('uniforme')
  const rota = marcador({
      tipo: 'rota',
      pontos: [
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 2, z: 3 },
      ],
      fechada: false,
      seguirTerreno: true,
    }),
    antes = structuredClone(rota)
  expect(alteracoesDoGestoDoMarcador(d, rota, t).configuracao).toMatchObject({
    pontos: [
      { x: 0, y: 3, z: 0 },
      { x: 2, y: 6, z: 12 },
    ],
  })
  expect(rota).toEqual(antes)
  const regua = marcador({ tipo: 'regua', fim: { x: 2, y: 0, z: 3 } })
  expect(alteracoesDoGestoDoMarcador(d, regua, t).configuracao).toMatchObject({
    fim: { x: 4, y: 0, z: 12 },
  })
})
test('gizmo protege parâmetros de câmera/luz e limita dimensões autorais', () => {
  const d = doc(),
    camera = marcador({ tipo: 'camera', alvo: { x: 0, y: 0, z: -1 }, campoDeVisao: 48 }),
    t = transformacaoDoMarcador(d, camera)
  expect(marcadorRedimensionavel(camera)).toBe(false)
  t.escala = { x: 2, y: 2, z: 2 }
  expect(() => alteracoesDoGestoDoMarcador(d, camera, t)).toThrow('medidas próprias')
  const grande = marcador({ tipo: 'zona', forma: { tipo: 'esfera', raio: 9999 } })
  expect(() => alteracoesDoGestoDoMarcador(d, grande, t)).toThrow()
})
