import { afterEach, describe, expect, test } from 'bun:test'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsMascot } from '@/components/kids/mascot'
import { parseLessonBlock } from '@/lib/lesson-block-content'
import type { LessonBlockView } from '@/lib/types'

/**
 * Bloco de diálogo do Zappy: o mascote fala num balão, no lugar de contexto
 * corrido. Para criança, "o Zappy te explicando" lê melhor que um parágrafo solto
 * acima da atividade.
 */
afterEach(cleanup)

const bloco = (content: unknown): LessonBlockView =>
  ({ id: 'b1', kind: 'dialogue', sortOrder: 0, content }) as unknown as LessonBlockView

describe('bloco de diálogo', () => {
  test('o parser do kids reconhece o bloco, com e sem pose', () => {
    // ⚠️ Sem entrada aqui o bloco SOME da aula kids, sem erro nenhum.
    expect(parseLessonBlock(bloco({ kind: 'dialogue', text: 'Oi!' }))).toBeTruthy()
    expect(parseLessonBlock(bloco({ kind: 'dialogue', pose: 'happy', text: 'Oi!' }))).toBeTruthy()
  })

  test('o parser recusa fala vazia, fala não-texto e pose inventada', () => {
    expect(parseLessonBlock(bloco({ kind: 'dialogue', text: '' }))).toBeNull()
    expect(parseLessonBlock(bloco({ kind: 'dialogue' }))).toBeNull()
    expect(parseLessonBlock(bloco({ kind: 'dialogue', text: 42 }))).toBeNull()
    expect(parseLessonBlock(bloco({ kind: 'dialogue', pose: 'sleeping', text: 'Oi!' }))).toBeNull()
  })

  test('a fala é texto de verdade e o mascote é decorativo', () => {
    render(
      <DialogueBlockView
        content={{ kind: 'dialogue', pose: 'speaking', text: 'Vamos fazer\no dino pular!' }}
        mascot={<KidsMascot expression="speaking" />}
      />,
    )
    // O texto é lido normalmente; nada de role="status" (isto não é aviso).
    expect(screen.getByText(/Vamos fazer/).closest('[role="status"]')).toBeNull()
    // O mascote some para o leitor de tela: quem dá o significado é o chip visível.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    // Quebra de linha preservada na apresentação (a fala é texto simples).
    expect(screen.getByText(/Vamos fazer/).className).toContain('whitespace-pre-line')
  })

  test('sem mascote (comunidade adulta) o balão vira recado, sem cauda', () => {
    const { container } = render(
      <DialogueBlockView content={{ kind: 'dialogue', text: 'Recado do professor.' }} />,
    )
    expect(screen.getByText('Recado do professor.')).toBeTruthy()
    // A cauda só faz sentido apontando para alguém.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })
})
