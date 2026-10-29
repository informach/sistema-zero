import { expect, test } from 'bun:test'
import {
  INSTRUMENTOS_DA_BANDA,
  migrarDaV13,
  migrarDaV14ParaAtual,
  migrarSalvamento,
  SalvamentoV13Schema,
  SalvamentoV14Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

test('V13 migra para V14 sem tocar no resto, com nenhum instrumento de volta ao palco', () => {
  const { pico: _, ...s } = inicialV14(AGORA)
  const antiga = SalvamentoV13Schema.parse({
    ...s,
    versao: 13,
    recife: { bau: true, pagina: true, tesouro: false, corais: 9 },
    vale: { pegadas: true, escavacao: 3, ninhos: ['ninho-2'] },
  })
  const copia = structuredClone(antiga)
  const atual = migrarDaV13(antiga)
  expect(atual).toEqual({ ...antiga, versao: 14, pico: { banda: 0 } })
  expect(migrarSalvamento(antiga)).toEqual(migrarDaV14ParaAtual(atual))
  expect(antiga).toEqual(copia)
  // A V13 continua estrita: a banda só existe da V14 em diante.
  expect(SalvamentoV13Schema.safeParse({ ...antiga, pico: atual.pico }).success).toBe(false)
})

test('a banda é um número de 0 a 7 que atravessa o JSON, e nada fora disso', () => {
  const s = inicialV14(AGORA)
  expect(s.pico).toEqual({ banda: 0 })
  expect(INSTRUMENTOS_DA_BANDA).toBe(3)
  for (let banda = 0; banda < 2 ** INSTRUMENTOS_DA_BANDA; banda++) {
    const com = { ...s, pico: { banda } }
    expect(migrarSalvamento(JSON.parse(JSON.stringify(com)))).toEqual(migrarDaV14ParaAtual(com))
  }
  for (const banda of [-1, 8, 1.5, '3', null, true])
    expect(SalvamentoV14Schema.safeParse({ ...s, pico: { banda } }).success).toBe(false)
  expect(SalvamentoV14Schema.safeParse({ ...s, pico: {} }).success).toBe(false)
  expect(SalvamentoV14Schema.safeParse({ ...s, pico: { banda: 1, outro: 1 } }).success).toBe(false)
  const { pico: _, ...semPico } = s
  expect(SalvamentoV14Schema.safeParse(semPico).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 16 })).toBeNull()
})
