import {
  isStudioPythonAssetPath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/portable-path'
import { RAYLIB_3D_EXTENSION, RAYLIB_EXTENSION_IDS } from '../runtime/python/raylib/contract'
import { normalizeAssetName, type ProjectAsset } from './projectAssets'
import type { PythonProjectDocument } from './pythonProject'

/**
 * Where a Raylib project keeps its media. Unlike Pygame Zero, raylib opens a file by its PATH,
 * extension included (`load_texture('images/nave.png')`, `load_sound('sounds/pulo.wav')`), so
 * the path next to the MAIN file is what the child writes in the code. The folders are the ones
 * the Clear Code course uses: `images/`, `sounds/`, `music/`, `fonts/` and, in Raylib 3D,
 * `models/`.
 *
 * The formats are what the desktop `raylib==6.0.1.0` opens (measured 24/10/2026): PNG, JPG,
 * BMP and GIF images (not SVG, WebP, TGA or HDR); WAV, OGG, MP3 and FLAC sounds (not M4A);
 * TTF and OTF fonts. A game that only runs in the browser would break when the child takes
 * it to the computer, so the door refuses anything else.
 */
export type RaylibMediaFolder = 'images' | 'sounds' | 'music' | 'fonts' | 'models'
/** The child's choice for an audio file, as in Pygame Zero: a short sound or a song. */
export type RaylibAudioRole = 'sound' | 'music'

const READABLE: Readonly<Record<RaylibMediaFolder, readonly string[]>> = {
  images: ['png', 'jpg', 'jpeg', 'bmp', 'gif'],
  sounds: ['wav', 'ogg', 'mp3', 'flac'],
  music: ['wav', 'ogg', 'mp3', 'flac'],
  fonts: ['ttf', 'otf'],
  models: ['glb'],
}

const FOLDERS: readonly RaylibMediaFolder[] = ['images', 'sounds', 'music', 'fonts', 'models']

export function projectUsesRaylib(project: {
  installedExtensions?: readonly { id: string }[]
}): boolean {
  return (project.installedExtensions ?? []).some((entry) =>
    (RAYLIB_EXTENSION_IDS as readonly string[]).includes(entry.id),
  )
}

export function projectUsesRaylib3D(project: {
  installedExtensions?: readonly { id: string }[]
}): boolean {
  return (project.installedExtensions ?? []).some((entry) => entry.id === RAYLIB_3D_EXTENSION.id)
}

/**
 * The folder for one material, or the reason it cannot go there. Audio without a choice goes
 * to `sounds/`: raylib's `load_sound` and `load_music_stream` open the same formats, the folder
 * only keeps the project tidy.
 */
export function raylibMediaFolder(
  kind: ProjectAsset['kind'],
  extension: string,
  options: { role?: RaylibAudioRole; with3D?: boolean } = {},
): { folder: RaylibMediaFolder } | { error: string } {
  const ext = extension.toLowerCase()
  if (kind === 'image')
    return READABLE.images.includes(ext)
      ? { folder: 'images' }
      : {
          error:
            'O raylib abre imagens PNG, JPG, BMP ou GIF. Traga o desenho do Pinta como PNG ou envie outro formato.',
        }
  if (kind === 'audio') {
    if (!READABLE.sounds.includes(ext))
      return { error: 'O raylib toca sons WAV, OGG, MP3 ou FLAC.' }
    return { folder: options.role === 'music' ? 'music' : 'sounds' }
  }
  if (kind === 'font')
    return READABLE.fonts.includes(ext)
      ? { folder: 'fonts' }
      : { error: 'O raylib abre fontes TTF ou OTF.' }
  if (kind === 'model3d') {
    if (!options.with3D)
      return {
        error: 'Modelos 3D são da extensão Raylib 3D. Troque a extensão do projeto para usar.',
      }
    return READABLE.models.includes(ext)
      ? { folder: 'models' }
      : { error: 'O Raylib 3D do Estúdio abre modelos GLB.' }
  }
  return {
    error:
      'O raylib do computador não abre céu .hdr. Traga o céu do Molda como imagem PNG panorâmica.',
  }
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

function extensionOf(path: string): string {
  const leaf = path.slice(path.lastIndexOf('/') + 1)
  const dot = leaf.lastIndexOf('.')
  return dot < 0 ? '' : leaf.slice(dot + 1).toLowerCase()
}

/** The material name as a file name: the Studio name already is lowercase letters, digits, `-`. */
function fileStem(name: string, folder: RaylibMediaFolder): string {
  return normalizeAssetName(name) ?? folder.slice(0, -1)
}

/**
 * `<main dir>/<folder>/<stem>.<ext>`. Only the exact file name counts as taken (raylib asks for
 * the extension too); collisions get `-2`, `-3`… like the material names.
 */
export function raylibMediaPath(input: {
  entrypoint: string
  name: string
  kind: ProjectAsset['kind']
  extension: string
  role?: RaylibAudioRole
  with3D?: boolean
  occupied: { files: readonly string[]; directories: readonly string[] }
}): { path: string } | { error: string } {
  const placed = raylibMediaFolder(input.kind, input.extension, input)
  if ('error' in placed) return placed
  const base = parentOf(input.entrypoint)
  const dir = base ? `${base}/${placed.folder}` : placed.folder
  const taken = new Set(input.occupied.files.map((path) => path.toLowerCase()))
  const stem = fileStem(input.name, placed.folder)
  const ext = input.extension.toLowerCase()
  for (let index = 1; index <= 999; index++) {
    const path = `${dir}/${index === 1 ? stem : `${stem}-${index}`}.${ext}`
    if (taken.has(path.toLowerCase())) continue
    if (!isStudioPythonAssetPath(path)) break
    if (
      studioPortableFileConflict([...input.occupied.files, path], [...input.occupied.directories])
    )
      continue
    return { path }
  }
  return { error: 'Não encontrei um nome livre para este arquivo na pasta do jogo.' }
}

/** The folder of a path that sits in `<main dir>/<folder>/`, if any. */
function raylibFolderOf(path: string, entrypoint: string): RaylibMediaFolder | undefined {
  const base = parentOf(entrypoint)
  return FOLDERS.find((folder) => parentOf(path) === (base ? `${base}/${folder}` : folder))
}

/**
 * What the child writes in the code to open this material (`images/nave.png`): the path
 * relative to the main file. Undefined outside the Raylib folders.
 */
export function raylibCodePath(
  asset: Pick<ProjectAsset, 'proPath'>,
  entrypoint: string,
): string | undefined {
  if (!asset.proPath || !raylibFolderOf(asset.proPath, entrypoint)) return
  const base = parentOf(entrypoint)
  return base ? asset.proPath.slice(base.length + 1) : asset.proPath
}

/** The Studio name that matches the file (`nave-2.png` → `nave-2`), unless another has it. */
function nameForPath(path: string, fallback: string, assets: readonly ProjectAsset[], id: string) {
  const leaf = path.slice(path.lastIndexOf('/') + 1)
  const name = normalizeAssetName(leaf.slice(0, leaf.lastIndexOf('.')))
  return name && !assets.some((other) => other.id !== id && other.name === name) ? name : fallback
}

/** Source files, explicit directories and the paths other materials already use. */
function occupiedPaths(project: PythonProjectDocument, ignoreAssetId?: string) {
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

/** A new Raylib material: its path in the project and the Studio name that reads like it. */
export function raylibPlacedAsset(
  project: PythonProjectDocument,
  asset: ProjectAsset,
  extension: string,
  role?: RaylibAudioRole,
): { asset: ProjectAsset } | { error: string } {
  const placed = raylibMediaPath({
    entrypoint: project.python.entrypoint,
    name: asset.name,
    kind: asset.kind,
    extension,
    role,
    with3D: projectUsesRaylib3D(project),
    occupied: occupiedPaths(project, asset.id),
  })
  if ('error' in placed) return placed
  return {
    asset: {
      ...asset,
      proPath: placed.path,
      name: nameForPath(placed.path, asset.name, project.assets ?? [], asset.id),
    },
  }
}

/**
 * Renaming a Raylib material renames its file: the name in the panel and in the code stay the
 * same thing. The folder (sound or music) is kept.
 */
export function raylibRenamedAsset(
  project: PythonProjectDocument,
  asset: ProjectAsset,
  name: string,
): { asset: ProjectAsset } | { error: string } {
  const folder = asset.proPath
    ? raylibFolderOf(asset.proPath, project.python.entrypoint)
    : undefined
  return raylibPlacedAsset(
    project,
    { ...asset, name },
    asset.proPath ? extensionOf(asset.proPath) : '',
    folder === 'music' ? 'music' : undefined,
  )
}

function unreadableLabel(asset: ProjectAsset): string {
  const ext = asset.proPath ? extensionOf(asset.proPath) : ''
  return ext ? `${asset.name} (${ext.toUpperCase()})` : asset.name
}

/**
 * Installing a Raylib extension on a project that already has materials: each one moves to the
 * folder of its kind (`assets/nave.png` → `images/nave.png`). A format the desktop raylib
 * cannot open (SVG, WebP, M4A, a sky .hdr, a model in Raylib 2D) is listed instead.
 */
export function raylibRelocatedAssets(
  project: PythonProjectDocument,
): { assets: ProjectAsset[]; coverAssetName?: string } | { error: string } {
  const entrypoint = project.python.entrypoint
  const assets = [...(project.assets ?? [])]
  const unreadable: string[] = []
  let cover = project.coverAssetName
  for (const [index, asset] of assets.entries()) {
    const path = asset.proPath
    const ext = path ? extensionOf(path) : ''
    const folder = path ? raylibFolderOf(path, entrypoint) : undefined
    if (folder) {
      const placed = raylibMediaFolder(asset.kind, ext, {
        role: folder === 'music' ? 'music' : 'sound',
        with3D: projectUsesRaylib3D(project),
      })
      if (!('error' in placed) && placed.folder === folder) continue
    }
    const moved = raylibPlacedAsset(
      { ...project, assets },
      assets[index]!,
      ext,
      asset.kind === 'audio' && folder === 'music' ? 'music' : undefined,
    )
    if ('error' in moved) {
      unreadable.push(unreadableLabel(asset))
      continue
    }
    if (cover === asset.name) cover = moved.asset.name
    assets[index] = moved.asset
  }
  if (unreadable.length)
    return {
      error: `O raylib não abre ${unreadable.length === 1 ? 'este material' : 'estes materiais'}: ${unreadable.join(', ')}. Apague ou envie de novo como imagem PNG, JPG, BMP ou GIF, som WAV, OGG, MP3 ou FLAC, ou fonte TTF ou OTF.`,
    }
  return { assets, ...(cover !== undefined ? { coverAssetName: cover } : {}) }
}
