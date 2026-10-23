import { expect, test } from 'bun:test'
import { isBlockTypeAllowed, type LearningProfile } from '../../core/levels'
import {
  blockedDynamicSearchTypes,
  classCategoryBlockTypes,
  dynamicCategoryBlockTypes,
  functionCategoryBlockTypes,
} from '../paramsFlyout'
import { buildCoreToolbox, type ToolboxCategory } from '../toolbox'

function types(contents: readonly unknown[]): string[] {
  return contents.flatMap((value) => {
    const entry = value as { kind?: string; type?: string; contents?: readonly unknown[] }
    return [
      ...(entry.kind === 'block' && entry.type ? [entry.type] : []),
      ...(entry.contents ? types(entry.contents) : []),
    ]
  })
}
const extension: ToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: '#ec4899',
  contents: [
    { kind: 'block', type: 'sz_g2d_create_sprite' },
    { kind: 'block', type: 'sz_g2d_move_sprite' },
  ],
}

test('an empty course ceiling offers no JavaScript, including installed extensions and project tools', () => {
  const profile: LearningProfile = {
    level: 'avancado-3d',
    grantedBlockIds: [],
    allowBlocks: [],
    allowCategories: ['Classes', 'Funções'],
    revealed: true,
    currentBlockTypes: ['sz_js_class', 'sz_g2d_move_sprite'],
    projectTools: ['sz_js_class'],
  }
  expect(types(buildCoreToolbox([extension], profile).contents)).toEqual([])
  expect(functionCategoryBlockTypes(profile)).toEqual([])
  expect(classCategoryBlockTypes(profile)).toEqual([])
  expect(blockedDynamicSearchTypes(profile).size).toBe(new Set(dynamicCategoryBlockTypes()).size)
})

test('the course ceiling intersects curation and cannot be widened by existing project blocks', () => {
  const profile: LearningProfile = {
    level: 'avancado-3d',
    grantedBlockIds: ['sz_g2d_create_sprite'],
    allowBlocks: ['sz_g2d_create_sprite', 'sz_g2d_move_sprite'],
    currentBlockTypes: ['sz_g2d_move_sprite'],
  }
  const offered = types(buildCoreToolbox([extension], profile).contents)
  expect(offered).toContain('sz_g2d_create_sprite')
  expect(offered).not.toContain('sz_g2d_move_sprite')
  expect(offered.filter((id) => !id.startsWith('sz_frame_'))).toEqual(['sz_g2d_create_sprite'])
  expect(classCategoryBlockTypes(profile)).toEqual([])
})

test('dynamic search uses the same grant ceiling even when categories reveal advanced tools', () => {
  const profile: LearningProfile = {
    level: 'iniciante-2d',
    allowCategories: ['Classes', 'Funções'],
    grantedBlockIds: ['sz_js_class'],
  }
  expect(classCategoryBlockTypes(profile)).toEqual(['sz_js_class'])
  expect(JSON.stringify(buildCoreToolbox([], profile).contents)).toContain('"custom":"SZ_CLASSES"')
  expect(functionCategoryBlockTypes(profile)).toEqual([])
  const blocked = blockedDynamicSearchTypes(profile)
  expect(blocked.has('sz_js_class')).toBe(false)
  expect(blocked.has('sz_js_class_method')).toBe(true)
})

test('course grants do not replace level curation; lesson empty lists and unrestricted admin stay unchanged', () => {
  expect(
    isBlockTypeAllowed('sz_js_class', 'avancado-2d', {
      level: 'iniciante-2d',
      grantedBlockIds: ['sz_js_class'],
    }),
  ).toBe(false)
  expect(
    isBlockTypeAllowed('sz_js_class', 'avancado-2d', {
      level: 'avancado-3d',
      allowBlocks: [],
    }),
  ).toBe(true)
  expect(
    types(buildCoreToolbox([extension], { level: 'avancado-3d' }).contents).length,
  ).toBeGreaterThan(0)
})
