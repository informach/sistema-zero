import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { CreatorMasteryReviewDetail } from '@sistemazero/core/journey'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
mock.module('../../src/app/admin/professor/maestrias/project-evidence', () => ({
  MasteryProjectEvidence: () => <div>Projeto preservado para esta revisão</div>,
}))
const calls: { path: string; body: unknown }[] = []
let platform: 'adult' | 'kids' = 'adult'
let getRequest: (path: string, options?: { signal?: AbortSignal }) => Promise<unknown> =
  async () => {
    throw new Error('Unexpected list request')
  }
mock.module('@/components/admin/platform-provider', () => ({
  usePlatform: () => platform,
  usePlatformOptional: () => platform,
}))
mock.module('@/lib/api', () => ({
  apiGet: (path: string, options?: { signal?: AbortSignal }) => getRequest(path, options),
  apiSend: async (path: string, _method: string, body: unknown) => {
    calls.push({ path, body })
    return {}
  },
}))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MasteryReviewForm, MasteryReviewQueue } = await import(
  '../../src/app/admin/professor/maestrias/review-queue'
)
const id = '20000000-0000-4000-8000-000000000001'
const detail: CreatorMasteryReviewDetail = {
  userId: id,
  accountId: id,
  audience: 'adult',
  areaTitle: 'Jogos em Python 2D',
  evidence: { payload: {}, revision: 'v1', createdAt: '2026-10-25T12:00:00Z' },
  definition: {
    level: 1,
    title: 'Movimento e colisão',
    nucleusCourseIds: [id],
    workshops: [1, 2, 3].map((i) => ({
      id: `workshop-${i}`,
      title: `Oficina ${i}`,
      courseIds: [id],
    })),
    rubric: {
      version: 1,
      criteria: [
        { id: 'working', title: 'O jogo funciona' },
        { id: 'explained', title: 'Explica a mudança' },
      ],
    },
  },
  submission: {
    id,
    evidenceId: id,
    evidenceTitle: 'Meu jogo',
    masteryId: 'python2d',
    level: 1,
    policyVersion: 1,
    rubricVersion: 1,
    submittedAt: '2026-10-25T12:00:00Z',
    message: 'Testei o reinício.',
    status: 'pending',
    feedback: null,
    criteria: [],
    credits: [],
    reviewedAt: null,
  },
}
afterEach(() => {
  calls.length = 0
  platform = 'adult'
  document.body.replaceChildren()
})
async function changeTextarea(element: HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      element,
      value,
    )
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function mount(input = detail) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let saved = 0
  await act(async () =>
    root.render(
      <MasteryReviewForm
        reviewerId="20000000-0000-4000-8000-000000000002"
        detail={input}
        onBack={() => {}}
        onSaved={() => {
          saved++
        }}
      />,
    ),
  )
  return { container, root, saved: () => saved }
}
test('requires a decision for every criterion and sends one complete review with learner feedback', async () => {
  const { container, root, saved } = await mount()
  try {
    const save = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Registrar avaliação'),
    )!
    await act(async () => save.click())
    expect(calls).toHaveLength(0)
    expect(container.textContent).toContain('Avalie todos os critérios')
    for (const select of container.querySelectorAll('select'))
      await act(async () => {
        select.value = 'approved'
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })
    await changeTextarea(
      container.querySelector<HTMLTextAreaElement>('#mastery-feedback')!,
      'Você explicou a regra e testou o reinício.',
    )
    await act(async () => save.click())
    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toEndWith(`/${id}/review`)
    expect(calls[0]?.body).toEqual({
      criteria: [
        { criterionId: 'working', result: 'approved', feedback: '' },
        { criterionId: 'explained', result: 'approved', feedback: '' },
      ],
      feedback: 'Você explicou a regra e testou o reinício.',
      credits: [],
    })
    expect(saved()).toBe(1)
  } finally {
    await act(async () => root.unmount())
  }
})
test('changes require a useful per-criterion explanation; recorded review cannot be overwritten', async () => {
  const { container, root } = await mount()
  try {
    for (const select of container.querySelectorAll('select'))
      await act(async () => {
        select.value = 'revise'
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })
    const save = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Registrar avaliação'),
    )!
    await changeTextarea(
      container.querySelector<HTMLTextAreaElement>('#mastery-feedback')!,
      'Vamos ajustar a colisão.',
    )
    await act(async () => save.click())
    expect(calls).toHaveLength(0)
    expect(container.textContent).toContain('explique os ajustes')
  } finally {
    await act(async () => root.unmount())
  }
  const reviewed = await mount({
    ...detail,
    submission: { ...detail.submission, status: 'approved', feedback: 'Bom trabalho.' },
  })
  try {
    expect(reviewed.container.querySelector('fieldset')?.disabled).toBe(true)
    expect(reviewed.container.textContent).toContain('Revisão registrada')
    expect(
      Array.from(reviewed.container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Registrar avaliação'),
      ),
    ).toBe(false)
  } finally {
    await act(async () => reviewed.root.unmount())
  }
})

test('switching community discards a late detail response from the previous queue', async () => {
  let resolveDetail!: (value: CreatorMasteryReviewDetail) => void
  let detailSignal: AbortSignal | undefined
  const pendingDetail = new Promise<CreatorMasteryReviewDetail>((resolve) => {
    resolveDetail = resolve
  })
  getRequest = async (path, options) => {
    if (path.endsWith(`/${id}`)) {
      detailSignal = options?.signal
      return pendingDetail
    }
    return {
      submissions: path.includes('audience=adult')
        ? [
            {
              ...detail.submission,
              areaTitle: detail.areaTitle,
              childName: null,
              accountName: 'Pessoa adulta',
            },
          ]
        : [],
      limit: 30,
      offset: 0,
    }
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(<MasteryReviewQueue reviewerId={id} />))
    const open = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Abrir entrega'),
    )!
    await act(async () => open.click())
    platform = 'kids'
    await act(async () => root.render(<MasteryReviewQueue reviewerId={id} />))
    expect(detailSignal?.aborted).toBe(true)
    await act(async () => resolveDetail(detail))
    expect(container.textContent).toContain('Nenhuma entrega nesta fila')
    expect(container.textContent).not.toContain('Versão enviada')
    expect(container.textContent).not.toContain('Abrindo a entrega')
  } finally {
    await act(async () => root.unmount())
  }
})
