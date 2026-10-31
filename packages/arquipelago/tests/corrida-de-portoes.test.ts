import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PERCURSOS } from '@sistemazero/arquipelago-contracts'
import { type Object3D, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { ILHA_DO_PERCURSO } from '../src/sistemas/album'
import type { Ponto } from '../src/sistemas/cipo'
import {
  type CorridaDePortoes,
  corridaDaMontaria,
  corridaDoTreno,
  MEIA_LARGURA_DO_TRENO,
  passoDaCorridaDePortoes,
  passouPeloPortao,
  portoesDoCaminho,
} from '../src/sistemas/corrida-de-portoes'
import { MONTARIA } from '../src/sistemas/montaria'
import {
  PERCURSO_DA_MONTARIA,
  PERCURSO_DO_TRENO,
  PERCURSOS_DO_JOGO,
} from '../src/sistemas/percurso'

async function glb(nome: string): Promise<Object3D> {
  const b = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'ilhas', `${nome}.glb`))
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  )
  g.scene.updateMatrixWorld(true)
  return g.scene
}

/**
 * Os brinquedos de ilha viram minijogo (lacunas, 01/11/2026; a proposta: "cada um é um minijogo e um
 * jeito de chegar"): a descida de trenó do Pico e a corrida da montaria pela praia do Vale.
 */
describe('a corrida de portões', () => {
  const portoes = portoesDoCaminho(
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 20 },
    ],
    1.5,
  )
  const coisas: Ponto[] = [{ x: 0, y: 0.5, z: 5 }]
  const andar = (estado: CorridaDePortoes, de: number, ate: number, x = 0) =>
    passoDaCorridaDePortoes(
      estado,
      { x, y: 0.9, z: de },
      { x, y: 0.9, z: ate },
      portoes,
      coisas,
      1,
      100,
    )

  test('o primeiro portão começa, os do meio contam na ordem e o último chega', () => {
    const e: CorridaDePortoes = { corrida: null }
    expect(andar(e, -1, -0.5)).toBeNull()
    expect(andar(e, -0.5, 0.5)).toEqual({ tipo: 'comecou' })
    expect(andar(e, 4.6, 5.1)).toEqual({ tipo: 'coleta', indice: 0 })
    expect(andar(e, 9.5, 10.5)).toEqual({ tipo: 'portao', indice: 1 })
    expect(andar(e, 19.5, 20.5)).toEqual({ tipo: 'chegou' })
    expect(e.corrida?.situacao).toBe('chegou')
    expect(e.corrida?.pegos).toEqual([true])
  })

  test('passar por fora do portão ou alto demais não conta', () => {
    const g = portoes[0]
    if (!g) throw new Error('sem portão')
    expect(passouPeloPortao(g, { x: 3, y: 0, z: -1 }, { x: 3, y: 0, z: 1 })).toBe(false)
    expect(passouPeloPortao(g, { x: 0, y: 4, z: -1 }, { x: 0, y: 4, z: 1 })).toBe(false)
    expect(passouPeloPortao(g, { x: 1, y: 1, z: -1 }, { x: 1, y: 1, z: 1 })).toBe(true)
  })

  test('os dois percursos novos têm configuração, ilha no álbum e cabem no salvamento', () => {
    for (const id of ['pico-treno', 'vale-montaria'] as const) {
      expect(PERCURSOS).toContain(id)
      expect(PERCURSOS_DO_JOGO[id].id).toBe(id)
    }
    expect(ILHA_DO_PERCURSO['pico-treno']).toBe('pico')
    expect(ILHA_DO_PERCURSO['vale-montaria']).toBe('vale-dos-dinos')
    for (const c of [PERCURSO_DO_TRENO, PERCURSO_DA_MONTARIA])
      for (const fala of [c.falaDoComeco, c.falaDoFim, c.falaDasTresEstrelas])
        expect(fala).not.toMatch(/[—–!?]/)
  })
})

