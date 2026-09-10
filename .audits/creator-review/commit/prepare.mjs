import { readFileSync, writeFileSync } from 'node:fs'

const root = process.cwd()
const selection = JSON.parse(readFileSync('.audits/creator-review/commit/selection.json', 'utf8'))
function git(args, input) {
  const result = Bun.spawnSync(['git', ...args], {
    cwd: root,
    stdin: input,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString() || `git ${args[0]} failed`)
  return result.stdout.toString()
}
if (git(['diff', '--cached', '--name-only']).trim())
  throw new Error('The index already contains changes')
writeFileSync('.audits/creator-review/commit/base.txt', git(['rev-parse', 'HEAD']))
git(
  ['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'],
  Buffer.from(selection.pure.join('\0') + '\0'),
)
const selectedHunks = []
for (const [path, selectors] of Object.entries(selection.mixed)) {
  const diff = git(['diff', '--no-ext-diff', '--unified=0', '--', path])
  const start = diff.indexOf('\n@@ ')
  if (start < 0) throw new Error(`No hunks for ${path}`)
  const header = diff.slice(0, start + 1)
  const hunks = diff
    .slice(start + 1)
    .split(/(?=^@@ )/m)
    .filter(Boolean)
  const kept = hunks.filter((hunk) =>
    selectors.some((selector) =>
      selector.startsWith('!') ? !hunk.includes(selector.slice(1)) : hunk.includes(selector),
    ),
  )
  if (!kept.length) throw new Error(`No owned hunks selected for ${path}`)
  git(['apply', '--cached', '--unidiff-zero', '-'], Buffer.from(header + kept.join('')))
  selectedHunks.push({ path, total: hunks.length, selected: kept.length })
}
const staged = git(['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean)
if (staged.some((path) => !selection.all.includes(path))) throw new Error('Unapproved path staged')
writeFileSync('.audits/creator-review/commit/staged.patch', git(['diff', '--cached', '--binary']))
writeFileSync('.audits/creator-review/commit/hunks.json', JSON.stringify(selectedHunks, null, 2))
console.log(JSON.stringify({ stagedFiles: staged.length, mixed: selectedHunks }, null, 2))
