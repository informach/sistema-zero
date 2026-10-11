import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import EntryHelpPage from '../src/app/(auth)/ajuda/entrar/page'

describe('ajuda para entrar, antes do login', () => {
  test('cita só rótulos reais e o "Sair deste aparelho"', () => {
    const { container } = render(<EntryHelpPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { name: 'Como entro para criar?' })).toBeTruthy()
    // "Sou aluno. Como entro?" e "Entrar como aluno" não são botões de lugar nenhum.
    expect(text).not.toContain('Sou aluno. Como entro?')
    expect(text).not.toContain('Entrar como aluno')
    expect(text).toContain(
      'Terminou por hoje? É só fechar a página. Se clicar em Sair e depois em Sair deste aparelho, você vai precisar de outro código.',
    )
    expect(text).toContain(
      'A entrada das crianças mudou: o responsável prepara o acesso uma vez em cada computador.',
    )
    expect(text).not.toMatch(/\btoqu?e\b/i)
  })

  test('o guia dos pais segue as ações da tela, na ordem', () => {
    const { container } = render(<EntryHelpPage />)
    const text = container.textContent ?? ''
    const order = [
      'Autorizar aparelho',
      'Neste aparelho',
      'Em outro aparelho',
      'Por quanto tempo?',
      'Autorizar este aparelho',
      'Gerar código',
      'Copiar',
      'Conferir se a criança já entrou',
    ].map((label) => text.indexOf(label))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    for (const label of ['Renovar prazo', 'Encerrar acesso', 'Trocar de perfil'])
      expect(text).toContain(label)
    // Dois irmãos no mesmo computador, e o acesso encerrado que só volta autorizando de novo.
    expect(text).toContain('André e Débora usam o computador de casa')
    expect(text).toContain('Um acesso encerrado não volta.')
  })

  test('cada pergunta e o link do pé têm alvo de toque de 44px', () => {
    const { container } = render(<EntryHelpPage />)
    const summaries = [...container.querySelectorAll('summary')]
    expect(summaries.length).toBeGreaterThan(3)
    for (const summary of summaries) expect(summary.className).toContain('min-h-11')
    expect(screen.getByRole('link', { name: 'Voltar à escolha de entrada' }).className).toContain(
      'min-h-11',
    )
  })
})
