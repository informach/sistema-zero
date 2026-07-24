import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const adminHeaders = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

const COURSE = {
  slug: 'curso-novo',
  title: 'Curso Novo',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  status: 'draft',
}

async function createCourse(app: App, over: Record<string, unknown> = {}) {
  const res = await send(app, '/members/admin/courses', 'POST', { ...COURSE, ...over })
  return readJson(res)
}

/** Simula o editor: lê a versão atual e a ecoa no PATCH. */
async function patchCourse(app: App, id: string, body: Record<string, unknown>) {
  const current = await readJson(await get(app, `/members/admin/courses/${id}`))
  return send(app, `/members/admin/courses/${id}`, 'PATCH', { ...body, version: current.version })
}

describe('Members HTTP — autoria: cursos', () => {
  test('ciclo de vida: criar → listar → árvore → editar → excluir', async () => {
    const { app } = buildApp()
    const created = await createCourse(app)
    expect(created.id).toBeTruthy()
    expect(created.status).toBe('draft')

    const list = await readJson(await get(app, '/members/admin/courses'))
    expect(list.total).toBe(1)
    expect(list.items[0].slug).toBe('curso-novo')

    const tree = await readJson(await get(app, `/members/admin/courses/${created.id}`))
    expect(tree.modules).toEqual([])

    const patched = await patchCourse(app, created.id, {
      ...COURSE,
      title: 'Curso Editado',
    })
    expect(patched.status).toBe(200)
    expect((await readJson(patched)).title).toBe('Curso Editado')

    expect((await send(app, `/members/admin/courses/${created.id}`, 'DELETE')).status).toBe(200)
    expect((await get(app, `/members/admin/courses/${created.id}`)).status).toBe(404)
  })

  test('PATCH exige a versão lida e rejeita uma edição concorrente obsoleta', async () => {
    const { app } = buildApp()
    const created = await createCourse(app)

    const first = await send(app, `/members/admin/courses/${created.id}`, 'PATCH', {
      ...COURSE,
      title: 'Edição atual',
      version: created.version,
    })
    expect(first.status).toBe(200)

    const stale = await send(app, `/members/admin/courses/${created.id}`, 'PATCH', {
      ...COURSE,
      title: 'Edição obsoleta',
      version: created.version,
    })
    expect(stale.status).toBe(409)

    const course = await readJson(await get(app, `/members/admin/courses/${created.id}`))
    expect(course.title).toBe('Edição atual')
  })

  test('salesPageUrl: cria, devolve na view, troca e limpa (metadata.salesPageUrl)', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, {
      salesPageUrl: 'https://funil.example.com/oferta',
    })
    expect(created.salesPageUrl).toBe('https://funil.example.com/oferta')

    // PATCH troca a URL (form manda o estado completo).
    const patched = await patchCourse(app, created.id, {
      ...COURSE,
      salesPageUrl: 'https://funil.example.com/black-friday',
    })
    expect((await readJson(patched)).salesPageUrl).toBe('https://funil.example.com/black-friday')

    // E o catálogo do ALUNO enxerga a URL (precisa publicar: curso sem aula não
    // publica — então valida via GET admin mesmo).
    const fetched = await readJson(await get(app, `/members/admin/courses/${created.id}`))
    expect(fetched.salesPageUrl).toBe('https://funil.example.com/black-friday')

    // PATCH com null limpa (metadata volta a null — chave removida).
    const cleared = await patchCourse(app, created.id, {
      ...COURSE,
      salesPageUrl: null,
    })
    expect((await readJson(cleared)).salesPageUrl).toBeNull()
  })

  test('audience: cria default adult; explícito kids; PATCH ausente PRESERVA; troca explícita', async () => {
    const { app } = buildApp()
    // Sem o campo → adult (default da plataforma principal).
    const created = await createCourse(app)
    expect(created.audience).toBe('adult')

    // Explícito kids no create.
    const kids = await createCourse(app, { slug: 'curso-kids', audience: 'kids' })
    expect(kids.audience).toBe('kids')

    // PATCH SEM o campo preserva (build antigo do admin não rebaixa kids → adult).
    const preserved = await patchCourse(app, kids.id, {
      ...COURSE,
      slug: 'curso-kids',
      title: 'Curso Kids Editado',
    })
    expect((await readJson(preserved)).audience).toBe('kids')

    // PATCH explícito troca.
    const switched = await patchCourse(app, kids.id, {
      ...COURSE,
      slug: 'curso-kids',
      audience: 'adult',
    })
    expect((await readJson(switched)).audience).toBe('adult')
  })

  test('audience inválida → 400; filtro ?audience= na listagem admin', async () => {
    const { app } = buildApp()
    const bad = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      audience: 'teen',
    })
    expect(bad.status).toBe(400)

    await createCourse(app)
    await createCourse(app, { slug: 'curso-kids', audience: 'kids' })
    const onlyKids = await readJson(await get(app, '/members/admin/courses?audience=kids'))
    expect(onlyKids.total).toBe(1)
    expect(onlyKids.items[0].slug).toBe('curso-kids')
  })

  test('listagem marca hasShowcaseBlock SÓ no curso-base kids (aviso "sem vitrine")', async () => {
    const { app } = buildApp()
    const base = await createCourse(app, { slug: 'base-2d', audience: 'kids', careerSlot: 1 })
    await createCourse(app, { slug: 'bonus-kids', audience: 'kids' })

    type Item = { slug: string; hasShowcaseBlock?: boolean }
    const listBySlug = async () => {
      const list = await readJson(await get(app, '/members/admin/courses?audience=kids'))
      return new Map((list.items as Item[]).map((c) => [c.slug, c]))
    }

    // Curso-base sem bloco de vitrine → false (alimenta o aviso); bônus → sem o campo.
    let bySlug = await listBySlug()
    expect(bySlug.get('base-2d')?.hasShowcaseBlock).toBe(false)
    expect(bySlug.get('bonus-kids')).not.toHaveProperty('hasShowcaseBlock')

    // Módulo + aula PUBLICADA + bloco de Estúdio com `showcase.enabled` → true.
    const mod = await readJson(
      await send(app, `/members/admin/courses/${base.id}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const lesson = await readJson(
      await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
        slug: 'aula-final',
        title: 'Aula final',
        estimatedMinutes: null,
        isPublished: true,
      }),
    )
    const block = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'studio',
        initialProject: { name: 'Jogo', files: { 'index.html': '' } },
        showcase: { enabled: true, title: 'Meu jogo' },
      },
    })
    expect(block.status).toBe(201)

    bySlug = await listBySlug()
    expect(bySlug.get('base-2d')?.hasShowcaseBlock).toBe(true)
  })

  test('careerSlot: só Kids, respeita o teto da etapa, preserva e pode ser removido', async () => {
    const { app } = buildApp()

    const adult = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      careerSlot: 1,
    })
    expect(adult.status).toBe(400)

    const created = await createCourse(app, {
      slug: 'base-kids',
      audience: 'kids',
      level: 'iniciante',
      track: '2d',
      careerSlot: 1,
    })
    expect(created.careerSlot).toBe(1)

    const preserved = await patchCourse(app, created.id, {
      ...COURSE,
      slug: 'base-kids',
      audience: 'kids',
      level: 'iniciante',
      track: '2d',
    })
    expect((await readJson(preserved)).careerSlot).toBe(1)

    const invalidSix = await patchCourse(app, created.id, {
      ...COURSE,
      slug: 'base-kids',
      audience: 'kids',
      level: 'intermediario',
      track: '2d',
      careerSlot: 6,
    })
    expect(invalidSix.status).toBe(400)

    const removed = await patchCourse(app, created.id, {
      ...COURSE,
      slug: 'base-kids',
      audience: 'kids',
      careerSlot: null,
    })
    expect((await readJson(removed)).careerSlot).toBeNull()
  })

  test('careerSlot duplicado na mesma etapa → 409 amigável', async () => {
    const { app } = buildApp()
    await createCourse(app, { slug: 'base-a', audience: 'kids', careerSlot: 1 })
    const conflict = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      slug: 'base-b',
      audience: 'kids',
      careerSlot: 1,
    })
    expect(conflict.status).toBe(409)
    expect((await readJson(conflict)).error.code).toBe('CAREER_SLOT_CONFLICT')
  })
})

describe('Members HTTP — autoria: vitrine do curso-base (NO_SHOWCASE_BLOCK, 24/07)', () => {
  /** Módulo + aula (publicada ou rascunho) + opcionalmente o bloco de Estúdio de vitrine. */
  async function addLesson(
    app: App,
    courseId: string,
    opts: { isPublished: boolean; showcase: boolean },
  ): Promise<{ lessonId: string; blockId: string | null }> {
    const mod = await readJson(
      await send(app, `/members/admin/courses/${courseId}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const lesson = await readJson(
      await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
        slug: `aula-${opts.isPublished ? 'pub' : 'draft'}-${opts.showcase ? 'vitrine' : 'comum'}`,
        title: 'Aula',
        estimatedMinutes: null,
        isPublished: opts.isPublished,
      }),
    )
    let blockId: string | null = null
    if (opts.showcase) {
      const block = await readJson(
        await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
          content: {
            kind: 'studio',
            initialProject: { name: 'Jogo', files: { 'index.html': '' } },
            showcase: { enabled: true, title: 'Meu jogo' },
          },
        }),
      )
      blockId = block.id
    }
    return { lessonId: lesson.id, blockId }
  }

  test('publicar curso-base kids SEM vitrine → 409 NO_SHOWCASE_BLOCK', async () => {
    const { app } = buildApp()
    const base = await createCourse(app, {
      slug: 'base-sem-vitrine',
      audience: 'kids',
      careerSlot: 1,
    })
    await addLesson(app, base.id, { isPublished: true, showcase: false })
    const res = await patchCourse(app, base.id, {
      ...COURSE,
      slug: 'base-sem-vitrine',
      audience: 'kids',
      careerSlot: 1,
      status: 'published',
    })
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('NO_SHOWCASE_BLOCK')
  })

  test('com bloco de vitrine em aula publicada → publica 200', async () => {
    const { app } = buildApp()
    const base = await createCourse(app, { slug: 'base-ok', audience: 'kids', careerSlot: 1 })
    await addLesson(app, base.id, { isPublished: true, showcase: true })
    const res = await patchCourse(app, base.id, {
      ...COURSE,
      slug: 'base-ok',
      audience: 'kids',
      careerSlot: 1,
      status: 'published',
    })
    expect(res.status).toBe(200)
    expect((await readJson(res)).status).toBe('published')
  })

  test('vitrine SÓ em aula rascunho não conta → 409', async () => {
    const { app } = buildApp()
    const base = await createCourse(app, { slug: 'base-draft', audience: 'kids', careerSlot: 1 })
    await addLesson(app, base.id, { isPublished: true, showcase: false }) // satisfaz NO_PUBLISHED_LESSON
    await addLesson(app, base.id, { isPublished: false, showcase: true }) // vitrine escondida
    const res = await patchCourse(app, base.id, {
      ...COURSE,
      slug: 'base-draft',
      audience: 'kids',
      careerSlot: 1,
      status: 'published',
    })
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('NO_SHOWCASE_BLOCK')
  })

  test('fail-open: adult, kids sem slot e kids slot 2 publicam sem vitrine', async () => {
    const { app } = buildApp()
    for (const [slug, over] of [
      ['adulto', {}],
      ['kids-bonus', { audience: 'kids' }],
      ['kids-slot2', { audience: 'kids', careerSlot: 2 }],
    ] as const) {
      const course = await createCourse(app, { slug, ...over })
      await addLesson(app, course.id, { isPublished: true, showcase: false })
      const res = await patchCourse(app, course.id, {
        ...COURSE,
        slug,
        ...over,
        status: 'published',
      })
      expect(res.status).toBe(200)
    }
  })

  test('dar slot 1 a curso kids JÁ publicado sem vitrine → 409 (2º caminho da armadilha)', async () => {
    const { app } = buildApp()
    const course = await createCourse(app, { slug: 'kids-vira-base', audience: 'kids' })
    await addLesson(app, course.id, { isPublished: true, showcase: false })
    expect(
      (
        await patchCourse(app, course.id, {
          ...COURSE,
          slug: 'kids-vira-base',
          audience: 'kids',
          status: 'published',
        })
      ).status,
    ).toBe(200)
    const res = await patchCourse(app, course.id, {
      ...COURSE,
      slug: 'kids-vira-base',
      audience: 'kids',
      careerSlot: 1,
      status: 'published',
    })
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('NO_SHOWCASE_BLOCK')
  })

  test('curso JÁ preso segue editável (guard é só na TRANSIÇÃO)', async () => {
    const { app } = buildApp()
    // Entra no estado-armadilha por um caminho legal: publica COM vitrine e depois
    // remove o bloco (o caminho inverso é desguardado DE PROPÓSITO — follow-up doc).
    const base = await createCourse(app, { slug: 'base-presa', audience: 'kids', careerSlot: 1 })
    const { blockId } = await addLesson(app, base.id, { isPublished: true, showcase: true })
    expect(
      (
        await patchCourse(app, base.id, {
          ...COURSE,
          slug: 'base-presa',
          audience: 'kids',
          careerSlot: 1,
          status: 'published',
        })
      ).status,
    ).toBe(200)
    expect((await send(app, `/members/admin/blocks/${blockId}`, 'DELETE')).status).toBe(200)
    // Preso — mas um PATCH de título que MANTÉM published+slot1 não é transição → 200.
    const res = await patchCourse(app, base.id, {
      ...COURSE,
      slug: 'base-presa',
      audience: 'kids',
      careerSlot: 1,
      status: 'published',
      title: 'Título corrigido',
    })
    expect(res.status).toBe(200)
    expect((await readJson(res)).title).toBe('Título corrigido')
  })
})

