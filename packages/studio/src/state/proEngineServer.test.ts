import { afterEach, describe, expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import {
  applyStudioProChange,
  createStudioProRevision,
  parseStudioProRevision,
  type StudioProRevision,
  studioProDigest,
} from '@sistemazero/core/studio/pro-revision'
import { studioProBuildEnvelopeIssue } from '@sistemazero/core/studio/pro-runtime-capabilities'
import { readBuildRequest } from '../../../studio-runtime/src/contracts'
import {
  currentProEngineCopies,
  PRO_ENGINE_EXTENSION_IDS,
  PRO_ENGINE_VARIANTS,
  proEngineCopyPath,
} from '../modes/pro/proEngineCopies'
import { openConvertedPro, releaseConvertedPros } from '../testing/convertedProFixture'
import { captureProRevision, captureProRevisionPayload } from './proRevision'

/**
 * O 2D convertido para o Pro no servidor (23/11/2026). A cópia do motor (`public/sz-ext/<id>.js`,
 * perto de 400 mil caracteres) passa do teto de 256 mil por arquivo; de 15/10 até aqui o pedido ao
 * Zappy era recusado antes de sair do aparelho, e o servidor também o recusaria. Agora todo host
 * reconhece pelo sha256 do inventário do core uma cópia publicada intacta: o pedido passa pelo
 * cliente, pelo BFF, pelo Members e pelo parser do compilador remoto (o mesmo `readBuildRequest` de
 * `/v1/preflight` e `/v1/build`). Motor editado, motor no caminho do outro e arquivo da criança
 * acima do teto continuam recusados.
 */
afterEach(releaseConvertedPros)

const REFUSED = 'A revisão ultrapassou os limites de arquivos.'
const TOO_LARGE = 'Um arquivo do projeto ultrapassou o tamanho permitido.'
const SCRIPT = 'public/script.js'

/** O envelope que o BFF manda ao Worker (`requestStudioProBuild`/`preflightStudioProBuild`). */
function envelope(revision: StudioProRevision, binaries: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify({
      executionId: `builder-${'0'.repeat(32)}`,
      templateId: revision.templateId,
      files: revision.files,
      binaries,
      parentOrigin: 'https://kids.test',
      validate: true,
    }),
  )
}

/** O pedido ao Zappy: o painel, o BFF (`routes/studio-builder`), o Members e o compilador. */
async function zappyRequest(project: Parameters<typeof captureProRevisionPayload>[0]) {
  const payload = await captureProRevisionPayload(project)
  const wire = JSON.parse(JSON.stringify({ base: payload.base, binaries: payload.binaries }))
  expect(
    studioProBuildEnvelopeIssue({
      files: payload.base.files,
      binaries: payload.binaries,
      templateId: payload.base.templateId,
      executionId: `builder-${'0'.repeat(32)}`,
      parentOrigin: 'https://kids.test',
      validate: true,
    }),
  ).toBeNull()
  const base = await parseStudioProRevision(wire.base)
  const admitted = await createStudioProRevision(base)
  const build = await readBuildRequest(envelope(base, wire.binaries))
  return { payload, wire, base, admitted, build }
}

describe('o 2D convertido com o motor publicado intacto vai ao Zappy', () => {
  for (const id of PRO_ENGINE_EXTENSION_IDS)
    for (const variant of PRO_ENGINE_VARIANTS)
      test(`${id}, ${variant}: cliente, BFF, Members e compilador aceitam; a proposta mantém o motor`, async () => {
        const engine = (await currentProEngineCopies(id))[variant]
        expect(engine.length).toBeGreaterThan(STUDIO_PRO_BUILD_LIMITS.maxFileChars)
        const opened = await openConvertedPro(id, () => engine)
        const { payload, wire, base, admitted, build } = await zappyRequest(opened.original)
        // O pedido segue a regra do servidor; a revisão local (que acrescenta as cópias de agora)
        // concorda com ele no hash.
        expect(payload.base.hash).toBe((await captureProRevision(opened.original)).hash)
        expect(base.hash).toBe(payload.base.hash)
        expect(admitted.hash).toBe(base.hash)
        expect(base.files[opened.path]).toBe(engine)
        expect(build.files[opened.path]).toBe(engine)

        // A proposta do Zappy (ferramentas e executor do BFF, repositório do Members) muda um
        // arquivo da criança: a revisão de trabalho segue com o motor e vai ao compilador.
        const script = base.files[SCRIPT]
        if (script === undefined) throw new Error('A conversão escreveu o programa da criança.')
        const { revision } = await applyStudioProChange(base, {
          baseHash: base.hash,
          summary: 'Mudar o recado',
          patches: [
            { path: SCRIPT, before: await studioProDigest(script), content: `${script}\n// novo` },
          ],
        })
        expect(revision.files[opened.path]).toBe(engine)
        expect((await readBuildRequest(envelope(revision, wire.binaries))).files[SCRIPT]).toBe(
          `${script}\n// novo`,
        )
      })
})

