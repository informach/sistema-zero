import { DurableObject } from 'cloudflare:workers'
import {
  StudioPythonInspectionJobStateSchema,
  verifyStudioPythonInspectionJobState,
} from '@sistemazero/core/studio/python-inspection-job'
import { createPythonJobStateStore } from '../../src/python-job-state'

/** Local SQL qualification only. Production has no state-editing or restart endpoint. */
export class JobStateProbe extends DurableObject {
  private readonly store = createPythonJobStateStore(this.ctx.storage.sql)
  read() {
    return this.store.read()
  }
  async claim(raw: unknown) {
    return this.store.claim(await verifyStudioPythonInspectionJobState(raw))
  }
  update(expected: unknown, changes: unknown) {
    return this.store.update(StudioPythonInspectionJobStateSchema.parse(expected), changes)
  }
  purge(expected: unknown, now: number) {
    return this.store.purgeExpired(StudioPythonInspectionJobStateSchema.parse(expected), now)
  }
  restart() {
    this.ctx.abort('EXPECTED_LOCAL_JOB_STATE_RESTART')
  }
}

interface Env {
  Probe: DurableObjectNamespace<JobStateProbe>
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const route = url.pathname
    const stub = env.Probe.getByName(url.searchParams.get('probe') ?? 'owned-job-state-proof')
    try {
      const raw = request.method === 'POST' ? await request.json() : {}
      if (route === '/read') return Response.json({ result: await stub.read() })
      if (route === '/claim') return Response.json({ result: await stub.claim(raw) })
      if (!raw || typeof raw !== 'object') return new Response(null, { status: 400 })
      if (route === '/update' && 'expected' in raw && 'changes' in raw)
        return Response.json({ result: await stub.update(raw.expected, raw.changes) })
      if (route === '/purge' && 'expected' in raw && 'now' in raw && typeof raw.now === 'number')
        return Response.json({ result: await stub.purge(raw.expected, raw.now) })
      if (route === '/restart') await stub.restart()
      return new Response(null, { status: 404 })
    } catch {
      return Response.json({ rejected: true }, { status: 409 })
    }
  },
} satisfies ExportedHandler<Env>
