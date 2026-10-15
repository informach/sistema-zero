import { expect, test } from 'bun:test'
import { testRender } from '@opentui/react/test-utils'
import { act } from 'react'
import { SessionView } from '../src/app'
import { KeyboardLayerProvider } from '../src/providers/keyboard-layer'
import { ThemeProvider } from '../src/providers/theme'
import { ToastProvider } from '../src/providers/toast'
import { RuntimeState } from '../src/state/runtime'

test('terminal displays connection guidance and restores renderer', async () => {
  const state = new RuntimeState('C:\\projeto')
  const setup = await testRender(
    <ThemeProvider>
      <ToastProvider>
        <KeyboardLayerProvider>
          <SessionView state={state} />
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>,
    { width: 100, height: 30 },
  )
  try {
    await act(async () => {
      await setup.renderOnce()
    })
    const frame = setup.captureCharFrame()
    expect(frame).toContain('SISTEMA ZERO')
    expect(frame).toContain('/connections')
    expect(frame).not.toContain('opus-4-6')
  } finally {
    await act(async () => setup.renderer.destroy())
    state.close()
  }
})
