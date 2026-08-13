import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from './game-2d/runtime'
import { gameKitRuntime } from './game-2d-advanced/runtime'
import { gameKit3DRuntime } from './game-3d-advanced/runtime'
import {
  DEFAULT_GAME_UI_FONT,
  GAME_UI_FONT_IDS,
  GAME_UI_FONTS,
  gameUiFontBootstrapScript,
  loadGameUiFont,
} from './gameUiFont'
import { resolveGameUiFontId } from './gameUiFonts/resolve'
import { world3DRuntime } from './world-3d/runtime'

describe('fonte local das interfaces automáticas de jogos', () => {
  it('as cinco fontes existem, são locais e trazem os acentos do português', async () => {
    expect(GAME_UI_FONT_IDS).toHaveLength(5)
    for (const id of GAME_UI_FONT_IDS) {
      const fonte = await loadGameUiFont(id)
      expect(`${id}: ${fonte.css.includes('@font-face')}`).toBe(`${id}: true`)
      expect(`${id}: ${fonte.css.includes('data:font/woff2;base64,')}`).toBe(`${id}: true`)
      // ⚠️ Sem rede: o perfil `strict` da CSP (o do player público do Mural) bloqueia
      // `font-src https:` E `style-src https:`. Uma fonte de CDN funcionaria no
      // editor e falharia em silêncio na página de jogar.
      expect(`${id}: ${/https?:\/\//.test(fonte.css)}`).toBe(`${id}: false`)
      // O subset latino tem que declarar U+0000-00FF — é onde vivem á, ã, ç, é, õ.
      expect(`${id}: ${fonte.css.includes('U+0000-00FF')}`).toBe(`${id}: true`)
      expect(fonte.family).toBe(GAME_UI_FONTS[id].family)
    }
  })

  it('⭐ carregar UMA fonte não traz nenhuma das outras quatro', async () => {
    // É a razão de existir de todo o desenho: cinco fontes embutidas somariam ~170 KB
    // em cada jogo exportado, e o teto do arquivo antigo (50 000 chars) já não caberia.
    for (const id of GAME_UI_FONT_IDS) {
      const fonte = await loadGameUiFont(id)
      expect(fonte.css.split('@font-face').length - 1).toBe(1)
      for (const outra of GAME_UI_FONT_IDS) {
        if (outra === id) continue
        const marca = `font-family:"${GAME_UI_FONTS[outra].label}"`
        expect(`${id} sem ${outra}: ${fonte.css.includes(marca)}`).toBe(`${id} sem ${outra}: false`)
      }
    }
  })

  it('⚠️ fonte ESTÁTICA declara a faixa inteira de peso, para o negrito não ser sintetizado', async () => {
    // Os runtimes pedem `bold` em 34 lugares. Uma face que só tem o peso 400 faz o
    // navegador engrossar por deslocamento — e numa fonte de PIXEL isso vira borrão.
    // `font-synthesis` não resolveria: é propriedade de elemento, e texto de canvas
    // não tem elemento.
    for (const id of ['pressStart2P', 'bungee'] as const) {
      const fonte = await loadGameUiFont(id)
      expect(`${id}: ${fonte.css.includes('font-weight:100 900')}`).toBe(`${id}: true`)
    }
    // A variável mantém a faixa real que o Google declara.
    const baloo = await loadGameUiFont('baloo2')
    expect(baloo.css).toContain('font-weight:400 800')
  })

  it('id desconhecido cai no padrão em vez de quebrar o jogo', async () => {
    const fonte = await loadGameUiFont('naoExiste')
    expect(fonte.id).toBe(DEFAULT_GAME_UI_FONT)
    expect(await loadGameUiFont(undefined).then((f) => f.id)).toBe(DEFAULT_GAME_UI_FONT)
  })

  it('o bootstrap publica família e id para os runtimes lerem', () => {
    const win: Record<string, unknown> = {}
    new Function('window', gameUiFontBootstrapScript('"Bungee", sans-serif', 'bungee'))(win)
    const publicado = win.SZGameUIFont as { id: string; family: string; install: () => void }
    expect(publicado.id).toBe('bungee')
    expect(publicado.family).toBe('"Bungee", sans-serif')
    expect(publicado.install).toBeFunction()
  })

  it('⭐ o runtime NÃO carrega mais a fonte, mas continua LENDO a família', () => {
    expect(gameKit3DRuntime).toMatch(/^import \* as THREE from 'three';/)
    expect(world3DRuntime).toMatch(/^import \* as THREE from 'three';/)

    for (const runtime of [gameTwoDRuntime, gameKitRuntime, gameKit3DRuntime, world3DRuntime]) {
      // ⚠️ Esta é a metade que prova o ganho: os ~44 KB de base64 viajavam DENTRO de
      // cada um destes quatro, e dentro de cada `sz-ext/*.js` exportado.
      expect(runtime).not.toContain('data:font/woff2;base64,')
      expect(runtime).not.toContain('window.SZGameUIFont = { family: family')
    }
    // E esta é a metade que prova que as 64 leituras sobreviveram intactas.
    for (const runtime of [gameTwoDRuntime, gameKitRuntime, world3DRuntime]) {
      expect(runtime).toContain('window.SZGameUIFont && window.SZGameUIFont.family')
    }
    expect(gameKitRuntime).toContain('font-family: var(--sz-game-ui-font)')
    expect(gameKit3DRuntime).toContain('font-family: var(--sz-game-ui-font)')
    expect(world3DRuntime).toContain('font-family:var(--sz-game-ui-font)')
  })
})

describe('descobrir a fonte do projeto antes de o jogo rodar', () => {
  it('sem bloco, é a fonte de sempre', () => {
    expect(resolveGameUiFontId(null)).toBe(DEFAULT_GAME_UI_FONT)
    expect(resolveGameUiFontId({})).toBe(DEFAULT_GAME_UI_FONT)
    expect(resolveGameUiFontId({ ir: { behavior: { start: [] } } })).toBe(DEFAULT_GAME_UI_FONT)
  })

  it('acha na IR, e o ÚLTIMO vence', () => {
    const ir = {
      behavior: {
        start: [
          { type: 'g2d:useFont', font: 'nunito' },
          { type: 'g2d:useFont', font: 'bungee' },
        ],
      },
    }
    expect(resolveGameUiFontId({ ir })).toBe('bungee')
    expect(
      resolveGameUiFontId({
        ir: { behavior: { start: [{ type: 'gk:useFont', font: 'fredoka' }] } },
      }),
    ).toBe('fredoka')
  })

  it('⚠️ cai no script.js quando não há IR — snapshot do Mural, hidratação pendente', () => {
    expect(
      resolveGameUiFontId({ files: { 'script.js': 'SZGame2D.useFont("pressStart2P");' } }),
    ).toBe('pressStart2P')
    expect(resolveGameUiFontId({ files: { 'script.js': 'SZGameKit.useFont("bungee");' } })).toBe(
      'bungee',
    )
  })

  it('escolha que não dá para ler de fora cai no padrão, sem lançar', () => {
    // Nome numa variável ou bloco dentro de um "se": não há resposta estática, e o
    // runtime avisa a criança em vez de o jogo quebrar.
    expect(resolveGameUiFontId({ files: { 'script.js': 'SZGame2D.useFont(minhaFonte);' } })).toBe(
      DEFAULT_GAME_UI_FONT,
    )
    expect(
      resolveGameUiFontId({ ir: { behavior: { start: [{ type: 'g2d:useFont', font: 'xx' }] } } }),
    ).toBe(DEFAULT_GAME_UI_FONT)
  })
})
