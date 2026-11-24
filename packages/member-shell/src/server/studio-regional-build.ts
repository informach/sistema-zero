import { createHash } from 'node:crypto'
import { isStudioProBuildMaterialPath, type StudioProBuildEnvelope } from '@sistemazero/core/studio'
import { PintaRegionalMarkerSchema } from '@sistemazero/core/studio/pinta-regional-marker'
import { admitRegionalProjectAssets } from '@sistemazero/studio/pinta-regional-admission'
import { z } from 'zod'

const Entry = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  path: z.string(),
  url: z.string(),
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.enum(['upload', 'library', 'lesson-art']),
  width: z.number().optional(),
  height: z.number().optional(),
  regional: PintaRegionalMarkerSchema.optional(),
})
const Manifest = z.object({ version: z.literal(1), assets: z.array(Entry).max(128) })
const marker = 'public/studio-assets/manifest.json'
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** A builder revision can contain only files and binaries. Reconstruct its
 * admitted regional material from the exact manifest/PNG pair before projecting
 * a platform engine. Never trust a caller's proposed executable projection.
 */
export async function projectStudioRegionalBuild(input: StudioProBuildEnvelope) {
  const files = { ...input.files }
  const binaries = input.binaries
  const manifestEntry = binaries?.[marker]
  if (!manifestEntry) return files
  const entries = binaries ? { ...binaries } : {}
  function bytes(path: string) {
    const entry = entries[path]
    if (!entry || !isStudioProBuildMaterialPath(path))
      throw new Error('O material não foi recebido por inteiro.')
    const captured = Buffer.from(entry.base64, 'base64')
    if (captured.toString('base64') !== entry.base64 || digest(captured) !== entry.sha256)
      throw new Error('O material recebido não confere com a revisão.')
    return captured
  }
  const json: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes(marker)))
  // Ordinary bundles retain their existing contract; regional bundles require every entry.
  const envelope = z.object({ assets: z.array(z.unknown()) }).parse(json)
  if (
    !envelope.assets.some(
      (asset) => asset !== null && typeof asset === 'object' && Object.hasOwn(asset, 'regional'),
    )
  )
    return files
  const manifest = Manifest.parse(json)
  const paths = new Set<string>()
  const assets = manifest.assets.map((entry) => {
    if (paths.has(entry.path) || entry.url !== entry.path.slice('public/'.length))
      throw new Error('O manifesto repete ou altera o caminho de um material.')
    paths.add(entry.path)
    const data = bytes(entry.path)
    if (entry.bytes !== data.length || entry.sha256 !== digest(data))
      throw new Error('Os bytes do material não conferem com o manifesto.')
    if (entry.regional && (entry.kind !== 'image' || entry.mime !== 'image/png'))
      throw new Error('O cenário precisa do seu PNG original.')
    return {
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      source: entry.source,
      dataUrl: `data:${entry.mime};base64,${data.toString('base64')}`,
      width: entry.width,
      height: entry.height,
      ...(entry.regional ? { regional: entry.regional } : {}),
    }
  })
  await admitRegionalProjectAssets(assets)
  const [
    { prepareRegionalMaterialData },
    { mapTwoDRegionalEngineBootstrap, regionalWorldsDataScript },
    { proRegionalEngineCopy },
  ] = await Promise.all([
    import('@sistemazero/studio/pinta-regional-runtime'),
    import('@sistemazero/studio/pinta-regional-bootstrap'),
    import('@sistemazero/studio/pinta-regional-pro-runtime'),
  ])
  const captured = await prepareRegionalMaterialData(assets)
  const prefix = regionalWorldsDataScript(captured.worldsJson)
  const runtime = new TextDecoder('utf-8', { fatal: true }).decode(bytes('public/sz-assets.js'))
  if (!runtime.startsWith(prefix))
    throw new Error('O código dos materiais não corresponde aos cenários recebidos.')
  const ids = ['game-2d', 'game-2d-advanced'].filter(
    (id) => files[`public/sz-ext/${id}.js`] !== undefined,
  )
  if (ids.length !== 1) throw new Error('O cenário precisa de um só motor de jogo 2D.')
  const id = ids[0]
  if (!id) throw new Error('O motor do cenário está ausente.')
  const path = `public/sz-ext/${id}.js`
  const script = await mapTwoDRegionalEngineBootstrap(id === 'game-2d' ? 'g2d' : 'gk')
  if (
    files[path] !== script &&
    (await proRegionalEngineCopy({ [path]: { kind: 'file', content: files[path] } }, id)) !==
      'current'
  )
    throw new Error('O motor deste projeto Pro foi modificado. O original foi preservado.')
  files[path] = script
  return files
}
