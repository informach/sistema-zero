import { expect, test } from 'bun:test'
import { BoxGeometry, Matrix4 } from 'three'
import { pontosDeEncaixeDoGlb } from '../src/encaixes-do-glb'
import { pontosDeEncaixeDaGeometria } from '../src/pontos-de-encaixe'
import { glb } from './fixtures/glb-compilacao'

/** Um trecho de caminho (1,2 × 0,1 × 4 m) num GLB, com o nó deslocado e dentro de um pai. */
function trechoEmGlb() {
  const caixa = new BoxGeometry(1.2, 0.1, 4)
  const posicoes = new Float32Array(caixa.getAttribute('position').array)
  const indices = new Uint16Array(caixa.index!.array)
  const bin = new Uint8Array(posicoes.byteLength + indices.byteLength)
  bin.set(new Uint8Array(posicoes.buffer), 0)
  bin.set(new Uint8Array(indices.buffer), posicoes.byteLength)
  caixa.computeBoundingBox()
  const { min, max } = caixa.boundingBox!
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posicoes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: posicoes.byteLength, byteLength: indices.byteLength, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: posicoes.length / 3,
        type: 'VEC3',
        min: [min.x, min.y, min.z],
        max: [max.x, max.y, max.z],
      },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    nodes: [
      { children: [1], translation: [0, 0.05, 0] },
      { mesh: 0, translation: [3, 0, 0] },
    ],
    scenes: [{ nodes: [0] }],
    scene: 0,
  }
  return { bytes: glb(json, bin), caixa }
}

test('o GLB sem janela dá os mesmos pontos que a geometria do palco', () => {
  const { bytes, caixa } = trechoEmGlb()
  const doGlb = pontosDeEncaixeDoGlb(bytes)
  const daGeometria = pontosDeEncaixeDaGeometria([
    { geometria: caixa, matriz: new Matrix4().makeTranslation(3, 0.05, 0) },
  ])
  expect(doGlb).toHaveLength(2)
  expect(doGlb).toEqual(daGeometria)
  // As pontas do trecho, na altura do piso (0,1 m), deslocadas pelo nó e pelo pai.
  const frente = doGlb.find((p) => p.direcao.z === 1)!
  expect(frente.posicao.x).toBeCloseTo(3, 6)
  expect(frente.posicao.y).toBeCloseTo(0.1, 6)
  expect(frente.posicao.z).toBeCloseTo(2, 6)
  caixa.dispose()
})
