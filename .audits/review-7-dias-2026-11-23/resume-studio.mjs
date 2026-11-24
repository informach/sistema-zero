import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../packages/studio/scripts/test-isolated.mjs', import.meta.url), 'utf8')
const prior = readFileSync(new URL('studio-locked.log', import.meta.url), 'utf8')
const groups = [...prior.matchAll(/Studio tests: (.+) \(\d+ files\)/g)].map(m => m[1])
// O último lote foi o contrato de tema corrigido; os anteriores já terminaram verdes.
const completed = groups.slice(0, -1)
const resumed = source
  .replace("new URL('../', import.meta.url)", "new URL('../../packages/studio/', import.meta.url)")
  .replace('for (const [name, paths] of groups) {', `for (const [name, paths] of groups) {\n  if (${JSON.stringify(completed)}.includes(name)) continue`)
await import(`data:text/javascript;base64,${Buffer.from(resumed.replaceAll('import.meta.url', JSON.stringify(import.meta.url))).toString('base64')}`)
