import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Box3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * Os fósseis do Vale, as pegadas e as plantas do céu (`arte/itens/fosseis.py`, `pegadas.py`,
 * `plantas_do_ceu.py`, 31/10/2026). Lê os GLBs reais e os ícones: nós, tamanhos, triângulos,
 * materiais pelo nome, brilho só na flor aberta e ícones de 256 px com fundo transparente.
 */
const ITENS = join(import.meta.dir, '..', 'src', 'assets', 'itens')
const ICONES = join(import.meta.dir, '..', 'src', 'assets', 'icones')

const FOSSEIS = [
  'fossil-cranio-rex',
  'fossil-dente',
  'fossil-garra',
  'fossil-vertebra',
  'fossil-chifre-triceratopo',
  'fossil-ovo',
] as const
const PEGADAS = ['pegada-rex', 'pegada-triceratopo', 'pegada-passaro', 'pegada-capivara'] as const
const PLANTAS = ['flor-de-nuvem', 'estrela-trepadeira', 'arco-iris-de-petala'] as const
/** Os estágios que a horta mostra (`noDaPlanta` em `src/mundo/horta.tsx`). */
const ESTAGIOS = ['broto', 'crescendo', 'maduro'] as const

const cenas = new Map<string, Object3D>()
const carregar = (nome: string) => cenas.get(nome) as Object3D

beforeAll(async () => {
  const nomes = [
    ...FOSSEIS,
    ...PEGADAS,
    ...PLANTAS,
    ...PLANTAS.map((p) => `semente-${p}`),
    'plantas-do-ceu',
  ]
  for (const n of nomes) cenas.set(n, await carregarGlb(join(ITENS, `${n}.glb`)))
  cenas.set('props', await carregarGlb(arquivoDaIlha('vale-dos-dinos-props.glb')))
}, 60_000)

function malhas(no: Object3D): Mesh[] {
  const lista: Mesh[] = []
  no.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh)
  })
  return lista
}

function triangulos(no: Object3D): number {
  return malhas(no).reduce((t, m) => {
    const g = m.geometry
    return t + (g.index ? g.index.count : g.getAttribute('position').count) / 3
  }, 0)
}

function materiais(no: Object3D): MeshStandardMaterial[] {
  const lista = new Set<Material>()
  for (const m of malhas(no)) for (const x of [m.material].flat()) lista.add(x)
  return [...lista] as MeshStandardMaterial[]
}

/** O brilho do material (a cor da emissão vezes a força), de 0 a 1. */
const brilho = (m: MeshStandardMaterial) =>
  Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * (m.emissiveIntensity ?? 1)

function caixa(no: Object3D): Box3 {
  no.updateWorldMatrix(true, true)
  return new Box3().setFromObject(no, true)
}

/** Os filhos de cima de um GLB (os nós com nome). */
const nosDe = (raiz: Object3D) => raiz.children.map((c) => c.name)

/** Largura, altura e tipo de cor do PNG (o cabeçalho IHDR) e se ele tem transparência. */
function lerPng(arquivo: string) {
  const b = readFileSync(arquivo)
  expect(b.subarray(1, 4).toString()).toBe('PNG')
  const tipo = b[25] as number
  return {
    largura: b.readUInt32BE(16),
    altura: b.readUInt32BE(20),
    // RGBA (6), cinza com alfa (4) ou paleta com a tabela de alfa (tRNS) do `icones_paleta.py`.
    transparente: tipo === 6 || tipo === 4 || (tipo === 3 && b.includes(Buffer.from('tRNS'))),
  }
}

function confereIcone(id: string) {
  const png = lerPng(join(ICONES, `${id}.png`))
  expect([id, png.largura, png.altura, png.transparente]).toEqual([id, 256, 256, true])
}

describe('os fósseis do Vale', () => {
  test('um GLB por fóssil, um nó com o nome dele, origem no meio da base', () => {
    for (const id of FOSSEIS) {
      const raiz = carregar(id)
      expect(nosDe(raiz)).toEqual([id])
      const c = caixa(raiz)
      expect([id, Math.abs(c.min.y) < 0.002]).toEqual([id, true])
      expect([
        id,
        Math.abs(c.min.x + c.max.x) < 0.004,
        Math.abs(c.min.z + c.max.z) < 0.004,
      ]).toEqual([id, true, true])
    }
  })

  test('de 0,3 a 0,6 m na maior dimensão e até 1.500 triângulos', () => {
    for (const id of FOSSEIS) {
      const t = caixa(carregar(id)).getSize(new Vector3())
      const maior = Math.max(t.x, t.y, t.z)
      expect([id, maior >= 0.3 && maior <= 0.6]).toEqual([id, true])
      expect([id, triangulos(carregar(id)) <= 1500]).toEqual([id, true])
    }
  })

  test('cor de osso ou de pedra, pelo nome do material, sem brilho', () => {
    for (const id of FOSSEIS)
      for (const m of materiais(carregar(id))) {
        expect([id, m.name]).toEqual([id, expect.stringMatching(/^(osso|pedra)Fossil/)])
        expect(brilho(m)).toBe(0)
      }
  })

  test('os mesmos fósseis são nós novos do vale-dos-dinos-props.glb, sem tocar nos de antes', () => {
    const props = carregar('props')
    const nos = nosDe(props)
    // Os de antes continuam (o ovo-dino é o do filhote; o fóssil do ovo se chama fossil-ovo).
    for (const n of [
      'samambaia-gigante',
      'cavalinha',
      'ninho',
      'ovo-dino',
      'osso',
      'cranio-fossil',
    ])
      expect(nos).toContain(n)
    expect(new Set(nos).size).toBe(nos.length)
    for (const id of FOSSEIS) {
      const no = props.getObjectByName(id) as Object3D
      expect([id, !!no]).toEqual([id, true])
      // O desenho é o mesmo do item (um módulo só): mesmos triângulos e mesma caixa.
      expect([id, triangulos(no)]).toEqual([id, triangulos(carregar(id))])
      const a = caixa(no).getSize(new Vector3())
      const b = caixa(carregar(id)).getSize(new Vector3())
      expect([id, a.distanceTo(b) < 0.002]).toEqual([id, true])
      expect([id, Math.abs(caixa(no).min.y) < 0.002]).toEqual([id, true])
    }
  })

  test('cada fóssil tem o ícone de 256 px, fundo transparente', () => {
    for (const id of FOSSEIS) confereIcone(id)
  })
})

