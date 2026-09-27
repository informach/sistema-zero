import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { BroadcastPanel } = await import('../src/app/admin/professor/recados/broadcast-panel')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)
const { LessonLearningPanel } = await import('../src/components/professor/lesson-learning-panel')

function mockFetch(
  handler: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => Promise<Response>,
): typeof fetch {
  return Object.assign(handler, { preconnect: globalThis.fetch.preconnect })
}

function fixture() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const button = (label: string) => {
    const node = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label,
    )
    if (!node) throw new Error(`Botão ausente: ${label}`)
    return node
  }
  return {
    container,
    root,
    button,
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('the editor offers only compatible areas and reports changes that remove a required block', async () => {
  const f = fixture()
  const value = {
    version: 1 as const,
    blockIds: [],
    projectChecks: [
      {
        id: 'stage',
        label: 'Preparar a tela',
        rule: { type: 'usesBlock' as const, blockType: 'sz_g2d_setup_stage' },
      },
    ],
  }
  const workspace = {
    kind: 'studio',
    initialProject: { installedExtensions: [{ id: 'game-2d' }] },
    allowBlocks: ['sz_g2d_setup_stage', 'sz_val_number'],
  }
  try {
    await act(async () =>
      f.root.render(
        createElement(SectionCompletionEditor, {
          value,
          workspace,
          candidates: [],
          hasStudio: true,
          onChange: () => {},
        }),
      ),
    )
    const label = [...f.container.querySelectorAll('label')].find((node) =>
      node.textContent?.includes('Encaixado na área'),
    )!
    expect([...label.querySelectorAll('option')].map((option) => option.value)).toEqual([
      '',
      'start',
    ])
    await act(async () =>
      f.root.render(
        createElement(SectionCompletionEditor, {
          value,
          workspace: { ...workspace, allowBlocks: ['sz_val_number'] },
          candidates: [],
          hasStudio: true,
          onChange: () => {},
        }),
      ),
    )
    expect(f.container.textContent).toContain('O bloco do objetivo não está disponível')
  } finally {
    await f.close()
  }
})

test('a closed recipient request cannot replace another broadcast opened later', async () => {
  const f = fixture(),
    originalFetch = globalThis.fetch
  let finishOld!: (response: Response) => void
  const summary = (id: string) => ({
    id,
    title: id,
    body: 'Mensagem',
    recipients: 0,
    delivered: 0,
    failed: 0,
    read: 0,
    sentAt: new Date().toISOString(),
    items: [],
  })
  globalThis.fetch = mockFetch(async (input) => {
    const url = String(input)
    if (url.includes('/antigo?'))
      return new Promise<Response>((resolve) => {
        finishOld = resolve
      })
    if (url.includes('/atual?')) return Response.json(summary('atual'))
    return Response.json([summary('antigo'), summary('atual')])
  })
  try {
    await act(async () => f.root.render(createElement(BroadcastPanel, { courses: [] })))
    await act(async () => f.button('Enviados').click())
    await act(async () => f.button('Destinatários').click())
    await act(async () => f.button('Voltar aos envios').click())
    await act(async () =>
      [...f.container.querySelectorAll('button')]
        .filter((button) => button.textContent === 'Destinatários')[1]!
        .click(),
    )
    await act(async () => finishOld(Response.json(summary('antigo'))))
    expect(f.container.querySelector('strong')?.textContent).toBe('atual')
  } finally {
    await f.close()
    globalThis.fetch = originalFetch
  }
})

test('detalhe dos destinatários atualiza a entrega e o acesso à conversa durante o polling', async () => {
  const f = fixture(),
    originalFetch = globalThis.fetch,
    originalInterval = globalThis.setInterval
  const ticks: (() => void)[] = []
  let delivered = false,
    detailReads = 0,
    listReads = 0
  globalThis.setInterval = ((callback: () => void, delay: number) => {
    if (delay === 5000) ticks.push(callback)
    return originalInterval(callback, delay === 5000 ? 1_000_000 : delay)
  }) as typeof setInterval
  const summary = () => ({
    id: 'broadcast',
    title: 'Oficina',
    body: 'Prepare seu jogo',
    recipients: 1,
    delivered: delivered ? 1 : 0,
    failed: 0,
    read: 0,
    sentAt: new Date().toISOString(),
  })
  globalThis.fetch = mockFetch(async (input) => {
    if (String(input).includes('/broadcast?')) {
      detailReads++
      return Response.json({
        ...summary(),
        items: [
          {
            profileId: 'alice',
            threadId: 'thread',
            name: 'Alice',
            accountName: 'Ana',
            accountEmail: 'ana@example.test',
            status: delivered ? 'delivered' : 'pending',
          },
        ],
      })
    }
    listReads++
    return Response.json([summary()])
  })
  try {
    await act(async () => f.root.render(createElement(BroadcastPanel, { courses: [] })))
    await act(async () => f.button('Enviados').click())
    await act(async () => f.button('Destinatários').click())
    expect(f.container.textContent).toContain('Em processamento')
    delivered = true
    await act(async () => {
      for (const tick of ticks) tick()
    })
    expect(listReads).toBe(2)
    expect(detailReads).toBe(2)
    expect(f.container.textContent).toContain('Entregue')
    expect(f.container.textContent).toContain('Abrir conversa')
  } finally {
    await f.close()
    globalThis.fetch = originalFetch
    globalThis.setInterval = originalInterval
  }
})

test('simulação reavalia o projeto quando a regra muda', async () => {
  const f = fixture()
  const initial = {
    version: 1 as const,
    blockIds: [],
    projectChecks: [
      {
        id: 'check',
        label: 'Preparar a tela',
        rule: { type: 'usesBlock' as const, blockType: 'sz_frame_start' },
      },
    ],
  }
  try {
    await act(async () =>
      f.root.render(
        createElement(SectionCompletionEditor, {
          value: initial,
          candidates: [],
          hasStudio: true,
          onChange: () => {},
        }),
      ),
    )
    const input = f.container.querySelector<HTMLInputElement>('input[type="file"]')!
    const file = new File(
      [JSON.stringify({ blocksState: { blocks: { blocks: [{ type: 'sz_frame_start' }] } } })],
      'projeto.sz',
    )
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    expect(f.container.textContent).toContain('Cumprido: Preparar a tela')
    await act(async () =>
      f.root.render(
        createElement(SectionCompletionEditor, {
          value: {
            ...initial,
            projectChecks: [
              {
                ...initial.projectChecks[0]!,
                rule: { type: 'usesBlock', blockType: 'sz_g2d_setup_stage', inputs: { W: 800 } },
              },
            ],
          },
          candidates: [],
          hasStudio: true,
          onChange: () => {},
        }),
      ),
    )
    expect(f.container.textContent).toContain('Falta: Preparar a tela')
    expect(f.container.textContent).not.toContain('Cumprido: Preparar a tela')
  } finally {
    await f.close()
  }
})

test('evidência de bloco removido continua visível e disponível para download', async () => {
  const f = fixture(),
    originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch(async () =>
    Response.json({
      lessonId: 'lesson',
      lessonTitle: 'Aula',
      userId: 'child',
      sectionId: 'section',
      sections: [
        {
          id: 'section',
          title: 'Etapa',
          objective: '',
          intent: 'closing',
          blockIds: ['new-block'],
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
        },
      ],
      blocks: [],
      attempts: [],
      activities: [],
      evidence: [
        {
          id: 'historical',
          kind: 'studio',
          blockId: 'removed-block',
          sectionId: null,
          revision: 'original',
          createdAt: '2026-09-11T12:00:00Z',
          payload: { score: 100 },
        },
      ],
    }),
  ) as typeof fetch
  try {
    await act(async () =>
      f.root.render(
        createElement(LessonLearningPanel, {
          lessonId: 'lesson',
          userId: 'child',
          accountId: 'parent',
        }),
      ),
    )
    const open = [...f.container.querySelectorAll('button')][0]!
    await act(async () => open.click())
    expect(f.container.textContent).toContain('Etapa')
    expect(f.container.textContent).toContain('Revisão avaliada: original')
    expect(f.container.textContent).toContain('removed-block')
    expect(f.container.querySelector('a[download]')?.getAttribute('href')).toContain(
      '/learning-evidence/historical?',
    )
  } finally {
    await f.close()
    globalThis.fetch = originalFetch
  }
})

test('a slower simulation file cannot overwrite the most recently selected project', async () => {
  const f = fixture()
  let finishFirst!: (value: string) => void
  const oldFile = new File([], 'antigo.sz')
  Object.defineProperty(oldFile, 'text', {
    value: () =>
      new Promise<string>((resolve) => {
        finishFirst = resolve
      }),
  })
  const value = {
    version: 1 as const,
    blockIds: [],
    projectChecks: [
      {
        id: 'check',
        label: 'Preparar a tela',
        rule: { type: 'usesBlock' as const, blockType: 'sz_frame_start' },
      },
    ],
  }
  try {
    await act(async () =>
      f.root.render(
        createElement(SectionCompletionEditor, {
          value,
          candidates: [],
          hasStudio: true,
          onChange: () => {},
        }),
      ),
    )
    const input = f.container.querySelector<HTMLInputElement>('input[type="file"]')!
    const select = async (file: File) => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
    }
    await select(oldFile)
    await select(new File(['{}'], 'mais-recente.sz'))
    expect(f.container.textContent).toContain('Falta: Preparar a tela')
    await act(async () =>
      finishFirst(
        JSON.stringify({ blocksState: { blocks: { blocks: [{ type: 'sz_frame_start' }] } } }),
      ),
    )
    expect(f.container.textContent).toContain('Falta: Preparar a tela')
    expect(f.container.textContent).not.toContain('Cumprido: Preparar a tela')
  } finally {
    await f.close()
  }
})

