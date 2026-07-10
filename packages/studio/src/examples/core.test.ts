import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import { CORE_EXAMPLES, gorilasNaMaoExample, invadersNaMaoExample } from './core'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('CORE_EXAMPLES — gorilasNaMaoExample (na mão, sem extensão)', () => {
  it('está em CORE_EXAMPLES e não traz extensões', () => {
    expect(CORE_EXAMPLES).toContain(gorilasNaMaoExample)
    expect(gorilasNaMaoExample.ir.extensions).toEqual([])
  })

  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(gorilasNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado (rawJS/rawHTML) nem nenhum bloco g2d/g3d', () => {
    const types = collectTypes(gorilasNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa os blocos genéricos novos (SVG + estilo + modo escuro + tela cheia)', () => {
    const types = collectTypes(gorilasNaMaoExample.ir)
    for (const expected of [
      'element', // svg/g/path/circle (vetorial)
      'setStyle', // estilo por código (velocidade do moinho)
      'setProperty', // painel de HTML
      'systemDark', // cor do céu pelo modo do sistema
      'toggleFullscreen', // botão de tela cheia
      'animationLoop', // a cada quadro
      'canvasFillRect',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // o gerador produz o JS esperado (estilo do moinho, modo escuro)
    const code = compileStatements(gorilasNaMaoExample.ir.js, 0)
    expect(code).toContain('.style.animationDuration')
    expect(code).toContain("matchMedia('(prefers-color-scheme: dark)').matches")
  })
})

describe('CORE_EXAMPLES — invadersNaMaoExample (classes 100% núcleo)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(invadersNaMaoExample)
    expect(invadersNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRSchema.safeParse(invadersNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(invadersNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa o vocabulário de classes do núcleo (o contrato do lote)', () => {
    const types = collectTypes(invadersNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Player/Projectile/Enemy/Wave/Game
      'newExpr', // new Player(this) / push(new Projectile())
      'arrayFilter', // this.enemies.filter(o => !o.markedForDeletion)
      'setThisProp', // compostas expandidas (this.x = this.x - this.speed)
      'memberCallExpr', // this.game.getProjetile()… chamadas em valor
      'event', // keydown/keyup no construtor + load
      'canvasSetup',
      'animationLoop',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // O fundo estrelado embutido é PEQUENO (regra do bundle) e o CSS o referencia.
    const asset = invadersNaMaoExample.assets?.[0]
    expect(asset?.name).toBe('background.png')
    expect((asset?.dataUrl.length ?? 0) < 2_000).toBe(true)
    const css = JSON.stringify(invadersNaMaoExample.ir.css)
    expect(css).toContain("url('background.png')")
  })
})
