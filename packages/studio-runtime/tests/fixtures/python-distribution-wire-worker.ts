import type { StudioRuntimeReleaseStatus } from '@sistemazero/core/studio/runtime-catalog'
import {
  createPythonDistributionServer,
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../../src/python-distributions'

interface WireFixtureBindings {
  QA_BUCKET: RuntimeDistributionBucket
  QA_DEPLOYMENT: string
  QA_FILES: string
}

// Private fixture operational state; never imported by the product worker.
let status: StudioRuntimeReleaseStatus = 'active'

export default {
  async fetch(request: Request, env: WireFixtureBindings) {
    const path = new URL(request.url).pathname
    const deployment: unknown = JSON.parse(env.QA_DEPLOYMENT)
    if (request.method === 'POST' && path === '/setup') {
      const files: Record<string, number[]> = JSON.parse(env.QA_FILES)
      await storePythonRuntimeDistribution({
        bucket: env.QA_BUCKET,
        deployment,
        read: async (path) => {
          const bytes = files[path]
          if (!bytes) throw new Error('Missing fixture file')
          return new Uint8Array(bytes)
        },
      })
      return Response.json({ stored: true })
    }
    if (request.method === 'POST' && ['/retire', '/revoke'].includes(path)) {
      status = path === '/retire' ? 'retired' : 'revoked'
      return Response.json({ status })
    }
    const serve = await createPythonDistributionServer({
      approvedDeployments: [deployment],
      parentOrigins: ['https://app.example'],
      status: () => status,
    })
    const response = await serve(request, env.QA_BUCKET)
    // Private fixture observations preserve the original Response and encodeBody setting.
    response.headers.set(
      'X-QA-Request-Encoding',
      request.headers.get('Accept-Encoding') ?? '<absent>',
    )
    const originalEncoding = request.cf?.clientAcceptEncoding
    response.headers.set(
      'X-QA-Client-Encoding',
      typeof originalEncoding === 'string' ? originalEncoding : '<absent>',
    )
    return response
  },
}
