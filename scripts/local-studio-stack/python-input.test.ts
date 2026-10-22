import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { canonicalJson, sha256Hex } from '../../packages/core/src/creations/content-fingerprint'
import { createStudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { TURTLE_MODULE_FILES } from '../../packages/studio/src/runtime/python/turtle/contract'
import { pythonDistributionFixture } from '../../packages/studio-runtime/tests/python-distribution-fixture'
import { childEnv, ROOT } from './lib'
import { DEFAULT_PLAN_RELATIVE, option, readLocalPythonInput } from './python-input'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) {
    const path = relative(tmpdir(), root)
    if (isAbsolute(path) || path.startsWith('..') || !path.startsWith('local-python-input-test-'))
      throw new Error('Fixture fora da pasta temporária')
    fs.rmSync(root, { recursive: true, force: true })
  }
})

async function fixture() {
  const root = fs.mkdtempSync(join(tmpdir(), 'local-python-input-test-'))
  roots.push(root)
  const fixture = await pythonDistributionFixture({
    compressed: true,
    boot: true,
    standalone: true,
    playtest: true,
  })
  for (const path of [
    'analysis-worker.mjs',
    'analysis-frame.mjs',
    'turtle-renderer.mjs',
    'turtle-protocol.mjs',
    ...TURTLE_MODULE_FILES.map((name) => `turtle/${name}`),
  ])
    fixture.contents.set(path, new TextEncoder().encode(`synthetic:${path}`))
  const files = [...fixture.contents].map(([path, bytes]) => ({
    path,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }))
  const distribution = { ...fixture.deployment.distribution, files }
  const release = await createStudioRuntimeRelease({
    ...fixture.deployment.release.manifest,
    artifacts: files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  const hash = await sha256Hex(canonicalJson(distribution))
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const members = {
    version: 1,
    catalog: {
      profiles: [
        {
          id: release.profileId,
          languages: ['python'],
          kinds: ['pro'],
          modes: ['code'],
          levels: [],
          releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
        },
      ],
      releases: [release],
    },
    releases: [{ runtime, status: 'active', proTemplateIds: [], blockIds: [], categoryIds: [] }],
  }
  const plan = {
    input: { distribution: { sha256: hash, directory: 'C:/someone-else/ignored' } },
    deployment: { release, distribution },
    configuration: { members },
  }
  const planFile = join(root, DEFAULT_PLAN_RELATIVE)
  fs.mkdirSync(dirname(planFile), { recursive: true })
  fs.writeFileSync(planFile, JSON.stringify(plan))
  const directory = join(root, '.cache/studio-python-runtime/distributions', hash)
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(join(directory, 'distribution.json'), JSON.stringify(distribution))
  for (const [path, bytes] of fixture.contents) {
    fs.mkdirSync(dirname(join(directory, path)), { recursive: true })
    fs.writeFileSync(join(directory, path), bytes)
  }
  return { root, directory, planFile, plan, runtime }
}

test('default portátil verifica a distribuição e não escreve configuração', async () => {
  const input = await fixture()
  const result = await readLocalPythonInput({ root: input.root })
  expect(result.distribution).toBe(input.directory)
  expect(result.runtime).toEqual(input.runtime)
  expect(fs.existsSync(join(input.root, '.cache/local-stack'))).toBe(false)
})

test('plano exige JSON puro antes de qualquer configuração local', async () => {
  const input = await fixture()
  fs.writeFileSync(input.planFile, `build output\n${JSON.stringify(input.plan)}`)
  await expect(readLocalPythonInput({ root: input.root })).rejects.toThrow(
    'Plano Python local ausente ou inválido',
  )
  expect(fs.existsSync(join(input.root, '.cache/local-stack'))).toBe(false)
})

test('caminho explícito continua aceito e arquivos corrompidos são recusados antes de efeitos', async () => {
  const input = await fixture()
  const explicit = join(input.root, 'explicit-runtime')
  fs.renameSync(input.directory, explicit)
  expect(
    (await readLocalPythonInput({ root: input.root, distribution: explicit })).distribution,
  ).toBe(explicit)
  fs.writeFileSync(join(explicit, 'worker.mjs'), 'corrupt')
  await expect(readLocalPythonInput({ root: input.root, distribution: explicit })).rejects.toThrow(
    'Distribuição Python local ausente ou inválida',
  )
  expect(fs.existsSync(join(input.root, '.cache/local-stack'))).toBe(false)
})

test('descritor divergente, arquivo ausente e SHA do plano divergente são recusados', async () => {
  const input = await fixture()
  fs.writeFileSync(
    join(input.directory, 'distribution.json'),
    JSON.stringify({ ...input.plan.deployment.distribution, pythonVersion: '3.14.3' }),
  )
  await expect(readLocalPythonInput({ root: input.root })).rejects.toThrow(
    'Distribuição Python local ausente ou inválida',
  )
  fs.writeFileSync(
    join(input.directory, 'distribution.json'),
    JSON.stringify(input.plan.deployment.distribution),
  )
  fs.unlinkSync(join(input.directory, 'frame.mjs'))
  await expect(readLocalPythonInput({ root: input.root })).rejects.toThrow(
    'Distribuição Python local ausente ou inválida',
  )
  input.plan.input.distribution.sha256 = '0'.repeat(64)
  fs.writeFileSync(input.planFile, JSON.stringify(input.plan))
  await expect(readLocalPythonInput({ root: input.root })).rejects.toThrow(
    'SHA da distribuição no plano',
  )
  expect(fs.existsSync(join(input.root, '.cache/local-stack'))).toBe(false)
})

test('setup e python-local recusam plano ou distribuição ausente antes de segredos/configuração', async () => {
  const input = await fixture()
  const scripts = join(input.root, 'scripts/local-studio-stack')
  fs.mkdirSync(scripts, { recursive: true })
  for (const name of fs.readdirSync(import.meta.dir)) {
    if (/\.(?:ts|mjs)$/.test(name))
      fs.copyFileSync(join(import.meta.dir, name), join(scripts, name))
  }
  fs.symlinkSync(join(ROOT, 'packages'), join(input.root, 'packages'), 'junction')
  fs.unlinkSync(join(input.directory, 'distribution.json'))
  for (const name of ['setup.ts', 'python-local.ts']) {
    for (const [planFile, message] of [
      [join(input.root, 'missing-plan.json'), 'Plano Python local ausente ou inválido'],
      [input.planFile, 'Distribuição Python local ausente ou inválida'],
    ]) {
      const child = spawnSync(
        process.execPath,
        ['--no-env-file', join(scripts, name), '--plan', planFile!],
        {
          cwd: input.root,
          env: childEnv({}),
          encoding: 'utf8',
          timeout: 10_000,
        },
      )
      expect(child.status).not.toBe(0)
      expect(child.stderr).toContain(message!)
      expect(fs.existsSync(join(input.root, '.cache/local-stack'))).toBe(false)
    }
  }
})

test('opções sem valor falham explicitamente', () => {
  expect(() => option('--distribution', ['--distribution'])).toThrow('Informe um valor')
  expect(() => option('--distribution', ['--distribution', '--plan'])).toThrow('Informe um valor')
})
