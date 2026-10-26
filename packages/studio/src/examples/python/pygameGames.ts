import { exampleDrawingLibId } from '../../asset-library/exampleDrawings'
import { normalizeAssetName, type ProjectAsset } from '../../core/projectAssets'
import { PYGAME_EXTENSION } from '../../runtime/python/pygame/contract'
import type { PythonExampleEntry } from '../pythonCatalog'
import { PYGAME_GAME_BLOCKS } from './pygameGames.blocks.generated'
import { PYGAME_GAME_LOADERS } from './pygameGames.loaders.generated'
import { PYGAME_GAMES } from './pygameGames.manifest'

const ASSET_KIND: Record<string, ProjectAsset['kind']> = {
  png: 'image',
  wav: 'audio',
  ogg: 'audio',
}

/** The drawings were made in Pinta; the sounds were made from code. Both are original. */
function attribution(path: string) {
  return path.endsWith('.png')
    ? 'Desenho original do Sistema Zero feito no Pinta, 2026.'
    : 'Som original do Sistema Zero, 2026.'
}

/** Both entries of a game load the same files, Pinta drawings and sounds (one chunk per game). */
export const PYGAME_GAME_EXAMPLES: readonly PythonExampleEntry[] = PYGAME_GAMES.flatMap((game) => {
  async function load(): Promise<{
    files: Readonly<Record<string, string>>
    entrypoint: string
    assets: ProjectAsset[]
  }> {
    const loader = PYGAME_GAME_LOADERS[game.key]
    if (!loader) throw new Error('O jogo Pygame-ce não está completo.')
    const { files, media } = await loader()
    const names = new Set<string>()
    const assets: ProjectAsset[] = Object.entries(media).map(([path, dataUrl]) => {
      const extension = path.split('.').at(-1)!
      // The file keeps its name (game_music.ogg); the material name is kebab-case and unique
      // (a sound named like a drawing — laser.png and laser.wav — becomes laser-som).
      const base =
        normalizeAssetName(
          path
            .split('/')
            .at(-1)!
            .replace(/\.[a-z0-9]+$/, ''),
        ) ?? 'material'
      let name = names.has(base) ? `${base}-som` : base
      for (let index = 2; names.has(name); index++) name = `${base}-${index}`
      names.add(name)
      const kind = ASSET_KIND[extension] ?? 'image'
      // Every PNG of the gallery is a Pinta drawing (`assets/<drawing>.png`, document
      // `<game>-<drawing>` in `drawings`): the reference lets "Editar no Pinta" copy it into
      // the child's gallery only when asked (asset-library/exampleDrawings.ts).
      const drawing = path.match(/^assets\/([a-z0-9][a-z0-9_-]*)\.png$/)?.[1]
      return {
        id: `${game.key}-${path.replaceAll('/', '-')}`,
        name,
        kind,
        ...(kind === 'image' && drawing
          ? {
              source: 'library' as const,
              libId: exampleDrawingLibId({ gallery: 'pygame', game: game.key, drawing }),
            }
          : { source: 'upload' as const }),
        proPath: path,
        dataUrl,
        license: { name: 'Sistema Zero', attribution: attribution(path) },
      }
    })
    return { files: { ...files }, entrypoint: 'main.py', assets }
  }
  const shared = {
    programmingLanguage: 'python' as const,
    emoji: game.emoji,
    description: game.description,
    genre: game.genre,
    concepts: game.concepts,
    experience: 'game' as const,
    difficulty: game.difficulty,
    extensions: [{ id: PYGAME_EXTENSION.id, version: PYGAME_EXTENSION.version }],
    load,
  }
  return [
    {
      ...shared,
      key: `python:${game.key}:blocks`,
      name: `${game.name} (Blocos)`,
      kind: 'classic' as const,
      mode: 'blocks' as const,
      requiredBlockIds: [...(PYGAME_GAME_BLOCKS[game.key]?.blockIds ?? [])],
    },
    {
      ...shared,
      key: `python:${game.key}:code`,
      name: `${game.name} (Código)`,
      kind: 'pro' as const,
      mode: 'code' as const,
    },
  ]
})
