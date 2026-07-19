import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import { G2D_SOCKET_SHADOW_TYPES } from '../../official-extensions/game-2d/blocks'
import { GK_SOCKET_SHADOW_TYPES } from '../../official-extensions/game-2d-advanced/blocks'
import { G3D_SOCKET_SHADOW_TYPES } from '../../official-extensions/game-3d/blocks'
import { G3K_SOCKET_SHADOW_TYPES } from '../../official-extensions/game-3d-advanced/blocks'
import { LEGACY_VALUE_FIELDS, restoreShadowLiterals } from '../migrateValueFields'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '../workspaceState'

const KIND_BY_LITERAL: Record<string, 'number' | 'text' | 'color'> = {
  sz_val_number: 'number',
  sz_val_text: 'text',
  sz_val_color: 'color',
}

describe('restoreShadowLiterals — cura literais que perderam a shadow-ness', () => {
  const num = (value: number) => ({ type: 'sz_val_number', fields: { NUM: value } })

  it('promove {block: literal} a {shadow: literal} em soquete com preset', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_g2d_animate_sprite',
            fields: { SPRITE: 'heroi', SHEET: 'andar', ANIM: '— escolher —' },
            inputs: {
              FROM: { block: num(0) },
              TO: { block: num(3) },
              FPS: { block: num(8) },
            },
          },
        ],
      },
    }
    const healed = restoreShadowLiterals(state) as typeof state
    expect(healed).not.toBe(state)
    const inputs = healed.blocks.blocks[0]?.inputs as Record<
      string,
      { block?: unknown; shadow?: unknown }
    >
    for (const slot of ['FROM', 'TO', 'FPS']) {
      expect(inputs[slot]?.shadow).toMatchObject({ type: 'sz_val_number' })
      expect(inputs[slot]?.block).toBeUndefined()
    }
    // Valores preservados byte a byte.
    expect(inputs.FROM?.shadow).toMatchObject({ fields: { NUM: 0 } })
    expect(inputs.TO?.shadow).toMatchObject({ fields: { NUM: 3 } })
  })

  it('NUNCA converte variável/expressão nem soquete fora do preset', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_g2d_animate_sprite',
            inputs: {
              // Variável plugada de propósito: escolha da criança.
              FROM: { block: { type: 'sz_val_variable', fields: { NAME: 'inicio' } } },
              // Literal já com sombra por baixo: encaixe real é escolha, não mexe.
              TO: { shadow: num(3), block: num(9) },
            },
          },
          {
            // Bloco sem preset: literal em soquete qualquer fica como está.
            type: 'sz_js_console_log_text',
            inputs: { VALUE: { block: { type: 'sz_val_text', fields: { TEXT: 'oi' } } } },
          },
        ],
      },
    }
    expect(restoreShadowLiterals(state)).toBe(state)
  })

  it('é idempotente e desce em inputs/next aninhados', () => {
    const nested = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_behavior',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_g2d_load_spritesheet',
                  fields: { NAME: 'andar', IMAGE: 'heroi' },
                  inputs: { FW: { block: num(32) }, FH: { block: num(32) } },
                  next: {
                    block: {
                      type: 'sz_g2d_set_position',
                      inputs: { X: { block: num(10) }, Y: { block: num(20) } },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }
    const once = restoreShadowLiterals(nested)
    expect(once).not.toBe(nested)
    const twice = restoreShadowLiterals(once)
    expect(twice).toBe(once)
    const loader = (
      once as {
        blocks: { blocks: Array<{ inputs: { CHILDREN: { block: Record<string, unknown> } } }> }
      }
    ).blocks.blocks[0]?.inputs.CHILDREN.block as {
      inputs: Record<string, { shadow?: unknown }>
      next: { block: { inputs: Record<string, { shadow?: unknown }> } }
    }
    expect(loader.inputs.FW?.shadow).toBeDefined()
    expect(loader.inputs.FH?.shadow).toBeDefined()
    expect(loader.next.block.inputs.X?.shadow).toBeDefined()
    expect(loader.next.block.inputs.Y?.shadow).toBeDefined()
  })
})

