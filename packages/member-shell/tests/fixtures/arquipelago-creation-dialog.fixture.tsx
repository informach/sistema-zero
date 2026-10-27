import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useEffect } = await import('react')
const { createRoot } = await import('react-dom/client')
let result: string | null = 'desenho-1'
let shouldFail = false
let saves = 0
let moldaAccess: unknown
mock.module('../../src/components/creator/pinta-client', () => ({
  PintaClient: ({
    onCompletionControlChange,
  }: {
    onCompletionControlChange: (c: unknown) => void
  }) => {
    useEffect(() => {
      onCompletionControlChange({
        async concluir() {
          saves++
          if (shouldFail) throw new Error('offline')
          return result
        },
      })
      return () => onCompletionControlChange(null)
    }, [onCompletionControlChange])
    return <div>Editor Pinta</div>
  },
}))
mock.module('../../src/components/creator/molda-client', () => ({
  MoldaClient: ({
    onCompletionControlChange,
    toolAccess,
  }: {
    onCompletionControlChange: (c: unknown) => void
    toolAccess: unknown
  }) => {
    moldaAccess = toolAccess
    useEffect(() => {
      onCompletionControlChange({
        async concluir() {
          saves++
          return result
        },
      })
      return () => onCompletionControlChange(null)
    }, [onCompletionControlChange])
    return <div>Editor Molda</div>
  },
}))
const { ArquipelagoCreationDialog } = await import(
  '../../src/components/arquipelago-creation-dialog'
)
let cleanup: (() => Promise<void>) | undefined
afterEach(async () => {
  await cleanup?.()
  cleanup = undefined
  result = 'desenho-1'
  shouldFail = false
  saves = 0
})

async function renderDialog(ferramenta: 'pinta' | 'molda' = 'pinta') {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const finished: Array<string | null> = []
  await act(async () =>
    root.render(
      <ArquipelagoCreationDialog
        ferramenta={ferramenta}
        viewerId="p1"
        audience="kids"
        studioAvailable={false}
        narrationEnabled={false}
        toolAccess={ferramenta === 'molda' ? { allow: ['basico'] } : null}
        onFinish={(id) => finished.push(id)}
      />,
    ),
  )
  cleanup = async () => {
    await act(async () => root.unmount())
    container.remove()
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes(label),
    )
    if (!button) throw new Error(`Botão ausente: ${label}`)
    await act(async () => button.click())
  }
  return { container, finished, click }
}

test('entrega o desenho somente depois do salvamento', async () => {
  const ui = await renderDialog()
  await ui.click('Usar criação')
  expect(saves).toBe(1)
  expect(ui.finished).toEqual(['desenho-1'])
})
test('não entrega criação ausente e mantém a ferramenta aberta', async () => {
  result = null
  const ui = await renderDialog()
  await ui.click('Usar criação')
  expect(ui.finished).toEqual([])
  expect(ui.container.textContent).toContain('Abra uma criação')
})
test('falha de salvamento não encerra a ferramenta; saída sem confirmação exige decisão explícita', async () => {
  shouldFail = true
  const ui = await renderDialog()
  await ui.click('Voltar ao jogo')
  expect(ui.finished).toEqual([])
  expect(ui.container.textContent).toContain('Não foi possível confirmar')
  await ui.click('Sair sem confirmar')
  expect(ui.finished).toEqual([])
  await ui.click('Confirmar saída')
  expect(ui.finished).toEqual([null])
})
test('voltar guarda antes de cancelar', async () => {
  const ui = await renderDialog()
  await ui.click('Voltar ao jogo')
  expect(saves).toBe(1)
  expect(ui.finished).toEqual([null])
})
test('Molda recebe as ferramentas conquistadas e entrega a criação salva', async () => {
  const ui = await renderDialog('molda')
  expect(ui.container.textContent).toContain('Editor Molda')
  expect(moldaAccess).toEqual({ allow: ['basico'] })
  await ui.click('Usar criação')
  expect(saves).toBe(1)
  expect(ui.finished).toEqual(['desenho-1'])
})
