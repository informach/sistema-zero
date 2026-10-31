import { describe, expect, test } from 'bun:test'
import { readFileSync, statSync } from 'node:fs'
import {
  AnimationMixer,
  Box3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
} from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Os Lumis de luz (B12, `arte/lumis/luz.py`): a terceira versão de cada família, que só se acha nos
 * segredos. A forma é a da rara, com a coroa de luz acima da cabeça e o rastro de três faíscas; o
 * corpo acende de leve. O teste lê os GLBs reais e compara com a rara de cada família.
 */
const LUMIS = `${import.meta.dir}/../src/assets/lumis`
const RARAS = ['buzio', 'ipe', 'brigadeiro', 'perola', 'cristal', 'brotinho', 'pluma'] as const
const CLIPES = ['andar', 'feliz', 'parado', 'pular', 'trabalhar']

/** Os objetos que são nós do arquivo (e não só uma malha de um material dentro de um nó). */
const NOS = new WeakSet<Object3D>()

async function modelo(nome: string): Promise<GLTF> {
  const b = readFileSync(`${LUMIS}/${nome}.glb`)
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  )
  g.scene.traverse((o) => {
    if (g.parser.associations.get(o)?.nodes !== undefined) NOS.add(o)
  })
  return g
}

function no(cena: Group, nome: string): Object3D {
  const o = cena.getObjectByName(nome)
  if (!o) throw Error(`sem o nó ${nome}`)
  return o
}

/** As malhas do próprio nó, sem as dos nós presos nele (braços e enfeites no corpo, a roda de
 * faíscas na coroa). Um nó com vários materiais vira um grupo com uma malha por material. */
function malhas(o: Object3D, so = true): Mesh[] {
  const lista: Mesh[] = []
  const andar = (m: Object3D) => {
    if (so && m !== o && NOS.has(m)) return
    if ((m as Mesh).isMesh) lista.push(m as Mesh)
    for (const f of m.children) andar(f)
  }
  andar(o)
  return lista
}

function triangulos(cena: Group) {
  return malhas(cena, false).reduce((t, m) => t + (m.geometry.index?.count ?? 0) / 3, 0)
}

/** Põe o modelo no instante `t` (segundos) de um clipe, só com ele valendo. */
function pose(g: GLTF, mixer: AnimationMixer, clipe: string, t: number) {
  mixer.stopAllAction()
  const c = g.animations.find((a) => a.name === clipe)
  if (!c) throw Error(`sem o clipe ${clipe}`)
  const acao = mixer.clipAction(c)
  acao.play()
  mixer.setTime(t)
  g.scene.updateMatrixWorld(true)
}

function caixa(o: Object3D) {
  const b = new Box3()
  for (const m of malhas(o)) b.union(new Box3().setFromObject(m, true))
  return b
}

const RELATORIO = JSON.parse(
  readFileSync(`${import.meta.dir}/../arte/lumis/relatorio.json`, 'utf8'),
) as Record<string, { raridade?: string; rara?: string; triangulos: number; kb: number }>

