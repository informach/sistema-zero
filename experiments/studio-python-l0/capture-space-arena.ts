import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { captureCorpusFiles } from './corpus-files.ts'

const commit = '7f4ea8e0bcb6105ecb5699eae0a793e2d4db92f8'
const repository = resolve(
  import.meta.dirname,
  '../../.cache/studio-python-l0/space-arena-upstream',
)
const files = captureCorpusFiles(repository, commit, 'Space Arena')
const manifest = {
  repository: 'https://github.com/wynand1004/Projects',
  commit,
  entrypoint: 'Space Arena/space_arena.py',
  source: 'original',
  license: 'GPL-3.0 repository; individual audio provenance requires separate review',
  distribution: 'external test corpus in ignored cache only; not a product template',
  originalBrowserStatus: 'requires explicit OS audio and Python-version compatibility changes',
  portableVariant: {
    status: 'pending',
    permittedChanges: [
      'Replace explicit OS-specific audio function with versioned portable audio; preserve all six WAV assets and scheduled background playback.',
      'Replace four randint float bounds at source lines 775, 776, 792, 793 with exact integer bounds; CPython 3.14 rejects the original integral floats.',
      'Replace OS console clearing in the FPS display with an explicit portable diagnostic output, without changing game time or drawing.',
    ],
    requiresReferenceReproduction: [
      'Paused loop lacks update: reproduce original desktop behavior before documenting any correction.',
    ],
  },
  files,
}
const output = resolve(import.meta.dirname, 'corpus/space-arena.json')
await mkdir(resolve(import.meta.dirname, 'corpus'), { recursive: true })
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  JSON.stringify({
    output,
    commit,
    files: files.length,
    bytes: files.reduce((total, file) => total + file.bytes, 0),
  }),
)
