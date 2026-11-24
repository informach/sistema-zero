// Private, temporary cloud qualification entrypoint. Never imported by src/worker.ts.
import { DurableObject } from 'cloudflare:workers'
import { timingSafeEqual } from 'node:crypto'
import { getSandbox } from '@cloudflare/sandbox'
import { awaitWithSignal, readJsonBodyWithLimit } from '@sistemazero/core/http'
import { createStudioRuntimeHandler } from '../../src/index'
import { forwardProbeMethod } from './lg02-runtime-probe-rpc'

export { CheckSandboxPool } from '../../src/check-sandbox-pool'
export { ProBuildSandbox, ThreeDCheckSandbox } from '../../src/index'
export { PythonInspectionJob } from '../../src/python-inspection-job'

/** Synchronizes real execution start after both VMs/files are ready; reset fails the test. */
export class LG02ProbeBarrier extends DurableObject {
  arrivals = 0
  ready = Promise.withResolvers()
  async arrive() {
    this.arrivals++
    if (this.arrivals === 2) this.ready.resolve()
    await this.ready.promise
  }
  status() {
    return this.arrivals
  }
}

function authorized(request, env) {
  const actual = new TextEncoder().encode(request.headers.get('authorization') ?? '')
  const expected = new TextEncoder().encode(`Bearer ${env.INTERNAL_TOKEN}`)
  return (
    env.INTERNAL_TOKEN &&
    actual.byteLength === expected.byteLength &&
    timingSafeEqual(actual, expected)
  )
}

export default {
  async fetch(request, env, ctx) {
    if (!authorized(request, env)) return new Response(null, { status: 401 })
    const url = new URL(request.url)
    if (request.method !== 'POST') return new Response(null, { status: 404 })
    if (url.pathname === '/qa/barrier-state') {
      const body = await readJsonBodyWithLimit(request, 1024)
      if (!body || typeof body !== 'object' || !/^[a-f0-9]{24}$/.test(body.barrier))
        return new Response(null, { status: 400 })
      return Response.json({ arrivals: await env.QABarriers.getByName(body.barrier).status() })
    }
    if (url.pathname === '/qa/retire') {
      const body = await readJsonBodyWithLimit(request, 16000)
      if (
        !Array.isArray(body) ||
        body.length > 40 ||
        body.some(
          (item) =>
            !item || !/^check-[a-f0-9]{32}$/.test(item.id) || typeof item.threeD !== 'boolean',
        )
      )
        return new Response(null, { status: 400 })
      const results = await Promise.all(
        body.map(async (item) => {
          try {
            await getSandbox(item.threeD ? env.ThreeDCheckSandbox : env.ProBuildSandbox, item.id, {
              enableDefaultSession: false,
              transport: 'rpc',
            }).destroy()
            return { id: item.id, retired: true }
          } catch {
            return { id: item.id, retired: false }
          }
        }),
      )
      return Response.json({ results })
    }
    if (!['/v1/check', '/v1/check/warm'].includes(url.pathname))
      return new Response(null, { status: 404 })
    const mode = request.headers.get('x-lg02-qa-mode')
    const barrier = request.headers.get('x-lg02-qa-barrier')
    if (barrier && !/^[a-f0-9]{24}$/.test(barrier)) return new Response(null, { status: 400 })
    const resources = []
    const successors = []
    const scopedPools =
      mode === 'release-ack-loss'
        ? {
            getByName(name) {
              const pool = env.CheckSandboxPools.getByName(name)
              let owner
              return {
                acquire(operation, profileId, threeD) {
                  owner = { profileId, threeD }
                  return pool.acquire(operation, profileId, threeD)
                },
                async release(lease, reusable, destructionConfirmed) {
                  const result = await pool.release(lease, reusable, destructionConfirmed)
                  if (reusable && result) {
                    const successor = await pool.acquire('check', owner.profileId, owner.threeD)
                    if (
                      successor.kind !== 'lease' ||
                      !successor.pooled ||
                      successor.sandboxId !== lease.sandboxId
                    )
                      throw new Error('Successor did not acquire released VM')
                    const sdk = getSandbox(
                      name.endsWith('-3d') ? env.ThreeDCheckSandbox : env.ProBuildSandbox,
                      successor.sandboxId,
                      { enableDefaultSession: false, transport: 'rpc' },
                    )
                    const marker = crypto.randomUUID()
                    const probe = {
                      sdk,
                      marker,
                      ready: sdk.writeFile('/workspace/lg02-successor-proof.txt', marker),
                    }
                    successors.push(probe)
                    await probe.ready
                    throw new Error(
                      'QA response lost after actual release and successor acquisition',
                    )
                  }
                  return result
                },
              }
            },
          }
        : env.CheckSandboxPools
    const factory = new Proxy(getSandbox, {
      apply(target, receiver, args) {
        const [namespace, id] = args
        const sdk = Reflect.apply(target, receiver, args)
        resources.push({
          id,
          threeD: namespace === env.ThreeDCheckSandbox,
          durableObjectId: namespace.idFromName(id).toString(),
        })
        return new Proxy(sdk, {
          get(target, property, receiver) {
            if (property === 'exec')
              return async (command, options) => {
                if (barrier && command.includes('check-objectives.mjs'))
                  await awaitWithSignal(
                    () => env.QABarriers.getByName(barrier).arrive(),
                    AbortSignal.timeout(45000),
                  )
                if (
                  (mode === 'execution-failure' && command.includes('check-objectives.mjs')) ||
                  (mode === 'cleanup-failure' && command.startsWith('rm -rf')) ||
                  (mode === 'warm-failure' && command.includes('check-warm.mjs'))
                )
                  return target.exec('false', options)
                return target.exec(command, options)
              }
            const value = Reflect.get(target, property, receiver)
            return typeof value === 'function' ? forwardProbeMethod(target, value) : value
          },
        })
      },
    })
    const handler = createStudioRuntimeHandler(factory)
    const response = await handler.fetch(
      request,
      {
        ...env,
        CheckSandboxPools: scopedPools,
        ...(mode === 'cold' ? { STUDIO_CHECK_WARMING_ENABLED: '0' } : {}),
      },
      ctx,
    )
    const headers = new Headers(response.headers)
    if (mode === 'release-ack-loss') {
      let survived = successors.length === 1
      for (const successor of successors) {
        await successor.ready
        try {
          survived &&=
            (await successor.sdk.readFile('/workspace/lg02-successor-proof.txt')).content ===
            successor.marker
        } catch {
          survived = false
        }
      }
      headers.set('x-lg02-qa-successor-survived', String(survived))
    }
    headers.set('x-lg02-qa-resources', JSON.stringify(resources))
    return new Response(response.body, { status: response.status, headers })
  },
}
