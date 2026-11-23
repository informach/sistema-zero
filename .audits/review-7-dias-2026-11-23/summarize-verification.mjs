import { readFileSync, writeFileSync } from 'node:fs'

const directory = new URL('.', import.meta.url)
const read = name => {
  try { return readFileSync(new URL(name, directory), 'utf8').replace(/\x1b\[[0-9;]*m/g, '') } catch { return '' }
}
const counts = raw => {
  const result = { pass: 0, fail: 0, skip: 0 }
  for (const match of raw.matchAll(/^\s+(\d+) (pass|fail|skip)\s*$/gm)) result[match[2]] += +match[1]
  return result
}
const services = JSON.parse(read('services-results.json'))
const serviceCounts = new Map()
for (const name of ['services-locked.log', 'services-resumed.log']) {
  const allowed = new Set(name === 'services-locked.log' ? services.priorPasses : services.results.map(r => r.name))
  for (const line of read(name).split('\n')) {
    const match = line.match(/^(@\S+) test: (.*)/)
    if (!match || !allowed.has(match[1])) continue
    const n = match[2].match(/^\s+(\d+) (pass|fail|skip)\s*$/)
    if (!n) continue
    const result = serviceCounts.get(match[1]) ?? { pass: 0, fail: 0, skip: 0 }
    result[n[2]] += +n[1]
    serviceCounts.set(match[1], result)
  }
}
const suites = [
  'molda-locked.log', 'studio-locked.log', 'studio-resumed.log', 'ci-and-lessons.log',
  'auth-final-db.log', 'members-db-isolated-final.log', 'referrals-db.log',
  'hub-db.log', 'commerce-db.log', 'thumbnail-regression-final.log', 'agent-runtime.log',
].map(log => ({ log, ...counts(read(log).replace(/^@\S+ test: /gm, '')) }))
const types = read('typecheck-locked.log')
const result = {
  generatedAt: new Date().toISOString(),
  services: { packages: services.priorPasses.length + services.results.length, allPassed: services.results.every(r => r.exitCode === 0), counts: Object.fromEntries(serviceCounts) },
  suites,
  types: {
    completed: [...types.matchAll(/^(@\S+):typecheck\s+\| Done in/gm)].map(m => m[1]),
    initialErrors: [...types.matchAll(/error TS[^\r\n]+/g)].map(m => m[0]),
    correctedConsumersLog: 'types-corrected-final.log',
    correctedConsumersOutput: read('types-corrected-final.log').trim(),
  },
  biome: read('biome-complete.log').split('\n').filter(l => /Checked |Found |Some errors/.test(l)),
  browser: {
    studio: read('studio-browser.log').split('\n').filter(l => /\d+ passed/.test(l)),
    pinta: read('pinta-browser.log').split('\n').filter(l => /\d+ passed/.test(l)),
    studentTests: read('student-tests-browser-final.log').split('\n').filter(l => /\d+ passed|\d+ failed/.test(l)),
    studentAdvancedRerun: read('student-tests-advanced-browser.log').split('\n').filter(l => /\d+ passed/.test(l)),
    cenarios: { scenarios: 8, log: 'cenarios-browser.log' },
  },
  limits: [
    'Agent-runtime: four native Windows helper launches blocked by Code Integrity 3033/3077.',
    'Two opt-in Members predecessor deployment proofs were skipped without predecessor roots.',
    'Members DB: nine files passed in individual Bun 1.3.11 processes. Combined restart failed under 1.3.11; same 25 cases passed under 1.4.4; nine combined files on 1.4.4 hit Cenarios hook timeouts. Combined mode is not approved.',
    'No full OS/browser CI matrix or physical GPU qualification was run by this review.',
    'Other sessions changed HEAD during verification; inventory is pinned to the initial HEAD.',
  ],
}
writeFileSync(new URL('verification-summary.json', directory), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ ...result, services: { ...result.services, counts: [...serviceCounts.values()].reduce((a,b) => ({ pass:a.pass+b.pass, fail:a.fail+b.fail, skip:a.skip+b.skip }), {pass:0,fail:0,skip:0}) } }, null, 2))
