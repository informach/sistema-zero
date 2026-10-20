import { readFile, writeFile } from 'node:fs/promises'
import { canonicalJson } from '@sistemazero/core/creations'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'

const metadataPath = new URL(
  '../../src/runtime/python/audio/sz_audio/_module.json',
  import.meta.url,
)

/** Python reads this generated descriptor; Core owns version, dependencies and policy. */
export async function checkPythonAudioMetadata() {
  const expected = canonicalJson(SZ_AUDIO_MODULE_DESCRIPTOR)
  const actual = await readFile(metadataPath, 'utf8')
  // Source formatting/checkout line endings are immaterial; compare every data field.
  if (canonicalJson(JSON.parse(actual)) !== expected)
    throw new Error(
      'Metadados Python de áudio desatualizados. Execute bun scripts/python/audio-metadata.ts --write em packages/studio.',
    )
}

if (import.meta.main) {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--write')
    await writeFile(metadataPath, `${JSON.stringify(SZ_AUDIO_MODULE_DESCRIPTOR, null, 2)}\n`)
  else if (process.argv.length === 2) await checkPythonAudioMetadata()
  else
    throw new Error('Use sem argumentos para conferir ou --write para gerar a política de áudio.')
}
