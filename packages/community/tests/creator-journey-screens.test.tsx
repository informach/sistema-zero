import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorSceneFixture } from '../../member-shell/qa/creator-journey-fixtures'
import {
  AdultCreatorNextStep,
  AdultCreatorPost,
  AdultCreatorStepper,
  AdultCreatorTrail,
  AdultMasteriesOpen,
  AdultMasteryArea,
  AdultMasteryHub,
} from '../src/components/community/journey/creator'

/** As telas adultas da Jornada do Criador (Estúdio à noite, 26/10/2026), com dados fictícios. */

test('the stage page uses the trail courses, the mission and the powers, Mural optional', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'one')
  const stage = view.stages[0]!
  const mission = catalog.find((course) => course.courseId === stage.mission.courseId)!
  const html = renderToStaticMarkup(
    <AdultCreatorTrail
      view={view}
      level={stage.level}
      catalog={catalog}
      mine={mine}
      capabilities={{ [stage.level]: ['studio', 'pinta'] }}
    />,
  )
  expect(html).toContain('sz-band')
  expect(html).toContain('Cursos da trilha')
  expect(html).toContain('Para concluir a etapa')
  expect(html).toContain('O Estúdio livre')
  expect(html).toContain('Publicar no Mural é opcional')
  expect(html).not.toContain(`href="/cursos/${mission.courseSlug}"`)
  expect(html).toContain('Abre depois dos cursos da trilha')
  expect(html).not.toContain('Concluir e publicar o jogo no Mural')
})

test('an unknown capability from the policy never breaks the stage page', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'pair')
  const stage = view.stages[0]!
  const html = renderToStaticMarkup(
    <AdultCreatorTrail
      view={view}
      level={stage.level}
      catalog={catalog}
      mine={mine}
      capabilities={{ [stage.level]: ['studio', 'nao-existe' as never] }}
    />,
  )
  expect(html).toContain('O Estúdio livre')
})

test('a course in preparation keeps its real title, with no lesson button', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'planned')
  const stage = view.stages[0]!
  const html = renderToStaticMarkup(
    <AdultCreatorTrail view={view} level={stage.level} catalog={catalog} mine={mine} />,
  )
  expect(html).toContain(stage.base2d.title!)
  expect(html).toContain('Curso em preparação')
  expect(html).not.toContain('Começar')
})

test('the next step points to the open course and respects access', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'one')
  const base3d = catalog.find((course) => course.courseId === view.stages[0]!.base3d.courseId)!
  const html = renderToStaticMarkup(
    <AdultCreatorNextStep view={view} catalog={catalog} mine={mine} />,
  )
  expect(html).toContain(`href="/cursos/${base3d.courseSlug}"`)
  expect(html).toContain('Ver a etapa')
  const locked = renderToStaticMarkup(
    <AdultCreatorNextStep
      view={view}
      catalog={catalog.map((course) => ({ ...course, hasAccess: false }))}
      mine={[]}
    />,
  )
  expect(locked).not.toContain(`href="/cursos/${base3d.courseSlug}"`)
})

test('the stepper marks where you are; at the start only that stage is a link', () => {
  const { view } = creatorSceneFixture('adult', 'pair')
  const html = renderToStaticMarkup(<AdultCreatorStepper view={view} />)
  expect(html).toContain(`href="/cursos/etapa/${view.level}"`)
  expect(html).toContain('Você está aqui')
  expect(html.match(/href="\/cursos\/etapa\//g)?.length).toBe(1)
})

test('masteries show the real entry, the rubric and the nucleus credit without inventing completion', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'fresh')
  const hub = renderToStaticMarkup(<AdultMasteryHub areas={view.masteries} view={view} />)
  expect(hub).toContain('Abre depois dos cursos da trilha')
  const area = view.masteries.find((item) => item.id === 'python2d')!
  const credited = {
    ...area,
    levels: area.levels.map((level) => ({ ...level, nucleusCompleted: true })),
  }
  const html = renderToStaticMarkup(
    <AdultMasteryArea area={credited} catalog={catalog} mine={mine} view={view} />,
  )
  expect(html).toContain(area.levels[0]!.rubric.criteria[0]!.title.replace(/^O aluno\b/, 'Você'))
  expect(html).not.toContain('Revisar curso')
})

test('a power with 2D and 3D versions gives each version its own action', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'pair')
  const stage = view.stages[0]!
  const [first, second] = stage.powers
  const done = { ...first!.courses[0]!, state: 'completed' as const }
  const other = { ...second!.courses[0]!, state: 'available' as const }
  const twoVersions = { ...stage, powers: [{ ...first!, courses: [done, other] }] }
  const html = renderToStaticMarkup(
    <AdultCreatorTrail
      view={{ ...view, stages: [twoVersions, ...view.stages.slice(1)] }}
      level={stage.level}
      catalog={catalog.map((course) =>
        course.courseId === other.courseId
          ? { ...course, track: '3d' as const }
          : course.courseId === done.courseId
            ? { ...course, track: '2d' as const }
            : course,
      )}
      mine={mine}
    />,
  )
  expect(html).toContain('2D: Abrir de novo')
  expect(html).toContain('3D: Começar')
})

