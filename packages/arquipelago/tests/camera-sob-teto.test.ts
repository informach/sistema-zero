import { beforeAll, describe, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { FOLGA_DA_CAMERA, GRUA_DA_CAMERA, RAIO_DA_SONDA_DA_CAMERA } from '../src/mundo/medidas'
import { desvioVerticalDaCamera } from '../src/sistemas/camera'

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
beforeAll(async () => {
  await R.init()
})

const escolher = (angulo: number, medir: (angulo: number) => number) =>
  desvioVerticalDaCamera(
    angulo,
    -Math.atan2(FOLGA_DA_CAMERA, 9),
    medir,
    GRUA_DA_CAMERA.subidas,
    GRUA_DA_CAMERA.inclinacaoMaxima,
    GRUA_DA_CAMERA.ganhoMinimo,
  )

describe('enquadramento sob um teto baixo', () => {
  test('a sonda real se afasta do teto quando começa tangenciando a face inferior', () => {
    const world = new R.World({ x: 0, y: 0, z: 0 })
    try {
      world.createCollider(R.ColliderDesc.cuboid(3.5, 0.475, 3.5).setTranslation(0, 2.175, 0))
      world.step()
      const esfera = new R.Ball(RAIO_DA_SONDA_DA_CAMERA)
      const medir = (angulo: number) => {
        const hit = world.castShape(
          { x: 0, y: 1.25, z: 0 },
          { x: 0, y: 0, z: 0, w: 1 },
          { x: 0, y: Math.sin(angulo), z: Math.cos(angulo) },
          esfera,
          0,
          9 + FOLGA_DA_CAMERA,
          false,
        )
        return hit ? hit.time_of_impact - FOLGA_DA_CAMERA : 9
      }
      expect(medir(0.6)).toBeLessThan(0.1)
      let ajuste = 0
      for (let i = 0; i < 150; i++)
        ajuste += (escolher(0.6, medir) - ajuste) * (1 - Math.exp(-6 / 60))
      expect(medir(0.6 + ajuste)).toBeGreaterThan(2)
    } finally {
      world.free()
    }
  })
  test('passa abaixo do teto em vez de comprimir a câmera no corpo', () => {
    // O alvo e a esfera somam a altura do teto do Recife. Descer afasta a sonda do contato.
    const espacoVertical = 1.7 - 1.25 - RAIO_DA_SONDA_DA_CAMERA
    const medir = (angulo: number) =>
      angulo < 0 ? 9 : Math.min(9, espacoVertical / Math.sin(angulo) - FOLGA_DA_CAMERA)
    const pedido = 0.6
    expect(medir(pedido)).toBeLessThan(0.1)
    const corrigido = pedido + escolher(pedido, medir)
    expect(corrigido).toBeCloseTo(-Math.atan2(FOLGA_DA_CAMERA, 9))
    expect(medir(corrigido)).toBe(9)
  })

  test('uma parede baixa continua pedindo subida quando ali há mais espaço', () => {
    const pedido = 0.3
    const medir = (angulo: number) => (angulo >= 0.7 ? 9 : 2)
    expect(escolher(pedido, medir)).toBeCloseTo(0.45)
  })

  test('sem bloqueio preserva a inclinação escolhida pela pessoa', () => {
    expect(escolher(0.6, () => 9)).toBe(0)
  })

  test('diferença menor que a folga de ganho não causa troca de ângulo', () => {
    expect(escolher(0.6, (angulo) => (angulo < 0 ? 2.4 : 2))).toBe(0)
  })
})
