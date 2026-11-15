import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { CORPO } from '../src/sistemas/corpo'
import {
  ASSENTO_DO_MONTAR,
  alturaNaSela,
  comecarGesto,
  criarGestoEmAndamento,
  gestoDePlantar,
  gestoDoAchado,
  passoDoGesto,
  pedirGesto,
  progressoDoGesto,
  selaBaixa,
} from '../src/sistemas/gestos'
import { DURACAO_DO_CLIPE, duracaoDoGesto } from '../src/sistemas/locomocao'
import { MONTARIA } from '../src/sistemas/montaria'

const pedido = () => ({ gesto: null, gestos: 0 }) as Parameters<typeof pedirGesto>[0]
const livre = { dt: 0.1, andou: false, livre: true }

describe('os gestos pedidos pelo mundo', () => {
  test('o pedido novo começa o gesto, com o objeto dele, e ele dura o clipe', () => {
    const m = pedido()
    const g = criarGestoEmAndamento(m.gestos)
    pedirGesto(m, 'Regar', 'mao_regador')
    passoDoGesto(g, m, livre)
    expect(g.qual).toBe('Regar')
    expect(g.objeto).toBe('mao_regador')
    expect(g.falta).toBeCloseTo(duracaoDoGesto('Regar') - 0.1, 6)
    for (let t = 0; t < DURACAO_DO_CLIPE.regar; t += 0.1) passoDoGesto(g, m, livre)
    expect(g.qual).toBeNull()
    expect(g.objeto).toBeNull()
  })

  test('o mesmo pedido não volta; um pedido de antes de o personagem montar é ignorado', () => {
    const m = pedido()
    pedirGesto(m, 'Comemorar')
    const g = criarGestoEmAndamento(m.gestos)
    passoDoGesto(g, m, livre)
    expect(g.qual).toBeNull()
    pedirGesto(m, 'PegarDoChao')
    passoDoGesto(g, m, livre)
    expect(g.qual).toBe('PegarDoChao')
  })

  test('andar corta; fora do chão o gesto não começa; pausado (dt 0) ele espera', () => {
    const m = pedido()
    const g = criarGestoEmAndamento()
    pedirGesto(m, 'Comemorar')
    passoDoGesto(g, m, { ...livre, livre: false })
    expect(g.qual).toBeNull()
    pedirGesto(m, 'Comemorar')
    passoDoGesto(g, m, { ...livre, dt: 0 })
    const falta = g.falta
    for (let i = 0; i < 50; i++) passoDoGesto(g, m, { ...livre, dt: 0 })
    expect(g.falta).toBe(falta)
    passoDoGesto(g, m, { ...livre, andou: true })
    expect(g.qual).toBeNull()
  })

  test('quem atende consome o pedido: o outro corpo (a ilha parada com a Morada aberta) não repete', () => {
    const m = pedido()
    const casa = criarGestoEmAndamento(m.gestos)
    const ilha = criarGestoEmAndamento(m.gestos)
    pedirGesto(m, 'Regar', 'mao_regador')
    passoDoGesto(casa, m, livre)
    expect(casa.qual).toBe('Regar')
    expect(m.gesto).toBeNull()
    // A Morada fecha: a ilha volta a rodar e vê o contador novo, mas o pedido já foi feito.
    passoDoGesto(ilha, m, livre)
    expect(ilha.qual).toBeNull()
  })

  test('cada gesto que começa ganha uma vez nova, mesmo repetido', () => {
    const m = pedido()
    const g = criarGestoEmAndamento()
    pedirGesto(m, 'PegarDoChao')
    passoDoGesto(g, m, livre)
    const primeira = g.vez
    pedirGesto(m, 'PegarDoChao')
    passoDoGesto(g, m, livre)
    expect(g.qual).toBe('PegarDoChao')
    expect(g.vez).toBe(primeira + 1)
  })

  test('o progresso vai de 0 a 1', () => {
    const g = criarGestoEmAndamento()
    expect(progressoDoGesto(g)).toBe(0)
    comecarGesto(g, 'Desmontar')
    expect(progressoDoGesto(g)).toBe(0)
    g.falta = g.duracao / 2
    expect(progressoDoGesto(g)).toBeCloseTo(0.5)
  })

  test('achou: pega do chão; fechou a coleção: comemora', () => {
    expect(gestoDoAchado(false)).toBe('PegarDoChao')
    expect(gestoDoAchado(true)).toBe('Comemorar')
  })

  test('plantar na terra baixa ou na alta, pelas faixas que a arte mediu', () => {
    expect(gestoDePlantar(0)).toBe('Plantar')
    expect(gestoDePlantar(0.2)).toBe('Plantar')
    expect(gestoDePlantar(0.55)).toBe('PlantarAlto')
  })
})

describe('subir na sela e descer dela', () => {
  test('o assento do montar vem do catálogo, na escala do herói', () => {
    const montar = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === 'montar')
    expect(ASSENTO_DO_MONTAR).toBeCloseTo(
      ((montar?.place?.assento_m as number) ?? 0.3) * CORPO.medidas.scale,
      6,
    )
  })

  test('a sela do dino é alta: o corte direto, como no vagonete (pedido da arte)', () => {
    const alta = MONTARIA.subidaDoDesenho
    expect(selaBaixa(alta)).toBe(false)
    expect(alturaNaSela(alta, { montada: true, noModo: 0, desmontando: null })).toBe(alta)
    expect(alturaNaSela(alta, { montada: false, noModo: 0, desmontando: 0 })).toBe(0)
  })

  // Uma sela baixa (um pônei, um banquinho de montar): o montar e o desmontar da arte.
  const sela = ASSENTO_DO_MONTAR * 1.2
  test('subindo: do chão até onde o assento do clipe cai na sela; montada, a sela', () => {
    expect(selaBaixa(sela)).toBe(true)
    const subindo = (noModo: number) =>
      alturaNaSela(sela, { montada: true, noModo, desmontando: null })
    expect(subindo(0)).toBe(0)
    expect(subindo(DURACAO_DO_CLIPE.montar * 0.999)).toBeCloseTo(sela - ASSENTO_DO_MONTAR, 2)
    expect(subindo(DURACAO_DO_CLIPE.montar + 0.1)).toBe(sela)
  })

  test('descendo: o mesmo ao contrário; no chão, nada', () => {
    const descendo = (p: number) =>
      alturaNaSela(sela, { montada: false, noModo: 0, desmontando: p })
    expect(descendo(0)).toBeCloseTo(sela - ASSENTO_DO_MONTAR, 6)
    expect(descendo(1)).toBe(0)
    expect(alturaNaSela(sela, { montada: false, noModo: 3, desmontando: null })).toBe(0)
  })
})
