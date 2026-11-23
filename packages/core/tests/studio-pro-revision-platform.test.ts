import { describe, expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '../src/studio/pro-limits'
import {
  applyStudioProChange,
  createStudioProRevision,
  parseStudioProRevision,
  type StudioProPlatformFiles,
  studioProDigest,
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
  test('a cópia conhecida fica na revisão e no hash; sem a lista, o teto vale para ela', async () => {
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
    // A fronteira HTTP nunca recebe a lista: a mesma revisão é recusada ao chegar no servidor.
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