describe('Members HTTP — autoria: cursos (validações de borda)', () => {
  test('slug de curso duplicado → 409 DUPLICATE_SLUG', async () => {
    const { app } = buildApp()
    await createCourse(app)
    const dup = await send(app, '/members/admin/courses', 'POST', COURSE)
    expect(dup.status).toBe(409)
    expect((await readJson(dup)).error.code).toBe('DUPLICATE_SLUG')
  })

  test('slug inválido (maiúsculas/espaços) → 400', async () => {
    const { app } = buildApp()
    const bad = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      slug: 'Slug Inválido',
    })
    expect(bad.status).toBe(400)
  })
})

describe('Members HTTP — autoria: árvore de conteúdo', () => {
  async function seedTree(app: App) {
    const course = await createCourse(app)
    const mod = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const lesson = await readJson(
      await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
        slug: 'aula-1',
        title: 'Aula 1',
        estimatedMinutes: 5,
      }),
    )
    return { course, mod, lesson }
  }

  test('curso → módulo → aula → blocos; árvore e conteúdo refletem', async () => {
    const { app } = buildApp()
    const { course, lesson } = await seedTree(app)

    const b1 = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'rich_text', markdown: '# Olá' },
    })
    expect(b1.status).toBe(201)
    await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'video', provider: 'youtube', src: 'https://y/1' },
    })

    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules).toHaveLength(1)
    expect(tree.modules[0].lessons).toHaveLength(1)

    const content = await readJson(await get(app, `/members/admin/lessons/${lesson.id}/content`))
    expect(content.blocks.map((b: { kind: string }) => b.kind)).toEqual(['rich_text', 'video'])
  })

  test('slug de aula duplicado no mesmo curso → 409', async () => {
    const { app } = buildApp()
    const { mod } = await seedTree(app)
    const dup = await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
      slug: 'aula-1',
      title: 'Outra',
      estimatedMinutes: null,
    })
    expect(dup.status).toBe(409)
  })

  test('bloco de vídeo sem src → 400 (validação da união)', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)
    const bad = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'video', provider: 'youtube' },
    })
    expect(bad.status).toBe(400)
  })

  test('bloco Pro exige modelo conhecido e árvore de projeto', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)
    const project = {
      name: 'Projeto Pro',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      kind: 'pro',
      tree: { 'index.html': { kind: 'file', content: '<main>Oi</main>' } },
      proMeta: { templateId: 'modelo-inventado', devScript: 'dev' },
    }

    const invalid = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'studio', initialProject: project },
    })
    expect(invalid.status).toBe(400)
    expect((await readJson(invalid)).error.message).toContain('modelo Pro válido')

    const valid = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'studio',
        initialProject: { ...project, proMeta: { templateId: 'react-ts', devScript: 'dev' } },
      },
    })
    expect(valid.status).toBe(201)
  })

  test('bloco embed v3 (só html) e bloco ebook → 201; embed sem html → 400', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)

    const embed = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'embed', html: '<canvas id="demo"></canvas>' },
    })
    expect(embed.status).toBe(201)

    const ebook = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'ebook', url: 'r2priv:admin/attachments/livro.pdf', title: 'Livro' },
    })
    expect(ebook.status).toBe(201)

    const noHtml = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'embed' },
    })
    expect(noHtml.status).toBe(400)
  })

  test('embed sandbox: tokens seguros → 201; allow-same-origin (escapa do iframe) → 400', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)

    const safe = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'embed', html: '<canvas></canvas>', sandbox: 'allow-scripts allow-forms' },
    })
    expect(safe.status).toBe(201)

    // `allow-same-origin` num srcDoc roda o HTML na ORIGIN do community → XSS.
    const sameOrigin = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'embed',
        html: '<canvas></canvas>',
        sandbox: 'allow-scripts allow-same-origin',
      },
    })
    expect(sameOrigin.status).toBe(400)

    const topNav = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'embed', html: '<canvas></canvas>', sandbox: 'allow-top-navigation' },
    })
    expect(topNav.status).toBe(400)
  })

  test('quiz incoerente → 400 (correta inexistente, <2 alternativas, sem correta); válido → 201', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)
    const choices = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]

    // Gabarito apontando para alternativa que não existe → questão impossível.
    const orphan = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'quiz',
        questions: [{ id: 'q1', prompt: 'P?', choices, correctChoiceIds: ['z'] }],
      },
    })
    expect(orphan.status).toBe(400)

    const oneChoice = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'quiz',
        questions: [
          { id: 'q1', prompt: 'P?', choices: [{ id: 'a', label: 'A' }], correctChoiceIds: ['a'] },
        ],
      },
    })
    expect(oneChoice.status).toBe(400)

    const noCorrect = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'quiz',
        questions: [{ id: 'q1', prompt: 'P?', choices, correctChoiceIds: [] }],
      },
    })
    expect(noCorrect.status).toBe(400)

    const ok = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: {
        kind: 'quiz',
        questions: [{ id: 'q1', prompt: 'P?', choices, correctChoiceIds: ['b'] }],
      },
    })
    expect(ok.status).toBe(201)

    // Quiz sem questões segue permitido (rascunho em construção no builder).
    const empty = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'quiz', questions: [] },
    })
    expect(empty.status).toBe(201)

    // ...MAS quiz COM nota de corte e sem questões → 400 (gate impossível de
    // satisfazer travaria a conclusão da aula para sempre).
    const gatedEmpty = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'quiz', passingScore: 50, questions: [] },
    })
    expect(gatedEmpty.status).toBe(400)
  })

  test('excluir módulo remove as aulas em cascata', async () => {
    const { app } = buildApp()
    const { course, mod, lesson } = await seedTree(app)
    expect((await send(app, `/members/admin/modules/${mod.id}`, 'DELETE')).status).toBe(200)

    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules).toHaveLength(0)
    expect((await get(app, `/members/admin/lessons/${lesson.id}/content`)).status).toBe(404)
  })
})

