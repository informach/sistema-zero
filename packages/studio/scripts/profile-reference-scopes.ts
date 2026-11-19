import { validateProgrammingReferences } from '../src/ir/programmingReferences'
import type { JSStatement } from '../src/ir/schema'

const statements: JSStatement[] = []
for (let i = 0; i < 500; i++)
  statements.push({ type: 'var', name: `value${i}`, value: { type: 'num', value: i } })
for (let i = 0; i < 1000; i++)
  statements.push({
    type: 'if',
    cond: { type: 'bool', value: true },
    then: [{ type: 'consoleLog', value: { type: 'var', name: `value${i % 500}` } }],
  })
const samples: number[] = []
for (let run = 0; run < 34; run++) {
  const start = performance.now()
  const issues = validateProgrammingReferences(statements)
  if (issues.length) throw new Error(JSON.stringify(issues))
  if (run >= 3) samples.push(performance.now() - start)
}
samples.sort((a, b) => a - b)
console.log(
  JSON.stringify({
    fixture: '500 globals, 1000 conditional bodies reading them',
    statements: 2500,
    samples,
    p50: samples[Math.floor(samples.length * 0.5)],
    p95: samples[Math.floor(samples.length * 0.95)],
  }),
)
