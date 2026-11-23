import { describe, expect, test } from 'bun:test'
import {
  currentProEngineCopies,
  PRO_ENGINE_EXTENSION_IDS,
  PRO_ENGINE_VARIANTS,
  proEngineCopyPath,
} from '../../studio/src/modes/pro/proEngineCopies'
import { type ProBuildRequest, readBuildRequest } from '../../studio-runtime/src/contracts'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  preflightStudioProBuild,
  StudioProRuntimeInputError,
  studioProRuntimePublicStatus,
} from '../src/server/studio-pro-runtime'

test('JavaScript Pro runtime classification retains legacy JS and excludes Python or invalid trees', () => {
  const project = {
    kind: 'pro',
    tree: { 'index.html': { kind: 'file', content: '<main>Oi</main>' } },
  }
  expect(isProStudioProject(project)).toBe(true)
  expect(isProStudioProject({ ...project, programmingLanguage: 'javascript' })).toBe(true)
  expect(isProStudioProject({ ...project, programmingLanguage: 'python' })).toBe(false)
  expect(isProStudioProject({ ...project, programmingLanguage: 'ruby' })).toBe(false)
  expect(isProStudioProject({ ...project, tree: [] })).toBe(false)
})

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

/**
 * O build hospedado de um 2D convertido para o Pro (aula, ao vivo, Arquipélago, Publicar, Admin):
 * a cópia do motor (`public/sz-ext/<id>.js`, perto de 400 mil caracteres) passa do teto de 256 mil
 * por arquivo. O BFF e o compilador remoto (aqui, o mesmo parser do Worker no lugar da rede)
 * reconhecem a cópia publicada intacta pelo sha256 do inventário do core; até 23/11/2026 os dois
 * respondiam 413/400 para todo 2D convertido.
 */
describe('build hospedado do 2D convertido para o Pro', () => {
  const artifactId = 'a'.repeat(64)
  type FetchImpl = Parameters<typeof buildStudioProProject>[0]['fetchImpl']
  const build = (files: Record<string, string>, fetchImpl: FetchImpl) =>
    buildStudioProProject({
      project: {
        id: 'jogo-convertido',
        name: 'Jogo',
        kind: 'pro',
        mode: 'code',
        tree: Object.fromEntries(
          Object.entries({ 'index.html': '<canvas id="jogo"></canvas>', ...files }).map(
            ([path, content]) => [path, { kind: 'file' as const, content }],
          ),
        ),
        proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
        ir: null,
        blocksState: null,
        installedExtensions: [],
        createdAt: 1,
        updatedAt: 1,
      },
      templateId: 'vanilla-vite',
      executionId: 'lesson-1234567890abcdef',
      runtimeUrl: 'https://runtime.test',
      runtimeToken: 'token',
      parentOrigin: 'https://kids.test',
      fetchImpl,
    })
  /** O compilador remoto: o parser do Worker (`/v1/build`) e um artefato quando ele aceita. */
  const worker = () => {
    const received: ProBuildRequest[] = []
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      received.push(await readBuildRequest(JSON.parse(String(init?.body))))
      return Response.json({
        ok: true,
        artifact: {
          id: artifactId,
          url: `https://runtime.test/v1/artifacts/${artifactId}/index.html`,
          sha256: 'b'.repeat(64),
          expiresAt: Date.now() + 60_000,
        },
      })
    }
    return { received, fetchImpl }
  }

  for (const id of PRO_ENGINE_EXTENSION_IDS)
    for (const variant of PRO_ENGINE_VARIANTS)
      test(`${id}, ${variant}: o BFF e o compilador aceitam o motor publicado intacto`, async () => {
        const engine = (await currentProEngineCopies(id))[variant]
        expect(engine.length).toBeGreaterThan(256_000)
        const remote = worker()
        const result = await build({ [proEngineCopyPath(id)]: engine }, remote.fetchImpl)
        expect(result.artifact.id).toBe(artifactId)
        expect(remote.received).toHaveLength(1)
        expect(remote.received[0]?.files[proEngineCopyPath(id)]).toBe(engine)
      })

  test('motor editado, motor no caminho do outro e arquivo grande da criança: 413 sem chamar o compilador', async () => {
    const engine = (await currentProEngineCopies('game-2d')).completo
    const path = proEngineCopyPath('game-2d')
    for (const files of [
      { [path]: `${engine} ` },
      { [proEngineCopyPath('game-2d-advanced')]: engine },
      { [path]: engine, 'src/fase.js': 'x'.repeat(256_001) },
    ]) {
      const remote = worker()
      const refused = await build(files, remote.fetchImpl).catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(StudioProRuntimeInputError)
      expect(refused).toMatchObject({ status: 413 })
      expect(remote.received).toHaveLength(0)
    }
    // E o compilador também recusa, se um BFF antigo deixasse passar.
    await expect(
      readBuildRequest({
        executionId: 'lesson-1234567890abcdef',
        templateId: 'vanilla-vite',
        parentOrigin: 'https://kids.test',
        files: { 'index.html': '<canvas></canvas>', [path]: `${engine} ` },
      }),
    ).rejects.toThrow('Um arquivo do projeto ultrapassou o tamanho permitido.')
  })
})
