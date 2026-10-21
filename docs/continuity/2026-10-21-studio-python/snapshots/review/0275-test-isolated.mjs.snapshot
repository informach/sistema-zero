import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/
const sensitivePath = /^src\/(?:blockly\/|python\/blocks\/|components\/blocks\/)/

function discover(directory, prefix = 'src') {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relative = `${prefix}/${entry.name}`
      if (entry.isDirectory()) return discover(join(directory, entry.name), relative)
      return entry.isFile() && testFile.test(entry.name) ? [relative] : []
    })
}

const files = discover(join(packageRoot, 'src'))
if (files.length === 0) throw new Error('No Studio tests were discovered')

// Bun 1.3 runs the suite in one shared global. Blockly's event group and undo
// queue belong to that global, so tests in other files can change their state.
// Run those files in fresh processes while keeping the rest in directory groups.
const groups = new Map()
for (const file of files) {
  const parts = file.split('/')
  const key = sensitivePath.test(file)
    ? file
    : parts.length > 2
      ? parts.slice(0, 2).join('/')
      : 'src'
  const group = groups.get(key) ?? []
  group.push(`./${file}`)
  groups.set(key, group)
}

console.log(`Studio test selection: ${files.length} files in ${groups.size} isolated processes`)
if (process.argv.includes('--list')) process.exit(0)

for (const [name, paths] of groups) {
  console.log(`Studio tests: ${name} (${paths.length} files)`)
  const result = spawnSync('bun', ['test', ...paths], { cwd: packageRoot, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
