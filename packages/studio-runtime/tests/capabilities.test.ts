import { expect, test } from 'bun:test'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  STUDIO_PRO_BUILD_LIMITS,
  serializeStudioProBuildEnvelope,
  studioProBuildEnvelopeIssue,
} from '@sistemazero/core/studio'
import { sha256 } from '../src/artifacts'
import { parseBuildRequest, verifyBuildBinaries } from '../src/contracts'
import { materializeTestTemplate } from './template-files'

test('full UTF-8 Canvas envelope crosses the exact boundary with replaced art', async () => {
  const { files, binaries } = await materializeTestTemplate('canvas-survival')
  const art = new Uint8Array(1_100_000).fill(137)
  const input = {
    executionId: `builder-${'a'.repeat(32)}`,
    templateId: 'canvas-survival',
    parentOrigin: 'https://kids.test',
    validate: true,
    files: { ...files, 'src/limit.md': 'Olá 🌴\n', 'src/padding0.md': '', 'src/padding1.md': '' },
    binaries: {
      ...binaries,
      'public/assets/replaced.png': {
        base64: Buffer.from(art).toString('base64'),
        sha256: await sha256(art),
      },
    },
  }
  const padding =
    STUDIO_PRO_BUILD_LIMITS.maxRequestBytes -
    Buffer.byteLength(serializeStudioProBuildEnvelope(input))
  input.files['src/padding0.md'] = 'x'.repeat(200_000)
  input.files['src/padding1.md'] = 'x'.repeat(padding - 200_000)
  for (const delta of [-1, 0, 1]) {
    const candidate = structuredClone(input)
    candidate.files['src/padding0.md'] = 'x'.repeat(200_000 + delta)
    const body = serializeStudioProBuildEnvelope(candidate)
    expect(Buffer.byteLength(body)).toBe(STUDIO_PRO_BUILD_LIMITS.maxRequestBytes + delta)
    expect(studioProBuildEnvelopeIssue(candidate) === null).toBe(delta <= 0)
    const read = readJsonBodyWithLimit(
      new Request('https://runtime.test/v1/preflight', { method: 'POST', body }),
      STUDIO_PRO_BUILD_LIMITS.maxRequestBytes,
    )
    if (delta > 0) await expect(read).rejects.toThrow()
    else {
      const parsed = parseBuildRequest(await read)
      await verifyBuildBinaries(parsed.binaries)
      expect(parsed.templateId).toBe('canvas-survival')
    }
  }
})

test('Canvas manual creation uses the complete source/material envelope within the same contract at every layer', async () => {
  const { files, binaries } = await materializeTestTemplate('canvas-survival')
  const input = {
    executionId: 'builder-' + '0'.repeat(32),
    templateId: 'canvas-survival',
    parentOrigin: 'https://kids.test',
    files,
    binaries,
    validate: true,
  }
  expect(studioProBuildEnvelopeIssue(input)).toBeNull()
  expect(Buffer.byteLength(serializeStudioProBuildEnvelope(input))).toBeLessThan(
    STUDIO_PRO_BUILD_LIMITS.maxRequestBytes,
  )
  expect(JSON.parse(serializeStudioProBuildEnvelope(input))).toEqual(input)
})
test('Oversized material profiles and unsupported paths cannot enter a paid remote builder run', () => {
  const input = {
    executionId: 'builder-' + '0'.repeat(32),
    templateId: 'three-ts',
    parentOrigin: 'https://kids.test',
    files: { 'index.html': '<main>jogo</main>' },
  }
  for (const bytes of [2_274_104, 7_000_000]) {
    const binaries = {
      'public/model.glb': {
        base64: Buffer.alloc(bytes).toString('base64'),
        sha256: '0'.repeat(64),
      },
    }
    expect(studioProBuildEnvelopeIssue({ ...input, binaries })).toContain('ultrapassa o limite')
  }
  expect(
    studioProBuildEnvelopeIssue({
      ...input,
      files: { ...input.files, ['src/' + 'a'.repeat(180) + '.ts']: '' },
    }),
  ).toContain('caminho/formato')
  expect(
    studioProBuildEnvelopeIssue({
      ...input,
      files: { ...input.files, 'src/a/b/c/d/e/f/g/h.ts': '' },
    }),
  ).toContain('caminho/formato')
  expect(
    studioProBuildEnvelopeIssue({
      ...input,
      binaries: { 'public/__studio-proof.png': { base64: '', sha256: '0'.repeat(64) } },
    }),
  ).toContain('material')
})
