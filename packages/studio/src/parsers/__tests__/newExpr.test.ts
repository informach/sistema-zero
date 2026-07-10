import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '#blockly'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

function collectRaw(statements: unknown[]): string[] {
  const raws: string[] = []
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>
    if (record.type === 'rawJS') raws.push(String(record.code ?? ''))
    for (const value of Object.values(record)) visit(value)
  }
  visit(statements)
  return raws
}

function roundtrip(src: string): { code: string; raws: string[] } {
  const ir = parseJS(src)
  const raws = collectRaw(ir)
  const code = generateJS({ statements: ir })
  const code2 = generateJS({ statements: parseJS(code) })
  expect(code2).toBe(code)
  return { code, raws }
}

describe('newExpr — new Classe(args) como VALOR', () => {
  it('as 4 formas do Space Invaders viram blocos (0 rawJS) e regeneram new', () => {
    const src = [
      'class Projectile { constructor() { this.free = true; } }',
      'class Player { constructor(game) { this.game = game; } }',
      'class Enemy { constructor(game, x, y) { this.game = game; } }',
      'class Game {',
      '  constructor() {',
      '    this.player = new Player(this);',
      '    this.projectilesPool = [];',
      '    this.projectilesPool.push(new Projectile());',
      '    this.enemies = [];',
      '    this.enemies.push(new Enemy(this.game, 10, 20));',
      '  }',
      '}',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('this.player = new Player(this);')
    expect(code).toContain('this.projectilesPool.push(new Projectile());')
    expect(code).toContain('this.enemies.push(new Enemy(this.game, 10, 20));')
  })

  it('const x = new C() CONTINUA sendo o statement newInstance (regressão)', () => {
    const ir = parseJS('class Cao { }\nconst rex = new Cao();')
    expect(ir.some((s) => s.type === 'newInstance')).toBe(true)
    expect(collectRaw(ir)).toEqual([])
  })

  it('Date/Image ficam FORA (fluxos próprios: agora/newImage)', () => {
    // `new Date().getFullYear()` etc. têm matchers dedicados; o argumento aqui é
    // só que o newExpr NÃO captura o construtor — os statements seguem seus
    // caminhos (raw ou matcher específico), nunca um sz_val_new de Date/Image.
    const ir = parseJS('let d = [];\nd.push(new Date());')
    const asJson = JSON.stringify(ir)
    expect(asJson).not.toContain('"newExpr"')
  })

  it('argumento não-simples derruba para raw (arrow no construtor)', () => {
    const ir = parseJS('class A { }\nlet fila = [];\nfila.push(new A(() => 1));')
    expect(collectRaw(ir).length).toBe(1)
  })

  it('IR→blocos emite sz_val_new com ARGs e extraState de itens', () => {
    const ir = parseJS(
      [
        'class Enemy { constructor(game, x) { this.game = game; } }',
        'class Game {',
        '  constructor() {',
        '    this.enemies = [];',
        '    this.enemies.push(new Enemy(this, 5));',
        '  }',
        '}',
      ].join('\n'),
    )
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: ir, extensions: [] }) as {
      blocks: { blocks: SerializedBlocklyBlock[] }
    }
    const json = JSON.stringify(state)
    expect(json).toContain('"sz_val_new"')
    expect(json).not.toContain('"sz_adv_raw_js"')
    // O bloco carrega a classe no campo e os argumentos nos ARGs.
    const find = (b: SerializedBlocklyBlock | undefined): SerializedBlocklyBlock | null => {
      if (!b) return null
      if (b.type === 'sz_val_new') return b
      for (const input of Object.values(b.inputs ?? {})) {
        const hit = find(input.block) ?? find(input.shadow)
        if (hit) return hit
      }
      return find(b.next?.block)
    }
    let found: SerializedBlocklyBlock | null = null
    for (const top of state.blocks.blocks) {
      found = find(top)
      if (found) break
    }
    expect(found?.fields?.CLASS).toBe('Enemy')
    expect(found?.extraState).toEqual({ items: 2 })
    expect(found?.inputs?.ARG0?.block?.type).toBe('sz_val_this')
    expect(found?.inputs?.ARG1?.block?.type).toBe('sz_val_number')
  })
})
