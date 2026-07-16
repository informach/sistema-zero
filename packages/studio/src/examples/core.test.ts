import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import {
  CORE_EXAMPLES,
  gorilasNaMaoExample,
  invadersNaMaoExample,
  plataformaVerticalNaMaoExample,
  portasDoCasteloNaMaoExample,
} from './core'

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

describe('CORE_EXAMPLES — plataformaVerticalNaMaoExample (plataforma 100% núcleo)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(plataformaVerticalNaMaoExample)
    expect(plataformaVerticalNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRSchema.safeParse(plataformaVerticalNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(plataformaVerticalNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa o vocabulário de física/câmera do núcleo (sem asset)', () => {
    const types = collectTypes(plataformaVerticalNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block/Platform/Player
      'funcDecl', // overlap (colisão AABB) + updateCamera + animate
      'forRange', // varre blocos/plataformas
      'requestFrame', // o laço de quadro na mão
      'canvasSetup',
      'canvasFillRect', // herói e blocos são retângulos (asset-free)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(plataformaVerticalNaMaoExample.assets ?? []).toEqual([])
    // a câmera na mão (scale + translate) sobrevive no código gerado
    const code = compileStatements(plataformaVerticalNaMaoExample.ir.js, 0)
    expect(code).toContain('ctx.scale(scale, scale)')
    expect(code).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
  })
})

describe('CORE_EXAMPLES — portasDoCasteloNaMaoExample (platformer + passagem de fase)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(portasDoCasteloNaMaoExample)
    expect(portasDoCasteloNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRSchema.safeParse(portasDoCasteloNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a física + o fade de passagem de fase na mão (globalAlpha), sem asset', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block/Player
      'funcDecl', // overlap + loadLevel + animate
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasGlobalAlpha', // o fade preto por cima, na mão (no lugar do gsap)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    expect(portasDoCasteloNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(portasDoCasteloNaMaoExample.ir.js, 0)
    expect(code).toContain('ctx.globalAlpha = fade')
    expect(code).toContain('loadLevel(nextLevel)')
  })
})
