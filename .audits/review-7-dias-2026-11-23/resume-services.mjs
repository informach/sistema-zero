import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const separate = new Set(['@sistemazero/agent-runtime', '@sistemazero/marketing-desktop', '@sistemazero/molda', '@sistemazero/studio'])
const passed = new Set([...readFileSync(new URL('services-locked.log', import.meta.url), 'utf8').matchAll(/^(@[^\s]+) test: Exited with code 0\r?$/gm)].map(m=>m[1]))
const packages = readdirSync('packages').flatMap(directory => {
  try { const p=JSON.parse(readFileSync(`packages/${directory}/package.json`,'utf8')); return p.scripts?.test && !separate.has(p.name) ? [p.name] : [] } catch { return [] }
}).sort()
const results = packages.filter(name=>!passed.has(name)).map(name=>{
  console.log(`REVIEW PACKAGE ${name}`)
  const result=spawnSync('bun',['run','--filter',name,'test'],{stdio:'inherit'})
  if(result.error) throw result.error
  return {name,exitCode:result.status??1}
})
writeFileSync(new URL('services-results.json',import.meta.url),JSON.stringify({priorPasses:[...passed],results},null,2)+'\n')
console.log(JSON.stringify({priorPasses:passed.size,results},null,2))
if(results.some(r=>r.exitCode!==0)) process.exitCode=1
