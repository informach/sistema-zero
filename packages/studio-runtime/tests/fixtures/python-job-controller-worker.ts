import {
  StudioPythonInspectionJobStateSchema,
  verifyStudioPythonInspectionJobState,
} from '@sistemazero/core/studio/python-inspection-job'
import { PythonInspectionJob } from '../../src/python-inspection-job'
import { createPythonJobStateStore } from '../../src/python-job-state'

/** Local controller qualification without a configured runtime or any SDK container. */
export class JobControllerProbe extends PythonInspectionJob {
  read(): string | undefined {
    const state = createPythonJobStateStore(this.ctx.storage.sql).read()
    return state ? JSON.stringify(state) : undefined
  }
  restart() {
    this.ctx.abort('EXPECTED_LOCAL_PYTHON_CONTROLLER_RESTART')
  }
  runAlarm() {
    return this.alarm()
  }
  async seedPreview(raw: unknown) {
    return createPythonJobStateStore(this.ctx.storage.sql).claim(
      await verifyStudioPythonInspectionJobState(raw),
    )
  }
  purgePreview(expected: unknown, now: number) {
    return createPythonJobStateStore(this.ctx.storage.sql).purgeExpired(
      StudioPythonInspectionJobStateSchema.parse(expected),
      now,
    )
  }
}

interface Env {
  Probe: DurableObjectNamespace<JobControllerProbe>
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const stub = env.Probe.getByName(url.searchParams.get('probe') ?? 'default')
    try {
      if (url.pathname === '/read') {
        const serialized = await stub.read()
        return Response.json({
          result: serialized === undefined ? undefined : JSON.parse(serialized),
        })
      }
      if (url.pathname === '/alarm') {
        await stub.runAlarm()
        return Response.json({ result: true })
      }
      if (url.pathname === '/restart') await stub.restart()
      const raw: unknown = await request.json()
      if (url.pathname === '/seed-preview')
        return Response.json({ result: await stub.seedPreview(raw) })
      if (url.pathname === '/preview-available')
        return Response.json({ result: await stub.previewAvailable(raw) })
      if (url.pathname === '/discard-preview')
        return Response.json({ result: await stub.discardPreview(raw) })
      if (
        url.pathname === '/purge-preview' &&
        raw &&
        typeof raw === 'object' &&
        'expected' in raw &&
        'now' in raw &&
        typeof raw.now === 'number'
      )
        return Response.json({ result: await stub.purgePreview(raw.expected, raw.now) })
      if (url.pathname === '/inspect') {
        const result = await stub.inspect(raw)
        return new Response(result.bodyJson, {
          status: result.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.pathname === '/cancel') return Response.json({ result: await stub.cancel(raw) })
      return new Response(null, { status: 404 })
    } catch {
      return Response.json({ rejected: true }, { status: 409 })
    }
  },
} satisfies ExportedHandler<Env>
