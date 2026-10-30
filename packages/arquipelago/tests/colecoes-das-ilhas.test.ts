import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { criarSalvamentoInicial, SalvamentoSchema } from '@sistemazero/arquipelago-contracts'
import type { Mesh, Object3D } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { albumDoSalvamento } from '../src/sistemas/album'
import {
  alcancaNaIlha,
  CRISTAIS_DO_PICO,
  colecaoDaIlha,
  ESTRELAS_DAS_NUVENS,
  falaDaDescoberta,
  grupoCompleto,
  LEMBRANCAS_DAS_ILHAS,
  NOTAS_DO_PICO,
  registrarNaIlha,
} from '../src/sistemas/colecoes-das-ilhas'
import { pegarOCristalRaro } from '../src/sistemas/cristal-raro'
import { ITENS, itensDaBarra, itensParaDar, TOTAL_DE_DESCOBERTAS } from '../src/sistemas/itens'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar, pisoEm } from './ajuda-colisores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

describe('as coleções do Pico e das Nuvens', () => {
  test('doze peças, quatro por grupo, cada uma lembrança da coleção da sua ilha', () => {
    expect(NOTAS_DO_PICO).toHaveLength(4)
    expect(CRISTAIS_DO_PICO).toHaveLength(4)
    expect(ESTRELAS_DAS_NUVENS).toHaveLength(4)
    expect(new Set(LEMBRANCAS_DAS_ILHAS.map((p) => p.id)).size).toBe(12)
    for (const p of LEMBRANCAS_DAS_ILHAS) {
      expect([p.id, ITENS[p.id]?.lembranca, ITENS[p.id]?.colecao]).toEqual([p.id, true, p.ilha])
      expect(ITENS[p.id]?.comida).toBeUndefined()
      expect(p.pegar.startsWith('Pegar ')).toBe(true)
      expect(readFileSync(`src/assets/itens/${p.id}.glb`).toString('ascii', 0, 4)).toBe('glTF')
      expect(readFileSync(`src/assets/icones/${p.id}.png`).subarray(1, 4).toString()).toBe('PNG')
    }
    // As onze da praia mais as doze das ilhas.
    expect(TOTAL_DE_DESCOBERTAS).toBe(23)
  })

  test('só as estrelas caem à noite; o cristal rosa é o do pedestal da caverna', () => {
    expect(LEMBRANCAS_DAS_ILHAS.filter((p) => p.noite).map((p) => p.id)).toEqual(
      ESTRELAS_DAS_NUVENS.map((p) => p.id),
    )
    expect(LEMBRANCAS_DAS_ILHAS.filter((p) => !p.lugar).map((p) => p.id)).toEqual(['cristal-rosa'])
  })

  test('registrar uma vez vale para o álbum e a mochila, sem ocupar a barra nem virar presente', () => {
    const antes = inicial()
    let s = antes
    for (const p of LEMBRANCAS_DAS_ILHAS) {
      s = registrarNaIlha(s, p.id)
      expect(s.inventario[p.id]).toBe(1)
      expect(registrarNaIlha(s, p.id)).toBe(s)
    }
    expect(s.versao).toBe(antes.versao)
    const reaberto = SalvamentoSchema.parse(JSON.parse(JSON.stringify(s)))
    const album = albumDoSalvamento(reaberto)
    for (const grupo of ['notas', 'cristais', 'estrelas'] as const) {
      expect(album[grupo].conta.tem).toBe(4)
      expect(album[grupo].conta.total).toBe(4)
    }
    const barra = itensDaBarra(s.inventario)
    expect(barra.descobertas).toBe(12)
    expect(barra.itens.map((x) => x.item.id)).toEqual(
      itensDaBarra(antes.inventario).itens.map((x) => x.item.id),
    )
    expect(itensParaDar(s.inventario).some((x) => x.item.colecao)).toBe(false)
  })

  test('a fala diz a coleção completa só na última peça do grupo', () => {
    let s = inicial()
    const [a, b, c, d] = NOTAS_DO_PICO
    for (const p of [a, b, c]) {
      s = registrarNaIlha(s, p.id)
      expect(falaDaDescoberta(p, s)).not.toContain('Coleção completa')
    }
    s = registrarNaIlha(s, d.id)
    expect(grupoCompleto(s, 'notas')).toBe(true)
    expect(falaDaDescoberta(d, s)).toContain('Coleção completa: Notas musicais do Pico.')
  })

  test('o cristal rosa da caverna conta na coleção de cristais', () => {
    const s = pegarOCristalRaro(inicial())
    expect(colecaoDaIlha(s, 'cristais').find((p) => p.id === 'cristal-rosa')?.encontrado).toBe(true)
    expect(albumDoSalvamento(s).cristais.conta.tem).toBe(1)
  })

  test('alcance: perto no plano e na altura dos pés, nunca de baixo da parede de gelo', () => {
    const clave = { x: -0.4, y: 5.4, z: 10 }
    expect(alcancaNaIlha(clave, { x: -0.4, y: 5.4, z: 10.5 })).toBe(true)
    expect(alcancaNaIlha(clave, { x: -0.4, y: 1, z: 10 })).toBe(false)
    expect(alcancaNaIlha(clave, { x: 1.5, y: 5.4, z: 10 })).toBe(false)
  })
})

