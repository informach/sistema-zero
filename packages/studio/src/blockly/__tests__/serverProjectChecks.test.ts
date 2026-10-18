import { expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

async function buildServerEntry(entry: string) {
  // Like the persistence browser fixture, compile production modules in a clean
  // process. bun:test shares its resolver cache with Bun.build; loading the editor
  // first makes the second server bundle fail with EISDIR in Babel/Zod on Bun 1.3.11.
  const child = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, 'fixtures/serverBoundaryBuild.ts'), entry],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(stderr).toBe('')
  return { exit, ...JSON.parse(stdout) }
}

test.each([
  ['server project checks', '../projectCheckAuthoring.ts'],
  ['server check (o teste que roda o jogo)', '../../check/serverCheck.ts'],
])('%s bundle without browser editor dependencies', async (_name, entry) => {
  const result = await buildServerEntry(resolve(import.meta.dir, entry))
  expect(result).toEqual({ exit: 0, success: true, errors: [] })
})

test.each([
  'blockly',
  'react',
  'react-dom/client',
  'monaco-editor',
])('server boundary rejects %s in the clean build process', async (dependency) => {
  const directory = await mkdtemp(join(tmpdir(), 'studio-server-boundary-'))
  try {
    const entry = join(directory, 'browser.ts')
    await writeFile(entry, `import '${dependency}'`)
    const result = await buildServerEntry(entry)
    expect(result.exit).toBe(1)
    expect(result.success).toBe(false)
    expect(result.errors).toEqual([`Browser dependency reached the server catalog: ${dependency}`])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
