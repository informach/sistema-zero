import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const base = 'cb9f7471daa27e9fe2fadfcdf50a75f29f562bcd'
const head = '8c76682010730ae95c48918920929cf1bcc4dc56'
const since = '2026-11-16T16:28:01Z'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
const commits = git('log', `--since=${since}`, '--format=%H%x09%cI%x09%s', head).trim().split('\n').map(line => {
  const [sha, committedAt, subject] = line.split('\t')
  return { sha, committedAt, subject }
})
const generated = /(?:generated|\.lock$|\/migrations\/meta\/|__gen_|\/vendor\/)/i
const test = /(?:\.(?:test|spec|cases|flow)\.[^/]+$|\/(?:tests|testing|__tests__|e2e[^/]*|fixtures)\/)/
const files = git('diff', '--numstat', base, head).trim().split('\n').map(line => {
  const [added, removed, path] = line.split('\t')
  const binary = added === '-'
  const kind = binary ? 'binary' : generated.test(path) ? 'generated' : test.test(path) ? 'test' : /\.(?:tsx?|[cm]?jsx?|py|sql|ya?ml|toml|css|astro)$/.test(path) ? 'implementation' : 'documentation-or-data'
  return { path, added: binary ? null : +added, removed: binary ? null : +removed, kind, area: path.split('/').slice(0, path.startsWith('packages/') ? 2 : 1).join('/') }
})
const areas = Object.groupBy(files, f => f.area)
const stats = Object.entries(areas).map(([area, list]) => ({ area, files: list.length, added: list.reduce((s,f)=>s+(f.added??0),0), removed: list.reduce((s,f)=>s+(f.removed??0),0), implementation: list.filter(f=>f.kind==='implementation').length, tests:list.filter(f=>f.kind==='test').length })).sort((a,b)=>b.files-a.files)
const riskPatterns = {
  html: /dangerouslySetInnerHTML|innerHTML\s*=|\.srcdoc\s*=/,
  execution: /\beval\(|new Function\(|child_process|Bun\.spawn/,
  concurrency: /setInterval\(|setTimeout\(|addEventListener\(/,
  suppression: /@ts-ignore|@ts-nocheck|biome-ignore/,
  incomplete: /\bTODO\b|\bFIXME\b|throw new Error\(['"]Not implemented/,
  network: /\bfetch\(|gatewayFetch|\.transaction\(/,
}
const risk = []
for (const file of files.filter(f=>f.kind==='implementation')) {
  const diff = git('diff', '--unified=0', base, head, '--', file.path)
  const hits = Object.fromEntries(Object.entries(riskPatterns).map(([name, re])=>[name,diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')&&re.test(l)).length]).filter(([,n])=>n))
  if (Object.keys(hits).length) risk.push({path:file.path,hits})
}
const report = { since, through: '2026-11-23T16:28:01Z', base, head, commits: commits.length, files: files.length, kinds: Object.fromEntries(Object.entries(Object.groupBy(files,f=>f.kind)).map(([k,v])=>[k,v.length])), areas:stats, changedFiles:files, history:commits, riskCandidates: risk }
writeFileSync(new URL('inventory.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({since,base,head,commits:report.commits,files:report.files,kinds:report.kinds,areas:stats.slice(0,25),riskCandidates:risk.length},null,2))
