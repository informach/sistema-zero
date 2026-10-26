import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { creatorSceneFixture } from '../../member-shell/qa/creator-journey-fixtures'
import { KidsCreatorCatalog, KidsCreatorPost } from '../src/components/kids/creator-curriculum-page'
import { CreatorJourneyMapKids } from '../src/components/kids/creator-journey/map'
import {
  KidsMasteryArea,
  KidsMasteryHub,
  MasteryHowItWorks,
} from '../src/components/kids/creator-journey/mastery'
import { KidsCreatorTrail } from '../src/components/kids/creator-journey/trail'

afterEach(cleanup)

/** As telas Kids da Jornada do Criador (26/10/2026), com os componentes das páginas de verdade. */

test('with one trail course done, the mission is not a link and says what opens it', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'one')
  const stage = view.stages[0]!
  const mission = catalog.find((course) => course.courseId === stage.mission.courseId)!
  const { container } = render(
    <KidsCreatorTrail view={view} level={stage.level} catalog={catalog} mine={mine} />,
  )
  expect(container.innerHTML.includes(`href="/cursos/${mission.courseSlug}"`)).toBe(false)
  expect(container.textContent).toContain('Cursos da trilha')
  expect(container.textContent).toContain('Abre depois dos cursos da trilha')
  expect(container.textContent).toContain(`Para virar ${view.stages[1]!.title}`)
})

test('a course in preparation keeps its title and offers no lesson button', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'planned')
  const stage = view.stages[0]!
  const { container } = render(
    <KidsCreatorTrail view={view} level={stage.level} catalog={catalog} mine={mine} />,
  )
  expect(container.textContent).toContain(stage.base2d.title!)
  expect(container.textContent).toContain('Curso em preparação')
  const courseLinks = [...container.querySelectorAll('section a')].filter((link) =>
    /^\/cursos\/(?!trilha)/.test(link.getAttribute('href') ?? ''),
  )
  expect(courseLinks.length).toBe(0)
})

test('a trail the child has not reached stays locked, also by its address', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'pair')
  const future = view.stages[2]!
  const { container } = render(
    <KidsCreatorPost view={view} level={future.level} courses={catalog} mine={mine} />,
  )
  expect(container.textContent).toContain('Esta parte do mapa ainda está bloqueada')
  expect(container.textContent).toContain(`Trilha ${future.title}`)
  const courseLinks = [...container.querySelectorAll('a')].filter((link) =>
    link.getAttribute('href')?.startsWith('/cursos/'),
  )
  expect(courseLinks.length).toBe(0)
})

test('a course the server already opened (separate purchase) keeps its trail open', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'direct')
  const stage = view.stages[0]!
  const { container } = render(
    <KidsCreatorPost view={view} level={stage.level} courses={catalog} mine={mine} />,
  )
  expect(container.textContent).not.toContain('Esta parte do mapa ainda está bloqueada')
})

test('the map opens only the posts already reached; the rest are gray and not links', () => {
  const { view } = creatorSceneFixture('kids', 'coder')
  const { container } = render(<CreatorJourneyMapKids view={view} />)
  expect(container.querySelector('[aria-current="step"]') !== null).toBe(true)
  const [faisca, construtor, inventor] = view.stages
  for (const open of [faisca!, construtor!])
    expect(container.querySelector(`a[href="/cursos/trilha/${open.level}"]`) !== null).toBe(true)
  expect(container.querySelector(`a[href="/cursos/trilha/${inventor!.level}"]`) === null).toBe(true)
  expect(container.textContent).toContain('Ainda bloqueada')
  // A Lenda só abre quando alcançada.
  expect(container.querySelector('a[href="/maestrias"]') === null).toBe(true)
})

test('reaching the legend opens it as the way to the masteries', () => {
  const { view } = creatorSceneFixture('kids', 'legend')
  const { container } = render(<CreatorJourneyMapKids view={view} />)
  expect(container.querySelector('a[href="/maestrias"]') !== null).toBe(true)
})

test('the catalog shows the current trail and keeps every course reachable', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'mission')
  const { container } = render(<KidsCreatorCatalog view={view} courses={catalog} mine={mine} />)
  expect(container.textContent).toContain('Sua trilha agora')
  expect(container.textContent).toContain('Todos os cursos e seus acessos')
})

test('masteries explain the area entry and the art approach without editor conversion', () => {
  const { view } = creatorSceneFixture('kids', 'fresh')
  const hub = render(<KidsMasteryHub areas={view.masteries} view={view} />)
  expect(hub.container.textContent).toContain('Abre depois dos cursos da trilha')
  cleanup()
  const art = view.masteries.find((area) => area.id === 'arte2d')!
  const { container } = render(<MasteryHowItWorks area={art} />)
  expect(container.textContent).toContain('O jogo base já funciona')
})

test('each mastery level is a real heading with the toggle inside it', () => {
  const { view, catalog, mine } = creatorSceneFixture('kids', 'mastery')
  const area = view.masteries[0]!
  const { container } = render(
    <KidsMasteryArea area={area} catalog={catalog} mine={mine} view={view} />,
  )
  expect(container.querySelector('summary')).toBeNull()
  const toggles = [...container.querySelectorAll('h2 > button[aria-expanded]')]
  expect(toggles.length).toBe(area.levels.length)
  expect(toggles.filter((button) => button.getAttribute('aria-expanded') === 'true').length).toBe(1)
  // O nome do botão é o "Nível N" com o título; a lista de títulos da página os mostra.
  const first = toggles[0]!
  const name = first
    .getAttribute('aria-labelledby')!
    .split(' ')
    .map((id) => container.querySelector(`[id="${id}"]`)?.textContent)
    .join(' ')
  expect(name).toContain('Nível I')
  // Abrir e fechar pelo botão de verdade.
  const closed = toggles.find((button) => button.getAttribute('aria-expanded') === 'false')!
  const panel = container.querySelector(`[id="${closed.getAttribute('aria-controls')}"]`)!
  expect(panel.hasAttribute('hidden')).toBe(true)
  fireEvent.click(closed)
  expect(closed.getAttribute('aria-expanded')).toBe('true')
  expect(panel.hasAttribute('hidden')).toBe(false)
})
