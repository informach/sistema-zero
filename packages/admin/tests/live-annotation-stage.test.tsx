import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type {
  AnnotationStyle,
  ScreenAnnotation,
  ScreenAnnotationState,
} from '@sistemazero/member-shell/lib/live/screen-annotation'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LiveAnnotationStage } = await import(
  '@sistemazero/member-shell/components/live/live-annotation-stage'
)
const { LiveAnnotationControls } = await import(
  '@sistemazero/member-shell/components/live/live-annotation-toolbar'
)

/**
 * O modo desenho da professora sobre a demonstração (member-shell). O compositor é falso: anota o
 * que a tela pediu a ele, já em pixels do quadro de 1600x1000. A prévia mede 800x600 na página,
 * então a imagem ocupa 800x500 com faixas de 50px em cima e embaixo.
 */

type Call = [string, ...unknown[]]
function fakeAnnotation(initial: Partial<ScreenAnnotationState> = {}) {
  const calls: Call[] = []
  const listeners = new Set<() => void>()
  let state: ScreenAnnotationState = {
    surface: 'screen',
    boardTheme: 'light',
    hasScreen: true,
    canUndo: true,
    shapeCount: 2,
    ...initial,
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1000
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0 }) as DOMRect
  const set = (patch: Partial<ScreenAnnotationState>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args])
    }
  const annotation: ScreenAnnotation = {
    canvas,
    stream: {} as MediaStream,
    width: 1600,
    height: 1000,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setSurface: (surface) => {
      calls.push(['setSurface', surface])
      set({ surface })
    },
    setBoardTheme: (theme) => {
      calls.push(['setBoardTheme', theme])
      set({ boardTheme: theme })
    },
    attachScreen: record('attachScreen'),
    begin: record('begin'),
    move: record('move'),
    end: record('end'),
    cancel: record('cancel'),
    addText: record('addText'),
    pointLaser: record('pointLaser'),
    undo: record('undo'),
    clear: record('clear'),
    render: () => undefined,
    close: record('close'),
  }
  return { annotation, calls, named: (name: string) => calls.filter((call) => call[0] === name) }
}

let cleanup: (() => void) | null = null
afterEach(() => {
  cleanup?.()
  cleanup = null
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return { container, rerender: (next: React.ReactNode) => act(async () => root.render(next)) }
}

function stage(
  fake: ReturnType<typeof fakeAnnotation>,
  extra: { open?: boolean; onClose?: () => void; onShareScreen?: () => void } = {},
) {
  return (
    <LiveAnnotationStage
      annotation={fake.annotation}
      open={extra.open ?? true}
      onClose={extra.onClose ?? (() => undefined)}
      onShareScreen={extra.onShareScreen ?? (() => undefined)}
    />
  )
}

const byLabel = (scope: ParentNode, label: string) => {
  const found = scope.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
const byText = (scope: ParentNode, text: string) => {
  const found = [...scope.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === text,
  )
  if (!found) throw new Error(`Botão ausente: ${text}`)
  return found
}
const surface = (scope: ParentNode) =>
  scope.querySelector<HTMLDivElement>('[data-annotation-surface]')!

async function key(init: KeyboardEventInit, target: EventTarget = document.body) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  })
}
async function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  extra: PointerEventInit = {},
) {
  const target = surface(document)
  await act(async () => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        ...extra,
      }),
    )
  })
}

const red: AnnotationStyle = { color: '#ef4444', width: 'medium' }

