import { expect, test } from 'bun:test'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { MeshStandardMaterial } from 'three'
import { NEVOA_DA_ILHA_FECHADA, pintarMateriais, pinturaDaIlha } from '../src/mundo/pintura-da-ilha'

/** §6.28 A37: a névoa por cima da ilha que ainda espera o posto, que some com a cor. */
test('a tinta da ilha leva a névoa, que depende da chegada da cor', () => {
  const material = new MeshStandardMaterial()
  pintarMateriais([material], pinturaDaIlha(ilha('pico')))
  const shader = {
    uniforms: {},
    vertexShader: 'void main() {\n#include <project_vertex>\n}',
    fragmentShader:
      'void main() {\n#include <color_fragment>\n#include <emissivemap_fragment>\n#include <fog_fragment>\n}',
  }
  material.onBeforeCompile(shader as never, undefined as never)
  expect(shader.fragmentShader).toContain('arqNevoa')
  expect(shader.fragmentShader).toContain(
    `(1.0 - uArqChegada) * ${NEVOA_DA_ILHA_FECHADA.toFixed(2)}`,
  )
  expect(shader.fragmentShader).toContain('#include <fog_fragment>')
  expect(NEVOA_DA_ILHA_FECHADA).toBeGreaterThan(0)
  expect(NEVOA_DA_ILHA_FECHADA).toBeLessThan(0.5)
})
