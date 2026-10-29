import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { montar } from '../src/sistemas/modos/montar'
import { MONTARIA, type MontariaViva } from '../src/sistemas/montaria'

// O mesmo Rapier do jogo (como em `qualidade.test.ts`): o corpo com as duas cápsulas do
// `personagem.tsx`, o controlador do chão e o filtro que ignora o próprio corpo.
const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', {
    paths: [require.resolve('@react-three/rapier')],
  }),
)
beforeAll(async () => {
  await R.init()
})

test('montada no Rapier de verdade: pisa, anda, pula e desce, com a cápsula de montada', () => {
  const world = new R.World({ x: 0, y: -GRAVIDADE, z: 0 })
  try {
    world.timestep = PASSO_DA_FISICA
    world.createCollider(R.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0))
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        CORPO.doCentroAoPe + CORPO.folga,
        0,
      ),
    )
    const dela = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
    k.enableAutostep(CORPO.degrau, 0.25, true)
    k.enableSnapToGround(0.35)
    const proprio = (c: InstanceType<typeof R.Collider>) => c.parent()?.handle !== corpo.handle
    const dino: MontariaViva = {
      x: 0,
      y: 0,
      z: 1,
      giro: 0,
      montada: false,
      limite: { x: 0, z: 0, raio: 25 },
    }
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
      montaria: dino,
    }
    const c = criarEstadoDoCorpo()
    let montada: InstanceType<typeof R.Collider> | null = null
    const passo = (extra: Partial<EntradaDoPasso> = {}) => {
      const e: EntradaDoPasso = {
        dt: PASSO_DA_FISICA,
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
        gravidade: GRAVIDADE,
        nivelDoMar: -10,
        ...extra,
      }
      const col = c.modo === 'montar' && montada ? montada : dela
      passoComColisao(
        MODOS[c.modo],
        c,
        e,
        mundo,
        col,
        k,
        k,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        proprio,
        () => {},
      )
      corpo.setNextKinematicTranslation(c.prox)
      world.step()
    }
    for (let i = 0; i < 30; i++) passo()
    expect(c.noChao).toBe(true)
    expect(montar(c, dino, corpo.translation(), 0, () => {})).toBe(true)
    // A cápsula de montada, com o pé no mesmo lugar da dela e sem encostar em nada.
    montada = world.createCollider(
      R.ColliderDesc.capsule(MONTARIA.meiaAltura, MONTARIA.raio)
        .setTranslation(0, MONTARIA.meiaAltura + MONTARIA.raio - CORPO.meiaAltura - CORPO.raio, 0)
        .setCollisionGroups(0x0004_0000),
      corpo,
    )
    for (let i = 0; i < 10; i++) passo()
    expect(c.noChao).toBe(true)
    const pe = corpo.translation().y
    expect(pe).toBeCloseTo(CORPO.doCentroAoPe + CORPO.folga, 1)
    for (let i = 0; i < 120; i++) passo({ pedidoZ: 1 })
    expect(corpo.translation().z).toBeGreaterThan(4)
    expect(c.noChao).toBe(true)
    passo({ pulou: true })
    let alto = 0
    for (let i = 0; i < 120; i++) {
      passo()
      alto = Math.max(alto, corpo.translation().y - pe)
    }
    expect(alto).toBeGreaterThan(1.3)
    expect(c.noChao).toBe(true)
    passo({ usou: true })
    expect(c.modo).toBe('chao')
    expect(dino.montada).toBe(false)
  } finally {
    world.free()
  }
})
