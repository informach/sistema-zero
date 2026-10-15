import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserOpenSchema, browserSnapshotSchema } from '@sistemazero/agent-integrations/browser'
import { z } from 'zod'
import { startBrowserWorker } from '../src/browser/worker'
import { Processes } from '../src/process/manager'
import { ProcessRpc } from '../src/process/rpc'

test('browser transfers explicit files and extracts fields, while Plan blocks script POST and actions', async () => {
  let posts = 0
  const fixture = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (request.method === 'POST') {
        posts++
        return new Response('posted')
      }
      if (new URL(request.url).pathname === '/download')
        return new Response('download fixture', {
          headers: { 'content-disposition': 'attachment; filename="fixture.txt"' },
        })
      return new Response(
        '<!doctype html><title>Transfers</title><h1>Files</h1><input id="file" type="file" onchange="document.querySelector(\'h1\').textContent=this.files[0].name"><a id="download" href="/download">Download</a><script>fetch("/post",{method:"POST"}).catch(()=>{})</script>',
        { headers: { 'content-type': 'text/html' } },
      )
    },
  })
  try {
    for (const mode of ['plan', 'build'] as const) {
      const directory = await mkdtemp(join(tmpdir(), 'zero-transfer-'))
      const worker = await startBrowserWorker(
        new Processes(directory),
        directory,
        AbortSignal.timeout(30000),
      )
      const rpc = new ProcessRpc(worker, true)
      rpc.onRequest = async () => ({ allowed: true })
      try {
        await rpc.request(
          'open',
          browserOpenSchema.parse({ mode, publicWeb: false, localOrigins: [fixture.url.origin] }),
        )
        const snapshot = browserSnapshotSchema.parse(
          await rpc.request('navigate', { url: fixture.url.href }),
        )
        const extracted = z.object({ fields: z.record(z.string(), z.string()) }).parse(
          await rpc.request('extract', {
            fields: [{ name: 'title', target: { by: 'css', value: 'h1' } }],
          }),
        )
        expect(extracted.fields.title).toBe('Files')
        const file = crypto.randomUUID() + '.upload'
        await writeFile(join(directory, file), 'upload fixture')
        let error: unknown
        try {
          await rpc.request('action', {
            action: 'upload',
            file,
            target: { by: 'css', value: '#file' },
            expectedRevision: snapshot.revision,
          })
        } catch (failure) {
          error = failure
        }
        if (mode === 'plan') {
          expect(String(error)).toContain('Plan browser')
          expect(posts).toBe(0)
        } else {
          expect(error).toBeUndefined()
          const next = browserSnapshotSchema.parse(await rpc.request('observe'))
          expect(next.text).toContain(file)
          const result = z.object({ artifact: z.object({ file: z.string() }) }).parse(
            await rpc.request('action', {
              action: 'download',
              target: { by: 'css', value: '#download' },
              expectedRevision: next.revision,
            }),
          )
          expect(await readFile(join(directory, result.artifact.file), 'utf8')).toBe(
            'download fixture',
          )
          expect(posts).toBe(1)
        }
        await rpc.request('close')
      } finally {
        await rpc.close()
      }
    }
  } finally {
    fixture.stop(true)
  }
}, 40000)
