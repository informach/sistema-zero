import { describe, expect, test } from 'bun:test'
import {
  ARQUIPELAGO,
  alturaDoTerritorio,
  conexaoDaIlha,
  ilhaDoArquipelago,
  paraGlobal,
  paraLocal,
  raioDoContorno,
} from '../src/sistemas/geografia-do-arquipelago'
import { estadoDaPonte, modulosDaPonte } from '../src/sistemas/ponte-do-arquipelago'
import { malhaDistante, malhaDoSetor, setoresPerto } from '../src/sistemas/setores-do-arquipelago'

describe('geografia macro', () => {
  test('sete territórios separados, com os envelopes do plano', () => {
    expect(ARQUIPELAGO.map((i) => i.raio * 2)).toEqual([520, 600, 520, 600, 560, 640, 540])
    for (const a of ARQUIPELAGO)
      for (const b of ARQUIPELAGO)
        if (a !== b)
          expect(Math.hypot(a.centro.x - b.centro.x, a.centro.z - b.centro.z)).toBeGreaterThan(
            a.raio + b.raio,
          )
  })

  test('atividades conservam coordenadas locais ao mudar de ilha', () => {
    for (const ilha of ARQUIPELAGO) {
      const local = { x: 73.25, y: 12.5, z: -48.75 }
      expect(paraLocal(ilha, paraGlobal(ilha, local))).toEqual(local)
      const raios = [0, 1, 2, 3, 4, 5].map((a) => raioDoContorno(ilha, a))
      expect(new Set(raios).size).toBeGreaterThan(3)
      expect(Math.max(...raios)).toBeLessThanOrEqual(ilha.raio)
    }
  })

  test('seis pontes radiais com âncoras em terra e rampas caminháveis', () => {
    for (const ilha of ARQUIPELAGO.slice(1)) {
      const ponte = conexaoDaIlha(ilha.id)
      for (const [territorio, p] of [
        [ilhaDoArquipelago('sua-ilha'), ponte.origem],
        [ilha, ponte.destino],
      ] as const) {
        const local = paraLocal(territorio, p)
        expect(p.y).toBeCloseTo(alturaDoTerritorio(territorio, local.x, local.z))
        expect(p.y).toBeGreaterThan(0)
      }
      expect(ponte.comprimento).toBeGreaterThan(120)
      expect(ponte.comprimento).toBeLessThan(300)
      expect(Math.abs(ponte.destino.y - ponte.origem.y) / ponte.comprimento).toBeLessThan(0.5)
    }
  })
})

describe('terreno por setores', () => {
  test('troca de detalhe preserva a costa e todas as bordas de contato', () => {
    const ilha = ilhaDoArquipelago('bosque')
    const detalhe = malhaDoSetor(ilha, 0, 0)
    const distante = malhaDistante(ilha, new Set(['bosque:0:0']))
    const pontos = new Set<string>()
    for (let i = 0; i < distante.vertices.length; i += 3)
      pontos.add(Array.from(distante.vertices.slice(i, i + 3)).join(','))
    // As quatro bordas do detalhe devem ter correspondentes exatos no LOD vizinho.
    for (let i = 0; i < detalhe.vertices.length; i += 3) {
      const [x, , z] = detalhe.vertices.slice(i, i + 3)
      if (x === 0 || x === 80 || z === 0 || z === 80)
        expect(pontos.has(Array.from(detalhe.vertices.slice(i, i + 3)).join(','))).toBe(true)
    }
  })

  test('fronteiras usam as mesmas alturas e triângulos apontam para cima', () => {
    const ilha = ilhaDoArquipelago('sua-ilha')
    const a = malhaDoSetor(ilha, 0, 0, 8)
    const b = malhaDoSetor(ilha, 1, 0, 8)
    for (let z = 0; z <= 10; z++) {
      const fim = (z * 11 + 10) * 3
      const inicio = z * 11 * 3
      expect(a.vertices[fim]).toBe(b.vertices[inicio])
      expect(a.vertices[fim + 1]).toBe(b.vertices[inicio + 1])
      expect(a.vertices[fim + 2]).toBe(b.vertices[inicio + 2])
    }
    const [i, j, k] = a.indices
    if (i === undefined || j === undefined || k === undefined) throw new Error('Sem triângulo')
    const ax = a.vertices[j * 3]! - a.vertices[i * 3]!
    const az = a.vertices[j * 3 + 2]! - a.vertices[i * 3 + 2]!
    const bx = a.vertices[k * 3]! - a.vertices[i * 3]!
    const bz = a.vertices[k * 3 + 2]! - a.vertices[i * 3 + 2]!
    expect(az * bx - ax * bz).toBeGreaterThan(0)
  })

  test('carrega somente vizinhança e mantém o setor sob o jogador', () => {
    const ilha = ilhaDoArquipelago('sua-ilha')
    const perto = setoresPerto(ilha, { x: 1, z: 1 })
    expect(perto.some((s) => s.x === 0 && s.z === 0)).toBe(true)
    expect(perto.length).toBeLessThanOrEqual(25)
    const longe = setoresPerto(ilha, { x: 900, z: 900 })
    expect(longe).toEqual([])
  })
})

describe('primeira conexão', () => {
  test('posto não abre a ponte e reconstrução não termina antes do último módulo', () => {
    expect(estadoDaPonte(false, null, 100)).toBe('quebrada')
    expect(estadoDaPonte(true, 5, 5)).toBe('reconstruindo')
    expect(estadoDaPonte(true, 5, 6)).toBe('reconstruindo')
    expect(estadoDaPonte(true, null, 100)).toBe('aberta')
  })

  test('módulos cobrem a travessia inteira sem frestas', () => {
    const ponte = conexaoDaIlha('bosque')
    const modulos = modulosDaPonte(ponte)
    expect(modulos.length).toBeGreaterThan(20)
    expect(modulos.reduce((total, m) => total + m.comprimento, 0)).toBeCloseTo(
      Math.hypot(ponte.comprimento, ponte.destino.y - ponte.origem.y),
    )
    for (let i = 1; i < modulos.length; i++) {
      const a = modulos[i - 1]!
      const b = modulos[i]!
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeCloseTo(
        (a.comprimento + b.comprimento) / 2,
      )
    }
  })
})