describe('as pegadas', () => {
  test('marca afundada no barro, um nó por arquivo, e o ícone de 256 px', () => {
    for (const id of PEGADAS) {
      const raiz = carregar(id)
      expect(nosDe(raiz)).toEqual([id])
      const nomes = materiais(raiz).map((m) => m.name)
      expect([id, nomes.sort()]).toEqual([id, ['barroFundo', 'barroPegada']])
      // O fundo da marca fica abaixo do tampo do barro (é um corte, não uma pintura).
      let tampo = -1
      let fundo = 1
      for (const m of malhas(raiz)) {
        m.geometry.computeBoundingBox()
        const bb = m.geometry.boundingBox as Box3
        if ((m.material as Material).name === 'barroPegada') tampo = Math.max(tampo, bb.max.y)
        else fundo = Math.min(fundo, bb.min.y)
      }
      expect([id, fundo < tampo - 0.005]).toEqual([id, true])
      confereIcone(id)
    }
  })

  test('a pegada do rex é a maior e a da capivara a menor (tamanho do bicho)', () => {
    const lado = (id: string) => {
      const t = caixa(carregar(id)).getSize(new Vector3())
      return Math.max(t.x, t.z)
    }
    expect(lado('pegada-rex')).toBeGreaterThan(lado('pegada-triceratopo'))
    expect(lado('pegada-triceratopo')).toBeGreaterThan(lado('pegada-passaro'))
    expect(lado('pegada-passaro')).toBeGreaterThan(lado('pegada-capivara'))
  })
})

describe('as plantas do céu', () => {
  test('os nove estágios no padrão da horta, cada um com a base na origem', () => {
    const raiz = carregar('plantas-do-ceu')
    const esperados = PLANTAS.flatMap((p) => ESTAGIOS.map((e) => `${p}-${e}`))
    expect(nosDe(raiz).sort()).toEqual([...esperados].sort())
    for (const n of esperados) {
      const c = caixa(raiz.getObjectByName(n) as Object3D)
      expect([n, Math.abs(c.min.y) < 0.03]).toEqual([n, true])
      expect([n, Math.hypot((c.min.x + c.max.x) / 2, (c.min.z + c.max.z) / 2) < 0.1]).toEqual([
        n,
        true,
      ])
    }
  })

  test('até 800 triângulos por estágio, e cada estágio maior que o anterior', () => {
    const raiz = carregar('plantas-do-ceu')
    for (const p of PLANTAS) {
      const alturas = ESTAGIOS.map((e) => {
        const no = raiz.getObjectByName(`${p}-${e}`) as Object3D
        expect([p, e, triangulos(no) <= 800]).toEqual([p, e, true])
        return caixa(no).max.y
      })
      expect(alturas[1] as number).toBeGreaterThan(alturas[0] as number)
      expect(alturas[2] as number).toBeGreaterThan(alturas[1] as number)
    }
  })

  test('só a flor aberta brilha, e o brilho é leve', () => {
    const raiz = carregar('plantas-do-ceu')
    for (const p of PLANTAS) {
      for (const e of ['broto', 'crescendo'] as const) {
        const acesos = materiais(raiz.getObjectByName(`${p}-${e}`) as Object3D).filter(
          (m) => brilho(m) > 0,
        )
        expect([p, e, acesos.map((m) => m.name)]).toEqual([p, e, []])
      }
      const flor = materiais(raiz.getObjectByName(`${p}-maduro`) as Object3D).filter(
        (m) => brilho(m) > 0,
      )
      expect([p, flor.length > 0]).toEqual([p, true])
      for (const m of flor) expect([p, m.name, brilho(m) <= 0.45]).toEqual([p, m.name, true])
    }
  })

  test('a flor colhida e o pacotinho de semente de cada uma, com os ícones', () => {
    for (const p of PLANTAS) {
      expect(nosDe(carregar(p))).toEqual([p])
      expect([p, materiais(carregar(p)).some((m) => brilho(m) > 0)]).toEqual([p, true])
      expect([p, Math.abs(caixa(carregar(p)).min.y) < 0.002]).toEqual([p, true])
      expect(nosDe(carregar(`semente-${p}`))).toEqual([`semente-${p}`])
      confereIcone(p)
      confereIcone(`semente-${p}`)
    }
  })
})
