/** A imagem com dados e o pacote portátil executam o mesmo compositor Python. */
import { readFile, writeFile } from 'node:fs/promises'
import { pygameSceneModule } from '../../pinta/src/export/pygameProject'

const path = new URL('../src/runtime/python/pygame/py/pinta.py', import.meta.url)
const marker = '\n# BEGIN GENERATED PINTA SCENE — scripts/gen-pinta-scene-python.ts\n'
const original = (await readFile(path, 'utf8')).split(marker)[0]!.trimEnd()
const runtime = pygameSceneModule.replace('class Mundo:', 'class _CenaCompleta:')
await writeFile(path, `${(original + marker + runtime).trimEnd()}\n`)