describe('IR→blocos emite SOMBRA em soquete com preset (fim do no-op pós-Ponte)', () => {
  it('literais de FROM/TO/FPS e FW/FH voltam como {shadow}; variável fica {block}', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      js: [
        {
          type: 'g2d:loadSpritesheet',
          varName: 'andar',
          image: 'heroi-sheet',
          frameW: { type: 'num', value: 32 },
          frameH: { type: 'num', value: 32 },
        },
        {
          type: 'g2d:animateSprite',
          spriteVar: 'heroi',
          sheetVar: 'andar',
          from: { type: 'num', value: 0 },
          to: { type: 'num', value: 3 },
          // Variável plugada de propósito: NÃO pode virar sombra.
          fps: { type: 'var', name: 'velocidade' },
        },
      ],
    }
    const state = buildWorkspaceStateFromIR(ir) as {
      blocks: { blocks: SerializedBlocklyBlock[] }
    }
    const start = state.blocks.blocks.find((b) => b.type === 'sz_frame_start')
    const loader = start?.inputs?.CHILDREN?.block
    expect(loader?.type).toBe('sz_g2d_load_spritesheet')
    expect(loader?.inputs?.FW?.shadow).toMatchObject({ type: 'sz_val_number' })
    expect(loader?.inputs?.FH?.shadow).toMatchObject({ type: 'sz_val_number' })
    expect(loader?.inputs?.FW?.block).toBeUndefined()

    const animate = loader?.next?.block
    expect(animate?.type).toBe('sz_g2d_animate_sprite')
    expect(animate?.inputs?.FROM?.shadow).toMatchObject({
      type: 'sz_val_number',
      fields: { NUM: 0 },
    })
    expect(animate?.inputs?.TO?.shadow).toMatchObject({ type: 'sz_val_number', fields: { NUM: 3 } })
    expect(animate?.inputs?.FPS?.block).toMatchObject({ type: 'sz_val_variable' })
    expect(animate?.inputs?.FPS?.shadow).toBeUndefined()
  })

  it('soquete SEM preset segue emitindo {block} (nada além dos presets muda)', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [],
      js: [{ type: 'assign', name: 'pontos', value: { type: 'num', value: 10 } }],
    }
    const state = buildWorkspaceStateFromIR(ir) as {
      blocks: { blocks: SerializedBlocklyBlock[] }
    }
    const start = state.blocks.blocks.find((b) => b.type === 'sz_frame_start')
    const assign = start?.inputs?.CHILDREN?.block
    expect(assign?.inputs?.VALUE?.block).toMatchObject({ type: 'sz_val_number' })
    expect(assign?.inputs?.VALUE?.shadow).toBeUndefined()
  })
})

describe('drift: presets de sombra das extensões × LEGACY_VALUE_FIELDS', () => {
  // Todo soquete com sombra na PALETA precisa constar no mapa que restaura a
  // shadow-ness (emissor IR→blocos + cura no load). Faltar = depois de uma
  // passada pela Ponte o literal vira bloco real e os preenchimentos
  // automáticos (fillFrames/applySuggestedSize) morrem em silêncio.
  const cases: Array<[string, Record<string, Record<string, string>>]> = [
    ['game-2d', G2D_SOCKET_SHADOW_TYPES],
    ['game-2d-advanced', GK_SOCKET_SHADOW_TYPES],
    ['game-3d', G3D_SOCKET_SHADOW_TYPES],
    ['game-3d-advanced', G3K_SOCKET_SHADOW_TYPES],
  ]
  for (const [label, map] of cases) {
    it(`todo soquete de sombra do ${label} está em LEGACY_VALUE_FIELDS com o kind casado`, () => {
      const missing: string[] = []
      for (const [type, slots] of Object.entries(map)) {
        for (const [slot, literalType] of Object.entries(slots)) {
          const kind = KIND_BY_LITERAL[literalType]
          if (!kind) continue // sombra exótica (não literal simples) não participa
          if (LEGACY_VALUE_FIELDS[type]?.[slot] !== kind) {
            missing.push(`${type}.${slot} (${kind})`)
          }
        }
      }
      expect(missing).toEqual([])
    })
  }
})
