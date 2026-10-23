import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, parseFragment, serialize } from 'parse5'

// Arguments are fixed numeric limits supplied by the trusted Worker, not project code.
const maxBytes = Number(process.argv[2])
const maxFiles = Number(process.argv[3])
if (
  !Number.isSafeInteger(maxBytes) ||
  maxBytes <= 0 ||
  !Number.isSafeInteger(maxFiles) ||
  maxFiles <= 0
)
  throw new Error('Limites de build ausentes.')
const root = join(process.cwd(), 'dist')
const { consoleBridge } = JSON.parse(await readFile('artifact-options.json', 'utf8'))
if (typeof consoleBridge !== 'string' || consoleBridge.length > 16_000)
  throw new Error('Opções inválidas.')
const document = parse(await readFile(join(root, 'index.html'), 'utf8'))
const findHead = (node) =>
  node.tagName === 'head' ? node : node.childNodes?.map(findHead).find(Boolean)
const head = findHead(document)
if (!head) throw new Error('Build sem head.')
const fragment = parseFragment(
  head,
  `<script>${consoleBridge.replace(/<\/script/gi, '<\\/script')}</script>`,
)
for (const node of fragment.childNodes) node.parentNode = head
head.childNodes.unshift(...fragment.childNodes)
await writeFile(join(root, 'index.html'), serialize(document))
const files = []
let total = 0
async function walk(relative = '') {
  for (const name of (await readdir(join(root, relative))).sort()) {
    const path = relative ? `${relative}/${name}` : name
    if (
      path.length > 240 ||
      path.split('/').length > 16 ||
      !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(name)
    )
      throw new Error(`Caminho compilado inválido: ${path}`)
    const info = await lstat(join(root, path))
    if (info.isSymbolicLink()) throw new Error(`Link simbólico no resultado: ${path}`)
    if (info.isDirectory()) {
      await walk(path)
      continue
    }
    if (!info.isFile()) throw new Error(`Tipo de arquivo inválido: ${path}`)
    total += info.size
    if (total > maxBytes || files.length >= maxFiles) throw new Error('STUDIO_OUTPUT_TOO_LARGE')
    const bytes = await readFile(join(root, path))
    if (bytes.length !== info.size) throw new Error('O resultado mudou durante a leitura.')
    const contentType = /\.(?:html?|[cm]?[jt]sx?|css|json|webmanifest|txt|md)$/i.test(path)
      ? undefined
      : binaryContentType(bytes)
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      ...(contentType ? { contentType } : {}),
    })
  }
}
await walk()
if (!files.some((file) => file.path === 'index.html')) throw new Error('Build sem index.html.')
await writeFile('artifact-manifest.json', JSON.stringify({ version: 1, files }))

// Converted classic assets can have extensionless names. Derive their MIME from
// signatures so SVG and WebGL textures still load with nosniff enabled.
function binaryContentType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  const head = bytes.subarray(0, 512).toString('utf8')
  if (/^(?:GIF87a|GIF89a)/.test(head)) return 'image/gif'
  if (head.startsWith('RIFF')) {
    const format = bytes.subarray(8, 12).toString('ascii')
    if (format === 'WEBP') return 'image/webp'
    if (format === 'WAVE') return 'audio/wav'
  }
  if (/^\s*(?:<\?xml[^>]*\?>\s*)?<svg[\s>]/.test(head)) return 'image/svg+xml'
  if (head.startsWith('glTF')) return 'model/gltf-binary'
  if (head.startsWith('OggS')) return 'audio/ogg'
  if (head.startsWith('ID3')) return 'audio/mpeg'
  return undefined
}
