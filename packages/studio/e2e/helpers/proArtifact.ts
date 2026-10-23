import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import {
  buildProRuntimeBridgeScript,
  STUDIO_PRO_ARTIFACT_LIMITS,
  type StudioProTemplateId,
  type StudioProValidationIdentity,
} from '@sistemazero/core/studio'
import { serveArtifact, storeArtifact } from '../../../studio-runtime/src/artifacts'
import { trustedViteConfig } from '../../../studio-runtime/src/contracts'
import { memoryArtifactBucket } from '../../../studio-runtime/tests/artifact-bucket'

const runtime = fileURLToPath(new URL('../../../studio-runtime/runtime/', import.meta.url))
async function run(args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) =>
    execFile('node', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) =>
      error ? reject(new Error(stdout + stderr)) : resolve(),
    ),
  )
}

/** Real Vite and the production packer/HTTP contract; only the private bucket is in memory. */
export async function createTestProArtifact(
  page: Page,
  files: Record<string, string | Uint8Array>,
  template: StudioProTemplateId,
  options: {
    bridge?: boolean
    mount?: boolean
    parentUrl?: string
    validation?: StudioProValidationIdentity
  } = {},
) {
  const root = await mkdtemp(join(tmpdir(), 'studio-browser-artifact-'))
  const dispose = () => rm(root, { recursive: true, force: true })
  try {
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    }
    await symlink(join(runtime, 'node_modules'), join(root, 'node_modules'), 'junction')
    await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig(template))
    await run(
      [
        join(runtime, 'node_modules/vite/bin/vite.js'),
        'build',
        '--config',
        'vite.config.mjs',
        '--configLoader',
        'native',
      ],
      root,
    )
    await page.goto(options.parentUrl ?? '/')
    await writeFile(
      join(root, 'artifact-options.json'),
      JSON.stringify({
        consoleBridge: options.bridge
          ? buildProRuntimeBridgeScript(new URL(page.url()).origin)
          : '',
      }),
    )
    await run(
      [
        join(runtime, 'pack-artifact.mjs'),
        String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
        String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
      ],
      root,
    )
    const { bucket } = memoryArtifactBucket()
    const artifact = await storeArtifact({
      bucket,
      origin: 'https://runtime.test',
      parentOrigin: new URL(page.url()).origin,
      validation: options.validation,
      manifest: JSON.parse(await readFile(join(root, 'artifact-manifest.json'), 'utf8')),
      read: async (path) => new Uint8Array(await readFile(join(root, 'dist', path))),
    })
    await page.route('https://runtime.test/**', async (route) => {
      const response = await serveArtifact(new Request(route.request().url()), bucket)
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      })
    })
    if (options.mount !== false)
      await page.evaluate((url) => {
        document.body.replaceChildren()
        const frame = document.createElement('iframe')
        frame.id = 'game'
        frame.setAttribute('sandbox', 'allow-scripts')
        frame.src = url
        document.body.append(frame)
      }, artifact.url)
    return { artifact, bucket, dispose }
  } catch (error) {
    await dispose()
    throw error
  }
}
