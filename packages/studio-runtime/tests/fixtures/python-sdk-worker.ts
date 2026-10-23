import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { studioPythonInspectionJobId } from '@sistemazero/core/studio/python-inspection-job'
import {
  studioPythonRuntimePrefix,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'
import { createStudioRuntimeHandler, type Env, ProBuildSandbox } from '../../src/index'
import { PYTHON_CONFIGURATION_MAX_BYTES } from '../../src/python-configuration'
import {
  describePythonRuntimeConfiguration,
  readPythonRuntimeConfiguration,
  storePythonRuntimeConfiguration,
} from '../../src/python-configuration-storage'
import type { PythonInspectionSandbox } from '../../src/python-inspection'
import { PythonInspectionJob } from '../../src/python-inspection-job'
import { createPythonJobStateStore } from '../../src/python-job-state'
import { pythonPreviewRecordKey } from '../../src/python-previews'
import { createPythonR2InputStorage } from '../../src/python-r2-inputs'

export { ProBuildSandbox }

type ProofEnv = Omit<
  Env,
  'BUILD_RATE_LIMITER' | 'PYTHON_UPLOAD_RATE_LIMITER' | 'PythonInspectionJobs'
> & {
  PRO_ARTIFACTS: R2Bucket
  PYTHON_INPUTS: R2Bucket
  PYTHON_PREVIEWS: R2Bucket
  PROOF_TOKEN: string
  PROOF_CANCEL?: string
  PROOF_PREVIEW?: string
  PythonInspectionJobs: DurableObjectNamespace<PythonInspectionJob>
}

/** Instrument the real SDK inside its actual DO owner; no injected abort signal. */
export class ProofPythonInspectionJob extends PythonInspectionJob {
  private readonly observation = {
    created: 0,
    execStarted: 0,
    execFinished: 0,
    destroyStarted: 0,
    destroyFinished: 0,
  }
  async fetch(request: Request) {
    if (new URL(request.url).pathname === '/restart')
      this.ctx.abort('EXPECTED_LOCAL_PYTHON_SDK_OWNER_RESTART')
    return Response.json({
      ...this.observation,
      job: createPythonJobStateStore(this.ctx.storage.sql).read(),
    })
  }
  protected createOwnedSandbox(jobId: string): PythonInspectionSandbox {
    const sandbox = super.createOwnedSandbox(jobId)
    const observation = this.observation
    observation.created++
    return {
      mkdir: (...args) => sandbox.mkdir(...args),
      writeFile: (...args) => sandbox.writeFile(...args),
      readFile: (...args) => sandbox.readFile(...args),
      async exec(...args) {
        observation.execStarted++
        try {
          return await sandbox.exec(...args)
        } finally {
          observation.execFinished++
        }
      },
      async destroy() {
        observation.destroyStarted++
        const result = await sandbox.destroy()
        observation.destroyFinished++
        return result
      },
    }
  }
}
const runtime = createStudioRuntimeHandler()

/** Explicit LOCAL-only harness. Production entrypoints do not import this seed endpoint. */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url)
    console.info('[python-sdk-proof] request', request.method, url.pathname)
    if (url.pathname.startsWith('/__proof/inspection/')) {
      if (request.headers.get('Authorization') !== `Bearer ${env.PROOF_TOKEN}` || url.search)
        return new Response(null, { status: 403 })
      const reference = StudioPythonInputReferenceSchema.parse(
        JSON.parse(request.headers.get('X-Proof-Python-Input') ?? ''),
      )
      const jobId = await studioPythonInspectionJobId(reference)
      if (!env.PythonInspectionJobs) throw new Error('Missing owned-job binding')
      if (request.method === 'GET' && url.pathname === '/__proof/inspection/state')
        return env.PythonInspectionJobs.getByName(jobId).fetch('https://local-proof.invalid/state')
      if (
        request.method === 'POST' &&
        url.pathname === '/__proof/inspection/restart' &&
        (env.PROOF_CANCEL === 'true' || env.PROOF_PREVIEW === 'true')
      ) {
        try {
          await env.PythonInspectionJobs.getByName(jobId).fetch(
            'https://local-proof.invalid/restart',
          )
          return new Response(null, { status: 500 })
        } catch {
          return Response.json({ restarted: true }, { status: 409 })
        }
      }
      return new Response(null, { status: 404 })
    }
    const previewRecord = /^\/__proof\/preview\/([a-f0-9]{64})$/.exec(url.pathname)
    const builderJob = /^\/__proof\/builder\/inspection\/([a-f0-9]{64})$/.exec(url.pathname)
    if (builderJob?.[1]) {
      if (
        request.method !== 'GET' ||
        request.headers.get('Authorization') !== `Bearer ${env.PROOF_TOKEN}` ||
        env.PROOF_PREVIEW !== 'true' ||
        url.search
      )
        return new Response(null, { status: 403 })
      return env.PythonInspectionJobs.getByName(builderJob[1]).fetch(
        'https://local-proof.invalid/state',
      )
    }
    if (previewRecord?.[1]) {
      if (
        request.method !== 'GET' ||
        request.headers.get('Authorization') !== `Bearer ${env.PROOF_TOKEN}` ||
        env.PROOF_PREVIEW !== 'true' ||
        url.search
      )
        return new Response(null, { status: 403 })
      const object = await env.PYTHON_PREVIEWS.get(pythonPreviewRecordKey(previewRecord[1]))
      return object
        ? new Response(object.body, { headers: { 'Content-Type': 'application/json' } })
        : new Response(null, { status: 404 })
    }
    if (url.pathname === '/__proof/configuration') {
      if (
        request.method !== 'PUT' ||
        request.headers.get('Authorization') !== `Bearer ${env.PROOF_TOKEN}` ||
        !request.body ||
        url.search
      )
        return new Response(null, { status: 403 })
      const configuration = await readJsonBodyWithLimit(
        request,
        PYTHON_CONFIGURATION_MAX_BYTES,
        request.signal,
      )
      const descriptor = await describePythonRuntimeConfiguration(configuration)
      if (descriptor.sha256 !== env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256)
        return new Response(null, { status: 409 })
      await storePythonRuntimeConfiguration({ bucket: env.PRO_ARTIFACTS, configuration })
      return Response.json({ seeded: descriptor.key })
    }
    if (url.pathname.startsWith('/__proof/runtime/')) {
      if (
        request.method !== 'PUT' ||
        request.headers.get('Authorization') !== `Bearer ${env.PROOF_TOKEN}` ||
        !request.body ||
        url.search
      )
        return new Response(null, { status: 403 })
      const config = await readPythonRuntimeConfiguration(
        env.PRO_ARTIFACTS,
        env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 ?? '',
        request.signal,
      )
      const selected = config.deployments[0]
      if (!selected || config.deployments.length !== 1) throw new Error('Invalid proof seed')
      const deployment = await verifyStudioPythonDeployment(selected.deployment)
      const path = url.pathname.slice('/__proof/runtime/'.length)
      const file = deployment.distribution.files.find((file) => file.path === path)
      const marker = path === 'complete.json'
      if (!file && !marker) return new Response(null, { status: 404 })
      const sha256 = marker ? deployment.markerSha256 : file!.sha256
      const bytes = marker ? new TextEncoder().encode(deployment.marker).byteLength : file!.bytes
      const key = `${studioPythonRuntimePrefix(deployment.release.manifestSha256)}${marker ? path : `files/${path}`}`
      console.info('[python-sdk-proof] seed', path, bytes)
      await createPythonR2InputStorage(env.PRO_ARTIFACTS).put(key, request.body, {
        sha256,
        bytes,
        onlyIf: { etagDoesNotMatch: '*' },
      })
      console.info('[python-sdk-proof] seeded', path)
      return Response.json({ seeded: path })
    }
    // The scope is storage + SDK + compiler, not rate limiting. Authentication,
    // deployment resolution, byte verification and the production coordinator remain real.
    const limits = { limit: async () => ({ success: true }) }
    if (!runtime.fetch) throw new Error('Missing runtime fetch')
    return runtime.fetch(
      request,
      { ...env, BUILD_RATE_LIMITER: limits, PYTHON_UPLOAD_RATE_LIMITER: limits },
      ctx,
    )
  },
} satisfies ExportedHandler<ProofEnv>
