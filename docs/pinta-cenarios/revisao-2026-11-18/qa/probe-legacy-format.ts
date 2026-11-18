// Reproduz o leitor real da base inicial; não simula seu sanitizador.
// Na raiz: bun docs/pinta-cenarios/revisao-2026-11-18/qa/probe-legacy-format.ts
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '../../../..')
const temp = resolve(root, '.tmp/pinta-legacy-format-probe')
await mkdir(temp, { recursive: true })
async function baseline(relative: string, name: string, overrides: Record<string, string> = {}) {
  const proc = Bun.spawn(['git', 'show', `567b93f95:${relative}`], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const source = await new Response(proc.stdout).text()
  if ((await proc.exited) !== 0) throw new Error(await new Response(proc.stderr).text())
  const rewritten = source.replace(/(from\s*['"])([^'"]+)(['"])/g, (_, a, s, b) => {
    if (s.startsWith('@sistemazero/core/'))
      return (
        a +
        pathToFileURL(resolve(root, 'packages/core/src', s.slice('@sistemazero/core/'.length)))
          .href +
        b
      )
    if (!s.startsWith('.')) return a + s + b
    const original = resolve(root, dirname(relative), s)
    return a + pathToFileURL(overrides[original] ?? original).href + b
  })
  const target = resolve(temp, name)
  await Bun.write(target, rewritten)
  return { path: target, module: await import(pathToFileURL(target).href) }
}
const config = await baseline('packages/pinta/src/core/projectConfig.ts', 'projectConfig.ts')
const project = await baseline('packages/pinta/src/core/project.ts', 'project.ts', {
  [resolve(root, 'packages/pinta/src/core/projectConfig')]: config.path,
})
const backup = await baseline('packages/pinta/src/export/projectJson.ts', 'projectJson.ts', {
  [resolve(root, 'packages/pinta/src/core/project')]: project.path,
})
const cloud = await baseline('packages/core/src/creations/pinta-format.ts', 'pinta-format.ts')
const current: typeof import('../../../../packages/pinta/src/core/project') = await import(
  pathToFileURL(resolve(root, 'packages/pinta/src/core/project.ts')).href
)
const json = await import(
  pathToFileURL(resolve(root, 'packages/pinta/src/export/projectJson.ts')).href
)
const nowCloud = await import(
  pathToFileURL(resolve(root, 'packages/core/src/creations/pinta-format.ts')).href
)
const map = current.createTilemapAsset({ name: 'fracao', tilesetId: 't', cols: 2, rows: 2, now: 1 })
map.layers[0].offsetX = 16.5
map.layers[0].offsetY = 0.25
map.layers.push({
  id: 'o',
  kind: 'objects',
  name: 'Objetos',
  visible: true,
  objects: [
    {
      id: 'a',
      name: 'Area',
      type: 'area',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      shape: 'ellipse',
      properties: {},
    },
  ],
})
const stamped = current.withPintaSchemaStamp(map)
const forcedOld4 = project.module.sanitizePintaAsset({ ...stamped, schema: 4 })
const fractionalSet = {
  id: 'set',
  name: 'set',
  kind: 'map-set' as const,
  schema: 4,
  createdAt: 1,
  updatedAt: 1,
  map,
}
const integer = {
  ...map,
  layers: map.layers.map((l) =>
    l.id === map.layers[0].id ? { ...l, offsetX: 16, offsetY: 1 } : l,
  ),
}
const layers = { ...integer, layers: integer.layers.slice(0, 1) }
const legacy = {
  ...layers,
  layers: layers.layers.map(({ offsetX, offsetY, ...rest }) => rest),
}
console.log(
  JSON.stringify({
    baseline: '567b93f95',
    baselineNativeMax: config.module.PINTA_MAX_SCHEMA,
    forced4: {
      schema: forcedOld4.schema,
      x: forcedOld4.layers[0].offsetX,
      y: forcedOld4.layers[0].offsetY ?? null,
    },
    protected: {
      schema: stamped.schema,
      envelope: json.envelopeVersionFor([stamped]),
      oldNativeRejects: project.module.sanitizePintaAsset(stamped) === null,
      oldFileRejects:
        backup.module.importPintaJson(json.galleryToPintaJson([stamped])).assets.length === 0,
      oldSetRejects:
        project.module.sanitizePintaAsset(current.withPintaSchemaStamp(fractionalSet)) === null,
    },
    byteCanonical: {
      rich4: json.galleryToPintaJson([integer]) === backup.module.galleryToPintaJson([integer]),
      layers3: json.galleryToPintaJson([layers]) === backup.module.galleryToPintaJson([layers]),
      legacy1: json.galleryToPintaJson([legacy]) === backup.module.galleryToPintaJson([legacy]),
    },
    cloud: {
      oldWrite: cloud.module.pintaWriteFormatVersion('tilemap'),
      oldRejectsNew: !cloud.module.pintaCanReadFormatVersion(
        nowCloud.pintaWriteFormatVersion('tilemap'),
      ),
      newWrite: nowCloud.pintaWriteFormatVersion('tilemap'),
      newRead: nowCloud.PINTA_MAX_READ_FORMAT_VERSION,
    },
  }),
)
