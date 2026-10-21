#!/usr/bin/env bun
/**
 * Currículo mínimo local para os CLIENTES chegarem ao Estúdio livre pela política real.
 * Tudo pelas rotas do Admin (gateway, JWT do admin) e do aluno — nenhuma linha à mão:
 *
 *  Adulto: curso `qa-local-primeiros-passos-adulto` (adult, primeiros-passos, 2d, gravado),
 *  uma aula de texto, `studioUnlockBlocks` = blocos `iniciante-2d` do catálogo do Studio.
 *  A jornada adulta vem do seed canônico (`seed-adult-journey.ts --once`): a etapa 1 (aprendiz)
 *  pede concluir o curso e dá `studio` + `pinta`. O cliente conclui a aula.
 *
 *  Kids: curso `qa-local-primeiros-passos-kids` (kids, primeiros-passos, 2d, slot 1,
 *  positioned) com uma aula que tem um bloco Estúdio com vitrine (Mural). A política Kids v1
 *  pede, para o nível coder (studio + pinta), CONCLUIR e PUBLICAR NO MURAL o curso do slot 1.
 *  O script conclui a aula como a criança; a publicação no Mural é feita no navegador
 *  (browser-check.mjs kids-mural), pelo mesmo botão do produto.
 *
 *   bun scripts/local-studio-stack/curriculum.ts [author|progress|all]
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { join } from 'node:path'
import { CREDENTIALS_FILE, ROOT, run, url } from './lib'

const GATEWAY = url(3000)
const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
const step = process.argv[2] ?? 'all'

type Json = Record<string, unknown>
async function api<T = Json>(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(GATEWAY + path, {
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
async function must<T = Json>(method: string, path: string, token?: string, body?: unknown) {
  const r = await api<T>(method, path, token, body)
  if (r.status >= 300) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(r.data)}`)
  return r.data
}
async function login(key: string, platform?: 'kids') {
  const a = creds.accounts[key]
  const r = await must<{ tokens: { accessToken: string } }>('POST', '/auth/login', undefined, {
    email: a.email,
    password: a.password,
    ...(platform ? { platform } : {}),
  })
  return r.tokens.accessToken
}

async function unlockBlocks(): Promise<string[]> {
  const { SERVER_BLOCK_CATALOG } = await import(
    join(ROOT, 'packages/studio/src/blockly/blockCatalog.ts')
  )
  return (SERVER_BLOCK_CATALOG as { type: string; level: string }[])
    .filter((entry) => entry.level === 'iniciante-2d')
    .map((entry) => entry.type)
}

type CourseSpec = {
  slug: string
  title: string
  audience: 'adult' | 'kids'
  careerSlot: number | null
  journeyRole: 'positioned' | 'reward' | 'extra'
  studio: boolean
}

async function findCourse(token: string, slug: string) {
  const list = await must<{ items?: { id: string; slug: string; status: string }[] }>(
    'GET',
    `/members/admin/courses?q=${encodeURIComponent(slug)}`,
    token,
  )
  return list.items?.find((c) => c.slug === slug)
}

/**
 * Projeto inicial do bloco Estúdio: o projeto clássico vazio do próprio Studio
 * (`createEmptyProject`), o mesmo que o editor cria em "+ Novo projeto". O player Kids só
 * desenha o bloco com o `Project` completo (id, datas, modo, ir, blocksState...).
 */
async function initialProject() {
  const { createEmptyProject } = await import(join(ROOT, 'packages/studio/src/core/project.ts'))
  return createEmptyProject('5a1c0de0-0000-4000-8000-000000000001', 'Meu primeiro jogo')
}

