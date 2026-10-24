import {
  isStudioPythonAssetPath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/portable-path'
import { pgzeroSvgSize } from '../runtime/python/pgzero/svgSize'
import { decodeProjectAsset } from './assetBinary'
import { normalizeAssetName, type ProjectAsset } from './projectAssets'
import type { PythonProjectDocument } from './pythonProject'

/**
 * Where a Pygame Zero project keeps its media. Pygame Zero looks for `images/`, `sounds/` and
 * `music/` next to the MAIN file (classic `main.py` → `images/`; pro `src/main.py` →
 * `src/images/`) and finds a file by its NAME without extension (`Actor('nave')`,
 * `sounds.pulo.play()`, `music.play('tema')`). Turtle and Python without an extension keep the
 * historical `assets/<name>.<ext>` path; this module only speaks for Pygame Zero.
 *
 * Pure on purpose: the only runtime import is the pure SVG size rule the module itself uses,
 * and the extension id is pinned against the runtime contract by `pgzeroMediaPaths.test.ts`.
 */
export const PGZERO_EXTENSION_ID = 'python-pgzero'

export type PgzeroMediaFolder = 'images' | 'sounds' | 'music'
/** The child's choice for an audio file: a short sound effect or a background song. */
export type PgzeroAudioRole = 'sound' | 'music'

/** What each pgzero 1.2.1 loader finds (the Studio module adds svg for images). */
const READABLE: Readonly<Record<PgzeroMediaFolder, readonly string[]>> = {
  images: ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'svg'],
  sounds: ['wav', 'ogg', 'oga'],
  music: ['mp3', 'ogg', 'oga'],
}

/** Python keywords cannot be the attribute in `images.<name>` / `sounds.<name>`. */
const PYTHON_KEYWORDS = new Set([
  'false',
  'none',
  'true',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
])

/**
 * Attributes of pgzero 1.2.1's `ResourceLoader` that a stem could spell: `images.load` or
 * `sounds.cache` are the loader's own members, so `__getattr__` never reaches the file.
 */
const LOADER_ATTRIBUTES = new Set([
  'load',
  'cache',
  'cache_key',
  'subpath',
  'have_root',
  'validate_root',
])

const STEM_PREFIX: Readonly<Record<PgzeroMediaFolder, string>> = {
  images: 'imagem',
  sounds: 'som',
  music: 'musica',
}

export function projectUsesPgzero(project: {
  installedExtensions?: readonly { id: string }[]
}): boolean {
  return (project.installedExtensions ?? []).some((entry) => entry.id === PGZERO_EXTENSION_ID)
}

/**
 * The folder for one material, or the reason it cannot go there. With a choice, the format
 * must be one Pygame Zero opens in that folder; without one, wav → sounds, mp3 → music and
 * ogg → sounds (a short sound is the common case; "Enviar música" is the explicit door).
 */
export function pgzeroMediaFolder(
  kind: ProjectAsset['kind'],
  extension: string,
  role?: PgzeroAudioRole,
): { folder: PgzeroMediaFolder } | { error: string } {
  const ext = extension.toLowerCase()
  if (kind === 'image') {
    return READABLE.images.includes(ext)
      ? { folder: 'images' }
      : { error: 'O Pygame Zero abre imagens PNG, GIF, JPG, BMP ou SVG.' }
  }
  if (kind !== 'audio')
    return {
      error:
        'Este ambiente Python aceita imagens e sons. Os recursos 3D ainda não estão disponíveis.',
    }
  if (role === 'music')
    return READABLE.music.includes(ext)
      ? { folder: 'music' }
      : { error: 'A música do Pygame Zero precisa ser um arquivo MP3 ou OGG.' }
  if (role === 'sound')
    return READABLE.sounds.includes(ext)
      ? { folder: 'sounds' }
      : {
          error:
            'O som curto do Pygame Zero precisa ser um arquivo WAV ou OGG. Para MP3, use "Enviar música".',
        }
  if (READABLE.sounds.includes(ext)) return { folder: 'sounds' }
  if (READABLE.music.includes(ext)) return { folder: 'music' }
  return { error: 'O Pygame Zero toca sons WAV ou OGG e músicas MP3 ou OGG.' }
}

/**
 * The file name Pygame Zero asks for: lowercase letters, digits and `_`, starting with a
 * letter. Accents and spaces are normalized like the Studio name; `-` becomes `_`.
 */
