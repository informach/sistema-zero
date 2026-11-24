import { expect, test } from 'bun:test'
import { pythonSceneSchemaTable } from '../../scripts/pinta-scene-python-schema'
import { PINTA_IMAGE_WORLD_LIMITS, PINTA_IMAGE_WORLD_PNG_PATTERN } from './pinta-image'
import { PINTA_SCENE_MAX_PROPERTIES, PINTA_SCENE_PROPERTY_COLOR_PATTERN } from './pinta-scene'

test('the generated Python constraint table retains custom properties, limits and regex flags', () => {
  const table = pythonSceneSchemaTable()
  const nodes: Record<string, unknown>[] = []
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if (!Array.isArray(value)) nodes.push(value as Record<string, unknown>)
    for (const child of Object.values(value)) visit(child)
  }
  visit(table.region)
  expect(nodes.filter((node) => node['x-pinta-property'] === true)).toHaveLength(1)
  expect(nodes.filter((node) => node.maxProperties === PINTA_SCENE_MAX_PROPERTIES)).toHaveLength(1)
  const patterns = nodes.filter((node) => typeof node.pattern === 'string')
  expect(patterns).toHaveLength(2)
  expect(patterns.map((node) => node['x-pinta-pattern-flags']).sort()).toEqual(['', 'i'])
  expect(table.propertyColor).toEqual({
    pattern: PINTA_SCENE_PROPERTY_COLOR_PATTERN.source,
    flags: PINTA_SCENE_PROPERTY_COLOR_PATTERN.flags,
  })
})

test('portable image tables preserve Unicode control exclusions and world refinements', () => {
  const table = pythonSceneSchemaTable(),
    nodes: Record<string, unknown>[] = []
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if (!Array.isArray(value)) nodes.push(value as Record<string, unknown>)
    for (const child of Object.values(value)) visit(child)
  }
  visit(table.image)
  expect(nodes.filter((node) => node['x-pinta-no-controls'] === true)).toHaveLength(1)
  expect(nodes.filter((node) => node['x-pinta-world'] === true)).toHaveLength(1)
  expect(
    nodes.some(
      (node) =>
        node.pattern === PINTA_IMAGE_WORLD_PNG_PATTERN.source &&
        node['x-pinta-pattern-flags'] === '',
    ),
  ).toBe(true)
  expect(table.worldEncodedChars).toBe(PINTA_IMAGE_WORLD_LIMITS.encodedChars)
})
