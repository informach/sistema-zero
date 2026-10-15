import { describe, expect, test } from 'bun:test'
import { createEmptyProject, createProProject } from '@sistemazero/studio'
import { createAdminProRuntimeAdapter } from '../src/lib/studio-pro-authoring'

describe('autoria do Estúdio Pro', () => {
  test('o catálogo cria projeto Pro completo e mantém o projeto clássico disponível', async () => {
    const classic = createEmptyProject('aula-1', 'Atividade')
    const pro = await createProProject('aula-1', 'Atividade', 'react-ts')

    expect(classic.kind).toBeUndefined()
    expect(pro.kind).toBe('pro')
    expect(pro.proMeta?.templateId).toBe('react-ts')
    expect(pro.tree?.['index.html']).toMatchObject({ kind: 'file' })
  })

  test('adapter envia o projeto ao BFF local e devolve o preview compilado', async () => {
    let sent: unknown
    const fakeFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body))
      return Response.json({
        artifact: {
          id: 'a'.repeat(64),
          url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
          sha256: 'b'.repeat(64),
          expiresAt: Date.now() + 60_000,
        },
        output: 'build ok',
        durationMs: 12,
      })
    }) as typeof fetch
    const adapter = createAdminProRuntimeAdapter(fakeFetch)
    const project = await createProProject('aula-2', 'Pro', 'vanilla-js')

    const result = await adapter.build({ project })

    expect(sent).toEqual({
      project: { kind: 'pro', tree: project.tree, proMeta: project.proMeta },
    })
    expect(result.artifact?.url).toContain('/index.html')
  })

  test('adapter apresenta a mensagem e a saída segura do executor', async () => {
    const fakeFetch = (async () =>
      Response.json(
        { error: { message: 'Revise o código.', output: 'src/main.ts: erro' } },
        { status: 422 },
      )) as unknown as typeof fetch
    const adapter = createAdminProRuntimeAdapter(fakeFetch)

    await expect(
      adapter.build({ project: await createProProject('aula-3', 'Pro', 'vanilla-vite') }),
    ).rejects.toThrow('Revise o código.\n\nsrc/main.ts: erro')
  })
})
