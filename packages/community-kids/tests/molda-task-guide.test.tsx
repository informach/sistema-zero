import { afterEach, expect, mock, test } from 'bun:test'
import { createModelAsset } from '@sistemazero/molda/assets'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
 * 19/09/2026 — o guia recolhe por uma seta. O pé de rotina recolhe junto, conforme o
 * desenho compacto; avisos de problema e ações de recuperação permanecem visíveis.
 *
 * ⚠️ Quem LEMBRA é o host (o hook `usePensaGuideCollapsed`, com teste próprio): aqui o par
 * chega por prop, como nos irmãos do Pinta e do Estúdio.
 */
test('a seta recolhe o guia e as ações de rotina, mas preserva o cabeçalho', async () => {
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
  // ⚠️⚠️ 19/09/2026, decisão dela: recolhido sobra UMA linha, o título e a seta. O pé de
  // ROTINA (guardar, concluir, abrir a criação, voltar ao plano) e a linha de situação
  // recolhem junto — isso REVOGA em parte a regra de 18/09, que os mantinha fora. O que nunca
  // recolhe é PROBLEMA, e disso trata o teste seguinte.
  expect(screen.queryByRole('button', { name: 'Voltar ao plano' })).toBeNull()
  expect(screen.queryByRole('status')).toBeNull()
  // Sobra a seta, e só ela.
  expect(view.container.querySelectorAll('button').length).toBe(1)
  // ⚠️ E a SITUAÇÃO continua na tela, recolhida (achado do full review de 19/09/2026): quando
  // ela morava no sobretítulo, era `aria-hidden` e sumia ao recolher — quem usa leitor de tela
  // deixava de saber que a tarefa estava pronta, e quem recolhia também.
  // ⚠ A linha que sobra é o TÍTULO, e só ele: o sobretítulo sai junto (o cabeçalho teria duas).
  expect(screen.getByText('Rocha')).toBeTruthy()
  expect(screen.queryByText('Guia do Pensa')).toBeNull()
  const situacao = screen.getByText('Em andamento')
  // ⚠ `getByText` acha elemento ESCONDIDO: sem estas duas, um `hidden={recolhido}` passaria.
  expect(situacao.hasAttribute('hidden')).toBe(false)
  expect(situacao.closest('button[aria-expanded]')).toBeTruthy()
  // E a volta: clicar de novo pede para ABRIR.
  const setaRecolhida = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
  if (!setaRecolhida) throw new Error('seta esperada')
  fireEvent.click(setaRecolhida)
  expect(mudancas).toEqual([true, false])
})

test('concluída e recolhida, mantém a situação visível e anunciada na linha do título', async () => {
  const completed: MoldaTaskHandoff = {
    ...handoff,
    task: {
      ...handoff.task,
      progress: { ...handoff.task.progress, status: 'completed' },
    },
  }
  await act(async () => {
    render(
      <MoldaTaskGuide
        profileId="child-completed"
        handoff={completed}
        persistence={{ load: async () => null, loadAll: async () => [] }}
        onProgress={() => {}}
        onOpenAsset={() => {}}
        onReturn={() => {}}
        hasOpenCreation={async () => false}
        collapsed
        onCollapsedChange={() => {}}
      />,
    )
  })

  const heading = screen.getByRole('button', { name: /Rocha.*Concluída/ })
  expect(heading.getAttribute('aria-expanded')).toBe('false')
  expect(heading.querySelector('.sz-tool-guide__state')?.textContent).toBe('Concluída')
  expect(screen.queryByRole('button', { name: 'Voltar ao plano' })).toBeNull()
})

test('recolhido, um PROBLEMA continua na tela, e o quadro veste a casca compartilhada', async () => {
  // ⚠️⚠️ O anti-vácuo do caso de cima, e a regra que substituiu a de 18/09 (19/09/2026):
  // recolher esconde conteúdo e ação de ROTINA, NUNCA um problema. Aqui a criação vinculada
  // não está NESTA galeria — o aviso que explica isso tem de sobreviver ao recolher, senão a
  // criança que recolheu uma vez abre a tarefa noutro aparelho e vê só o título.
  const semACriacao: MoldaTaskHandoff = {
    ...handoff,
    task: {
      ...handoff.task,
      progress: {
        ...handoff.task.progress,
        outputRef: { kind: 'molda_asset', assetId: 'sumiu', assetKind: 'model' },
      },
    },
  }
  const view = render(
    <MoldaTaskGuide
      profileId="child-problema"
      handoff={semACriacao}
      persistence={{
        load: async () => null,
        loadAll: async () => [],
        listSummaries: async () => [],
      }}
      onProgress={() => {}}
      onOpenAsset={() => {}}
      onReturn={() => {}}
      hasOpenCreation={async () => false}
      collapsed
      onCollapsedChange={() => {}}
    />,
  )
  // A casca é a receita compartilhada das quatro ferramentas, e não mais a do próprio painel.
  const quadro = view.container.firstElementChild as HTMLElement
  expect(quadro.classList.contains('sz-tool-guide')).toBe(true)
  const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
  expect(seta?.classList.contains('sz-tool-guide__head')).toBe(true)
  // O corpo está recolhido...
  expect(screen.queryByText('Rocha azul')).toBeNull()
  // ...e o recado do problema, não.
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain('não está disponível nesta galeria'),
  )
})
