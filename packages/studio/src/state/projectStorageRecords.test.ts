import { expect, test } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { documentFixture } from './fixtures/projectDocuments'
import { PROJECT_STORAGE_VERSION } from './projectStorageKeys'
import {
  assembleProjectRecord,
  projectStorageEntries,
  projectToMetaRecord,
} from './projectStorageRecords'
import { prepareProjectForHost } from './projectValidation'

test('a migration chooses one namespace for every partition without changing the portable version', () => {
  const project = documentFixture('javascript', 'classic')
  for (const version of [3, 4] as const) {
    const entries = projectStorageEntries(project, version)
    expect(entries.every(([key]) => key.startsWith(`sz:v${version}:project-`))).toBe(true)
    expect(projectToMetaRecord(project, version).storageVersion).toBe(version)
    expect(projectToMetaRecord(project, version).formatVersion).toBe(project.formatVersion)
  }
  expect(projectStorageEntries(project)[0]?.[0]).toStartWith(`sz:v${PROJECT_STORAGE_VERSION}:`)
})

test('legacy host validation keeps unknown metadata before it reaches local storage', async () => {
  const original = Object.assign(createEmptyProject('legacy-metadata', 'Meu jogo'), {
    futureMetadata: { reference: 'scene-v17', enabled: false, unknownFields: ['', 0] },
  })
  const loaded = await prepareProjectForHost(original)
  expect(loaded).not.toBeNull()
  expect(loaded && 'futureMetadata' in loaded ? loaded.futureMetadata : undefined).toEqual(
    original.futureMetadata,
  )
})

for (const language of ['javascript', 'python'] as const) {
  for (const kind of ['classic', 'pro'] as const) {
    test(`${language}/${kind}: unknown document metadata survives partition round-trip`, () => {
      const project = Object.assign(documentFixture(language, kind), {
        futureMetadata: { version: 17, retained: ['identity', { disabled: false, empty: '' }] },
      })
      const entries = projectStorageEntries(project)
      const part = (name: string) => entries.find(([key]) => key.includes(`:project-${name}:`))?.[1]
      const restored = assembleProjectRecord(
        project.id,
        part('meta'),
        part('files'),
        part('state'),
        part('assets'),
        part('blocks'),
      )
      expect(restored?.futureMetadata).toEqual(project.futureMetadata)
      expect(restored?.id).toBe(project.id)
      const metadata = projectToMetaRecord(project)
      for (const key of ['files', 'extraFiles', 'tree', 'python', 'ir', 'blocksState', 'assets'])
        expect(Object.hasOwn(metadata, key)).toBe(false)
    })
  }
}

test('partitioning never invokes executable unknown metadata', () => {
  const project = documentFixture('javascript', 'classic')
  let reads = 0
  Object.defineProperty(project, 'futureMetadata', {
    enumerable: true,
    get() {
      reads++
      return 'unsafe'
    },
  })
  expect(() => projectToMetaRecord(project)).toThrow()
  expect(reads).toBe(0)
})

test('nested executable metadata is rejected and local symbols never become document fields', () => {
  const project = documentFixture('javascript', 'classic')
  const local = Symbol('local-only')
  const withLocal = Object.assign(project, { [local]: { neverPortable: true } })
  expect(Object.getOwnPropertySymbols(projectToMetaRecord(withLocal))).toEqual([])
  let reads = 0
  const metadata = Object.defineProperty({}, 'child', {
    enumerable: true,
    get() {
      reads++
      return 'unsafe'
    },
  })
  Object.assign(project, { futureMetadata: metadata })
  expect(() => projectToMetaRecord(project)).toThrow()
  expect(reads).toBe(0)
})

test('partition round-trip preserves unknown root undefined and signed zero', () => {
  const project = Object.assign(createEmptyProject('future-metadata', 'Futuro'), {
    futureSlot: undefined,
    futureZero: -0,
    futureMetadata: { absent: undefined, zero: -0 },
  })
  const entries = projectStorageEntries(project)
  const part = (name: string) => entries.find(([key]) => key.includes(`:project-${name}:`))?.[1]
  const restored = assembleProjectRecord(
    project.id,
    part('meta'),
    part('files'),
    part('state'),
    part('assets'),
    part('blocks'),
  )!
  expect(Object.hasOwn(restored, 'futureSlot')).toBe(true)
  expect(restored.futureSlot).toBeUndefined()
  expect(Object.is(restored.futureZero, -0)).toBe(true)
  expect(Object.hasOwn(restored.futureMetadata as object, 'absent')).toBe(true)
  expect(Object.is((restored.futureMetadata as { zero: number }).zero, -0)).toBe(true)
  expect(Object.hasOwn(restored, 'python')).toBe(false)
})
