import { afterEach, describe, expect, test } from 'bun:test'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import {
  useZappyFala,
  ZappyFalaProvider,
} from '@sistemazero/member-shell/components/zappy-fala-context'
import { act, cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { type MascotExpression, tocandoDoZappy, ZAPPY_SRC } from '../src/components/kids/mascot'
import { KidsMascotAnimated } from '../src/components/kids/mascot-animated'

const media = Object.getOwnPropertyDescriptor(window, 'matchMedia')
afterEach(() => {
  cleanup()
  if (media) Object.defineProperty(window, 'matchMedia', media)
})
function reduced(value: boolean) {
  window.matchMedia = (query) => ({
    matches: value && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true
    },
  })
}

describe('Zappy ediSVG', () => {
  test('SSR and the first paint have a real decorative reserve instead of a blank player', async () => {
    const html = renderToStaticMarkup(<KidsMascotAnimated expression="celebrating" />)
    expect(html).toContain(ZAPPY_SRC.celebrating)
    expect(html).not.toContain('<svg')
    render(<KidsMascotAnimated expression="celebrating" />)
    expect(document.querySelector('img')?.getAttribute('src')).toBe(ZAPPY_SRC.celebrating)
    await act(async () => {})
  })
  test('every expression retains its own matching static fallback', async () => {
    reduced(true)
    for (const expression of Object.keys(ZAPPY_SRC) as MascotExpression[]) {
      const { container, unmount } = render(<KidsMascotAnimated expression={expression} />)
      expect(container.querySelector('img')?.getAttribute('src')).toBe(ZAPPY_SRC[expression])
      expect(container.querySelector('svg')).toBeNull()
      unmount()
    }
    await act(async () => {})
  })
  test('reduced motion keeps the fallback styling without starting a drawing session', async () => {
    reduced(true)
    const { container } = render(
      <KidsMascotAnimated expression="celebrating" stillClassName="kid-wiggle" />,
    )
    expect(container.querySelector('img')?.className).toContain('kid-wiggle')
    await act(async () => {})
    expect(container.querySelector('svg')).toBeNull()
  })
  test('data saving retains the static pose', async () => {
    const saved = Object.getOwnPropertyDescriptor(navigator, 'connection')
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    })
    try {
      const { container } = render(<KidsMascotAnimated expression="thinking" />)
      await act(async () => {})
      expect(container.querySelector('img')?.getAttribute('src')).toBe(ZAPPY_SRC.thinking)
      expect(container.querySelector('svg')).toBeNull()
    } finally {
      if (saved) Object.defineProperty(navigator, 'connection', saved)
      else Reflect.deleteProperty(navigator, 'connection')
    }
  })
})

describe('speech authority', () => {
  test('only the speaking pose follows the existing voice context', () => {
    expect(tocandoDoZappy('speaking', null)).toBeUndefined()
    expect(tocandoDoZappy('speaking', { podeFalar: false, falando: false })).toBeUndefined()
    expect(tocandoDoZappy('speaking', { podeFalar: true, falando: false })).toBe(false)
    expect(tocandoDoZappy('speaking', { podeFalar: true, falando: true })).toBe(true)
    for (const pose of ['happy', 'celebrating', 'thinking', 'sleeping'] as const)
      expect(tocandoDoZappy(pose, { podeFalar: true, falando: true })).toBeUndefined()
  })
  test('a dialogue without its own audio preserves the scene speech for its mascot slot', async () => {
    function Inspector() {
      return <output>{String(useZappyFala()?.falando)}</output>
    }
    const { rerender } = render(
      <ZappyFalaProvider value={{ podeFalar: true, falando: false }}>
        <DialogueBlockView
          content={{ kind: 'dialogue', text: 'Uma fala.' }}
          mascot={<Inspector />}
        />
      </ZappyFalaProvider>,
    )
    expect(document.querySelector('output')?.textContent).toBe('false')
    rerender(
      <ZappyFalaProvider value={{ podeFalar: true, falando: true }}>
        <DialogueBlockView
          content={{ kind: 'dialogue', text: 'Uma fala.' }}
          mascot={<Inspector />}
        />
      </ZappyFalaProvider>,
    )
    await act(async () => {})
    expect(document.querySelector('output')?.textContent).toBe('true')
  })
})
