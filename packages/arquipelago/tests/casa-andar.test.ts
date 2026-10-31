import { beforeAll, describe, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { RapierContext } from '@react-three/rapier'
import { Box3, type Mesh, type Object3D } from 'three'
import { bordaQueCabe, type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { carregarGlb, topoEm } from './ajuda-colisores'

/**
 * O segundo andar da casa (`arte/casa/kit.py`, `casa-andar.glb`, pedido E04): pisos de cima com o
 * topo em 4,10, a escada interna de 14 degraus, o vão com guarda-corpo e o guarda-corpo da beira.
 * A escada é subida pela cápsula real do corpo (`CORPO`) com o controlador do Rapier configurado
 * como o do personagem, contra os colisores lidos do GLB: andando (a rampa de colisão) e no modo
 * escada (âncoras `escada-1-*`, como a escada do Bosque). No jogo: x igual, y para cima, z = -y do Blender (a escada sobe
 * para -z).
 */
const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'casa', 'casa-andar.glb')
const ANDAR = 4.1
const DEGRAUS = 14

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)

// Os colisores do segundo andar são todos caixas.
type Forma = Extract<ColisorDaIlha, { forma: 'caixa' }>
let raiz: Object3D
let colisores: Forma[]

beforeAll(async () => {
  await R.init()
  raiz = await carregarGlb(ARQUIVO)
  colisores = lerColisores(raiz).filter((c): c is Forma => c.forma === 'caixa')
})

