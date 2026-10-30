import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  SALVAMENTO_MAX_BYTES,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import { cenariosDeSalvamentoCheio } from '../../arquipelago-contracts/tests/cenario-salvamento-cheio'
import { criarLoja } from '../src/estado/loja'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { PONTO_DA_PESCA } from '../src/mundo/lugares-da-praia'
import { alturaDaIlha, chaoEm, PIER } from '../src/mundo/medidas'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  alcancaNaPraia,
  CONCHAS_DA_PRAIA,
  colecaoDaPraia,
  LEMBRANCAS_DA_PRAIA,
  PEIXES_DA_PRAIA,
  proximoPeixe,
  registrarNaPraia,
} from '../src/sistemas/colecoes-da-praia'
import { CORPO } from '../src/sistemas/corpo'
import { HABITANTES_DA_PRAIA } from '../src/sistemas/habitantes-da-praia'
import { ITENS, itensDaBarra, itensParaDar } from '../src/sistemas/itens'
import { agirNaPesca, criarPesca, passoDaPesca } from '../src/sistemas/pesca'
import { bate, carregarGlb } from './ajuda-colisores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

describe('coleções da praia', () => {
  test('onze descobertas não ocupam os espaços de uso rápido e continuam no álbum', () => {
    const s = LEMBRANCAS_DA_PRAIA.reduce((v, p) => registrarNaPraia(v, p.id), inicial())
    const antes = structuredClone(s)
    const resumo = itensDaBarra(s.inventario)
    expect(resumo.descobertasNaPraia).toBe(11)
    expect(resumo.itens.map((p) => p.item.id)).toEqual([
      'semente-alface',
      'semente-tomate',
      'semente-milho',
    ])
    expect(colecaoDaPraia(s, 'conchas').filter((p) => p.encontrado)).toHaveLength(6)
    expect(colecaoDaPraia(s, 'peixes').filter((p) => p.encontrado)).toHaveLength(5)
    expect(s).toEqual(antes)
  })
  test('boundary de salvamento recusa descobertas em suporte, conflito e visita', async () => {
    const plataforma = criarPlataformaFalsa({ publico: 'adulto' })
    const loja = criarLoja({
      salvamento: inicial(),
      jornada: 8,
      acesso: AcessoSchema.parse((await plataforma.servico.buscar('/acesso')).corpo),
      quarto: await plataforma.lerQuarto(),
      avatar: await plataforma.lerAvatar(),
      aoMudar() {},
    })
    const antes = loja.getState().salvamento
    const acesso = loja.getState().acesso
    loja.setState({ acesso: { ...acesso, somenteLeitura: true } })
    loja.getState().mudar((s) => registrarNaPraia(s, 'concha-caracol'))
    expect(loja.getState().salvamento).toBe(antes)
    loja.setState({ acesso, salvamentoSituacao: 'conflito' })
    loja.getState().mudar((s) => registrarNaPraia(s, 'peixe-sardinha'))
    expect(loja.getState().salvamento).toBe(antes)
    loja.setState({ salvamentoSituacao: 'ok' })
    loja.getState().visitar({
      origem: 'adulto',
      perfilId: 'visita',
      nome: 'outra pessoa',
      obra: null,
      horta: [],
      completos: [],
      quarto: null,
    })
    loja.getState().mudar((s) => registrarNaPraia(s, 'concha-caracol'))
    expect(loja.getState().salvamento).toBe(antes)
  })

  test('onze lembranças cabem junto da construção e das rotinas no teto', () => {
    const inv = Object.fromEntries(Object.values(ITENS).map((p) => [p.id, p.lembranca ? 1 : 999]))
    let maior = 0
    for (const cenario of cenariosDeSalvamentoCheio(inv)) {
      expect(SalvamentoSchema.safeParse(cenario).success).toBe(true)
      maior = Math.max(maior, Buffer.byteLength(JSON.stringify(cenario)))
    }
    expect(maior).toBeLessThan(SALVAMENTO_MAX_BYTES)
    // Com o iglu do Pico e as lembranças dos segredos (30/10): 64.750 bytes, folga de 786.
    expect(SALVAMENTO_MAX_BYTES - maior).toBeGreaterThan(700)
  })

  test('ponto de pesca fica no tampo, fora das estacas e do embarque', async () => {
    const modelo = await carregarGlb('src/assets/mundo/pier.glb')
    const corpo = new Vector3(
      PONTO_DA_PESCA.x - PIER.x,
      PONTO_DA_PESCA.y + CORPO.doCentroAoPe,
      PONTO_DA_PESCA.z - PIER.z,
    )
    for (const c of lerColisores(modelo)) {
      if (c.forma !== 'malha') expect(bate(c, corpo)).toBe(false)
    }
    const embarque = modelo.getObjectByName('embarque')
    expect(embarque).toBeDefined()
    if (!embarque) throw new Error('Sem embarque')
    expect(
      Math.hypot(corpo.x - embarque.position.x, corpo.z - embarque.position.z),
    ).toBeGreaterThan(1.8)
    expect(Math.abs(corpo.x)).toBeLessThan(1 - CORPO.raio)
  })
  test('registra uma vez, preserva o restante e reabre pelo contrato atual', () => {
    const antes = inicial()
    let s = antes
    for (const p of LEMBRANCAS_DA_PRAIA) {
      const anterior = s
      s = registrarNaPraia(s, p.id)
      expect(s.inventario[p.id]).toBe(1)
      expect(anterior.inventario[p.id]).toBeUndefined()
      expect(registrarNaPraia(s, p.id)).toBe(s)
    }
    expect(s.versao).toBe(antes.versao)
    expect({ ...s, inventario: antes.inventario }).toEqual(antes)
    const serializado = JSON.stringify(s)
    expect(Buffer.byteLength(serializado)).toBeLessThan(SALVAMENTO_MAX_BYTES)
    const reaberto = SalvamentoSchema.parse(JSON.parse(serializado))
    expect(colecaoDaPraia(reaberto, 'conchas').every((p) => p.encontrado)).toBe(true)
    expect(colecaoDaPraia(reaberto, 'peixes').every((p) => p.encontrado)).toBe(true)
    expect(
      itensParaDar(s.inventario).some((p) => LEMBRANCAS_DA_PRAIA.some((l) => l.id === p.item.id)),
    ).toBe(false)
  })

  test('todos os modelos e ícones existem; lembranças não são comida', () => {
    for (const p of LEMBRANCAS_DA_PRAIA) {
      expect(ITENS[p.id]?.lembranca).toBe(true)
      expect(ITENS[p.id]?.comida).toBeUndefined()
      const glb = readFileSync(`src/assets/itens/${p.id}.glb`)
      expect(glb.toString('ascii', 0, 4)).toBe('glTF')
      const png = readFileSync(`src/assets/icones/${p.id}.png`)
      expect(png.subarray(1, 4).toString()).toBe('PNG')
    }
  })

  test('conchas ficam na areia seca, separadas de habitantes e píer', () => {
    for (const p of CONCHAS_DA_PRAIA) {
      expect(chaoEm(p.x, p.z)).toBe('areia')
      expect(alturaDaIlha(p.x, p.z)).toBeGreaterThan(0.2)
      expect(Math.hypot(p.x - PIER.x, p.z - PIER.z)).toBeGreaterThan(4)
      for (const h of Object.values(HABITANTES_DA_PRAIA))
        expect(Math.hypot(p.x - h.x, p.z - h.z)).toBeGreaterThan(2)
    }
    expect(alcancaNaPraia({ x: 8, y: 0.5, z: 25 }, { x: 8, y: 0.5, z: 25 })).toBe(true)
    expect(alcancaNaPraia({ x: 8, y: 0.5, z: 25 }, { x: 8, y: -2, z: 25 })).toBe(false)
    expect(alcancaNaPraia({ x: 8, y: 0.5, z: 25 }, { x: 10, y: 0.5, z: 25 })).toBe(false)
  })

  test('pescar conhece as cinco espécies sem sorte ou duplicar a coleção', () => {
    let s = inicial()
    for (const p of PEIXES_DA_PRAIA) {
      expect(proximoPeixe(s).id).toBe(p.id)
      s = registrarNaPraia(s, p.id)
    }
    expect(registrarNaPraia(s, proximoPeixe(s).id)).toBe(s)
  })
})

