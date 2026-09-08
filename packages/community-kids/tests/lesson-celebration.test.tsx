import { expect, test } from 'bun:test'
import { act, render, screen } from '@testing-library/react'
import { LessonCelebration } from '../src/components/kids/lesson-celebration'

test('completion keeps the server progress on a retry instead of adding another lesson', async () => {
  const progress = { completedLessons: 1, totalLessons: 2, percent: 50, lastCompletedAt: null }
  render(
    <LessonCelebration
      progressBefore={progress}
      progressAfter={progress}
      publicationPending={false}
      gamification={null}
      nextHref="/aula-2"
      courseHref="/cursos/jogo"
      onClose={() => {}}
    />,
  )
  await act(async () => {
    await Bun.sleep(400)
  })
  expect(screen.getByText('50%')).toBeTruthy()
  expect(screen.queryByText('100%')).toBeNull()
  expect(screen.getByRole('link', { name: 'Próxima aula' }).getAttribute('href')).toBe('/aula-2')
})

test('finishing mandatory lessons points to publication without claiming a rank upgrade', () => {
  render(
    <LessonCelebration
      progressBefore={{ completedLessons: 1, totalLessons: 2, percent: 50, lastCompletedAt: null }}
      progressAfter={{ completedLessons: 2, totalLessons: 2, percent: 100, lastCompletedAt: null }}
      publicationPending
      gamification={null}
      nextHref={null}
      courseHref="/cursos/jogo"
      onClose={() => {}}
    />,
  )
  expect(
    screen.getByRole('link', { name: 'Conferir publicação do projeto' }).getAttribute('href'),
  ).toBe('/cursos/jogo#publicar')
  expect(screen.getByText(/Confira a publicação do projeto/)).toBeTruthy()
  expect(screen.queryByText(/nível desbloqueado/i)).toBeNull()
})