async function authorCourse(token: string, spec: CourseSpec, blocks: string[]) {
  const existing = await findCourse(token, spec.slug)
  const courseBody = {
    slug: spec.slug,
    title: spec.title,
    status: 'draft',
    audience: spec.audience,
    level: 'primeiros-passos',
    track: '2d',
    modality: 'recorded',
    careerSlot: spec.careerSlot,
    journeyRole: spec.journeyRole,
    studioUnlockBlocks: blocks,
  }
  const course =
    existing ?? (await must<{ id: string }>('POST', '/members/admin/courses', token, courseBody))
  const detail = await must<Json>('GET', `/members/admin/courses/${course.id}`, token)
  const modules = (detail.modules as { id: string; lessons?: { id: string }[] }[] | undefined) ?? []
  const moduleId =
    modules[0]?.id ??
    (
      await must<{ id: string }>('POST', `/members/admin/courses/${course.id}/modules`, token, {
        title: 'Primeiros passos',
      })
    ).id
  const lessonId =
    modules[0]?.lessons?.[0]?.id ??
    (
      await must<{ id: string }>('POST', `/members/admin/modules/${moduleId}/lessons`, token, {
        slug: `${spec.slug}-aula-1`,
        title: 'Aula 1',
      })
    ).id

  // Rascunho da aula: uma seção com texto (e o bloco Estúdio com vitrine no Kids).
  let draft = await must<{ revision: string; document: { sections?: { id: string }[] } }>(
    'GET',
    `/members/admin/lessons/${lessonId}/draft`,
    token,
  )
  const patch = async (change: unknown) => {
    const r = await must<{ revision: string }>(
      'PATCH',
      `/members/admin/lessons/${lessonId}/draft`,
      token,
      {
        expectedRevision: draft.revision,
        operationId: randomUUID(),
        change,
      },
    )
    draft = { ...draft, revision: r.revision }
  }
  let sectionId = draft.document.sections?.[0]?.id
  if (!sectionId) {
    sectionId = randomUUID()
    await patch({
      type: 'structure',
      sections: [
        {
          id: sectionId,
          title: 'Começando',
          objective: '',
          intent: 'presentation',
          blockIds: [],
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
        },
      ],
    })
  }
  // Blocos com id estável por papel: reexecutar ATUALIZA o conteúdo em vez de duplicar.
  const blocksNow =
    (draft.document as { blocks?: { id: string; content?: { kind?: string } }[] }).blocks ?? []
  const idOf = (kind: string) => blocksNow.find((b) => b.content?.kind === kind)?.id ?? randomUUID()
  const desired: Json[] = [
    { kind: 'rich_text', markdown: 'Bem-vindo! Nesta aula você cria o seu primeiro projeto.' },
  ]
  if (spec.studio)
    desired.push({
      kind: 'studio',
      purpose: 'submission',
      level: 'iniciante',
      initialProject: await initialProject(),
      allowedModes: ['blocks', 'bridge'],
      showcase: { enabled: true, title: 'Meu primeiro jogo', summary: 'Projeto da aula 1' },
    })
  for (const content of desired) {
    const id = idOf(String(content.kind))
    const current = blocksNow.find((b) => b.id === id)
    if (current && JSON.stringify(current.content) === JSON.stringify(content)) continue
    await patch({ type: 'block', sectionId, block: { id, content } })
  }
  if (existing?.status === 'published' && !(await draftDiffers(token, lessonId))) {
    console.log(`• curso ${spec.slug} já publicado e em dia (${existing.id})`)
    return existing.id
  }
  await must('POST', `/members/admin/lessons/${lessonId}/draft/publish`, token, {
    expectedRevision: draft.revision,
    operationId: randomUUID(),
    readyVideoIds: [],
  })
  const fresh = await must<{ version: number }>('GET', `/members/admin/courses/${course.id}`, token)
  await must('PATCH', `/members/admin/courses/${course.id}`, token, {
    ...courseBody,
    status: 'published',
    version: fresh.version,
  })
  console.log(`✓ curso ${spec.slug} publicado (${course.id}), aula ${lessonId}`)
  return course.id
}

/** O rascunho difere do publicado? (o editor do Admin usa a mesma rota para "alterações"). */
async function draftDiffers(token: string, lessonId: string) {
  const [draft, published] = await Promise.all([
    must<{ document: unknown }>('GET', `/members/admin/lessons/${lessonId}/draft`, token),
    api<{ document?: unknown }>('GET', `/members/admin/lessons/${lessonId}/draft/published`, token),
  ])
  if (published.status !== 200) return true
  const blocks = (doc: unknown) => JSON.stringify((doc as { blocks?: unknown }).blocks ?? null)
  return blocks(draft.document) !== blocks(published.data.document)
}

const ADULT: CourseSpec = {
  slug: 'qa-local-primeiros-passos-adulto',
  title: 'QA local: primeiros passos (adulto)',
  audience: 'adult',
  // Adulto não usa posição de jornada: as etapas vêm do nível/eixo (seed da jornada adulta).
  careerSlot: null,
  journeyRole: 'reward',
  studio: false,
}
const KIDS: CourseSpec = {
  slug: 'qa-local-primeiros-passos-kids',
  title: 'QA local: primeiros passos (kids)',
  audience: 'kids',
  careerSlot: 1,
  journeyRole: 'positioned',
  studio: true,
}

if (step === 'author' || step === 'all') {
  const admin = await login('admin')
  const blocks = await unlockBlocks()
  await authorCourse(admin, ADULT, blocks)
  await authorCourse(admin, KIDS, blocks)
  // Jornada adulta pelo seed canônico (o mesmo caminho do boot do Members).
  run(process.execPath, [
    join(import.meta.dir, 'members-script.ts'),
    'seed-adult-journey.ts',
    '--once',
  ])
}

async function lessonsOf(token: string, slug: string) {
  const course = await must<Json>('GET', `/members/courses/${slug}`, token)
  return (
    JSON.stringify(course)
      .match(/"id":"[0-9a-f-]{36}","slug":"[^"]*-aula-\d+"/g)
      ?.map((m) => m.slice(6, 42)) ?? []
  )
}

if (step === 'progress' || step === 'all') {
  const adult = await login('adult')
  for (const lessonId of await lessonsOf(adult, ADULT.slug)) {
    const r = await api('POST', `/members/lessons/${lessonId}/complete`, adult)
    console.log(`${r.status < 300 ? '✓' : '✗'} adulto concluiu a aula ${lessonId} (${r.status})`)
  }
  const journey = await api<Json>('GET', '/members/journey/adult', adult)
  console.log(`  jornada adulta: ${JSON.stringify(journey.data).slice(0, 300)}`)
}
