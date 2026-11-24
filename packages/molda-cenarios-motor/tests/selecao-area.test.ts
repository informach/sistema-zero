import { expect, test } from 'bun:test'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { escolherNaArea } from '../src/selecao-area'

test('retângulo escolhe centros projetados sem alterar posições; respeita bloqueio, ocultação e recorte', () => {
  const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
  camera.position.set(0, 10, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  const centro = new Vector3()
  const candidatos = [
    { id: 'centro', centro },
    { id: 'fora', centro: new Vector3(4, 0, 4) },
    { id: 'trancado', centro, bloqueado: true },
    { id: 'oculto', centro, oculto: true },
    { id: 'atras', centro: new Vector3(0, 20, 0) },
    { id: 'longe', centro: new Vector3(0, -200, 0) },
  ]
  expect(
    escolherNaArea(candidatos, camera, { kind: 'box', from: [0.45, 0.45], to: [0.55, 0.55] }),
  ).toEqual(['centro'])
  expect(escolherNaArea(candidatos, camera, { kind: 'box', from: [1, 1], to: [0, 0] })).toEqual([
    'centro',
    'fora',
  ])
  expect(centro.toArray()).toEqual([0, 0, 0])
})

test('laço usa o contorno real e funciona em câmera de perspectiva, inclusive após girar', () => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 10, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  const candidatos = [
    { id: 'centro', centro: new Vector3() },
    { id: 'canto', centro: new Vector3(2, 0, 2) },
  ]
  expect(
    escolherNaArea(candidatos, camera, {
      kind: 'lasso',
      points: [
        [0.3, 0.3],
        [0.8, 0.3],
        [0.3, 0.8],
      ],
    }),
  ).toEqual(['centro'])
  camera.position.set(10, 8, 6)
  camera.lookAt(0, 0, 0)
  expect(
    escolherNaArea(candidatos, camera, { kind: 'box', from: [0.49, 0.49], to: [0.51, 0.51] }),
  ).toEqual(['centro'])
  expect(
    escolherNaArea(candidatos, camera, {
      kind: 'lasso',
      points: [
        [0, 0],
        [1, 1],
      ],
    }),
  ).toEqual([])
})
