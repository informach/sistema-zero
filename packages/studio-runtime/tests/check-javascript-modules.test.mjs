import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createImageThreeModuleResolver,
  createPinnedThreeModuleResolver,
} from '../runtime/check-javascript-modules.mjs'

test('the offline image and lock share the single Studio renderer pin', async () => {
  const image = JSON.parse(await readFile(new URL('../runtime/package.json', import.meta.url)))
  const lock = JSON.parse(await readFile(new URL('../runtime/package-lock.json', import.meta.url)))
  expect(image.dependencies.three).toBe('0.184.0')
  expect(lock.packages['node_modules/three'].version).toBe(image.dependencies.three)
  expect(image.dependencies['three-classic']).toBeUndefined()
  expect(lock.packages['node_modules/three-classic']).toBeUndefined()
})

const directories = []
test('the immutable image serves only the current Studio Three pin', async () => {
  const resolve = await createImageThreeModuleResolver()
  const entry = await resolve(new URL('https://esm.sh/three@0.184.0'))
  expect(entry?.bytes.toString()).toBe("export * from '/three@0.184.0/build/three.module.js';")
  const module = await resolve(new URL('https://esm.sh/three@0.184.0/build/three.core.js'))
  expect(module?.type).toBe('text/javascript')
  expect(module?.bytes.byteLength).toBeGreaterThan(0)
  expect(await resolve(new URL('https://esm.sh/three@0.180.0'))).toBeUndefined()
  expect(await resolve(new URL('https://esm.sh/three@0.181.0'))).toBeUndefined()
})

afterEach(async () => {
  for (const dir of directories.splice(0)) {
    if (!path.basename(dir).startsWith('sz-three-modules-') || path.dirname(dir) !== os.tmpdir())
      throw Error('Unsafe QA directory')
    await rm(dir, { recursive: true })
  }
})
async function fixture(version = '0.184.0') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sz-three-modules-'))
  directories.push(dir)
  await mkdir(path.join(dir, 'build'))
  await mkdir(path.join(dir, 'examples/jsm/utils'), { recursive: true })
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'three', version }))
  await writeFile(path.join(dir, 'build/three.module.js'), "export * from './three.core.js'")
  await writeFile(path.join(dir, 'build/three.core.js'), 'export const present = true')
  await writeFile(
    path.join(dir, 'examples/jsm/utils/SkeletonUtils.js'),
    'export function clone(x) { return x }',
  )
  return { dir, resolve: await createPinnedThreeModuleResolver(dir, version) }
}

test('the image retains the original 256-module limit', async () => {
  const { dir, resolve } = await fixture()
  for (let index = 0; index < 256; index++) {
    await writeFile(path.join(dir, `build/module-${index}.js`), 'x')
    expect(
      (
        await resolve(new URL(`https://esm.sh/three@0.184.0/build/module-${index}.js`))
      ).bytes.toString(),
    ).toBe('x')
  }
  await expect(
    resolve(new URL('https://esm.sh/three@0.184.0/build/three.core.js')),
  ).rejects.toThrow('module count')
})

test('the image retains the original 32 MiB retention limit', async () => {
  const { dir, resolve } = await fixture()
  const module = Buffer.alloc(4 * 1024 * 1024)
  for (let index = 0; index < 8; index++) {
    await writeFile(path.join(dir, `build/large-${index}.js`), module)
    expect(
      (await resolve(new URL(`https://esm.sh/three@0.184.0/build/large-${index}.js`))).bytes
        .byteLength,
    ).toBe(module.byteLength)
  }
  await expect(
    resolve(new URL('https://esm.sh/three@0.184.0/build/three.core.js')),
  ).rejects.toThrow('resource budget')
})

test('the pinned package and its relative JS dependencies are available without external network', async () => {
  const { resolve } = await fixture()
  expect((await resolve(new URL('https://esm.sh/three@0.184.0'))).bytes.toString()).toBe(
    "export * from '/three@0.184.0/build/three.module.js';",
  )
  for (const file of [
    'build/three.module.js',
    'build/three.core.js',
    'examples/jsm/utils/SkeletonUtils.js',
  ]) {
    const result = await resolve(new URL(`https://esm.sh/three@0.184.0/${file}?external=three`))
    expect(result.type).toBe('text/javascript')
    expect(result.bytes.byteLength).toBeGreaterThan(0)
  }
})
test('the resolver cannot expose another version, package, origin, non-JS file or escaped path', async () => {
  const { resolve } = await fixture()
  for (const url of [
    'https://esm.sh/three@0.181.0/build/three.module.js',
    'https://other.test/three@0.184.0/build/three.module.js',
    'https://esm.sh/three@0.184.0/package.json',
    'https://esm.sh/three@0.184.0/../../private.js',
    'https://esm.sh/three@0.184.0/examples/jsm/%2e%2e%2fprivate.js',
    'https://esm.sh/three@0.184.0/build/three.module.js?token=anything',
    'https://user:password@esm.sh/three@0.184.0/build/three.module.js',
  ])
    expect(await resolve(new URL(url))).toBeUndefined()
})
test('a substituted trusted package fails before serving any module', async () => {
  const { dir } = await fixture()
  await expect(createPinnedThreeModuleResolver(dir, '0.181.0')).rejects.toThrow('version')
})

test('a linked module directory cannot escape the immutable package', async () => {
  const { dir, resolve } = await fixture()
  await symlink(path.join(dir, 'build'), path.join(dir, 'examples/jsm/linked'), 'junction')
  await expect(
    resolve(new URL('https://esm.sh/three@0.184.0/examples/jsm/linked/three.core.js')),
  ).rejects.toThrow('path changed')
})

test('an oversized official module fails closed', async () => {
  const { dir, resolve } = await fixture()
  await writeFile(path.join(dir, 'build/oversized.js'), Buffer.alloc(4 * 1024 * 1024 + 1))
  await expect(resolve(new URL('https://esm.sh/three@0.184.0/build/oversized.js'))).rejects.toThrow(
    'resource budget',
  )
})
