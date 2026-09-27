import { afterEach, expect, spyOn, test } from 'bun:test'
import type { ManifestQuiz } from '@sistemazero/core/learning'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { QuizBlockView } from '@sistemazero/member-shell/components/quiz-block'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
const content: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'a',
      prompt: 'O que faz o Dino cair?',
      choices: [
        { id: 'gravity', label: 'Gravidade' },
        { id: 'color', label: 'Cor' },
      ],
      correctChoiceIds: ['gravity'],
      explanation: 'A gravidade muda o movimento.',
    },
    {
      id: 'b',
      prompt: 'Como ampliar a área de contato?',
      choices: [
        { id: 'area', label: 'Aumentar a área' },
        { id: 'sound', label: 'Mudar o som' },
      ],
      correctChoiceIds: ['area'],
      explanation: 'Som não muda o tamanho da área.',
    },
  ],
}
test('author preview grades locally and retains the resolved question during a retry', async () => {
  const fetch = spyOn(globalThis, 'fetch')
  try {
    render(<QuizBlockView blockId="quiz" content={content} quizState={null} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Gravidade' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mudar o som' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar quiz' }))
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Gravidade/ })).toHaveProperty('disabled', true),
    )
    expect(screen.getByRole('radio', { name: /Aumentar a área/ })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('radio', { name: /Aumentar a área/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar quiz' }))
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Aumentar a área/ })).toHaveProperty(
        'disabled',
        true,
      ),
    )
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    fetch.mockRestore()
  }
})
test('quiz draft returns for the same child and content, without appearing for a sibling', () => {
  const view = (id: string) => (
    <LessonPlayerProvider
      value={{
        lessonId: 'lesson',
        courseSlug: 'dino',
        viewerId: id,
        viewerWatermark: null,
        initialPositionSeconds: null,
      }}
    >
      <QuizBlockView blockId="quiz" content={content} quizState={null} />
    </LessonPlayerProvider>
  )
  const first = render(view('a'))
  fireEvent.click(screen.getByRole('radio', { name: 'Gravidade' }))
  first.unmount()
  const returned = render(view('a'))
  expect(screen.getByRole('radio', { name: 'Gravidade' })).toHaveProperty('checked', true)
  returned.rerender(view('b'))
  expect(screen.getByRole('radio', { name: 'Gravidade' })).toHaveProperty('checked', false)
})
