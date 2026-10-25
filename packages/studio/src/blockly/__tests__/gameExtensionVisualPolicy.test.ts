import { describe, expect, it } from 'bun:test'
import { gameTwoDToolboxCategory } from '../../official-extensions/game-2d/blocks'
import { gameKitToolboxCategory } from '../../official-extensions/game-2d-advanced/blocks'
import { gameThreeDToolboxCategory } from '../../official-extensions/game-3d/blocks'
import { gameKit3DToolboxCategory } from '../../official-extensions/game-3d-advanced/blocks'
import { isManualGameVisualBlock } from '../../official-extensions/gameVisualPolicy'
import { world3DToolboxCategory } from '../../official-extensions/world-3d/blocks'
import { buildCoreToolbox } from '../toolbox'

function types(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(types)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    key === 'type' && typeof child === 'string' ? [child] : types(child),
  )
}

describe('a extensão é dona das ferramentas visuais do jogo', () => {
  for (const id of ['game-2d', 'game-2d-advanced', 'game-3d', 'game-3d-advanced', 'world-3d']) {
    it(`${id}: continua dona do visual quando o nível esconde sua categoria`, () => {
      const offered = types(
        buildCoreToolbox([], { level: 'iniciante-2d', currentBlockTypes: [] }, [id]),
      )
      expect(offered).toContain('sz_val_number')
      expect(offered).not.toContain('sz_html_p')
      expect(offered).not.toContain('sz_css_rule')
      expect(offered.filter(isManualGameVisualBlock)).toEqual([])
    })
  }

  for (const category of [
    gameTwoDToolboxCategory,
    gameKitToolboxCategory,
    gameThreeDToolboxCategory,
    gameKit3DToolboxCategory,
    world3DToolboxCategory,
  ]) {
    it(`${category.name}: oferece programação e recursos do motor sem HTML, CSS ou Canvas`, () => {
      const offered = types(buildCoreToolbox([category], { level: 'avancado-3d' }))
      expect(offered.length).toBeGreaterThan(100)
      expect(offered).toContain('sz_val_number')
      expect(offered.filter(isManualGameVisualBlock)).toEqual([])
      expect(offered).not.toContain('sz_frame_structure')
      expect(offered).not.toContain('sz_frame_appearance')
    })
  }

  it('mantém as ferramentas da etapa manual no projeto sem extensão', () => {
    const offered = types(buildCoreToolbox([], { level: 'avancado-3d' }))
    for (const type of [
      'sz_html_canvas',
      'sz_css_rule',
      'sz_canvas_fill_rect',
      'sz_t3d_scene_create',
    ])
      expect(offered).toContain(type)
  })

  it('grants, ferramentas históricas e lista da aula não misturam as duas etapas', () => {
    const manual = [
      'sz_html_canvas',
      'sz_css_rule',
      'sz_canvas_fill_rect',
      'sz_adv_raw_js',
      'sz_js_set_style',
      'sz_js_create_element',
      'sz_js_create_element_ns',
      'sz_js_append_child',
      'sz_val_image',
      'sz_js_new_image',
      'sz_input_pointer_x',
    ]
    const offered = types(
      buildCoreToolbox([gameTwoDToolboxCategory], {
        level: 'avancado-3d',
        allowBlocks: [
          ...manual,
          'sz_g2d_create_sprite',
          'sz_frame_structure',
          'sz_frame_appearance',
        ],
        currentBlockTypes: manual,
        grantedBlockIds: [...manual, 'sz_g2d_create_sprite'],
      }),
    )
    expect(offered).toContain('sz_g2d_create_sprite')
    expect(offered.filter(isManualGameVisualBlock)).toEqual([])
    expect(offered).not.toContain('sz_frame_structure')
    expect(offered).not.toContain('sz_frame_appearance')
  })
})
