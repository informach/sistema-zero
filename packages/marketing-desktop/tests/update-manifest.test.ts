import { expect, test } from 'bun:test'
import { releaseConfiguration } from '../scripts/release-config'
import { releaseConfigurationSchema, validateUpdateManifest } from '../src/shared/updates'

const config = releaseConfigurationSchema.parse({
  schemaVersion: 1,
  feedUrl: 'https://updates.example.com/marketing/',
  publisherNames: ['CN=Sistema Zero, O=Sistema Zero, C=BR'],
})
const manifest = {
  version: '1.2.3',
  files: [
    {
      url: 'Sistema-Zero-1.2.3.exe',
      sha512: Buffer.alloc(64, 1).toString('base64'),
      size: 1000000,
    },
  ],
}

test('release requires an explicit HTTPS distribution and full certificate subjects', () => {
  expect(releaseConfiguration({}, false)).toBeNull()
  expect(() => releaseConfiguration({}, true)).toThrow()
  expect(() =>
    releaseConfiguration({ MARKETING_DESKTOP_UPDATE_URL: config.feedUrl }, true),
  ).toThrow()
  for (const feedUrl of [
    'http://updates.example.com/marketing/',
    'https://user:secret@updates.example.com/marketing/',
    `${config.feedUrl}?token=secret`,
    'https://updates.example.com/marketing',
  ])
    expect(() => releaseConfigurationSchema.parse({ ...config, feedUrl })).toThrow()
  expect(() =>
    releaseConfigurationSchema.parse({ ...config, publisherNames: ['Sistema Zero'] }),
  ).toThrow()
})

test('update metadata cannot select another host, parent folder, prerelease or unverified artifact', () => {
  expect(validateUpdateManifest(manifest, config).version).toBe('1.2.3')
  for (const url of [
    'https://elsewhere.example/installer.exe',
    '../other.exe',
    'file:///C:/other.exe',
    'https://updates.example.com/marketing-evil/installer.exe',
    'installer.exe?credential=secret',
    'installer.zip',
  ])
    expect(() =>
      validateUpdateManifest({ ...manifest, files: [{ ...manifest.files[0], url }] }, config),
    ).toThrow()
  expect(() => validateUpdateManifest({ ...manifest, version: '1.3.0-beta' }, config)).toThrow()
  expect(() =>
    validateUpdateManifest(
      { ...manifest, files: [{ ...manifest.files[0], sha512: 'unverified' }] },
      config,
    ),
  ).toThrow()
  expect(() =>
    validateUpdateManifest(
      { ...manifest, files: [{ ...manifest.files[0], size: 8 * 1024 ** 3 }] },
      config,
    ),
  ).toThrow()
  expect(() => validateUpdateManifest({ ...manifest, files: [] }, config)).toThrow()
})
