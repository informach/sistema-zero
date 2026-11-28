/** Capture the single implementation before any application bundler can rename it. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createProjectRunContext } from '../src/extensions/projectRunContext'

const output = fileURLToPath(
  new URL('../src/extensions/projectRunContextFactory.generated.json', import.meta.url),
)

function source() {
  if (Bun.version !== '1.3.11') throw new Error('Generate the portable factory with Bun 1.3.11.')
  return `${JSON.stringify(createProjectRunContext.toString())}\n`
}

export function checkProjectRunContextFactorySource() {
  if (!existsSync(output) || readFileSync(output, 'utf8') !== source())
    throw new Error('The portable factory changed. Run bun run gen:project-run-context.')
}

if (import.meta.main) {
  if (process.argv[2] === '--check') checkProjectRunContextFactorySource()
  else writeFileSync(output, source())
}
