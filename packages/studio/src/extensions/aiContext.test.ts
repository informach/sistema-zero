import { describe, expect, it } from 'bun:test'
import { gameTwoDExtension } from '../official-extensions/game-2d'
import { gameKitExtension } from '../official-extensions/game-2d-advanced'
import { GAME_EXTENSION_VISUAL_GUIDANCE } from '../official-extensions/gameVisualPolicy'
import { SERVER_MECHANIC_DOCUMENTS } from '../official-extensions/serverKnowledge'
import { formatExtensionPromptContext } from './aiContext'

describe('formatExtensionPromptContext', () => {
  it('o provider detalhado do Jogo 2D também usa somente o desenho da extensão', async () => {
    const detailed = await gameTwoDExtension.ai?.loadPromptContext?.()
    expect(detailed).toStartWith(GAME_EXTENSION_VISUAL_GUIDANCE)
    expect(detailed).not.toContain('CANVAS NA MÃO')
    expect(detailed).not.toMatch(/\bctx\.(?:rect|clip|isPointInPath|isPointInStroke)\(/)
  })

  it('mantém as etapas visuais explícitas para todos os jogos e documentos do tutor', () => {
    const context = formatExtensionPromptContext([gameTwoDExtension, gameKitExtension])
    expect(context.split(GAME_EXTENSION_VISUAL_GUIDANCE)).toHaveLength(2)
    for (const document of SERVER_MECHANIC_DOCUMENTS)
      expect(document.content).toStartWith(GAME_EXTENSION_VISUAL_GUIDANCE)
    expect(formatExtensionPromptContext([])).toBe('')
  })
  it('usa o resumo operacional da extensão avançada sem enviar o manual inteiro', () => {
    const context = formatExtensionPromptContext([gameKitExtension])

    expect(context).toContain('Criar mapa-cenário')
    expect(context).toContain('Quando entrar no mapa-cenário')
    expect(context).toContain('restartGame')
    expect(context.length).toBeLessThan(6_000)
    expect(context.length).toBeLessThan(6_000)
  })

  it('mantém o manual completo da extensão avançada disponível sob demanda', async () => {
    const loadPromptContext = (
      gameKitExtension.ai as unknown as { loadPromptContext?: () => Promise<string> }
    ).loadPromptContext

    expect(typeof loadPromptContext).toBe('function')
    expect((await loadPromptContext?.())?.length).toBeGreaterThan(30_000)
  })

  it('usa um resumo curto do Jogo 2D e mantém o manual detalhado sob demanda', async () => {
    const context = formatExtensionPromptContext([gameTwoDExtension])
    const loadPromptContext = gameTwoDExtension.ai?.loadPromptContext

    expect(context).toContain('Quando o jogo começar')
    expect(context).toContain('passos fixos de 60 Hz')
    expect(context.length).toBeLessThan(6_000)
    expect(typeof loadPromptContext).toBe('function')
    expect((await loadPromptContext?.())?.length).toBeGreaterThan(20_000)
  })
})
