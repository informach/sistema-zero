import { describe, expect, it } from 'bun:test'
import { normalizeSZIR, splitLegacyBehavior } from '../behavior'
import type { JSStatement, SZIR } from '../schema'
import { SZIRV2Schema } from '../schema'

const log = (text: string): JSStatement => ({
  type: 'consoleLog',
  value: { type: 'str', value: text },
})

describe('IR de comportamento v2', () => {
  it('separa início, eventos e loops e remove boot manual', () => {
    const behavior = splitLegacyBehavior([
      log('preparar'),
      { type: 'event', target: 'botao', event: 'click', body: [log('clicou')] },
      { type: 'animationLoop', body: [log('quadro')] },
      { type: 'gk:start' },
    ])

    expect(behavior.start.map((statement) => statement.type)).toEqual(['consoleLog'])
    expect(behavior.events.map((statement) => statement.type)).toEqual(['event'])
    expect(behavior.loops.map((statement) => statement.type)).toEqual(['animationLoop'])
  })

  it('desembrulha início antigo e load sem perder os filhos', () => {
    const behavior = splitLegacyBehavior([
      {
        type: 'g2d:onStart',
        body: [
          log('criar'),
          { type: 'g2d:onKey', key: 'Enter', body: [log('tecla')] },
          { type: 'g2d:updateEachFrame', body: [log('mover')] },
        ],
      },
      { type: 'event', targetKind: 'window', target: 'window', event: 'load', body: [log('dom')] },
    ])

    expect(behavior.start.map((statement) => statement.type)).toEqual(['consoleLog', 'consoleLog'])
    expect(behavior.events.map((statement) => statement.type)).toEqual(['g2d:onKey'])
    expect(behavior.loops.map((statement) => statement.type)).toEqual(['g2d:updateEachFrame'])
  })

  it('desembrulha window.load legado mesmo quando targetKind ainda não existia', () => {
    const behavior = splitLegacyBehavior([
      { type: 'event', target: 'window', event: 'load', body: [log('dom antigo')] },
    ])

    expect(behavior.start).toEqual([log('dom antigo')])
    expect(behavior.events).toEqual([])
    expect(behavior.loops).toEqual([])
  })

  it('não confunde um elemento chamado window nem document.load com o load global legado', () => {
    const elementLoad: JSStatement = {
      type: 'event',
      targetKind: 'id',
      target: 'window',
      event: 'load',
      body: [log('elemento')],
    }
    const documentLoad: JSStatement = {
      type: 'event',
      target: 'document',
      event: 'load',
      body: [log('documento')],
    }
    const behavior = splitLegacyBehavior([elementLoad, documentLoad])

    expect(behavior.start).toEqual([])
    expect(behavior.events).toEqual([elementLoad, documentLoad])
    expect(behavior.loops).toEqual([])
  })

  it('eleva repetições periódicas diretas para raízes independentes', () => {
    const behavior = splitLegacyBehavior([
      {
        type: 'g2d:updateEachFrame',
        body: [
          log('sempre'),
          { type: 'g2d:everyFrames', n: { type: 'num', value: 10 }, body: [log('dez')] },
        ],
      },
    ])

    expect(behavior.loops.map((statement) => statement.type)).toEqual([
      'g2d:everyFrames',
      'g2d:updateEachFrame',
    ])
    expect((behavior.loops[1] as { body: JSStatement[] }).body).toEqual([log('sempre')])
  })

  it('normaliza legado sem criar duas fontes de comportamento', () => {
    const legacy: SZIR = { html: [], css: [], js: [log('oi')], extensions: [] }
    const normalized = normalizeSZIR(legacy)
    expect(normalized.version).toBe(2)
    expect(normalized.behavior.start).toEqual(legacy.js)
    expect('js' in normalized).toBe(false)
  })

  it('distingue eventos de comandos cujo nome contém “On”', () => {
    const behavior = splitLegacyBehavior([
      { type: 'gk:keepOnScreen', charVar: 'heroi' },
      { type: 'gk:bounceOnEdges', charVar: 'heroi' },
      { type: 'gk:leanOnMove', charVar: 'heroi', degrees: 8 },
      { type: 'gk:rpgOnStep', cx: 1, cy: 2, body: [log('entrou')] },
    ])

    expect(behavior.start.map((statement) => statement.type)).toEqual([
      'gk:keepOnScreen',
      'gk:bounceOnEdges',
      'gk:leanOnMove',
    ])
    expect(behavior.events.map((statement) => statement.type)).toEqual(['gk:rpgOnStep'])
  })

  it('recusa raízes na área errada e construções antigas no IR v2', () => {
    const result = SZIRV2Schema.safeParse({
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [{ type: 'gk:start' }],
        events: [{ type: 'consoleLog', value: { type: 'str', value: 'fora' } }],
        loops: [{ type: 'g2d:onKey', key: 'Enter', body: [] }],
      },
      extensions: [],
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.slice(0, 3))).toEqual([
      ['behavior', 'start', 0],
      ['behavior', 'events', 0],
      ['behavior', 'loops', 0],
    ])
  })
})
