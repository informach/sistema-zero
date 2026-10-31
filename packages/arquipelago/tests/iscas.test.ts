import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  criarSalvamentoInicial,
  INSUMOS,
  precoDosInsumos,
} from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import {
  colisoresDaHorta,
  colisoresDasArvores,
  posicaoDoCanteiro,
} from '../src/mundo/colisao-da-ilha-central'
import { LUGAR_DA_MINHOCA, LUGAR_DA_PENA, PONTO_DA_PESCA } from '../src/mundo/lugares-da-praia'
import { chaoEm, HORTA, PIER } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  ehIsca,
  gastarIsca,
  ISCAS,
  iscaDeGracaAparece,
  iscaValendo,
  PESCA_COM_ISCA,
  pegarIscaDeGraca,
} from '../src/sistemas/iscas'
import { ITENS, itensDaBarra, itensParaDar } from '../src/sistemas/itens'
import { agirNaPesca, criarPesca, PESCA, passoDaPesca } from '../src/sistemas/pesca'
import { bate, carregarGlb } from './ajuda-colisores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

describe('as iscas', () => {
  test('dois itens de isca, com modelo e ícone, que não se comem nem viram presente', () => {
    expect(ISCAS).toEqual(['isca-minhoca', 'isca-pena'])
    for (const id of ISCAS) {
      expect([id, ITENS[id]?.isca, ITENS[id]?.comida]).toEqual([id, true, undefined])
      expect(readFileSync(`src/assets/itens/${id}.glb`).toString('ascii', 0, 4)).toBe('glTF')
      expect(readFileSync(`src/assets/icones/${id}.png`).subarray(1, 4).toString()).toBe('PNG')
    }
    const s = { ...inicial(), inventario: { 'isca-minhoca': 2, 'isca-pena': 1 } }
    expect(itensParaDar(s.inventario)).toEqual([])
    // Ficam na barra (a criança escolhe a isca por ali).
    expect(itensDaBarra(s.inventario).itens.map((x) => x.item.id)).toEqual([
      'isca-minhoca',
      'isca-pena',
    ])
    expect(ehIsca('isca-pena')).toBe(true)
    expect(ehIsca('pipoca')).toBe(false)
  })

  test('a feira vende as duas pelo mesmo catálogo de insumos', () => {
    for (const id of ISCAS) {
      expect(INSUMOS[id]).toBeDefined()
      expect(precoDosInsumos({ item: id, quantidade: 3 })).toBe(INSUMOS[id].preco * 3)
    }
  })

  test('sem isca a pesca é a de sempre; a minhoca encurta a espera, a pena alonga a janela', () => {
    expect(PESCA_COM_ISCA.nenhuma).toEqual({ esperar: PESCA.esperar, janela: PESCA.janela })
    expect(PESCA_COM_ISCA['isca-minhoca'].esperar).toBeLessThan(PESCA.esperar)
    expect(PESCA_COM_ISCA['isca-minhoca'].janela).toBe(PESCA.janela)
    expect(PESCA_COM_ISCA['isca-pena'].esperar).toBe(PESCA.esperar)
    expect(PESCA_COM_ISCA['isca-pena'].janela).toBeGreaterThan(PESCA.janela)
  })

  test('com minhoca o peixe chega em 1 s; a regra é a do lançamento, mesmo trocando a isca', () => {
    const p = criarPesca()
    expect(
      agirNaPesca(p, { regra: PESCA_COM_ISCA['isca-minhoca'], isca: 'isca-minhoca' }).acao,
    ).toBe('lancou')
    for (let i = 0; i < 11; i++) passoDaPesca(p, 0.1, false, true)
    expect(p.fase).toBe('pronta')
    // Só recolher devolve a isca do anzol, para gastar.
    expect(agirNaPesca(p)).toEqual({ acao: 'recolheu', isca: 'isca-minhoca' })
    expect(p.isca).toBeNull()
  })

  test('com pena a janela dura 10 s; perder a janela não devolve isca nenhuma para gastar', () => {
    const p = criarPesca()
    agirNaPesca(p, { regra: PESCA_COM_ISCA['isca-pena'], isca: 'isca-pena' })
    for (let i = 0; i < 30 + 95; i++) passoDaPesca(p, 0.1, false, true)
    expect(p.fase).toBe('pronta')
    for (let i = 0; i < 10; i++) passoDaPesca(p, 0.1, false, true)
    expect(p.fase).toBe('passou')
    // Tentar de novo lança outra vez: a isca continua no anzol, nada foi gasto.
    expect(agirNaPesca(p, { regra: PESCA_COM_ISCA['isca-pena'], isca: 'isca-pena' }).acao).toBe(
      'lancou',
    )
    // Sair de perto cancela e solta a isca do anzol.
    passoDaPesca(p, 0.1, false, false)
    expect(p.isca).toBeNull()
  })

  test('gastar uma isca só tira uma, e nada muda sem ela na mochila', () => {
    const s = { ...inicial(), inventario: { 'isca-minhoca': 2 } }
    expect(gastarIsca(s, 'isca-minhoca').inventario['isca-minhoca']).toBe(1)
    expect(gastarIsca(s, 'isca-pena')).toBe(s)
    expect(gastarIsca(s, null)).toBe(s)
    expect(iscaValendo('isca-minhoca', s.inventario)).toBe('isca-minhoca')
    expect(iscaValendo('isca-pena', s.inventario)).toBeNull()
  })

  test('a isca de graça só aparece com a mochila sem nenhuma, e só uma por vez', () => {
    const s = inicial()
    expect(iscaDeGracaAparece(s, 'isca-pena')).toBe(true)
    const com = pegarIscaDeGraca(s, 'isca-pena')
    expect(com.inventario['isca-pena']).toBe(1)
    expect(iscaDeGracaAparece(com, 'isca-pena')).toBe(false)
    expect(pegarIscaDeGraca(com, 'isca-pena')).toBe(com)
  })
})

