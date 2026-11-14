import { expect, test } from 'bun:test'
import { maisPerto } from '../src/mundo/interativos'

test('o Usar da casa escolhe o objeto do andar atual, sem mudar o contrato das ilhas', () => {
  const objects = new Map([
    ['cama-andar', { x: 0, y: 3.2, z: 0, raio: 2, rotulo: () => 'Deitar no andar', agir() {} }],
    ['cadeira-terreo', { x: 0.5, y: 0, z: 0, raio: 2, rotulo: () => 'Sentar', agir() {} }],
  ])
  expect(maisPerto(objects, 0, 0, false, false, 0.5)?.id).toBe('cadeira-terreo')
  expect(maisPerto(objects, 0, 0, false, false, 3.7)?.id).toBe('cama-andar')
  expect(maisPerto(objects, 0, 0)?.id).toBe('cama-andar')
})
