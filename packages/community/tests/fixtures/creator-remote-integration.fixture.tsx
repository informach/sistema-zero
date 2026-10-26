import { beforeEach, expect, mock, test } from 'bun:test'
import { type AdultJourneyView, projectAdultJourney } from '@sistemazero/core/journey'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../../../member-shell/qa/creator-journey-fixtures'

const fixture = creatorSceneFixture('adult', 'fresh')
const current = () =>
  projectAdultJourney({ schemaVersion: 1, stages: [], curriculum: fixture.curriculum }, 1, [])
let journey: AdultJourneyView | null = current()
mock.module('@/server/members', () => ({
  listCatalog: async () => ({ status: 200, body: { courses: fixture.catalog.slice(0, 8) } }),
  listMyCourses: async () => ({ status: 200, body: { courses: [] } }),
}))
mock.module('@/server/shell', () => ({
  shell: { members: { getGamificationReadonly: async () => ({ status: 200, body: { journey } }) } },
}))
mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/cursos',
  useRouter: () => ({ replace() {}, push() {} }),
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`)
  },
}))
const { default: StagePage } = await import('../../src/app/(app)/cursos/etapa/[id]/page')
const { default: CatalogPage } = await import('../../src/app/(app)/cursos/page')
beforeEach(() => {
  journey = current()
})

test('the post uses both base courses and mission/power requirements, without the old Mural gate', async () => {
  const html = renderToStaticMarkup(await StagePage({ params: Promise.resolve({ id: 'noob' }) }))
  expect(html).toContain('Cursos da trilha')
  expect(html).toContain('Missão')
  expect(html).toContain('Poderes')
  expect(html).toContain('Nesta etapa você ganha')
  expect(html).toContain('Publicar no Mural é opcional')
  expect(html).not.toContain('Concluir e publicar o jogo no Mural')
  expect(html).toContain('sz-band')
})

test('historical stages retain the new remote unlock tiles, including both preserved Molda bands', async () => {
  journey = projectAdultJourney(
    {
      schemaVersion: 1,
      stages: [
        {
          id: 'legacy',
          title: 'Minha etapa',
          requirements: [{ courseId: fixture.catalog[0]!.courseId!, milestone: 'complete' }],
          capabilities: ['molda', 'molda-intermediate', 'molda-professional'],
        },
      ],
    },
    1,
    [],
  )
  const html = renderToStaticMarkup(await StagePage({ params: Promise.resolve({ id: 'legacy' }) }))
  expect(html).toContain('Ao concluir, libera')
  expect(html).toContain('Molda intermediário')
  expect(html).toContain('Molda profissional')
  expect(html).toContain('Onde você está na jornada')
})

test('catalog uses the curriculum map while retaining remote copy for historical journeys', async () => {
  const html = renderToStaticMarkup(await CatalogPage())
  expect(html).toContain('Sete etapas até a Lenda')
  expect(html).toContain('aria-label="Etapas da jornada"')
  expect(html).toContain('/maestrias')
  expect(html).toContain('/cursos/etapa/noob')
  journey = null
  const legacy = renderToStaticMarkup(await CatalogPage())
  expect(legacy).toContain('Cada curso termina com um jogo seu')
  expect(legacy.includes('aria-label="Seu próximo passo na jornada"')).toBe(false)
  expect(legacy.includes('href="/cursos/trilha/2d"')).toBe(true)
})

test('Lenda goes to masteries and a nonexistent curriculum post stays 404', async () => {
  await expect(StagePage({ params: Promise.resolve({ id: 'lenda' }) })).rejects.toThrow(
    'REDIRECT:/maestrias',
  )
  await expect(StagePage({ params: Promise.resolve({ id: 'missing' }) })).rejects.toThrow(
    'NOT_FOUND',
  )
})