describe('onde as iscas de graça ficam', () => {
  test('a pena fica no tampo do píer, longe do ponto da pesca e do embarque', async () => {
    const modelo = await carregarGlb('src/assets/mundo/pier.glb')
    const embarque = modelo.getObjectByName('embarque')
    if (!embarque) throw new Error('sem embarque')
    expect(LUGAR_DA_PENA.y).toBeCloseTo(PONTO_DA_PESCA.y)
    expect(Math.abs(LUGAR_DA_PENA.x - PIER.x)).toBeLessThan(1 - CORPO.raio)
    expect(
      Math.hypot(LUGAR_DA_PENA.x - PONTO_DA_PESCA.x, LUGAR_DA_PENA.z - PONTO_DA_PESCA.z),
    ).toBeGreaterThan(2)
    const local = { x: LUGAR_DA_PENA.x - PIER.x, z: LUGAR_DA_PENA.z - PIER.z }
    expect(
      Math.hypot(local.x - embarque.position.x, local.z - embarque.position.z),
    ).toBeGreaterThan(1.8)
  })

  test('a latinha fica na grama ao lado da horta, onde o corpo cabe', () => {
    expect(chaoEm(LUGAR_DA_MINHOCA.x, LUGAR_DA_MINHOCA.z)).toBe('grama')
    const corpo = new Vector3(
      LUGAR_DA_MINHOCA.x,
      LUGAR_DA_MINHOCA.y + CORPO.doCentroAoPe + 0.05,
      LUGAR_DA_MINHOCA.z,
    )
    for (const c of [...colisoresDasArvores(), ...colisoresDaHorta()])
      expect([c.nome, bate(c, corpo)]).toEqual([c.nome, false])
    // Fora dos canteiros da horta (a borda de tábuas tem 1,35), com folga para a criança passar.
    for (let i = 0; i < HORTA.colunas * HORTA.linhas; i++) {
      const c = posicaoDoCanteiro(i)
      const borda = Math.max(Math.abs(LUGAR_DA_MINHOCA.x - c.x), Math.abs(LUGAR_DA_MINHOCA.z - c.z))
      expect([i, borda - 0.675 > 0.4]).toEqual([i, true])
    }
  })
})
