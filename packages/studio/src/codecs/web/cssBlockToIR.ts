import type * as Blockly from 'blockly/core'
import type { CSSDeclarations, CSSEntry } from '#ir'
import { cssDeclarationEntries } from '#ir'
import { normalizeCSSTransitionProperty } from '../../css/motion'

export const SHADOW_PRESETS = {
  sm: '0 1px 3px rgba(0,0,0,0.2)',
  md: '0 4px 12px rgba(0,0,0,0.25)',
  lg: '0 10px 30px rgba(0,0,0,0.35)',
} as const

interface CSSDeclarationsResult {
  declarations: CSSDeclarations
  declIds: Record<string, string>
}

export interface CSSBlockToIRContext {
  field(block: Blockly.Block, name: string): string
  numberField(block: Blockly.Block, name: string, fallback?: number): number
  declarations(block: Blockly.Block, name: string): CSSDeclarationsResult
  entries(block: Blockly.Block, name: string, seen: Set<string>): CSSEntry[]
  keyframeSteps(
    block: Blockly.Block,
    name: string,
  ): Array<{ at: string; declarations: CSSDeclarations }>
}

export type CSSBlockToIRResult = { kind: 'css'; value: CSSEntry }

export function cssBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  context: CSSBlockToIRContext,
): CSSBlockToIRResult | null {
  const f = context.field
  const fn = context.numberField
  const getCssDeclarations = context.declarations
  const getCssEntryChildren = context.entries
  const getKeyframeSteps = context.keyframeSteps
  switch (block.type) {
    // ---- CSS ----
    case 'sz_css_body_background':
      return {
        kind: 'css',
        value: { selector: 'body', declarations: { background: f(block, 'COLOR') } },
      }
    case 'sz_css_body_text_color':
      return {
        kind: 'css',
        value: { selector: 'body', declarations: { color: f(block, 'COLOR') } },
      }
    case 'sz_css_body_center':
      return {
        kind: 'css',
        value: {
          selector: 'body',
          declarations: {
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            'min-height': '100vh',
            margin: '0',
          },
        },
      }
    case 'sz_css_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { width: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_height':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { height: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_fill':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { fill: f(block, 'VALUE') } },
      }
    case 'sz_css_stroke':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { stroke: f(block, 'VALUE') } },
      }
    case 'sz_css_stroke_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-width': `${fn(block, 'VALUE')}` },
        },
      }
    case 'sz_css_stroke_dasharray':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-dasharray': f(block, 'VALUE') },
        },
      }
    case 'sz_css_stroke_linecap':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-linecap': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_anchor':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-anchor': f(block, 'VALUE') },
        },
      }
    case 'sz_css_border':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { border: `${fn(block, 'WIDTH')}px solid ${f(block, 'COLOR')}` },
        },
      }
    case 'sz_css_padding':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { padding: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_margin':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { margin: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_display_flex':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { display: 'flex', 'flex-direction': f(block, 'DIR') },
        },
      }
    case 'sz_css_gap':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { gap: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_justify':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'justify-content': f(block, 'VALUE') },
        },
      }
    case 'sz_css_align':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'align-items': f(block, 'VALUE') },
        },
      }
    case 'sz_css_font_size':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'font-size': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_font_weight':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'font-weight': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_align':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-align': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_color':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { color: f(block, 'COLOR') },
        },
      }
    case 'sz_css_text_transform':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-transform': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_decoration':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-decoration': f(block, 'VALUE') },
        },
      }
    case 'sz_css_letter_spacing':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'letter-spacing': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_background_color':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'background-color': f(block, 'COLOR') },
        },
      }
    case 'sz_css_gradient':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            background: `linear-gradient(135deg, ${f(block, 'C1')}, ${f(block, 'C2')})`,
          },
        },
      }
    case 'sz_css_border_radius':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'border-radius': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_shadow':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            'box-shadow':
              SHADOW_PRESETS[f(block, 'LEVEL') as keyof typeof SHADOW_PRESETS] ?? SHADOW_PRESETS.md,
          },
        },
      }
    case 'sz_css_max_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'max-width': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_width_percent':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { width: `${fn(block, 'VALUE')}%` },
        },
      }
    case 'sz_css_rule': {
      const { declarations, declIds } = getCssDeclarations(block, 'CHILDREN')
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations,
          ...(Array.isArray(declarations) || Object.keys(declIds).length === 0
            ? {}
            : { __declIds: declIds }),
        },
      }
    }
    case 'sz_css_google_font':
      return { kind: 'css', value: { type: 'googleFont', family: f(block, 'FONT') || 'Roboto' } }
    case 'sz_css_use_font': {
      const family = f(block, 'FONT').trim() || 'Roboto'
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'font-family': `${JSON.stringify(family)}, sans-serif` },
        },
      }
    }
    case 'sz_css_media_query':
      return {
        kind: 'css',
        value: {
          type: 'mediaQuery',
          feature:
            f(block, 'DIR') === 'min-width' ||
            f(block, 'DIR') === 'max-height' ||
            f(block, 'DIR') === 'min-height'
              ? (f(block, 'DIR') as 'min-width' | 'max-height' | 'min-height')
              : 'max-width',
          px: fn(block, 'PX', 768),
          rules: getCssEntryChildren(block, 'RULES', seen),
        },
      }
    case 'sz_css_transition':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            transition: `${normalizeCSSTransitionProperty(f(block, 'PROPERTY'))} ${fn(block, 'MS', 300)}ms ease`,
          },
        },
      }
    case 'sz_css_reduce_motion':
      return {
        kind: 'css',
        value: {
          type: 'mediaQuery',
          feature: 'prefers-reduced-motion',
          rules: [
            {
              selector: f(block, 'SELECTOR'),
              declarations: { animation: 'none', transition: 'none' },
            },
          ],
        },
      }
    case 'sz_css_hover': {
      const { declarations, declIds } = getCssDeclarations(block, 'CHILDREN')
      return {
        kind: 'css',
        value: {
          selector: `${f(block, 'SELECTOR')}:hover`,
          declarations,
          ...(Array.isArray(declarations) || Object.keys(declIds).length === 0
            ? {}
            : { __declIds: declIds }),
        },
      }
    }
    case 'sz_css_grid':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            display: 'grid',
            'grid-template-columns': `repeat(${fn(block, 'COLS', 3)}, 1fr)`,
            gap: `${fn(block, 'GAP', 16)}px`,
          },
        },
      }
    case 'sz_css_keyframes': {
      const from = getCssDeclarations(block, 'FROM').declarations
      const to = getCssDeclarations(block, 'TO').declarations
      const steps: Array<{ at: string; declarations: CSSDeclarations }> = []
      if (cssDeclarationEntries(from).length > 0) steps.push({ at: 'from', declarations: from })
      if (cssDeclarationEntries(to).length > 0) steps.push({ at: 'to', declarations: to })
      return {
        kind: 'css',
        value: { type: 'keyframes', name: f(block, 'NAME') || 'animacao', steps },
      }
    }
    case 'sz_css_keyframes_steps':
      return {
        kind: 'css',
        value: {
          type: 'keyframes',
          name: f(block, 'NAME') || 'animacao',
          steps: getKeyframeSteps(block, 'STEPS'),
        },
      }
    case 'sz_css_apply_animation': {
      const seconds = Math.max(0.1, fn(block, 'SECONDS', 1))
      const repeat = f(block, 'REPEAT') === 'infinite' ? 'infinite' : '1'
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            animation: `${f(block, 'NAME').trim() || 'pulsar'} ${seconds}s ease-in-out ${repeat}`,
          },
        },
      }
    }
    case 'sz_css_keyframe_step':
      // Só faz sentido dentro de "animação (vários passos)" (coletado por getKeyframeSteps).
      return null
    case 'sz_css_var':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR') || ':root',
          declarations: {
            [`--${f(block, 'VARNAME').replace(/^-+/, '') || 'cor'}`]: f(block, 'VALUE'),
          },
        },
      }
    case 'sz_css_transform':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { transform: f(block, 'VALUE') } },
      }
    case 'sz_css_perspective':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { perspective: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_grid_template': {
      const cols = f(block, 'COLS')
      const rows = f(block, 'ROWS')
      const declarations: Record<string, string> = { display: 'grid' }
      if (cols) declarations['grid-template-columns'] = cols
      if (rows) declarations['grid-template-rows'] = rows
      return { kind: 'css', value: { selector: f(block, 'SELECTOR'), declarations } }
    }
    // ---- 🎮 Posição & jogo (IR genérica de CSSRule; o round-trip volta ao bloco
    // dedicado pelo cssEntryToBlocks do workspaceState) ----
    case 'sz_css_position':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { position: f(block, 'VALUE') } },
      }
    case 'sz_css_offset':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { [f(block, 'SIDE')]: f(block, 'VALUE') },
        },
      }
    case 'sz_css_display':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { display: f(block, 'VALUE') } },
      }
    case 'sz_css_overflow':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { overflow: f(block, 'VALUE') } },
      }
    case 'sz_css_cursor':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { cursor: f(block, 'VALUE') } },
      }
    case 'sz_css_image_rendering':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'image-rendering': f(block, 'VALUE') },
        },
      }
    case 'sz_css_object_fit':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'object-fit': f(block, 'VALUE') },
        },
      }
    case 'sz_css_opacity':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { opacity: f(block, 'VALUE') } },
      }
    case 'sz_css_z_index':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'z-index': `${fn(block, 'VALUE')}` },
        },
      }
    case 'sz_css_background_image':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'background-image': `url('${f(block, 'URL')}')` },
        },
      }
    case 'sz_css_decl':
      // Só faz sentido como filho de uma "Regra CSS" (coletado por
      // getCssDeclarations); solto no topo é ignorado.
      return null
    case 'sz_css_comment':
      return { kind: 'css', value: { type: 'comment', text: f(block, 'TEXT') } }

    default:
      return null
  }
}
