#!/usr/bin/env bun
/**
 * Verificação HTTP da pilha local pelos BFFs (como o navegador faria, com cookies):
 *  - login de cada conta no Admin (3005), Adulto (3007) e Kids (3008);
 *  - Kids: a criança entra pelo acesso de estudo ("este aparelho") criado pelo responsável;
 *  - /estudio: status, qual tela o servidor escolheu e se a criação Python é oferecida;
 *  - /api/studio/free-options: o catálogo de ambientes que o Members devolve;
 *  - runtime Python local: frame.html da release publicada.
 *
 *   bun scripts/local-studio-stack/verify.ts
 */
import fs from 'node:fs'
import { CREDENTIALS_FILE } from './lib'

const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
type Acc = { email: string; password: string; role: string }
const A = creds.accounts as Record<string, Acc>

class Browser {
  jar = new Map<string, string>()
  constructor(readonly origin: string) {}
  async req(
    path: string,
    init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = {
      cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '),
      origin: this.origin,
      'sec-fetch-site': 'same-origin',
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    }
    const res = await fetch(this.origin + path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: 'manual',
      signal: AbortSignal.timeout(300_000),
    })
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      const k = pair.slice(0, i).trim()
      const v = pair.slice(i + 1).trim()
      if (!v || /max-age=0/i.test(c)) this.jar.delete(k)
      else this.jar.set(k, v)
    }
    const text = await res.text()
    return { status: res.status, location: res.headers.get('location'), text }
  }
  json(text: string) {
    try {
      return JSON.parse(text)
    } catch {
      return text.slice(0, 200)
    }
  }
}

// O gateway limita o login a 20/min por IP: espaça as tentativas.
const pace = () => new Promise((r) => setTimeout(r, 3500))
const rows: string[] = []
const log = (s: string) => {
  rows.push(s)
  console.log(s)
}

function studioScreen(html: string): string {
  if (!/showPythonCreation/.test(html)) {
    // Sem editor: qual tela de bloqueio o servidor escolheu.
    const screens: [string, string][] = [
      ['Suas ferramentas vêm das aventuras', 'Kids: sem blocos conquistados nos cursos'],
      ['Continue sua jornada de criação', 'Kids: bloqueado pela jornada'],
      ['abre quando você chega à etapa', 'Adulto: bloqueado pela jornada'],
      ['O caminho começa pelos cursos', 'Adulto: bloqueado pela jornada'],
    ]
    const hit = screens.find(([text]) => html.includes(text))
    return `sem editor (${hit ? hit[1] : 'tela de aviso'})`
  }
  return /\\?"showPythonCreation\\?":true/.test(html) ? 'editor, python=SIM' : 'editor, python=não'
}

async function studio(b: Browser, who: string) {
  const page = await b.req('/estudio')
  const extra =
    page.status === 200 ? studioScreen(page.text) : `→ ${page.location ?? page.text.slice(0, 120)}`
  const opts = await b.req('/api/studio/free-options')
  const o = b.json(opts.text)
  const env =
    typeof o === 'object' && o
      ? `legacyJS=${o.legacyJavaScript} catalogo=${o.catalog ? 'sim' : 'não'} pro=${o.canCreatePro}`
      : String(o)
  const denied = typeof o === 'object' && o?.error ? ` (${o.error.code})` : ''
  log(
    `  ${who}: /estudio ${page.status} ${extra} | free-options ${opts.status}${denied || ` ${env}`}`,
  )
}

// Admin
for (const key of ['superadmin', 'admin', 'staff', 'adult']) {
  const b = new Browser('http://localhost:3005')
  await pace()
  const r = await b.req('/api/admin/login', {
    method: 'POST',
    body: { email: A[key].email, password: A[key].password },
  })
  const home = r.status === 200 ? await b.req('/admin') : null
  log(`admin   ${key.padEnd(10)} login ${r.status} /admin ${home?.status ?? '-'}`)
}

// Adulto
for (const key of ['superadmin', 'admin', 'staff', 'adult']) {
  const b = new Browser('http://localhost:3007')
  await pace()
  const r = await b.req('/api/auth/login', {
    method: 'POST',
    body: { email: A[key].email, password: A[key].password },
  })
  log(`adulto  ${key.padEnd(10)} login ${r.status}`)
  if (r.status === 200) await studio(b, key)
}

// Kids: o adulto entra com e-mail/senha (cai na área dos pais) e depois entra no perfil
// pelo acesso de estudo "este aparelho" — o mesmo caminho da tela de perfis.
for (const key of ['superadmin', 'admin', 'staff', 'kidsParent']) {
  const b = new Browser('http://localhost:3008')
  await b.req('/api/study/prepare', { method: 'POST', body: {} })
  await pace()
  const r = await b.req('/api/auth/login', {
    method: 'POST',
    body: { email: A[key].email, password: A[key].password },
  })
  const adult = r.status === 200 ? await b.req('/estudio') : null
  log(
    `kids    ${key.padEnd(10)} login ${r.status} /estudio(conta) ${adult?.status ?? '-'} → ${adult?.location ?? ''}`,
  )
  const profile = creds.profiles?.[key]
  if (r.status !== 200 || !profile) continue
  const sid = b.json((await b.req('/api/study/session')).text)?.sessionId
  const grant = await b.req('/api/study/grants', {
    method: 'POST',
    headers: { 'x-sz-session': sid ?? '' },
    body: {
      profileId: profile.profileId,
      label: 'Aparelho QA local',
      durationDays: 30,
      mode: 'current',
    },
  })
  const enter = await b.req('/api/study/enter', {
    method: 'POST',
    body: { profileId: profile.profileId },
  })
  log(
    `kids    ${key.padEnd(10)} perfil "${profile.name}" acesso ${grant.status} entrar ${enter.status}${enter.status === 200 ? '' : ` ${enter.text.slice(0, 160)}`}`,
  )
  if (enter.status === 200) await studio(b, `${key}/perfil`)
}

const m = '7026b09b04a1222cfbc594d5ab3ec9de8649eece71c613c823a2c33d8c43ce5f'
const frame = await fetch(`http://127.0.0.1:8791/v1/runtimes/${m}/frame.html`).catch(() => null)
log(`runtime python local frame.html ${frame?.status ?? 'offline'}`)
