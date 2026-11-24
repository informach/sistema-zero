import { expect, test } from 'bun:test'
import { config2D } from './construtor-2d'

test('a primeira aula termina com a nave pilotável e limitada, com o caderno apenas na parte 2', () => {
  const first = config2D.aulas[0]!
  const delivery = first.trechos.find((part) => part.kind === 'delivery')!
  const project = config2D.montarProjeto(delivery.etapa!) as any
  const frame = project.ir.behavior.loops.find((node: any) => node.type === 'g2d:updateEachFrame')
  const guard = frame.body.find(
    (node: any) =>
      node.type === 'if' && node.cond?.type === 'g2d:sceneIs' && node.cond.name === 'jogando',
  )
  const move = guard.then.findIndex((node: any) => node.type === 'g2d:arrowsX')
  const limit = guard.then.findIndex((node: any) => node.type === 'g2d:clampToScreen')
  expect(move).toBeGreaterThanOrEqual(0)
  expect(limit).toBeGreaterThan(move)
  expect(first.trechos[0]!.kind).toBe('intro')
  expect(first.trechos[1]!.kind).toBe('material')
  expect(
    config2D.aulas.flatMap((aula) => aula.trechos).filter((part) => part.kind === 'material'),
  ).toHaveLength(1)
})

test('o disparo nasce antes de ganhar voo, e a revisão do intervalo sucede a experiência dos asteroides', () => {
  const originLesson = config2D.aulas[1]!
  const flightLesson = config2D.aulas[2]!
  const origin = originLesson.trechos.find((part) => part.kind === 'delivery')!
  expect(origin.etapa).toBe(flightLesson.entryStage)
  const project = config2D.montarProjeto(origin.etapa!) as any
  const space = project.ir.behavior.events.find(
    (node: any) => node.type === 'g2d:onKey' && node.key === 'Space',
  )
  const shot = space.body[0].then.find((node: any) => node.type === 'g2d:spawnImageInGroup')
  expect(shot.x.type).toBe('binop')
  expect(shot.y.type).toBe('binop')
  expect(shot.vy.value).toBe(0)
  const timeline = config2D.aulas.flatMap((aula) => aula.trechos)
  const experience = timeline.findIndex((part) => part.key === 'intervalo-das-pedras')
  const revision = timeline.findIndex((part) =>
    part.quiz?.questions.some((question) => question.id === 'intervalo'),
  )
  expect(experience).toBeGreaterThanOrEqual(0)
  expect(revision).toBeGreaterThan(experience)
})
