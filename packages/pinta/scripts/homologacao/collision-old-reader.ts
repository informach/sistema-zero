import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTilemapAsset, withPintaSchemaStamp } from '../../src/core/project'
import { galleryToPintaJson } from '../../src/export/projectJson'

// Replays the actual last native-6 reader, not a mock claiming to be old.
// Only these four reader modules are frozen; remaining helpers are recorded as
// current dependencies. This is not a deployed-client or authenticated proof.
const root = resolve(import.meta.dirname, '../../../..'),
  base = 'dd4f0959c5e3f2a605868ef5a6ad8756559fb643'
const folder = resolve(root, '.tmp/pinta-collision-old-reader')
await mkdir(folder, { recursive: true })
const hashes: Record<string, string> = {}
async function frozen(relative: string, name: string, overrides: Record<string, string> = {}) {
  const source = execFileSync('git', ['show', `${base}:${relative}`], {
    cwd: root,
    encoding: 'utf8',
  })
  hashes[relative] = createHash('sha256').update(source).digest('hex')
  const rewritten = source.replace(/(from\s*['"])([^'"]+)(['"])/g, (_, a, s, b) => {
    if (s.startsWith('@sistemazero/core/'))
      return (
        a +
        pathToFileURL(resolve(root, 'packages/core/src', s.slice('@sistemazero/core/'.length)))
          .href +
        b
      )
    if (!s.startsWith('.')) return a + s + b
    const dependency = resolve(root, dirname(relative), s)
    return a + pathToFileURL(overrides[dependency] ?? dependency).href + b
  })
  const path = resolve(folder, name)
  await Bun.write(path, rewritten)
  return { path, module: await import(pathToFileURL(path).href) }
}
const config = await frozen('packages/pinta/src/core/projectConfig.ts', 'config.ts')
const project = await frozen('packages/pinta/src/core/project.ts', 'project.ts', {
  [resolve(root, 'packages/pinta/src/core/projectConfig')]: config.path,
})
const backup = await frozen('packages/pinta/src/export/projectJson.ts', 'backup.ts', {
  [resolve(root, 'packages/pinta/src/core/project')]: project.path,
})
const cloud = await frozen('packages/core/src/creations/pinta-format.ts', 'cloud.ts')
const legacy = createTilemapAsset({
  name: 'old-reader',
  tilesetId: 'tiles',
  cols: 4,
  rows: 4,
  now: 1,
})
const physical = withPintaSchemaStamp({
  ...legacy,
  physics: 'precise' as const,
  layers: [
    ...legacy.layers,
    {
      id: 'walls',
      kind: 'objects' as const,
      name: 'Walls',
      visible: true,
      objects: [
        {
          id: 'wall',
          name: '',
          type: '',
          x: 1,
          y: 1,
          width: 8,
          height: 8,
          shape: 'ellipse' as const,
          collision: true as const,
          properties: {},
        },
      ],
    },
  ],
})
const forced = project.module.sanitizePintaAsset({ ...physical, schema: 6 })
const facts = {
  base,
  frozenSourceSha256: hashes,
  oldNativeMax: config.module.PINTA_MAX_SCHEMA,
  oldNativeRefuses: project.module.sanitizePintaAsset(physical) === null,
  oldBackupRefuses:
    backup.module.importPintaJson(galleryToPintaJson([physical])).assets.length === 0,
  oldCloudRefuses: !cloud.module.pintaCanReadFormatVersion(6),
  forcedOldStampWouldLosePhysics:
    forced.physics === undefined && forced.layers[1].objects[0].collision === undefined,
  legacyBytesUnchanged: backup.module.galleryToPintaJson([legacy]) === galleryToPintaJson([legacy]),
}
if (
  facts.oldNativeMax !== 6 ||
  Object.values(facts).some((value) => typeof value === 'boolean' && !value)
)
  throw new Error(JSON.stringify(facts))
console.log(JSON.stringify(facts, null, 2))
