import { expect, test } from 'bun:test'
import { DoubleSide, FrontSide } from 'three'
import { addScenePrimitive } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { SCENE_XRAY_ALPHA, SceneMaterialResource } from './sceneMaterialResource'

test('the workshop material keeps the exported sides; the dark back comes from the render', () => {
  const document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Verso' }),
    'box',
    'Caixa',
  )
  const resource = new SceneMaterialResource()
  try {
    resource.update({
      source: { ...document.materials[0]!, doubleSided: false },
      base: [0, 0, 1, 1],
      maps: {},
    })
    expect(resource.material.side).toBe(FrontSide)
    resource.update({
      source: { ...document.materials[0]!, doubleSided: true },
      base: [0, 0, 1, 1],
      maps: {},
    })
    expect(resource.material.side).toBe(DoubleSide)
  } finally {
    resource.dispose()
  }
})

test('Raio-X só esmaece a vista: opacidade, recorte e transparência autorais voltam intactos', () => {
  const document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Raio' }),
    'box',
    'Caixa',
  )
  const source = { ...document.materials[0]!, alphaMask: { cutoff: 0.5, opacity: 0.8 } }
  const resource = new SceneMaterialResource()
  const uniforms: Record<string, { value: unknown }> = {}
  const shader = {
    uniforms,
    vertexShader: '#include <uv_pars_vertex>',
    fragmentShader: 'void main() {\n#include <alphatest_fragment>\n}',
  }
  try {
    resource.update({ source, base: [0, 0, 1, 1], maps: {} })
    resource.material.onBeforeCompile(shader as never, undefined as never)
    expect(shader.fragmentShader).toContain(
      '#include <alphatest_fragment>\ndiffuseColor.a *= moldaXrayAlpha;',
    )
    expect(resource.material.transparent).toBe(false)
    expect(uniforms.moldaXrayAlpha?.value).toBe(1)

    resource.setXray(true)
    expect(resource.material.transparent).toBe(true)
    expect(resource.material.depthWrite).toBe(false)
    expect(uniforms.moldaXrayAlpha?.value).toBe(SCENE_XRAY_ALPHA)
    expect(resource.material.opacity).toBe(0.8)
    expect(resource.material.alphaTest).toBe(0.5)

    // Uma edição durante o Raio-X continua esmaecida.
    resource.update({ source, base: [1, 0, 0, 1], maps: {} })
    expect(resource.material.transparent).toBe(true)

    resource.setXray(false)
    expect(resource.material.transparent).toBe(false)
    expect(resource.material.depthWrite).toBe(true)
    expect(uniforms.moldaXrayAlpha?.value).toBe(1)

    resource.update({ source: document.materials[0]!, base: [0, 0, 1, 0.5], maps: {} })
    resource.setXray(true)
    resource.setXray(false)
    expect(resource.material.transparent).toBe(true)
    expect(resource.material.opacity).toBe(0.5)
  } finally {
    resource.dispose()
  }
})
