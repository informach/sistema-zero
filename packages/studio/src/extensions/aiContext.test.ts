import { describe, expect, it } from 'bun:test'
import { gameKitExtension } from '../official-extensions/game-2d-advanced'
import { formatExtensionPromptContext } from './aiContext'

describe('formatExtensionPromptContext', () => {
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
})
