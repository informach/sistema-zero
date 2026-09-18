import { describe, expect, it } from 'bun:test'
import { type ConsoleVisibilityOverride, createUIStore, resolveConsoleVisibility } from './uiStore'

describe('resolveConsoleVisibility', () => {
  it.each([
    ['blocks', false],
    ['bridge', false],
    ['code', true],
  ] as const)('usa o padrão do modo %s sem escolha manual', (mode, expected) => {
    expect(resolveConsoleVisibility(mode, null)).toBe(expected)
  })

  it.each([
    true,
    false,
  ] as const)('faz a escolha manual %s prevalecer em todos os modos', (override) => {
    for (const mode of ['blocks', 'bridge', 'code'] as const) {
      expect(resolveConsoleVisibility(mode, override)).toBe(override)
    }
  })
})

describe('createUIStore', () => {
  it('começa sem preferência manual de visibilidade do Console', () => {
    expect(createUIStore().getState().consoleVisibilityOverride).toBeNull()
  })

  it('mantém a preferência manual na mesma store e a reinicia numa nova instância', () => {
    const first = createUIStore()
    const chosen: ConsoleVisibilityOverride = false

    first.getState().setConsoleVisibilityOverride(chosen)

    expect(first.getState().consoleVisibilityOverride).toBe(false)
    expect(resolveConsoleVisibility('code', first.getState().consoleVisibilityOverride)).toBe(false)
    expect(createUIStore().getState().consoleVisibilityOverride).toBeNull()
  })
})

/**
 * As três portas do menu ⋯ abrem a MESMA janela, cada uma na sua aba. A regra
 * precisa ser previsível para uma criança, e a armadilha é o meio-termo: clicar
 * em "Sons" com a janela aberta nas imagens não pode FECHAR tudo (era o que um
 * toggle puro faria, e o gesto viraria "sumiu quando eu pedi").
 */
describe('openAssetsTab — as portas dos materiais', () => {
  it('fechada: abre na aba pedida', () => {
    const ui = createUIStore()
    ui.getState().openAssetsTab('sounds')
    expect(ui.getState().showAssets).toBe(true)
    expect(ui.getState().assetsTab).toBe('sounds')
  })

  it('aberta em OUTRA aba: troca a aba, sem fechar', () => {
    const ui = createUIStore()
    ui.getState().openAssetsTab('images')
    ui.getState().openAssetsTab('models3d')
    expect(ui.getState().showAssets).toBe(true)
    expect(ui.getState().assetsTab).toBe('models3d')
  })

  it('aberta NAQUELA aba: fecha (a mesma porta é a saída)', () => {
    const ui = createUIStore()
    ui.getState().openAssetsTab('sounds')
    ui.getState().openAssetsTab('sounds')
    expect(ui.getState().showAssets).toBe(false)
    // A aba fica: reabrir leva a criança de volta onde ela estava.
    expect(ui.getState().assetsTab).toBe('sounds')
  })

  it('a aba começa nas imagens', () => {
    expect(createUIStore().getState().assetsTab).toBe('images')
  })
})
