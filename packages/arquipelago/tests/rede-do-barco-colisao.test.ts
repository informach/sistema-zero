import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import type { RapierContext } from '@react-three/rapier'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { Mesh, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  ALTURA_DAS_NUVENS,
  centroNoAnel,
  giroDaIlha,
  ilhasEmVolta,
  PIER,
} from '../src/mundo/medidas'
import { PORTOS_DA_ARTE } from '../src/mundo/portos-da-arte'
import { criarTravessia, embarcar, type PortoId, passoDaTravessia } from '../src/sistemas/barco'
import { CORPO } from '../src/sistemas/corpo'
import { MERGULHO } from '../src/sistemas/mergulho'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { LIGACOES_DO_BARCO } from '../src/sistemas/rede-do-barco'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
let world: InstanceType<typeof R.World>
const nomes = new Map<number, string>()
let casco: InstanceType<typeof R.TriMesh>
beforeAll(async () => {
  await R.init()
  world = new R.World({ x: 0, y: -24, z: 0 })
  const por = async (arquivo: string, x: number, y: number, z: number, giro: number) => {
    const raiz = await carregarGlb(arquivo)
    const rb = world.createRigidBody(
      R.RigidBodyDesc.fixed()
        .setTranslation(x, y, z)
        .setRotation({ x: 0, y: Math.sin(giro / 2), z: 0, w: Math.cos(giro / 2) }),
    )
    for (const c of lerColisores(raiz)) {
      if (c.nome === 'col-barco-1') continue
      let d: ReturnType<typeof R.ColliderDesc.cuboid>
      if (c.forma === 'malha') d = R.ColliderDesc.trimesh(c.vertices, c.indices)
      else {
        d =
          c.forma === 'caixa'
            ? R.ColliderDesc.cuboid(...c.meio)
            : R.ColliderDesc.cylinder(c.meiaAltura, c.raio)
        d.setTranslation(...c.posicao).setRotation({
          x: c.rotacao[0],
          y: c.rotacao[1],
          z: c.rotacao[2],
          w: c.rotacao[3],
        })
      }
      nomes.set(world.createCollider(d, rb).handle, `${arquivo}:${c.nome}`)
    }
  }
  await por(
    fileURLToPath(new URL('../src/assets/mundo/pier.glb', import.meta.url)),
    PIER.x,
    0,
    PIER.z,
    0,
  )
  for (const { ilha, centro } of ilhasEmVolta()) {
    const giro = giroDaIlha(ilha)
    await por(
      arquivoDaIlha(`${ilha.id}.glb`),
      centro.x,
      ilha.id === 'nuvens' ? ALTURA_DAS_NUVENS : 0,
      centro.z,
      giro,
    )
    if (ilha.id === 'recife')
      for (const nome of ['navio', 'labirinto'] as const) {
        const p = MERGULHO[nome]
        await por(
          arquivoDaIlha(`recife-${nome}.glb`),
          centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
          p.y,
          centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
          giro,
        )
      }
  }
  const barco = await carregarGlb(arquivoDaIlha('barco.glb'))
  barco.updateMatrixWorld(true)
  const vertices: number[] = [],
    indices: number[] = []
  barco.traverse((m) => {
    if (!(m instanceof Mesh)) return
    const p = m.geometry.getAttribute('position'),
      base = vertices.length / 3
    for (let i = 0; i < p.count; i++) {
      const v = new Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)
      vertices.push(v.x, v.y, v.z)
    }
    const index = m.geometry.getIndex()
    for (let i = 0; i < (index?.count ?? p.count); i++)
      indices.push(base + (index ? index.getX(i) : i))
  })
  casco = new R.TriMesh(new Float32Array(vertices), new Uint32Array(indices))
  world.step()
}, 30_000)
afterAll(() => world?.free())

