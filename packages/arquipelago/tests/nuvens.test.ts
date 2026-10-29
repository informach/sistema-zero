import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarSalvamentoInicial, ilha } from '@sistemazero/arquipelago-contracts'
import {
  Box3,
  type BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  Raycaster,
  SkinnedMesh,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'
import { buscarIlha, ilhasNaMemoria, reterIlha, soltarIlha } from '../src/mundo/carregar-ilha'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { ILHAS_COMPLETAS, prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import {
  ALTURA_DAS_NUVENS,
  raioDaEsperaDaIlha,
  raioDoChaoDaIlha,
  trajetoDaPonte,
} from '../src/mundo/medidas'
import { lugarDaIrie } from '../src/mundo/nuvens'
import {
  APRESENTACAO_DA_IRIE,
  comecarConversaComAIrie,
  IRIE_NAS_NUVENS,
} from '../src/sistemas/irie'
import { arquivoDaIlha, carregarGlb, pisoEm } from './ajuda-colisores'

const nuvens = ilha('nuvens')

/** Integração do Nuvens real, sem alterar a arte nem o salvamento. */
describe('Nuvens completo', () => {
  test('carrega o GLB real, prepara os colisores e libera os recursos ao sair', async () => {
    const url = ILHAS_COMPLETAS.nuvens?.url
    expect(url).toBeDefined()
    if (!url) throw new Error('Nuvens sem modelo')
    const antes = ilhasNaMemoria()
    const cena = await buscarIlha(url, () => carregarGlb(arquivoDaIlha('nuvens.glb')))
    const preparada = prepararIlha(cena, nuvens)
    expect(preparada.plataformas).toHaveLength(4)
    expect(preparada.colisores.length).toBe(50)
    expect(cena.getObjectByName('col-terreno')).toBeUndefined()
    expect(prepararIlha(cena, nuvens)).toBe(preparada)
    const geometrias = new Set<BufferGeometry>()
    cena.traverse((no) => {
      if (no instanceof Mesh) geometrias.add(no.geometry)
    })
    let soltas = 0
    for (const g of geometrias) g.addEventListener('dispose', () => soltas++)
    const retencao = reterIlha(url, cena, () => soltarExtras(preparada))
    soltarIlha(url)
    expect(soltas).toBe(0)
    retencao?.liberar()
    expect(soltas).toBe(geometrias.size)
    expect(ilhasNaMemoria()).toBe(antes)
  })

  test('a espera ampliada cobre o terreno e os limites inteiros dos colisores', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('nuvens.glb'))
    let maximo = 0
    const dentro = (p: Vector3) => {
      maximo = Math.max(maximo, Math.hypot(p.x, p.z))
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(raioDaEsperaDaIlha(nuvens, p.x, p.z))
    }
    modelo.updateMatrixWorld(true)
    modelo.traverse((no) => {
      if (!(no instanceof Mesh) || !no.name.startsWith('col-')) return
      const vertices = no.geometry.getAttribute('position')
      for (let i = 0; i < vertices.count; i++)
        dentro(new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(no.matrixWorld))
    })
    expect(maximo).toBeGreaterThan(raioDoChaoDaIlha(nuvens, 1, 0))
    expect(maximo).toBeCloseTo(18.7404, 2)
    expect(raioDaEsperaDaIlha(nuvens, 1, 0)).toBe(19.2)
    for (const c of lerColisores(modelo)) {
      if (c.forma === 'malha') continue
      if (c.forma === 'cilindro') {
        // Limite conservador, incluindo a borda exterior, não apenas o centro.
        expect(Math.hypot(c.posicao[0], c.posicao[2]) + c.raio).toBeLessThanOrEqual(
          raioDaEsperaDaIlha(nuvens, c.posicao[0], c.posicao[2]),
        )
      } else {
        const m = new Matrix4().compose(
          new Vector3(...c.posicao),
          new Quaternion(...c.rotacao),
          new Vector3(1, 1, 1),
        )
        for (const x of [-1, 1])
          for (const y of [-1, 1])
            for (const z of [-1, 1])
              dentro(new Vector3(x * c.meio[0], y * c.meio[1], z * c.meio[2]).applyMatrix4(m))
      }
    }
  })
})

