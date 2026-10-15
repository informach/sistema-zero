// Run with Bun from the repository root. No network, model, database or product writes.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { sanitizeProMeta } from '../packages/studio/src/state/proTree.ts'
import { assertProjectContentPreserved } from '../packages/studio/src/core/projectDocument.ts'
import { STUDIO_PRO_BUILD_LIMITS } from '../packages/core/src/studio/pro-build.ts'
import { serializeStudioProBuildEnvelope, studioProBuildEnvelopeIssue } from '../packages/core/src/studio/pro-runtime-capabilities.ts'
import { STUDIO_PRO_BUILDER_LIMITS } from '../packages/core/src/studio/pro-builder.ts'
import { STUDIO_PRO_ARTIFACT_LIMITS } from '../packages/core/src/studio/pro-artifact.ts'
import { studioProTaskGuides } from '../packages/core/src/studio/pro-game-knowledge.ts'
import { STUDIO_PRO_TEMPLATE_IDS } from '../packages/core/src/studio/pro-templates.ts'
import { storeArtifact, sha256 } from '../packages/studio-runtime/src/artifacts.ts'

const results = []
const proposedMeta = {
  devScript: 'dev',
  templateId: 'vanilla-vite',
  designBrief: { version: 1, goal: 'Coletar estrelas' },
}
const sanitized = sanitizeProMeta(proposedMeta)
assert.equal(Object.hasOwn(sanitized, 'designBrief'), false)
let preservationError
try {
  assertProjectContentPreserved({ proMeta: proposedMeta }, { proMeta: sanitized })
} catch (error) {
  preservationError = error.message
}
assert.match(preservationError, /proMeta.designBrief/)
results.push({
  id: 'metadata-needs-reader-migration',
  confirmed: true,
  observation: 'sanitizeProMeta omits the proposed field; the actual preservation guard refuses the document.',
  error: preservationError,
})

const files = { 'index.html': '<main>Example</main>' }
const binary = Buffer.alloc(1_500_000)
const binaries = {
  'public/example.bin': {
    base64: binary.toString('base64'),
    sha256: await sha256(binary),
  },
}
const runtimeEnvelope = {
  executionId: 'review-probe',
  templateId: 'vanilla-vite',
  files,
  binaries,
  parentOrigin: 'https://studio.example',
  validate: true,
}
const runtimeEnvelopeBytes = Buffer.byteLength(serializeStudioProBuildEnvelope(runtimeEnvelope))
assert(runtimeEnvelopeBytes > STUDIO_PRO_BUILD_LIMITS.maxRequestBytes)
assert(runtimeEnvelopeBytes < STUDIO_PRO_BUILDER_LIMITS.maxPayloadBytes)
assert.match(studioProBuildEnvelopeIssue(runtimeEnvelope), /ultrapassa o limite/)
results.push({
  id: 'builder-and-build-envelopes-differ',
  confirmed: true,
  observation: 'The shared preflight now being implemented by the main session rejects this complete envelope. It fits below the builder cap but exceeds the runtime cap; no request was sent to either service.',
  runtimeEnvelopeBytes,
  builderCap: STUDIO_PRO_BUILDER_LIMITS.maxPayloadBytes,
  runtimeCap: STUDIO_PRO_BUILD_LIMITS.maxRequestBytes,
})

const guides = studioProTaskGuides('Melhorar sprite, áudio, HUD e acessibilidade')
assert(guides.length > 0 && guides.length <= 3)
for (const id of ['canvas-grid-arena', 'phaser-tactics', 'three-tactics'])
  assert(STUDIO_PRO_TEMPLATE_IDS.includes(id))
results.push({
  id: 'existing-lot8-curation',
  confirmed: true,
  templateCount: STUDIO_PRO_TEMPLATE_IDS.length,
  selectedGuideIds: guides.map((guide) => guide.id),
  observation: 'Task selection and the three lot-8 IDs already exist; this does not certify their complete gameplay.',
})

const html = new TextEncoder().encode(files['index.html'])
const manifest = { version: 1, files: [{
  path: 'index.html', bytes: html.length, sha256: await sha256(html), contentType: 'text/html',
}] }
const values = new Map()
const bucket = {
  get: async () => null,
  put: async (key, value) => { values.set(key, value) },
  delete: async (keys) => { keys.forEach((key) => values.delete(key)) },
}
const artifactOptions = {
  bucket, origin: 'https://runtime.example', parentOrigin: 'https://studio.example',
  manifest, read: async () => html, now: 0,
}
const first = await storeArtifact(artifactOptions)
const second = await storeArtifact(artifactOptions)
assert.notEqual(first.id, second.id)
assert.equal(first.sha256, second.sha256)
assert.equal(first.expiresAt, STUDIO_PRO_ARTIFACT_LIMITS.previewLifetimeMs)
results.push({
  id: 'artifact-identity-and-lifetime',
  confirmed: true,
  observation: 'Actual artifact writer with an in-memory bucket: equal bytes, different artifact IDs, equal manifest digests; not an R2 integration test.',
  equalContentDigest: first.sha256 === second.sha256,
  differentIds: first.id !== second.id,
  previewLifetimeMs: STUDIO_PRO_ARTIFACT_LIMITS.previewLifetimeMs,
  jobRetentionMs: STUDIO_PRO_BUILDER_LIMITS.retentionMs,
})

const report = { capturedAt: new Date().toISOString(), results }
await writeFile(new URL('./studio-adendo-review3-probes-2026-10-15.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ confirmed: results.length, results: results.map(({ id }) => id) }))
