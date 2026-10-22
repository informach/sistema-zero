#!/usr/bin/env -S bun --no-env-file
import './preflight.mjs'
/**
 * Cria (ou reaplica) as contas de QA locais pelos caminhos canônicos, com a pilha DE PÉ:
 *
 *  1. Usuários: `packages/auth/scripts/seed-admin.ts` (UserAggregate + repositório; reaplicar
 *     redefine a senha para a do arquivo de credenciais).
 *  2. Acessos: `POST /members/admin/entitlements` pelo gateway, com o JWT do admin (o mesmo
 *     endpoint do painel "Conceder acesso"), por oferta do catálogo semeado.
 *  3. Perfil Kids: login do responsável com `platform: 'kids'` e `POST /auth/profiles` pelo
 *     gateway (o Auth admite o perfil no Members com MEMBERS_PROFILE_ADMISSION_TOKEN).
 *
 * As senhas são geradas na primeira execução e ficam SÓ em .cache/local-stack/credentials.json.
 *
 *   bun --no-env-file scripts/local-studio-stack/accounts.ts
 */
import { randomBytes, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { join } from 'node:path'
import { CREDENTIALS_FILE, childEnv, ROOT, readSecrets, run, serviceEnv, url } from './lib'

type Account = {
  key: string
  email: string
  role: 'superadmin' | 'admin' | 'staff' | 'customer'
  first: string
  last: string
  /** Ofertas do catálogo concedidas pelo painel (modo `offer`). */
  offers: string[]
  password?: string
  userId?: string
}

const ACCOUNTS: Account[] = [
  {
    key: 'superadmin',
    email: 'qa.superadmin@example.com',
    role: 'superadmin',
    first: 'QA',
    last: 'Superadmin',
    offers: [],
  },
  {
    key: 'admin',
    email: 'qa.admin@example.com',
    role: 'admin',
    first: 'QA',
    last: 'Admin',
    offers: [],
  },
  {
    key: 'staff',
    email: 'qa.staff@example.com',
    role: 'staff',
    first: 'QA',
    last: 'Staff',
    offers: [],
  },
  // Assinatura adulta: combo com todos-os-cursos-adultos + adult-estudio-completo + Pinta/Molda/Pensa/Clube/Mural.
  {
    key: 'adult',
    email: 'qa.adulto@example.com',
    role: 'customer',
    first: 'QA',
    last: 'Adulto',
    offers: ['comunidade-dos-criadores-adulto-anual'],
  },
  // Assinatura kids: combo com todos-os-cursos-kids + estudio-completo + Pensa/Pinta/Clube/Mural.
  {
    key: 'kidsParent',
    email: 'qa.responsavel@example.com',
    role: 'customer',
    first: 'QA',
    last: 'Responsavel',
    offers: ['comunidade-dos-criadores-anual'],
  },
]
const CHILD = { name: 'Crianca QA', birthDate: '2015-05-10' }

const secrets = readSecrets()
let saved: {
  accounts?: Record<string, Account>
  child?: { profileId: string; name: string }
  profiles?: Record<string, { profileId: string; name: string }>
  /** `<conta>:<oferta>` já concedidas (reexecutar não concede de novo). */
  granted?: string[]
} = {}
try {
  saved = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
} catch {
  /* primeira execução */
}
const store = () =>
  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(saved, null, 2)}\n`, { mode: 0o600 })
saved.accounts ??= {}

const GATEWAY = url(3000)
async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = text
  try {
    data = JSON.parse(text)
  } catch {
    /* texto */
  }
  return { status: res.status, data: data as T }
}

type Login = { user?: { id: string; role: string }; tokens?: { accessToken: string } }
async function login(a: Account, platform?: 'kids'): Promise<{ token: string; userId: string }> {
  const r = await api<Login>('POST', '/auth/login', {
    email: a.email,
    password: a.password,
    ...(platform ? { platform } : {}),
  })
  if (r.status !== 200 || !r.data.tokens)
    throw new Error(`login ${a.email}: ${r.status} ${JSON.stringify(r.data)}`)
  return { token: r.data.tokens.accessToken, userId: r.data.user?.id ?? '' }
}

// 1. Usuários (seed canônico do Auth).
const authEnv = childEnv(serviceEnv('auth', secrets))
for (const a of ACCOUNTS) {
  const prev = saved.accounts[a.key]
  a.password = prev?.password ?? `Qa-${randomBytes(12).toString('base64url')}`
  run(
    process.execPath,
    [
      'run',
      'scripts/seed-admin.ts',
      '--email',
      a.email,
      '--password',
      a.password,
      '--role',
      a.role,
      '--first',
      a.first,
      '--last',
      a.last,
    ],
    { cwd: join(ROOT, 'packages', 'auth'), env: authEnv },
  )
  a.userId = (await login(a)).userId
  saved.accounts[a.key] = { ...a }
  store()
}

// 2. Acessos pelo endpoint do painel (JWT do admin).
const admin = await login(ACCOUNTS.find((a) => a.key === 'admin') as Account)
for (const a of ACCOUNTS) {
  for (const offerRef of a.offers) {
    const id = `${a.key}:${offerRef}`
    saved.granted ??= []
    if (saved.granted.includes(id)) {
      console.log(`• acesso ${offerRef} → ${a.email} já concedido`)
      continue
    }
    const r = await api(
      'POST',
      '/members/admin/entitlements',
      { mode: 'offer', userId: a.userId, offerRef },
      admin.token,
    )
    if (r.status >= 300)
      throw new Error(`acesso ${offerRef} → ${a.email}: ${r.status} ${JSON.stringify(r.data)}`)
    saved.granted.push(id)
    store()
    console.log(`✓ acesso ${offerRef} → ${a.email} (${r.status})`)
  }
}

// 3. Perfis Kids: a criança na conta do responsável e um perfil de teste em cada conta da
// equipe (no Kids a equipe também entra num perfil; perfis da equipe não têm teto).
type Profile = { id: string; name: string; admissionState?: string }
saved.profiles ??= {}
const profileOwners = ['kidsParent', 'superadmin', 'admin', 'staff']
// O login tem limite de 20/min por IP no gateway: reaproveita o token (TTL 15 min).
const kidsSessions = new Map<string, string>()
for (const key of profileOwners) {
  const owner = ACCOUNTS.find((a) => a.key === key) as Account
  const name = key === 'kidsParent' ? CHILD.name : `Perfil ${owner.last}`
  const session = await login(owner, 'kids')
  kidsSessions.set(key, session.token)
  const list = await api<{ profiles?: Profile[] }>(
    'GET',
    '/auth/profiles',
    undefined,
    session.token,
  )
  let profile = list.data.profiles?.find((p) => p.name === name)
  if (!profile) {
    const r = await api<{ profile?: Profile }>(
      'POST',
      '/auth/profiles',
      { requestId: randomUUID(), name, birthDate: CHILD.birthDate },
      session.token,
    )
    if (r.status !== 201 || !r.data.profile) {
      throw new Error(`perfil Kids ${key}: ${r.status} ${JSON.stringify(r.data)}`)
    }
    profile = r.data.profile
  }
  saved.profiles[key] = { profileId: profile.id, name }
  if (key === 'kidsParent') saved.child = { profileId: profile.id, name }
  store()
  console.log(`✓ perfil Kids "${name}" (${profile.id}) na conta ${owner.email}`)
}

// A admissão Auth → Members é assíncrona (fila com novas tentativas): espera ficar `ready`.
for (let attempt = 1; ; attempt++) {
  let pending = 0
  for (const key of profileOwners) {
    const token = kidsSessions.get(key) as string
    const list = await api<{ profiles?: Profile[] }>('GET', '/auth/profiles', undefined, token)
    const p = list.data.profiles?.find((x) => x.id === saved.profiles?.[key]?.profileId)
    if (p?.admissionState !== 'ready') pending++
  }
  if (!pending) {
    console.log('✓ perfis Kids admitidos (ready)')
    break
  }
  if (attempt === 40) {
    console.log(
      `⚠ ${pending} perfil(is) ainda pendente(s): a jornada Kids foi publicada? (setup.ts)`,
    )
    break
  }
  await new Promise((r) => setTimeout(r, 3000))
}
console.log(`\nCredenciais locais: ${CREDENTIALS_FILE}`)
