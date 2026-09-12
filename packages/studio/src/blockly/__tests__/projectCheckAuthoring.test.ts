import { describe, expect, test } from 'bun:test'
import { defaultLessonSection, type SectionStructureRule } from '@sistemazero/core/learning'
import {
  evaluateStudioProjectStructure,
  projectCheckAuthoring,
  studioSectionCompletionIssues,
} from '../projectCheckAuthoring'

const workspace = {
  kind: 'studio',
  purpose: 'experiment',
  initialProject: { installedExtensions: [{ id: 'game-2d' }] },
  allowBlocks: ['sz_g2d_setup_stage', 'sz_g2d_create_sprite', 'sz_val_number'],
}
const stage = { type: 'usesBlock', blockType: 'sz_g2d_setup_stage' } as const

describe('objective authoring uses the actual workspace contracts', () => {
  test('offers only valid areas and containers for start-only setup', () => {
    const model = projectCheckAuthoring(workspace)
    expect(model.areas(stage)).toEqual(['start'])
    expect(model.containers(stage)).toEqual([])
    expect(model.issues({ ...stage, area: 'start', inputs: { W: 480, H: 320 } })).toEqual([])
  })
  const invalidRules: SectionStructureRule[] = [
    { ...stage, area: 'appearance' },
    { ...stage, withinBlock: 'sz_g2d_create_sprite' },
    { ...stage, blockType: 'sz_unknown' },
    { ...stage, blockType: 'sz_js_repeat' },
    { ...stage, inputs: { WIDTH_DOES_NOT_EXIST: 480 } },
    { ...stage, fields: { W: 480 } },
    { type: 'usesBlock', blockType: 'sz_val_number', fields: { NUM: 'not a number' } },
  ]
  test.each(invalidRules)('publication refuses an impossible criterion: %j', (rule) => {
    const section = {
      ...defaultLessonSection('section', 'Praticar', []),
      workspaceBlockId: 'workspace',
      completion: {
        version: 1 as const,
        blockIds: [],
        projectChecks: [{ id: 'check', label: 'Preparar', rule }],
      },
    }
    expect(
      studioSectionCompletionIssues([section], [{ id: 'workspace', content: workspace }]).length,
    ).toBeGreaterThan(0)
  })
  test('requires the installed extension and an editable block mode', () => {
    expect(
      projectCheckAuthoring({ ...workspace, initialProject: {} }).issues(stage).length,
    ).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...workspace, initialProject: { kind: 'pro' } }).issues(stage).length,
    ).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...workspace, allowedModes: ['code'] }).issues(stage).length,
    ).toBeGreaterThan(0)
  })
  test('semantic objectives also require blocks that can express them', () => {
    expect(projectCheckAuthoring(workspace).issues({ type: 'usesLoop' }).length).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...workspace, allowBlocks: ['sz_js_repeat'] }).issues({
        type: 'usesLoop',
      }),
    ).toEqual([])
  })
  test('evaluates active nonliteral value shadows from the actual catalog', () => {
    const variable = { type: 'sz_val_variable', fields: { NAME: 'pontos' } }
    const project = (input: unknown) => ({
      blocksState: {
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: { block: { type: 'sz_js_alert_var', inputs: { VALUE: input } } },
              },
            },
          ],
        },
      },
    })
    const rule = {
      type: 'usesBlock' as const,
      blockType: variable.type,
      fields: { NAME: 'pontos' },
    }
    expect(evaluateStudioProjectStructure(rule, project({ shadow: variable }))).toBe(true)
    expect(
      evaluateStudioProjectStructure(
        rule,
        project({ shadow: variable, block: { type: 'sz_val_number', fields: { NUM: 1 } } }),
      ),
    ).toBe(false)
    expect(
      evaluateStudioProjectStructure(rule, project({ shadow: { ...variable, disabled: true } })),
    ).toBe(false)
    expect(
      evaluateStudioProjectStructure(
        { type: 'usesBlock', blockType: 'sz_g2d_create_sprite' },
        project({ shadow: { type: 'sz_g2d_create_sprite' } }),
      ),
    ).toBe(false)
  })
  test('allows a number within a connected stage input, not a stage within a value', () => {
    const model = projectCheckAuthoring(workspace)
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_val_number',
        withinBlock: 'sz_g2d_setup_stage',
        area: 'start',
        fields: { NUM: 480 },
      }),
    ).toEqual([])
    expect(model.issues({ ...stage, withinBlock: 'sz_val_number' }).length).toBeGreaterThan(0)
  })
  test('honors the fixed level without revealing advanced blocks', () => {
    expect(
      projectCheckAuthoring({
        initialProject: {},
        level: 'iniciante-2d',
        allowLevelReveal: false,
      }).available.some((block) => block.type === 'sz_js_class'),
    ).toBe(false)
  })
})
