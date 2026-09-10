import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
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
let pedidos: string[] = []

beforeEach(() => {
  pedidos = []
  refreshes = 0
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    pedidos.push(String(input))
    return Response.json({ xpAwarded: 25, coinsAwarded: 15 })
  }) as unknown as typeof fetch
})

afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

function montar(chest: ModuleChestView | null) {
  return render(
    <TrailChest courseSlug="meu-curso" moduleId="m1" unitNumber={2} chest={chest} offset={0} />,
  )
}

describe('baú da trilha', () => {
  test('fechado não é botão (seria uma parada de foco que não faz nada)', () => {
    montar(bau({ unlocked: false }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('fechado')
  })

  test('liberado é botão e diz o XP antes de abrir, sem prometer moeda', () => {
    // O XP é fixo; a MOEDA passa pelo teto diário e pode sair zero. Anunciar "15
    // moedas" num dia em que a criança já bateu o teto seria promessa falsa.
    montar(bau())
    const botao = screen.getByRole('button')
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
  })

  test('outra aba já abriu: fica aberto, sem festa (nada foi ganho AGORA)', async () => {
    globalThis.fetch = (async () =>
      Response.json({ xpAwarded: 0, coinsAwarded: 0 })) as unknown as typeof fetch
    montar(bau())
    fireEvent.click(screen.getByRole('button'))
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
    expect(screen.getByRole('button')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('já resgatado nasce aberto e sem botão', () => {
    montar(bau({ claimed: true }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('aberto')
  })
})
