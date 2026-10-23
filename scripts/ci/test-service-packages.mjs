import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// Bun 1.3.11 combines filter matches: multiple negative filters do not subtract
// from '*'. Select positive names so native suites run only in their Windows job.
// Studio has a separate step so its large Blockly round-trip does not compete
// with trusted runtime builds and the other package suites for the same CPUs.
const separate = new Set([
  '@sistemazero/agent-runtime',
  '@sistemazero/marketing-desktop',
  '@sistemazero/studio',
])
const root = JSON.parse(readFileSync('package.json', 'utf8'))
if (JSON.stringify(root.workspaces) !== JSON.stringify(['packages/*']))
  throw new Error('Update CI test discovery for the new workspace roots')
const packages = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`packages/${entry.name}/package.json`))
  .map((entry) => JSON.parse(readFileSync(`packages/${entry.name}/package.json`, 'utf8')))
  .filter((manifest) => manifest.scripts?.test)
for (const name of separate)
  if (!packages.some((manifest) => manifest.name === name))
    throw new Error(`Separate test suite is missing: ${name}`)
const names = packages
  .map((manifest) => manifest.name)
  .filter((name) => !separate.has(name))
  .sort()
if (!names.length || names.some((name) => typeof name !== 'string' || !name))
  throw new Error('Package test selection is empty or invalid')
console.log(`Package test selection (${names.length}): ${names.join(', ')}`)
if (!process.argv.includes('--list')) {
  // Bun starts every selected workspace at once. Running all DOM and service
  // suites together starves the CI runner: the 1,080-case quiz test exceeded
  // its timeout despite passing alone. Bound competing processes, preserving
  // every suite and its existing assertions/timeouts.
  const batchSize = 2
  for (let offset = 0; offset < names.length; offset += batchSize) {
    const batch = names.slice(offset, offset + batchSize)
    const result = spawnSync(
      'bun',
      ['run', ...batch.flatMap((name) => ['--filter', name]), 'test'],
      {
        stdio: 'inherit',
      },
    )
    if (result.error) throw result.error
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1
      break
    }
  }
}
