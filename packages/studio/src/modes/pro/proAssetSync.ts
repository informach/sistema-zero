import {
  isValidAssetDataUrl,
  normalizeAssetName,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  type ProjectTree,
} from '#core'
import { fileSystemErrorCode } from '../../components/terminal/fileSystemError'
import { PRO_ASSET_MANIFEST, validProAssetPath } from '../../core/proAssetPaths'
import { buildProAssetBundle, decodeProAsset, type ProAssetBundle } from '../../core/proAssets'

interface AssetFs {
  readFile(path: string): Promise<Uint8Array>
  writeFile(path: string, bytes: Uint8Array): Promise<unknown>
  mkdir(path: string, options: { recursive: true }): Promise<unknown>
  rm(path: string, options: { force: true }): Promise<unknown>
}
const absent = (error: unknown) => fileSystemErrorCode(error) === 'ENOENT'
const equal = (a: Uint8Array | undefined, b: Uint8Array | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((value, index) => value === b[index]))
function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 16_384)
    binary += String.fromCharCode(...bytes.subarray(index, index + 16_384))
  return `data:${mime};base64,${btoa(binary)}`
}

const TERMINAL_ASSET_TYPES: Record<string, [ProjectAsset['kind'], string]> = {
  png: ['image', 'image/png'],
  jpg: ['image', 'image/jpeg'],
  jpeg: ['image', 'image/jpeg'],
  webp: ['image', 'image/webp'],
  gif: ['image', 'image/gif'],
  avif: ['image', 'image/avif'],
  bmp: ['image', 'image/bmp'],
  mp3: ['audio', 'audio/mpeg'],
  wav: ['audio', 'audio/wav'],
  ogg: ['audio', 'audio/ogg'],
  webm: ['audio', 'audio/webm'],
  m4a: ['audio', 'audio/mp4'],
  glb: ['model3d', 'model/gltf-binary'],
  hdr: ['environment3d', 'image/vnd.radiance'],
}