for (const [a, b] of LIGACOES_DO_BARCO) {
  test(`${a} a ${b}: casco e cápsula real atravessam e desembarcam nos dois sentidos`, () => {
    const centro = (id: PortoId) => (id === 'sua-ilha' ? null : { ...centroNoAnel(ilha(id)), y: 0 })
    const viagem = criarTravessia(
      [PORTOS_DA_ARTE[a], PORTOS_DA_ARTE[b]],
      { x: 1, y: 0.5, z: 0 },
      [centro(a), centro(b)],
      [a, b],
    )
    viagem.prontos = [true, true]
    const cascoMovel = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased())
    const sonda = world.createCollider(
      R.ColliderDesc.trimesh(casco.vertices, casco.indices)
        .setSensor(true)
        .setActiveCollisionTypes(R.ActiveCollisionTypes.ALL),
      cascoMovel,
    )
    try {
      for (const origem of [0, 1] as const) {
        embarcar(viagem, origem, viagem.portos[origem].embarque)
        let n = 0
        while (viagem.fase !== 'atracado' && n++ < 18000) {
          passoDaTravessia(viagem, 1 / 60, false)
          const p = viagem.pose
          cascoMovel.setNextKinematicTranslation(p)
          cascoMovel.setNextKinematicRotation({
            x: 0,
            y: Math.sin(p.giro / 2),
            z: 0,
            w: Math.cos(p.giro / 2),
          })
          world.step()
          world.intersectionPairsWith(sonda, (outro) => {
            throw new Error(
              JSON.stringify({
                rota: [a, b],
                origem,
                fase: viagem.fase,
                pose: p,
                colisor: nomes.get(outro.handle),
              }),
            )
          })
        }
      }
    } finally {
      world.removeRigidBody(cascoMovel)
    }
    const p = viagem.portos[0].embarque
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        p.x,
        p.y + CORPO.doCentroAoPe + CORPO.folga,
        p.z,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
    try {
      const c = criarEstadoDoCorpo()
      const mundo: MundoDoMovimento = {
        cipos: [],
        troncos: [],
        aguas: [],
        equilibrios: [],
        escadas: [],
        escorregadores: [],
        bordas: [],
        rodasDeNado: [],
        foco: { x: 0, y: 0, z: 0 },
      }
      const e: EntradaDoPasso = {
        dt: 1 / 60,
        agora: 0,
        parado: false,
        p: corpo.translation(),
        ix: 0,
        iz: 0,
        pedidoX: 0,
        pedidoZ: 0,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        patins: false,
        conversa: null,
        gravidade: 24,
        nivelDoMar: 0,
      }
      viagem.prontos = [true, true]
      for (const origem of [0, 1] as const) {
        embarcar(viagem, origem, viagem.portos[origem].embarque)
        c.barco = viagem
        c.modo = 'barco'
        let n = 0
        while (c.modo === 'barco' && n++ < 18000) {
          e.p = corpo.translation()
          e.agora += 1000 / 60
          passoComColisao(
            MODOS.barco,
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
        }
        expect(c).toMatchObject({ modo: 'chao' })
        expect(viagem.devolvendo).toBe(false)
        const fim = viagem.portos[viagem.destino].embarque
        expect(c.prox.x).toBeCloseTo(fim.x, 2)
        expect(c.prox.z).toBeCloseTo(fim.z, 2)
        expect(Math.abs(c.prox.y - CORPO.doCentroAoPe - CORPO.folga - fim.y)).toBeLessThanOrEqual(
          CORPO.folga + 0.001,
        )
      }
    } finally {
      world.removeCharacterController(k)
      world.removeRigidBody(corpo)
    }
  }, 30_000)
}

test('sonda do casco detecta obstáculo real, sem depender de caixa de contorno vazia', () => {
  const p = PORTOS_DA_ARTE.bosque.barco,
    giro = PORTOS_DA_ARTE.bosque.giro
  const obstaculo = world.createCollider(
    R.ColliderDesc.cuboid(10, 10, 10).setTranslation(p.x, p.y, p.z),
  )
  world.step()
  try {
    expect(
      world.intersectionWithShape(
        p,
        { x: 0, y: Math.sin(giro / 2), z: 0, w: Math.cos(giro / 2) },
        casco,
      )?.handle,
    ).toBe(obstaculo.handle)
  } finally {
    world.removeCollider(obstaculo, true)
  }
})
