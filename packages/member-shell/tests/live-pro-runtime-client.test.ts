import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { createLiveProRuntime } from '../src/lib/live/pro-runtime'

/**
 * O adaptador do Pro na oficina ao vivo (full review final, 22/11/2026): a rota responde a falha
 * de compilação com `{ error: { message, output } }` (o recado da criança e a saída do Vite), e o
 * adaptador trocava tudo por um recado genérico. Agora a falha chega como no Pro da aula
 * (`studio-block.tsx`), e o palco mostra o recado e a saída.
 */
const workspaceId = crypto.randomUUID()
const deviceId = crypto.randomUUID()
const project = {
  id: workspaceId,
  formatVersion: 2,
  kind: 'pro',
  mode: 'code',
  name: 'Oficina',
  createdAt: 1,
  updatedAt: 1,
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  ir: null,
  blocksState: null,
  installedExtensions: [],
  proMeta: { templateId: 'three-ts', devScript: 'dev' },
  tree: { 'src/main.ts': { kind: 'file', content: "import { nanoid } from 'nanoid'" } },
}

function adapter() {
  const view = {
    id: workspaceId,
    writerEpoch: 2,
    readOnly: false,
    writerId: 'crianca',
    writerDeviceId: deviceId,
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    project,
    revision: 7,
  }
  return createLiveProRuntime({
    context: {
      kind: 'live',
      workspaceId,
      sessionId: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
      deviceId,
      writerEpoch: 2,
    },
    userId: 'crianca',
    signal: new AbortController().signal,
    current: () => view as never,
    queue: { current: Promise.resolve() },
    save: async () => undefined,
  })
}

const respostas: Response[] = []
let restaurarFetch: (() => void) | null = null
beforeEach(() => {
  const espiao = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(async () => respostas.shift() ?? Response.json({}, { status: 500 }), {
      preconnect: globalThis.fetch.preconnect,
    }),
  )
  restaurarFetch = () => espiao.mockRestore()
})
afterEach(() => {
  respostas.length = 0
  restaurarFetch?.()
  restaurarFetch = null
})

const RECADO =
  'A biblioteca nanoid não está no package.json deste jogo. Se ela é uma das bibliotecas do modelo, escreva ela no package.json; se não, tire o import.'

test('a falha de compilação chega com o recado da criança e a saída do Vite', async () => {
  respostas.push(
    Response.json(
      { error: { message: RECADO, output: '[sz-catalog-imports] STUDIO_UNDECLARED_DEPENDENCY' } },
      { status: 422 },
    ),
  )
  const erro = await adapter()
    .build({ project: structuredClone(project) as never })
    .then(
      () => null,
      (cause: unknown) => cause as Error & { output?: string },
    )
  expect(erro).toBeInstanceOf(Error)
  expect(erro?.message).toBe(RECADO)
  expect(erro?.output).toBe('[sz-catalog-imports] STUDIO_UNDECLARED_DEPENDENCY')
})

test('resposta de erro sem recado (ou com um recado que não é texto) mantém o recado de sempre', async () => {
  for (const corpo of [{}, { error: { message: 42 } }, { private: 'nunca' }]) {
    respostas.push(Response.json(corpo, { status: 503 }))
    const erro = await adapter()
      .build({ project: structuredClone(project) as never })
      .then(
        () => null,
        (cause: unknown) => cause as Error & { output?: string },
      )
    expect(erro?.message).toBe(
      'Não foi possível compilar esta revisão. Confira a autoria e tente novamente.',
    )
    expect(erro?.output).toBeUndefined()
  }
})
