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
      collapsed={false}
      onCollapsedChange={() => {}}
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
      collapsed={false}
      onCollapsedChange={() => {}}
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
    collapsed: false,
    onCollapsedChange: () => {},
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

/**
 * 18/09/2026 — o guia recolhe por uma seta, e o pé saiu do que recolhe: com tudo dentro,
 * recolher escondia o único caminho de volta ao plano e o aviso da criação ausente — a lição
 * que o irmão do Pinta já pagou.
 *
 * ⚠️ Quem LEMBRA é o host (o hook `usePensaGuideCollapsed`, com teste próprio): aqui o par
 * chega por prop, como nos irmãos do Pinta e do Estúdio.
 */
test('a seta recolhe o guia, e o pé com a volta ao plano nunca some', async () => {
  const persistence = {
    load: async () => null,
    loadAll: async () => [],
    listSummaries: async () => [],
  }
  const mudancas: boolean[] = []
  function Guia({ collapsed }: { collapsed: boolean }) {
    return (
      <MoldaTaskGuide
        profileId="child-seta"
        handoff={handoff}
        persistence={persistence}
        onProgress={() => {}}
        onOpenAsset={() => {}}
        onReturn={() => {}}
        hasOpenCreation={async () => false}
        collapsed={collapsed}
        onCollapsedChange={(v) => mudancas.push(v)}
      />
    )
  }
  const view = render(<Guia collapsed={false} />)
  const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
  if (!seta) throw new Error('seta esperada')
  expect(seta.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('Rocha azul')).toBeTruthy()

  // A seta AVISA; quem manda é o host.
  fireEvent.click(seta)
  expect(mudancas).toEqual([true])
  expect(screen.getByText('Rocha azul')).toBeTruthy()

  view.rerender(<Guia collapsed />)
  await waitFor(() => expect(screen.queryByText('Rocha azul')).toBeNull())
  // ⚠ Recolhido, o corpo DESMONTA e o `aria-controls` SAI: apontar para um id ausente é
  // referência pendurada para o leitor de tela (régua do `Panel` do Pinta).
  expect(
    view.container.querySelector('button[aria-expanded]')?.getAttribute('aria-controls'),
  ).toBeNull()
  // O pé continua inteiro: a volta ao plano e a linha de situação ficam FORA do que recolhe.
  expect(screen.getByRole('button', { name: 'Voltar ao plano' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toContain('guardado')
  // E a volta: clicar de novo pede para ABRIR.
  const setaRecolhida = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
  if (!setaRecolhida) throw new Error('seta esperada')
  fireEvent.click(setaRecolhida)
  expect(mudancas).toEqual([true, false])
})
