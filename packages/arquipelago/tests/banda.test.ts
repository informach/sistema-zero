import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { CATALOGO_DE_OBJETOS, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  devolverInstrumento,
  falaDaVolta,
  falasDoFloco,
  fazerChocolateNoIglu,
  festivalDeInverno,
  INSTRUMENTOS,
  instrumentoDeVolta,
  instrumentosDeVolta,
  ROTULO_DO_FOGAREIRO,
  rotuloDoInstrumento,
  TODA_A_BANDA,
} from '../src/sistemas/banda'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import { comecarConversaComOFloco } from '../src/sistemas/floco'
import { jsonDoGlb } from './ajuda-colisores'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** As regras da casa para o texto que a criança lê. */
function regraDoTexto(t: string) {
  expect(t).not.toMatch(/[!—]/)
  expect(t.split(/[.\n]/)[0]).not.toContain('?')
}

describe('a banda do festival de inverno', () => {
  test('cada instrumento é um bit; levar de novo não muda nada, nem o resto do salvamento', () => {
    let s = criarSalvamentoInicial(AGORA)
    expect(festivalDeInverno(s)).toBe(false)
    for (const [n, i] of [2, 0, 1].entries()) {
      const antes = s
      s = devolverInstrumento(s, i)
      expect(instrumentoDeVolta(s.pico.banda, i)).toBe(true)
      expect(instrumentosDeVolta(s.pico.banda)).toBe(n + 1)
      expect(devolverInstrumento(s, i)).toBe(s)
      expect({ ...s, pico: antes.pico }).toEqual(antes)
    }
    expect(s.pico.banda).toBe(TODA_A_BANDA)
    expect(festivalDeInverno(s)).toBe(true)
    expect(devolverInstrumento(s, -1)).toBe(s)
    expect(devolverInstrumento(s, INSTRUMENTOS.length)).toBe(s)
  })

  test('duas sessões juntam os instrumentos que cada uma levou ao palco', () => {
    const base = criarSalvamentoInicial(AGORA)
    const local = devolverInstrumento(base, 0)
    const remoto = devolverInstrumento(devolverInstrumento(base, 2), 1)
    expect(conciliarSalvamento(base, local, remoto)?.pico.banda).toBe(TODA_A_BANDA)
    expect(base.pico.banda).toBe(0)
  })

  test('os rótulos e as falas contam o que falta e seguem a régua do texto', () => {
    expect(rotuloDoInstrumento(0)).toBe('Levar o xilofone ao palco')
    expect(rotuloDoInstrumento(1)).toBe('Levar o violão ao palco')
    expect(rotuloDoInstrumento(2)).toBe('Levar a bateria ao palco')
    expect(falaDaVolta(2, 0b100)).toBe(
      'A bateria voltou para o palco. Faltam 2 instrumentos para a banda tocar.',
    )
    expect(falaDaVolta(0, 0b101)).toBe(
      'O xilofone voltou para o palco. Falta 1 instrumento para a banda tocar.',
    )
    expect(falaDaVolta(1, 0b111)).toContain('festival de inverno começou')
    for (let banda = 1; banda <= TODA_A_BANDA; banda++)
      for (let i = 0; i < INSTRUMENTOS.length; i++) regraDoTexto(falaDaVolta(i, banda))
    for (let i = 0; i < INSTRUMENTOS.length; i++) regraDoTexto(rotuloDoInstrumento(i))
    regraDoTexto(ROTULO_DO_FOGAREIRO)
  })

  test('o Floco diz onde ficou só o que falta e, com a banda completa, fala do festival', () => {
    const s = criarSalvamentoInicial(AGORA)
    const inicio = falasDoFloco(s)
    expect(inicio).toContain('O xilofone ficou dentro do iglu.')
    expect(inicio).toContain('O violão ficou perto do lago congelado.')
    expect(inicio.some((f) => f.startsWith('A bateria ficou'))).toBe(true)
    const doisDeVolta = falasDoFloco({ ...s, pico: { banda: 0b011 } })
    expect(doisDeVolta).toContain(
      'Já voltaram 2 instrumentos. Falta pouco para o festival de inverno.',
    )
    expect(doisDeVolta.filter((f) => f.includes('ficou'))).toHaveLength(1)
    const festa = falasDoFloco({ ...s, pico: { banda: TODA_A_BANDA } })
    expect(festa[0]).toContain('festival de inverno')
    expect(festa.some((f) => f.includes('ficou'))).toBe(false)
    expect(comecarConversaComOFloco(s).falas).toEqual(inicio)
    for (let banda = 0; banda <= TODA_A_BANDA; banda++)
      for (const f of falasDoFloco({ ...s, pico: { banda } })) regraDoTexto(f)
  })

  test('com a banda completa, os instrumentos chegam como projeto azul, uma vez só', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(ganharProjetos({ ...s, pico: { banda: 0b011 } }, AGORA).ganhos).not.toContain('banda')
    const r = ganharProjetos({ ...s, pico: { banda: TODA_A_BANDA } }, AGORA)
    expect(r.ganhos).toContain('banda')
    expect(r.salvamento.projetos.banda).toEqual({
      ganhoEm: AGORA.toISOString(),
      aparencia: null,
      aparencias: [],
    })
    expect(ganharProjetos(r.salvamento, AGORA).ganhos).not.toContain('banda')
    expect(CATALOGO_DE_OBJETOS.banda.origem).toContain('festival de inverno')
  })
})

