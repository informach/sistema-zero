import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { initialKidsJourneyPolicy, type KidsJourneyPolicy } from '@sistemazero/core/journey'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsJourneyPolicyForm } from '../src/app/admin/professor/jornada-kids/journey-policy-form'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close()
})

async function mount(policy = initialKidsJourneyPolicy(), disabled = false) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let latest = policy
  function Fixture() {
    const [value, setValue] = useState(policy)
    return (
      <KidsJourneyPolicyForm
        value={value}
        disabled={disabled}
        courses={[]}
        onChange={(next) => {
          latest = next
          setValue(next)
        }}
      />
    )
  }
  await act(async () => root.render(<Fixture />))
  cleanup.push(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  return { container, policy: () => latest }
}
function button(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
async function select(container: HTMLElement, label: string, value: string) {
  const node = container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement | null
  if (!node) throw new Error(`Campo ausente: ${label}`)
  await act(async () => {
    node.value = value
    node.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

test('oito postos fixos; Faísca explica aula e não cria um avanço ou ferramenta inicial', async () => {
  const f = await mount()
  expect(f.container.querySelectorAll('nav[aria-label="Postos"] button').length).toBe(8)
  expect(f.container.textContent).toContain('Faísca')
  expect(f.container.textContent).toContain('dentro das aulas')
  expect(f.container.querySelector('[aria-label="Ferramentas deste posto"]')).toBeNull()
  expect(f.policy().steps.length).toBe(7)
})

test('editar marco e ferramenta de um posto não altera acesso da etapa nem outros postos', async () => {
  const seed = initialKidsJourneyPolicy()
  const f = await mount(seed)
  await act(async () => button(f.container, 'Construtor(a)').click())
  await select(f.container, 'Marco do requisito 1', 'complete')
  const pensa = f.container.querySelector('input[aria-label="Pinta"]') as HTMLInputElement
  await act(async () => pensa.click())
  expect(f.policy().steps[0]?.requirements[0]?.milestone).toBe('complete')
  expect(f.policy().steps[0]?.capabilities.includes('pinta')).toBe(false)
  expect(f.policy().tierAccess).toEqual(seed.tierAccess)
  expect(f.policy().steps.slice(1)).toEqual(seed.steps.slice(1))
})

test('tierAccess separado conserva mapeamento editável sem vincular índice da etapa ao posto', async () => {
  const seed = initialKidsJourneyPolicy()
  const f = await mount(seed)
  await act(async () => button(f.container, 'Iniciante 3D').click())
  await select(f.container, 'Posto de entrada', 'noob')
  await select(f.container, 'Marco da primeira aventura', 'complete')
  const rule = f.policy().tierAccess.find((entry) => entry.tier === 'iniciante-3d')
  expect(rule?.opensAt).toBe('noob')
  expect(rule?.foundation.milestone).toBe('complete')
  expect(f.policy().steps).toEqual(seed.steps)
  expect(f.policy().tierAccess.filter((entry) => entry.tier !== 'iniciante-3d')).toEqual(
    seed.tierAccess.filter((entry) => entry.tier !== 'iniciante-3d'),
  )
})

test('referência explícita ausente permanece visível e pausar retém todos os requisitos e gates', async () => {
  const seed = initialKidsJourneyPolicy()
  const id = '11111111-1111-4111-8111-111111111111'
  const policy: KidsJourneyPolicy = {
    ...seed,
    steps: seed.steps.map((step, index) =>
      index === 0
        ? { ...step, requirements: [{ kind: 'course', courseId: id, milestone: 'complete' }] }
        : step,
    ),
  }
  const f = await mount(policy)
  await act(async () => button(f.container, 'Construtor(a)').click())
  expect(f.container.textContent).toContain('Curso indisponível')
  expect(f.container.textContent).toContain(id)
  await select(f.container, 'Progressão', 'paused')
  expect(f.policy()).toEqual({ ...policy, mode: 'paused' })
})

test('somente leitura desabilita edição mas permite examinar os postos', async () => {
  const seed = initialKidsJourneyPolicy()
  const f = await mount(seed, true)
  await act(async () => button(f.container, 'Lenda').click())
  expect(f.container.querySelector('[aria-label="Ferramentas deste posto"]')).not.toBeNull()
  expect(
    [...f.container.querySelectorAll('input,select')].every(
      (node) => (node as HTMLInputElement).disabled,
    ),
  ).toBe(true)
  expect(f.policy()).toEqual(seed)
})
