import { expect, test } from 'bun:test'
import {
  prepareStudioPythonStructureEvaluation,
  StudioPythonStructureRuleSchema,
} from './python-activity-structure'
import { studioPythonExecutionRevision } from './python-execution-content'
import {
  StudioPythonInspectionReportSchema,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from './python-inspection'
import type { StudioPythonStructureFacts } from './python-structure'

async function fixture() {
  const content = {
    version: 1 as const,
    configuration: {
      runtime: { profileId: 'python-browser', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
      extensions: [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1 as const,
          target: 'browser' as const,
          pythonVersion: '3.14.2',
          runtimeManifestSha256: 'a'.repeat(64),
          requirementsSha256: 'b'.repeat(64),
          packages: [],
        },
      },
    },
    directories: [],
    files: [
      { path: 'main.py', kind: 'source' as const, sha256: 'c'.repeat(64), byteLength: 4 },
      { path: 'empty.pyi', kind: 'source' as const, sha256: 'd'.repeat(64), byteLength: 0 },
      { path: 'README.md', kind: 'source' as const, sha256: 'e'.repeat(64), byteLength: 3 },
    ],
  }
  const snapshot = {
    ...content,
    projectId: 'game',
    revision: await studioPythonExecutionRevision(content),
  }
  const report = StudioPythonInspectionReportSchema.parse({
    version: 1,
    revision: snapshot.revision,
    runtimeManifestSha256: 'a'.repeat(64),
    pythonVersion: '3.14.2',
    status: 'passed',
    files: content.files
      .slice(0, 2)
      .map(({ path, sha256 }) => ({ path, sha256, status: 'passed', diagnostics: [] })),
  })
  return { snapshot, report }
}

test('structure requires complete exact-revision evidence for every Python module, including empty files', async () => {
  const { snapshot, report } = await fixture()
  const structure: StudioPythonStructureFacts = {
    version: 1,
    nodesVisited: 1,
    usesLoop: false,
    usesConditional: false,
    assignedNames: [],
    definedFunctions: [],
    callTargets: [],
  }
  await expect(verifyStudioPythonStructureEvidence(report, snapshot)).rejects.toThrow('incompleta')
  report.files[0]!.structure = structure
  await expect(verifyStudioPythonStructureEvidence(report, snapshot)).rejects.toThrow('incompleta')
  report.files[1]!.structure = structure
  const evidence = await verifyStudioPythonStructureEvidence(report, snapshot)
  expect(evidence.map((file) => file.path)).toEqual(['main.py', 'empty.pyi'])
  expect(evidence.every((file) => file.structure.nodesVisited === 1)).toBe(true)
  await expect(
    verifyStudioPythonStructureEvidence({ ...report, revision: 'f'.repeat(64) }, snapshot),
  ).rejects.toThrow()
  report.status = report.files[0]!.status = 'failed'
  report.files[0]!.diagnostics = [{ message: 'return outside function' }]
  await expect(verifyStudioPythonInspectionReport(report, snapshot)).rejects.toThrow()
})

test('Python activity rules bind complete evidence and distinguish syntax, file scope and exact call targets', async () => {
  const { snapshot, report } = await fixture()
  for (const file of report.files) {
    file.structure = {
      version: 1,
      nodesVisited: 1,
      usesLoop: file.path === 'main.py',
      usesConditional: file.path === 'main.py',
      assignedNames: file.path === 'main.py' ? ['t', 'ação'] : [],
      definedFunctions: file.path === 'main.py' ? ['jogar'] : [],
      callTargets: file.path === 'main.py' ? ['t.forward'] : [],
    }
  }
  const pending = prepareStudioPythonStructureEvaluation(report, snapshot)
  // The verified report is captured before awaiting the snapshot hash.
  for (const file of report.files) file.structure = undefined
  const evaluate = await pending
  for (const rule of [
    { type: 'usesLoop' },
    { type: 'usesConditional', file: 'main.py' },
    { type: 'declaresVariable', name: 'ação' },
    { type: 'definesFunction', name: 'jogar' },
    { type: 'callsFunction', name: 't.forward' },
  ])
    expect(evaluate(rule)).toBe(true)
  for (const rule of [
    { type: 'usesLoop', file: 'empty.pyi' },
    { type: 'usesLoop', file: 'missing.py' },
    { type: 'declaresVariable', name: 'absent' },
    { type: 'definesFunction', name: 'other' },
    { type: 'callsFunction', name: 'turtle.forward' },
  ])
    expect(evaluate(rule)).toBe(false)
  for (const rule of [
    { type: 'usesBlock', blockType: 'python_loop' },
    { type: 'usesLoop', verifiedBy: 'server' },
    { type: 'usesLoop', file: '../other.py' },
    { type: 'usesLoop', file: 'README.md' },
    { type: 'callsFunction', name: '' },
  ])
    expect(StudioPythonStructureRuleSchema.safeParse(rule).success).toBe(false)
  await expect(prepareStudioPythonStructureEvaluation(report, snapshot)).rejects.toThrow(
    'incompleta',
  )
})

test('compilation report covers every Python source exactly, while not claiming other files were compiled', async () => {
  const { snapshot, report } = await fixture()
  expect(await verifyStudioPythonInspectionReport(report, snapshot)).toEqual(report)
  const failed = structuredClone(report)
  failed.status = failed.files[0]!.status = 'failed'
  failed.files[0]!.diagnostics = [
    { message: 'return outside function', range: { start: 0, end: 4 } },
  ]
  expect((await verifyStudioPythonInspectionReport(failed, snapshot)).status).toBe('failed')
  failed.files[0]!.diagnostics[0]!.range!.end = 5
  await expect(verifyStudioPythonInspectionReport(failed, snapshot)).rejects.toThrow('ultrapassa')
})

test('omissions, extras, duplicates, inconsistent status and swapped source/runtime identities cannot approve a report', async () => {
  const { snapshot, report } = await fixture()
  for (const candidate of [
    { ...report, revision: 'f'.repeat(64) },
    { ...report, runtimeManifestSha256: 'f'.repeat(64) },
    { ...report, pythonVersion: '3.12.0' },
    { ...report, files: report.files.slice(0, 1) },
    { ...report, files: [...report.files, report.files[0]] },
    { ...report, files: report.files.map((file) => ({ ...file, sha256: 'f'.repeat(64) })) },
    { ...report, files: [...report.files, { ...report.files[0], path: 'extra.py' }] },
    { ...report, status: 'failed' },
    { ...report, grant: true },
  ])
    await expect(verifyStudioPythonInspectionReport(candidate, snapshot)).rejects.toThrow()
  const forgedMetadata = { ...snapshot, revision: 'f'.repeat(64) }
  await expect(
    verifyStudioPythonInspectionReport(
      { ...report, revision: forgedMetadata.revision },
      forgedMetadata,
    ),
  ).rejects.toThrow('revisão')
})

test('report and metadata are captured before their asynchronous digest verification', async () => {
  const { snapshot, report } = await fixture()
  const original = structuredClone(report)
  const pending = verifyStudioPythonInspectionReport(report, snapshot)
  report.files[0]!.path = 'late.py'
  snapshot.files[0]!.sha256 = 'f'.repeat(64)
  expect(await pending).toEqual(original)
})