describe('modo desenho da professora', () => {
  test('a barra tem as ferramentas, as cores e as espessuras, todas com 44px', async () => {
    const fake = fakeAnnotation()
    const { container } = await mount(stage(fake))
    const toolbar = container.querySelector('[role="toolbar"]')!
    for (const label of [
      'Caneta',
      'Marca-texto',
      'Seta',
      'Retângulo',
      'Círculo',
      'Texto',
      'Borracha',
      'Luz mágica',
      'Vermelho',
      'Amarelo',
      'Azul',
      'Verde',
      'Branco',
      'Preto',
      'Espessura fina',
      'Espessura média',
      'Espessura grossa',
      'Desfazer',
      'Limpar tudo',
    ])
      expect(byLabel(toolbar, label)).toBeTruthy()
    for (const node of toolbar.querySelectorAll('button')) {
      expect(node.className).toContain('min-h-11')
      expect(node.className).toContain('min-w-11')
    }
    expect(byText(container, 'Sair do desenho').className).toContain('min-h-11')
    // O atalho de cada ferramenta está no título e no aria-keyshortcuts.
    expect(byLabel(toolbar, 'Seta').getAttribute('aria-keyshortcuts')).toBe('A')
    expect(byLabel(toolbar, 'Caneta').title).toBe('Caneta (P)')
  })

  test('o traço chega ao compositor em pixels do quadro, não da prévia', async () => {
    const fake = fakeAnnotation()
    await mount(stage(fake))
    await pointer('pointerdown', 100, 100)
    await pointer('pointermove', 400, 300)
    await pointer('pointerup', 400, 300)
    // (100, 100) na prévia → x = 100 × 2, y = (100 − 50) × 2.
    expect(fake.named('begin')).toEqual([['begin', 'pen', { x: 200, y: 100 }, red]])
    expect(fake.named('move')).toEqual([['move', { x: 800, y: 500 }]])
    expect(fake.named('end')).toHaveLength(1)
  })

  test('começar na faixa preta, fora da imagem, não desenha', async () => {
    const fake = fakeAnnotation()
    await mount(stage(fake))
    await pointer('pointerdown', 300, 20)
    await pointer('pointerup', 300, 20)
    expect(fake.named('begin')).toEqual([])
  })

  test('os atalhos trocam a ferramenta; Ctrl+Z desfaz; Q troca tela e quadro', async () => {
    const fake = fakeAnnotation()
    const { container } = await mount(stage(fake))
    await key({ key: 'r' })
    expect(byLabel(container, 'Retângulo').getAttribute('aria-pressed')).toBe('true')
    await pointer('pointerdown', 100, 100)
    await pointer('pointerup', 100, 100)
    expect(fake.named('begin')[0]?.[1]).toBe('rect')
    await key({ key: 'm' })
    expect(byLabel(container, 'Marca-texto').getAttribute('aria-pressed')).toBe('true')
    await key({ key: 'z', ctrlKey: true })
    expect(fake.named('undo')).toHaveLength(1)
    await key({ key: 'q' })
    expect(fake.named('setSurface')).toEqual([['setSurface', 'board']])
    await key({ key: 'q' })
    expect(fake.named('setSurface')).toEqual([
      ['setSurface', 'board'],
      ['setSurface', 'screen'],
    ])
  })

  test('sem tela escolhida, voltar para a tela pede a aba (não liga uma tela vazia)', async () => {
    const fake = fakeAnnotation({ surface: 'board', hasScreen: false })
    const asked: string[] = []
    await mount(stage(fake, { onShareScreen: () => asked.push('aba') }))
    await key({ key: 'q' })
    expect(asked).toEqual(['aba'])
    expect(fake.named('setSurface')).toEqual([])
  })

  test('Esc sai do modo desenho; o desenho não é apagado', async () => {
    const fake = fakeAnnotation()
    let closed = 0
    await mount(stage(fake, { onClose: () => (closed += 1) }))
    await key({ key: 'Escape' })
    expect(closed).toBe(1)
    expect(fake.named('clear')).toEqual([])
  })

  test('fechar no meio de um traço descarta o traço pela metade', async () => {
    const fake = fakeAnnotation()
    const { rerender } = await mount(stage(fake))
    await pointer('pointerdown', 100, 100)
    await rerender(stage(fake, { open: false }))
    expect(fake.named('cancel').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelector('[data-annotation-surface]')).toBeNull()
  })

  test('texto: clica, escreve, Enter grava na cor escolhida; letras não trocam a ferramenta', async () => {
    const fake = fakeAnnotation()
    const { container } = await mount(stage(fake))
    await act(async () => byLabel(container, 'Azul').click())
    await key({ key: 't' })
    await pointer('pointerdown', 200, 150)
    const input = container.querySelector<HTMLInputElement>('input[aria-label]')!
    expect(input).toBeTruthy()
    expect(document.activeElement).toBe(input)
    input.value = 'Para cima'
    // Escrever "r" dentro do campo não pode virar o retângulo.
    await key({ key: 'r' }, input)
    expect(byLabel(container, 'Texto').getAttribute('aria-pressed')).toBe('true')
    await key({ key: 'Enter' }, input)
    expect(fake.named('addText')).toEqual([
      ['addText', { x: 400, y: 200 }, 'Para cima', { color: '#3b82f6', width: 'medium' }],
    ])
    expect(container.querySelector('input[aria-label]')).toBeNull()
  })

  test('Esc no campo de texto desiste do texto, e o modo desenho continua aberto', async () => {
    const fake = fakeAnnotation()
    let closed = 0
    const { container } = await mount(stage(fake, { onClose: () => (closed += 1) }))
    await key({ key: 't' })
    await pointer('pointerdown', 200, 150)
    const input = container.querySelector<HTMLInputElement>('input[aria-label]')!
    input.value = 'Ops'
    await key({ key: 'Escape' }, input)
    expect(closed).toBe(0)
    expect(fake.named('addText')).toEqual([])
    expect(container.querySelector('input[aria-label]')).toBeNull()
  })

  test('a luz mágica segue o mouse sem apertar e começa um rastro novo ao sair', async () => {
    const fake = fakeAnnotation()
    await mount(stage(fake))
    await key({ key: 'l' })
    await pointer('pointermove', 100, 100, { button: -1 })
    await pointer('pointermove', 120, 100, { button: -1 })
    await act(async () => {
      // O React monta o onPointerLeave a partir do pointerout para fora do elemento.
      surface(document).dispatchEvent(
        new PointerEvent('pointerout', {
          bubbles: true,
          pointerId: 1,
          relatedTarget: document.body,
        }),
      )
    })
    await pointer('pointermove', 300, 300, { button: -1 })
    expect(fake.named('pointLaser').map((call) => call[3])).toEqual([true, false, true])
    expect(fake.named('begin')).toEqual([])
  })

  test('limpar tudo e desfazer pelos botões; sem desenho eles ficam apagados', async () => {
    const fake = fakeAnnotation()
    const { container } = await mount(stage(fake))
    await act(async () => byLabel(container, 'Limpar tudo').click())
    await act(async () => byLabel(container, 'Desfazer').click())
    expect(fake.named('clear')).toHaveLength(1)
    expect(fake.named('undo')).toHaveLength(1)
    cleanup?.()
    const empty = fakeAnnotation({ canUndo: false, shapeCount: 0 })
    const view = await mount(stage(empty))
    expect(byLabel(view.container, 'Limpar tudo').disabled).toBe(true)
    expect(byLabel(view.container, 'Desfazer').disabled).toBe(true)
  })

  test('o canvas do compositor entra na prévia ao abrir e sai ao fechar', async () => {
    const fake = fakeAnnotation()
    const { rerender } = await mount(stage(fake))
    expect(surface(document).contains(fake.annotation.canvas)).toBe(true)
    await rerender(stage(fake, { open: false }))
    expect(fake.annotation.canvas.isConnected).toBe(false)
  })
})

