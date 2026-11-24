import { expect, test } from 'bun:test'
import { PercursoDoTeste } from '../src/teste/percurso'

test('percurso soma curvas ativas e não une voo, pausa ou retomada à caminhada', () => {
  const m = new PercursoDoTeste(),
    a = { x: 0, y: 0, z: 0 },
    b = { x: 3, y: 0, z: 0 },
    c = { x: 3, y: 0, z: 4 }
  m.iniciar(a)
  m.passo(a, b, 0.05, true)
  m.passo(b, c, 0.05, true)
  m.passo(c, { x: 100, y: 5, z: 100 }, 0.05, false)
  m.passo(c, { x: 200, y: 0, z: 0 }, 20, true)
  expect(m.ler()).toMatchObject({ caminhada: 7, direta: 5, segundos: 0.1 })
  m.finalizar(c)
  m.passo(c, a, 0.05, true)
  expect(m.ler().caminhada).toBe(7)
  const copia = m.ler()
  copia.inicio!.x = 900
  expect(m.ler().inicio?.x).toBe(0)
  m.zerar()
  expect(m.ler().inicio).toBeNull()
})
