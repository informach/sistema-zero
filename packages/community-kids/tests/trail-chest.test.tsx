import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { ModuleChestView } from '@sistemazero/member-shell/lib/types'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O baú da trilha, agora CLICÁVEL.
 *
 * Até 09/2026 o XP de fim de unidade caía sozinho na conta e o baú era um desenho.
 * Agora a criança clica, ele abre e AÍ ela ganha — e quem revalida é o servidor.
 */
// ⚠️ Espalhe o módulo inteiro e NÃO restaure no fim: bun:test não isola module
// mocks por arquivo, e devolver o real no `afterAll` derruba quem roda depois.
const nav = await import('next/navigation')
let refreshes = 0
mock.module('next/navigation', () => ({
  ...nav,
  useRouter: () => ({
    refresh: () => {
      refreshes += 1
    },
    push: () => {},
  }),
}))

const { TrailChest } = await import('../src/components/kids/trail-chest')

const bau = (over: Partial<ModuleChestView> = {}): ModuleChestView => ({
  unlocked: true,
  claimed: false,
  xp: 25,
  coins: 15,
  ...over,
})

const originalFetch = globalThis.fetch
const originalChestRiveUrl = process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL
let pedidos: string[] = []

beforeEach(() => {
  pedidos = []
  refreshes = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    pedidos.push(String(input))
    return Response.json({ xpAwarded: 25, coinsAwarded: 15 })
  }) as unknown as typeof fetch
  if (originalChestRiveUrl === undefined) delete process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL
  else process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = originalChestRiveUrl
})

afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  if (originalChestRiveUrl === undefined) delete process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL
  else process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = originalChestRiveUrl
})

function montar(chest: ModuleChestView | null) {
  return render(
    <TrailChest courseSlug="meu-curso" moduleId="m1" unitNumber={2} chest={chest} offset={0} />,
  )
}

