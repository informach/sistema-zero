import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DOTENV_NAMES, SERVICE_DIRECTORIES } from './isolation.mjs'
import { assertLocalStackIsolation, childEnv, ROOT, run, SERVICES } from './lib'

const fixtures: string[] = []
function fixture() {
  const dir = fs.mkdtempSync(join(tmpdir(), 'local-studio-stack-test-'))
  fixtures.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    const path = relative(tmpdir(), dir)
    if (isAbsolute(path) || path.startsWith('..') || !path.startsWith('local-studio-stack-test-'))
      throw new Error('Fixture fora da pasta temporária')
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('os comandos Bun dos serviços não descobrem dotenv no cwd', () => {
  const dir = fixture()
  fs.writeFileSync(join(dir, '.env'), 'LOCAL_STACK_SYNTHETIC_MARKER=dotenv-synthetic\n')
  fs.writeFileSync(
    join(dir, 'probe.ts'),
    'console.log(process.env.LOCAL_STACK_SYNTHETIC_MARKER ?? "absent")',
  )
  const args = SERVICES.find((service) => service.name === 'auth')!.args.slice(0, -1)
  const child = spawnSync(process.execPath, [...args, 'probe.ts'], {
    cwd: dir,
    env: childEnv({}),
    encoding: 'utf8',
    timeout: 10_000,
  })
  expect(child.status).toBe(0)
  expect(child.stdout.trim()).toBe('absent')
})

test('run recusa dotenv antes de escrever ou executar o filho Bun', () => {
  const dir = fixture()
  const witness = join(dir, 'child-started')
  fs.writeFileSync(join(dir, '.env'), 'LOCAL_STACK_SYNTHETIC_MARKER=dotenv-synthetic\n')
  fs.writeFileSync(
    join(dir, 'probe.ts'),
    'require("node:fs").writeFileSync("child-started", "started")',
  )
  expect(() => run(process.execPath, ['run', 'probe.ts'], { cwd: dir })).toThrow('.env')
  expect(fs.existsSync(witness)).toBe(false)
})

test('run recusa dotenv que o loader real do Next descobriria independentemente do Bun', () => {
  const dir = fixture()
  const require = createRequire(join(ROOT, 'packages/admin/package.json'))
  const nextRequire = createRequire(require.resolve('next/package.json'))
  const nextEnv = nextRequire.resolve('@next/env')
  const witness = join(dir, 'child-started')
  fs.writeFileSync(
    join(dir, '.env.development.local'),
    'LOCAL_STACK_SYNTHETIC_MARKER=dotenv-synthetic\n',
  )
  fs.writeFileSync(
    join(dir, 'probe.cjs'),
    `require(${JSON.stringify(nextEnv)}).loadEnvConfig(process.cwd(), true); require('node:fs').writeFileSync('child-started', process.env.LOCAL_STACK_SYNTHETIC_MARKER ?? 'absent')`,
  )
  // Controle positivo: --no-env-file não desliga o loader do Next.
  const child = spawnSync(process.execPath, ['--no-env-file', 'run', 'probe.cjs'], {
    cwd: dir,
    env: childEnv({}),
    encoding: 'utf8',
    timeout: 10_000,
  })
  expect(child.status).toBe(0)
  expect(fs.readFileSync(witness, 'utf8')).toBe('dotenv-synthetic')
  fs.unlinkSync(witness)
  expect(() => run(process.execPath, ['run', 'probe.cjs'], { cwd: dir })).toThrow(
    '.env.development.local',
  )
  expect(fs.existsSync(witness)).toBe(false)
})

test('preflight cobre root, cwd e todos os serviços, mas permite templates', () => {
  const root = fixture()
  const cwd = fixture()
  const directories = [root, cwd, ...SERVICES.map(({ dir }) => join(root, 'packages', dir))]
  expect(Object.values(SERVICE_DIRECTORIES).sort()).toEqual(SERVICES.map(({ dir }) => dir).sort())
  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(join(directory, '.env.example'), 'SYNTHETIC=template')
    for (const name of DOTENV_NAMES) {
      const file = join(directory, name)
      fs.writeFileSync(file, 'LOCAL_STACK_SYNTHETIC_MARKER=must-not-be-printed')
      try {
        assertLocalStackIsolation({ root, cwd })
        throw new Error('Preflight deveria recusar o arquivo')
      } catch (error) {
        expect((error as Error).message).toContain(file)
        expect((error as Error).message).not.toContain('must-not-be-printed')
      }
      expect(fs.readFileSync(file, 'utf8')).toBe('LOCAL_STACK_SYNTHETIC_MARKER=must-not-be-printed')
      fs.unlinkSync(file)
    }
  }
  expect(() => assertLocalStackIsolation({ root, cwd })).not.toThrow()
})

