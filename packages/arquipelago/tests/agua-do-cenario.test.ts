import { expect, test } from 'bun:test'
import { AguaSchema } from '@sistemazero/molda-cenarios-core/v2'
import { AguasDoTeste } from '../../molda-cenarios-motor/src/teste/agua'
import { dentroDaAgua, discoTocaAgua } from '../src/sistemas/agua'
import { superficieDaAgua } from '../src/sistemas/modos/chao'

test('movimento e câmera consultam a cobertura e o nível variável do mesmo rio compilado', () => {
  const rio = AguaSchema.parse({
      id: 'rio',
      nome: 'Rio',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'rio',
      pontos: [
        { x: 0, y: 5, z: 0 },
        { x: 10, y: 3, z: 0 },
      ],
      largura: 4,
      profundidade: 2,
      correnteza: 0,
    }),
    consulta = new AguasDoTeste([rio]),
    registro = {
      x: 5,
      z: 0,
      raioX: 5,
      raioZ: 2,
      giro: 0,
      y: 999,
      consultaNivel: (x: number, z: number, raio?: number) =>
        consulta.nivel(x, z, raio)?.nivel ?? null,
    }
  expect(superficieDaAgua([registro], 0, 5, 0)).toBeCloseTo(4)
  expect(superficieDaAgua([registro], 0, 8, 0)).toBeCloseTo(3.4)
  expect(superficieDaAgua([registro], 0, 5, 2.2)).toBe(0)
  expect(superficieDaAgua([registro], 0, 5, 2.2, 0.3)).toBeCloseTo(4)
  expect(dentroDaAgua(registro, 5, 2.2)).toBe(false)
  expect(discoTocaAgua(registro, 5, 2.2, 0.3)).toBe(true)
})
