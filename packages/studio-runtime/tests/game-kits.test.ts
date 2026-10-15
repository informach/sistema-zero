import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_PRO_ARTIFACT_LIMITS, STUDIO_PRO_TEMPLATES } from '@sistemazero/core/studio'
import { parseBuildRequest, trustedPackageJson, trustedViteConfig } from '../src/contracts'
import { materializeTestTemplate } from './template-files'

const dependencies = fileURLToPath(new URL('../runtime/node_modules', import.meta.url))

for (const metadata of STUDIO_PRO_TEMPLATES) {
  test(`${metadata.id}: original sources typecheck and trusted Vite builds without external resources`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'sz-game-kit-'))
    try {
      const { template, files, binaries } = await materializeTestTemplate(metadata.id)
      const input = parseBuildRequest({
        executionId: 'kit-1234567890abcdef',
        parentOrigin: 'https://kids.test',
        templateId: template.id,
        files,
        binaries,
      })
      for (const [path, content] of Object.entries(input.files)) {
        await mkdir(dirname(join(root, path)), { recursive: true })
        await writeFile(join(root, path), content)
      }
      for (const [path, entry] of Object.entries(binaries)) {
        await mkdir(dirname(join(root, path)), { recursive: true })
        await writeFile(join(root, path), Buffer.from(entry.base64, 'base64'))
      }
      await symlink(dependencies, join(root, 'node_modules'), 'junction')
      if (files['tsconfig.json'])
        await run(
          ['node', join(dependencies, 'typescript/bin/tsc'), '--noEmit', '--project', root],
          root,
        )
      await writeFile(join(root, 'package.json'), trustedPackageJson(template.id))
      await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig(template.id))
      await run(
        [
          'node',
          join(dependencies, 'vite/bin/vite.js'),
          'build',
          '--config',
          'vite.config.mjs',
          '--configLoader',
          'native',
        ],
        root,
      )
      const html = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(html).toContain('./assets/')
      expect(html).not.toMatch(/https?:\/\//)
      await writeFile(join(root, 'artifact-options.json'), JSON.stringify({ consoleBridge: '' }))
      await run(
        [
          'node',
          fileURLToPath(new URL('../runtime/pack-artifact.mjs', import.meta.url)),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
        ],
        root,
      )
    } finally {
      // root is the fresh mkdtemp path; rm removes junctions without following them.
      await rm(root, { recursive: true, force: true })
    }
  }, 90_000)
}

async function run(command: string[], cwd: string) {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ code, error: code === 0 ? '' : stdout + stderr }).toEqual({ code: 0, error: '' })
}
