import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { carregarGlb } from '../scripts/faces-coplanares'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { PORTA, QUARTO } from '../src/mundo/medidas'
import { VARANDA } from '../src/sistemas/construcao/entrada'
import { COLISORES_DA_VARANDA, NOS_DA_VARANDA } from '../src/sistemas/construcao/pecas'

/**
 * A varanda da porta de entrada como peça do kit (`arte/casa/varanda.py`, `casa-varanda.glb`,
 * 31/10/2026, pedido dela: a porta de entrada muda de lugar no Construir e a varanda vai junto). Lê
 * o GLB real: os nós, os materiais (os da varanda do `casa.glb`), o lampião que acende, os tetos do
 * kit, o mesmo desenho da varanda da casa de antes (deslocado do meio da porta nova) e os colisores
 * iguais aos que o jogo põe (`COLISORES_DA_VARANDA`).
 */
const ASSETS = join(import.meta.dir, '..', 'src', 'assets')
const ARQUIVO = join(ASSETS, 'casa', 'casa-varanda.glb')
const TETO_DE_TRIANGULOS = 10_000
const TETO_DE_KB = 450

let varanda: Object3D
let casa: Object3D

beforeAll(async () => {
  varanda = await carregarGlb(ARQUIVO)
  casa = await carregarGlb(join(ASSETS, 'mundo', 'casa.glb'))
})

