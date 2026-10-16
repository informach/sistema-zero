import { afterEach, describe, expect, it } from 'bun:test'
import {
  applyStudioProChange,
  type StudioProBuilderAdapter,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { createEmptyProject } from '../../core/project'
import { setProjectStorageNamespace } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { captureProRevision } from '../../state/proRevision'
import ProBuilderPanel from './ProBuilderPanel'

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
  useProjectStore.setState({ project: null })
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { resolve, promise }
}
async function fixture() {
  useProjectStore.getState().setProject({
    ...createEmptyProject('builder-ui', 'Jogo'),
    kind: 'pro',
    mode: 'code',
    tree: { 'main.ts': { kind: 'file', content: 'export const goal = 10' } },
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
  })
  const base = await captureProRevision(useProjectStore.getState().project!)
  const change = {
    baseHash: base.hash,
    summary: 'Ajustar meta',
    patches: [
      {
        path: 'main.ts',
        before: await studioProDigest(base.files['main.ts']!),
        content: 'export const goal = 12',
      },
    ],
  }
  const job: StudioProBuilderJob = {
    id: crypto.randomUUID(),
    projectId: base.projectId,
    base,
    objective: 'Ajustar a meta',
    model: 'provider/model',
    phase: 'review',
    version: 3,
    modelCalls: 1,
    validationCalls: 1,
    createdAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + 300000).toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    leaseUntil: null,
    result: {
      change,
      revisionHash: (await applyStudioProChange(base, change)).revision.hash,
      plan: ['Ajustar meta e verificar o jogo'],
      evidence: (['types', 'build', 'playtest', 'capture'] as const).map((kind) => ({
        kind,
        status: 'passed',
        detail: 'Verificado pelo runtime',
      })),
    },
    error: null,
    cost: { source: 'platform', confirmedMicroUsd: 3, uncertain: false },
    notes: [],
  }
  const ready = studioProBuilderView(job)
  const adapter: StudioProBuilderAdapter = {
    create: async () => ready,
    latest: async () => ready,
    cancel: async () => ({ ...ready, phase: 'cancelled' }),
  }
  return { ready, adapter }
}
describe('builder review interface', () => {
  it('blocks an out-of-scope proposal before any application request', async () => {
    const f = await fixture()
    f.ready.assistance = {
      version: 1,
      disposition: 'pending',
      events: [],
      previewRefreshes: 0,
      request: {
        version: 1,
        intent: 'change',
        scope: 'selection',
        criteria: [],
        selection: { path: 'other.ts', startLine: 1, endLine: 1, sourceHash: 'a'.repeat(64) },
      },
    }
    let checks = 0
    f.adapter.checkApplication = async () => {
      checks++
      return { allowed: true }
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByText('O arquivo do trecho não está na revisão escolhida.')
    expect(
      (ui.getByRole('button', { name: 'Aplicar alterações' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(checks).toBe(0)
    expect(useProjectStore.getState().project!.tree!['main.ts']).toMatchObject({
      content: 'export const goal = 10',
    })
  })
  it('preserves a stale contextual draft without starting or broadening the request', async () => {
    const f = await fixture()
    f.adapter.latest = async () => null
    let calls = 0
    f.adapter.create = async () => {
      calls++
      return f.ready
    }
    const ui = render(
      <ProBuilderPanel
        adapter={f.adapter}
        projectId="builder-ui"
        draft={{
          id: 'context',
          objective: 'Mudar só o valor',
          request: {
            version: 1,
            intent: 'change',
            scope: 'selection',
            criteria: [],
            selection: { path: 'main.ts', startLine: 1, endLine: 1, sourceHash: 'a'.repeat(64) },
          },
        }}
      />,
    )
    await waitFor(() =>
      expect((ui.getByLabelText('O que vamos construir?') as HTMLTextAreaElement).value).toBe(
        'Mudar só o valor',
      ),
    )
    fireEvent.click(ui.getByRole('button', { name: 'Preparar proposta' }))
    await ui.findByText('O trecho mudou. Selecione novamente o código para este pedido.')
    expect(calls).toBe(0)
    expect((ui.getByLabelText('Tamanho do pedido') as HTMLSelectElement).value).toBe('selection')
    expect((ui.getByLabelText('O que vamos construir?') as HTMLTextAreaElement).value).toBe(
      'Mudar só o valor',
    )
  })
  it('notifies the host to reread the balance after an explicit cancellation', async () => {
    const f = await fixture()
    f.adapter.latest = async () => ({ ...f.ready, phase: 'queued', result: null })
    let refreshes = 0
    const ui = render(
      <ProBuilderPanel
        adapter={f.adapter}
        projectId="builder-ui"
        onUsageChange={() => {
          refreshes++
        }}
      />,
    )
    await ui.findByText('Preparando o próximo passo')
    fireEvent.click(ui.getByRole('button', { name: /Cancelar/ }))
    await waitFor(() => expect(refreshes).toBe(1))
  })
  it('polls persisted progress after reopening without dispatching a new inference', async () => {
    const f = await fixture()
    const queued = { ...f.ready, phase: 'queued' as const, result: null }
    let reads = 0,
      lists = 0
    f.adapter.latest = async () => queued
    f.adapter.get = async () => {
      reads++
      return reads > 1 ? f.ready : queued
    }
    f.adapter.list = async () => {
      lists++
      return { jobs: [queued], nextCursor: null }
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByText('Preparando o próximo passo')
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Consultar estado' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(ui.getByRole('button', { name: 'Consultar estado' }))
    await waitFor(() => expect(lists).toBe(2))
    expect(ui.queryByRole('button', { name: 'Continuar execução' })).toBeNull()
    await ui.findByText('Proposta pronta para revisar', {}, { timeout: 4000 })
    expect(reads).toBe(2)
  })
  it('keeps the review mounted while the learner returns to the conversation', async () => {
    const f = await fixture()
    let reads = 0
    f.adapter.latest = async () => {
      reads++
      return f.ready
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" draftOpen />)
    await ui.findByText('Proposta pronta para revisar')
    ui.rerender(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" draftOpen={false} />)
    expect(ui.getByRole('button', { name: 'Aplicar alterações' })).toBeDefined()
    expect(ui.queryByRole('button', { name: 'Preparar proposta' })).toBeNull()
    expect(reads).toBe(1)
  })
  it('preserves the accepted scope and criteria in a request, then blocks a changed mission before applying', async () => {
    const f = await fixture()
    let created: Parameters<StudioProBuilderAdapter['create']>[0] | undefined
    f.adapter.latest = async () => null
    f.adapter.create = async (input) => {
      created = input
      return f.ready
    }
    f.adapter.checkApplication = async () => ({
      allowed: false,
      reason: 'A missão mudou. Prepare uma nova proposta.',
    })
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    fireEvent.change(ui.getByLabelText('O que vamos construir?'), {
      target: { value: 'Ajustar apenas a meta' },
    })
    fireEvent.change(ui.getByLabelText('Como você vai conferir o resultado? · opcional'), {
      target: { value: 'A meta é 12\nOs controles continuam iguais' },
    })
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Preparar proposta' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(ui.getByRole('button', { name: 'Preparar proposta' }))
    await ui.findByText('Proposta pronta para revisar')
    expect(created?.request?.scope).toBe('part')
    expect(created?.request?.criteria).toEqual(['A meta é 12', 'Os controles continuam iguais'])
    fireEvent.click(ui.getByRole('button', { name: 'Aplicar alterações' }))
    await ui.findByText('A missão mudou. Prepare uma nova proposta.')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 10',
    })
  })
  it('restores a session application after reopening and never reapplies the proposal', async () => {
    const f = await fixture()
    const first = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    fireEvent.click(await first.findByRole('button', { name: 'Aplicar alterações' }))
    await first.findByRole('button', { name: 'Desfazer alterações' })
    first.unmount()
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByRole('button', { name: 'Desfazer alterações' })
    expect(
      (ui.getByRole('button', { name: 'Aplicar alterações' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(ui.getByRole('button', { name: 'Desfazer alterações' }))
    await ui.findByText('A revisão anterior foi restaurada.')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 10',
    })
  })
  it('keeps unavailable construction disabled without hiding a saved proposal', async () => {
    const f = await fixture()
    let creates = 0
    f.adapter.availability = async () => ({
      available: false,
      reason: 'Construção indisponível neste ambiente.',
    })
    f.adapter.create = async () => {
      creates++
      return f.ready
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByText('Construção indisponível neste ambiente.')
    await ui.findByText('Proposta pronta para revisar')
    fireEvent.change(ui.getByLabelText('O que vamos construir?'), {
      target: { value: 'Adicionar pontos' },
    })
    expect(
      (ui.getByRole('button', { name: 'Preparar proposta' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(ui.getByRole('button', { name: 'Aplicar alterações' })).toBeDefined()
    expect(creates).toBe(0)
  })
  it('restores a proposal in StrictMode, only applies explicitly, then undoes the exact change', async () => {
    const f = await fixture()
    const ui = render(
      <StrictMode>
        <ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />
      </StrictMode>,
    )
    await ui.findByText('Proposta pronta para revisar')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 10',
    })
    fireEvent.click(ui.getByRole('button', { name: 'Aplicar alterações' }))
    await ui.findByRole('button', { name: 'Desfazer alterações' })
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 12',
    })
    fireEvent.click(ui.getByRole('button', { name: 'Desfazer alterações' }))
    await ui.findByText('A revisão anterior foi restaurada.')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 10',
    })
  })
  it('does not overwrite an edit made before the user accepts the proposal', async () => {
    const f = await fixture(),
      ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByText('Proposta pronta para revisar')
    act(() => useProjectStore.getState().setProFileContent('main.ts', 'export const goal = 30'))
    fireEvent.click(ui.getByRole('button', { name: 'Aplicar alterações' }))
    await ui.findByRole('alert')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 30',
    })
    expect(ui.queryByRole('button', { name: 'Desfazer alterações' })).toBeNull()
  })
  it('cancellation wins over an in-flight poll and its late proposal never replaces the cancelled state', async () => {
    const f = await fixture(),
      pending = deferred<typeof f.ready>(),
      queued = { ...f.ready, phase: 'queued' as const, result: null }
    let requested = false,
      signal: AbortSignal | undefined
    f.adapter.latest = async () => queued
    f.adapter.get = async (_input, abort) => {
      requested = true
      signal = abort
      return pending.promise
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await waitFor(() => expect(requested).toBe(true), { timeout: 4000 })
    fireEvent.click(ui.getByRole('button', { name: 'Cancelar construção' }))
    await ui.findByText('Construção cancelada')
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve(f.ready))
    expect(ui.queryByRole('button', { name: 'Aplicar alterações' })).toBeNull()
  })
  it('recovers a lost create response using the same idempotency key and base revision', async () => {
    const f = await fixture(),
      requests: Parameters<StudioProBuilderAdapter['create']>[0][] = []
    f.adapter.latest = async () => null
    f.adapter.create = async (input) => {
      requests.push(input)
      if (requests.length === 1) throw new Error('Conexão interrompida')
      return f.ready
    }
    const ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    fireEvent.change(ui.getByLabelText('O que vamos construir?'), {
      target: { value: 'Ajustar meta' },
    })
    await waitFor(() =>
      expect(
        (ui.getByRole('button', { name: 'Preparar proposta' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(ui.getByRole('button', { name: 'Preparar proposta' }))
    fireEvent.click(await ui.findByRole('button', { name: 'Recuperar solicitação' }))
    await ui.findByText('Proposta pronta para revisar')
    expect(requests).toHaveLength(2)
    expect(requests[0]).toBe(requests[1])
  })
  it('does not act through a stale panel after profile A → B → A', async () => {
    setProjectStorageNamespace('profile-a')
    const f = await fixture(),
      ui = render(<ProBuilderPanel adapter={f.adapter} projectId="builder-ui" />)
    await ui.findByText('Proposta pronta para revisar')
    setProjectStorageNamespace('profile-b')
    setProjectStorageNamespace('profile-a')
    fireEvent.click(ui.getByRole('button', { name: 'Aplicar alterações' }))
    expect((await ui.findByRole('alert')).textContent).toContain('perfil mudou')
    expect(useProjectStore.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const goal = 10',
    })
  })
})