describe('controles no painel da professora', () => {
  test('troca tela e quadro sem abrir o modo desenho; fundo do quadro só no quadro', async () => {
    const fake = fakeAnnotation()
    let drawing = 0
    const { container } = await mount(
      <LiveAnnotationControls
        annotation={fake.annotation}
        onDraw={() => (drawing += 1)}
        onShareScreen={() => undefined}
      />,
    )
    expect(container.querySelector('[aria-label="Fundo escuro"]')).toBeNull()
    await act(async () => byText(container, 'Quadro branco').click())
    expect(fake.named('setSurface')).toEqual([['setSurface', 'board']])
    await act(async () => byLabel(container, 'Fundo escuro').click())
    expect(fake.named('setBoardTheme')).toEqual([['setBoardTheme', 'dark']])
    await act(async () => byText(container, 'Desenhar na tela').click())
    expect(drawing).toBe(1)
    for (const node of container.querySelectorAll('button'))
      expect(node.className).toContain('min-h-11')
  })

  test('começou pelo quadro: "Escolher a tela" pede a aba', async () => {
    const fake = fakeAnnotation({ surface: 'board', hasScreen: false })
    const asked: string[] = []
    const { container } = await mount(
      <LiveAnnotationControls
        annotation={fake.annotation}
        onDraw={() => undefined}
        onShareScreen={() => asked.push('aba')}
      />,
    )
    await act(async () => byText(container, 'Escolher a tela').click())
    expect(asked).toEqual(['aba'])
    expect(fake.named('setSurface')).toEqual([])
  })
})
