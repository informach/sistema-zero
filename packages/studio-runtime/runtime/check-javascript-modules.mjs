import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

/** Only immutable official package bytes enter this virtual, network-free route. */
export async function createPinnedThreeModuleResolver(packageRoot, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid pinned Three version')
  const root = await fs.realpath(packageRoot)
  const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  if (metadata.name !== 'three' || metadata.version !== version)
    throw new Error('The installed Three version differs from the trusted image')
  const prefix = `/three@${version}/`
  const cache = new Map()
  let retainedBytes = 0
  return async (url) => {
    if (
      url.origin !== 'https://esm.sh' ||
      url.username ||
      url.password ||
      url.hash ||
      (url.search && url.search !== '?external=three')
    )
      return
    if (!url.pathname.startsWith(prefix)) return
    const file = url.pathname.slice(prefix.length)
    if (
      !/^(?:build|examples\/jsm)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.m?js$/.test(file) ||
      file.split('/').some((part) => part === '.' || part === '..')
    )
      return
    if (cache.has(file)) return cache.get(file)
    if (cache.size >= 256) throw new Error('The official module count exceeded its budget')
    const loading = (async () => {
      const location = path.join(root, ...file.split('/'))
      const real = await fs.realpath(location)
      if (real !== location || !real.startsWith(root + path.sep))
        throw new Error('The official module path changed')
      const info = await fs.lstat(location)
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        info.size > 4 * 1024 * 1024 ||
        retainedBytes + info.size > 32 * 1024 * 1024
      )
        throw new Error('The official module exceeded its resource budget')
      retainedBytes += info.size
      const bytes = await fs.readFile(location)
      if (bytes.byteLength !== info.size) throw new Error('The official module size changed')
      return { bytes, type: 'text/javascript' }
    })()
    cache.set(file, loading)
    return loading
  }
}

/** Lazy: ordinary 2D checks never resolve or read the Three package. */
export async function createImageThreeModuleResolver() {
  const require = createRequire(import.meta.url)
  const entry = require.resolve('three')
  const root = path.dirname(path.dirname(entry))
  const image = JSON.parse(await fs.readFile(new URL('./package.json', import.meta.url), 'utf8'))
  return createPinnedThreeModuleResolver(root, image.dependencies.three)
}
