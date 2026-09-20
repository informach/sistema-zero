import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  type ExperimentationActivity,
  isSceneSetup,
  type SceneAction,
  type SceneId,
  sceneTargets,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActionEditor, sceneActionChoices } from '../src/components/editor/scene-action-editor'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SceneSetupEditor } = await import('../src/components/editor/scene-setup-editor')

test('o professor escolhe o caso das vidas e adapta o texto sem trocar o motor', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: ExperimentationActivity = { type: 'experimentation', scene: 'once-vs-always' }
  const render = () =>
    root.render(
      <SceneSetupEditor
        activity={activity}
        onChange={(next) => {
          activity = next as ExperimentationActivity
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    const select = container.querySelector<HTMLSelectElement>('select')
    expect(select?.querySelectorAll('option')).toHaveLength(5)
    await act(async () => {
      if (!select) throw new Error('Seletor do caso ausente')
      select.value = 'uma-ficha-vidas'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(activity.setup?.preset?.id).toBe('uma-ficha-vidas')
    expect(activity.setup?.goals).toBeUndefined()
    expect(sceneTargets(activity)).toEqual(['once'])
    expect(isSceneSetup(activity.setup, activity.scene)).toBe(true)
    const label = container.querySelector<HTMLInputElement>(
      'input[placeholder="Em Ao iniciar, a ação aconteceu uma vez só"]',
    )
    await act(async () => {
      if (!label) throw new Error('Rótulo da meta ausente')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(label, 'As vidas vieram uma vez')
      label.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(activity.setup?.goalCopy?.once?.label).toBe('As vidas vieram uma vez')
    expect(isSceneSetup(activity.setup, activity.scene)).toBe(true)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('o editor oferece os gestos novos para preparar cada cena', () => {
  const required: Partial<Record<SceneId, SceneAction['type'][]>> = {
    'fixed-vs-read': ['value-source', 'box-marks', 'clear-marks'],
    'collision-pair': ['command-target'],
    invincibility: ['shield', 'advance-to'],
    'number-line': ['step-value', 'sum-minus-one', 'compare-op'],
    'unique-names': ['toggle-block', 'name-field'],
    'motion-amount': ['nudge'],
    'two-clocks': ['birth-every', 'rate'],
    'copy-vs-original': ['export-file', 'import-file', 'recolor'],
    'published-copy': ['publish', 'open-mural', 'recolor'],
    'same-rules-new-skin': ['skin', 'rule-toggle', 'play-move', 'play-shoot'],
  }
  for (const [scene, types] of Object.entries(required) as [SceneId, SceneAction['type'][]][]) {
    const offered = sceneActionChoices(scene).map((choice) => choice.value.type)
    for (const type of types) expect(offered, `${scene}: ${type}`).toContain(type)
  }
  const html = renderToStaticMarkup(
    <SceneActionEditor
      scene="two-clocks"
      value={[{ type: 'rate', perSecond: 16 }]}
      onChange={() => {}}
    />,
  )
  expect(html).toContain('value="16"')
  expect(html).toContain('Desenhos por segundo')
})

test('o professor escolhe os casos de sorteio e nascimento do Desafio', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: ExperimentationActivity = { type: 'experimentation', scene: 'random' }
  const render = () =>
    root.render(
      <SceneSetupEditor
        activity={activity}
        onChange={(next) => {
          activity = next as ExperimentationActivity
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    const select = () => container.querySelector<HTMLSelectElement>('select')
    expect(select()?.value).toBe('')
    await act(async () => {
      const input = select()
      if (!input) throw new Error('Seletor do sorteio ausente')
      input.value = 'pedra-acima'
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(activity.setup?.preset?.id).toBe('pedra-acima')
    expect(activity.setup?.goals).toBeUndefined()
    expect(sceneTargets(activity)).toEqual(['positions', 'repeat', 'above'])
    expect(isSceneSetup(activity.setup, 'random')).toBe(true)

    activity = { type: 'experimentation', scene: 'spawn' }
    await act(async () => render())
    expect(select()?.value).toBe('')
    await act(async () => {
      const input = select()
      if (!input) throw new Error('Seletor do nascimento ausente')
      input.value = 'pedra-quadros'
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(activity.setup?.preset?.id).toBe('pedra-quadros')
    expect(activity.setup?.goals).toBeUndefined()
    expect(sceneTargets(activity)).toEqual(['every-frame', 'with-timer', 'same-fall'])
    expect(isSceneSetup(activity.setup, 'spawn')).toBe(true)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('o caso da limpeza pelo alto prepara tiros, espaço e as duas descobertas', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: ExperimentationActivity = { type: 'experimentation', scene: 'cleanup' }
  const render = () =>
    root.render(
      <SceneSetupEditor
        activity={activity}
        onChange={(next) => {
          activity = next as ExperimentationActivity
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    const select = Array.from(container.querySelectorAll('select')).find((item) =>
      item.innerHTML.includes('tiro-cima'),
    )
    await act(async () => {
      if (!select) throw new Error('Caso de limpeza ausente')
      select.value = 'tiro-cima'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(activity.setup?.preset?.id).toBe('tiro-cima')
    expect(activity.setup?.goals).toEqual(['invisible-stored', 'rule-removes'])
    expect(activity.cenario).toBe('nave')
    expect(activity.cast?.obstacle?.name).toBe('tiro')
    expect(isSceneSetup(activity.setup, activity.scene)).toBe(true)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('o caso do estado do jogo prepara pedras e três toques de 40 quadros', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: ExperimentationActivity = { type: 'experimentation', scene: 'game-state' }
  const render = () =>
    root.render(
      <SceneSetupEditor
        activity={activity}
        onChange={(next) => {
          activity = next as ExperimentationActivity
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    const select = Array.from(container.querySelectorAll('select')).find((item) =>
      item.innerHTML.includes('pedra-40-quadros'),
    )
    await act(async () => {
      if (!select) throw new Error('Caso do estado do jogo ausente')
      select.value = 'pedra-40-quadros'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(activity.setup?.preset?.id).toBe('pedra-40-quadros')
    expect(activity.setup?.goals).toEqual(['outside', 'waiting', 'playing'])
    expect(activity.setup?.goalCopy?.waiting?.label).toContain('três vezes')
    expect(activity.cast?.obstacle?.figure).toBe('asteroide')
    expect(activity.cenario).toBe('nave')
    expect(isSceneSetup(activity.setup, activity.scene)).toBe(true)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