function caixaDo(nome: string): Box3 {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem o nó ${nome}`)
  return new Box3().setFromObject(o)
}

function ancora(nome: string) {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return { x: o.position.x, y: o.position.y, z: o.position.z }
}

const daEscada = () => colisores.filter((c) => c.nome.startsWith('col-escada-reta-'))
const doVao = () => colisores.filter((c) => c.nome.startsWith('col-guarda-vao-'))

function materiais(nome: string): string[] {
  const nomes = new Set<string>()
  raiz.getObjectByName(nome)?.traverse((o) => {
    const m = (o as Mesh).material
    if (m) for (const x of Array.isArray(m) ? m : [m]) nomes.add(x.name)
  })
  return [...nomes]
}

describe('o segundo andar da casa', () => {
  test('pisos de cima: 1 × 1, topo em 4,10, 10 cm, forro embaixo', () => {
    for (const piso of ['tabua', 'ladrilho', 'azulejo']) {
      const c = caixaDo(`piso-andar-${piso}`)
      expect(c.max.y).toBeCloseTo(ANDAR, 3)
      expect(c.min.y).toBeCloseTo(ANDAR - 0.1, 3)
      for (const v of [c.min.x, c.min.z]) expect(v).toBeCloseTo(-0.5, 3)
      for (const v of [c.max.x, c.max.z]) expect(v).toBeCloseTo(0.5, 3)
      expect(materiais(`piso-andar-${piso}`)).toContain('telhadoForro')
    }
  })

  test('escada: 1 × 4, de 0 a 4,10 em 14 degraus de 0,293, colisores e âncoras', () => {
    const c = caixaDo('escada-interna')
    expect(c.min.x).toBeGreaterThanOrEqual(-0.5)
    expect(c.max.x).toBeLessThanOrEqual(0.5)
    expect(c.min.y).toBeCloseTo(0, 3)
    expect(c.max.z).toBeCloseTo(0, 3)
    expect(c.min.z).toBeCloseTo(-4, 3)
    // A rampa (`-1`) sobe 45,7° (o corpo sobe até `CORPO.sobeAte`), do pé à beira do piso de cima,
    // e as caixas de baixo ficam sempre abaixo dela; a faixa de cima emenda no piso em 4,10.
    const cols = daEscada()
    expect(cols).toHaveLength(DEGRAUS + 1)
    const rampa = cols.find((c) => c.nome === 'col-escada-reta-1') as Forma
    const inclinacao = Math.atan(ANDAR / DEGRAUS / (4 / DEGRAUS)) * (180 / Math.PI)
    expect(inclinacao).toBeLessThan(CORPO.sobeAte)
    const pisoEm = (z: number) => topoEm(rampa, 0, z)
    expect(pisoEm(-0.01)).toBeCloseTo(0.11, 1)
    for (let k = 1; k < DEGRAUS; k++) {
      // No meio do piso de cada degrau, a rampa fica a menos de 0,15 do degrau desenhado.
      const z = -(k - 0.5) * (4 / DEGRAUS)
      expect(Math.abs((pisoEm(z) ?? 0) - (k * ANDAR) / DEGRAUS)).toBeLessThan(0.15)
      const caixa = cols.find((c) => c.nome === `col-escada-reta-${k + 1}`) as Forma
      expect(caixa.posicao[1] + caixa.meio[1]).toBeLessThan(
        (pisoEm(caixa.posicao[2] + caixa.meio[2]) ?? 0) - 0.04,
      )
    }
    const alto = cols.find((c) => c.nome === `col-escada-reta-${DEGRAUS + 1}`) as Forma
    expect(alto.posicao[1] + alto.meio[1]).toBeCloseTo(ANDAR, 3)
    expect(ANDAR / DEGRAUS).toBeLessThan(CORPO.degrau)
    expect(ancora('escada-1-base')).toEqual({ x: 0, y: 0, z: 0 })
    const topo = ancora('escada-1-topo')
    expect([topo.x, topo.y, topo.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, ANDAR, -4])
    const saida = ancora('escada-1-saida')
    expect(saida.y).toBeCloseTo(ANDAR, 3)
    expect(saida.z).toBeLessThan(-4.5)
  })

  test('vão e guarda-corpo: 1,0 acima do piso de cima, nos três lados abertos', () => {
    const vao = doVao()
    expect(vao).toHaveLength(3)
    for (const c of vao) expect(c.posicao[1] + c.meio[1]).toBeGreaterThanOrEqual(ANDAR + 1)
    const g = caixaDo('guarda-corpo-andar')
    expect(g.max.x - g.min.x).toBeCloseTo(1, 3)
    expect(Math.abs(g.max.y - ANDAR - 1)).toBeLessThanOrEqual(0.02)
    const col = colisores.find((c) => c.nome === 'col-guarda-andar-1')
    expect(col && col.posicao[1] + col.meio[1]).toBeCloseTo(ANDAR + 1, 3)
  })

  for (const comModoEscada of [false, true])
    test(
      comModoEscada
        ? 'a cápsula do corpo sobe a escada no modo escada e sai no piso de cima'
        : 'a cápsula do corpo sobe a escada andando e chega no piso de cima',
      () => {
        const r = subir(comModoEscada)
        expect(r.passouPeloModoEscada).toBe(comModoEscada)
        expect(r.modo).toBe('chao')
        expect(r.pe).toBeCloseTo(ANDAR, 1)
        expect(Math.abs(r.pe - ANDAR)).toBeLessThan(0.05)
        expect(r.z).toBeLessThan(-4.3)
        expect(Math.abs(r.x)).toBeLessThan(0.05)
      },
    )
})

/** Sobe com a entrada "para a frente" (para -z) por até 12 s; devolve onde o corpo parou. */
function subir(comModoEscada: boolean) {
  const world = new R.World({ x: 0, y: -GRAVIDADE, z: 0 })
  try {
    world.timestep = PASSO_DA_FISICA
    // O chão do térreo e o piso de cima em volta do vão (a caixa de cada célula, 4,00 a 4,10, que o
    // jogo monta como o térreo).
    const caixa = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
      world.createCollider(
        R.ColliderDesc.cuboid((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2).setTranslation(
          (x0 + x1) / 2,
          (y0 + y1) / 2,
          (z0 + z1) / 2,
        ),
      )
    caixa(-5, 5, -1, 0, -8, 5)
    caixa(-3, 3, ANDAR - 0.1, ANDAR, -8, -4)
    caixa(-3, -0.5, ANDAR - 0.1, ANDAR, -4, 0)
    caixa(0.5, 3, ANDAR - 0.1, ANDAR, -4, 0)
    caixa(-3, 3, ANDAR - 0.1, ANDAR, 0, 3)
    // Os colisores da escada e do vão, do GLB, com a borda arredondada do jogo (`ilha-completa.tsx`).
    for (const c of [...daEscada(), ...doVao()]) {
      const [x, y, z] = c.meio
      const b = bordaQueCabe(x, y, z)
      world.createCollider(
        R.ColliderDesc.roundCuboid(x - b, y - b, z - b, b)
          .setTranslation(...c.posicao)
          .setRotation({ x: c.rotacao[0], y: c.rotacao[1], z: c.rotacao[2], w: c.rotacao[3] }),
      )
    }
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        CORPO.doCentroAoPe + CORPO.folga,
        1.5,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    // O controlador do personagem (`personagem.tsx`).
    const k = world.createCharacterController(CORPO.folga)
    k.enableAutostep(CORPO.degrau, 0.25, true)
    k.enableSnapToGround(0.35)
    k.setMaxSlopeClimbAngle((CORPO.sobeAte * Math.PI) / 180)
    k.setMinSlopeSlideAngle((CORPO.escorregaAcimaDe * Math.PI) / 180)
    const c = criarEstadoDoCorpo()
    const mundo: MundoDoMovimento = {
      cipos: [],
      troncos: [],
      aguas: [],
      equilibrios: [],
      escadas: comModoEscada
        ? [
            {
              id: 'casa:escada-1',
              base: ancora('escada-1-base'),
              topo: ancora('escada-1-topo'),
              saida: ancora('escada-1-saida'),
              largura: 0.78,
            },
          ]
        : [],
      escorregadores: [],
      bordas: [],
      rodasDeNado: [],
      foco: { x: 0, y: 0, z: 0 },
    }
    let passouPeloModoEscada = false
    world.step()
    for (let i = 0; i < 12 * 60; i++) {
      const e: EntradaDoPasso = {
        dt: PASSO_DA_FISICA,
        agora: (i * 1000) / 60,
        parado: false,
        p: corpo.translation(),
        ix: 0,
        iz: 1,
        pedidoX: 0,
        pedidoZ: -1,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        patins: false,
        conversa: null,
        gravidade: GRAVIDADE,
        nivelDoMar: -10,
      }
      c.noModo += e.dt
      passoComColisao(
        MODOS[c.modo],
        c,
        e,
        mundo,
        col,
        k,
        k,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        () => true,
        () => {},
      )
      corpo.setNextKinematicTranslation(c.prox)
      world.step()
      if (c.modo === 'escada') passouPeloModoEscada = true
      const p = corpo.translation()
      // Parou no piso de cima, depois da beira do vão.
      if (c.modo === 'chao' && c.noChao && p.z < -4.6) break
    }
    const p = corpo.translation()
    return {
      passouPeloModoEscada,
      modo: c.modo,
      pe: p.y - CORPO.doCentroAoPe - CORPO.folga,
      x: p.x,
      z: p.z,
    }
  } finally {
    world.free()
  }
}