/** Interativos do lugar: a peça fica a pelo menos 2 m deles, para o E / Usar não disputar. */
const INTERATIVOS =
  /^(morador|chegada|palco|instrumento-|banda-|fogareiro|treno$|cristal-raro|subida-|floco-|cume|lumi-|mirante|balao|tear|corrente-de-ar)/

async function ilha(nome: string) {
  const raiz: Object3D = await carregarGlb(arquivoDaIlha(`${nome}.glb`))
  raiz.updateMatrixWorld(true)
  const formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const terreno = raiz.getObjectByName('col-terreno') as Mesh
  const ancoras: { nome: string; x: number; y: number; z: number }[] = []
  raiz.traverse((o) => {
    if (o.type === 'Object3D' && o.children.length === 0 && INTERATIVOS.test(o.name))
      ancoras.push({ nome: o.name, x: o.position.x, y: o.position.y, z: o.position.z })
  })
  const ponto = (n: string) => {
    const o = raiz.getObjectByName(n)
    if (!o) throw new Error(`${nome}.glb sem a âncora ${n}`)
    return o.position
  }
  return { formas, terreno, ancoras, ponto }
}

describe('os lugares das peças contra os GLBs reais', () => {
  let pico: Awaited<ReturnType<typeof ilha>>
  let nuvens: Awaited<ReturnType<typeof ilha>>
  beforeAll(async () => {
    pico = await ilha('pico')
    nuvens = await ilha('nuvens')
  })

  const distante = (i: typeof pico, p: { x: number; z: number }) =>
    Math.min(...i.ancoras.map((a) => Math.hypot(a.x - p.x, a.z - p.z)))

  test('notas do chão e estrelas: chão livre, alcançado andando da chegada da ponte', () => {
    for (const [i, pecas] of [
      [pico, NOTAS_DO_PICO.filter((p) => p.id !== 'nota-clave-de-sol')],
      [nuvens, ESTRELAS_DAS_NUVENS],
    ] as const) {
      const grade = gradeDeAndar(i.terreno, i.formas, 16)
      const chegada = i.ponto('chegada')
      const andou = grade.alcance(chegada.x, chegada.z)
      for (const p of pecas) {
        const celula = grade.celulas[grade.indice(p.lugar.x, p.lugar.z)]
        expect([p.id, celula?.livre, Math.abs((celula?.y ?? -9) - p.lugar.y) < 0.06]).toEqual([
          p.id,
          true,
          true,
        ])
        expect([p.id, grade.chegaPerto(andou, p.lugar.x, p.lugar.z, 0.5)]).toEqual([p.id, true])
        expect([p.id, distante(i, p.lugar) >= 2]).toEqual([p.id, true])
      }
    }
  }, 240_000)

  test('a clave de sol fica no tampo do alto da parede de gelo, aonde o vento leva', () => {
    const clave = NOTAS_DO_PICO.find((p) => p.id === 'nota-clave-de-sol')
    if (!clave) throw new Error('sem a clave')
    const piso = pisoEm(pico.formas, clave.lugar.x, clave.lugar.z, -9)
    expect(piso.nome).toMatch(/^col-topo-parede/)
    expect(Math.abs(piso.y - clave.lugar.y)).toBeLessThan(0.06)
    const topo = pico.ponto('topo-da-parede')
    expect(Math.hypot(topo.x - clave.lugar.x, topo.z - clave.lugar.z)).toBeLessThan(0.5)
  })

  test('os três cristais soltos ficam no chão da caverna, alcançado da boca', () => {
    const grade = gradeDeAndar(pico.terreno, pico.formas, 9, 0.25, {
      meioX: -18,
      ePiso: (c) => /caverna-(chao|rampa)/.test(c.nome),
      pisoMinimo: 0.3,
    })
    const boca = pico.ponto('caverna-entrada')
    const dentro = grade.alcance(boca.x, boca.z)
    for (const p of CRISTAIS_DO_PICO) {
      if (!p.lugar) continue
      const celula = grade.celulas[grade.indice(p.lugar.x, p.lugar.z)]
      expect([p.id, celula?.livre, Math.abs((celula?.y ?? -9) - p.lugar.y) < 0.06]).toEqual([
        p.id,
        true,
        true,
      ])
      expect([p.id, grade.chegaPerto(dentro, p.lugar.x, p.lugar.z, 0.5)]).toEqual([p.id, true])
      expect([p.id, distante(pico, p.lugar) >= 2]).toEqual([p.id, true])
    }
  }, 240_000)
})
