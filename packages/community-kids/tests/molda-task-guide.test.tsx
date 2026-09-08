import { afterEach, expect, mock, test } from 'bun:test'
import { createModelAsset } from '@sistemazero/molda/assets'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MoldaTaskGuide } from '../src/components/kids/molda-task-guide'
import type { MoldaTaskHandoff } from '../src/components/kids/use-pensa-task-handoff'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})
const handoff: MoldaTaskHandoff = {
  project: { id: 'plan-a', name: 'Lua' },
  cycle: { id: 'cycle-a', number: 1, goal: null },
  capability: { owned: true, blockedReason: null },
  task: {
    id: 'task-a',
    title: 'Rocha',
    summary: null,
    destination: 'molda',
    category: 'art',
    estimatedMinutes: 15,
    position: 0,
    dependencies: [],
    guide: {
      steps: [{ id: 's', text: 'Modele a rocha', required: true }],
      criteria: [{ id: 'c', text: 'Confira a forma', required: true }],
    },
    context: {
      kind: 'molda',
      assetId: 'inventory-rock',
      artKind: 'model',
      appearance: 'Rocha azul',
      usage: 'Cenário',
      palette: [],
    },
    revision: 1,
    supersedesTaskId: null,
    progress: {
      status: 'in_progress',
      completedStepIds: [],
      completedCriteriaIds: [],
      outputRef: null,
      startedAt: '2026-09-07T12:00:00Z',
      completedAt: null,
      updatedAt: '2026-09-07T12:00:00Z',
    },
  },
}

test('guia vincula uma criação já guardada e preserva os IDs do plano e do asset', async () => {
  const asset = createModelAsset({ name: 'Rocha já criada' })
  const payloads: unknown[] = []
  const updates: unknown[] = []
  globalThis.fetch = Object.assign(
    mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      payloads.push(typeof init?.body === 'string' ? JSON.parse(init.body) : null)
      return Response.json({
        task: {
          progress: {
            ...handoff.task.progress,
            status: 'completed',
            completedStepIds: ['s'],
            completedCriteriaIds: ['c'],
            outputRef: {
              kind: 'molda_asset',
              assetId: asset.id,
              assetName: asset.name,
              assetKind: 'model',
            },
            completedAt: '2026-09-07T12:01:00Z',
            updatedAt: '2026-09-07T12:01:00Z',
          },
        },
      })
    }),
    { preconnect: originalFetch.preconnect },
  )
  render(
    <MoldaTaskGuide
      profileId="child-a"
      handoff={handoff}
      persistence={{
        load: async () => asset,
        loadAll: async () => [asset],
        listSummaries: async () => [{ id: asset.id, name: asset.name, kind: asset.kind }],
      }}
      onProgress={(progress) => updates.push(progress)}
      onOpenAsset={() => {}}
      onReturn={() => {}}
      hasOpenCreation={async () => false}
    />,
  )
  await waitFor(() => expect(screen.getByRole('option', { name: asset.name })).toBeTruthy())
  fireEvent.click(screen.getByRole('checkbox', { name: 'Modele a rocha' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Confira a forma' }))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: asset.id } })
  fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
  await waitFor(() => expect(updates).toHaveLength(1))
  expect(payloads).toEqual([
    {
      status: 'completed',
      expectedUpdatedAt: handoff.task.progress.updatedAt,
      completedStepIds: ['s'],
      completedCriteriaIds: ['c'],
      outputRef: {
        kind: 'molda_asset',
        assetId: asset.id,
        assetName: asset.name,
        assetKind: 'model',
      },
    },
  ])
  expect(handoff.task.context.assetId).toBe('inventory-rock')
})

test('voltar ao plano aguarda o fechamento da criação pelo fluxo de salvamento do Molda', async () => {
  let returned = false
  render(
    <MoldaTaskGuide
      profileId="child-a"
      handoff={handoff}
      persistence={{ load: async () => null, loadAll: async () => [] }}
      onProgress={() => {}}
      onOpenAsset={() => {}}
      onReturn={() => {
        returned = true
      }}
      hasOpenCreation={async () => true}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao plano' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('guardar e fechar'))
  expect(returned).toBe(false)
})

test('sair pela navegação preserva o rascunho do guia apenas no mesmo perfil e versão', async () => {
  const props = {
    handoff,
    persistence: { load: async () => null, loadAll: async () => [] },
    onProgress: () => {},
    onOpenAsset: () => {},
    onReturn: () => {},
    hasOpenCreation: async () => false,
  }
  const first = render(<MoldaTaskGuide {...props} profileId="child-a" />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Modele a rocha' }))
  first.unmount()
  const same = render(<MoldaTaskGuide {...props} profileId="child-a" />)
  const check = () => {
    const input = screen.getByRole('checkbox', { name: 'Modele a rocha' })
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected checkbox')
    return input.checked
  }
  await waitFor(() => expect(check()).toBe(true))
  same.unmount()
  const sibling = render(<MoldaTaskGuide {...props} profileId="child-b" />)
  await waitFor(() => expect(check()).toBe(false))
  sibling.unmount()
  render(
    <MoldaTaskGuide
      {...props}
      profileId="child-a"
      handoff={{
        ...handoff,
        task: {
          ...handoff.task,
          progress: {
            ...handoff.task.progress,
            updatedAt: '2026-09-07T12:05:00Z',
          },
        },
      }}
    />,
  )
  await waitFor(() => expect(check()).toBe(false))
})
