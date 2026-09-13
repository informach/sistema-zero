import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  EXPLORATION_MISSIONS,
  type ExplorationActivity,
  experienceScript,
  isExperienceScript,
} from '@sistemazero/core/learning'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ExperienceAuthoring } = await import('../src/components/editor/experience-authoring')

test('all native demonstration scripts remain editable visually, preserve valid actions and keep JSON import', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: ExplorationActivity = {
    type: 'exploration',
    version: 3,
    mission: 'world',
    mode: 'demonstrate',
  }
  const render = () =>
    root.render(
      <ExperienceAuthoring
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  try {
    for (const mission of EXPLORATION_MISSIONS) {
      activity = { type: 'exploration', version: 3, mission, mode: 'demonstrate' }
      await act(async () => render())
      expect(container.querySelector('[role="alert"]')).toBeNull()
      const original = experienceScript(activity)
      const selects = [
        ...container.querySelectorAll<HTMLSelectElement>('select[aria-label^="Ação "]'),
      ]
      expect(selects.length).toBe(original.flatMap((s) => s.actions).length)
      expect(
        selects.every((s) => !s.selectedOptions[0]?.textContent?.includes('incompatível')),
      ).toBe(true)
      // Selecting an existing action is an actual form edit: numeric values must remain valid
      // and all other authored steps must survive the controlled update.
      await act(async () => selects[0]!.dispatchEvent(new Event('change', { bubbles: true })))
      expect(isExperienceScript(experienceScript(activity), mission)).toBe(true)
      expect(experienceScript(activity).slice(1)).toEqual(original.slice(1))
      expect(
        container.querySelector('textarea[aria-label="Ações do roteiro em JSON"]'),
      ).not.toBeNull()
    }
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
