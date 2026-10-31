import { expect, test } from 'bun:test'
import {
  CRESCIMENTO_DO_CEU_MS,
  colherNoCeu,
  estagioNoCeu,
  FLORES_DA_FLORADA,
  minutoDoCeu,
  nivelDaFlorada,
  plantaNoCanteiro,
  plantarNoCeu,
} from '../src/jardim-do-ceu'
import { MINUTO_ZERO_DO_CEU, PlantaDoCeuSchema } from '../src/salvamento'

const AGORA = Date.parse('2026-10-31T12:00:00Z')
const HORA = 3_600_000

test('plantar começa a crescer na hora (a chuva das nuvens rega) e floresce no tempo da planta', () => {
  const ceu = plantarNoCeu([], 2, 'estrela-trepadeira', AGORA)
  if (!ceu) throw new Error('não plantou')
  expect(PlantaDoCeuSchema.parse(ceu[0])).toEqual(ceu[0] as never)
  expect(plantaNoCanteiro(ceu, 2)?.semente).toBe('estrela-trepadeira')
  expect(estagioNoCeu(ceu, 2, AGORA)).toBe('broto')
  expect(estagioNoCeu(ceu, 2, AGORA + 4 * HORA)).toBe('crescendo')
  expect(estagioNoCeu(ceu, 2, AGORA + CRESCIMENTO_DO_CEU_MS['estrela-trepadeira'])).toBe('flor')
  expect(estagioNoCeu(ceu, 1, AGORA)).toBe('vazio')
})

test('canteiro ocupado ou fora do terraço não planta; só a flor aberta se colhe', () => {
  const ceu = plantarNoCeu([], 1, 'flor-de-nuvem', AGORA) ?? []
  expect(plantarNoCeu(ceu, 1, 'arco-iris-de-petala', AGORA)).toBeNull()
  expect(plantarNoCeu(ceu, 0, 'flor-de-nuvem', AGORA)).toBeNull()
  expect(plantarNoCeu(ceu, 7, 'flor-de-nuvem', AGORA)).toBeNull()
  expect(colherNoCeu(ceu, 1, AGORA + HORA)).toBeNull()
  const colhido = colherNoCeu(ceu, 1, AGORA + CRESCIMENTO_DO_CEU_MS['flor-de-nuvem'])
  expect(colhido).toEqual({ ceu: [], semente: 'flor-de-nuvem' })
})

test('o minuto do céu é curto e volta ao mesmo instante', () => {
  const m = minutoDoCeu(AGORA)
  expect(m).toBeLessThan(1_000_000)
  expect(MINUTO_ZERO_DO_CEU + m * 60_000).toBe(AGORA)
})

test('a florada sobe em três níveis com as flores mandadas para a sua ilha', () => {
  expect(nivelDaFlorada(0)).toBe(0)
  expect(FLORES_DA_FLORADA.map(nivelDaFlorada)).toEqual([1, 2, 3])
  expect(nivelDaFlorada(5)).toBe(1)
  expect(nivelDaFlorada(999)).toBe(3)
})
