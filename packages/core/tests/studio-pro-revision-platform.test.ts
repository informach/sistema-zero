import { describe, expect, test } from 'bun:test'
import {
  parseStudioBuildSubmission,
  verifyStudioBuildPlatformFiles,
} from '../src/studio/build-contract'
import { studioProBuildFileLimitError } from '../src/studio/pro-build'
import {
  STUDIO_PRO_ENGINE_COPIES,
  STUDIO_PRO_ENGINE_EXTENSION_IDS,
  STUDIO_PRO_ENGINE_VARIANTS,
  STUDIO_PRO_PLATFORM_FILES,
  studioProEngineCopyPath,
} from '../src/studio/pro-engine-copies'
import { STUDIO_PRO_BUILD_LIMITS } from '../src/studio/pro-limits'
import {
  applyStudioProChange,
  createStudioProRevision,
  parseStudioProRevision,
  type StudioProPlatformFiles,
  studioProDigest,
  verifyStudioProPlatformFiles,
} from '../src/studio/pro-revision'

const ENGINE = 'public/sz-ext/game-2d.js'
const engine = (mark: string) => `/* ${mark} */${'x'.repeat(STUDIO_PRO_BUILD_LIMITS.maxFileChars)}`
const REFUSED = 'A revisão ultrapassou os limites de arquivos.'

function source(files: Record<string, string>) {
  return {
    version: 1 as const,
    projectId: 'jogo-convertido',
    templateId: 'vanilla-vite',
    devScript: 'dev',
    files: { 'index.html': '<canvas></canvas>', ...files },
    directories: ['public', 'public/sz-ext'],
    assets: '{}',
    assetFiles: {},
  }
}

async function platform(...texts: string[]): Promise<StudioProPlatformFiles> {
  return { [ENGINE]: await Promise.all(texts.map(studioProDigest)) }
}

describe('arquivos da plataforma fora do orçamento do autor', () => {
  test('a cópia conhecida fica na revisão e no hash; fora da lista, o teto vale para ela', async () => {
    const current = engine('agora')
    const input = source({ [ENGINE]: current })
    await expect(createStudioProRevision(input)).rejects.toThrow(REFUSED)
    const revision = await createStudioProRevision(input, {
      platformFiles: await platform(current),
    })
    expect(revision.files[ENGINE]).toBe(current)
    // O hash é o mesmo da revisão sem a lista: aceitar não muda o conteúdo nem o formato.
    const small = source({ [ENGINE]: 'pequeno' })
    expect((await createStudioProRevision(small)).hash).toBe(
      (await createStudioProRevision(small, { platformFiles: await platform('pequeno') })).hash,
    )
    // A lista do cliente não viaja: a fronteira HTTP só conhece as cópias publicadas, e um motor que
    // o Estúdio não publicou (o sha256 "forjado" desta lista) é recusado ao chegar no servidor.
    await expect(parseStudioProRevision(JSON.parse(JSON.stringify(revision)))).rejects.toThrow(
      REFUSED,
    )
  })

  test('outro texto no caminho do motor, ou o texto do motor noutro caminho, é do autor', async () => {
    const current = engine('agora')
    const platformFiles = await platform(current)
    await expect(
      createStudioProRevision(source({ [ENGINE]: `${current} ` }), { platformFiles }),
    ).rejects.toThrow(REFUSED)
    await expect(
      createStudioProRevision(source({ 'public/sz-ext/game-2d-advanced.js': current }), {
        platformFiles,
      }),
    ).rejects.toThrow(REFUSED)
    // O orçamento do autor continua inteiro: um arquivo dele acima do teto é recusado.
    await expect(
      createStudioProRevision(source({ [ENGINE]: current, 'src/main.js': engine('autor') }), {
        platformFiles,
      }),
    ).rejects.toThrow(REFUSED)
  })

  test('voltar para outra cópia conhecida devolve os bytes exatos, e o inverso também', async () => {
    const before = engine('antes')
    const current = engine('agora')
    const platformFiles = await platform(before, current)
    const base = await createStudioProRevision(source({ [ENGINE]: current }), { platformFiles })
    const change = {
      baseHash: base.hash,
      summary: 'Voltar para a versão',
      patches: [{ path: ENGINE, before: await studioProDigest(current), content: before }],
    }
    await expect(applyStudioProChange(base, change)).rejects.toThrow(REFUSED)
    const { revision, inverse } = await applyStudioProChange(base, change, { platformFiles })
    expect(revision.files[ENGINE]).toBe(before)
    const undone = await applyStudioProChange(revision, inverse, { platformFiles })
    expect(undone.revision.files[ENGINE]).toBe(current)
    expect(undone.revision.hash).toBe(base.hash)
    // Uma cópia que a lista não conhece não entra pela mudança.
    await expect(
      applyStudioProChange(
        base,
        { ...change, patches: [{ ...change.patches[0]!, content: engine('editado') }] },
        { platformFiles },
      ),
    ).rejects.toThrow(REFUSED)
  })
})