describe('a descida de trenó do Pico', () => {
  test('seis portões pela pista, do platô ao pé, e cinco bandeirinhas no caminho', async () => {
    const raiz = await glb('pico')
    const curva: Ponto[] = []
    for (let i = 1; ; i++) {
      const no = raiz.getObjectByName(`treno-curva-${i}`)
      if (!no) break
      curva.push({ x: no.position.x, y: no.position.y, z: no.position.z })
    }
    expect(curva.length).toBeGreaterThan(20)
    const { portoes, coisas } = corridaDoTreno(curva)
    expect(portoes).toHaveLength(6)
    expect(coisas).toHaveLength(PERCURSO_DO_TRENO.vagalumes)
    // Cada portão desce em relação ao anterior, e cada bandeirinha fica na largura da pista.
    for (let i = 1; i < portoes.length; i++)
      expect((portoes[i] as Ponto).y).toBeLessThan((portoes[i - 1] as Ponto).y)
    for (const c of coisas) {
      const perto = Math.min(...curva.map((p) => Math.hypot(p.x - c.x, p.z - c.z)))
      expect(perto).toBeLessThan(MEIA_LARGURA_DO_TRENO)
    }
    // Quem desce pela linha do meio da pista passa por todos os portões.
    const e: CorridaDePortoes = { corrida: null }
    const amostras: Ponto[] = []
    for (let i = 0; i < curva.length - 1; i++) {
      const a = curva[i] as Ponto
      const b = curva[i + 1] as Ponto
      for (let k = 0; k < 10; k++) {
        const t = k / 10
        amostras.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t + 0.9,
          z: a.z + (b.z - a.z) * t,
        })
      }
    }
    const fim = curva.at(-1) as Ponto
    const depois = portoes.at(-1) as { rumo: number }
    amostras.push({
      x: fim.x + Math.sin(depois.rumo) * 0.5,
      y: fim.y + 0.9,
      z: fim.z + Math.cos(depois.rumo) * 0.5,
    })
    // O primeiro portão está no começo da pista: quem senta no trenó já sai por ele.
    const antes = { ...(amostras[0] as Ponto) }
    const r0 = (portoes[0] as { rumo: number }).rumo
    antes.x -= Math.sin(r0) * 0.3
    antes.z -= Math.cos(r0) * 0.3
    const eventos = [antes, ...amostras].slice(1).map((p, i, l) => {
      const de = i === 0 ? antes : (l[i - 1] as Ponto)
      return passoDaCorridaDePortoes(
        e,
        de,
        p,
        portoes,
        coisas,
        PERCURSO_DO_TRENO.raioDoVagalume,
        20,
      )
    })
    expect(eventos.filter((v) => v?.tipo === 'chegou')).toHaveLength(1)
    // Reto pelo meio da pista não pega nenhuma bandeirinha: elas ficam para os lados.
    expect(e.corrida?.pegos.some(Boolean)).toBe(false)
    // E cada uma fica dentro da faixa em que o trenó mexe de lado.
    for (const c of coisas) {
      const perto = Math.min(...curva.map((p) => Math.hypot(p.x - c.x, p.z - c.z)))
      expect(perto).toBeGreaterThan(PERCURSO_DO_TRENO.raioDoVagalume)
      expect(perto).toBeLessThan(0.7)
    }
  })
})

describe('a corrida da montaria pela praia do Vale', () => {
  test('cada portão e cada trecho ficam na areia, longe dos colisores', async () => {
    const raiz = await glb('vale-dos-dinos')
    const terreno: Object3D[] = []
    raiz.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh && o.name.startsWith('col-terreno')) terreno.push(o)
    })
    const raio = new Raycaster()
    const chao = (x: number, z: number) => {
      raio.set(new Vector3(x, 30, z), new Vector3(0, -1, 0))
      return raio.intersectObjects(terreno, false)[0]?.point.y ?? null
    }
    const colisores = lerColisores(raiz).flatMap((c: ColisorDaIlha) =>
      c.forma !== 'malha' && !c.nome.startsWith('col-terreno') && c.posicao[1] < 4 ? [c] : [],
    )
    const folga = MONTARIA.raio + 0.3
    const livre = (x: number, z: number) =>
      colisores.every((c) => {
        if (c.forma === 'cilindro')
          return Math.hypot(x - c.posicao[0], z - c.posicao[2]) > (c.raio ?? 0) + folga
        if (c.forma === 'caixa' && c.meio)
          return (
            Math.abs(x - c.posicao[0]) > c.meio[0] + folga ||
            Math.abs(z - c.posicao[2]) > c.meio[2] + folga
          )
        return true
      })
    const { portoes, coisas } = corridaDaMontaria()
    expect(coisas).toHaveLength(PERCURSO_DA_MONTARIA.vagalumes)
    for (let i = 0; i < portoes.length - 1; i++) {
      const a = portoes[i] as Ponto
      const b = portoes[i + 1] as Ponto
      for (let k = 0; k <= 20; k++) {
        const x = a.x + ((b.x - a.x) * k) / 20
        const z = a.z + ((b.z - a.z) * k) / 20
        const y = chao(x, z)
        expect(y, `chão em ${x.toFixed(1)}, ${z.toFixed(1)}`).not.toBeNull()
        expect(y as number, `areia em ${x.toFixed(1)}, ${z.toFixed(1)}`).toBeGreaterThan(0.4)
        expect(livre(x, z), `livre em ${x.toFixed(1)}, ${z.toFixed(1)}`).toBe(true)
      }
    }
  })
})
