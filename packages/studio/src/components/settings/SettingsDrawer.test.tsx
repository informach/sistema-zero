import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  CODE_FONT_SIZE_DEFAULT,
  DEFAULT_AI_MODEL,
  useSettingsStore,
} from '../../state/settingsStore'
import {
  resolveLearning,
  resolvePreviewSecurity,
  resolveStudioConfig,
  StudioConfigProvider,
} from '../../studio/config'
import { SettingsDrawer } from './SettingsDrawer'

function apiKeyInput(): HTMLInputElement {
  const input = document.querySelector('input[name="openrouter-api-key"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Campo de chave OpenRouter não encontrado.')
  }
  return input
}

describe('SettingsDrawer', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = mock(function showModal(this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = mock(function close(this: HTMLDialogElement) {
      this.open = false
    })
  })

  beforeEach(() => {
    useSettingsStore.setState({
      aiApiKey: '',
      aiApiKeyStorage: 'persistent',
      aiModel: DEFAULT_AI_MODEL,
      theme: 'dark',
      codeFontSize: CODE_FONT_SIZE_DEFAULT,
      loaded: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('sincroniza o rascunho da chave quando settings carregam com o modal aberto', () => {
    render(<SettingsDrawer open onClose={() => undefined} />)

    expect(apiKeyInput().value).toBe('')

    act(() => {
      useSettingsStore.setState({ aiApiKey: 'sk-or-v1-loaded' })
    })

    expect(apiKeyInput().value).toBe('sk-or-v1-loaded')
  })

  it('reabre na secao inicial e descarta rascunho antigo', () => {
    const { rerender } = render(
      <SettingsDrawer open={false} onClose={() => undefined} initialSection="appearance" />,
    )

    act(() => {
      useSettingsStore.setState({ aiApiKey: 'sk-or-v1-existing' })
    })
    rerender(<SettingsDrawer open onClose={() => undefined} initialSection="ai" />)

    expect(apiKeyInput().value).toBe('sk-or-v1-existing')
    expect(document.body.textContent).toContain('Assistente de IA')
    expect(document.body.textContent).toContain('Chave de API')
  })

  it('mostra o modo sessão quando a chave não é persistente', () => {
    useSettingsStore.setState({ aiApiKeyStorage: 'session' })

    render(<SettingsDrawer open onClose={() => undefined} />)

    const checkbox = document.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInstanceOf(HTMLInputElement)
    expect((checkbox as HTMLInputElement).checked).toBe(false)
    expect(document.body.textContent).toContain('Modo sessão')
  })

  it('expõe navegação e chave de API com semântica acessível', () => {
    render(<SettingsDrawer open onClose={() => undefined} />)

    const aiTab = screen.getByRole('tab', { name: 'Assistente de IA' })
    const appearanceTab = screen.getByRole('tab', { name: 'Aparência' })
    expect(aiTab.getAttribute('aria-selected')).toBe('true')
    expect(appearanceTab.getAttribute('aria-selected')).toBe('false')

    const key = screen.getByLabelText('Chave de API')
    expect(key).toBeInstanceOf(HTMLInputElement)
    expect(key.getAttribute('spellcheck')).toBe('false')

    fireEvent.keyDown(aiTab, { key: 'ArrowRight' })
    expect(appearanceTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(appearanceTab)
  })

  it('abre na Aparência (e não vazio) quando a aba de IA não existe', () => {
    // Host fixa o modelo e não permite chave do aluno: sem seção de chave nem de
    // modelo, a aba de IA some. O initialSection default 'ai' não pode deixar o
    // corpo vazio — o efeito de abertura precisa clampar em 'appearance'.
    const config = {
      ...resolveStudioConfig({ ai: { model: 'openrouter/auto', allowUserKey: false } }, undefined),
      previewSecurity: resolvePreviewSecurity(),
      learning: resolveLearning(),
    }

    render(
      <StudioConfigProvider value={config}>
        <SettingsDrawer open onClose={() => undefined} />
      </StudioConfigProvider>,
    )

    expect(document.body.textContent).toContain('Aparência')
    expect(document.body.textContent).toContain('Tema')
    expect(document.body.textContent).not.toContain('Assistente de IA')
  })
})
