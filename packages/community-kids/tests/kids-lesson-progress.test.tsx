import { afterEach, describe, expect, test } from 'bun:test'
import type { SectionProgressView } from '@sistemazero/core/learning'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsLessonProgress } from '@/components/kids/kids-lesson-progress'

const progressoReal: SectionProgressView = {
  revision: 'r1',
  sections: [],
  completed: 1,
  total: 4,
  percent: 25,
}

afterEach(cleanup)

describe('a barra do topo da aula', () => {
  test('não some quando o servidor não manda o progresso das seções', () => {
    // É o caso da conta de EQUIPE (o members devolve `sectionProgress` undefined
    // para `privileged`) e o de toda aula legada. O esqueleto reserva o espaço da
    // barra, então ela ausente deixa um vão no cartão do topo.
    render(<KidsLessonProgress posicao={{ index: 1, total: 5 }} />)
    const barra = screen.getByRole('progressbar', { name: 'Progresso da aula' })
    expect(barra.getAttribute('aria-valuetext')).toBe('Seção 2 de 5')
    expect(barra.getAttribute('aria-valuenow')).toBe('40')
    // Duas vezes de propósito: o número em negrito (aria-hidden) e a região viva
    // que anuncia a troca de seção para o leitor de tela.
    expect(screen.getAllByText('Seção 2 de 5')).toHaveLength(2)
  })

  test('com o progresso do servidor, mostra a porcentagem', () => {
    render(<KidsLessonProgress progress={progressoReal} posicao={{ index: 0, total: 4 }} />)
    const barra = screen.getByRole('progressbar', { name: 'Progresso da aula' })
    expect(barra.getAttribute('aria-valuenow')).toBe('25')
    expect(screen.getByText('25%')).toBeTruthy()
    expect(screen.getByText('1 de 4 seções concluídas')).toBeTruthy()
  })

  test('sem nada a medir, vira o espaçador em vez de uma barra vazia', () => {
    render(<KidsLessonProgress posicao={{ index: 0, total: 1 }} atividades={[]} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