function movimentoReduzido(ligado: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: ligado && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('baú da trilha', () => {
  test('fechado, liberado e aberto compartilham uma base 3D visível', () => {
    const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8')
    const rule = (selector: string) =>
      css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? ''
    const base = rule('\\.kids-node--chest')
    const closed = rule('\\.kids-node--chest-closed')
    const open = rule('\\.kids-node--chest-open')
    const ready = rule('\\.kids-node-link \\.kids-node\\.kids-node--chest-ready')
    const hover = rule('\\.kids-node-link:hover \\.kids-node\\.kids-node--chest-ready')
    const active = rule('\\.kids-node-link:active \\.kids-node\\.kids-node--chest-ready')
    const label = rule('\\.kids-chest-label')

    expect(base).toContain('box-shadow:')
    expect(base).toContain('inset 0 3px 0')
    expect(base).toContain('0 var(--k3d-altura) 0 var(--k3d-degrau)')
    expect(css).toContain(
      '.kids-node-link .kids-node:not(.kids-node--locked):not(.kids-node--chest)',
    )
    expect(closed).toContain('--k3d-altura: 6px')
    expect(closed).toContain('var(--pen-degrau-cartao)')
    expect(open).toContain('--k3d-altura: 8px')
    expect(open).toContain('var(--kids-ouro) 58%')
    expect(ready).toContain('--k3d-altura: 8px')
    expect(hover).toContain('--k3d-altura: 9px')
    expect(active).toContain('--k3d-altura: 2px')
    expect(active).toContain('translate: 0 6px')
    expect(label).toContain('margin-top: 2px')
  })

  test('todos os estados renderizam o mesmo molde de baú 3D', () => {
    const { container, rerender } = montar(bau({ unlocked: false }))
    expect(
      container.querySelector('.kids-node--chest-closed')?.classList.contains('kids-node--chest'),
    ).toBe(true)

    rerender(
      <TrailChest courseSlug="meu-curso" moduleId="m1" unitNumber={2} chest={bau()} offset={0} />,
    )
    expect(
      container.querySelector('.kids-node--chest-ready')?.classList.contains('kids-node--chest'),
    ).toBe(true)

    rerender(
      <TrailChest
        courseSlug="meu-curso"
        moduleId="m1"
        unitNumber={2}
        chest={bau({ claimed: true })}
        offset={0}
      />,
    )
    expect(
      container.querySelector('.kids-node--chest-open')?.classList.contains('kids-node--chest'),
    ).toBe(true)
  })

  test('fechado não é botão (seria uma parada de foco que não faz nada)', () => {
    montar(bau({ unlocked: false }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('fechado')
  })

  test('bloqueado mostra o Rive fechado, sem disparar a abertura', async () => {
    process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = 'https://media.example.com/kids/chest.riv'
    montar(bau({ unlocked: false }))
    await act(async () => {})

    const rive = document.querySelector('[data-chest-rive-src]')
    expect(rive?.getAttribute('data-chest-rive-opening')).toBe('false')
    expect(rive?.getAttribute('data-chest-rive-opened')).toBe('false')
  })

  test('liberado é botão e diz o XP antes de abrir, sem prometer moeda', () => {
    // O XP é fixo; a MOEDA passa pelo teto diário e pode sair zero. Anunciar "15
    // moedas" num dia em que a criança já bateu o teto seria promessa falsa.
    montar(bau())
    const botao = screen.getByRole('button')
    expect(botao.closest('.kids-node-link')).toBeTruthy()
    expect(botao.getAttribute('aria-label')).toContain('25 XP')
    expect(botao.getAttribute('aria-label')).not.toContain('moedas')
  })

  test('sem estado do servidor o baú é decorativo, não promete zero', () => {
    montar(null)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('fechado')
  })

  test('abrir chama o servidor, mostra a festa e re-sincroniza o topo', async () => {
    montar(bau())
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(document.querySelector('.kids-chest-opening')).toBeTruthy())
    fireEvent.animationEnd(document.querySelector('.kids-chest-opening') as Element)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(pedidos).toEqual(['/api/members/courses/meu-curso/units/m1/chest/claim'])
    expect(screen.getByText(/\+25 XP/)).toBeTruthy()
    // O XP muda foguinho, nível e ranking no cabeçalho: sem isto só um F5 mostraria.
    expect(refreshes).toBe(1)
  })

  test('clique duplo dispara UM pedido só', async () => {
    montar(bau())
    const botao = screen.getByRole('button')
    fireEvent.click(botao)
    fireEvent.click(botao)
    await waitFor(() => expect(pedidos.length).toBeGreaterThan(0))
    expect(pedidos).toHaveLength(1)
    fireEvent.animationEnd(document.querySelector('.kids-chest-opening') as Element)
  })

  test('outra aba já abriu: fica aberto, sem festa (nada foi ganho AGORA)', async () => {
    globalThis.fetch = (async () =>
      Response.json({ xpAwarded: 0, coinsAwarded: 0 })) as unknown as typeof fetch
    montar(bau())
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(document.querySelector('.kids-chest-opening')).toBeTruthy())
    fireEvent.animationEnd(document.querySelector('.kids-chest-opening') as Element)
    await waitFor(() => expect(screen.getByRole('img')).toBeTruthy())
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('aberto')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('falha de rede devolve o baú ao estado clicável', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('sem rede')
    }) as unknown as typeof fetch
    montar(bau())
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    await waitFor(() => expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('já resgatado nasce aberto e sem botão', () => {
    process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = 'https://media.example.com/kids/chest.riv'
    montar(bau({ claimed: true }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('aberto')
    expect(
      document.querySelector('[data-chest-rive-opened]')?.getAttribute('data-chest-rive-opened'),
    ).toBe('true')
  })

  test('movimento reduzido conclui no SVG aberto, sem esperar animationend', async () => {
    movimentoReduzido(true)
    montar(bau())
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(document.querySelector('.kids-chest-opening')).toBeNull()
    expect(refreshes).toBe(1)
  })

  test('com Rive pronto, o prêmio espera a chegada ao estado terminal Open', async () => {
    process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = 'https://media.example.com/kids/chest.riv'
    montar(bau())
    await act(async () => {})
    const globals = globalThis as Record<string, unknown>
    await act(async () => (globals.chestRivePronto as (() => void) | undefined)?.())

    fireEvent.click(screen.getByRole('button'))
    await waitFor(() =>
      expect(
        document
          .querySelector('[data-chest-rive-opening]')
          ?.getAttribute('data-chest-rive-opening'),
      ).toBe('true'),
    )
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => (globals.chestRiveAbriu as (() => void) | undefined)?.())
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(
      document.querySelector('[data-chest-rive-opened]')?.getAttribute('data-chest-rive-opened'),
    ).toBe('true')
    expect(refreshes).toBe(1)
  })

  test('falha do Rive depois do claim espera a animação SVG antes de mostrar o prêmio', async () => {
    process.env.NEXT_PUBLIC_KIDS_CHEST_RIVE_URL = 'https://media.example.com/kids/chest.riv'
    montar(bau())
    await act(async () => {})
    const globals = globalThis as Record<string, unknown>
    await act(async () => (globals.chestRivePronto as (() => void) | undefined)?.())

    fireEvent.click(screen.getByRole('button'))
    await waitFor(() =>
      expect(
        document
          .querySelector('[data-chest-rive-opening]')
          ?.getAttribute('data-chest-rive-opening'),
      ).toBe('true'),
    )
    await act(async () => (globals.chestRiveFalhou as (() => void) | undefined)?.())
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.querySelector('.kids-chest-opening')).toBeTruthy())
    fireEvent.animationEnd(document.querySelector('.kids-chest-opening') as Element)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('aberto')
  })
})