describe('Members HTTP — autoria: publicação por aula', () => {
  async function seedDraftTree(app: App) {
    const course = await createCourse(app)
    const mod = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const lesson = await readJson(
      await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
        slug: 'aula-1',
        title: 'Aula 1',
        estimatedMinutes: 5,
      }),
    )
    return { course, mod, lesson }
  }

  test('aula nova nasce rascunho; PATCH com isPublished publica', async () => {
    const { app } = buildApp()
    const { lesson } = await seedDraftTree(app)
    expect(lesson.isPublished).toBe(false)

    const patched = await readJson(
      await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
        slug: 'aula-1',
        title: 'Aula 1',
        estimatedMinutes: 5,
        isPublished: true,
      }),
    )
    expect(patched.isPublished).toBe(true)
  })

  test('criar curso já published → 409 NO_PUBLISHED_LESSON (nasce sem aulas)', async () => {
    const { app } = buildApp()
    const res = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      status: 'published',
    })
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('NO_PUBLISHED_LESSON')
  })

  test('publicar curso sem aula publicada → 409; com ≥1 publicada → 200', async () => {
    const { app } = buildApp()
    const { course, lesson } = await seedDraftTree(app)

    const blocked = await patchCourse(app, course.id, {
      ...COURSE,
      status: 'published',
    })
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('NO_PUBLISHED_LESSON')

    await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
      slug: 'aula-1',
      title: 'Aula 1',
      estimatedMinutes: 5,
      isPublished: true,
    })
    const ok = await patchCourse(app, course.id, {
      ...COURSE,
      status: 'published',
    })
    expect(ok.status).toBe(200)
    expect((await readJson(ok)).status).toBe('published')
  })

  test('árvore do admin mostra aulas rascunho (visão de autoria)', async () => {
    const { app } = buildApp()
    const { course, lesson } = await seedDraftTree(app)
    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules[0].lessons).toHaveLength(1)
    expect(tree.modules[0].lessons[0].id).toBe(lesson.id)
    expect(tree.modules[0].lessons[0].isPublished).toBe(false)
  })

  /** Curso PUBLICADO com 1 aula publicada (o cenário dos guards "por baixo"). */
  async function seedPublishedTree(app: App) {
    const { course, mod, lesson } = await seedDraftTree(app)
    await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
      slug: 'aula-1',
      title: 'Aula 1',
      estimatedMinutes: 5,
      isPublished: true,
    })
    await patchCourse(app, course.id, {
      ...COURSE,
      status: 'published',
    })
    return { course, mod, lesson }
  }

  test('despublicar a ÚLTIMA aula publicada de curso published → 409 (invariante por baixo)', async () => {
    const { app } = buildApp()
    const { lesson } = await seedPublishedTree(app)

    const blocked = await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
      slug: 'aula-1',
      title: 'Aula 1',
      estimatedMinutes: 5,
      isPublished: false,
    })
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('NO_PUBLISHED_LESSON')
  })

  test('excluir a ÚLTIMA aula publicada → 409; com outra publicada → 200', async () => {
    const { app } = buildApp()
    const { mod, lesson } = await seedPublishedTree(app)

    const blocked = await send(app, `/members/admin/lessons/${lesson.id}`, 'DELETE')
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('NO_PUBLISHED_LESSON')

    // Com uma 2ª aula publicada, a exclusão passa (sobra ≥1).
    await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
      slug: 'aula-2',
      title: 'Aula 2',
      estimatedMinutes: null,
      isPublished: true,
    })
    expect((await send(app, `/members/admin/lessons/${lesson.id}`, 'DELETE')).status).toBe(200)
  })

  test('excluir o módulo com as ÚLTIMAS aulas publicadas → 409; curso draft → 200', async () => {
    const { app } = buildApp()
    const { course, mod } = await seedPublishedTree(app)

    const blocked = await send(app, `/members/admin/modules/${mod.id}`, 'DELETE')
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('NO_PUBLISHED_LESSON')

    // Curso despublicado → módulo pode sair livremente.
    await patchCourse(app, course.id, { ...COURSE, status: 'draft' })
    expect((await send(app, `/members/admin/modules/${mod.id}`, 'DELETE')).status).toBe(200)
  })

  test('despublicar aula de curso DRAFT segue livre (guard só vale para published)', async () => {
    const { app } = buildApp()
    const { lesson } = await seedDraftTree(app)
    await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
      slug: 'aula-1',
      title: 'Aula 1',
      estimatedMinutes: 5,
      isPublished: true,
    })
    const ok = await send(app, `/members/admin/lessons/${lesson.id}`, 'PATCH', {
      slug: 'aula-1',
      title: 'Aula 1',
      estimatedMinutes: 5,
      isPublished: false,
    })
    expect(ok.status).toBe(200)
    expect((await readJson(ok)).isPublished).toBe(false)
  })
})

