import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { resolveBlockLevel } from '../blockLevels'
import { CANVAS_BLOCKS, CANVAS_GROUPS } from '../blocks/canvas'
import { socketInputsFor } from '../blocks/valueSockets'
import { buildCoreToolbox } from '../toolbox'

interface BlockArg {
  type?: string
  name?: string
}

function valueInputs(definition: (typeof CANVAS_BLOCKS)[number]): string[] {
  return [definition.args0, definition.args1, definition.args2]
    .flatMap((args) => (Array.isArray(args) ? args : []))
    .filter((arg): arg is BlockArg => Boolean(arg) && typeof arg === 'object')
    .filter((arg) => arg.type === 'input_value' && typeof arg.name === 'string')
    .map((arg) => arg.name ?? '')
}

function collectToolboxTypes(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectToolboxTypes(item, output)
  } else if (value && typeof value === 'object') {
    const node = value as { kind?: string; type?: string; contents?: unknown }
    if (node.kind === 'block' && node.type) output.push(node.type)
    if (node.contents) collectToolboxTypes(node.contents, output)
  }
  return output
}

function canvasToolboxTypes(level?: LearningProfile['level']): Set<string> {
  const profile = level ? { level } : undefined
  return new Set(collectToolboxTypes(buildCoreToolbox([], profile).contents))
}

describe('Auditoria Canvas — inventário e experiência infantil', () => {
  it('mantém os 55 blocos em um único grupo cada', () => {
    expect(CANVAS_BLOCKS).toHaveLength(55)
    const grouped = CANVAS_GROUPS.flatMap((group) => group.types)
    const counts = new Map<string, number>()
    for (const type of grouped) counts.set(type, (counts.get(type) ?? 0) + 1)

    expect(
      [...counts.keys()].filter((type) => !CANVAS_BLOCKS.some((def) => def.type === type)),
    ).toEqual([])
    expect(CANVAS_BLOCKS.map((def) => def.type).filter((type) => !counts.has(type))).toEqual([])
    expect([...counts.entries()].filter(([, count]) => count !== 1)).toEqual([])
    expect(new Set(CANVAS_GROUPS.map((group) => group.name.slice(0, 2))).size).toBe(
      CANVAS_GROUPS.length,
    )
  })

  it('nenhum encaixe de valor chega vazio da paleta', () => {
    const missing: string[] = []
    for (const definition of CANVAS_BLOCKS.filter((def) => !def.hidden)) {
      const sockets = socketInputsFor(definition.type) ?? {}
      for (const name of valueInputs(definition)) {
        if (!sockets[name]) missing.push(`${definition.type}.${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('todo bloco explica o resultado sem expor código ou nomes de tag', () => {
    const missing = CANVAS_BLOCKS.filter((def) => !def.tooltip?.trim()).map((def) => def.type)
    expect(missing).toEqual([])

    const forbidden =
      /requestAnimationFrame|ctx\.|img\.|\bImage\b|\bcanvas\b|coluna de HTML|nível principal|\bframe\b/i
    const exposed = CANVAS_BLOCKS.flatMap((definition) =>
      [definition.message0, definition.message1, definition.message2, definition.tooltip]
        .filter((text): text is string => typeof text === 'string')
        .filter((text) => forbidden.test(text))
        .map((text) => `${definition.type}: ${text}`),
    )
    expect(exposed).toEqual([])
  })

  it('quebra os blocos largos em linhas confortáveis no celular', () => {
    const wideTypes = [
      'sz_canvas_fill_rect',
      'sz_canvas_rect',
      'sz_canvas_arc_to',
      'sz_canvas_stroke_rect',
      'sz_canvas_clear_rect',
      'sz_canvas_round_rect',
      'sz_canvas_ellipse',
      'sz_canvas_arc_slice',
      'sz_canvas_quadratic_curve',
      'sz_canvas_bezier_curve',
      'sz_canvas_draw_image',
      'sz_canvas_gradient',
    ]
    for (const type of wideTypes) {
      const definition = CANVAS_BLOCKS.find((def) => def.type === type)
      expect(definition?.inputsInline, type).not.toBe(true)
      expect(definition?.message1, type).toBeTruthy()
    }
  })
})

describe('Auditoria Canvas — progressão', () => {
  it('iniciante recebe o caminho mínimo completo para desenhar', () => {
    expect(resolveBlockLevel('sz_canvas_setup')).toBe('iniciante-2d')
    expect(resolveBlockLevel('sz_canvas_fill_style')).toBe('iniciante-2d')
    const beginner = canvasToolboxTypes('iniciante-2d')
    for (const type of [
      'sz_html_canvas',
      'sz_canvas_setup',
      'sz_canvas_fill_style',
      'sz_canvas_fill_rect',
      'sz_canvas_arc',
    ]) {
      expect(beginner.has(type), type).toBe(true)
    }
    expect(beginner.has('sz_canvas_arc_slice')).toBe(false)
  })

  it('ângulos em radianos ficam no intermediário e animação manual no avançado', () => {
    expect(resolveBlockLevel('sz_canvas_arc_slice')).toBe('intermediario-2d')
    expect(resolveBlockLevel('sz_canvas_request_frame')).toBe('avancado-2d')
    expect(resolveBlockLevel('sz_canvas_request_frame_do')).toBe('avancado-2d')
  })

  it('mantém o teclado legado registrado, mas fora de toda paleta', () => {
    expect(CANVAS_BLOCKS.find((def) => def.type === 'sz_canvas_keyboard')?.hidden).toBe(true)
    for (const level of ['iniciante-2d', 'intermediario-2d', 'avancado-3d'] as const) {
      expect(canvasToolboxTypes(level).has('sz_canvas_keyboard')).toBe(false)
    }
  })
})
