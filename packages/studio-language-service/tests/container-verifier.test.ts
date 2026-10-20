import { expect, test } from 'bun:test'
import {
  assertOwnedContainer,
  inspectContainerIsolation,
  LANGUAGE_QA_PROBE,
  LANGUAGE_QA_SUPERVISOR,
  parseContainerVerificationOptions,
  redactVerificationError,
} from '../scripts/verify-container'

const image = `sha256:${'a'.repeat(64)}`
const platformImage = `sha256:${'c'.repeat(64)}`
const platformDescriptor = {
  mediaType: 'application/vnd.oci.image.manifest.v1+json',
  digest: platformImage,
  size: 2575,
  platform: { architecture: 'amd64', os: 'linux' },
}
const identity = {
  sourceImageRef: image,
  expectedPlatformManifestDigest: platformImage,
  expectedPlatformDescriptor: platformDescriptor,
}
const args = [
  `--image=${image}`,
  `--platform-manifest=${platformImage}`,
  '--run=r1',
  '--bootstrap=bootstrap.json',
  `--bundle-sha256=${'b'.repeat(64)}`,
]
const inspection = () => ({
  Id: 'd'.repeat(64),
  Image: image,
  ImageManifestDescriptor: structuredClone(platformDescriptor),
  Config: {
    Image: image,
    User: '1000:1000',
    Env: ['PYTHON_LANGUAGE_TOKEN=PRIVATE'],
    Labels: { 'sz.language22.qa-owner': 'our-nonce' },
  },
  HostConfig: {
    NetworkMode: 'none',
    ReadonlyRootfs: true,
    Memory: 536870912,
    MemorySwap: 536870912,
    NanoCpus: 1_000_000_000,
    PidsLimit: 64,
    CapDrop: ['ALL'],
    SecurityOpt: ['no-new-privileges'],
    PortBindings: {},
    Binds: null,
    Tmpfs: {
      '/tmp': 'rw,noexec,nosuid,nodev,size=16m',
      '/workspace': 'rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000',
    },
  },
})

test('QA invocation requires immutable image and fresh safe run identity', () => {
  expect(parseContainerVerificationOptions(args)).toMatchObject({
    sourceImageRef: image,
    expectedPlatformManifestDigest: platformImage,
    platform: 'linux/amd64',
    run: 'r1',
  })
  for (const invalid of [
    args.filter((value) => !value.startsWith('--image=')),
    args.filter((value) => !value.startsWith('--platform-manifest=')),
    args.map((value) => (value.startsWith('--image=') ? '--image=moving:tag' : value)),
    args.map((value) =>
      value.startsWith('--run=') ? '--run=../l5-language-container-proof' : value,
    ),
    [...args, '--run=other'],
    [...args, '--skip-auth=true'],
  ])
    expect(() => parseContainerVerificationOptions(invalid)).toThrow()
})

test('running-image mismatch and weakened isolation fail before any probe', () => {
  expect(() =>
    inspectContainerIsolation(
      inspection(),
      { ...identity, expectedPlatformManifestDigest: image },
      'our-nonce',
    ),
  ).toThrow()
  expect(() =>
    inspectContainerIsolation(
      inspection(),
      { ...identity, sourceImageRef: platformImage },
      'our-nonce',
    ),
  ).toThrow()
  for (const change of [
    { NetworkMode: 'bridge' },
    { ReadonlyRootfs: false },
    { Memory: 1073741824 },
    { PidsLimit: 128 },
    { Binds: ['/host:/workspace'] },
  ]) {
    const value = inspection()
    expect(() =>
      inspectContainerIsolation(
        { ...value, HostConfig: { ...value.HostConfig, ...change } },
        identity,
        'our-nonce',
      ),
    ).toThrow()
  }
  const serialized = JSON.stringify(inspectContainerIsolation(inspection(), identity, 'our-nonce'))
  expect(serialized).not.toContain('PRIVATE')
  expect(serialized).not.toContain('Env')
})

test('the pinned platform descriptor must match wholly; no alternative identity is accepted', () => {
  for (const forged of [
    { ...platformDescriptor, digest: image },
    { ...platformDescriptor, size: 2576 },
    { ...platformDescriptor, platform: { architecture: 'arm64', os: 'linux' } },
    { ...platformDescriptor, mediaType: 'application/vnd.oci.image.index.v1+json' },
  ])
    expect(() =>
      inspectContainerIsolation(
        { ...inspection(), ImageManifestDescriptor: forged },
        identity,
        'our-nonce',
      ),
    ).toThrow()
  expect(() =>
    inspectContainerIsolation({ ...inspection(), Image: platformImage }, identity, 'our-nonce'),
  ).toThrow()
  expect(() =>
    inspectContainerIsolation(
      { ...inspection(), ImageManifestDescriptor: undefined },
      identity,
      'our-nonce',
    ),
  ).toThrow()
})

test('cleanup refuses a foreign container even under the same name', () => {
  expect(() => assertOwnedContainer(inspection(), 'd'.repeat(64), 'our-nonce')).not.toThrow()
  expect(() => assertOwnedContainer(inspection(), 'e'.repeat(64), 'our-nonce')).toThrow()
  expect(() => assertOwnedContainer(inspection(), 'd'.repeat(64), 'foreign-nonce')).toThrow()
  expect(() => assertOwnedContainer(inspection(), 'short-id', 'our-nonce')).toThrow()
})

test('failure evidence redacts all registered secrets without losing the failure', () => {
  expect(redactVerificationError(new Error('A token1 B token2 token1'), ['token1', 'token2'])).toBe(
    'Error: A [REDACTED] B [REDACTED] [REDACTED]',
  )
})

test('exact Node supervisor/probe programs parse independently of TypeScript', () => {
  expect(() => new Function(LANGUAGE_QA_SUPERVISOR)).not.toThrow()
  expect(() => new Function(LANGUAGE_QA_PROBE)).not.toThrow()
})
