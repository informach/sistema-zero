import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { useSettingsStore } from '../../state/settingsStore'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../studio/config'
import { type StudioTutorConfig, StudioTutorProvider, useStudioTutor } from '../../studio/tutor'
import { SettingsDrawer } from './SettingsDrawer'

describe('SettingsDrawer', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = mock(function showModal(this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = mock(function close(this: HTMLDialogElement) {
      this.open = false
    })
  })
  afterEach(cleanup)
  it('keeps appearance settings and never exposes local keys/models even with legacy AI enabled', () => {
    useSettingsStore.setState({ aiApiKey: 'old-private-value', aiModel: 'old/model', loaded: true })
    const { container } = render(
      <StudioConfigProvider
        value={{ ...STANDALONE_CONFIG, ai: true, aiConfig: { allowUserKey: true } }}
      >
        <SettingsDrawer open onClose={() => {}} />
      </StudioConfigProvider>,
    )
    expect(screen.getByRole('region', { name: 'Aparência' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Escuro' })).toBeTruthy()
    expect(container.querySelector('input[name="openrouter-api-key"]')).toBeNull()
    expect(container.querySelector('select[name="ai-model"]')).toBeNull()
    expect(document.body.textContent).not.toContain('old-private-value')
    expect(useSettingsStore.getState().aiApiKey).toBe('old-private-value')
  })
  it('legacy AI settings redirects to the same host tutor without reading credentials or requesting inference', () => {
    const ask = mock(async () => {
      throw new Error('Unexpected inference')
    })
    const config: StudioTutorConfig = {
      adapter: {
        ask,
        loadHistory: async () => ({ messages: [], nextCursor: null }),
        deleteHistory: async () => {},
        feedback: async () => {},
      },
    }
    const close = mock(() => {})
    function Probe() {
      return <output aria-label="tutor-open">{String(useStudioTutor().open)}</output>
    }
    render(
      <StudioTutorProvider value={config}>
        <SettingsDrawer open onClose={close} initialSection="ai" />
        <Probe />
      </StudioTutorProvider>,
    )
    expect(screen.getByLabelText('tutor-open').textContent).toBe('true')
    expect(close).toHaveBeenCalled()
    expect(ask).toHaveBeenCalledTimes(0)
    expect(screen.queryByLabelText('Chave de API')).toBeNull()
  })
  it('without a tutor legacy settings explains unavailability and keeps appearance accessible', () => {
    render(<SettingsDrawer open onClose={() => {}} initialSection="ai" />)
    expect(screen.getByRole('status').textContent).toContain('não está disponível')
    expect(screen.getByRole('region', { name: 'Aparência' })).toBeTruthy()
    expect(screen.queryByLabelText('Chave de API')).toBeNull()
  })
})
