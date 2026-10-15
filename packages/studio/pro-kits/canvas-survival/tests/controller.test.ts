import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProTemplate } from '../../../src/components/code/pro-templates'
import { buildProProject } from '../../../src/core/proProject'
import { buildProFileMap } from '../../../src/export/fileMap'

const variants = {
  normal: {},
  time: { surviveSeconds: 0.25, spawnSeconds: 60 },
  kills: {
    surviveSeconds: 60,
    defeatGoal: 2,
    spawnSeconds: 0.05,
    seekerSpeed: 0,
    drifterSpeed: 0,
    pulseRadius: 900,
    pulseDamage: 100,
  },
  loss: {
    surviveSeconds: 60,
    spawnSeconds: 0.05,
    playerHealth: 1,
    seekerSpeed: 1200,
    drifterSpeed: 1200,
    safeSpawnDistance: 0,
  },
}
let server: Server
let base: string
let fixtureDirectory: string | undefined
let temporaryRoot: string
const artifactDirectory =
  process.env.CANVAS_ARENA_ARTIFACTS ?? join(tmpdir(), 'studio-arena-controller')

beforeAll(async () => {
  const template = await loadProTemplate('canvas-survival')
  const project = {
    ...buildProProject(
      'controller-fixture',
      'Arena browser fixture',
      template.tree,
      template.devScript,
      template.id,
    ),
    assets: template.assets,
  }
  const { files, warnings } = await buildProFileMap(project)
  expect(warnings).toEqual([])
  expect(Object.keys(files).filter((name) => name.endsWith('.png'))).toHaveLength(3)
  temporaryRoot = await realpath(tmpdir())
  fixtureDirectory = await mkdtemp(join(temporaryRoot, 'studio-arena-controller-'))
  const compiled = new Map<string, Map<string, string>>()
  for (const [variant, configuration] of Object.entries(variants)) {
    // A real editable source configuration, before module initialization. No game mutation API.
    const sources = { ...files }
    sources['src/controller-fixture.ts'] =
      "export { createGame } from './game'\nexport { createInput } from './input'\nexport { createUI } from './ui'\n"
    sources['src/config.ts'] =
      String(sources['src/config.ts']) +
      '\nObject.assign(config, ' +
      JSON.stringify(configuration) +
      ')\n'
    const variantDirectory = join(fixtureDirectory, variant)
    for (const [path, content] of Object.entries(sources)) {
      if (!path.startsWith('src/')) continue
      const target = resolve(variantDirectory, path)
      if (!target.startsWith(variantDirectory + sep)) throw new Error('Unsafe fixture path')
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, content)
    }
    const build = await Bun.build({
      root: variantDirectory,
      entrypoints: [
        join(variantDirectory, 'src/main.ts'),
        join(variantDirectory, 'src/controller-fixture.ts'),
      ],
      target: 'browser',
      format: 'esm',
      splitting: false,
      write: false,
    })
    if (!build.success) throw new Error(build.logs.map((entry) => entry.message).join('\n'))
    const output = new Map<string, string>()
    for (const entry of build.outputs) output.set(basename(entry.path), await entry.text())
    expect(output.has('main.js')).toBe(true)
    const html = String(files['index.html'])
      .replace('src="/src/main.ts"', 'src="./main.js"')
      .replace('</head>', '<link rel="stylesheet" href="./main.css"></head>')
    output.set('', html)
    compiled.set(variant, output)
  }
  server = createServer((request, response) => {
    const send = (content: string | Uint8Array, type = 'text/plain', status = 200) => {
      response.writeHead(status, { 'content-type': type })
      response.end(content)
    }
    const match = new URL(request.url ?? '/', 'http://localhost').pathname.match(
      /^\/([^/]+)\/nested\/game\/(.*)$/,
    )
    if (!match) {
      send('missing', 'text/plain', 404)
      return
    }
    const variant = match[1]!,
      path = match[2]!
    const output = compiled.get(variant)
    if (!output) {
      send('missing fixture', 'text/plain', 404)
      return
    }
    if (output.has(path)) {
      send(
        output.get(path)!,
        path.endsWith('.js')
          ? 'application/javascript'
          : path.endsWith('.css')
            ? 'text/css'
            : 'text/html',
      )
      return
    }
    const content = files[`public/${path}`]
    if (content === undefined) {
      send('missing resource', 'text/plain', 404)
      return
    }
    send(
      typeof content === 'string' ? content : new Uint8Array(content),
      path.endsWith('.json') ? 'application/json' : 'image/png',
    )
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}, 30_000)

afterAll(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  if (fixtureDirectory) {
    const target = await realpath(fixtureDirectory)
    if (
      dirname(target) !== temporaryRoot ||
      !basename(target).startsWith('studio-arena-controller-')
    )
      throw new Error('Unsafe cleanup path')
    await rm(target, { recursive: true, force: true })
  }
})

test('materialized arena controller runs its complete browser lifecycle with real assets', async () => {
  const child = Bun.spawn(
    [
      'node',
      '--experimental-strip-types',
      fileURLToPath(new URL('./controller.browser.ts', import.meta.url)),
      base,
      artifactDirectory,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, output, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0) throw new Error(`${output}\n${errors}`)
  console.log(output)
  expect(output).toContain('pass 8')
}, 90_000)