test('the stepper opens only the stages already reached; the rest are gray and not links', () => {
  const { view } = creatorSceneFixture('adult', 'coder')
  const [faisca, construtor, inventor] = view.stages
  const html = renderToStaticMarkup(<AdultCreatorStepper view={view} />)
  for (const open of [faisca!, construtor!])
    expect(html).toContain(`href="/cursos/etapa/${open.level}"`)
  expect(html).not.toContain(`href="/cursos/etapa/${inventor!.level}"`)
  expect(html).toContain('Ainda bloqueada')
  // A Lenda só leva às Maestrias quando alcançada.
  expect(html).not.toContain('href="/maestrias"')
})

test('the team opens every stage and the legend from the stepper', () => {
  const { view } = creatorSceneFixture('adult', 'coder')
  const html = renderToStaticMarkup(<AdultCreatorStepper view={view} staff />)
  for (const stage of view.stages) expect(html).toContain(`href="/cursos/etapa/${stage.level}"`)
  expect(html).toContain('href="/maestrias"')
  expect(html).not.toContain('Ainda bloqueada')
})

test('reaching the legend opens it as the way to the masteries', () => {
  const { view } = creatorSceneFixture('adult', 'legend')
  expect(renderToStaticMarkup(<AdultCreatorStepper view={view} />)).toContain('href="/maestrias"')
})

test('a stage not reached yet stays locked, also by its address', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'pair')
  const future = view.stages[2]!
  const html = renderToStaticMarkup(
    <AdultCreatorPost view={view} level={future.level} catalog={catalog} mine={mine} />,
  )
  expect(html).toContain('Esta etapa ainda está bloqueada')
  expect(html).toContain(`a etapa ${future.title}`)
  // Embaixo, o caminho: o próximo passo da etapa em que a pessoa está.
  expect(html).toContain('O caminho até lá')
  expect(html).toContain(`href="/cursos/etapa/${view.level}"`)
  // Nenhum curso da etapa trancada vira link.
  const entries = [
    future.base2d,
    future.base3d,
    future.mission,
    ...future.powers.flatMap((power) => power.courses),
    ...future.extras,
  ]
  for (const entry of entries) {
    const slug = catalog.find((course) => course.courseId === entry.courseId)?.courseSlug
    if (slug) expect(html).not.toContain(`href="/cursos/${slug}"`)
  }
})

test('a course the server already opened keeps its future stage open, with the honest lead', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'pair')
  const future = view.stages[2]!
  const extra = { ...future.extras[0]!, state: 'available' as const }
  const opened = { ...future, extras: [extra, ...future.extras.slice(1)] }
  const html = renderToStaticMarkup(
    <AdultCreatorPost
      view={{ ...view, stages: view.stages.map((stage) => (stage === future ? opened : stage)) }}
      level={future.level}
      catalog={catalog}
      mine={mine}
    />,
  )
  expect(html).not.toContain('Esta etapa ainda está bloqueada')
  expect(html).toContain('Os cursos daqui que você já tem continuam abertos para você.')
})

test('the team sees a future stage in full', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'pair')
  const future = view.stages[2]!
  const html = renderToStaticMarkup(
    <AdultCreatorPost view={view} level={future.level} catalog={catalog} mine={mine} staff />,
  )
  expect(html).not.toContain('Esta etapa ainda está bloqueada')
  expect(html).toContain('Você vê esta etapa por ser da equipe.')
})

test('an open mastery gets its own way in while the legend is locked', () => {
  const { view } = creatorSceneFixture('adult', 'mission')
  const area = view.masteries[0]!
  const withOpen = {
    ...view,
    masteries: [{ ...area, available: true }, ...view.masteries.slice(1)],
  }
  expect(renderToStaticMarkup(<AdultMasteriesOpen view={withOpen} />)).toContain(
    'Você já pode começar uma Maestria',
  )
  const closed = {
    ...view,
    masteries: view.masteries.map((item) => ({ ...item, available: false })),
  }
  expect(renderToStaticMarkup(<AdultMasteriesOpen view={closed} />)).toBe('')
})

test('each mastery level is a real heading with the toggle inside it', () => {
  const { view, catalog, mine } = creatorSceneFixture('adult', 'mastery')
  const area = view.masteries[0]!
  const html = renderToStaticMarkup(
    <AdultMasteryArea area={area} catalog={catalog} mine={mine} view={view} />,
  )
  expect(html).not.toContain('<summary')
  expect(html.match(/<h2[^>]*><button[^>]*aria-expanded=/g)?.length).toBe(area.levels.length)
  expect(html.match(/aria-expanded="true"/g)?.length).toBe(1)
})
