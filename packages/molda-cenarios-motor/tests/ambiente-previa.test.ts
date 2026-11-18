import { expect, test } from 'bun:test'
import {
  type ComandoDeCenario,
  criarDocumentoVazio,
  prepararOperacaoDeAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import { type ComandoDePreviaDoAmbiente, EdicaoComTerreno } from '../src/edicao-com-terreno'

test('prévia usa os comandos reais sem revisão autoral nem restauração desnecessária do relevo', () => {
  const d = criarDocumentoVazio('d', 'Luz'),
    antes = structuredClone(d)
  let restaurou = 0
  const e = new EdicaoComTerreno({
    prever() {
      throw Error('Não altera relevo')
    },
    restaurar() {
      restaurou++
    },
  })
  for (const hora of [12, 15, 18, 22])
    e.preverComandos(d, d, [{ tipo: 'iluminacao.definir', iluminacao: { hora } }])
  expect(e.projetar(d).iluminacao.hora).toBe(22)
  expect(d).toEqual(antes)
  expect(e.tipo).toBe('ambiente')
  e.finalizar(true, 'agua')
  expect(e.ativa).toBe(true)
  e.finalizar(true, 'ambiente')
  expect(e.projetar(d)).toBe(d)
  expect(restaurou).toBe(0)
})
test('panorama e sua referência são previstos atomicamente e uma falha mantém a prévia anterior', () => {
  const d = criarDocumentoVazio('d', 'Luz'),
    e = new EdicaoComTerreno({ prever() {}, restaurar() {} }),
    comandos: ComandoDePreviaDoAmbiente[] = [
      {
        tipo: 'textura.definir',
        textura: { id: 'p', biblioteca: 'b', textura: 'p', digest: 'a'.repeat(64) },
      },
      {
        tipo: 'iluminacao.definir',
        iluminacao: { hora: 20, ceu: { tipo: 'panorama', textura: 'p', giro: 0, intensidade: 1 } },
      },
    ]
  e.preverComandos(d, d, comandos)
  const previa = e.projetar(d)
  expect(previa.texturas?.[0]?.id).toBe('p')
  expect(d.texturas).toBeUndefined()
  expect(() => e.preverComandos(d, d, [comandos[1]!])).toThrow()
  expect(e.projetar(d)).toBe(previa)
  expect(() =>
    e.preverComandos(d, d, [
      { tipo: 'instancia.remover', id: 'x' } as ComandoDeCenario as ComandoDePreviaDoAmbiente,
    ]),
  ).toThrow('somente')
  expect(e.projetar(d)).toBe(previa)
})
test('nova cabeça, fechamento e ferramenta concorrente conservam a posse da prévia', () => {
  const d = criarDocumentoVazio('d', 'Luz'),
    e = new EdicaoComTerreno({ prever() {}, restaurar() {} }),
    c: ComandoDePreviaDoAmbiente[] = [{ tipo: 'iluminacao.definir', iluminacao: { hora: 18 } }],
    agua = prepararOperacaoDeAgua({ id: 'a', nome: 'Mar' }, { tipo: 'mar', nivel: -1 }, null)
  e.preverComandos(d, d, c)
  expect(() => e.prever(d, d, agua)).toThrow('Termine a prévia')
  const nova = { ...d, nome: 'Nova cabeça' }
  expect(e.projetar(nova)).toBe(nova)
  expect(() => e.preverComandos(d, nova, c)).toThrow('mudou')
  expect(e.ativa).toBe(false)
  e.prever(d, d, agua)
  expect(() => e.preverComandos(d, d, c)).toThrow('Termine a prévia')
  e.finalizar(true)
})
