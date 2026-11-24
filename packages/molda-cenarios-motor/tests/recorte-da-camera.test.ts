import { expect, test } from 'bun:test'
import { perspectiveFitDistance } from '@sistemazero/molda/palco'
import { Box3, PerspectiveCamera, Sphere, Vector3 } from 'three'
import { limitesDaBase, recorteDaCamera } from '../src/recorte-da-camera'

test('cena de 8192 m cabe em retrato/paisagem sem limite fixo de 2500 m ou far de 6000 m', () => {
  const caixa = limitesDaBase(
    {
      tipo: 'terreno',
      origem: { x: -4096, z: -4096 },
      passo: 2,
      colunas: 4096,
      linhas: 4096,
      min: -1000,
      max: 1000,
      fundo: 0,
      pecas: [],
    },
    new Box3(),
  )
  const raio = caixa.getBoundingSphere(new Sphere())
  for (const aspecto of [0.25, 1, 2]) {
    const distancia = perspectiveFitDistance(raio.radius, 48, aspecto) * 1.15,
      camera = new PerspectiveCamera(48, aspecto, 0.1, 6000),
      alvo = new Vector3()
    camera.position.copy(new Vector3(0.55, 0.5, 0.67).normalize().multiplyScalar(distancia))
    camera.lookAt(alvo)
    const limites = recorteDaCamera(caixa, camera.position, alvo, 48, aspecto)
    expect(limites.orbita).toBeGreaterThan(distancia)
    expect(limites.longe).toBeGreaterThan(distancia + raio.radius)
    camera.near = limites.perto
    camera.far = limites.longe
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    for (const x of [caixa.min.x, caixa.max.x])
      for (const y of [caixa.min.y, caixa.max.y])
        for (const z of [caixa.min.z, caixa.max.z]) {
          const p = new Vector3(x, y, z).project(camera)
          expect(Math.abs(p.x)).toBeLessThan(1)
          expect(Math.abs(p.y)).toBeLessThan(1)
          expect(Math.abs(p.z)).toBeLessThan(1)
        }
  }
})
test('zoom próximo e fotografia pequena conservam near apropriado e far finito', () => {
  const caixa = new Box3(new Vector3(-0.01, 0, -0.01), new Vector3(0.01, 0.02, 0.01)),
    posicao = new Vector3(0.03, 0.03, 0.03),
    alvo = new Vector3(0, 0.01, 0)
  const r = recorteDaCamera(caixa, posicao, alvo, 48, 1, true)
  expect(r.perto).toBe(0.001)
  expect(Number.isFinite(r.longe)).toBe(true)
  expect(recorteDaCamera(caixa, new Vector3(0, 0.5, 0.5), alvo, 48, 1).perto).toBe(0.005)
})
