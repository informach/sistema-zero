import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../runtime/inline-preview.mjs', import.meta.url))
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('inline-preview', () => {
  test('embute assets locais e impõe CSP/referrer sem manter recursos externos', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sz-runtime-preview-'))
    roots.push(root)
    await mkdir(join(root, 'dist', 'assets'), { recursive: true })
    await writeFile(
      join(root, 'dist', 'index.html'),
      `<!doctype html><html><head>
        <script type="module" src="./assets/app.js"></script>
        <script src="https://malicioso.test/app.js"></script>
        <link rel="stylesheet" href="./assets/app.css">
        <link rel="stylesheet" href="https://malicioso.test/app.css">
      </head><body><main>Oi</main></body></html>`,
    )
    await writeFile(join(root, 'dist', 'assets', 'app.js'), 'console.log("seguro")')
    await writeFile(join(root, 'dist', 'assets', 'app.css'), 'main { color: green }')

    const child = Bun.spawn([process.execPath, script], { cwd: root, stderr: 'pipe' })
    expect(await child.exited).toBe(0)

    const html = await readFile(join(root, 'preview.html'), 'utf8')
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain('<meta name="referrer" content="no-referrer">')
    expect(html).toContain('console.log("seguro")')
    expect(html).toContain('main { color: green }')
    expect(html).not.toContain('malicioso.test')
  })

  test.each([
    {
      name: 'script antes do head',
      document:
        '<!doctype html><script>fetch("https://evil.test/antes")</script><html><head><title>Teste</title></head><body></body></html>',
    },
    {
      name: 'comentário que contém head antes do head real',
      document:
        '<!doctype html><!-- <head> --><html><head><script>fetch("https://evil.test/comentario")</script></head><body></body></html>',
    },
    {
      name: 'head com atributos e caixa diferente',
      document:
        '<!doctype html><html><HEAD data-app="teste"><script>fetch("https://evil.test/atributo")</script></HEAD><body></body></html>',
    },
  ])('insere a CSP antes de qualquer script em $name', async ({ document }) => {
    const root = await mkdtemp(join(tmpdir(), 'sz-runtime-preview-order-'))
    roots.push(root)
    await mkdir(join(root, 'dist'), { recursive: true })
    await writeFile(join(root, 'dist', 'index.html'), document)

    const child = Bun.spawn([process.execPath, script], { cwd: root, stderr: 'pipe' })
    expect(await child.exited).toBe(0)

    const html = await readFile(join(root, 'preview.html'), 'utf8')
    const cspIndex = html.indexOf('http-equiv="Content-Security-Policy"')
    const attackerIndex = html.indexOf('fetch("https://evil.test/')
    expect(cspIndex).toBeGreaterThanOrEqual(0)
    expect(attackerIndex).toBeGreaterThanOrEqual(0)
    expect(cspIndex).toBeLessThan(attackerIndex)
    expect(html.match(/Content-Security-Policy/g) ?? []).toHaveLength(1)
  })
})
