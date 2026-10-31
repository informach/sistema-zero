import { describe, expect, test } from 'bun:test'
import { giroDaIlha, ilhasEmVolta, rodaDaIlhaNoModelo, trajetoDaPonte } from '../src/mundo/medidas'
import {
  BARCO,
  embarcar,
  noCorredorDoBarco,
  passoDaTravessia,
  podeEmbarcar,
} from '../src/sistemas/barco'
import { pontosDasBoias } from '../src/sistemas/correnteza'
import { atenderPedido, criarEstadoDoCorpo, type MundoDoMovimento } from '../src/sistemas/modos'

import { viagemReal } from './ajuda-barco'

const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!

describe('travessia guiada, com as âncoras reais', () => {
  test('a ida e a volta acabam no cais, sem derivar o giro da arte', () => {
    const v = viagemReal()
    v.prontos[1] = true
    for (const porto of [0, 1] as const) {
      embarcar(v, porto, v.portos[porto].embarque)
      let passos = 0
      while (v.fase !== 'atracado' && passos++ < 9000) passoDaTravessia(v, 1 / 60, false)
      expect(v.fase).toBe('atracado')
      expect(passos).toBeLessThan(9000)
      const destino = v.portos[porto === 0 ? 1 : 0]
      expect(v.pe.x).toBeCloseTo(destino.embarque.x)
      expect(v.pe.y).toBeCloseTo(destino.embarque.y)
      expect(v.pe.z).toBeCloseTo(destino.embarque.z)
      expect(Math.cos(v.pose.giro)).toBeCloseTo(Math.cos(destino.giro))
    }
  })
  test('ilha fechada, corpo no ar, água e cais distante não embarcam', () => {
    const v = viagemReal(),
      p = v.portos[0].embarque
    expect(podeEmbarcar(v, 0, true, true, p)).toBe(true)
    expect(podeEmbarcar(v, 0, false, true, p)).toBe(false)
    expect(podeEmbarcar(v, 0, true, false, p)).toBe(false)
    expect(podeEmbarcar(v, 0, true, true, { ...p, y: -1 })).toBe(false)
    expect(podeEmbarcar(v, 0, true, true, { ...p, x: p.x + 3 })).toBe(false)
    expect(podeEmbarcar(v, 1, true, true, v.portos[1].embarque)).toBe(false)
    embarcar(v, 0, p)
    expect(podeEmbarcar(v, 0, true, true, p)).toBe(false)
  })
  test('pausa preserva todas as fases e todos os números', () => {
    const v = viagemReal()
    embarcar(v, 0, v.portos[0].embarque)
    for (const fase of ['embarque', 'viagem', 'espera', 'desembarque'] as const) {
      v.fase = fase
      const antes = JSON.stringify(v)
      for (let i = 0; i < 60; i++) passoDaTravessia(v, 1 / 60, true)
      expect(JSON.stringify(v)).toBe(antes)
    }
  })
  test('carga lenta espera fora da ilha, retoma quando pronta, falha volta ao porto', () => {
    for (const carregou of [true, false]) {
      const v = viagemReal()
      embarcar(v, 0, v.portos[0].embarque)
      let n = 0
      while (v.fase !== 'espera' && n++ < 9000) passoDaTravessia(v, 1 / 60, false)
      expect(v.fase).toBe('espera')
      expect(Math.hypot(v.pose.x - recife.centro.x, v.pose.z - recife.centro.z)).toBeGreaterThan(25)
      const distancia = v.distancia
      for (let i = 0; i < 60; i++) passoDaTravessia(v, 1 / 60, false)
      expect(v.distancia).toBe(distancia)
      v.prontos[1] = carregou
      while (v.fase !== 'atracado' && n++ < 18000) passoDaTravessia(v, 1 / 60, false)
      expect(v.fase).toBe('atracado')
      expect(v.devolvendo).toBe(!carregou)
      expect(v.pe.x).toBeCloseTo(v.portos[carregou ? 1 : 0].embarque.x)
    }
  })
  test('o casco passa longe de pontes e das outras ilhas e suas boias', () => {
    const v = viagemReal()
    const pontes = ilhasEmVolta().flatMap(({ ilha }) => trajetoDaPonte(ilha))
    let menorPonte = Infinity
    for (const p of v.rota.pontos) {
      for (const b of pontes) menorPonte = Math.min(menorPonte, Math.hypot(p.x - b.x, p.z - b.z))
      for (const { ilha, centro } of ilhasEmVolta()) {
        if (ilha.id === 'recife') continue
        const r = rodaDaIlhaNoModelo(ilha, 19),
          g = giroDaIlha(ilha)
        const x = centro.x + r.x * Math.cos(g) + r.z * Math.sin(g)
        const z = centro.z - r.x * Math.sin(g) + r.z * Math.cos(g)
        expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThan(r.livre + 2.8)
      }
    }
    expect(menorPonte).toBeGreaterThan(4.5)
  })
  test('abre um corredor nas boias do porto sem apagar a roda toda', () => {
    const v = viagemReal()
    for (const roda of [
      { x: 0, z: 0, livre: 42 },
      { ...recife.centro, livre: 28.6 },
    ]) {
      const pontos = pontosDasBoias(roda)
      const tiradas = pontos.filter((p) => noCorredorDoBarco(v.rota, p))
      expect(tiradas.length).toBeGreaterThan(0)
      expect(tiradas.length).toBeLessThan(pontos.length / 4)
    }
    expect(BARCO.corredor).toBeGreaterThan(2.8)
  })
})

test('pedido de embarque antigo não transporta quem já saiu do cais', () => {
  const mundo: MundoDoMovimento = {
    cipos: [],
    troncos: [],
    aguas: [],
    equilibrios: [],
    escadas: [],
    escorregadores: [],
    bordas: [],
    rodasDeNado: [],
    foco: { x: 0, y: 0, z: 0 },
  }
  for (const saiu of [false, true]) {
    const viagem = viagemReal()
    const c = criarEstadoDoCorpo()
    c.noChao = true
    const p = viagem.portos[0].embarque
    embarcar(viagem, 0, p)
    atenderPedido(c, { tipo: 'barco', viagem }, mundo, saiu ? { x: 0, y: 2, z: 0 } : p, 0, () => {})
    expect(c.modo).toBe(saiu ? 'chao' : 'barco')
    expect(viagem.fase).toBe(saiu ? 'atracado' : 'embarque')
  }
})