describe('as cópias publicadas do motor são a lista de todo host', () => {
  test('cada caminho do motor aceita só os sha256 publicados nele', () => {
    expect(Object.keys(STUDIO_PRO_PLATFORM_FILES).sort()).toEqual([
      'public/sz-ext/game-2d-advanced.js',
      'public/sz-ext/game-2d.js',
    ])
    for (const id of STUDIO_PRO_ENGINE_EXTENSION_IDS) {
      const accepted = STUDIO_PRO_PLATFORM_FILES[studioProEngineCopyPath(id)] ?? []
      expect(new Set(accepted)).toEqual(
        new Set(
          STUDIO_PRO_ENGINE_VARIANTS.flatMap((variant) => STUDIO_PRO_ENGINE_COPIES[id][variant]),
        ),
      )
      for (const digest of accepted) expect(digest).toMatch(/^[0-9a-f]{64}$/)
      // Nenhum sha256 de um motor vale no caminho do outro.
      const elsewhere = STUDIO_PRO_ENGINE_EXTENSION_IDS.filter((other) => other !== id).flatMap(
        (other) => STUDIO_PRO_PLATFORM_FILES[studioProEngineCopyPath(other)] ?? [],
      )
      expect(accepted.filter((digest) => elsewhere.includes(digest))).toEqual([])
    }
  })

  test('o motor que o Estúdio não publicou é do autor em todo host', async () => {
    const forged = engine('forjado')
    await expect(createStudioProRevision(source({ [ENGINE]: forged }))).rejects.toThrow(REFUSED)
    expect((await verifyStudioProPlatformFiles({ [ENGINE]: forged })).size).toBe(0)
    // Um arquivo pequeno no caminho do motor segue como qualquer arquivo do autor.
    const small = await createStudioProRevision(source({ [ENGINE]: 'pequeno' }))
    expect((await parseStudioProRevision(JSON.parse(JSON.stringify(small)))).hash).toBe(small.hash)
  })
})

describe('o compilador remoto deixa o arquivo conferido fora do orçamento do autor', () => {
  const TOO_LARGE = 'Um arquivo do projeto ultrapassou o tamanho permitido.'
  const request = (files: Record<string, string>) => ({
    executionId: 'lesson-1234567890abcdef',
    templateId: 'vanilla-vite',
    parentOrigin: 'https://kids.test',
    files: { 'index.html': '<canvas></canvas>', ...files },
  })

  test('só o texto conferido, no caminho dele; o arquivo do autor segue o teto', async () => {
    const current = engine('agora')
    const files = { 'index.html': '<canvas></canvas>', [ENGINE]: current }
    const verified = await verifyStudioProPlatformFiles(files, await platform(current))
    expect([...verified.keys()]).toEqual([ENGINE])
    expect(studioProBuildFileLimitError(files)).toBe('FILE_TOO_LARGE')
    expect(studioProBuildFileLimitError(files, undefined, verified)).toBeNull()
    // A conferência vale para o texto conferido: um espaço a mais já é do autor.
    expect(
      studioProBuildFileLimitError({ ...files, [ENGINE]: `${current} ` }, undefined, verified),
    ).toBe('FILE_TOO_LARGE')
    // O texto do motor noutro caminho não é conferido.
    const elsewhere = { 'public/sz-ext/game-2d-advanced.js': current }
    expect((await verifyStudioProPlatformFiles(elsewhere, await platform(current))).size).toBe(0)
    // Um arquivo do autor acima do teto continua recusado ao lado do motor conferido.
    expect(
      studioProBuildFileLimitError(
        { ...files, 'src/main.js': engine('autor') },
        undefined,
        verified,
      ),
    ).toBe('FILE_TOO_LARGE')
  })

  test('o envelope é físico: o arquivo conferido conta nos bytes enviados ao compilador', async () => {
    const current = engine('agora')
    const verified = await verifyStudioProPlatformFiles(
      { [ENGINE]: current },
      await platform(current),
    )
    // Uns 1,88 MB do autor (1,18 milhão de caracteres, dentro do total), abaixo dos 2 MB do envelope.
    const author: Record<string, string> = { 'index.html': '<canvas></canvas>' }
    for (let index = 0; index < 5; index++) author[`src/texto${index}.js`] = 'é'.repeat(140_000)
    for (let index = 0; index < 2; index++) author[`src/codigo${index}.js`] = 'a'.repeat(240_000)
    expect(studioProBuildFileLimitError(author)).toBeNull()
    expect(
      studioProBuildFileLimitError({ ...author, [ENGINE]: current }, undefined, verified),
    ).toBe('REQUEST_TOO_LARGE')
  })

  test('o pedido de build só aceita a cópia conferida; sem a conferência, vale o teto', async () => {
    const current = engine('agora')
    const body = request({ [ENGINE]: current })
    expect(() => parseStudioBuildSubmission(body)).toThrow(TOO_LARGE)
    const verified = await verifyStudioProPlatformFiles(body.files, await platform(current))
    expect(parseStudioBuildSubmission(body, verified).files[ENGINE]).toBe(current)
    // A conferência do pedido usa só o inventário do core: um motor não publicado não passa.
    const fromRequest = await verifyStudioBuildPlatformFiles(body)
    expect(fromRequest.size).toBe(0)
    expect(() => parseStudioBuildSubmission(body, fromRequest)).toThrow(TOO_LARGE)
    // Corpo malformado: nada é conferido.
    for (const malformed of [
      null,
      [],
      'texto',
      { files: null },
      { files: [current] },
      { files: { [ENGINE]: 1 } },
    ])
      expect((await verifyStudioBuildPlatformFiles(malformed)).size).toBe(0)
  })
})
