// Generated libraries live only in the lazy Pro language worker, never in the editor entry.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

if (ts.version !== '5.9.3')
  throw new Error('Align the Pro TypeScript version before regenerating libraries.')
const libDir = dirname(fileURLToPath(import.meta.resolve('typescript')))
const names = (await readdir(libDir)).filter((name) => /^lib\..*\.d\.ts$/.test(name)).sort()
const libraries = Object.fromEntries(
  await Promise.all(names.map(async (name) => [name, await readFile(join(libDir, name), 'utf8')])),
)
const output = fileURLToPath(new URL('../src/monaco/pro/defaultLibraries.json', import.meta.url))
const licensePath = fileURLToPath(
  new URL('../src/monaco/pro/TYPESCRIPT-LICENSE.txt', import.meta.url),
)
const source = `${JSON.stringify(libraries)}\n`
// Preserve the license text, with the repository's LF/trailing-space convention.
const license = (await readFile(join(libDir, '../LICENSE.txt'), 'utf8'))
  .replaceAll('\r\n', '\n')
  .replace(/[\t ]+$/gm, '')
if (process.argv.includes('--check')) {
  if (
    (await readFile(output, 'utf8')) !== source ||
    (await readFile(licensePath, 'utf8')) !== license
  )
    throw new Error('Run gen:pro-typescript-libs with the pinned TypeScript version.')
  console.log(`Verified ${names.length} TypeScript ${ts.version} libraries and license.`)
} else {
  await writeFile(output, source)
  await writeFile(licensePath, license)
  console.log(`Generated ${names.length} TypeScript ${ts.version} libraries.`)
}
