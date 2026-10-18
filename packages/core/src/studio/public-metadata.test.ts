import { expect, test } from 'bun:test'
import {
  type StudioPublicProjectMetadata,
  StudioPublicProjectMetadataSchema,
} from './public-metadata'

test('public project hints preserve legacy JavaScript and require an explicit Python runtime', () => {
  const js = { pro: false, extensions: ['game-2d'] }
  expect(StudioPublicProjectMetadataSchema.parse(js)).toEqual(js)
  const python: StudioPublicProjectMetadata = {
    pro: true,
    extensions: ['python-turtle'],
    programmingLanguage: 'python',
    runtime: { profileId: 'python-browser', releaseId: '1.0.0', manifestSha256: 'a'.repeat(64) },
  }
  expect(StudioPublicProjectMetadataSchema.parse(python)).toEqual(python)
  for (const invalid of [
    { ...python, runtime: undefined },
    { ...python, programmingLanguage: 'ruby' },
    { ...python, runtime: { ...python.runtime, runtimeUrl: 'https://untrusted.test' } },
    { ...python, extensions: Array(9).fill('python-turtle') },
  ])
    expect(StudioPublicProjectMetadataSchema.safeParse(invalid).success).toBe(false)
})