test('preflight recusa o fallback dotenv no configDir do Wrangler e permite .dev.vars local', () => {
  const root = fixture()
  const directory = join(root, '.cache/local-stack/studio-runtime')
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(join(directory, '.dev.vars'), 'INTERNAL_TOKEN=synthetic-local-token')
  fs.writeFileSync(join(directory, '.env.example'), 'SYNTHETIC=template')
  // The local launcher/getPlatformProxy select no Wrangler environment.
  fs.writeFileSync(join(directory, '.env.production'), 'SYNTHETIC=unselected-environment')
  expect(() => assertLocalStackIsolation({ root, cwd: root })).not.toThrow()
  for (const name of ['.env', '.env.local']) {
    const file = join(directory, name)
    fs.writeFileSync(file, 'SYNTHETIC=must-not-be-printed')
    expect(() => assertLocalStackIsolation({ root, cwd: root })).toThrow(file)
    expect(fs.readFileSync(file, 'utf8')).toBe('SYNTHETIC=must-not-be-printed')
    fs.unlinkSync(file)
  }
  expect(fs.readFileSync(join(directory, '.dev.vars'), 'utf8')).toBe(
    'INTERNAL_TOKEN=synthetic-local-token',
  )
})

test('childEnv filtra variáveis de loaders e de provedores herdadas', () => {
  const dir = fixture()
  const keys = [
    'NODE_ENV',
    'NEXT_RUNTIME',
    'AUTH_HMAC_SECRET',
    'GATEWAY_URL',
    'SENTRY_DSN',
    'OPENROUTER_API_KEY',
  ]
  fs.writeFileSync(
    join(dir, 'probe.ts'),
    `import { childEnv } from ${JSON.stringify(pathToFileURL(join(import.meta.dir, 'lib.ts')).href)}; const env = childEnv({ NODE_ENV: 'development' }); console.log(JSON.stringify(${JSON.stringify(keys)}.map(key => env[key] ?? null)))`,
  )
  const child = spawnSync(process.execPath, ['--no-env-file', 'run', 'probe.ts'], {
    cwd: dir,
    env: childEnv(Object.fromEntries(keys.map((key) => [key, 'synthetic-only']))),
    encoding: 'utf8',
    timeout: 10_000,
  })
  expect(child.status).toBe(0)
  expect(JSON.parse(child.stdout)).toEqual(['development', null, null, null, null, null])
})

test('entrypoints recusam dotenv antes de efeitos, inclusive importados', () => {
  const root = fixture()
  const scripts = join(root, 'scripts/local-studio-stack')
  fs.mkdirSync(scripts, { recursive: true })
  for (const name of fs.readdirSync(import.meta.dir)) {
    if (/\.(?:ts|mjs)$/.test(name))
      fs.copyFileSync(join(import.meta.dir, name), join(scripts, name))
  }
  // Only module resolution uses the real packages. All generated paths remain inside this fixture.
  fs.symlinkSync(join(ROOT, 'packages'), join(root, 'packages'), 'junction')
  fs.writeFileSync(join(root, '.env'), 'LOCAL_STACK_SYNTHETIC_MARKER=must-not-be-printed')
  for (const name of [
    'setup.ts',
    'up.ts',
    'python-local.ts',
    'accounts.ts',
    'curriculum.ts',
    'members-script.ts',
    'migrate.ts',
    'verify.ts',
    'browser-check.mjs',
    'kids-first-course.mjs',
    'studio-e2e.mjs',
  ]) {
    const node = name.endsWith('.mjs')
    const child = spawnSync(
      node ? 'node' : process.execPath,
      [
        ...(node ? ['--input-type=module'] : ['--no-env-file']),
        '-e',
        `await import(${JSON.stringify(pathToFileURL(join(scripts, name)).href)})`,
      ],
      {
        cwd: root,
        env: childEnv({}),
        encoding: 'utf8',
        timeout: 10_000,
      },
    )
    expect(child.status).not.toBe(0)
    expect(child.stderr).toContain('Pilha local recusada')
    expect(child.stderr).not.toContain('must-not-be-printed')
    expect(fs.existsSync(join(root, '.cache'))).toBe(false)
  }
})
