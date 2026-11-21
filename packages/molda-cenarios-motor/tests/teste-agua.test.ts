import { expect, test } from 'bun:test'
import { AguaSchema, criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import { Vector3 } from 'three'
import { AguasDoTeste } from '../src/teste/agua'
import { MundoDoTeste } from '../src/teste/colisoes'
import { MovimentoDoTeste } from '../src/teste/movimento'

test('cobertura do lago respeita contorno local, giro, escala, borda e visibilidade', () => {
  const doc = criarDocumentoVazio('a', 'A')
  doc.aguas = [
    {
      id: 'lago',
      nome: 'Lago',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'lago',
      modelo: null,
      centro: { x: 10, z: 20 },
      giro: Math.PI / 2,
      escala: 2,
      nivel: 3,
      profundidade: 2,
      contorno: [
        { x: -2, z: -1 },
        { x: 2, z: -1 },
        { x: 2, z: 1 },
        { x: -2, z: 1 },
      ],
      recorte: [
        { x: -2, z: -1 },
        { x: 2, z: -1 },
        { x: 2, z: 1 },
        { x: -2, z: 1 },
      ],
    },
  ]
  const agua = new AguasDoTeste(doc.aguas)
  expect(agua.nivel(10, 23)?.nivel).toBe(3)
  expect(agua.nivel(11, 24)?.nivel).toBe(3)
  expect(agua.nivel(13, 20)).toBeNull()
  expect(agua.nivel(13, 20, 0.9)).toBeNull()
  expect(agua.nivel(13, 20, 1.1)?.nivel).toBe(3)
  expect(() => agua.nivel(10, 20, NaN)).toThrow(/raio/)
  expect(new AguasDoTeste(doc.aguas.map((a) => ({ ...a, oculto: true }))).nivel(10, 20)).toBeNull()
})

test('sonda preserva ilhas secas e reconhece a água somente quando toca sua margem', () => {
  const contorno = [
      { x: -4, z: -4 },
      { x: 4, z: -4 },
      { x: 4, z: 4 },
      { x: -4, z: 4 },
    ],
    ilha = [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
    lago = AguaSchema.parse({
      id: 'lago',
      nome: 'Lago',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'lago',
      modelo: null,
      centro: { x: 0, z: 0 },
      giro: 0,
      escala: 1,
      nivel: 3,
      profundidade: 2,
      contorno,
      recorte: contorno,
      ilhas: [ilha],
    }),
    agua = new AguasDoTeste([lago])
  expect(agua.nivel(0, 0, 0.8)).toBeNull()
  expect(agua.nivel(0, 0, 1.1)?.nivel).toBe(3)
  expect(agua.nivel(0, 0)).toBeNull()
})
test('água funda sustenta o nado sem virar piso nem entrar no medidor de caminhada', () => {
  const mundo = new MundoDoTeste([]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, -1, 0), 1.16, () => ({
      nivel: 0,
      profundidade: 20,
    }))
  m.percurso.iniciar(m.posicao)
  for (let i = 0; i < 360; i++)
    m.avancar(1 / 120, { x: 1, z: 0, vertical: 0, correr: false, saltar: false })
  expect(m.nadando).toBe(true)
  expect(m.noChao).toBe(false)
  expect(m.posicao.y).toBeCloseTo(-1.16 * 0.65, 1)
  expect(m.posicao.x).toBeGreaterThan(2)
  expect(m.percurso.ler().caminhada).toBe(0)
  mundo.descartar()
})

test('rio supera o mar apenas na sua faixa, considera profundidade real e respeita a opção de nado', () => {
  const e = { id: 'mar', nome: 'Mar', grupo: null, oculto: false, bloqueado: false },
    mar = AguaSchema.parse({ ...e, tipo: 'mar', nivel: 0 }),
    rio = AguaSchema.parse({
      ...e,
      id: 'rio',
      tipo: 'rio',
      pontos: [
        { x: 0, y: 5, z: 0 },
        { x: 10, y: 3, z: 0 },
      ],
      largura: 4,
      profundidade: 2,
      correnteza: 1.5,
    })
  const agua = new AguasDoTeste([mar, rio])
  expect(agua.nivel(5, 0)).toEqual({ nivel: 4, profundidade: 2, correnteza: { x: 1.5, z: 0 } })
  expect(agua.nivel(5, 3)?.nivel).toBe(0)
  expect(new AguasDoTeste([mar, { ...rio, nado: false }]).nivel(5, 0)?.nivel).toBe(0)
  expect(new AguasDoTeste([rio], () => 3.8).nivel(5, 0)?.profundidade).toBeCloseTo(0.2, 8)
  expect(new AguasDoTeste([rio], () => 5).nivel(5, 0)).toBeNull()
  expect(agua.nivel(NaN, 0)).toBeNull()
})
