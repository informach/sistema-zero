import { expect, test } from 'bun:test'
import { PythonProjectExecutionRequestSchema } from '@sistemazero/core/studio/python-mission-execution'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import {
  StudioPythonInputReferenceSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonMissionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'

const { createPythonSdkInspectionRequest } = require('./fixtures/python-sdk-workerd.cjs')
const input = StudioPythonInputReferenceSchema.parse({
  version: 1,
  inputId: 'a'.repeat(32),
  requestId: '00000000-0000-4000-8000-000000000001',
  generation: '00000000-0000-4000-8000-000000000002',
  projectId: 'sdk-proof',
  owner: 'b'.repeat(64),
  executionId: 'python-sdk-1234567890abcdef',
  revision: 'c'.repeat(64),
  expiresAt: 1_000,
})
test('SDK mission envelope preserves probes, structure and immutable identity without a playtest recipe', () => {
  const mission = PythonProjectExecutionRequestSchema.parse({
    version: 1,
    identity: {
      projectId: input.projectId,
      revision: input.revision,
      runtimeManifestSha256: 'd'.repeat(64),
      runId: crypto.randomUUID(),
      objectivesSha256: 'e'.repeat(64),
    },
    probes: [{ id: 'out', type: 'behavior', steps: [], target: { kind: 'console' } }],
  })
  const request = createPythonSdkInspectionRequest(
    { mission, validate: true, structure: false },
    input,
  )
  expect(StudioPythonMissionRequestSchema.parse(request)).toEqual({
    version: 1,
    input,
    structure: false,
    mission,
  })
  expect(request).not.toHaveProperty('recipe')
  expect(
    StudioPythonMissionRequestSchema.safeParse({
      ...request,
      mission: { ...mission, identity: { ...mission.identity, revision: 'f'.repeat(64) } },
    }).success,
  ).toBe(false)
})

for (const structure of [false, true])
  test(`SDK compilation/inspection sends the current envelope with structure=${structure}`, () => {
    const request = createPythonSdkInspectionRequest({ validate: false, structure }, input)
    const parsed = StudioPythonInspectionRequestSchema.parse(request)
    expect(parsed).toEqual({ version: 1, input, structure })
    expect(request.input).toBe(input)
    expect(StudioPythonInspectionRequestSchema.safeParse(input).success).toBe(false)
  })

for (const preview of [false, true])
  test(`SDK validation preserves recipe and preview=${preview} in its current envelope`, () => {
    const recipe = StudioPythonPlaytestRecipeSchema.parse({ version: 1 })
    const request = createPythonSdkInspectionRequest(
      { validate: true, structure: false, preview, recipe },
      input,
    )
    expect(StudioPythonValidationRequestSchema.parse(request)).toEqual({
      version: 1,
      input,
      structure: false,
      recipe,
      ...(preview ? { preview: { parentOrigin: 'https://kids.test' } } : {}),
    })
    expect(request.recipe).toBe(recipe)
  })

test('manual playtest recipes use the current V1 recipe contract, independently of publication V2', () => {
  for (const recipe of [
    { version: 1 },
    { version: 1, stdin: ['Lia'], keys: ['Space'] },
    {
      version: 1,
      stdin: ['Lia'],
      keys: ['Space'],
      clicks: [{ x: 0.25, y: 0.25 }],
      requireGraphics: true,
    },
  ])
    expect(StudioPythonPlaytestRecipeSchema.safeParse(recipe).success).toBe(true)
  expect(StudioPythonPlaytestRecipeSchema.safeParse({ version: 2 }).success).toBe(false)
})

test('SDK request construction does not invent the current structure field for an old seed', () => {
  for (const structure of [undefined, null, 0]) {
    const request = createPythonSdkInspectionRequest({ validate: false, structure }, input)
    expect(StudioPythonInspectionRequestSchema.safeParse(request).success).toBe(false)
  }
})
