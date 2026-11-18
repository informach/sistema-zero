import { expect, test } from 'bun:test'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
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
  expect(new AguasDoTeste(doc.aguas.map((a) => ({ ...a, oculto: true }))).nivel(10, 20)).toBeNull()
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
