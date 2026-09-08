import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { PracticeSessionView } from '@sistemazero/core/practice'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PracticeWorkshop } from '../src/components/kids/practice-workshop'

const initial: PracticeSessionView = {
  id: 'session-a',
  title: 'Repetições',
  courseSlug: 'loops',
  lessonId: 'lesson-a',
  createdAt: '2026-09-07T12:00:00Z',
  completedAt: null,
  questions: [
    {
      id: 'q',
      prompt: 'Qual bloco repete?',
      choices: [
        { id: 'repeat', label: 'Repetir' },
        { id: 'stop', label: 'Parar' },
      ],
      multiple: false,
    },
  ],
  answers: null,
  review: null,
}
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})
describe('oficina de prática', () => {
  test('retoma, envia e só então mostra a explicação recebida do servidor', async () => {
    const submissions: unknown[] = []
    const viewers: Array<string | null> = []
    globalThis.fetch = Object.assign(
      mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        submissions.push(typeof init?.body === 'string' ? JSON.parse(init.body) : null)
        viewers.push(new Headers(init?.headers).get('x-sz-viewer'))
        return Response.json({
          session: {
            ...initial,
            answers: { q: ['stop'] },
            completedAt: '2026-09-07T12:02:00Z',
            review: {
              score: 0,
              questions: [
                {
                  questionId: 'q',
                  correct: false,
                  correctChoiceIds: ['repeat'],
                  explanation: 'Repetir executa de novo.',
                },
              ],
            },
          },
        })
      }),
      { preconnect: originalFetch.preconnect },
    )
    render(<PracticeWorkshop profileId="child-a" enabled={true} courses={[]} history={[initial]} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }))
    expect(screen.queryByText('Repetir executa de novo.')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Parar' }))
    expect(JSON.parse(localStorage.getItem('sz-practice:child-a:session-a') ?? '{}')).toEqual({
      q: ['stop'],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir e entender' }))
    await waitFor(() => expect(screen.getByText('Repetir executa de novo.')).toBeTruthy())
    expect(submissions).toEqual([{ answers: { q: ['stop'] } }])
    expect(viewers).toEqual(['child-a'])
    expect(localStorage.getItem('sz-practice:child-a:session-a')).toBeNull()
    expect(screen.getByRole('link', { name: 'Rever a aula' }).getAttribute('href')).toBe(
      '/cursos/loops/aulas/lesson-a',
    )
  })
  test('rascunho de outro perfil não preenche respostas e sair da coorte conserva a retomada', () => {
    localStorage.setItem('sz-practice:child-a:session-a', JSON.stringify({ q: ['repeat'] }))
    render(
      <PracticeWorkshop profileId="child-b" enabled={false} courses={[]} history={[initial]} />,
    )
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }))
    const choice = screen.getByRole('radio', { name: 'Repetir' })
    if (!(choice instanceof HTMLInputElement)) throw new Error('Expected radio input')
    expect(choice.checked).toBe(false)
    const submit = screen.getByRole('button', { name: 'Conferir e entender' })
    if (!(submit instanceof HTMLButtonElement)) throw new Error('Expected submit button')
    expect(submit.disabled).toBe(true)
  })
  test('troca de perfil mostra a orientação do servidor e conserva as escolhas locais', async () => {
    globalThis.fetch = Object.assign(
      mock(async () =>
        Response.json(
          {
            error: {
              code: 'VIEWER_CHANGED',
              message: 'O perfil mudou. Atualize esta página antes de continuar a prática.',
            },
          },
          { status: 409 },
        ),
      ),
      { preconnect: originalFetch.preconnect },
    )
    render(<PracticeWorkshop profileId="child-a" enabled history={[initial]} courses={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Repetir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir e entender' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('O perfil mudou.'))
    expect(localStorage.getItem('sz-practice:child-a:session-a')).not.toBeNull()
    expect(screen.queryByText(/Você revisou/)).toBeNull()
  })
})