/** Lives inside the filesystem coordinator's queue, not a second writer. */
export function createProAssetSync(
  fs: AssetFs,
  options: {
    active(): boolean
    get(): { assets: ProjectAsset[]; tree: ProjectTree; legacyRuntime?: boolean }
    apply(expected: ProjectAsset[], next: ProjectAsset[]): void
    report(message: string): void
  },
) {
  let previous: ProAssetBundle | null = null
  let previousAssets: ProjectAsset[] | null = null
  const ownedPaths = new Set<string>([PRO_ASSET_MANIFEST])
  // Successful writes and accepted shell edits survive a later failure in the same pass.
  // Retrying must not turn our own partial writes into a second terminal conflict.
  const written = new Map<string, Uint8Array>()
  const accepted = new Map<string, Uint8Array>()
  const check = () => {
    if (!options.active()) throw new DOMException('Sincronização cancelada.', 'AbortError')
  }
  async function read(path: string) {
    try {
      return await fs.readFile(path)
    } catch (error) {
      if (!absent(error)) throw error
    }
  }
  return {
    owns: (path: string) => ownedPaths.has(path),
    async ingest(paths: readonly string[]): Promise<string[]> {
      check()
      const current = options.get()
      const additions: ProjectAsset[] = []
      const remaining: string[] = []
      for (const path of paths) {
        const type = TERMINAL_ASSET_TYPES[path.split('.').pop()?.toLowerCase() ?? '']
        if (!validProAssetPath(path) || !type) {
          remaining.push(path)
          continue
        }
        if (current.assets.some((asset) => asset.proPath === path)) continue
        const bytes = await read(path)
        check()
        if (!bytes) continue
        // Bound before the base64 allocation. Use the same per-kind contract as upload.
        const limit =
          type[0] === 'image'
            ? PROJECT_ASSET_LIMITS.maxAssetDataUrlChars
            : type[0] === 'audio'
              ? PROJECT_ASSET_LIMITS.maxAudioDataUrlChars
              : PROJECT_ASSET_LIMITS.maxModel3DDataUrlChars
        if (
          Math.ceil(bytes.byteLength / 3) * 4 + type[1].length + 13 > limit ||
          current.assets.length + additions.length >= PROJECT_ASSET_LIMITS.maxAssetsCount
        )
          throw new Error(`O material ${path} ultrapassa o limite do projeto.`)
        const fileName = path.split('/').pop() ?? 'material'
        if ((type[0] === 'model3d' || type[0] === 'environment3d') && fileName.length > 128)
          throw new Error(
            `O nome de ${path} ultrapassa 128 caracteres. Renomeie o material antes de salvar.`,
          )
        const url = dataUrl(bytes, type[1])
        if (!isValidAssetDataUrl(url, type[0], fileName))
          throw new Error(
            `O arquivo ${path} não contém um material válido. Corrija-o antes de salvar.`,
          )
        const stem = normalizeAssetName(fileName.replace(/\.[^.]+$/, '')) ?? 'material'
        let name = stem
        for (
          let suffix = 2;
          [...current.assets, ...additions].some((asset) => asset.name === name);
          suffix++
        )
          name = `${stem.slice(0, 32)}-${suffix}`
        additions.push({
          id: crypto.randomUUID(),
          name,
          kind: type[0],
          source: 'upload',
          proPath: path,
          ...(type[0] === 'model3d' || type[0] === 'environment3d'
            ? { originalFileName: fileName }
            : {}),
          dataUrl: url,
        })
      }
      if (!additions.length) return remaining
      const next = [...current.assets, ...additions]
      const bundle = await buildProAssetBundle(next, current.tree, {
        legacyRuntime: current.legacyRuntime,
      })
      check()
      options.apply(current.assets, next)
      const newIds = new Set(additions.map((asset) => asset.id))
      const entries = bundle.manifest.assets.filter((entry) => newIds.has(entry.id))
      // Seed the observed baseline only for files actually read. Other materialized
      // paths, especially the previous manifest, keep their last filesystem version.
      const baseline = new Map(previous?.files)
      for (const entry of entries) {
        const bytes = bundle.files.get(entry.path)
        if (bytes) baseline.set(entry.path, bytes)
        ownedPaths.add(entry.path)
      }
      previous = {
        files: baseline,
        manifest: { version: 1, assets: [...(previous?.manifest.assets ?? []), ...entries] },
      }
      previousAssets = [...(previousAssets ?? []), ...additions]
      return remaining
    },
    async sync(changes: ReadonlySet<string> = new Set(['*'])) {
      check()
      const current = options.get()
      const observed = new Map<string, Uint8Array | undefined>()
      const changed = (path: string) =>
        changes.has('*') ||
        changes.has(path) ||
        [...changes].some((parent) => parent !== '' && path.startsWith(`${parent}/`))
      // Reconcile shell changes against the last materialization before writing library updates.
      let next = current.assets
      const acceptedInPass = new Map<string, Uint8Array>()
      if (previous)
        for (const entry of previous.manifest.assets) {
          if (!changed(entry.path)) continue
          const disk = await read(entry.path)
          observed.set(entry.path, disk)
          check()
          const base = written.get(entry.path) ?? previous.files.get(entry.path)
          if (equal(base, disk) || (disk && equal(accepted.get(entry.path), disk))) continue
          const before = previousAssets?.find((asset) => asset.id === entry.id)
          const editor = next.find((asset) => asset.id === entry.id)
          if (disk && editor && equal(decodeProAsset(editor.dataUrl).bytes, disk)) continue
          // Do not turn a deletion of a projection into deletion of the durable library.
          if (!disk) {
            options.report(
              `O arquivo ${entry.path} foi removido no terminal. A cópia guardada em Materiais será restaurada; remova por lá para excluir do jogo.`,
            )
            continue
          }
          const url = dataUrl(disk, entry.mime)
          if (
            !isValidAssetDataUrl(
              url,
              entry.kind,
              editor?.originalFileName ?? before?.originalFileName,
            )
          )
            throw new Error(
              `O terminal alterou ${entry.path} para um material inválido. Restaure o arquivo ou importe uma versão válida em Materiais.`,
            )
          if (editor && before?.dataUrl === editor.dataUrl) {
            const { libRevision: _revision, ...rest } = editor
            next = next.map((asset) => (asset.id === editor.id ? { ...rest, dataUrl: url } : asset))
          } else {
            // Both sides changed: retain the library version and a durable terminal copy.
            const id = crypto.randomUUID()
            const stem = `${entry.name.slice(0, 24)}-terminal`
            let name = stem
            for (let suffix = 2; next.some((asset) => asset.name === name); suffix++)
              name = `${stem}-${suffix}`
            next = [
              ...next,
              {
                id,
                name,
                kind: entry.kind,
                source: 'upload',
                dataUrl: url,
                ...(before?.originalFileName ? { originalFileName: before.originalFileName } : {}),
              },
            ]
            options.report(
              `Edições simultâneas em ${entry.name}. A versão do terminal foi preservada como ${name} em Materiais.`,
            )
          }
          acceptedInPass.set(entry.path, disk)
        }
      if (next !== current.assets) {
        options.apply(current.assets, next)
        for (const [path, bytes] of acceptedInPass) accepted.set(path, bytes)
        check()
      }
      // An asset may have changed while the filesystem read was in flight.
      const latest = options.get()
      const bundle = await buildProAssetBundle(latest.assets, latest.tree, {
        legacyRuntime: latest.legacyRuntime,
      })
      check()
      for (const path of bundle.files.keys()) ownedPaths.add(path)
      for (const [path, bytes] of bundle.files) {
        const prior = previous?.files.get(path)
        if (equal(prior, bytes) && !changed(path)) continue
        const disk = await read(path)
        check()
        if (equal(disk, bytes)) continue
        if (!previous?.files.has(path) && !written.has(path) && disk)
          throw new Error(
            `O arquivo ${path} já existe no terminal. Renomeie-o antes de importar este material.`,
          )
        // Refuse overwrites arriving during the asynchronous materialization.
        if (
          (previous?.files.has(path) || written.has(path)) &&
          disk &&
          !equal(disk, observed.has(path) ? observed.get(path) : (written.get(path) ?? prior))
        )
          throw new Error(
            `O terminal alterou ${path} durante a sincronização. Salve novamente após terminar o comando.`,
          )
        await fs.mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true })
        check()
        await fs.writeFile(path, bytes)
        written.set(path, bytes)
        check()
      }
      // Remove only the exact last materialization; never recursively remove a folder.
      if (previous)
        for (const [path, bytes] of previous.files) {
          if (bundle.files.has(path)) continue
          const disk = await read(path)
          check()
          if (disk && !equal(disk, observed.has(path) ? observed.get(path) : bytes))
            throw new Error(`O material ${path} mudou no terminal; importe-o antes de excluir.`)
          if (disk) await fs.rm(path, { force: true })
        }
      previous = bundle
      previousAssets = latest.assets
      written.clear()
      accepted.clear()
    },
  }
}
