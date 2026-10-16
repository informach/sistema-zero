import { describe, expect, test } from 'bun:test'
import {
  buildStudioProProject,
  opaqueStudioRuntimeExecutionId,
  preflightStudioProBuild,
  StudioProRuntimeInputError,
  studioProRuntimePublicStatus,
} from '../src/server/studio-pro-runtime'

test('preflight sends the complete bounded envelope, checks protocol and exposes actionable refusal', async () => {
  const input = {
    files: { 'index.html': '<main>Olá</main>' },
    binaries: { 'public/a.png': { base64: 'aGk=', sha256: '0'.repeat(64) } },
    templateId: 'vanilla-js' as const,
    executionId: 'builder-1234567890abcdef',
    parentOrigin: 'https://kids.test',
    runtimeUrl: 'https://runtime.test',
    runtimeToken: 'test-token',
    validate: true,
  }
  let sent: unknown
  const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toEndWith('/v1/preflight')
    expect(init?.redirect).toBe('error')
    sent = JSON.parse(String(init?.body))
    return Response.json({ ok: true, capabilities: { protocol: 1 } })
  }
  await preflightStudioProBuild({ ...input, fetchImpl })
  expect(sent).toMatchObject({
    files: input.files,
    binaries: input.binaries,
    parentOrigin: input.parentOrigin,
    validate: true,
  })
  await expect(
    preflightStudioProBuild({
      ...input,
      fetchImpl: async () => Response.json({ ok: true, capabilities: { protocol: 99 } }),
    }),
  ).rejects.toThrow('atualizado')
  await expect(
    preflightStudioProBuild({
      ...input,
      fetchImpl: async () =>
        Response.json({ ok: false, message: 'Dependência fora da imagem' }, { status: 400 }),
    }),
  ).rejects.toThrow('Dependência')
  await expect(
    preflightStudioProBuild({
      ...input,
      binaries: { 'public/a.png': { base64: 'a'.repeat(2_000_000), sha256: '0'.repeat(64) } },
      fetchImpl: async () => {
        throw new Error('Não deve chamar a rede')
      },
    }),
  ).rejects.toBeInstanceOf(StudioProRuntimeInputError)
})

describe('opaqueStudioRuntimeExecutionId', () => {
  test('é estável para a mesma autorização e não expõe os identificadores', async () => {
    const first = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-1')
    const repeated = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-1')
    const other = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-2')

    expect(first).toBe(repeated)
    expect(first).not.toBe(other)
    expect(first).toMatch(/^lesson-[a-f0-9]{48}$/)
    expect(first).not.toContain('perfil-1')
  })
})

describe('studioProRuntimePublicStatus', () => {
  test('preserva erros acionáveis de contrato, tamanho e compilação', () => {
    expect(studioProRuntimePublicStatus(400)).toBe(400)
    expect(studioProRuntimePublicStatus(413)).toBe(413)
    expect(studioProRuntimePublicStatus(422)).toBe(422)
    expect(studioProRuntimePublicStatus(429)).toBe(429)
    expect(studioProRuntimePublicStatus(500)).toBe(502)
  })
})

describe('buildStudioProProject', () => {
  test('recusa a cota de arquivos antes de chamar o runtime externo', async () => {
    const tree: Record<string, { kind: 'file'; content: string }> = {
      'index.html': { kind: 'file', content: '<main>Oi</main>' },
    }
    for (let index = 0; index < 80; index += 1) {
      tree[`src/f${index}.ts`] = { kind: 'file', content: '' }
    }
    let fetchCalls = 0
    const fetchImpl = async () => {
      fetchCalls += 1
      return new Response('não deveria chamar')
    }

    await expect(
      buildStudioProProject({
        project: {
          id: 'projeto-1',
          name: 'Projeto',
          kind: 'pro',
          mode: 'code',
          tree,
          proMeta: { templateId: 'vanilla-js', devScript: 'dev' },
          files: { 'index.html': '', 'style.css': '', 'script.js': '' },
          ir: null,
          blocksState: null,
          installedExtensions: [],
          createdAt: 1,
          updatedAt: 1,
        },
        templateId: 'vanilla-js',
        executionId: 'lesson-1234567890abcdef',
        runtimeUrl: 'https://runtime.test',
        runtimeToken: 'token',
        parentOrigin: 'https://kids.test',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(StudioProRuntimeInputError)
    expect(fetchCalls).toBe(0)
  })
})
