import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { isSectionCompletion, type SectionCompletion } from '@sistemazero/core/learning'
import { stepLabel } from '../src/lib/execution-rule'
import {
  objectiveProject,
  objectiveSectionId,
  objectiveWorkspace,
} from './fixtures/section-objective-examples'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)

test('summaries distinguish a current sprite place, the same admitted point and empty group space', () => {
  expect(
    stepLabel({
      action: 'clickTarget',
      target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo' },
    }),
  ).toBe('clicar no lugar de alvo (grupo grupo)')
  expect(stepLabel({ action: 'clickTarget', target: { kind: 'lastPoint' } })).toBe(
    'repetir o último lugar clicado',
  )
  expect(
    stepLabel({ action: 'clickTarget', target: { kind: 'outsideGroup', path: 'grupo' } }),
  ).toBe('clicar fora do grupo grupo')
})

test('the real objective editor edits all three canonical targets and exposes invalid authoring', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'contagem',
        label: 'Conte um achado',
        rule: {
          type: 'behavior',
          steps: [{ action: 'clickTarget', target: { kind: 'lastPoint' } }],
          expect: { target: { kind: 'value', path: 'achados' }, compare: 'equals', value: 1 },
        },
      },
    ],
  }
  const workspace = objectiveWorkspace(
    objectiveProject({ installedExtensions: [{ id: 'game-2d' }] }),
  )
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={workspace}
        sectionId={objectiveSectionId}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const select = async (label: string, option: string) =>
    act(async () => {
      const element = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)
      if (!element) throw new Error(`Missing select: ${label}`)
      element.value = option
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
  const type = async (label: string, text: string) =>
    act(async () => {
      const element = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
      if (!element) throw new Error(`Missing input: ${label}`)
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, text)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    })
  try {
    await act(async () => render())
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Editar objetivo')!
        .click(),
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('inválidos')
    await select('Passo 1 do objetivo 1', 'sprite')
    await type('Personagem do passo 1', 'alvo')
    await type('Grupo do passo 1', 'grupo')
    expect(isSectionCompletion(value)).toBe(true)
    expect(
      [...container.querySelectorAll('[role="alert"]')]
        .map((element) => element.textContent)
        .join(' '),
    ).not.toContain('inválidos')
    expect(container.textContent).not.toContain('Cliques em alvos só valem')
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Adicionar passo')!
        .click(),
    )
    await select('Passo 2 do objetivo 1', 'lastPoint')
    expect(isSectionCompletion(value)).toBe(true)
    await select('Passo 2 do objetivo 1', 'outsideGroup')
    await type('Grupo do passo 2', 'grupo')
    expect(value.projectChecks?.[0]?.rule).toMatchObject({
      steps: [
        { action: 'clickTarget', target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo' } },
        { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'grupo' } },
      ],
    })
    await type('Grupo do passo 2', 'grupo.constructor')
    expect(isSectionCompletion(value)).toBe(false)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('inválidos')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('an adaptive click in an unsupported workspace has an explicit authoring error', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const value: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'alvo',
        label: 'Clique no personagem',
        rule: {
          type: 'behavior',
          steps: [
            { action: 'clickTarget', target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo' } },
          ],
          expect: { target: { kind: 'value', path: 'achados' }, compare: 'equals', value: 1 },
        },
      },
    ],
  }
  try {
    await act(async () =>
      root.render(
        <SectionCompletionEditor
          value={value}
          candidates={[]}
          hasStudio
          workspace={objectiveWorkspace(objectiveProject())}
          sectionId={objectiveSectionId}
          onChange={() => {
            throw new Error('The editor must not rewrite an unsupported rule')
          }}
        />,
      ),
    )
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Editar objetivo')!
        .click(),
    )
    expect(
      [...container.querySelectorAll('[role="alert"]')]
        .map((element) => element.textContent)
        .join(' '),
    ).toContain('Cliques em alvos só valem no Jogo 2D clássico JavaScript.')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
