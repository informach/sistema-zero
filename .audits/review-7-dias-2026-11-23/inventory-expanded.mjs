import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const base = 'cb9f7471daa27e9fe2fadfcdf50a75f29f562bcd'
const previousHead = '8c76682010730ae95c48918920929cf1bcc4dc56'
const head = 'f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e'
const since = '2026-11-16T16:28:01Z'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
const commits = git('log', `--since=${since}`, '--format=%H%x09%cI%x09%s', head).trim().split('\n').map(line => {
  const [sha, at, subject] = line.split('\t')
  return { sha, at, subject }
})
const parseFiles = raw => raw.trim().split('\n').filter(Boolean).map(line => {
  const [added, removed, path] = line.split('\t')
  return { path, added: added === '-' ? null : +added, removed: removed === '-' ? null : +removed }
})
const changedFiles = parseFiles(git('diff', '--numstat', base, head))
const additionalFiles = parseFiles(git('diff', '--numstat', previousHead, head))
const additionalCommits = git('rev-list', `${previousHead}..${head}`).trim().split('\n')
const workingDiff = git('diff', '--binary', '--', 'packages/')
const workingChanges = git('diff', '--name-only', '--', 'packages/').trim().split('\n').filter(Boolean)
const untrackedSources = git('ls-files', '--others', '--exclude-standard', '--', 'packages/').trim().split('\n').filter(Boolean)
const result = {
  generatedAt: new Date().toISOString(), since, base, previousHead, head,
  note: 'Mantém o início da janela original e inclui o que entrou durante a revisão. Não reescreve a evidência da primeira coleta.',
  commits: commits.length, files: changedFiles.length,
  additions: changedFiles.reduce((s,f) => s+(f.added??0), 0),
  deletions: changedFiles.reduce((s,f) => s+(f.removed??0), 0),
  additionalCommitCount: additionalCommits.length,
  additionalFileCount: additionalFiles.length,
  additionalHistory: commits.filter(c => additionalCommits.includes(c.sha)),
  additionalFiles, changedFiles, history: commits,
  workingTree: { changedFiles: workingChanges, untrackedSources, sourceDiffSha256: createHash('sha256').update(workingDiff).digest('hex') },
}
writeFileSync(new URL('inventory-expanded.json', import.meta.url), JSON.stringify(result, null, 2)+'\n')
writeFileSync(new URL('commits-expanded.tsv', import.meta.url), commits.map(c => [c.sha,c.at,c.subject].join('\t')).join('\n')+'\n')
console.log(JSON.stringify({ head, commits:result.commits, files:result.files, additions:result.additions, deletions:result.deletions, additionalCommits:result.additionalCommitCount, additionalFiles:result.additionalFileCount }, null, 2))
