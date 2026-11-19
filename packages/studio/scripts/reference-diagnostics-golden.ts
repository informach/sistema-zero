import { createHash } from 'node:crypto'
import { projetosDosCursos } from '../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { loadExtensionExamples } from '../src/extensions'
import { behaviorStatements } from '../src/ir'
import {
  type ProgrammingReferenceIssue,
  validateProgrammingReferences,
} from '../src/ir/programmingReferences'
import { type JSStatement, SZIRInputSchema } from '../src/ir/schema'
import { OFFICIAL_CATALOG } from '../src/official-extensions'

// Run before and after a validator optimization. Keep the order and every message/path.
const results: { name: string; issues: ProgrammingReferenceIssue[] }[] = []
const missing: JSStatement[] = [
  { type: 'consoleLog', value: { type: 'var', name: '__sz_missing_read_20261118' } },
  { type: 'assign', name: '__sz_missing_write_20261118', value: { type: 'num', value: 1 } },
]
function record(name: string, statements: JSStatement[]): void {
  results.push({ name, issues: validateProgrammingReferences(statements) })
  const issues = validateProgrammingReferences([...missing, ...statements])
  if (issues.length < 2) throw new Error(`Missing negative controls: ${name}`)
  results.push({ name: `${name}/missing-references`, issues })
}
for (const extension of OFFICIAL_CATALOG) {
  for (const [index, example] of (await loadExtensionExamples(extension)).entries()) {
    const statements = behaviorStatements(SZIRInputSchema.parse(example.ir))
    record(`${extension.manifest.id}/${index}`, statements)
  }
}
for (const { curso, origem, projeto } of projetosDosCursos()) {
  const ir = SZIRInputSchema.parse(projeto.ir)
  record(`${curso}/${origem}`, behaviorStatements(ir))
}
const json = JSON.stringify(results)
console.log(
  JSON.stringify({
    cases: results.length,
    sha256: createHash('sha256').update(json).digest('hex'),
    results,
  }),
)
