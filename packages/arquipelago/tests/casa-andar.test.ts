import { beforeAll, describe, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { RapierContext } from '@react-three/rapier'
import { Box3, Group, type Mesh, type Object3D, Raycaster, Vector3 } from 'three'
import { emendasAbertas, sobreposicoes } from '../scripts/faces-coplanares'
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
 * escada (âncoras `escada-1-*`, como a escada do Bosque). No jogo: x igual, y para cima, z = -y
 * do Blender (a escada sobe para -z).
 *
 * Desde 31/10/2026: o `piso-andar-vao-parede` (sem o guarda-corpo do lado +x, para a escada
 * encostar numa parede) e as paredes do andar (`casa-paredes-andar.glb`, sem alicerce, com a
 * cinta na linha do piso), montados como em `cenas.py` (`andar_na_parede`) e conferidos com a
 * mesma busca de faces coplanares e emendas em T do `scripts/faces-coplanares.ts`.
 */
const CASA = join(import.meta.dir, '..', 'src', 'assets', 'casa')
const ARQUIVO = join(CASA, 'casa-andar.glb')
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
const doVao = () => colisores.filter((c) => /^col-guarda-vao-\d+$/.test(c.nome))
const doVaoNaParede = () => colisores.filter((c) => c.nome.startsWith('col-guarda-vao-parede-'))

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

  for (const naParede of [false, true])
    for (const comModoEscada of [false, true])
      test(`${
        comModoEscada
          ? 'a cápsula do corpo sobe a escada no modo escada e sai no piso de cima'
          : 'a cápsula do corpo sobe a escada andando e chega no piso de cima'
      }${naParede ? ', encostada na parede (piso-andar-vao-parede)' : ''}`, () => {
        const r = subir(comModoEscada, naParede)
        expect(r.passouPeloModoEscada).toBe(comModoEscada)
        expect(r.modo).toBe('chao')
        expect(r.pe).toBeCloseTo(ANDAR, 1)
        expect(Math.abs(r.pe - ANDAR)).toBeLessThan(0.05)
        expect(r.z).toBeLessThan(-4.3)
        expect(Math.abs(r.x)).toBeLessThan(0.05)
      })
})