describe('o que é da criança continua com o teto', () => {
  test('o motor editado é recusado no aparelho, no BFF e no compilador, mesmo com a lista do cliente', async () => {
    const opened = await openConvertedPro('game-2d', (engine) => `${engine} `)
    await expect(captureProRevisionPayload(opened.original)).rejects.toThrow(REFUSED)
    // Um cliente que monta a revisão com a lista dele (o sha256 do motor editado) não convence
    // o servidor: a lista não viaja, e o BFF e o Members só conhecem as cópias publicadas.
    const tree = opened.original.tree!
    const files = Object.fromEntries(
      Object.entries(tree).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    )
    const edited = files[opened.path]!
    const forged = await createStudioProRevision(
      {
        projectId: opened.original.id,
        templateId: 'vanilla-vite',
        devScript: 'dev',
        files,
        directories: Object.entries(tree).flatMap(([path, node]) =>
          node.kind === 'dir' ? [path] : [],
        ),
        assets: '[]',
        assetFiles: {},
      },
      { platformFiles: { [opened.path]: [await studioProDigest(edited)] } },
    )
    await expect(parseStudioProRevision(JSON.parse(JSON.stringify(forged)))).rejects.toThrow(
      REFUSED,
    )
    await expect(createStudioProRevision(forged)).rejects.toThrow(REFUSED)
    await expect(readBuildRequest(envelope(forged, {}))).rejects.toThrow(TOO_LARGE)
  })

  test('a proposta do Zappy que edita o motor é recusada no servidor', async () => {
    const opened = await openConvertedPro('game-2d-advanced', (engine) => engine)
    const { base } = await zappyRequest(opened.original)
    const engine = base.files[opened.path]!
    await expect(
      applyStudioProChange(base, {
        baseHash: base.hash,
        summary: 'Trocar a gravidade',
        patches: [
          {
            path: opened.path,
            before: await studioProDigest(engine),
            content: `${engine}\nwindow.gravidade = 2`,
          },
        ],
      }),
    ).rejects.toThrow(REFUSED)
  })

  test('o texto de um motor no caminho do outro é da criança', async () => {
    const other = proEngineCopyPath('game-2d-advanced')
    const text = (await currentProEngineCopies('game-2d')).completo
    const opened = await openConvertedPro('game-2d', (engine) => engine, {
      tree: (tree) => ({ ...tree, [other]: { kind: 'file', content: text } }),
    })
    await expect(captureProRevisionPayload(opened.original)).rejects.toThrow(REFUSED)
    const files = Object.fromEntries(
      Object.entries(opened.original.tree!).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    )
    await expect(
      readBuildRequest(
        JSON.parse(
          JSON.stringify({
            executionId: `builder-${'0'.repeat(32)}`,
            templateId: 'vanilla-vite',
            files,
            parentOrigin: 'https://kids.test',
          }),
        ),
      ),
    ).rejects.toThrow(TOO_LARGE)
  })

  test('um arquivo da criança acima do teto é recusado ao lado do motor intacto', async () => {
    const big = 'x'.repeat(STUDIO_PRO_BUILD_LIMITS.maxFileChars + 1)
    const opened = await openConvertedPro('game-2d', (engine) => engine, {
      tree: (tree) => ({ ...tree, 'src/fase.js': { kind: 'file', content: big } }),
    })
    await expect(captureProRevisionPayload(opened.original)).rejects.toThrow(REFUSED)
    const files = Object.fromEntries(
      Object.entries(opened.original.tree!).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    )
    await expect(
      readBuildRequest(
        JSON.parse(
          JSON.stringify({
            executionId: `builder-${'0'.repeat(32)}`,
            templateId: 'vanilla-vite',
            files,
            parentOrigin: 'https://kids.test',
          }),
        ),
      ),
    ).rejects.toThrow(TOO_LARGE)
  })
})
