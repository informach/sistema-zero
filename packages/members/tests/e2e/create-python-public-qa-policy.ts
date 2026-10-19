/** Synthetic loopback QA policy from verified, content-addressed probe bytes. */
import { resolve } from 'node:path'
import { StudioAuthoringCatalogSchema } from '../../../core/src/studio/authoring-catalog'
import { StudioRuntimeReleaseSchema } from '../../../core/src/studio/runtime-catalog'
import { PYTHON_PROGRAMMING_CODECS } from '../../../studio/src/python/blocks/catalog'
import { PYTHON_TURTLE_CODECS } from '../../../studio/src/python/extensions/turtle/catalog'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'

const probe = new URL(process.env.STUDIO_QA_PROBE_URL ?? 'http://127.0.0.1:5297')
if (probe.origin !== 'http://127.0.0.1:5297' || probe.href !== 'http://127.0.0.1:5297/')
  throw new Error('A configuração de QA exige o probe local na porta 5297.')
const distribution = await fetch(new URL('/distribution', probe))
if (!distribution.ok) throw new Error('A distribuição de QA não respondeu.')
const release = StudioRuntimeReleaseSchema.parse((await distribution.json()).release)
if (
  release.profileId !== 'python-probe' ||
  release.releaseId !== 'probe-1' ||
  release.manifest.programmingLanguage !== 'python'
)
  throw new Error('A release de QA não é a release Python esperada.')
const configuration = await fetch(new URL('/configuration', probe))
if (!configuration.ok) throw new Error('O host de execução de QA não respondeu.')
const frameUrl = new URL((await configuration.json()).providerFrameURL)
if (frameUrl.protocol !== 'http:' || frameUrl.hostname !== '127.0.0.1')
  throw new Error('O frame de QA precisa ser servido por loopback.')
const runtime = {
  profileId: release.profileId,
  releaseId: release.releaseId,
  manifestSha256: release.manifestSha256,
}
const codecs = [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS]
const policy = StudioAuthoringCatalogSchema.parse({
  version: 1,
  catalog: {
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  },
  releases: [
    {
      runtime,
      status: 'active',
      proTemplateIds: ['python-blank'],
      blockIds: codecs.map(({ id }) => id),
      categoryIds: [...new Set(codecs.map(({ category }) => category))],
    },
  ],
})
await createStudioAuthoringPolicy(policy)
const hosts = [{ runtime, origin: frameUrl.origin }]
createStudioRuntimeHosts(policy.catalog, hosts)
const output = resolve('.cache/studio-python-l0/real-public-qa')
await Bun.write(resolve(output, 'policy.json'), JSON.stringify(policy))
await Bun.write(resolve(output, 'hosts.json'), JSON.stringify(hosts))
console.log(
  JSON.stringify({
    release: release.manifestSha256,
    frameOrigin: frameUrl.origin,
    blocks: codecs.length,
  }),
)
