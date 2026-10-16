import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

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
  .filter((entry) => entry.isDirectory())
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
  const result = spawnSync('bun', ['run', ...names.flatMap((name) => ['--filter', name]), 'test'], {
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
