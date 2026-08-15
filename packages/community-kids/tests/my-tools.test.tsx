import { describe, expect, test } from 'bun:test'
import type { StudioDrawer } from '@sistemazero/member-shell/server/studio-unlocks'
import { render, screen } from '@testing-library/react'
import { MyTools } from '../src/components/kids/my-tools'

/**
 * "Minhas ferramentas" agrupa por FAMÍLIA por dois motivos que andam juntos: a fileira única
 * de pílulas crescia sem limite, e nomes de gaveta se REPETEM entre extensões (`📋 Listas`
 * existe no HTML e na Programação; `🔊 Som` em quatro famílias). Sem o topo do caminho as
 * homônimas ficavam lado a lado, indistinguíveis.
 */

function drawer(family: string, label: string, count: number): StudioDrawer {
  return { key: `${family} › ${label}`, family, label, count }
}

function detalhes(): HTMLDetailsElement[] {
  return Array.from(document.querySelectorAll('details'))
}

describe('MyTools', () => {
  test('sem ferramenta nenhuma a seção some', () => {
    const { container } = render(<MyTools drawers={[]} studioOwned />)
    expect(container.firstChild).toBeNull()
  })

  test('agrupa por família, com o total de gavetas e blocos', () => {
    render(
      <MyTools
        drawers={[
          drawer('Jogo 2D', '🚀 Kit espaço', 8),
          drawer('Jogo 2D', '❤️ Vida', 4),
          drawer('Programação', '🏷️ Variáveis', 3),
        ]}
        studioOwned
      />,
    )
    expect(screen.getByText('Você conquistou 3 gavetas com 15 blocos no seu Estúdio.')).toBeTruthy()

    const grupos = detalhes()
    expect(grupos).toHaveLength(2)
    expect(grupos[0]?.textContent).toContain('Jogo 2D')
    expect(grupos[0]?.textContent).toContain('2 gavetas')
    expect(grupos[0]?.textContent).toContain('12 blocos')
    expect(grupos[1]?.textContent).toContain('1 gaveta')
    expect(grupos[1]?.textContent).toContain('3 blocos')
  })

  test('só a primeira família (a mais cheia) começa aberta', () => {
    render(
      <MyTools
        drawers={[drawer('Jogo 2D', '🚀 Kit espaço', 8), drawer('Programação', '🏷️ Variáveis', 3)]}
        studioOwned
      />,
    )
    const grupos = detalhes()
    expect(grupos[0]?.open).toBe(true)
    expect(grupos[1]?.open).toBe(false)
  })

  /** 🚨 O defeito de modelo: as duas gavetas se chamam igual e vinham fundidas numa só. */
  test('🚨 gavetas HOMÔNIMAS aparecem separadas, cada uma na sua família', () => {
    render(
      <MyTools
        drawers={[drawer('HTML', '📋 Listas', 2), drawer('Programação', '📋 Listas', 12)]}
        studioOwned
      />,
    )
    const grupos = detalhes()
    expect(grupos).toHaveLength(2)
    // O rótulo aparece DUAS vezes, uma dentro de cada família.
    expect(screen.getAllByText('📋 Listas')).toHaveLength(2)
    expect(grupos.some((g) => g.textContent?.includes('HTML'))).toBe(true)
    expect(grupos.some((g) => g.textContent?.includes('Programação'))).toBe(true)
  })

  test('família fora do mapa de emoji sai com o nome puro, sem sumir', () => {
    render(<MyTools drawers={[drawer('Extensão do Futuro', '🪄 Mágica', 2)]} studioOwned />)
    expect(screen.getByText('Extensão do Futuro')).toBeTruthy()
    expect(screen.getByText('🪄 Mágica')).toBeTruthy()
  })

  test('o atalho do Estúdio só existe com o produto comprado', () => {
    const tools = [drawer('Jogo 2D', '❤️ Vida', 4)]
    const { unmount } = render(<MyTools drawers={tools} studioOwned={false} />)
    expect(screen.queryByText('Abrir o Estúdio')).toBeNull()
    unmount()

    render(<MyTools drawers={tools} studioOwned />)
    expect(screen.getByText('Abrir o Estúdio')).toBeTruthy()
  })
})