describe('pesca tranquila', () => {
  test('espera, permite recolher e não entrega duas vezes pela mesma tentativa', () => {
    const p = criarPesca()
    expect(agirNaPesca(p)).toBe('lancou')
    expect(agirNaPesca(p)).toBe('aguardar')
    for (let i = 0; i < 31; i++) passoDaPesca(p, 0.1, false, true)
    expect(p.fase).toBe('pronta')
    expect(agirNaPesca(p)).toBe('recolheu')
    expect(agirNaPesca(p)).toBe('lancou')
  })

  test('pausa congela, sair cancela e perder a janela permite tentar de novo', () => {
    const p = criarPesca()
    agirNaPesca(p)
    passoDaPesca(p, 0.1, true, true)
    expect(p.tempo).toBe(0)
    for (let i = 0; i < 81; i++) passoDaPesca(p, 0.1, false, true)
    expect(p.fase).toBe('passou')
    expect(agirNaPesca(p)).toBe('lancou')
    passoDaPesca(p, 0.1, false, false)
    expect(p).toEqual(criarPesca())
  })

  test('mesma janela a 30 e 60 quadros, sem saltar pelo tempo da aba oculta', () => {
    for (const fps of [30, 60]) {
      const p = criarPesca()
      agirNaPesca(p)
      for (let i = 0; i < fps * 4; i++) passoDaPesca(p, 1 / fps, false, true)
      expect(p.fase).toBe('pronta')
      expect(p.tempo).toBeCloseTo(4)
    }
    const p = criarPesca()
    agirNaPesca(p)
    passoDaPesca(p, 100, false, true)
    expect(p.fase).toBe('esperando')
    expect(p.tempo).toBe(0.1)
    passoDaPesca(p, Number.NaN, false, true)
    expect(p.tempo).toBe(0.1)
  })
})