export function pgzeroFileStem(name: string, folder: PgzeroMediaFolder): string {
  const stem = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!stem) return STEM_PREFIX[folder]
  return /^[a-z]/.test(stem) ? stem : `${STEM_PREFIX[folder]}_${stem}`
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

function stemOf(path: string): string {
  const leaf = path.slice(path.lastIndexOf('/') + 1)
  const dot = leaf.lastIndexOf('.')
  return (dot < 0 ? leaf : leaf.slice(0, dot)).toLowerCase()
}

/** Source files, explicit directories and the paths other materials already use. */
export function pythonProjectOccupiedPaths(
  project: PythonProjectDocument,
  ignoreAssetId?: string,
): { files: string[]; directories: string[] } {
  const files: string[] = []
  const directories: string[] = []
  if (project.kind === 'pro') {
    for (const [path, node] of Object.entries(project.tree))
      (node.kind === 'file' ? files : directories).push(path)
  } else files.push(...Object.keys(project.files))
  for (const asset of project.assets ?? [])
    if (asset.id !== ignoreAssetId && asset.proPath) files.push(asset.proPath)
  return { files, directories }
}

/**
 * `<main dir>/<folder>/<stem>.<ext>`. A stem already used in that folder by ANY extension
 * counts as taken: with `nave.png` and `nave.svg` side by side, `Actor('nave')` would open the
 * PNG and the new drawing would never show. Collisions get `_2`, `_3`…
 */
export function pgzeroMediaPath(input: {
  entrypoint: string
  name: string
  kind: ProjectAsset['kind']
  extension: string
  role?: PgzeroAudioRole
  occupied: { files: readonly string[]; directories: readonly string[] }
}): { path: string } | { error: string } {
  const placed = pgzeroMediaFolder(input.kind, input.extension, input.role)
  if ('error' in placed) return placed
  const base = parentOf(input.entrypoint)
  const dir = base ? `${base}/${placed.folder}` : placed.folder
  const takenStems = new Set(
    input.occupied.files
      .filter((path) => parentOf(path).toLowerCase() === dir.toLowerCase())
      .map(stemOf),
  )
  const stem = pgzeroFileStem(input.name, placed.folder)
  const ext = input.extension.toLowerCase()
  for (let index = 1; index <= 999; index++) {
    const candidate = index === 1 ? stem : `${stem}_${index}`
    if (
      takenStems.has(candidate) ||
      PYTHON_KEYWORDS.has(candidate) ||
      LOADER_ATTRIBUTES.has(candidate)
    )
      continue
    const path = `${dir}/${candidate}.${ext}`
    if (!isStudioPythonAssetPath(path)) break
    if (
      studioPortableFileConflict([...input.occupied.files, path], [...input.occupied.directories])
    )
      continue
    return { path }
  }
  return { error: 'Não encontrei um nome livre para este arquivo na pasta do Pygame Zero.' }
}

const FOLDERS: readonly PgzeroMediaFolder[] = ['images', 'sounds', 'music']

/** The folder of a path that sits in `<main dir>/<folder>/`, if any. */
function pgzeroFolderOf(path: string, entrypoint: string): PgzeroMediaFolder | undefined {
  const base = parentOf(entrypoint)
  return FOLDERS.find((folder) => parentOf(path) === (base ? `${base}/${folder}` : folder))
}

function extensionOf(path: string): string {
  const leaf = path.slice(path.lastIndexOf('/') + 1)
  const dot = leaf.lastIndexOf('.')
  return dot < 0 ? '' : leaf.slice(dot + 1).toLowerCase()
}

/**
 * The name the child writes in the code (`Actor('nave_azul')`, `sounds.pulo.play()`): the file
 * stem, which can differ from the material name (`nave-azul`, or `acerto_2` beside an `acerto`
 * already in the folder). Undefined outside the Pygame Zero folders.
 */
export function pgzeroCodeName(
  asset: Pick<ProjectAsset, 'proPath'>,
  entrypoint: string,
): string | undefined {
  if (!asset.proPath || !pgzeroFolderOf(asset.proPath, entrypoint)) return
  return stemOf(asset.proPath)
}

/**
 * The material name that reads like its code name (`acerto_2` → `acerto-2`), so the panel and
 * the code say the same thing. Keeps `fallback` when another material already has that name.
 */
export function pgzeroNameForPath(
  path: string,
  fallback: string,
  assets: readonly ProjectAsset[],
  id: string,
): string {
  const name = normalizeAssetName(stemOf(path))
  return name && !assets.some((other) => other.id !== id && other.name === name) ? name : fallback
}

