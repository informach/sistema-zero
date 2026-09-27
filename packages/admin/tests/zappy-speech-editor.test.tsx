import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LearningBuilder } = await import('../src/components/editor/learning-builder')

test('gerar e ouvir grava no bloco o MP3 da pronúncia aprovada', async () => {
  const originalFetch = globalThis.fetch
  const OriginalAudio = globalThis.Audio
  const roteiro = 'Aperte i grego.'
  const url = 'https://cdn.test/aulas/voz/ipsilon.mp3'
  globalThis.fetch = Object.assign(
    async () => Response.json({ vozes: { [chaveDeVoz(roteiro)]: url } }),
    {
      preconnect: () => {},
    },
  )
  globalThis.Audio = class {
    onended: (() => void) | null = null
    pause() {}
    async play() {}
  } as unknown as typeof Audio

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: InteractiveBlock = {
    kind: 'interactive',
    title: 'Teste de pronúncia',
    instructions: 'Aperte Y.',
    hints: [],
    required: true,
    activity: {
      type: 'experimentation',
      scene: 'world',
      vozes: { [chaveDeVoz('Aperte ípsilon.')]: 'https://cdn.test/aulas/voz/antiga.mp3' },
    },
  }
  const render = () =>
    root.render(
      <LearningBuilder
        value={value}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )

  try {
    await act(async () => render())
    const input = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Como o Zappy fala: Instrução da cena"]',
    )
    if (!input) throw new Error('Campo de pronúncia não encontrado')
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    await act(async () => {
      setValue?.call(input, roteiro)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.value).toBe(roteiro)
    const button = [...container.querySelectorAll('button')].find((element) =>
      element.textContent?.includes('Gerar e ouvir'),
    )
    if (!button) throw new Error('Botão de prévia não encontrado')
    expect(button.disabled).toBe(false)
    await act(async () => {
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    if (value.activity.type !== 'experimentation') throw new Error('Atividade de cena ausente')
    expect(value.activity.zappySpeech?.instruction).toEqual({
      sourceText: 'Aperte Y.',
      speechText: roteiro,
    })
    expect(value.activity.vozes).toEqual({ [chaveDeVoz(roteiro)]: url })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.Audio = OriginalAudio
    await act(async () => root.unmount())
    container.remove()
  }
})
