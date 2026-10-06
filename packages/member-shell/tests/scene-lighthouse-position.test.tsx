import { describe, expect, test } from 'bun:test'
import {
  LIGHTHOUSE_POSITION,
  openScene,
  type SceneAction,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationStage, SceneButton } from '../src/components/exploration-stage'
import { Medida } from '../src/components/scene-bench'
import { LessonSceneControls } from '../src/components/scene-lesson-controls'
import {
  LighthousePositionControls,
  LighthousePositionStage,
} from '../src/components/scene-lighthouse-position'

const start = { scene: 'lighthouse-position' } as const
const activity = { type: 'experimentation', ...start } as const
function elements(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap((child) => elements(child, type))
  if (!isValidElement(node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  const children = elements(element.props.children as ReactNode, type)
  return element.type === type ? [element, ...children] : children
}
const keyImage = (html: string) => html.match(/<image data-chave=""[^>]+>/)?.[0]

describe('a experiência do lugar da chave', () => {
  test('usa as medidas do jogo: o deslocamento conserva a caixa da chave, o personagem e o farol', () => {
    expect(LIGHTHOUSE_POSITION.start).toEqual({ x: FAROL_LAYOUT.chave.x, y: FAROL_LAYOUT.chave.y })
    expect(LIGHTHOUSE_POSITION.x.max + FAROL_LAYOUT.chave.w).toBe(FAROL_LAYOUT.palco.w)
    expect(LIGHTHOUSE_POSITION.y.max + FAROL_LAYOUT.chave.h).toBe(FAROL_LAYOUT.palco.h)
    const initial = openScene(start)
    const before = renderToStaticMarkup(<LighthousePositionStage state={initial} />)
    const moved = stepScene(start, initial, { type: 'key-position', axis: 'x', value: 160 })
    const after = renderToStaticMarkup(<LighthousePositionStage state={moved} />)
    expect(before).toContain('viewBox="0 0 480 360"')
    expect(before).toContain('data-fundo="farol"')
    expect(before).not.toContain('data-posicao-anterior')
    expect(keyImage(before)).toContain('x="211" y="53" width="32" height="32"')
    expect(keyImage(after)).toContain('x="160" y="53" width="32" height="32"')
    expect(after).toContain('data-posicao-anterior')
    expect(after).toContain('A chave mudou de x 211, y 53 para x 160, y 53.')
    expect(before.match(/<image data-farol=""[^>]+>/)?.[0]).toBe(
      after.match(/<image data-farol=""[^>]+>/)?.[0],
    )
  })

  test('o player entrega o palco do Farol e controles digitáveis, deslizantes e botões de passo', () => {
    const state = openScene(start)
    const stage = renderToStaticMarkup(
      <ExplorationStage activity={activity} state={state} dispatch={() => {}} />,
    )
    expect(stage).toContain('O lugar da chave no mapa do Farol')
    const controls = renderToStaticMarkup(
      <LessonSceneControls
        scene={start.scene}
        state={state}
        dispatch={() => {}}
        goals={[]}
        onRunning={() => {}}
      />,
    )
    expect(controls).toContain('aria-label="Digitar Posição horizontal x"')
    expect(controls).toContain('aria-label="Digitar Posição vertical y"')
    expect(controls.match(/type="range"/g)).toHaveLength(2)
    expect(controls.match(/inputMode="numeric"/g)).toHaveLength(2)
    expect(controls).toContain('Aumentar Posição horizontal x em 20')
    expect(controls).toContain('Diminuir Posição vertical y em 20')
    expect(controls).toContain('>Recomeçar<')
    expect(controls).not.toContain('Velocidade')
  })

  test('a descrição para o leitor de tela diz o lugar pelos números, também no caso do professor', () => {
    const fabrica = renderToStaticMarkup(<LighthousePositionStage state={openScene(start)} />)
    expect(fabrica).toContain('A chave está em x 211, y 53, perto da trilha.')
    expect(fabrica).not.toContain('acima da trilha')
    const caso = {
      ...start,
      setup: {
        actions: [
          { type: 'key-position', axis: 'x', value: 160 },
          { type: 'key-position', axis: 'y', value: 250 },
        ] satisfies SceneAction[],
      },
    }
    let state = openScene(caso)
    expect(renderToStaticMarkup(<LighthousePositionStage state={state} />)).toContain(
      'A chave está em x 160, y 250, na parte de baixo.',
    )
    const dispatch = (action: SceneAction) => {
      state = stepScene(caso, state, action)
    }
    const [horizontal] = elements(LighthousePositionControls({ state, dispatch }), Medida)
    ;(horizontal?.props.onChange as (value: number) => void)(300)
    const [restart] = elements(LighthousePositionControls({ state, dispatch }), SceneButton)
    ;(restart?.props.onClick as () => void)()
    expect(state.keyPosition).toEqual({ x: 160, y: 250, before: null })
    expect(state.caption).toBe('A chave voltou ao começo: x 160, y 250.')
    // Um lugar que não é sugestão do Mapa fica só com os números.
    const solto = stepScene(start, openScene(start), {
      type: 'key-position',
      axis: 'x',
      value: 300,
    })
    const semAnterior = { ...solto, keyPosition: { ...solto.keyPosition, before: null } }
    expect(renderToStaticMarkup(<LighthousePositionStage state={semAnterior} />)).toContain(
      'A chave está em x 300, y 53. O personagem',
    )
  })

  test('os gestos da bancada movem apenas o eixo escolhido e Recomeçar restaura o lugar inicial', () => {
    let state = openScene(start)
    const dispatch = (action: SceneAction) => {
      state = stepScene(start, state, action)
    }
    const controls = LighthousePositionControls({ state, dispatch })
    const [horizontal, vertical] = elements(controls, Medida)
    ;(horizontal?.props.onChange as (value: number) => void)(160)
    expect(state.keyPosition).toEqual({ x: 160, y: 53, before: { x: 211, y: 53 } })
    ;(vertical?.props.onChange as (value: number) => void)(250)
    expect(state.keyPosition).toEqual({ x: 160, y: 250, before: { x: 160, y: 53 } })
    const after = renderToStaticMarkup(<LighthousePositionStage state={state} />)
    expect(keyImage(after)).toContain('x="160" y="250" width="32" height="32"')
    const [restart] = elements(controls, SceneButton)
    ;(restart?.props.onClick as () => void)()
    expect(state.keyPosition).toEqual({ x: 211, y: 53, before: null })
    expect(state.evidence.discoveries).toEqual(['mover-horizontal', 'mover-vertical'])
  })
})
