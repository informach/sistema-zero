import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { buildProRuntimeBridgeScript, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { buildProAssetBundle } from '@sistemazero/studio/pro-assets'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import publishedBrowser from '../../studio/scripts/fixtures/project-run-context-browser-2026-11-28.json'
import { registerExtensionBlocks } from '../../studio/src/blockly/blocks'
import { ensureBlocklyInitialized } from '../../studio/src/blockly/setup'
import portableFactorySource from '../../studio/src/extensions/projectRunContextFactory.generated.json'
import { gameTwoDBlocks } from '../../studio/src/official-extensions/game-2d/blocks'
import { buildTilemapGameProject } from '../../studio/src/projects/tilemapGame'
import { convertClassicToProTree } from '../../studio/src/state/convertToPro'
import {
  installPngImageBitmap,
  projectedSceneMaterial,
  regionalSceneMaterial,
} from '../../studio/src/testing/pintaRegionalMaterialFixture'
import validationProfile from '../../studio-runtime/runtime/validation-profile.json'
import {
  readBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
  verifiedValidationPlatformFiles,
  verifyBuildBinaries,
} from '../../studio-runtime/src/contracts'
import { createFreeProRuntime } from '../src/lib/free-pro-runtime'
import { createFreeProRuntimeBuild } from '../src/server/free-pro-toolchain'
import { projectStudioRegionalBuild } from '../src/server/studio-regional-build'

const storageDescriptors = ['indexedDB', 'IDBKeyRange'].map(
  (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
)
let restoreBitmap: () => void
beforeAll(async () => {
  const studioRequire = createRequire(new URL('../../studio/package.json', import.meta.url))
  await import(studioRequire.resolve('blockly/blocks'))
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
  restoreBitmap = installPngImageBitmap()
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})
afterAll(() => {
  restoreBitmap()
  for (const [name, descriptor] of storageDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

async function fixture(projection?: 'isometric' | 'hexagonal', browserPublishedEngine = false) {
  const asset = projection
    ? await projectedSceneMaterial(projection)
    : await regionalSceneMaterial()
  const original = await buildTilemapGameProject(
    { ...asset, id: asset.regional.sourceId },
    { namespace: 'lg05-pro-build-' + crypto.randomUUID() },
  )
  if (!original) throw new Error('O botão Jogar não montou o projeto regional.')
  const tree = await convertClassicToProTree(original)
  if (browserPublishedEngine) {
    const path = 'public/sz-ext/game-2d.js'
    const node = tree[path]
    if (node?.kind !== 'file') throw new Error('O projeto não contém o motor esperado.')
    const canonicalSha = createHash('sha256').update(node.content).digest('hex')
    const copy = publishedBrowser.copies.find(
      (item) => item.extensionId === 'game-2d' && item.canonicalSha256 === canonicalSha,
    )
    if (!copy) throw new Error('A origem da cópia publicada não foi reconhecida.')
    const content = node.content.replace(portableFactorySource, publishedBrowser.factorySource)
    if (createHash('sha256').update(content).digest('hex') !== copy.browserSha256)
      throw new Error('A cópia do navegador não corresponde ao motor publicado.')
    tree[path] = { ...node, content }
  }
  const pro = {
    ...original,
    kind: 'pro' as const,
    mode: 'code' as const,
    tree,
    assets: [asset],
    proMeta: {
      templateId: 'vanilla-vite',
      devScript: 'dev',
      origin: { projectId: original.id, revision: 0 },
    },
  }
  const bundle = await buildProAssetBundle(pro.assets, pro.tree, { legacyRuntime: true })
  const binaries = Object.fromEntries(
    [...bundle.files].map(([path, bytes]) => [
      path,
      {
        base64: Buffer.from(bytes).toString('base64'),
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    ]),
  )
  const input = {
    executionId: 'lg04-regional-build',
    templateId: 'vanilla-vite',
    parentOrigin: 'https://kids.test',
    files: Object.fromEntries(
      Object.entries(tree).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    ),
    binaries,
  }
  return { input, pro, asset }
}
for (const projection of [undefined, 'isometric', 'hexagonal'] as const)
  test(`o pacote ${projection ?? 'ortogonal'} passa pelo BFF e pelo compilador sem alterar a árvore autoral`, async () => {
    // The isometric case reopens a copy already emitted by the deployed browser build.
    const { input, pro, asset } = await fixture(projection, projection === 'isometric')
    const before = JSON.stringify(pro),
      filesBefore = JSON.stringify(input.files)
    const files = await projectStudioRegionalBuild(input)
    expect(files['public/sz-ext/game-2d.js']).toContain('_pintaRegionFactory')
    expect(files['public/sz-ext/game-2d.js']).toContain('__SZ_PINTA_REGIONAL_WORLDS__')
    expect(files['public/sz-ext/game-2d.js']).not.toContain(asset.dataUrl)
    const accepted = await readBuildRequest({ ...input, files })
    await verifyBuildBinaries(accepted.binaries)
    expect(accepted.files['public/sz-ext/game-2d.js']).toBe(files['public/sz-ext/game-2d.js'])
    expect(JSON.stringify(pro)).toBe(before)
    expect(JSON.stringify(input.files)).toBe(filesBefore)
    expect(await projectStudioRegionalBuild({ ...input, files })).toEqual(files)
  })
test('PNG ou motor trocado é recusado sem adotar a projeção', async () => {
  const { input } = await fixture()
  await expect(
    projectStudioRegionalBuild({
      ...input,
      files: {
        ...input.files,
        'public/sz-ext/game-2d.js': `${input.files['public/sz-ext/game-2d.js']}\n// alterado`,
      },
    }),
  ).rejects.toThrow('modificado')
  const runtime = input.binaries['public/sz-assets.js']
  if (!runtime) throw new Error('Pacote sem dados do cenário')
  await expect(
    projectStudioRegionalBuild({
      ...input,
      binaries: {
        ...input.binaries,
        'public/sz-assets.js': {
          ...runtime,
          base64: Buffer.from('outro cenário').toString('base64'),
        },
      },
    }),
  ).rejects.toThrow('não confere')
})

const image = process.env.STUDIO_REGIONAL_TEST_IMAGE
for (const projection of [undefined, 'isometric', 'hexagonal'] as const)
  test.skipIf(!image)(
    `o Pro ${projection ?? 'ortogonal'} compila na imagem real sem rede e conserva o PNG original`,
    async () => {
      if (!image) throw new Error('Informe a imagem qualificada da LG04.')
      const { input } = await fixture(projection, projection === 'isometric')
      const files = await projectStudioRegionalBuild(input)
      const accepted = await readBuildRequest({ ...input, files })
      await verifyBuildBinaries(accepted.binaries)
      const platformFiles = await verifiedValidationPlatformFiles(accepted)
      const script = `
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = '/workspace/builds/lg04-' + require('node:crypto').randomUUID();
if (process.getuid() === 0) throw new Error('The build must not run as root.');
const profile = JSON.parse(fs.readFileSync('/opt/sz-runtime/validation-profile.json', 'utf8'));
if (profile.runtimeFingerprint !== ${JSON.stringify(validationProfile.runtimeFingerprint)}) throw new Error('The image does not match the qualified source.');
fs.mkdirSync(root, { recursive: true });
try {
  const binaries = ${JSON.stringify(accepted.binaries ?? {})};
  for (const [name, content] of Object.entries(${JSON.stringify(accepted.files)})) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  for (const [name, entry] of Object.entries(binaries)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), Buffer.from(entry.base64, 'base64'));
  }
  fs.writeFileSync(root + '/package.json', ${JSON.stringify(trustedPackageJson(accepted.templateId, accepted.dependencies))});
  fs.writeFileSync(root + '/vite.config.mjs', ${JSON.stringify(trustedViteConfig(accepted.templateId, accepted.dependencies))});
  fs.writeFileSync(root + '/validation-options.json', ${JSON.stringify(JSON.stringify({ templateId: accepted.templateId, platformFiles }))});
  fs.writeFileSync(root + '/artifact-options.json', ${JSON.stringify(JSON.stringify({ consoleBridge: buildProRuntimeBridgeScript('https://kids.test') }))});
  fs.symlinkSync('/opt/sz-runtime/node_modules', root + '/node_modules');
  const run = (args) => cp.execFileSync('node', args, { cwd: root, stdio: 'inherit', timeout: 120000 });
  run(['/opt/sz-runtime/check-project.mjs']);
  const types = JSON.parse(fs.readFileSync(root + '/typecheck-result.json', 'utf8'));
  if (types.status !== 'passed' || types.checkJs !== true || types.validation.runtimeFingerprint !== profile.runtimeFingerprint) throw new Error('The regional project lacks exact type evidence.');
  const authoredPath = root + '/public/script.js', authored = fs.readFileSync(authoredPath, 'utf8');
  fs.writeFileSync(authoredPath, authored + '\\n/** @type {number} */ const __lg05Wrong = "wrong";');
  const broken = cp.spawnSync('node', ['/opt/sz-runtime/check-project.mjs'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  if (broken.status !== 1 || !broken.stderr.includes('TS2322') || !broken.stderr.includes('public/script.js')) throw new Error('Authored errors were not diagnosed.');
  fs.writeFileSync(authoredPath, authored);
  run(['/opt/sz-runtime/node_modules/vite/bin/vite.js', 'build', '--config', './vite.config.mjs', '--configLoader', 'native']);
  run(['/opt/sz-runtime/pack-artifact.mjs', '${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes}', '${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}']);
  run(['/opt/sz-runtime/playtest.mjs']);
  const playtest = JSON.parse(fs.readFileSync(root + '/playtest-result.json', 'utf8'));
  if (playtest.evidence.length !== 2 || playtest.evidence.some(item => item.status !== 'passed')) throw new Error('The regional game lacks browser evidence.');
  let pngCount = 0;
  for (const [name, entry] of Object.entries(binaries)) {
    if (!name.startsWith('public/') || !name.endsWith('.png')) continue;
    if (!Buffer.from(entry.base64, 'base64').equals(fs.readFileSync(root + '/dist/' + name.slice(7)))) throw new Error('The build changed the original PNG.');
    pngCount++;
  }
  if (!pngCount) throw new Error('The regional PNG is missing.');
  if (!fs.readFileSync(root + '/dist/sz-ext/game-2d.js', 'utf8').includes('_pintaRegionFactory')) throw new Error('The regional engine is missing.');
  console.log(JSON.stringify({ lg04RegionalBuild: true, uid: process.getuid(), pngCount, fingerprint: profile.runtimeFingerprint }));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
`
      const child = Bun.spawn(
        [
          'docker',
          'run',
          '--rm',
          '--network',
          'none',
          '--memory',
          '1g',
          '--cpus',
          '1',
          '--pids-limit',
          '256',
          '--entrypoint',
          'node',
          '-i',
          image,
        ],
        {
          stdin: new TextEncoder().encode(script),
          stdout: 'pipe',
          stderr: 'pipe',
          windowsHide: true,
        },
      )
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      if (code !== 0)
        throw new Error(
          `Regional image build failed (${code}): ${stdout.slice(-4000)}\n${stderr.slice(-4000)}`,
        )
      expect(stdout).toContain('"lg04RegionalBuild":true')
      console.info(stdout.split('\n').find((line) => line.includes('"lg04RegionalBuild":true')))
    },
    150_000,
  )

test('o Pro público envia a identidade do motor e preserva os PNGs no fallback hospedado real do BFF', async () => {
  const { pro } = await fixture('isometric', true)
  const packageNode = pro.tree['package.json']
  if (packageNode?.kind !== 'file') throw Error('Manifesto ausente')
  const manifest = JSON.parse(packageNode.content)
  packageNode.content = JSON.stringify({
    ...manifest,
    dependencies: { ...manifest.dependencies, three: '0.184.0' },
  })
  const before = JSON.stringify(pro)
  const oldUrl = process.env.STUDIO_PRO_RUNTIME_URL,
    oldToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
  process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test'
  process.env.STUDIO_PRO_RUNTIME_TOKEN = 'test-runtime-token'
  let captured: Awaited<ReturnType<typeof readBuildRequest>> | undefined
  const upstream = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        expect(String(url)).toBe('https://runtime.test/v1/build')
        captured = await readBuildRequest(JSON.parse(String(init?.body)))
        await verifyBuildBinaries(captured.binaries)
        return Response.json({
          ok: true,
          artifact: {
            id: 'a'.repeat(64),
            sha256: 'b'.repeat(64),
            url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
            expiresAt: Date.now() + 60000,
          },
        })
      },
      { preconnect: fetch.preconnect },
    ),
  )
  try {
    const handler = createFreeProRuntimeBuild(async () => ({ id: 'owner-regional' }))
    const adapter = createFreeProRuntime(async (url, init) =>
      handler(new Request(`https://adult.test${String(url)}`, init)),
    )
    const result = await adapter.build({ project: pro, signal: new AbortController().signal })
    expect(result.artifact?.id).toBe('a'.repeat(64))
    expect(captured?.files['public/sz-ext/game-2d.js']).toContain('_pintaRegionFactory')
    expect(Object.keys(captured?.binaries ?? {}).length).toBeGreaterThan(0)
    expect(JSON.stringify(pro)).toBe(before)
    expect(upstream).toHaveBeenCalledTimes(1)
  } finally {
    upstream.mockRestore()
    if (oldUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
    else process.env.STUDIO_PRO_RUNTIME_URL = oldUrl
    if (oldToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
    else process.env.STUDIO_PRO_RUNTIME_TOKEN = oldToken
  }
})