test('polling refreshes all recipient pages already opened, including read receipts', async () => {
  const f = fixture(),
    originalFetch = globalThis.fetch,
    originalInterval = globalThis.setInterval,
    originalClear = globalThis.clearInterval
  const ticks = new Map<ReturnType<typeof setInterval>, () => void>()
  let delivered = false
  const offsets: number[] = []
  globalThis.setInterval = ((callback: () => void, delay: number) => {
    const timer = originalInterval(callback, delay === 5000 ? 1_000_000 : delay)
    if (delay === 5000) ticks.set(timer, callback)
    return timer
  }) as typeof setInterval
  globalThis.clearInterval = ((timer) => {
    ticks.delete(timer as ReturnType<typeof setInterval>)
    originalClear(timer as ReturnType<typeof originalInterval>)
  }) as typeof clearInterval
  const summary = {
    id: 'broadcast',
    title: 'Oficina',
    body: 'Mensagem',
    recipients: 51,
    delivered: 0,
    failed: 0,
    read: 0,
    sentAt: new Date().toISOString(),
  }
  globalThis.fetch = mockFetch(async (input) => {
    const url = new URL(String(input), 'http://localhost')
    if (!url.pathname.endsWith('/broadcast')) return Response.json([summary])
    const offset = Number(url.searchParams.get('offset') ?? 0)
    offsets.push(offset)
    return Response.json({
      ...summary,
      items: Array.from({ length: offset === 0 ? 50 : 1 }, (_, index) => ({
        profileId: `child-${offset + index}`,
        name: `Aluno ${offset + index}`,
        accountName: 'Responsável',
        accountEmail: 'p@example.test',
        threadId: `thread-${offset + index}`,
        status: delivered ? 'delivered' : 'pending',
        read: delivered && offset === 50,
      })),
    })
  })
  try {
    await act(async () => f.root.render(createElement(BroadcastPanel, { courses: [] })))
    await act(async () => f.button('Enviados').click())
    await act(async () => f.button('Destinatários').click())
    await act(async () => f.button('Ver mais destinatários').click())
    expect(f.container.textContent).toContain('Aluno 50')
    delivered = true
    offsets.length = 0
    await act(async () => {
      for (const tick of ticks.values()) tick()
    })
    expect(offsets.sort((a, b) => a - b)).toEqual([0, 50])
    expect(
      [...f.container.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Abrir conversa',
      ),
    ).toHaveLength(51)
    expect(f.container.textContent).toContain('Lido')
    expect(f.container.textContent).not.toContain('Em processamento')
  } finally {
    await f.close()
    globalThis.fetch = originalFetch
    globalThis.setInterval = originalInterval
    globalThis.clearInterval = originalClear
  }
})