describe('Members HTTP — autoria: reordenação', () => {
  test('reordenar módulos troca a ordem; ids errados → 400', async () => {
    const { app } = buildApp()
    const course = await createCourse(app)
    const m1 = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'A',
        summary: null,
      }),
    )
    const m2 = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'B',
        summary: null,
      }),
    )

    const ok = await send(app, `/members/admin/courses/${course.id}/modules/reorder`, 'POST', {
      orderedIds: [m2.id, m1.id],
    })
    expect(ok.status).toBe(200)
    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules.map((m: { title: string }) => m.title)).toEqual(['B', 'A'])

    const bad = await send(app, `/members/admin/courses/${course.id}/modules/reorder`, 'POST', {
      orderedIds: [m1.id],
    })
    expect(bad.status).toBe(400)

    // Id repetido (mesmo tamanho, ambos ∈ atuais) corromperia o sortOrder → 400.
    const dup = await send(app, `/members/admin/courses/${course.id}/modules/reorder`, 'POST', {
      orderedIds: [m1.id, m1.id],
    })
    expect(dup.status).toBe(400)
    // A ordem anterior (B, A) permanece intacta.
    const tree2 = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree2.modules.map((m: { title: string }) => m.title)).toEqual(['B', 'A'])
  })
})

describe('Members HTTP — autoria: not found + RBAC', () => {
  test('editar/excluir inexistente → 404', async () => {
    const { app } = buildApp()
    const rid = '00000000-0000-0000-0000-000000000000'
    expect(
      (await send(app, `/members/admin/courses/${rid}`, 'PATCH', { ...COURSE, version: 0 })).status,
    ).toBe(404)
    expect(
      (await send(app, `/members/admin/modules/${rid}`, 'PATCH', { title: 'x', summary: null }))
        .status,
    ).toBe(404)
    expect((await send(app, `/members/admin/blocks/${rid}`, 'DELETE')).status).toBe(404)
  })

  test('com requireAdmin: sem role → 401; customer → 403; admin → 201', async () => {
    const { app } = buildApp({ requireAdmin: true })
    expect((await send(app, '/members/admin/courses', 'POST', COURSE)).status).toBe(401)
    expect(
      (
        await send(app, '/members/admin/courses', 'POST', COURSE, {
          'x-auth-user-role': 'customer',
        })
      ).status,
    ).toBe(403)
    expect((await send(app, '/members/admin/courses', 'POST', COURSE, adminHeaders)).status).toBe(
      201,
    )
  })
})
