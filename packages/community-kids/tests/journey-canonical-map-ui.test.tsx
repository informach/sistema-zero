import { afterEach, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { JourneyMap } from '../src/components/kids/journey-map'
import { accessibleJourneyLevels, tierCompletionByLevel } from '../src/lib/journey-map'
import { course, view } from './fixtures/canonical-journey-map'

afterEach(cleanup)

test('retained access opens the moved trail in the map without celebrating or awarding its later rank', () => {
  const journey = view()
  render(
    <JourneyMap
      journey={journey}
      accessibleLevels={accessibleJourneyLevels(journey, [course])}
      completionByLevel={tierCompletionByLevel([course], journey)}
    />,
  )
  const future = screen.getByRole('link', { name: 'Abrir a trilha Lenda' })
  expect(future.getAttribute('href')).toBe('/cursos/trilha/god')
  expect(future.textContent).toContain('posto por conquistar')
  expect(future.querySelector('svg.lucide-check') === null).toBe(true)
  expect(screen.queryByText('O topo da jornada!') === null).toBe(true)
  expect(screen.getByText('Você está aqui').closest('a')?.getAttribute('href')).toBe(
    '/cursos/trilha/coder',
  )
  expect(journey.earned.level).toBe('coder')
})

test('a course still locked by the server cannot turn a later map node into a link', () => {
  const journey = view()
  const locked = {
    ...course,
    careerLock: { locked: true as const, reason: 'future-tier' as const },
  }
  render(
    <JourneyMap journey={journey} accessibleLevels={accessibleJourneyLevels(journey, [locked])} />,
  )
  expect(screen.queryByRole('link', { name: 'Abrir a trilha Lenda' }) === null).toBe(true)
  expect(screen.getByRole('button', { name: 'Lenda, ainda bloqueado' })).toBeTruthy()
  expect(journey.earned.level).toBe('coder')
})