test('historical evidence pagination keeps the first page and exposes removed sections', async () => {
  const f = fixture(),
    originalFetch = globalThis.fetch
  const evidence = (id: string, sectionId: string | null) => ({
    id,
    sectionId,
    kind: 'studio',
    blockId: 'removed-block',
    revision: 'original',
    createdAt: '2026-09-11T12:00:00Z',
    payload: { score: 100 },
  })
  globalThis.fetch = mockFetch(async (input) => {
    if (String(input).includes('/learning-evidence?')) {
      expect(String(input)).toContain('beforeId=historical')
      return Response.json({ items: [evidence('older', 'removed-section')], nextCursor: null })
    }
    return Response.json({
      lessonId: 'lesson',
      lessonTitle: 'Aula',
      userId: 'child',
      sectionId: null,
      sections: [],
      blocks: [],
      attempts: [],
      activities: [],
      evidence: [evidence('historical', null)],
      evidenceNextCursor: 'historical',
    })
  })
  try {
    await act(async () =>
      f.root.render(
        createElement(LessonLearningPanel, {
          lessonId: 'lesson',
          userId: 'child',
          accountId: 'parent',
        }),
      ),
    )
    await act(async () => f.button('Acompanhamento da aula').click())
    await act(async () => f.button('Ver registros anteriores').click())
    expect(f.container.querySelectorAll('a[download]')).toHaveLength(2)
    expect(f.container.textContent).toContain('removed-section')
    expect(f.container.textContent).not.toContain('Ver registros anteriores')
  } finally {
    await f.close()
    globalThis.fetch = originalFetch
  }
})
