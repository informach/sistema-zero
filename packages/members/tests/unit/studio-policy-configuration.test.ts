import { afterEach, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from '../../src/infrastructure/config/env'
import {
  loadStudioAuthoringPolicy,
  STUDIO_POLICY_DIRECTORY,
  STUDIO_POLICY_MAX_BYTES,
} from '../../src/infrastructure/config/studio-authoring-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})
async function fixtureFile(text: string, expected?: string) {
  const path = await mkdtemp(join(tmpdir(), 'sz-policy-'))
  directories.push(path)
  const sha256 = expected ?? createHash('sha256').update(text).digest('hex')
  await writeFile(join(path, `${sha256}.json`), text)
  return { sha256, directory: pathToFileURL(`${path}/`) }
}

test('absence preserves JS-only setup; inline and bundled policy use the same validation', async () => {
  expect(await loadStudioAuthoringPolicy({})).toBeUndefined()
  const { configuration, project } = await authoringFixture('python', 'pro')
  const text = JSON.stringify(configuration)
  const { sha256, directory } = await fixtureFile(text)
  for (const config of [
    { STUDIO_AUTHORING_POLICY_JSON: text },
    { STUDIO_AUTHORING_POLICY_SHA256: sha256 },
  ]) {
    const policy = await loadStudioAuthoringPolicy(config, directory)
    expect(policy?.describe()).toEqual(configuration)
    expect(() => policy?.assert(project, {})).not.toThrow()
  }
})

test('bundled configuration supports a catalog larger than the Railway variable limit', async () => {
  const { configuration } = await authoringFixture('python', 'classic')
  configuration.releases[0]!.blockIds = Array.from(
    { length: 2000 },
    (_, i) => `approved-block-${i}`,
  )
  const text = JSON.stringify(configuration)
  expect(Buffer.byteLength(text)).toBeGreaterThan(32_768)
  const { sha256, directory } = await fixtureFile(text)
  const policy = await loadStudioAuthoringPolicy(
    { STUDIO_AUTHORING_POLICY_SHA256: sha256 },
    directory,
  )
  expect(policy?.describe()).toEqual(configuration)
})

test('conflicting sources fail even when the inline policy is otherwise valid', async () => {
  const { configuration } = await authoringFixture('python', 'pro')
  const config = {
    STUDIO_AUTHORING_POLICY_JSON: JSON.stringify(configuration),
    STUDIO_AUTHORING_POLICY_SHA256: 'a'.repeat(64),
  }
  await expect(loadStudioAuthoringPolicy(config)).rejects.toThrow('apenas uma origem')
  expect(() =>
    loadEnv({ DATABASE_URL: 'test', GATEWAY_HMAC_SECRET: 'x'.repeat(32), ...config }),
  ).toThrow('apenas uma origem')
})

test('invalid selectors, missing files and changed bytes cannot fall back to JS or inline', async () => {
  const { sha256, directory } = await fixtureFile('{}')
  for (const selector of ['../catalog', 'A'.repeat(64), '', `${sha256}.json`])
    await expect(
      loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_SHA256: selector }, directory),
    ).rejects.toThrow('SHA256')
  await expect(
    loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_SHA256: 'b'.repeat(64) }, directory),
  ).rejects.toThrow()
  await writeFile(new URL(`${sha256}.json`, directory), '{"version":1}')
  await expect(
    loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_SHA256: sha256 }, directory),
  ).rejects.toThrow('Integridade')
})

test('a correct digest is insufficient: JSON, schema and runtime manifest must validate', async () => {
  const { configuration } = await authoringFixture('python', 'classic')
  configuration.catalog.releases[0]!.manifestSha256 = 'a'.repeat(64)
  for (const text of ['not-json', '{}', JSON.stringify(configuration)]) {
    const { sha256, directory } = await fixtureFile(text)
    await expect(
      loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_SHA256: sha256 }, directory),
    ).rejects.toThrow()
  }
})

test('oversized files and inline UTF-8 bytes are rejected', async () => {
  const oversized = 'é'.repeat(STUDIO_POLICY_MAX_BYTES / 2 + 1)
  const { sha256, directory } = await fixtureFile(oversized)
  await expect(
    loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_SHA256: sha256 }, directory),
  ).rejects.toThrow('limite')
  await expect(
    loadStudioAuthoringPolicy({ STUDIO_AUTHORING_POLICY_JSON: oversized }),
  ).rejects.toThrow('limite')
})

test('every shipped catalog has its exact digest and passes the real policy validator', async () => {
  const files = (await readdir(STUDIO_POLICY_DIRECTORY)).filter((name) => name.endsWith('.json'))
  expect(files.length).toBeGreaterThan(0)
  for (const file of files) {
    const policy = await loadStudioAuthoringPolicy({
      STUDIO_AUTHORING_POLICY_SHA256: file.slice(0, -5),
    })
    expect(policy?.describe().releases.length).toBeGreaterThan(0)
  }
})
