import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { ChestRive } from '../src/components/kids/chest-rive'
import {
  CHEST_RIVE_ARTBOARD,
  CHEST_RIVE_OPEN_STATE,
  CHEST_RIVE_OPEN_TRIGGER,
  CHEST_RIVE_STATE_MACHINE,
  riveEntrouNoEstado,
} from '../src/components/kids/chest-rive-contract'

const RIV = 'https://media.example.com/kids/chest.riv'

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

afterEach(() => {
  cleanup()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'chestRivePronto')
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'chestRiveFalhou')
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'chestRiveAbriu')
})

function matchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const settle = () => act(async () => {})
const canvas = () => document.querySelector('[data-chest-rive-src]')

function callbacks() {
  const globals = globalThis as Record<string, unknown>
  return {
    ready: globals.chestRivePronto as (() => void) | undefined,
    failed: globals.chestRiveFalhou as (() => void) | undefined,
    opened: globals.chestRiveAbriu as (() => void) | undefined,
  }
}

describe('ChestRive', () => {
  test('o contrato do arquivo é estável e explícito para quem anima no Rive', () => {
    expect(CHEST_RIVE_ARTBOARD).toBe('Chest')
    expect(CHEST_RIVE_STATE_MACHINE).toBe('ChestState')
    expect(CHEST_RIVE_OPEN_TRIGGER).toBe('open')
    expect(CHEST_RIVE_OPEN_STATE).toBe('Open')
  })

  test('aceita o estado terminal nos dois formatos previstos pelo runtime', () => {
    expect(riveEntrouNoEstado('Open', 'Open')).toBe(true)
    expect(riveEntrouNoEstado(['Opening', 'Open'], 'Open')).toBe(true)
    expect(riveEntrouNoEstado(['Opening'], 'Open')).toBe(false)
  })

  test('SSR não gera canvas nem tenta carregar o runtime', () => {
    expect(
      renderToString(
        <ChestRive
          src={RIV}
          opening={false}
          onReady={() => {}}
          onFailed={() => {}}
          onOpened={() => {}}
        />,
      ),
    ).not.toContain('data-chest-rive-src')
  })

  test('sem URL configurada não há canvas nem requisição a um arquivo inventado', async () => {
    matchMedia(false)
    render(
      <ChestRive
        src={null}
        opening={false}
        onReady={() => {}}
        onFailed={() => {}}
        onOpened={() => {}}
      />,
    )
    await settle()
    expect(canvas()).toBeNull()
  })

  test('monta o Rive somente no cliente e encaminha os três sinais do runtime', async () => {
    matchMedia(false)
    let ready = 0
    let failed = 0
    let opened = 0
    const { rerender } = render(
      <ChestRive
        src={RIV}
        opening={false}
        onReady={() => {
          ready += 1
        }}
        onFailed={() => {
          failed += 1
        }}
        onOpened={() => {
          opened += 1
        }}
      />,
    )
    await settle()
    expect(canvas()?.getAttribute('data-chest-rive-src')).toBe(RIV)
    expect(canvas()?.getAttribute('data-chest-rive-opening')).toBe('false')

    await act(async () => callbacks().ready?.())
    expect(ready).toBe(1)

    rerender(
      <ChestRive
        src={RIV}
        opening
        onReady={() => {
          ready += 1
        }}
        onFailed={() => {
          failed += 1
        }}
        onOpened={() => {
          opened += 1
        }}
      />,
    )
    expect(canvas()?.getAttribute('data-chest-rive-opening')).toBe('true')
    await act(async () => callbacks().opened?.())
    expect(opened).toBe(1)

    await act(async () => callbacks().failed?.())
    expect(failed).toBe(1)
    expect(canvas()).toBeNull()
  })

  test('movimento reduzido mantém o SVG do pai, sem baixar canvas', async () => {
    matchMedia(true)
    render(
      <ChestRive
        src={RIV}
        opening={false}
        onReady={() => {}}
        onFailed={() => {}}
        onOpened={() => {}}
      />,
    )
    await settle()
    expect(canvas()).toBeNull()
  })
})
