import { expect, test } from 'bun:test'
import { type StudioTutorEnvironment, StudioTutorEnvironmentSchema } from './tutor-environment'

const python: StudioTutorEnvironment = {
  version: 1,
  programmingLanguage: 'python',
  runtime: { profileId: 'python-browser', releaseId: 'release-1', manifestSha256: 'a'.repeat(64) },
  pythonVersion: '3.14.2',
  entrypoint: 'src/main.py',
  extensions: [{ id: 'python-turtle', version: '1.0.0' }],
  shadowedModules: ['turtle'],
}

test('assistance distinguishes legacy JavaScript from an exact Python environment', () => {
  expect(
    StudioTutorEnvironmentSchema.parse({
      version: 1,
      programmingLanguage: 'javascript',
      extensions: [],
    }),
  ).toEqual({ version: 1, programmingLanguage: 'javascript', extensions: [] })
  expect(StudioTutorEnvironmentSchema.parse(python)).toEqual(python)
  expect(
    StudioTutorEnvironmentSchema.safeParse({
      version: 1,
      programmingLanguage: 'javascript',
      extensions: [{ id: 'game-2d', version: 'latest' }],
    }).success,
  ).toBe(true)
  expect(StudioTutorEnvironmentSchema.safeParse({ ...python, runtime: undefined }).success).toBe(
    false,
  )
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, pythonVersion: 'latest' }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, entrypoint: 'src/main.js' }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, programmingLanguage: 'typescript' })
      .success,
  ).toBe(false)
})

test('assistant metadata rejects ambiguous APIs and execution instructions', () => {
  expect(
    StudioTutorEnvironmentSchema.safeParse({
      ...python,
      extensions: [...python.extensions, ...python.extensions],
    }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, shadowedModules: ['turtle', 'turtle'] })
      .success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, shadowedModules: ['pygame', 'pinta'] })
      .success,
  ).toBe(true)
  // Every module a project may shadow fits at once (random, math, turtle, pygame, pinta, sz_audio).
  expect(
    StudioTutorEnvironmentSchema.safeParse({
      ...python,
      shadowedModules: ['random', 'math', 'turtle', 'pygame', 'pinta', 'sz_audio'],
    }).success,
  ).toBe(true)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, shadowedModules: ['unknown'] }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({
      ...python,
      frameURL: 'https://unapproved.invalid/frame.html',
    }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({ ...python, capabilities: ['execute'] }).success,
  ).toBe(false)
  expect(
    StudioTutorEnvironmentSchema.safeParse({
      ...python,
      extensions: [{ id: 'python-turtle', version: 'latest' }],
    }).success,
  ).toBe(false)
})