describe('Lumis de luz', () => {
  for (const rara of RARAS) {
    const id = `${rara}-de-luz`

    test(`${id}: cabe nos tetos e entra no relatório como luz`, async () => {
      const g = await modelo(id)
      expect(triangulos(g.scene)).toBeLessThanOrEqual(3000)
      expect(statSync(`${LUMIS}/${id}.glb`).size).toBeLessThanOrEqual(130 * 1024)
      expect(RELATORIO[id]).toMatchObject({ raridade: 'luz', rara })
      expect(no(g.scene, `lumi-${id}`)).toBeDefined()
    })

    test(`${id}: os cinco clipes da rara, com as mesmas durações`, async () => {
      const [luz, r] = await Promise.all([modelo(id), modelo(rara)])
      const nomes = (g: GLTF) => g.animations.map((a) => a.name).sort()
      expect(nomes(luz)).toEqual(CLIPES)
      expect(nomes(r)).toEqual(CLIPES)
      for (const c of CLIPES) {
        const dl = luz.animations.find((a) => a.name === c)?.duration ?? 0
        const dr = r.animations.find((a) => a.name === c)?.duration ?? -1
        expect(dl).toBeCloseTo(dr, 4)
        expect(dl).toBeCloseTo(c === 'parado' ? 2 : 1, 4)
      }
    })

    test(`${id}: corpo perolado acendendo, coroa e rastro no material luz`, async () => {
      const g = await modelo(id)
      const corpo = malhas(no(g.scene, 'corpo'))
        .map((m) => m.material as MeshStandardMaterial)
        .find((m) => m.name === 'corpo')
      if (!corpo) throw Error('sem o material corpo')
      const brilho =
        Math.max(corpo.emissive.r, corpo.emissive.g, corpo.emissive.b) * corpo.emissiveIntensity
      expect(brilho).toBeGreaterThan(0.05)
      expect(brilho).toBeLessThanOrEqual(0.3 + 1e-3)
      for (const nome of ['coroa-de-luz', 'rastro-de-luz']) {
        const ms = malhas(no(g.scene, nome))
        expect(ms.length).toBeGreaterThan(0)
        for (const m of ms) expect((m.material as MeshStandardMaterial).name).toBe('luz')
      }
    })

    test(`${id}: a coroa fica acima do corpo em todos os clipes, o rastro atrás`, async () => {
      const g = await modelo(id)
      const mixer = new AnimationMixer(g.scene)
      const coroa = no(g.scene, 'coroa-de-luz')
      const corpo = no(g.scene, 'corpo')
      const rastro = no(g.scene, 'rastro-de-luz')
      for (const c of CLIPES) {
        const duracao = g.animations.find((a) => a.name === c)?.duration ?? 1
        for (let i = 0; i < 12; i++) {
          pose(g, mixer, c, (duracao * i) / 12)
          const bc = caixa(coroa)
          const bp = caixa(corpo)
          expect(bc.min.y).toBeGreaterThan(bp.max.y)
          // A frente olha para +Z: parado e andando, o rastro vai atrás do corpo (para −Z). No pular
          // e no feliz os que flutuam dão uma volta inteira, e o rastro vai junto.
          if (c === 'parado' || c === 'andar')
            expect(caixa(rastro).getCenter(bc.min.clone()).z).toBeLessThan(bp.min.z)
        }
      }
      pose(g, mixer, 'parado', 0)
      const cabeca = caixa(g.scene.getObjectByName('cabeca') ?? corpo)
      const meio = caixa(coroa).getCenter(cabeca.min.clone())
      // No meio da cabeça (de cima), não pendurada para um lado.
      expect(meio.x).toBeGreaterThan(cabeca.min.x)
      expect(meio.x).toBeLessThan(cabeca.max.x)
      expect(meio.z).toBeGreaterThan(cabeca.min.z)
      expect(meio.z).toBeLessThan(cabeca.max.z)
    })

    test(`${id}: no feliz a coroa dá uma volta inteira`, async () => {
      const g = await modelo(id)
      const mixer = new AnimationMixer(g.scene)
      const coroa = no(g.scene, 'coroa-de-luz')
      const q = new Quaternion()
      let antes: number | null = null
      let volta = 0
      for (let i = 0; i <= 48; i++) {
        pose(g, mixer, 'feliz', Math.min(i / 48, 1 - 1e-6))
        q.copy(coroa.quaternion)
        // Giro em volta do y (o z do Blender), o eixo da coroa.
        const a = 2 * Math.atan2(q.y, q.w)
        if (antes !== null) {
          let d = a - antes
          while (d > Math.PI) d -= 2 * Math.PI
          while (d < -Math.PI) d += 2 * Math.PI
          volta += d
        }
        antes = a
      }
      expect(Math.abs((volta * 180) / Math.PI)).toBeGreaterThan(340)
      expect(Math.abs((volta * 180) / Math.PI)).toBeLessThan(380)
    })

    test(`${id}: mesma escala e mesma frente da rara`, async () => {
      const [luz, r] = await Promise.all([modelo(id), modelo(rara)])
      const medidas = (g: GLTF) => {
        pose(g, new AnimationMixer(g.scene), 'parado', 0)
        return { corpo: caixa(no(g.scene, 'corpo')), olhos: caixa(no(g.scene, 'olhos')) }
      }
      const a = medidas(luz)
      const b = medidas(r)
      for (const eixo of ['x', 'y', 'z'] as const) {
        expect(Math.abs(a.corpo.max[eixo] - b.corpo.max[eixo])).toBeLessThan(0.03)
        expect(Math.abs(a.corpo.min[eixo] - b.corpo.min[eixo])).toBeLessThan(0.03)
      }
      // Os olhos na frente do corpo, para +Z, nos dois.
      expect(a.olhos.max.z).toBeGreaterThan(a.corpo.getCenter(a.olhos.min.clone()).z)
      expect(b.olhos.max.z).toBeGreaterThan(b.corpo.getCenter(b.olhos.min.clone()).z)
    })
  }

  test('as 14 espécies e o borrão continuam no relatório como antes', () => {
    const luz = Object.entries(RELATORIO).filter(([, v]) => v.raridade === 'luz')
    expect(luz.map(([k]) => k).sort()).toEqual(RARAS.map((r) => `${r}-de-luz`).sort())
    expect(Object.keys(RELATORIO)).toHaveLength(22)
    for (const r of RARAS) expect(RELATORIO[r]?.raridade).toBe('raro')
  })
})
