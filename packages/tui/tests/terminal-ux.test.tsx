import { expect, test } from 'bun:test'
import { testRender } from '@opentui/react/test-utils'
import { act } from 'react'
import { SessionView } from '../src/app'
import { KeyboardLayerProvider } from '../src/providers/keyboard-layer'
import { ThemeProvider } from '../src/providers/theme'
import { ToastProvider } from '../src/providers/toast'
import { RuntimeState } from '../src/state/runtime'

for (const dimensions of [
  [80, 24],
  [120, 40],
  [200, 60],
] as const)
  test(`keyboard, Unicode draft and resize at ${dimensions.join('x')}`, async () => {
    const state = new RuntimeState('C:\\equipe\\ação 日本語')
    const setup = await testRender(
      <ThemeProvider>
        <ToastProvider>
          <KeyboardLayerProvider>
            <SessionView state={state} />
          </KeyboardLayerProvider>
        </ToastProvider>
      </ThemeProvider>,
      { width: dimensions[0], height: dimensions[1] },
    )
    const perform = async (action: () => void) => {
      await act(async () => {
        action()
        await Bun.sleep(40)
      })
      await setup.renderOnce()
    }
    try {
      await perform(() => state.setDraft('Investigar ação 日本語 sem perder este rascunho'))
      expect(setup.captureCharFrame()).toContain('Investigar ação')
      await perform(() => {
        state.questions = Array.from({ length: 3 }, (_, index) => ({
          id: `question-${index}`,
          runId: `child-${index}`,
          kind: 'approval' as const,
          prompt: 'Uma operação extensa precisa de revisão. '.repeat(100),
          options: ['approve', 'deny'],
          createdAt: new Date().toISOString(),
        }))
        state.update()
      })
      expect(setup.captureCharFrame()).toContain('/answer question-0 approve | deny')
      expect(setup.captureCharFrame()).toContain('/question question-0')
      expect(setup.captureCharFrame()).toContain('Investigar ação')
      await perform(() => setup.mockInput.pressKey('F2'))
      expect(setup.captureCharFrame()).toContain('Tarefas')
      await perform(() => setup.mockInput.pressTab())
      expect(setup.captureCharFrame()).toContain('Navegação')
      await perform(() => setup.mockInput.pressEscape())
      expect(setup.captureCharFrame()).toContain('Conversa')
      expect(state.draftText).toContain('日本語')
      await perform(() => setup.resize(45, 10))
      expect(setup.captureCharFrame()).toContain('Terminal pequeno')
      await perform(() => setup.resize(dimensions[0], dimensions[1]))
      expect(setup.captureCharFrame()).toContain('SISTEMA ZERO')
      expect(setup.captureCharFrame()).toContain('Investigar ação')
    } finally {
      await act(async () => {
        state.close()
        setup.renderer.destroy()
        await Bun.sleep(10)
      })
    }
  })
