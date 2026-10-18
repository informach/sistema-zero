import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { captureCorpusFiles } from './corpus-files.ts'

// Canonical Git blobs, independent of Windows checkout CRLF conversion.
const commit = '2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103'
const repository = resolve(import.meta.dirname, '../../.cache/studio-python-l0/pacman-upstream')
const files = captureCorpusFiles(repository, commit, 'episodes/episode09')
const manifest = {
  repository: 'https://github.com/TheWannabeCoder92/pacman-turtle-python',
  commit,
  license: 'MIT',
  entrypoint: 'episodes/episode09/main.py',
  source: 'original',
  originalBrowserStatus: 'not-compatible-with-system-audio',
  portableVariant: {
    status: 'pending',
    permittedChanges: [
      'Replace four explicit os.system(aplay) calls and its import with an explicit portable audio module. Preserve every game feature and record the exact diff.',
    ],
  },
  files,
}
const output = resolve(import.meta.dirname, 'corpus/pacman.json')
await mkdir(resolve(import.meta.dirname, 'corpus'), { recursive: true })
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  JSON.stringify({
    output,
    commit,
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  }),
)
