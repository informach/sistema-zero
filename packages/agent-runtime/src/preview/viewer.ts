import { randomBytes, timingSafeEqual } from 'node:crypto'
import { type ArtifactRef, artifactSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'

function authorized(request: Request, token: string) {
  const supplied = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${token}`
  return (
    Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
}
// Separate origins: the control document never serves generated artifact HTML or files.
export function createViewer(
  read: (ref: ArtifactRef) => Promise<Uint8Array>,
  references: ArtifactRef[],
  lifetimeMs = 600000,
) {
  if (references.length < 1 || references.length > 20)
    throw new Error('Viewer accepts 1–20 explicit artifacts')
  const refs = references.map((ref) => artifactSchema.parse(ref))
  const token = randomBytes(32).toString('base64url')
  let controlOrigin = ''
  const content = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    idleTimeout: 15,
    maxRequestBodySize: 1024,
    async fetch(request) {
      const origin = request.headers.get('origin')
      const headers = new Headers({
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
      })
      if (origin === controlOrigin) {
        headers.set('access-control-allow-origin', controlOrigin)
        headers.set('vary', 'Origin')
      } else if (origin) return new Response('Forbidden origin', { status: 403 })
      if (request.method === 'OPTIONS' && origin === controlOrigin) {
        headers.set('access-control-allow-methods', 'GET')
        headers.set('access-control-allow-headers', 'Authorization')
        return new Response(null, { status: 204, headers })
      }
      if (!authorized(request, token)) return new Response('Unauthorized', { status: 401, headers })
      if (request.method !== 'GET')
        return new Response('Method not allowed', { status: 405, headers })
      const url = new URL(request.url)
      if (url.pathname === '/manifest') {
        headers.set('content-type', 'application/json')
        return new Response(JSON.stringify(refs.map((ref, index) => ({ index, ...ref }))), {
          headers,
        })
      }
      const match = /^\/artifact\/(\d{1,2})$/.exec(url.pathname)
      const ref = match ? refs[Number(match[1])] : undefined
      if (!ref) return new Response('Not found', { status: 404, headers })
      try {
        const data = await read(ref)
        headers.set(
          'content-type',
          ['image/png', 'image/jpeg', 'application/json', 'text/plain'].includes(ref.mediaType)
            ? ref.mediaType
            : 'application/octet-stream',
        )
        headers.set('content-disposition', `inline; filename="artifact-${ref.id}"`)
        return new Response(Buffer.from(data), { headers })
      } catch {
        return new Response('Artifact unavailable or integrity check failed', {
          status: 409,
          headers,
        })
      }
    },
  })
  const nonce = randomBytes(24).toString('base64url')
  const script = [
    "const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);",
    `const base=${JSON.stringify(content.url.origin)};`,
    "const headers={Authorization:'Bearer '+token};",
    "async function start(){const response=await fetch(base+'/manifest',{headers});if(!response.ok)throw Error('Viewer expired or access denied');const refs=await response.json();",
    "for(const ref of refs){const row=document.createElement('section');const title=document.createElement('h2');title.textContent=ref.mediaType+' · '+ref.bytes+' bytes';row.append(title);document.body.append(row);",
    "const button=document.createElement('button');button.textContent='Abrir artefato';row.append(button);button.onclick=async()=>{button.disabled=true;try{const response=await fetch(base+'/artifact/'+ref.index,{headers});if(!response.ok)throw Error('Artifact unavailable');",
    "if(ref.mediaType==='image/png'||ref.mediaType==='image/jpeg'){const image=document.createElement('img');const url=URL.createObjectURL(await response.blob());image.onload=()=>URL.revokeObjectURL(url);image.src=url;row.append(image)}",
    "else if(ref.mediaType==='application/json'||ref.mediaType==='text/plain'){const pre=document.createElement('pre');pre.textContent=await response.text();row.append(pre)}",
    "else {const link=document.createElement('a');const url=URL.createObjectURL(await response.blob());link.href=url;link.download='artifact-'+ref.id;link.textContent='Salvar arquivo';row.append(link);setTimeout(()=>URL.revokeObjectURL(url),60000)}",
    "}catch(error){button.disabled=false;button.textContent=String(error)}}}}start().catch(error=>document.querySelector('#status').textContent=String(error));",
  ].join('\n')
  const control = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: 1024,
    fetch(request) {
      if (request.method !== 'GET' || new URL(request.url).pathname !== '/')
        return new Response('Not found', { status: 404 })
      return new Response(
        '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sistema Zero · Evidências</title><style nonce="' +
          nonce +
          '">body{background:#10151d;color:#e7eaf0;font:16px system-ui;margin:2rem;max-width:1100px}section{border-top:1px solid #394557;padding:1rem 0}img{max-width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere}button,a{color:#96dac9}button{background:#253344;padding:.7rem;border:1px solid #526079;cursor:pointer}</style><h1>Evidências locais</h1><p id="status">Acesso temporário aos artefatos selecionados.</p><script nonce="' +
          nonce +
          '">' +
          script +
          '</script></html>',
        {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'referrer-policy': 'no-referrer',
            'x-frame-options': 'DENY',
            'content-security-policy':
              "default-src 'none'; script-src 'nonce-" +
              nonce +
              "'; style-src 'nonce-" +
              nonce +
              "'; connect-src " +
              content.url.origin +
              "; img-src blob:; base-uri 'none'; frame-ancestors 'none'",
          },
        },
      )
    },
  })
  controlOrigin = control.url.origin
  const timer = setTimeout(close, lifetimeMs)
  function close() {
    clearTimeout(timer)
    control.stop(true)
    content.stop(true)
  }
  return { url: `${control.url.href}#${token}`, contentOrigin: content.url.origin, close }
}
export function setupViewer(supervisor: Supervisor) {
  const artifacts = new Artifacts(supervisor.directory)
  let current: ReturnType<typeof createViewer> | undefined
  supervisor.commands.set('viewer.open', async (raw) => {
    const { artifacts: refs } = z
      .object({ artifacts: z.array(artifactSchema).min(1).max(20) })
      .parse(raw)
    // Token is returned only to the authenticated local client, never to agent tools/events.
    current?.close()
    current = createViewer((reference) => artifacts.read(reference), refs)
    return { url: current.url, expiresAt: new Date(Date.now() + 600000).toISOString() }
  })
  supervisor.cleanup.add(() => current?.close())
}