function no(raiz: Object3D, nome: string): Object3D {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem o nó ${nome}`)
  return o
}

function triangulos(o: Object3D): number {
  let n = 0
  o.traverse((x) => {
    const m = x as Mesh
    if (!m.isMesh) return
    const idx = m.geometry.getIndex()
    n += (idx ? idx.count : m.geometry.getAttribute('position').count) / 3
  })
  return n
}

function materiais(o: Object3D): Map<string, MeshStandardMaterial> {
  const out = new Map<string, MeshStandardMaterial>()
  o.traverse((x) => {
    const m = x as Mesh
    if (!m.isMesh) return
    for (const mat of Array.isArray(m.material) ? m.material : [m.material])
      out.set(mat.name, mat as MeshStandardMaterial)
  })
  return out
}

describe('a varanda do kit (casa-varanda.glb)', () => {
  test('os nós, os colisores e nada mais', () => {
    const nomes = varanda.children.map((o) => o.name).sort()
    expect(nomes).toEqual(
      [
        NOS_DA_VARANDA.varanda,
        NOS_DA_VARANDA.toldo,
        ...COLISORES_DA_VARANDA.map((c) => c.nome),
      ].sort(),
    )
  })

  test('os materiais da varanda da casa de antes; o lampião acende', () => {
    const mats = materiais(no(varanda, 'varanda'))
    for (const m of [
      'deque',
      'dequeEscuro',
      'batente',
      'acabamento',
      'lampiao',
      'metalEscuro',
      'terracotta',
      'copaClara',
    ])
      expect(mats.has(m)).toBe(true)
    const lampiao = mats.get('lampiao')
    expect(lampiao?.emissiveIntensity ?? 0).toBeGreaterThan(0)
    expect(lampiao?.emissive.getHex()).not.toBe(0)
    expect([...materiais(no(varanda, 'varanda-toldo')).keys()].sort()).toEqual([
      'acabamento',
      'telhado',
    ])
    // As mesmas cores da casa de antes, material por material.
    const daCasa = new Map([...materiais(no(casa, 'varanda')), ...materiais(no(casa, 'toldo'))])
    for (const [nome, m] of [...mats, ...materiais(no(varanda, 'varanda-toldo'))])
      expect(m.color.getHex(), nome).toBe(daCasa.get(nome)?.color.getHex() ?? -1)
  })

  test('dentro dos tetos do kit: até 10 mil triângulos por peça e 450 KB', () => {
    expect(triangulos(no(varanda, 'varanda'))).toBeLessThanOrEqual(TETO_DE_TRIANGULOS)
    expect(triangulos(no(varanda, 'varanda-toldo'))).toBeLessThanOrEqual(TETO_DE_TRIANGULOS)
    expect(statSync(ARQUIVO).size / 1024).toBeLessThanOrEqual(TETO_DE_KB)
    // O relatório da arte diz o mesmo.
    const rel = JSON.parse(
      readFileSync(join(import.meta.dir, '..', 'arte', 'casa', 'relatorio.json'), 'utf8'),
    )['casa-varanda']
    expect(rel.nos).toEqual({
      varanda: triangulos(no(varanda, 'varanda')),
      'varanda-toldo': triangulos(no(varanda, 'varanda-toldo')),
    })
    expect(rel.kb).toBeLessThanOrEqual(TETO_DE_KB)
  })

  test('o mesmo desenho da varanda do casa.glb, com a origem no meio da porta', () => {
    // A porta nova fica em x 2,5 e a frente do quarto em z 4, no referencial do grupo `Casa`.
    const dx = PORTA.x
    const dz = QUARTO.fundo / 2
    for (const [kit, deAntes] of [
      ['varanda', 'varanda'],
      ['varanda-toldo', 'toldo'],
    ] as const) {
      const a = new Box3().setFromObject(no(varanda, kit))
      const b = new Box3().setFromObject(no(casa, deAntes))
      expect(a.min.x).toBeCloseTo(b.min.x - dx, 3)
      expect(a.max.x).toBeCloseTo(b.max.x - dx, 3)
      expect(a.min.y).toBeCloseTo(b.min.y, 3)
      expect(a.max.y).toBeCloseTo(b.max.y, 3)
      expect(a.min.z).toBeCloseTo(b.min.z - dz, 3)
      expect(a.max.z).toBeCloseTo(b.max.z - dz, 3)
      expect(triangulos(no(varanda, kit))).toBe(triangulos(no(casa, deAntes)))
    }
  })

  test('cabe nas células que a varanda ocupa: do lado de fora, 5 de largura e 2 de fundo', () => {
    const c = new Box3().setFromObject(no(varanda, 'varanda'))
    // Fora da parede (o alicerce do lambri chega a 0,19) e dentro das 5 × 2 células (o degrau passa
    // 0,17 da segunda fileira, como na casa de antes).
    expect(c.min.z).toBeGreaterThan(0.1)
    expect(c.max.z).toBeLessThanOrEqual(VARANDA.fundo + 0.2)
    expect(c.min.x).toBeGreaterThanOrEqual(-VARANDA.largura / 2)
    expect(c.max.x).toBeLessThanOrEqual(VARANDA.largura / 2)
  })

  test('os colisores do arquivo são os que o jogo põe (tampo, degrau, colunas e vasos)', () => {
    const lidos = lerColisores(varanda)
    expect(lidos.map((c) => c.nome).sort()).toEqual(COLISORES_DA_VARANDA.map((c) => c.nome).sort())
    for (const c of COLISORES_DA_VARANDA) {
      const l = lidos.find((x) => x.nome === c.nome)
      if (l?.forma !== 'caixa') throw new Error(`sem a caixa ${c.nome}`)
      for (let i = 0; i < 3; i++) {
        expect(l.posicao[i] ?? 0).toBeCloseTo(c.posicao[i] ?? 0, 3)
        expect(l.meio[i] ?? 0).toBeCloseTo(c.meio[i] ?? 0, 3)
      }
      // Só seguram o corpo: a câmera passa.
      expect(soParaOCorpo(c.nome)).toBe(true)
    }
    // O tampo do deque fica debaixo das tábuas e as colunas debaixo das colunas desenhadas.
    const deque = COLISORES_DA_VARANDA.find((c) => c.nome === 'col-varanda-deque')
    expect(deque && deque.posicao[1] + deque.meio[1]).toBeCloseTo(0.05, 3)
  })
})
