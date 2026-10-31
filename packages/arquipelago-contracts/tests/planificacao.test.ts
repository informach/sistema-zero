import { describe, expect, test } from 'bun:test'
import {
  CATALOGO_DE_OBJETOS,
  LADO_DA_PLANIFICACAO,
  MoldeDeObjetoSchema,
  planificacaoDoMolde,
} from '../src'

const geladeira = CATALOGO_DE_OBJETOS.geladeira.molde

describe('planificacaoDoMolde', () => {
  test('geladeira: lados ao lado da frente, topo em cima, lado maior com 192 pontos', () => {
    const p = planificacaoDoMolde(geladeira)
    expect(p).not.toBeNull()
    if (!p) return
    expect(Math.max(p.largura, p.altura)).toBe(LADO_DA_PLANIFICACAO)
    const por = Object.fromEntries(p.faces.map((f) => [f.face, f]))
    const { frente, topo } = por
    const esq = por['lado-esq']
    const dir = por['lado-dir']
    if (!frente || !topo || !esq || !dir) throw new Error('faltou face')
    // Encostadas, sem fresta nem sobra.
    expect(esq.x).toBe(0)
    expect(esq.x + esq.largura).toBe(frente.x)
    expect(frente.x + frente.largura).toBe(dir.x)
    expect(dir.x + dir.largura).toBe(p.largura)
    expect(topo.y + topo.altura).toBe(frente.y)
    // O topo fica centrado em cima da frente.
    expect(
      Math.abs(topo.x + topo.largura / 2 - (frente.x + frente.largura / 2)),
    ).toBeLessThanOrEqual(1)
    // A proporção de cada face é a do molde (com a folga do arredondamento).
    for (const f of p.faces) {
      const m = geladeira.faces.find((x) => x.face === f.face)
      if (!m) throw new Error('face estranha')
      expect(Math.abs(f.largura / f.altura - m.largura / m.altura)).toBeLessThan(0.05)
    }
    expect(p.faces.filter((f) => f.frente).map((f) => f.face)).toEqual(['frente'])
    // Tudo dentro da tela.
    for (const f of p.faces) {
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.x + f.largura).toBeLessThanOrEqual(p.largura)
      expect(f.y + f.altura).toBeLessThanOrEqual(p.altura)
    }
  })

  test('fliperama: só a tela, na proporção 4 por 3', () => {
    const p = planificacaoDoMolde(CATALOGO_DE_OBJETOS.fliperama.molde)
    expect(p).toEqual({
      largura: 192,
      altura: 144,
      faces: [{ face: 'tela', x: 0, y: 0, largura: 192, altura: 144, frente: false }],
    })
  })

  test('molde sem faces não tem planificação', () => {
    expect(planificacaoDoMolde(CATALOGO_DE_OBJETOS.lareira.molde)).toBeNull()
  })

  test('frente sem lados nem topo: a frente sozinha, marcada', () => {
    const molde = MoldeDeObjetoSchema.parse({
      ...geladeira,
      faces: [{ face: 'frente', largura: 1, altura: 2 }],
    })
    expect(planificacaoDoMolde(molde, 100)).toEqual({
      largura: 50,
      altura: 100,
      faces: [{ face: 'frente', x: 0, y: 0, largura: 50, altura: 100, frente: true }],
    })
  })
})
