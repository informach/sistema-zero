import { expect, test } from 'bun:test'
import { studioBuildSchema } from './build-contract'
import { studioPythonExecutionRevision } from './python-execution-content'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  StudioPythonInputOpenSchema,
  StudioPythonInputReferenceSchema,
  StudioPythonInputStateSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from './python-validation-input'

async function fixture() {
  const content = {
    version: 1 as const,
    configuration: {
      runtime: {
        profileId: 'python-browser',
        releaseId: 'release-1',
        manifestSha256: 'a'.repeat(64),
      },
      extensions: [],
      python: {
        entrypoint: '.main.py',
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
    files: [{ path: '.main.py', kind: 'source' as const, sha256: 'c'.repeat(64), byteLength: 4 }],
  }
  return {
    version: 1 as const,
    executionId: 'python-1234567890abcdef',
    owner: 'd'.repeat(64),
    requestId: '01234567-89ab-4cde-8fab-0123456789ab',
    snapshot: {
      ...content,
      projectId: 'game',
      revision: await studioPythonExecutionRevision(content),
    },
  }
}
test('input contracts contain detached metadata and service-generated references without binary/source envelopes', async () => {
  const input = await fixture()
  const opened = StudioPythonInputOpenSchema.parse(input)
  const inputFile = input.snapshot.files[0]
  const openedFile = opened.snapshot.files[0]
  if (!inputFile || !openedFile) throw new Error('Missing input fixture source')
  inputFile.path = 'changed.py'
  expect(openedFile.path).toBe('.main.py')
  const state = StudioPythonInputStateSchema.parse({
    ...opened,
    inputId: 'a'.repeat(32),
    generation: crypto.randomUUID(),
    createdAt: 1000,
    expiresAt: 1000 + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs,
  })
  const reference = {
    version: 1,
    inputId: state.inputId,
    generation: state.generation,
    requestId: state.requestId,
    projectId: state.snapshot.projectId,
    owner: state.owner,
    executionId: state.executionId,
    revision: state.snapshot.revision,
    expiresAt: state.expiresAt,
  }
  expect(StudioPythonInspectionRequestSchema.safeParse(reference).success).toBe(false)
  expect(
    StudioPythonInspectionRequestSchema.parse({ version: 1, input: reference, structure: true })
      .structure,
  ).toBe(true)
  expect(
    StudioPythonInspectionRequestSchema.safeParse({
      version: 1,
      input: reference,
      structure: false,
    }).success,
  ).toBe(true)
  for (const structure of [undefined, null, 'false', 0]) {
    expect(
      StudioPythonInspectionRequestSchema.safeParse({ version: 1, input: reference, structure })
        .success,
    ).toBe(false)
    expect(
      StudioPythonValidationRequestSchema.safeParse({
        version: 1,
        input: reference,
        structure,
        recipe: { version: 1 },
      }).success,
    ).toBe(false)
  }
  expect(
    StudioPythonInspectionRequestSchema.safeParse({ version: 1, input: reference }).success,
  ).toBe(false)
  expect(
    StudioPythonInputReferenceSchema.parse({
      version: 1,
      inputId: state.inputId,
      requestId: state.requestId,
      generation: state.generation,
      projectId: state.snapshot.projectId,
      owner: state.owner,
      executionId: state.executionId,
      revision: state.snapshot.revision,
      expiresAt: state.expiresAt,
    }).revision,
  ).toBe(opened.snapshot.revision)
  expect(
    StudioPythonInputStateSchema.safeParse({ ...state, expiresAt: state.expiresAt + 1 }).success,
  ).toBe(false)
  for (const field of ['inputId', 'source', 'base64', 'url', 'bucketKey', 'authorization'])
    expect(
      StudioPythonInputOpenSchema.safeParse({ ...opened, [field]: 'not allowed' }).success,
    ).toBe(false)
})
test('Python inputs preserve the existing JavaScript execution-id namespace exactly', async () => {
  const input = await fixture()
  for (const executionId of [
    'a'.repeat(15),
    'a'.repeat(16),
    'a'.repeat(96),
    'a'.repeat(97),
    'python-1234567890',
    'Python-1234567890',
    '../python-1234567890',
    'python_1234567890',
    '0123456789abcdef',
  ]) {
    expect(StudioPythonInputOpenSchema.safeParse({ ...input, executionId }).success).toBe(
      studioBuildSchema.shape.executionId.safeParse(executionId).success,
    )
  }
})
