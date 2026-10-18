import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createPythonBrowserResources,
  installPythonBrowserResourceRoutes,
  pythonBrowserParentConnectSources,
} from '../runtime/python-browser-resources.mjs'
import { pythonDistributionFixture } from './python-distribution-fixture'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
async function fixture() {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-python-l0/browser-resources',
    crypto.randomUUID(),
  )
  await mkdir(resolve(root, 'runtime'), { recursive: true })
  await mkdir(resolve(root, 'project'), { recursive: true })
  const source = Buffer.from('\uFEFFprint("ação")\n')
  const runtime = Buffer.from('export const trustedRuntime = true\n')
  await writeFile(resolve(root, 'project/main.py'), source)
  await writeFile(resolve(root, 'runtime/standalone.mjs'), runtime)
  const options = {
    version: 1,
    runtimeManifestSha256: 'a'.repeat(64),
    runtimeContentSecurityPolicy: "default-src 'none'; sandbox allow-scripts",
    runtimeFiles: [{ path: 'standalone.mjs', sha256: digest(runtime), bytes: runtime.length }],
    payload: {
      version: 1,
      snapshot: {
        configuration: { runtime: { manifestSha256: 'a'.repeat(64) } },
        files: [{ path: 'main.py', sha256: digest(source), byteLength: source.length }],
      },
    },
  }
  return { root, options, source, runtime }
}

test('private boot maps only metadata bound to the exact verified runtime files and pin', async () => {
  const f = await fixture()
  const runtime = await pythonDistributionFixture({ standalone: true, boot: true })
  for (const [name, bytes] of runtime.contents)
    await writeFile(resolve(f.root, 'runtime', name), bytes)
  const hash = runtime.deployment.release.manifestSha256
  const options = {
    ...f.options,
    runtimeManifestSha256: hash,
    runtimeFiles: runtime.deployment.distribution.files,
    runtimeDeployment: runtime.deployment,
    payload: {
      ...f.options.payload,
      snapshot: {
        ...f.options.payload.snapshot,
        configuration: { runtime: { manifestSha256: hash } },
      },
    },
  }
  const configuration = await createPythonBrowserResources(f.root, options)
  const metadata = configuration.resources.get(configuration.runtimeMetadataURL)
  expect(JSON.parse(metadata.bytes.toString('utf8'))).toEqual(runtime.deployment)
  expect(configuration.runtimeMetadataURL).toBe(
    `${configuration.runtime}/v1/runtime-deployments/${hash}`,
  )
  expect(pythonBrowserParentConnectSources(configuration)).toBe(
    `'self' ${configuration.runtime}${configuration.runtimePrefix} ${configuration.runtimeMetadataURL}`,
  )
  expect(configuration.resources.has(`${configuration.runtimeMetadataURL}?other=true`)).toBe(false)
  await expect(
    createPythonBrowserResources(f.root, { ...options, runtimeDeployment: undefined }),
  ).rejects.toThrow('requires verified')
  const changed = structuredClone(runtime.deployment)
  changed.distribution.files[0].bytes++
  await expect(
    createPythonBrowserResources(f.root, { ...options, runtimeDeployment: changed }),
  ).rejects.toThrow('differ')
  changed.release.manifestSha256 = 'b'.repeat(64)
  await expect(
    createPythonBrowserResources(f.root, { ...options, runtimeDeployment: changed }),
  ).rejects.toThrow()
})

test('trusted browser map preserves original source bytes and serves only verified listed files', async () => {
  const f = await fixture()
  const result = await createPythonBrowserResources(f.root, f.options)
  expect(result.resources.size).toBe(2)
  expect(result.resources.get(`${result.parent}/project/main.py`).bytes).toEqual(f.source)
  expect(
    result.resources.get(`${result.runtime + result.runtimePrefix}standalone.mjs`).bytes,
  ).toEqual(f.runtime)
  expect(result.resources.has(`${result.parent}/project/other.py`)).toBe(false)
})

