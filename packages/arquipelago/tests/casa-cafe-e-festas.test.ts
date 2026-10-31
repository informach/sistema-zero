import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { carregarGlb } from './ajuda-colisores'

/**
 * O café, a banca de feira e a decoração de festa da casa (`arte/casa/cafe.py` e
 * `arte/casa/festas.py`, 31/10/2026): os nós de cada GLB, as medidas pedidas (±5 cm), o contrato
 * dos móveis (chão: base no piso, dentro das células, frente para +z do jogo; parede: fundo na face
 * da parede, z = -0,10 do jogo, centrada), os tetos de triângulos e de tamanho, a emissão do que
 * acende e a miniatura de cada peça.
 */
const CASA = join(import.meta.dir, '..', 'src', 'assets', 'casa')
const MINIATURAS = join(CASA, 'miniaturas')
const FOLGA = 0.05

type Peca = {
  /** Células (largura × fundo) de uma peça de chão, ou 'parede'. */
  lugar: [number, number] | 'parede'
  /** Largura (x), altura (y) e fundo (z) pedidos, em metros, quando o pedido diz. */
  medida?: { largura?: number; altura?: number; fundo?: number }
  /** Materiais que acendem (com emissão). */
  acende?: string[]
}

const CAFE: Record<string, Peca> = {
  'cafe-mesa-redonda': { lugar: [1, 1], medida: { largura: 0.8, altura: 0.75, fundo: 0.8 } },
  'cafe-cadeira': { lugar: [1, 1] },
  'cafe-balcao': { lugar: [2, 1], medida: { largura: 1.8, altura: 1.0 } },
  'cafe-vitrine-doces': { lugar: [1, 1] },
  'cafe-lousa-cardapio': { lugar: 'parede', medida: { largura: 0.8, altura: 0.6 } },
  'cafe-banca-feira': { lugar: [2, 1], medida: { largura: 1.8, altura: 2.0 } },
  'cafe-caixote': { lugar: [1, 1] },
}

const FESTAS: Record<string, Peca> = {
  'festa-junina-bandeirinhas': { lugar: 'parede', medida: { largura: 1.0 } },
  'festa-junina-lanterna-papel': { lugar: 'parede', acende: ['lanternaAmarela', 'luz'] },
  'festa-junina-fogueira': { lugar: [1, 1], acende: ['fogo', 'brasa'] },
  'festa-carnaval-serpentina': { lugar: 'parede', medida: { largura: 1.0 } },
  'festa-carnaval-mascara': { lugar: 'parede' },
  'festa-carnaval-confete': { lugar: [1, 1] },
  'festa-fim-de-ano-arvore': { lugar: [1, 1], acende: ['luz', 'estrela'] },
  'festa-fim-de-ano-guirlanda': { lugar: 'parede' },
  'festa-fim-de-ano-estrela-janela': { lugar: 'parede', acende: ['estrela', 'luz'] },
  'festa-lanternas-lanterna-chao': { lugar: [1, 1], acende: ['lanternaRosa', 'luz'] },
  'festa-lanternas-varal-de-luz': { lugar: 'parede', medida: { largura: 1.0 }, acende: ['luz'] },
}

const ARQUIVOS = [
  { arquivo: 'casa-cafe.glb', pecas: CAFE, teto: () => 10000 },
  {
    arquivo: 'casa-festas.glb',
    pecas: FESTAS,
    teto: (no: string) => (no === 'festa-fim-de-ano-arvore' ? 3000 : 1500),
  },
]

const cenas = new Map<string, Object3D>()
beforeAll(async () => {
  for (const { arquivo } of ARQUIVOS) cenas.set(arquivo, await carregarGlb(join(CASA, arquivo)))
})

function materiaisDe(no: Object3D): Material[] {
  const lista: Material[] = []
  no.traverse((o) => {
    const m = (o as Mesh).material
    if (m) lista.push(...(Array.isArray(m) ? m : [m]))
  })
  return lista
}

