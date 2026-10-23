import { createPythonInputStore } from '../../src/python-inputs'
import { createPythonR2InputStorage } from '../../src/python-r2-inputs'

/** Local workerd fixture only; no code execution, remote bindings or production endpoint. */
export default {
  async fetch(request: Request, env: { INPUTS: R2Bucket }) {
    const store = createPythonInputStore(createPythonR2InputStorage(env.INPUTS))
    const path = new URL(request.url).pathname
    try {
      if (path === '/begin')
        return Response.json(await store.open(await request.json(), request.signal))
      const raw = request.headers.get('x-input')
      if (!raw) throw new Error('Missing input reference')
      const reference: unknown = JSON.parse(raw)
      const hash = /^\/files\/([a-f0-9]{64})$/.exec(path)?.[1]
      if (hash && request.body)
        return Response.json(await store.upload(reference, hash, request.body, request.signal))
      if (path === '/read') {
        const input = await store.resolve(reference, request.signal)
        return new Response(
          await input.read(request.headers.get('x-file') ?? 'main.py', request.signal),
        )
      }
      if (path === '/remove') {
        await store.remove(reference, request.signal)
        return Response.json({ ok: true })
      }
      throw new Error('Unknown fixture route')
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  },
}
