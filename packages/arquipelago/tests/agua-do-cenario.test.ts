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

test('a água do cenário publicado cobre a região dela sem tirar as águas das outras ilhas', () => {
  // O lago em código da ilha (de outro componente, que entra e sai da lista sozinho).
  const lago = { id: 'lago', x: 0, z: 0, raioX: 8, raioZ: 4, giro: 0, y: 3.65 },
    // A cobertura compilada da ilha publicada: sem água nesse ponto, só o chão seco.
    publicada = {
      id: 'publicado',
      x: 0,
      z: 0,
      raioX: 300,
      raioZ: 300,
      giro: 0,
      y: 0,
      consultaNivel: () => null,
      cobre: (x: number, z: number) => Math.hypot(x, z) < 300,
    },
    // Um lago de outra ilha, fora da região publicada.
    vizinho = { id: 'vizinho', x: 600, z: 0, raioX: 8, raioZ: 4, giro: 0, y: 2 }
  const aguas = [lago, publicada, vizinho]
  // Dentro da região publicada, o lago em código não vale: quem responde é o cenário publicado.
  expect(superficieDaAgua(aguas, 0, 0, 0)).toBe(0)
  expect(superficieDaAgua(aguas, 0, 0, 0, 0.3)).toBe(0)
  // Fora dela, as outras águas seguem valendo.
  expect(superficieDaAgua(aguas, 0, 600, 0)).toBe(2)
  // Nenhuma entrada foi tirada nem devolvida: o lago some da lista quando o dono dele sai.
  expect(aguas).toEqual([lago, publicada, vizinho])
  aguas.splice(aguas.indexOf(publicada), 1)
  expect(superficieDaAgua(aguas, 0, 0, 0)).toBeCloseTo(3.65)
})