function triangulos(no: Object3D): number {
  let n = 0
  no.traverse((o) => {
    const g = (o as Mesh).geometry
    if (g) n += (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3
  })
  return n
}

for (const { arquivo, pecas, teto } of ARQUIVOS)
  describe(arquivo, () => {
    test('tem um nó por peça, com nome em português minúsculo e hífen, e nada sobrando', () => {
      const raiz = cenas.get(arquivo) as Object3D
      const nos = raiz.children.map((o) => o.name).sort()
      expect(nos).toEqual(Object.keys(pecas).sort())
      for (const n of nos) expect(n).toMatch(/^[a-z]+(-[a-z]+)+$/)
    })

    test('até 450 KB', () => {
      expect(statSync(join(CASA, arquivo)).size).toBeLessThanOrEqual(450 * 1024)
    })

    for (const [no, peca] of Object.entries(pecas))
      test(`${no}: medidas, contrato, triângulos, emissão e miniatura`, () => {
        const o = (cenas.get(arquivo) as Object3D).getObjectByName(no) as Object3D
        const c = new Box3().setFromObject(o)
        const largura = c.max.x - c.min.x
        const altura = c.max.y - c.min.y
        const fundo = c.max.z - c.min.z
        if (peca.medida?.largura !== undefined)
          expect(Math.abs(largura - peca.medida.largura)).toBeLessThanOrEqual(FOLGA)
        if (peca.medida?.altura !== undefined)
          expect(Math.abs(altura - peca.medida.altura)).toBeLessThanOrEqual(FOLGA)
        if (peca.medida?.fundo !== undefined)
          expect(Math.abs(fundo - peca.medida.fundo)).toBeLessThanOrEqual(FOLGA)
        if (peca.lugar === 'parede') {
          // Fundo na face da parede do kit (0,10 da linha da grade), centrada em x e na altura.
          expect(c.min.z).toBeCloseTo(-0.1, 3)
          expect(Math.abs(c.min.x + c.max.x)).toBeLessThan(0.003)
          expect(Math.abs(c.min.y + c.max.y)).toBeLessThan(0.003)
        } else {
          const [w, d] = peca.lugar
          expect(c.min.y).toBeCloseTo(0, 3)
          expect(c.min.x).toBeGreaterThanOrEqual(-w / 2 - 0.001)
          expect(c.max.x).toBeLessThanOrEqual(w / 2 + 0.001)
          expect(c.min.z).toBeGreaterThanOrEqual(-d / 2 - 0.001)
          expect(c.max.z).toBeLessThanOrEqual(d / 2 + 0.001)
        }
        expect(triangulos(o)).toBeLessThanOrEqual(teto(no))
        const mats = materiaisDe(o)
        for (const nome of peca.acende ?? []) {
          const m = mats.find((x) => x.name === nome) as MeshStandardMaterial | undefined
          expect({ no, nome, tem: !!m }).toEqual({ no, nome, tem: true })
          expect(m?.emissive.getHex()).not.toBe(0)
        }
        const png = readFileSync(join(MINIATURAS, `movel-${no}.png`))
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([160, 160])
      })
  })

test('a vitrine tem o vidro translúcido dos armários da casa', () => {
  const o = (cenas.get('casa-cafe.glb') as Object3D).getObjectByName(
    'cafe-vitrine-doces',
  ) as Object3D
  const vidro = materiaisDe(o).find((m) => m.name === 'vidroArmario')
  expect(vidro?.transparent).toBe(true)
  expect(vidro?.opacity).toBeLessThan(0.5)
})

test('a banca tem a placa para o jogo escrever (`placaFace`)', () => {
  const o = (cenas.get('casa-cafe.glb') as Object3D).getObjectByName('cafe-banca-feira') as Object3D
  expect(materiaisDe(o).map((m) => m.name)).toContain('placaFace')
})
