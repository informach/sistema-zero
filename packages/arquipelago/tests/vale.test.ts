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
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'
import { buscarIlha, ilhasNaMemoria, reterIlha, soltarIlha } from '../src/mundo/carregar-ilha'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { ILHAS_COMPLETAS, prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import { raioDaEsperaDaIlha, raioDoChaoDaIlha } from '../src/mundo/medidas'
import { lugarDaJade } from '../src/mundo/vale'
import { APRESENTACAO_DA_JADE, comecarConversaComAJade, JADE_NO_VALE } from '../src/sistemas/jade'
import { arquivoDaIlha, carregarGlb, pisoEm } from './ajuda-colisores'

const vale = ilha('vale-dos-dinos')

/** Integração do Vale real, sem alterar a arte nem o salvamento. */
describe('Vale completo', () => {
  test('carrega o GLB real, prepara os colisores e libera os recursos ao sair', async () => {
    const url = ILHAS_COMPLETAS['vale-dos-dinos']?.url
    expect(url).toBeDefined()
    if (!url) throw new Error('Vale sem modelo')
    const antes = ilhasNaMemoria()
    const cena = await buscarIlha(url, () => carregarGlb(arquivoDaIlha('vale-dos-dinos.glb')))
    const preparada = prepararIlha(cena, vale)
    expect(preparada.colisores.length).toBe(62)
    expect(cena.getObjectByName('col-terreno')).toBeUndefined()
    expect(prepararIlha(cena, vale)).toBe(preparada)
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
    const modelo = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
    let maximo = 0
    const dentro = (p: Vector3) => {
      maximo = Math.max(maximo, Math.hypot(p.x, p.z))
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(raioDaEsperaDaIlha(vale, p.x, p.z))
    }
    modelo.updateMatrixWorld(true)
    const terreno = modelo.getObjectByName('col-terreno') as Mesh
    const vertices = terreno.geometry.getAttribute('position')
    for (let i = 0; i < vertices.count; i++)
      dentro(new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(terreno.matrixWorld))
    expect(maximo).toBeGreaterThan(raioDoChaoDaIlha(vale, 1, 0))
    expect(maximo).toBeCloseTo(15.614, 2)
    expect(raioDaEsperaDaIlha(vale, 1, 0)).toBe(16)
    for (const c of lerColisores(modelo)) {
      if (c.forma === 'malha') continue
      if (c.forma === 'cilindro') {
        // Limite conservador, incluindo a borda exterior, não apenas o centro.
        expect(Math.hypot(c.posicao[0], c.posicao[2]) + c.raio).toBeLessThanOrEqual(
          raioDaEsperaDaIlha(vale, c.posicao[0], c.posicao[2]),
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

describe('a Jade diante do observatório', () => {
  test('fica na âncora do chão, voltada à chegada, inclusive com a ilha girada', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
    const morador = modelo.getObjectByName('morador')?.position
    const chegada = modelo.getObjectByName('chegada')?.position
    if (!morador || !chegada) throw new Error('Vale sem as âncoras da Jade')
    const p = lugarDaJade(modelo, { x: 100, y: 2, z: 50 }, Math.PI / 2)
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
    expect(soParaOCorpo('col-morador-jade')).toBe(true)
    expect(lugarDaJade(new Group(), { x: 0, y: 0, z: 0 }, 0)).toBeNull()
    modelo.getObjectByName('chegada')?.removeFromParent()
    expect(lugarDaJade(modelo, { x: 0, y: 0, z: 0 }, 0)).toBeNull()
  })

  test('a Jade tem os clipes, olhos e medidas usados pelo morador genérico', async () => {
    const bytes = readFileSync(join(import.meta.dir, '../src/assets/personagens/jade.glb'))
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    const clipes = new Set(gltf.animations.map((a) => a.name))
    for (const nome of ['parado', 'andar', 'falar', 'acenar', 'feliz'])
      expect([nome, clipes.has(nome)]).toEqual([nome, true])
    const olhos = malhasDosOlhos(gltf.scene)
    expect(olhos.length).toBe(3)
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
    const corpo = caixa('penas')
    expect(JADE_NO_VALE.raio).toBeCloseTo(
      Math.ceil(Math.max(Math.abs(corpo.min.x), Math.abs(corpo.max.x)) * 100) / 100,
    )
    expect(JADE_NO_VALE.altura).toBeCloseTo(corpo.max.y)
    const iris = caixa('iris')
    expect(JADE_NO_VALE.alturaDaCabeca).toBeCloseTo((iris.min.y + iris.max.y) / 2)
  })

  test('a apresentação não muda o salvamento nem compartilha falas mutáveis', () => {
    const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    const antes = JSON.stringify(s)
    const a = comecarConversaComAJade(s)
    expect(a.salvamento).toBe(s)
    expect(a.falas).toEqual([...APRESENTACAO_DA_JADE])
    a.falas.pop()
    expect(comecarConversaComAJade(s).falas).toHaveLength(2)
    expect(JSON.stringify(s)).toBe(antes)
    for (const fala of APRESENTACAO_DA_JADE) expect(fala).not.toMatch(/[—!?]/)
  })
})
