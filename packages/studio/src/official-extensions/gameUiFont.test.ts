import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from './game-2d/runtime'
import { gameKitRuntime } from './game-2d-advanced/runtime'
import { gameKit3DRuntime } from './game-3d-advanced/runtime'
import { GAME_UI_FONT_CSS, GAME_UI_FONT_FAMILY, gameUIFontBootstrapRuntime } from './gameUiFont'
import { world3DRuntime } from './world-3d/runtime'

describe('fonte local das interfaces automáticas de jogos', () => {
  it('incorpora Baloo 2 sem depender de rede', () => {
    expect(GAME_UI_FONT_FAMILY).toContain('Baloo 2')
    expect(GAME_UI_FONT_CSS).toContain('@font-face')
    expect(GAME_UI_FONT_CSS).toContain('data:font/woff2;base64,')
    expect(GAME_UI_FONT_CSS).not.toMatch(/https?:\/\//)
    expect(GAME_UI_FONT_CSS.length).toBeLessThan(50_000)
  })

  it('só toca no DOM quando o documento fica pronto e instala o estilo uma vez', () => {
    let onReady: (() => void) | undefined
    const win: Record<string, unknown> = {
      addEventListener(event: string, handler: () => void) {
        if (event === 'DOMContentLoaded') onReady = handler
      },
    }

    expect(() => new Function('window', gameUIFontBootstrapRuntime)(win)).not.toThrow()
    expect(onReady).toBeFunction()

    const appended: Array<{ textContent: string }> = []
    const doc = {
      head: { appendChild: (style: { textContent: string }) => appended.push(style) },
      querySelector: () => (appended.length > 0 ? appended[0] : null),
      createElement: () => ({ textContent: '', setAttribute() {} }),
    }
    win.document = doc

    onReady?.()
    ;(win.SZGameUIFont as { install: () => void }).install()

    expect(appended).toHaveLength(1)
    expect(appended[0]?.textContent).toBe(GAME_UI_FONT_CSS)
  })

  it('mantém o import ESM na primeira linha e entrega o token às quatro extensões', () => {
    expect(gameKit3DRuntime).toMatch(/^import \* as THREE from 'three';/)
    expect(world3DRuntime).toMatch(/^import \* as THREE from 'three';/)

    for (const runtime of [gameTwoDRuntime, gameKitRuntime, gameKit3DRuntime, world3DRuntime]) {
      expect(runtime).toContain('window.SZGameUIFont')
      expect(runtime).toContain('window.SZGameUIFont = { family: family, install: install }')
      expect(runtime).toContain('--sz-game-ui-font:')
    }
    expect(gameKitRuntime).toContain('font-family: var(--sz-game-ui-font)')
    expect(gameKit3DRuntime).toContain('font-family: var(--sz-game-ui-font)')
    expect(world3DRuntime).toContain('font-family:var(--sz-game-ui-font)')
  })
})
