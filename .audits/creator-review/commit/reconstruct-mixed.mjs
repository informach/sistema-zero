import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const isolated = 'C:/Users/tocha/projects/sistema-zero-creator-staging-20260908'
const { mixed } = JSON.parse(readFileSync('.audits/creator-review/commit/selection.json', 'utf8'))
function git(args, input, cwd = root) {
  const result = Bun.spawnSync(['git', ...args], {
    cwd,
    stdin: input,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}
const proof = []
for (const [path, selectors] of Object.entries(mixed)) {
  const base = git(['show', `HEAD:${path}`]).split('\n')
  const diff = git(['diff', 'HEAD', '--no-ext-diff', '--unified=0', '--', path])
  const start = diff.indexOf('\n@@ ')
  const hunks = diff
    .slice(start + 1)
    .split(/(?=^@@ )/m)
    .filter(Boolean)
  const kept = hunks.filter((hunk) =>
    selectors.some((selector) =>
      selector.startsWith('!') ? !hunk.includes(selector.slice(1)) : hunk.includes(selector),
    ),
  )
  for (const hunk of kept.toReversed()) {
    const lines = hunk.split('\n')
    const header = lines.shift().match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (!header) throw new Error(`Invalid hunk: ${path}`)
    const count = header[2] === undefined ? 1 : Number(header[2])
    const offset = count === 0 ? Number(header[1]) : Number(header[1]) - 1
    const before = lines
      .filter((line) => line.startsWith('-') || line.startsWith(' '))
      .map((line) => line.slice(1))
    const after = lines
      .filter((line) => line.startsWith('+') || line.startsWith(' '))
      .map((line) => line.slice(1))
    if (
      before.length !== count ||
      before.join('\n') !== base.slice(offset, offset + count).join('\n')
    )
      throw new Error(`Base differs: ${path}`)
    base.splice(offset, count, ...after)
  }
  const content = base.join('\n')
  // Index-only update: the user's working file remains intact.
  const blob = git(['hash-object', '-w', '--stdin'], Buffer.from(content)).trim()
  git(['update-index', '--cacheinfo', `100644,${blob},${path}`])
  writeFileSync(join(isolated, path), content)
  git(['--literal-pathspecs', 'add', '--', path], undefined, isolated)
  proof.push({ path, hunks: kept.length, blob })
}
writeFileSync('.audits/creator-review/commit/mixed-proof.json', JSON.stringify(proof, null, 2))
console.log(JSON.stringify(proof, null, 2))