/**
 * Where a Pygame Zero material goes when it is (re)named: the file follows the name, so
 * `sounds.<new name>` finds it. The asset's own file never blocks its new path.
 */
export function pgzeroRenamedAsset(
  project: PythonProjectDocument,
  asset: ProjectAsset,
  name: string,
): { asset: ProjectAsset } | { error: string } {
  const folder = asset.proPath
    ? pgzeroFolderOf(asset.proPath, project.python.entrypoint)
    : undefined
  const placed = pgzeroMediaPath({
    entrypoint: project.python.entrypoint,
    name,
    kind: asset.kind,
    extension: asset.proPath ? extensionOf(asset.proPath) : '',
    role: folder === 'sounds' ? 'sound' : folder === 'music' ? 'music' : undefined,
    occupied: pythonProjectOccupiedPaths(project, asset.id),
  })
  if ('error' in placed) return placed
  return {
    asset: {
      ...asset,
      name: pgzeroNameForPath(placed.path, name, project.assets ?? [], asset.id),
      proPath: placed.path,
    },
  }
}

/** The Pygame Zero name of a file the child sees in a message: the WebP or FLAC it cannot open. */
function unreadableLabel(asset: ProjectAsset): string {
  const ext = asset.proPath ? extensionOf(asset.proPath) : ''
  return ext ? `${asset.name} (${ext.toUpperCase()})` : asset.name
}

/**
 * Installing Pygame Zero on a project that already has materials: each image and sound moves to
 * the folder Pygame Zero searches (`assets/nave.png` → `images/nave.png`). A format Pygame Zero
 * cannot open (WebP, FLAC, M4A, a 3D model) is listed instead of being left unreachable.
 */
export function pgzeroRelocatedAssets(
  project: PythonProjectDocument,
): { assets: ProjectAsset[]; coverAssetName?: string } | { error: string } {
  const entrypoint = project.python.entrypoint
  const assets = [...(project.assets ?? [])]
  const unreadable: string[] = []
  let cover = project.coverAssetName
  for (const [index, asset] of assets.entries()) {
    const path = asset.proPath
    if (path && pgzeroFolderOf(path, entrypoint)) {
      const placed = pgzeroMediaFolder(asset.kind, extensionOf(path))
      if (!('error' in placed)) continue
    }
    const moved = pgzeroRenamedAsset({ ...project, assets }, asset, asset.name)
    if ('error' in moved) {
      unreadable.push(unreadableLabel(asset))
      continue
    }
    if (cover === asset.name) cover = moved.asset.name
    assets[index] = moved.asset
  }
  if (unreadable.length)
    return {
      error: `O Pygame Zero não abre ${unreadable.length === 1 ? 'este material' : 'estes materiais'}: ${unreadable.join(', ')}. Apague ou envie de novo como imagem PNG, GIF, JPG, BMP ou SVG, som WAV ou OGG, ou música MP3 ou OGG.`,
    }
  return { assets, ...(cover !== undefined ? { coverAssetName: cover } : {}) }
}

/** The side Pygame Zero's image loader accepts (`MAX_IMAGE_SIDE` in py/pgzero/_sz.py). */
export const PGZERO_MAX_IMAGE_SIDE = 4096

/**
 * The size Pygame Zero reads from an SVG (root width/height, else the viewBox), or why the game
 * would refuse it at `Actor(...)`. The browser can still show an SVG Pygame Zero cannot size
 * (`width="100%"`, `em` units), so the check happens when the file enters the project.
 */
export function pgzeroSvgAssetSize(
  dataUrl: string,
): { width: number; height: number } | { error: string } {
  let size: { width: number; height: number } | null = null
  try {
    size = pgzeroSvgSize(new TextDecoder().decode(decodeProjectAsset(dataUrl).bytes))
  } catch {
    size = null
  }
  if (!size)
    return {
      error:
        'Este SVG não diz o próprio tamanho em pixels (largura e altura, ou viewBox), e o Pygame Zero precisa saber. Salve de novo no Pinta ou envie um PNG.',
    }
  if (size.width > PGZERO_MAX_IMAGE_SIDE || size.height > PGZERO_MAX_IMAGE_SIDE)
    return {
      error: `Este SVG é grande demais para o Pygame Zero (${size.width}×${size.height}); cada lado pode ter até ${PGZERO_MAX_IMAGE_SIDE} pixels.`,
    }
  return size
}
