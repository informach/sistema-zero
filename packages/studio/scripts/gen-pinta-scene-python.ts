/**
 * A imagem com dados e o pacote portátil executam o mesmo compositor Python.
 *
 *   bun scripts/gen-pinta-scene-python.ts           regrava o trecho gerado do pinta.py
 *   bun scripts/gen-pinta-scene-python.ts --check   só confere; sai com erro se estiver velho
 */
import { readFile, writeFile } from 'node:fs/promises'
import { pygameSceneModule } from '../../pinta/src/export/pygameProject'

const path = new URL('../src/runtime/python/pygame/py/pinta.py', import.meta.url)
const marker = '\n# BEGIN GENERATED PINTA SCENE — scripts/gen-pinta-scene-python.ts\n'
const current = await readFile(path, 'utf8')
if (!current.includes(marker)) throw new Error('O pinta.py perdeu a marca do trecho gerado.')
const original = current.split(marker)[0]!.trimEnd()
const runtime = pygameSceneModule.replace('class Mundo:', 'class _CenaCompleta:')
const expected = `${(original + marker + runtime).trimEnd()}\n`
if (process.argv.includes('--check')) {
  if (current !== expected) {
    console.error(
      'O trecho da cena no pinta.py está desatualizado. Rode: bun packages/studio/scripts/gen-pinta-scene-python.ts',
    )
    process.exit(1)
  }
  console.log('pinta.py: o trecho da cena confere com o pacote portátil do Pinta.')
} else await writeFile(path, expected)