describe('o fogareiro do iglu', () => {
  test('sem cacau e leite, diz o que trazer e não muda nada', () => {
    const s = criarSalvamentoInicial(AGORA)
    const r = fazerChocolateNoIglu(s, AGORA)
    expect(r.salvamento).toBe(s)
    expect(r.falas).toEqual(['Para o chocolate quente, traga 1 cacau e 1 leite.'])
    for (const f of r.falas) regraDoTexto(f)
  })

  test('com os ingredientes, faz o chocolate; o primeiro traz a lareira, o segundo não', () => {
    const s = { ...criarSalvamentoInicial(AGORA), inventario: { cacau: 2, leite: 2 } }
    const primeiro = fazerChocolateNoIglu(s, AGORA)
    expect(primeiro.salvamento.inventario).toEqual({ cacau: 1, leite: 1, 'chocolate-quente': 1 })
    expect(primeiro.salvamento.projetos.lareira).toEqual({
      ganhoEm: AGORA.toISOString(),
      aparencia: null,
      aparencias: [],
    })
    expect(primeiro.falas).toHaveLength(2)
    expect(primeiro.falas[1]).toContain('lareira')
    const segundo = fazerChocolateNoIglu(primeiro.salvamento, AGORA)
    expect(segundo.salvamento.inventario).toEqual({ 'chocolate-quente': 2 })
    expect(segundo.salvamento.projetos.lareira).toBe(primeiro.salvamento.projetos.lareira)
    expect(segundo.falas).toHaveLength(1)
    for (const f of [...primeiro.falas, ...segundo.falas]) regraDoTexto(f)
    expect(CATALOGO_DE_OBJETOS.lareira.origem).toContain('iglu')
  })
})

describe('a arte que a banda usa', () => {
  test('o banda.glb tem os três instrumentos, e o pinguim tem o parado', () => {
    const arquivo = (pasta: string, nome: string) =>
      join(import.meta.dir, '..', 'src', 'assets', pasta, nome)
    const banda = jsonDoGlb(arquivo('objetos', 'banda.glb'))
    for (const id of INSTRUMENTOS) expect(banda.nodes.some((n) => n.name === id)).toBe(true)
    const pinguim = jsonDoGlb(arquivo('bichos', 'pinguim.glb'))
    expect(pinguim.animations?.some((a) => a.name === 'parado')).toBe(true)
  })
})
