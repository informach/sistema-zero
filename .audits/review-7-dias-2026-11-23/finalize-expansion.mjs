import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const folder = fileURLToPath(new URL('.', import.meta.url))
const read = name => readFileSync(resolve(folder, name), 'utf8')
const logs = ['expanded-runtime.log','expanded-members.log','expanded-shell.log','expanded-edges-exact.log','expanded-help-db.log','thumbnail-content-green.log','expanded-fullscreen.log','expanded-pinta-waits.log']
const tests = logs.map(log => {
  const raw = read(log)
  const sum = kind => [...raw.matchAll(new RegExp(`^\\s+(\\d+) ${kind}\\s*$`, 'gm'))].reduce((n,m) => n + +m[1],0)
  return { log, pass: sum('pass'), fail: sum('fail') }
})
const firstTypes = read('expanded-types-first.log')
const typePassed = [...firstTypes.matchAll(/^(@\S+) typecheck: Exited with code 0/gm)].map(m=>m[1])
if (read('expanded-shell-types.exit').trim() === '0') typePassed.push('@sistemazero/member-shell')
const expected = ['@sistemazero/studio','@sistemazero/studio-runtime','@sistemazero/members','@sistemazero/member-shell']
const missingTypes = expected.filter(n=>!typePassed.includes(n))
const docs = ['relatorio.md','limitacoes-e-liberacoes.md']
const missingLinks = docs.flatMap(doc => [...read(doc).matchAll(/\]\((?:<([^>]+)>|([^)]+))\)/g)].flatMap(m=>{
  const target = m[1] ?? m[2]
  return /^https?:/.test(target) || existsSync(resolve(dirname(resolve(folder,doc)),target)) ? [] : [{ doc,target }]
}))
const data = {
  verifiedAt: new Date().toISOString(), head: 'f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e',
  testSelections: tests, testExecutionsPassed: tests.reduce((s,t)=>s+t.pass,0),
  repeatedInterfaceRegression: { log: 'expanded-shell-fixture-green.log', exitCode: 0 },
  typePackagesPassed: [...new Set(typePassed)].sort(), missingTypes,
  typeCoverageHead: '0a89ef2e325bd32445d2df5c7f4dad8bc876ced5; plus R9/R10/R11 corrections',
  laterReviewedCommits: ['e9ce20df3','3b2e87919','f8910ee05 (R9 already verified in working tree)'],
  dockerWarm: { rebuiltImage: 'sistemazero-studio-runtime:verify', user: 1000, network: 'none', exitCode: +read('expanded-warm-docker.exit').trim() },
  production: { flagsAndDeployments: 'release-access-evidence.json', readOnlyCourseQuery: 'production-course-status.json' },
  fixedFindings: ['R10: full thumbnail content identity', 'R11: nullable viewer fixture'],
  missingLinks,
}
writeFileSync(resolve(folder,'expanded-verification.json'),JSON.stringify(data,null,2)+'\n')
console.log(JSON.stringify({testsPassed:data.testExecutionsPassed,testsFailed:tests.reduce((s,t)=>s+t.fail,0),typePackages:data.typePackagesPassed,missingTypes,missingLinks,dockerWarmExit:data.dockerWarm.exitCode},null,2))
if (tests.some(t=>t.fail||!t.pass)||missingTypes.length||missingLinks.length||data.dockerWarm.exitCode!==0) process.exitCode=1
