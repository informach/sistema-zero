import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { isStudioPortablePath } from './portable-path.generated.mjs'
import {
  studioPythonLogicalFiles,
  verifyStudioPythonDeployment,
} from './python-playtest.generated.mjs'

/** Trusted filesystem bytes only. Approval/ownership are checked by the outer coordinator. */
export async function createPythonBrowserResources(root, options) {
  const parent = 'https://studio-python-inspect.invalid'
  const runtime = 'https://studio-python-runtime.invalid'
  const hashPattern = /^[a-f0-9]{64}$/
  if (
    options.version !== 1 ||
    (options.structure !== undefined && typeof options.structure !== 'boolean') ||
    !hashPattern.test(options.runtimeManifestSha256) ||
    typeof options.runtimeContentSecurityPolicy !== 'string' ||
    options.runtimeContentSecurityPolicy.length > 8000 ||
    !Array.isArray(options.runtimeFiles) ||
    !options.runtimeFiles.length ||
    options.runtimeFiles.length > 512 ||
    !options.payload ||
    options.payload.version !== 1 ||
    options.payload.snapshot?.configuration?.runtime?.manifestSha256 !==
      options.runtimeManifestSha256 ||
    !Array.isArray(options.payload.snapshot.files) ||
    options.payload.snapshot.files.length > 208
  )
    throw new Error('Invalid trusted inspection options')

  const runtimePrefix = `/v1/runtimes/${options.runtimeManifestSha256}/`
  const resources = new Map()
  const types = {
    html: 'text/html; charset=utf-8',
    mjs: 'text/javascript',
    js: 'text/javascript',
    wasm: 'application/wasm',
    json: 'application/json',
    zip: 'application/zip',
  }
  async function readResources(kind, entries, origin, prefix, maximum) {
    const directory = await fs.realpath(path.join(root, kind))
    let total = 0
    for (const entry of entries) {
      const length = kind === 'runtime' ? entry.bytes : entry.byteLength
      if (
        typeof entry.path !== 'string' ||
        !isStudioPortablePath(entry.path) ||
        !hashPattern.test(entry.sha256) ||
        !Number.isSafeInteger(length) ||
        length < 0 ||
        length > maximum
      )
        throw new Error('Invalid inspection resource')
      total += length
      if (total > maximum) throw new Error('Inspection resources exceed the limit')
      const target = await fs.realpath(path.join(directory, entry.path))
      if (!target.startsWith(`${directory}${path.sep}`) || !(await fs.stat(target)).isFile())
        throw new Error('Inspection resource escapes its directory')
      if ((await fs.stat(target)).size !== length)
        throw new Error('Inspection resource size changed')
      const bytes = await fs.readFile(target)
      if (
        bytes.length !== length ||
        createHash('sha256').update(bytes).digest('hex') !== entry.sha256
      )
        throw new Error('Inspection resource hash changed')
      const url = `${origin}${prefix}${entry.path}`
      if (resources.has(url)) throw new Error('Duplicate inspection resource')
      resources.set(url, {
        bytes,
        type: types[entry.path.split('.').at(-1)] ?? 'application/octet-stream',
        runtime: kind === 'runtime',
      })
    }
  }
  await readResources('runtime', options.runtimeFiles, runtime, runtimePrefix, 256 * 1024 * 1024)
  const runtimeMetadataURL = `${runtime}/v1/runtime-deployments/${options.runtimeManifestSha256}`
  if (
    options.runtimeFiles.some((file) => file.path === 'boot-reader.mjs') &&
    options.runtimeDeployment === undefined
  )
    throw new Error('Private Python boot requires verified deployment metadata')
  if (options.runtimeDeployment !== undefined) {
    const deployment = await verifyStudioPythonDeployment(options.runtimeDeployment)
    const declared = new Map(
      studioPythonLogicalFiles(deployment.distribution).map((file) => [file.path, file]),
    )
    if (
      deployment.release.manifestSha256 !== options.runtimeManifestSha256 ||
      declared.size !== options.runtimeFiles.length ||
      options.runtimeFiles.some((file) => {
        const expected = declared.get(file.path)
        return !expected || expected.bytes !== file.bytes || expected.sha256 !== file.sha256
      })
    )
      throw new Error('Browser resources differ from verified Python deployment')
    resources.set(runtimeMetadataURL, {
      bytes: Buffer.from(
        JSON.stringify({ release: deployment.release, distribution: deployment.distribution }),
      ),
      type: 'application/json',
      runtime: true,
    })
  }
  await readResources(
    'project',
    options.payload.snapshot.files,
    parent,
    '/project/',
    32 * 1024 * 1024,
  )
  return {
    resources,
    parent,
    runtime,
    runtimePrefix,
    runtimeMetadataURL,
    runtimeContentSecurityPolicy: options.runtimeContentSecurityPolicy,
  }
}

export function pythonBrowserParentConnectSources(configuration) {
  return `'self' ${configuration.runtime}${configuration.runtimePrefix} ${configuration.runtimeMetadataURL}`
}

/** Both inspection and playtest deny all network requests outside this verified map. */
export async function installPythonBrowserResourceRoutes(
  context,
  configuration,
  pageContentSecurityPolicy,
) {
  const { resources, parent, runtime, runtimePrefix, runtimeContentSecurityPolicy } = configuration
  const pagePolicy =
    pageContentSecurityPolicy ??
    `default-src 'none'; script-src ${runtime}${runtimePrefix}; connect-src ${pythonBrowserParentConnectSources(configuration)}; frame-src ${runtime}${runtimePrefix}; worker-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'`
  await context.routeWebSocket('**/*', (socket) => socket.close())
  await context.route('**/*', async (route) => {
    const request = route.request()
    const resource = ['GET', 'HEAD'].includes(request.method()) && resources.get(request.url())
    if (!resource) {
      await route.abort('blockedbyclient')
      return
    }
    await route.fulfill({
      status: 200,
      body: request.method() === 'HEAD' ? Buffer.alloc(0) : resource.bytes,
      headers: {
        'Content-Type': resource.type,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': resource.runtime
          ? `${runtimeContentSecurityPolicy}; frame-ancestors ${parent}`
          : pagePolicy,
      },
    })
  })
}
