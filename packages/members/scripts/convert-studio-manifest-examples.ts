/** Explicit local v5 converter; reads/writes files only and never calls a database. */
import { createHash } from 'node:crypto'
import { open, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  convertLegacyLearningManifest,
  LEARNING_IMPORT_BODY_MAX_BYTES,
  LEARNING_MANIFEST_SOURCE_MAX_BYTES,
  learningImportBodyBytes,
  learningManifestSource,
} from '@sistemazero/core/learning'
import { migratedStudioExampleId } from '../src/domain/learning/studio-examples-migration'
import { stableJson } from '../src/domain/shared/stable-json'

const args = process.argv.slice(2)
const [inputPath, outputPath] = args
if (args.length !== 2 || !inputPath || !outputPath)
  throw new Error(
    'Uso: bun scripts/convert-studio-manifest-examples.ts <original.json> <novo.json>',
  )
const input = resolve(inputPath)
const output = resolve(outputPath)
if ((await stat(input)).size > LEARNING_MANIFEST_SOURCE_MAX_BYTES)
  throw new Error('O arquivo original excede 16 MiB. Reduza a formatação antes de converter.')
const value: unknown = JSON.parse(await readFile(input, 'utf8'))
const namespace = createHash('sha256').update(stableJson(value)).digest('hex')
const result = convertLegacyLearningManifest(value, (blockKey) =>
  migratedStudioExampleId(`manifest:${namespace}`, blockKey, null),
)
if (learningImportBodyBytes(result.manifest) > LEARNING_IMPORT_BODY_MAX_BYTES)
  throw new Error(
    'O manifesto convertido excede 2 MiB no envelope de importação. Nenhum arquivo foi gravado.',
  )
const file = await open(output, 'wx')
try {
  await file.writeFile(learningManifestSource(result.manifest), 'utf8')
  await file.sync()
} finally {
  await file.close()
}
console.log(
  JSON.stringify({
    source: input,
    output,
    version: 5,
    examplesVersion: 1,
    converted: result.converted,
    warning:
      'Associações convertidas são pontos de partida de autoria. Teste cada parte; o conversor não comprova os objetivos.',
  }),
)
