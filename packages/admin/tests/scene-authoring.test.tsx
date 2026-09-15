import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  type DemonstrationActivity,
  isSceneScript,
  SCENE_IDS,
  SCENE_MODELS,
  sceneScript,
} from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SceneAuthoring } = await import('../src/components/editor/scene-authoring')

test('o roteiro abre em campos, sem JSON, e uma edição não derruba as outras etapas', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: DemonstrationActivity = { type: 'demonstration', scene: 'world' }
  const render = () =>
    root.render(
      <SceneAuthoring
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  try {
    for (const scene of SCENE_IDS) {
      activity = { type: 'demonstration', scene }
      await act(async () => render())
      // O roteiro que vem com a cena tem que abrir VÁLIDO: um alerta aqui é a professora
      // recebendo um erro por algo que ela não escreveu.
      expect(container.querySelector('[role="alert"]')).toBeNull()
      const original = sceneScript(activity)
      const selects = [
        ...container.querySelectorAll<HTMLSelectElement>('select[aria-label^="Ação "]'),
      ]
      expect(selects.length).toBe(original.flatMap((s) => s.actions).length)
      expect(
        selects.every((s) => !s.selectedOptions[0]?.textContent?.includes('incompatível')),
      ).toBe(true)
      // Escolher a mesma ação já selecionada é uma edição de verdade no formulário: os números
      // têm que continuar válidos e as OUTRAS etapas têm que sobreviver à atualização.
      await act(async () => selects[0]!.dispatchEvent(new Event('change', { bubbles: true })))
      expect(isSceneScript(sceneScript(activity), scene)).toBe(true)
      expect(sceneScript(activity).slice(1)).toEqual(original.slice(1))
      // ⚠️ A caixa de JSON não existe mais: era o único caminho para algumas edições e pedia
      // da professora uma forma que ela não tem como conhecer.
      expect(container.querySelector('textarea[aria-label*="JSON"]')).toBeNull()
    }
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('⚠️ editar o roteiro que vem com a cena cria um roteiro AUTORAL, e dá para voltar atrás', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: DemonstrationActivity = { type: 'demonstration', scene: 'world' }
  const render = () =>
    root.render(
      <SceneAuthoring
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    expect(activity.script).toBeUndefined()
    const fala = container.querySelector<HTMLTextAreaElement>('textarea')
    if (!fala) throw new Error('Faltou o campo de fala.')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(fala, 'O Dino aparece aqui.')
      fala.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(activity.script?.[0]?.caption).toBe('O Dino aparece aqui.')
    expect(activity.script?.length).toBe(SCENE_MODELS.world.script.length)
    const voltar = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Voltar ao roteiro da cena',
    )
    if (!voltar) throw new Error('Faltou o botão de voltar.')
    await act(async () => voltar.click())
    expect(activity.script).toBeUndefined()
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
