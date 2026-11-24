import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
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
const courseStart = results.length
for (const { curso, origem, projeto } of projetosDosCursos()) {
  const ir = SZIRInputSchema.parse(projeto.ir)
  record(`${curso}/${origem}`, behaviorStatements(ir))
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
// Os projetos dos cursos são protegidos (nunca mudam): os diagnósticos deles só mudam se o
// validador mudar de comportamento. É essa parte que `--check` confere contra o esperado
// versionado; os exemplos oficiais mudam com as frentes e ficam só no relatório.
const courses = results.slice(courseStart)
const summary = {
  cases: results.length,
  sha256: digest(results),
  courseCases: courses.length,
  courseSha256: digest(courses),
}
const expectedFile = new URL('./reference-diagnostics-golden.expected.json', import.meta.url)
if (process.argv.includes('--update')) {
  writeFileSync(
    expectedFile,
    `${JSON.stringify({ courseCases: summary.courseCases, courseSha256: summary.courseSha256 }, null, 2)}
`,
  )
}
console.log(JSON.stringify({ ...summary, results }))
if (process.argv.includes('--check')) {
  const expected = JSON.parse(readFileSync(expectedFile, 'utf8')) as {
    courseCases: number
    courseSha256: string
  }
  if (
    expected.courseCases !== summary.courseCases ||
    expected.courseSha256 !== summary.courseSha256
  ) {
    console.error(
      `Os diagnósticos dos projetos dos cursos mudaram: ${summary.courseCases} casos (${summary.courseSha256}), esperado ${expected.courseCases} (${expected.courseSha256}). Se a mudança do validador for intencional, confira os casos e rode com --update.`,
    )
    process.exit(1)
  }
}