test('compressed approval metadata maps the exact logical runtime set without exposing transport artifacts', async () => {
  const f = await fixture()
  const runtime = await pythonDistributionFixture({
    standalone: true,
    boot: true,
    compressed: true,
  })
  const logicalFiles = runtime.deployment.distribution.files.filter(
    (file) => !file.path.startsWith('_http/'),
  )
  for (const file of logicalFiles)
    await writeFile(resolve(f.root, 'runtime', file.path), runtime.contents.get(file.path))
  const hash = runtime.deployment.release.manifestSha256
  const options = {
    ...f.options,
    runtimeManifestSha256: hash,
    runtimeFiles: logicalFiles,
    runtimeDeployment: runtime.deployment,
    payload: {
      ...f.options.payload,
      snapshot: {
        ...f.options.payload.snapshot,
        configuration: { runtime: { manifestSha256: hash } },
      },
    },
  }
  const result = await createPythonBrowserResources(f.root, options)
  expect(
    JSON.parse(result.resources.get(result.runtimeMetadataURL).bytes.toString('utf8')),
  ).toEqual(runtime.deployment)
  expect([...result.resources.keys()].some((url) => url.includes('/_http/'))).toBe(false)
  await expect(
    createPythonBrowserResources(f.root, { ...options, runtimeFiles: logicalFiles.slice(1) }),
  ).rejects.toThrow('differ')
  await expect(
    createPythonBrowserResources(f.root, {
      ...options,
      runtimeFiles: [...logicalFiles, logicalFiles[0]],
    }),
  ).rejects.toThrow()
})

test('changed source/hash/size, duplicate entries and parent escapes cannot enter the browser map', async () => {
  const f = await fixture()
  for (const changed of [
    { ...f.options, runtimeFiles: [...f.options.runtimeFiles, ...f.options.runtimeFiles] },
    { ...f.options, runtimeFiles: [{ ...f.options.runtimeFiles[0], sha256: 'f'.repeat(64) }] },
    { ...f.options, runtimeFiles: [{ ...f.options.runtimeFiles[0], bytes: f.runtime.length + 1 }] },
    { ...f.options, runtimeFiles: [{ ...f.options.runtimeFiles[0], path: '../outside.mjs' }] },
    { ...f.options, runtimeManifestSha256: 'b'.repeat(64) },
  ])
    await expect(createPythonBrowserResources(f.root, changed)).rejects.toThrow()
  await writeFile(resolve(f.root, 'project/main.py'), Buffer.alloc(f.source.length, 32))
  await expect(createPythonBrowserResources(f.root, f.options)).rejects.toThrow('hash changed')
})

test('real filesystem links cannot escape the declared runtime directory even with a matching hash', async () => {
  const f = await fixture()
  const outside = resolve(f.root, 'outside')
  await mkdir(outside)
  await writeFile(resolve(outside, 'standalone.mjs'), f.runtime)
  await symlink(outside, resolve(f.root, 'runtime/escape'), 'junction')
  const options = {
    ...f.options,
    runtimeFiles: [{ ...f.options.runtimeFiles[0], path: 'escape/standalone.mjs' }],
  }
  await expect(createPythonBrowserResources(f.root, options)).rejects.toThrow(
    'escapes its directory',
  )
})

test('closed routing refuses external URLs, unlisted paths and writes while retaining frame CSP', async () => {
  const f = await fixture()
  const configuration = await createPythonBrowserResources(f.root, f.options)
  let handle
  let webSocket
  await installPythonBrowserResourceRoutes(
    {
      async route(_pattern, callback) {
        handle = callback
      },
      async routeWebSocket(_pattern, callback) {
        webSocket = callback
      },
    },
    configuration,
  )
  const calls = []
  async function request(method, url) {
    await handle({
      request: () => ({ method: () => method, url: () => url }),
      async abort(reason) {
        calls.push({ aborted: reason })
      },
      async fulfill(response) {
        calls.push(response)
      },
    })
    return calls.at(-1)
  }
  for (const [method, url] of [
    ['GET', 'https://external.example/leak'],
    ['GET', `${configuration.parent}/project/unlisted.py`],
    ['POST', `${configuration.parent}/project/main.py`],
  ])
    expect(await request(method, url)).toEqual({ aborted: 'blockedbyclient' })
  const response = await request(
    'GET',
    `${configuration.runtime + configuration.runtimePrefix}standalone.mjs`,
  )
  expect(response.body).toEqual(f.runtime)
  expect(response.headers['Content-Security-Policy']).toBe(
    `${f.options.runtimeContentSecurityPolicy}; frame-ancestors ${configuration.parent}`,
  )
  const head = await request('HEAD', `${configuration.parent}/project/main.py`)
  expect(head.body.byteLength).toBe(0)
  let closed = false
  webSocket({
    close() {
      closed = true
    },
  })
  expect(closed).toBe(true)
})
