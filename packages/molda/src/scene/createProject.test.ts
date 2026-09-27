import { expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { MOLDA_TEMPLATE_IDS } from '../templates/types'
import { createSceneProject, sceneProjectName } from './createProject'
import { readSceneDocument } from './readDocument'

test('empty start is truly empty, explicitly named and independently identified', () => {
  const a = createSceneProject({ kind: 'empty', name: '  Meu mundo  ' })
  const b = createSceneProject({ kind: 'empty', name: 'Meu mundo' })
  expect(a.name).toBe('Meu mundo')
  expect(a.id).not.toBe(b.id)
  expect(a.id).not.toBe('oficina-demo')
  expect(a.nodes).toEqual([])
  expect(a.geometries).toEqual([])
  expect(a.images).toEqual([])
  expect(readSceneDocument(a).status).toBe('valid')
  expect(a.formatVersion).toBe(2)
})

for (const templateId of MOLDA_TEMPLATE_IDS) {
  test(`template ${templateId} starts as independent native pieces, geometry and paintings without discarded migration issues`, () => {
    const a = createSceneProject({ kind: 'template', templateId, name: 'Minha invenção' })
    const b = createSceneProject({ kind: 'template', templateId, name: 'Outra invenção' })
    expect(a.name).toBe('Minha invenção')
    expect(readSceneDocument(a).status).toBe('valid')
    expect(readSceneDocument(b).status).toBe('valid')
    expect(a.nodes.length).toBeGreaterThan(0)
    expect(a.id).not.toBe(b.id)
    const firstIds = new Set(a.nodes.map((node) => node.id))
    expect(b.nodes.some((node) => firstIds.has(node.id))).toBe(false)
    const before = structuredClone(b)
    a.nodes[0]!.name = 'Mudança local'
    for (const image of a.images) for (const layer of image.layers) layer.pixels.fill(0)
    for (const geometry of a.geometries) {
      if (geometry.kind === 'mesh')
        for (const vertex of Object.values(geometry.vertices)) vertex[0] = 99
      else if (geometry.kind === 'path') for (const point of geometry.points) point.position[0] = 99
      else geometry.from[0] = 99
    }
    expect(b).toEqual(before)
  })
}

test('start schema and names reject invalid choices, shadow identity and truncation instead of creating fallback content', () => {
  for (const input of [
    undefined,
    null,
    [],
    {},
    { kind: 'starter', name: 'X' },
    { kind: 'empty', name: 'X', id: 'oficina-demo' },
    { kind: 'empty', name: 'X', templateId: 'carro' },
    { kind: 'template', name: 'X' },
    { kind: 'template', name: 'X', templateId: 'missing' },
    ...[null, 1, '', '   ', 'x'.repeat(MOLDA_LIMITS.maxNameChars + 1)].map((name) => ({
      kind: 'empty',
      name,
    })),
  ])
    expect(() => createSceneProject(input)).toThrow()
  expect(sceneProjectName('x'.repeat(MOLDA_LIMITS.maxNameChars))).toHaveLength(
    MOLDA_LIMITS.maxNameChars,
  )
  expect(sceneProjectName('  Minha nave 🚀  ')).toBe('Minha nave 🚀')
  expect(sceneProjectName('<script>texto</script>')).toBe('<script>texto</script>')
})
