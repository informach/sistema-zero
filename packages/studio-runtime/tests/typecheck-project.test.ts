import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../runtime/check-project.mjs', import.meta.url))
const dependencies = fileURLToPath(new URL('../runtime/node_modules', import.meta.url))
async function verify(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'studio-types-'))
  try {
    await symlink(dependencies, join(root, 'node_modules'), 'junction')
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    }
    const child = Bun.spawn(['node', script], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    return { code, output: stdout + stderr }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const files = {
  'package.json': JSON.stringify({
    devDependencies: { vite: '8.0.16' },
    dependencies: { three: '0.180.0' },
  }),
  'src/main.ts':
    "import { Vector3 } from 'three'; const vector: Vector3 = new Vector3(); console.log(vector)",
}
test('HTML-only revisions have no source program, while an explicit empty tsconfig remains an error', async () => {
  expect(await verify({ 'index.html': '<main>Hello</main>' })).toEqual({ code: 0, output: '' })
  expect(
    (
      await verify({
        'index.html': '<main>Hello</main>',
        'tsconfig.json': '{"include":["missing/**/*.ts"]}',
      })
    ).code,
  ).toBe(1)
}, 60_000)
test('real remote typechecking resolves installed declarations and reports semantic errors in closed files', async () => {
  expect(await verify(files)).toEqual({ code: 0, output: '' })
  const broken = await verify({
    ...files,
    'src/closed.ts': 'const value: number = "wrong"; export { value }',
  })
  expect(broken.code).toBe(1)
  expect(broken.output).toContain('TS2322')
  expect(broken.output).toContain('closed.ts')
}, 60_000)
test('an installed but undeclared library cannot silently pass, and noCheck does not suppress evidence', async () => {
  const undeclared = await verify({
    ...files,
    'package.json': '{"devDependencies":{"vite":"8.0.16"}}',
  })
  expect(undeclared.code).toBe(1)
  expect(undeclared.output).toContain('não está declarada')
  const unchecked = await verify({
    ...files,
    'tsconfig.json':
      '{"compilerOptions":{"noCheck":true,"skipLibCheck":true},"include":["src/closed.ts"]}',
    'src/closed.ts': 'const value: number = "wrong"',
  })
  expect(unchecked.code).toBe(1)
  expect(unchecked.output).toContain('TS2322')
}, 60_000)
test('external config and compiler plugins fail explicitly instead of executing project code', async () => {
  const external = await verify({
    ...files,
    'tsconfig.json': '{"extends":"../../outside/tsconfig.json"}',
  })
  expect(external.code).toBe(1)
  const plugin = await verify({
    ...files,
    'tsconfig.json': '{"compilerOptions":{"plugins":[{"name":"./malicious.cjs"}]}}',
    'malicious.cjs': 'throw new Error("EXECUTED_UNTRUSTED_PLUGIN")',
  })
  expect(plugin.code).toBe(1)
  expect(plugin.output).toContain('Plugins TypeScript')
  expect(plugin.output).not.toContain('EXECUTED_UNTRUSTED_PLUGIN')
}, 60_000)
