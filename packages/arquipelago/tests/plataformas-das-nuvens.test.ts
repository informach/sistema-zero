import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { criarEstadoDoCorpo, MODOS } from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import type { EntradaDoPasso, MundoDoMovimento } from '../src/sistemas/modos/tipos'
import { avancarPlataformas, elevacaoDaPlataforma } from '../src/sistemas/plataformas-das-nuvens'

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
beforeAll(async () => {
  await R.init()
})

test('ciclo alterna, espera nas pontas, é contínuo e a pausa congela', () => {
  for (let i = 0; i < 4; i++) {
    for (let t = 0; t < 20; t += PASSO_DA_FISICA) {
      const y = elevacaoDaPlataforma(i, t)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(2.4)
      expect(Math.abs(elevacaoDaPlataforma(i, t + PASSO_DA_FISICA) - y)).toBeLessThanOrEqual(
        0.6001 * PASSO_DA_FISICA,
      )
      expect(elevacaoDaPlataforma(i, t + 20)).toBeCloseTo(y, 8)
      expect(avancarPlataformas(t, 1, true)).toBe(t)
    }
  }
  expect(elevacaoDaPlataforma(0, 1)).toBe(0)
  expect(elevacaoDaPlataforma(1, 1)).toBe(2.4)
  expect(elevacaoDaPlataforma(0, 11)).toBe(2.4)
  expect(elevacaoDaPlataforma(1, 11)).toBe(0)
})

function viajar(fps: number, pular = false) {
  const world = new R.World({ x: 0, y: -GRAVIDADE, z: 0 })
  try {
    world.timestep = PASSO_DA_FISICA
    const plataforma = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 3.025, 0),
    )
    plataforma.userData = { plataformaDoMundo: true }
    world.createCollider(R.ColliderDesc.roundCylinder(0.145, 1.68, 0.03), plataforma)
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        3.2 + CORPO.doCentroAoPe + CORPO.folga,
        0,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
    k.enableSnapToGround(0.35)
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
    const trajetoria: number[] = []
    let t = 0,
      passo = 0
    world.step()
    for (let quadro = 0; quadro < fps * 20; quadro++)
      for (let n = 0; n < 60 / fps; n++) {
        // Mesmo passo que o renderer. Menos movimento não altera este ciclo físico.
        t = avancarPlataformas(t, PASSO_DA_FISICA, false)
        plataforma.setNextKinematicTranslation({
          x: 0,
          y: 3.025 + elevacaoDaPlataforma(0, t),
          z: 0,
        })
        const e: EntradaDoPasso = {
          dt: PASSO_DA_FISICA,
          agora: (passo * 1000) / 60,
          parado: false,
          p: corpo.translation(),
          ix: 0,
          iz: 0,
          pedidoX: 0,
          pedidoZ: 0,
          ladoX: 1,
          ladoZ: 0,
          pulou: pular && passo === 330,
          usou: false,
          correr: false,
          ritmo: 1,
          patins: false,
          conversa: null,
          gravidade: GRAVIDADE,
          nivelDoMar: -10,
        }
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
        const y = corpo.translation().y
        if (!pular) {
          expect(
            Math.abs(y - CORPO.doCentroAoPe - CORPO.folga - (plataforma.translation().y + 0.175)),
          ).toBeLessThan(0.035)
          expect(c.noChao).toBe(true)
          expect(Math.hypot(corpo.translation().x, corpo.translation().z)).toBeLessThan(0.001)
        }
        trajetoria.push(y)
        passo++
      }
    return trajetoria
  } finally {
    world.free()
  }
}

test('Rapier carrega sem escorregar ou atravessar, a 30 e 60 quadros', () => {
  const referencia = viajar(60)
  expect(referencia).toHaveLength(1200)
  expect(viajar(30)).toEqual(referencia)
  const salto = viajar(60, true)
  expect(salto[345]!).toBeGreaterThan(referencia[345]! + 0.5)
  expect(salto[720]!).toBeCloseTo(referencia[720]!, 2)
})
