import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ToolsCelebration } from '../src/components/kids/tools-celebration'
import type { ToolsGain } from '../src/lib/tools-gain'

/**
 * A modal estourava a tela porque enumerava as gavetas DUAS vezes (título + chips), sem teto.
 * O que estes testes travam é o CONTRATO DE ALTURA: o número de chips não pode crescer com o
 * tamanho do ganho, e o título tampouco (esse fica em `tools-gain.test.ts`).
 */

function ref(label: string, family = 'Jogo 2D') {
  return { key: `${family} › ${label}`, family, label }
}

function ganho(quantas: number, family = 'Jogo 2D'): ToolsGain {
  return {
    novas: Array.from({ length: quantas }, (_, i) => ref(`Gaveta ${i}`, family)),
    cresceram: [],
  }
}

function chips(): string[] {
  const dialog = screen.getByRole('dialog')
  return Array.from(dialog.querySelectorAll('ul li')).map((li) => li.textContent?.trim() ?? '')
}

describe('ToolsCelebration', () => {
  test('ganho pequeno mostra todas as gavetas, sem "+N"', () => {
    render(<ToolsCelebration gain={ganho(3)} onClose={() => {}} />)
    expect(chips()).toEqual(['Gaveta 0', 'Gaveta 1', 'Gaveta 2'])
  })

  /** 🚨 O contrato: 30 gavetas ou 300, o número de chips é o mesmo. */
  test('🚨 ganho GRANDE para no teto e resume o resto', () => {
    render(<ToolsCelebration gain={ganho(30)} onClose={() => {}} />)
    const visiveis = chips()
    expect(visiveis).toHaveLength(5)
    expect(visiveis.at(-1)).toBe('+26')
  })

  test('nunca esconde UMA gaveta atrás de "+1"', () => {
    // 5 gavetas com teto 4: o "+1" ocuparia o mesmo espaço do chip, então mostra a gaveta.
    render(<ToolsCelebration gain={ganho(5)} onClose={() => {}} />)
    const visiveis = chips()
    expect(visiveis).toHaveLength(5)
    expect(visiveis.some((c) => c.startsWith('+'))).toBe(false)
  })

  test('o "+N" tem nome acessível (sozinho ele não diz nada em voz alta)', () => {
    render(<ToolsCelebration gain={ganho(30)} onClose={() => {}} />)
    expect(screen.getByLabelText('e mais 26 ferramentas')).toBeTruthy()
  })

  test('a família aparece quando o ganho é todo dela, e some na mistura', () => {
    const { unmount } = render(<ToolsCelebration gain={ganho(2)} onClose={() => {}} />)
    expect(screen.getByText('no 🎮 Jogo 2D')).toBeTruthy()
    unmount()

    render(
      <ToolsCelebration
        gain={{ novas: [ref('A'), ref('B', 'Jogo 3D')], cresceram: [] }}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText(/^no /)).toBeNull()
  })

  test('o rótulo do diálogo é o título CURTO, não a lista', () => {
    render(<ToolsCelebration gain={ganho(30)} onClose={() => {}} />)
    const label = screen.getByRole('dialog').getAttribute('aria-label') ?? ''
    expect(label).toBe('Você ganhou 30 ferramentas novas!')
    expect(label).not.toContain('Gaveta')
  })
})
