import { describe, expect, test } from 'bun:test'
import type { ProjectPlayActivity } from '@sistemazero/core/learning'
import { renderToStaticMarkup } from 'react-dom/server'
import { montarProjetoCadeTodoMundoCompleto } from '../../../docs/aulas-interativas/qa/cade-todo-mundo-projeto'
import {
  clickedProjectPlayTarget,
  ProjectPlayActivityView,
} from '../src/components/project-play-activity'

const activity: ProjectPlayActivity = {
  type: 'project-play',
  project: montarProjetoCadeTodoMundoCompleto(),
  stage: { width: 640, height: 360 },
  targets: [
    { id: 'arbusto', label: 'no arbusto', x: 60, y: 166, width: 154, height: 116 },
    { id: 'pedras', label: 'nas pedras', x: 229.5, y: 170, width: 161, height: 112 },
    { id: 'flores', label: 'nas flores', x: 416.5, y: 138, width: 133, height: 144 },
  ],
}

describe('jogo pronto na seção', () => {
  test('reconhece somente pontos de esconderijos declarados', () => {
    expect(clickedProjectPlayTarget(activity, { type: 'sz:g2d:group-click', x: 137, y: 224 })).toBe(
      'arbusto',
    )
    expect(
      clickedProjectPlayTarget(activity, { type: 'sz:g2d:group-click', x: 20, y: 20 }),
    ).toBeNull()
    expect(clickedProjectPlayTarget(activity, { type: 'outro', x: 137, y: 224 })).toBeNull()
  })

  test('mostra o jogo isolado, os controles acessíveis e o modo ampliado', () => {
    const html = renderToStaticMarkup(
      <ProjectPlayActivityView activity={activity} answers={{}} onChange={() => {}} />,
    )
    expect(html).toContain('sandbox="allow-scripts allow-modals allow-pointer-lock"')
    expect(html).not.toContain('allow-same-origin')
    expect(html).toContain('Ampliar jogo')
    expect(html).toContain('Procurar no arbusto')
    expect(html).toContain('Procurar nas pedras')
    expect(html).toContain('Procurar nas flores')
  })
})
