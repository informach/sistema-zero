import { expect, test } from 'bun:test'
import {
  BIT_DO_LUMI_DE_LUZ,
  ehLumiDeLuz,
  LUMIS_DE_LUZ,
  lumiDeLuzDoSegredo,
  quantosLumis,
  temOLumi,
} from '../src/lumis-de-luz'
import { PERFIS_DOS_LUMIS } from '../src/lumis-trabalho'
import { LUMIS, migrarSalvamento } from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-31T12:00:00Z')

test('sete Lumis de luz, um por família, cada um num baú diferente', () => {
  expect(LUMIS_DE_LUZ).toHaveLength(7)
  for (const id of LUMIS_DE_LUZ) {
    expect(LUMIS).toContain(id)
    expect(ehLumiDeLuz(id)).toBe(true)
    // Trabalham como a rara da família (a forma é a dela).
    const rara = id.replace('-de-luz', '') as keyof typeof PERFIS_DOS_LUMIS
    expect<unknown>(PERFIS_DOS_LUMIS[id]).toEqual(PERFIS_DOS_LUMIS[rara])
  }
  const bits = Object.values(BIT_DO_LUMI_DE_LUZ)
  expect(new Set(bits).size).toBe(7)
  expect(lumiDeLuzDoSegredo(64)).toBe('cristal-de-luz')
  expect(lumiDeLuzDoSegredo(16)).toBeNull()
  expect(ehLumiDeLuz('quindim')).toBe(false)
})

test('ter o Lumi de luz é ter aberto o baú dele; o contador fica só com os presos', () => {
  const s = { lumis: { quindim: 3 }, segredos: 64 }
  expect(quantosLumis(s, 'quindim')).toBe(3)
  expect(temOLumi(s, 'cristal-de-luz')).toBe(true)
  expect(temOLumi(s, 'pluma-de-luz')).toBe(false)
  expect(quantosLumis({ lumis: {} }, 'cristal-de-luz')).toBe(0)
})

test('a rotina de um Lumi de luz vale só com o baú aberto', () => {
  const rotina = [{ c: 'quando-anoitecer' as const }, { c: 'regar' as const }]
  const base = inicialV14(AGORA)
  const migrado = migrarSalvamento(base)
  if (!migrado) throw new Error('sem salvamento')
  const sem = { ...migrado, rotinas: { 'cristal-de-luz': rotina } }
  expect(migrarSalvamento(sem)).toBeNull()
  const com = { ...sem, segredos: 64 }
  expect(migrarSalvamento(com)?.rotinas['cristal-de-luz']).toEqual(rotina)
})