describe('a Irie na ilha', () => {
  test('fica na âncora do chão, voltada à chegada, inclusive com a ilha girada', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('nuvens.glb'))
    const morador = modelo.getObjectByName('morador')?.position
    const chegada = modelo.getObjectByName('chegada')?.position
    if (!morador || !chegada) throw new Error('Nuvens sem as âncoras da Irie')
    const p = lugarDaIrie(modelo, { x: 100, y: 2, z: 50 }, Math.PI / 2)
    expect(p?.x).toBeCloseTo(100 + morador.z)
    expect(p?.z).toBeCloseTo(50 - morador.x)
    expect(p?.y).toBeCloseTo(2 + morador.y)
    expect(p?.descanso).toBeCloseTo(
      Math.atan2(chegada.x - morador.x, chegada.z - morador.z) + Math.PI / 2,
    )
    modelo.updateMatrixWorld(true)
    const terreno = modelo.getObjectByName('col-terreno') as Mesh
    const raio = new Raycaster(new Vector3(morador.x, 10, morador.z), new Vector3(0, -1, 0))
    const chao = raio.intersectObject(terreno)[0]?.point.y
    expect(chao).toBeDefined()
    expect(morador.y).toBeCloseTo(chao ?? 0)
    const formas = lerColisores(modelo).filter((c) => c.forma !== 'malha')
    expect(pisoEm(formas, morador.x, morador.z, chao).y).toBeCloseTo(morador.y)
    expect(soParaOCorpo('col-morador-irie')).toBe(true)
    expect(lugarDaIrie(new Group(), { x: 0, y: 0, z: 0 }, 0)).toBeNull()
    modelo.getObjectByName('chegada')?.removeFromParent()
    expect(lugarDaIrie(modelo, { x: 0, y: 0, z: 0 }, 0)).toBeNull()
  })

  test('a Irie tem os clipes, olhos e medidas usados pelo morador genérico', async () => {
    const bytes = readFileSync(join(import.meta.dir, '../src/assets/personagens/irie.glb'))
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    const clipes = new Set(gltf.animations.map((a) => a.name))
    for (const nome of ['parado', 'andar', 'falar', 'acenar', 'feliz'])
      expect([nome, clipes.has(nome)]).toEqual([nome, true])
    const olhos = malhasDosOlhos(gltf.scene)
    expect(olhos.length).toBe(2)
    for (const olho of olhos) {
      expect(olho.morphTargetDictionary).toEqual({ piscar: 0, feliz: 1 })
    }
    const caixa = (material: string) => {
      const b = new Box3()
      gltf.scene.traverse((no) => {
        if (!(no instanceof Mesh)) return
        const materiais = Array.isArray(no.material) ? no.material : [no.material]
        if (materiais.some((m) => m.name === material)) b.union(new Box3().setFromObject(no, true))
      })
      expect(b.isEmpty()).toBe(false)
      return b
    }
    // O maior componente de penas ligado à cabeça é a cabeça principal. As duas penas
    // do topete, as asas e a cauda não aumentam o cilindro de interação.
    const penas = gltf.scene.getObjectByName('irie-corpo_1')
    if (!(penas instanceof SkinnedMesh)) throw new Error('Iriê sem penas com esqueleto')
    const geo = penas.geometry
    const vertices = geo.attributes.position
    const indices = geo.index
    if (!vertices || !indices) throw new Error('Penas sem triângulos')
    const pais = Array.from({ length: vertices.count }, (_, i) => i)
    const raiz = (i: number): number => {
      if (pais[i] !== i) pais[i] = raiz(pais[i]!)
      return pais[i]!
    }
    for (let i = 0; i < indices.count; i += 3) {
      const a = raiz(indices.getX(i))
      pais[raiz(indices.getX(i + 1))] = a
      pais[raiz(indices.getX(i + 2))] = a
    }
    const componentes = new Map<number, number[]>()
    for (let i = 0; i < vertices.count; i++) {
      const osso = penas.skeleton.bones[geo.attributes.skinIndex!.getX(i)]?.name
      if (osso !== 'cabeca') continue
      const id = raiz(i)
      const lista = componentes.get(id) ?? []
      lista.push(i)
      componentes.set(id, lista)
    }
    const principal = [...componentes.values()].sort((a, b) => b.length - a.length)[0]
    if (!principal) throw new Error('Cabeça ausente')
    const corpo = new Box3()
    for (const i of principal)
      corpo.expandByPoint(penas.getVertexPosition(i, new Vector3()).applyMatrix4(penas.matrixWorld))
    expect(IRIE_NAS_NUVENS.raio).toBeCloseTo(
      Math.ceil(Math.max(Math.abs(corpo.min.x), Math.abs(corpo.max.x)) * 100) / 100,
    )
    expect(IRIE_NAS_NUVENS.altura).toBeCloseTo(corpo.max.y)
    const olhosCaixa = caixa('olho')
    expect(IRIE_NAS_NUVENS.alturaDaCabeca).toBeCloseTo((olhosCaixa.min.y + olhosCaixa.max.y) / 2)
  })

  test('a apresentação não muda o salvamento nem compartilha falas mutáveis', () => {
    const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    const antes = JSON.stringify(s)
    const a = comecarConversaComAIrie(s)
    expect(a.salvamento).toBe(s)
    expect(a.falas).toEqual([...APRESENTACAO_DA_IRIE])
    a.falas.pop()
    expect(comecarConversaComAIrie(s).falas).toHaveLength(APRESENTACAO_DA_IRIE.length)
    expect(JSON.stringify(s)).toBe(antes)
    for (const fala of APRESENTACAO_DA_IRIE) expect(fala).not.toMatch(/[—!?]/)
  })
})

test('a ponte chega à altura flutuante sem um degrau de sete metros', () => {
  const ponte = trajetoDaPonte(nuvens)
  expect(ponte.at(-1)!.y).toBeCloseTo(ALTURA_DAS_NUVENS + 1.12)
  for (let i = 1; i < ponte.length; i++) {
    const a = ponte[i - 1]!,
      b = ponte[i]!
    expect(Math.abs(b.y - a.y) / Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(
      Math.tan((25 * Math.PI) / 180),
    )
  }
  expect(trajetoDaPonte(ilha('vale-dos-dinos')).at(-1)!.y).toBeCloseTo(1.12)
})