/** Sobe com a entrada "para a frente" (para -z) por até 12 s; devolve onde o corpo parou. */
function subir(comModoEscada: boolean, naParede = false) {
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
    // Encostada na parede: a parede do kit na linha x = +0,5 (de 0,40 a 0,60, os dois andares; o
    // colisor das paredes é do jogo, `pecas.ts`) e o vão sem o guarda-corpo desse lado.
    if (naParede) caixa(0.4, 0.6, -1, 2 * ANDAR, -6, 2)
    for (const c of [...daEscada(), ...(naParede ? doVaoNaParede() : doVao())]) {
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

// ---------------------------------------------------------------- a escada na parede e as paredes do andar
const PAREDES_DO_ANDAR = [
  ...['lambri', 'lisa'].flatMap((f) => [
    `parede-${f}-andar`,
    `parede-${f}-baixa-andar`,
    `parede-janela-grande-${f}-andar`,
    `parede-janela-arco-${f}-andar`,
    `parede-janela-redonda-${f}-andar`,
    `quina-${f}-andar`,
    `quina-${f}-baixa-andar`,
  ]),
  'parede-porta-lisa-andar',
  'parede-porta-lisa-baixa-andar',
]

describe('a escada na parede e as paredes do andar', () => {
  const fontes = new Map<string, Object3D>()
  beforeAll(async () => {
    for (const a of [
      'casa-paredes.glb',
      'casa-pisos.glb',
      'casa-andar.glb',
      'casa-paredes-andar.glb',
    ])
      for (const o of [...(await carregarGlb(join(CASA, a))).children]) fontes.set(o.name, o)
  })

  test('o vão na parede: sem guarda-corpo nem colisor do lado +x', () => {
    const vao = fontes.get('piso-andar-vao-parede') as Object3D
    // Corrimão, postes e balaústres (`batente` e os balaústres de `acabamento`) ficam antes da faixa
    // que encosta na parede (0,355); só a faixa entra na parede (até 0,49, a linha é 0,50).
    const c = new Box3().setFromObject(vao)
    expect(c.max.x).toBeLessThanOrEqual(0.49 + 1e-3)
    vao.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => x.name)
      if (mats.includes('batente'))
        expect(new Box3().setFromObject(m).max.x).toBeLessThanOrEqual(0.356)
    })
    const cols = doVaoNaParede()
    expect(cols.map((x) => x.nome).sort()).toEqual([
      'col-guarda-vao-parede-1',
      'col-guarda-vao-parede-2',
    ])
    for (const col of cols) {
      expect(col.posicao[0] + col.meio[0]).toBeLessThanOrEqual(0.4 + 1e-3)
      expect(col.posicao[1] + col.meio[1]).toBeCloseTo(ANDAR + 1, 3)
    }
  })

  test('as paredes do andar: sem alicerce, de 3,96 (cinta e quina) para cima, o pé da parede em 4,10', () => {
    for (const nome of PAREDES_DO_ANDAR) {
      const o = fontes.get(nome) as Object3D
      expect({ nome, tem: !!o }).toEqual({ nome, tem: true })
      const c = new Box3().setFromObject(o)
      expect(c.min.y).toBeGreaterThanOrEqual(3.95)
      o.traverse((m) => {
        const malha = m as Mesh
        if (!malha.isMesh) return
        for (const x of Array.isArray(malha.material) ? malha.material : [malha.material]) {
          expect({ nome, m: x.name }).not.toEqual({ nome, m: 'alicerce' })
          if (x.name === 'paredeDentro' || x.name === 'parede' || x.name === 'paredeVerso')
            expect(new Box3().setFromObject(malha).min.y).toBeGreaterThanOrEqual(ANDAR - 1e-3)
        }
      })
    }
  })

  /** A sala 3 × 6 de `cenas.py` (`andar_na_parede`): escada encostada na parede x = 3, e as paredes
   * de cima diferentes das de baixo. Posição e giro como os do Blender (giro em z = giro em y). */
  function salaComAEscadaNaParede(): Group {
    const sala = new Group()
    let n = 0
    const por = (nome: string, x: number, y: number, giro = 0) => {
      const fonte = fontes.get(nome)
      if (!fonte) throw new Error(`sem o nó ${nome}`)
      const g = new Group()
      g.name = `${nome}#${n++}`
      g.position.set(x, 0, -y)
      g.rotation.y = (giro * Math.PI) / 180
      g.add(fonte.clone(true))
      sala.add(g)
    }
    const corrida = (eixo: 'x' | 'y', fixo: number, pecas: [string, number][], dentro: 1 | -1) => {
      let pos = 0
      const giro = eixo === 'x' ? (dentro > 0 ? 0 : 180) : dentro > 0 ? -90 : 90
      for (const [nome, larg] of pecas) {
        const c = pos + larg / 2
        if (eixo === 'x') por(nome, c, fixo, giro)
        else por(nome, fixo, c, giro)
        pos += larg
      }
    }
    const w = 3
    const d = 6
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) por('piso-tabua', i + 0.5, j + 0.5)
    const vezes = (nome: string, k: number) =>
      Array.from({ length: k }, () => [nome, 1] as [string, number])
    const baixo = {
      fundo: [['parede-janela-grande-lambri', 3]] as [string, number][],
      esquerda: [
        ['parede-lambri', 1],
        ['parede-porta-lambri', 3],
        ...vezes('parede-lambri', 2),
      ] as [string, number][],
      direita: vezes('parede-lambri', 6),
      frente: vezes('parede-lambri-baixa', 3),
    }
    const cima = {
      fundo: [
        ['parede-janela-arco-lambri-andar', 2],
        ['parede-janela-redonda-lambri-andar', 1],
      ] as [string, number][],
      esquerda: [['parede-janela-grande-lambri-andar', 3], ...vezes('parede-lambri-andar', 3)] as [
        string,
        number,
      ][],
      direita: vezes('parede-lambri-andar', 6),
      frente: vezes('parede-lambri-baixa-andar', 3),
    }
    for (const [paredes, sufixo] of [
      [baixo, ''],
      [cima, '-andar'],
    ] as const) {
      corrida('x', d, paredes.fundo, -1)
      corrida('y', 0, paredes.esquerda, 1)
      corrida('y', w, paredes.direita, -1)
      corrida('x', 0, paredes.frente, 1)
      for (const [x, y, q] of [
        [0, 0, 'quina-lambri'],
        [w, 0, 'quina-lambri-baixa'],
        [0, d, 'quina-lambri'],
        [w, d, 'quina-lambri'],
      ] as const)
        por(`${q}${sufixo}`, x, y)
    }
    for (let i = 0; i < w; i++)
      for (let j = 0; j < d; j++)
        if (!(i === 2 && j >= 1 && j < 5)) por('piso-andar-tabua', i + 0.5, j + 0.5)
    por('escada-interna', 2.5, 1)
    por('piso-andar-vao-parede', 2.5, 1)
    sala.updateMatrixWorld(true)
    return sala
  }

  test('montada com a parede de lambri na linha do lado +x: nenhuma face coplanar nem emenda em T', () => {
    const sala = salaComAEscadaNaParede()
    const par = (x: { a: string; b: string }) => `${x.a} x ${x.b}`
    expect(sobreposicoes(sala).map(par)).toEqual([])
    expect(emendasAbertas(sala).map(par)).toEqual([])
  })

  test('sem fresta entre a parede de baixo e a de cima: por fora, a cinta tapa a linha do piso', () => {
    const sala = salaComAEscadaNaParede()
    const raios = new Raycaster()
    // A parede da direita (x = 3), vista de fora (+x), na altura entre as duas paredes e um pouco
    // acima e abaixo: o primeiro que o raio encontra fica na fachada (x >= 3,10) ou na frente dela.
    for (let z = 0.5; z < 6; z += 0.5)
      for (const h of [3.9, 3.98, 4.02, 4.05, 4.08, 4.12, 4.2]) {
        raios.set(new Vector3(5, h, -z), new Vector3(-1, 0, 0))
        const hit = raios.intersectObject(sala, true)[0]
        expect({ z, h, x: hit && hit.point.x >= 3.1 - 1e-3 }).toEqual({ z, h, x: true })
      }
  })
})
