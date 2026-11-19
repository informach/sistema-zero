/**
 * A imagem com dados e o pacote portátil executam o mesmo compositor Python.
 *
 *   bun scripts/gen-pinta-scene-python.ts           regrava o trecho gerado do pinta.py
 *   bun scripts/gen-pinta-scene-python.ts --check   só confere; sai com erro se estiver velho
 */
import { readFile, writeFile } from 'node:fs/promises'
import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { pygameSceneModule } from '../../pinta/src/export/pygameProject'

const path = new URL('../src/runtime/python/pygame/py/pinta.py', import.meta.url)
const marker = '\n# BEGIN GENERATED PINTA SCENE — scripts/gen-pinta-scene-python.ts\n'
const current = await readFile(path, 'utf8')
if (!current.includes(marker)) throw new Error('O pinta.py perdeu a marca do trecho gerado.')
let original = current.split(marker)[0]!.trimEnd()
const worldStart = '# BEGIN GENERATED PINTA WORLD LIMITS — scripts/gen-pinta-scene-python.ts'
const worldEnd = '# END GENERATED PINTA WORLD LIMITS'
const start = original.indexOf(worldStart),
  end = original.indexOf(worldEnd)
if (start < 0 || end < start) throw new Error('O pinta.py perdeu os limites do mundo.')
const limits = PINTA_IMAGE_WORLD_LIMITS
const world = `${worldStart}\nMUNDO_MAX_MAPAS = ${limits.maps}\nMUNDO_MAX_CELULAS = ${limits.cells}\nMUNDO_MAX_CARACTERES = ${limits.encodedChars}\nMUNDO_MAX_DADOS = ${limits.metadataBytes}\nMUNDO_MAX_DIMENSAO = ${limits.dimension}\nMUNDO_MAX_PIXELS_IMAGEM = ${limits.imagePixels}\nMUNDO_MAX_PIXELS_TOTAL = ${limits.totalImagePixels}\n${worldEnd}`
original = original.slice(0, start) + world + original.slice(end + worldEnd.length)
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
