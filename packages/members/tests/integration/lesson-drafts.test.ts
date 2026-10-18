/**
 * O rascunho do Estúdio e do Pinta DENTRO da fase, guardado na conta (10/10/2026), e o critério
 * "envio em dia" que ele torna possível.
 *
 * A forma da aula é a da aula 2 do Cadê: a entrega numa parte de entrega, uma parte de
 * personalizar marcada com o critério e um fechamento depois.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  defaultLessonSection,
  type LessonSection,
  type SectionProgressView,
} from '@sistemazero/core/learning'
import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio'
import { RevokeEntitlementService } from '../../src/application/revoke-entitlement/revoke-entitlement.service'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const OUTRO = '22222222-2222-2222-2222-222222222222'
const REVISION = '12345678901234567890123456789012'
const impressao = (letra: string) => `v1:${letra.repeat(64)}`

function setup(
  opts: {
    audience?: 'adult' | 'kids'
    personalizar?: LessonSection['completion']
    matricula?: { subscriptionId?: string; expiresAt?: Date }
  } = {},
) {
  let agora = new Date('2026-10-10T12:00:00.000Z')
  const env = buildApp({ now: agora })
  const audience = opts.audience ?? 'adult'
  const course = seedSampleCourse(env.courses, 'curso-demo', 'published', audience)
  const lessonId = course.lessonIds[0] as string
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug, ...opts.matricula })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  const projeto = randomUUID()
  const fecho = randomUUID()
  const ids = { contar: randomUUID(), personalizar: randomUUID(), conclusao: randomUUID() }
  env.courses.blocks.push(
    {
      id: projeto,
      lessonId,
      kind: 'studio',
      sortOrder: 0,
      contentRevision: REVISION,
      content: {
        kind: 'studio',
        purpose: 'submission',
        initialProject: { formatVersion: STUDIO_PROJECT_FORMAT_VERSION },
      },
    },
    {
      id: fecho,
      lessonId,
      kind: 'interactive',
      sortOrder: 1,
      contentRevision: REVISION,
      content: {
        kind: 'interactive',
        title: 'Confira',
        instructions: 'Leia.',
        required: false,
        hints: [],
        activity: { type: 'html', html: '<p>Fim.</p>' },
        checkpoint: {
          prompt: 'Pronto?',
          choices: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
          correctChoiceId: 'sim',
          explanation: 'Isso.',
        },
      },
    },
  )
  const sections: LessonSection[] = [
    {
      ...defaultLessonSection(ids.contar, 'Cada personagem vale um achado', [projeto]),
      intent: 'delivery',
      workspaceBlockId: projeto,
      completion: { version: 1, blockIds: [projeto] },
    },
    {
      ...defaultLessonSection(ids.personalizar, 'Deixe o jogo com a sua cara', []),
      intent: 'closing',
      workspaceBlockId: projeto,
      completion: opts.personalizar ?? { version: 1, blockIds: [], submissionUpToDate: true },
    },
    {
      ...defaultLessonSection(ids.conclusao, 'Publique seu jogo', [fecho]),
      intent: 'closing',
      workspaceBlockId: projeto,
      completion: { version: 1, blockIds: [fecho] },
    },
  ]
  env.learningRepository.structures.set(lessonId, { revision: randomUUID(), sections })
  const request = (path: string, method = 'GET', body?: unknown, user = USER) =>
    env.app.handle(
      new Request(
        `http://localhost/members${path}${path.startsWith('/creations/') && audience === 'adult' && !path.includes('audience=') ? `${path.includes('?') ? '&' : '?'}audience=adult` : ''}`,
        {
          method,
          headers: { 'content-type': 'application/json', 'x-auth-user-id': user },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      ),
    )
  const avancar = (minutos: number) => {
    agora = new Date(agora.getTime() + minutos * 60_000)
    env.clockRef.now = agora
  }
  const enviar = (fingerprint?: string) =>
    request(`/lessons/${lessonId}/blocks/${projeto}/studio-submission`, 'POST', {
      project: { formatVersion: STUDIO_PROJECT_FORMAT_VERSION, name: 'Meu jogo', files: {} },
      ...(fingerprint ? { fingerprint } : {}),
    })
  /** Reserva + confirma o rascunho do bloco (o PUT no R2 é do BFF; aqui não importa). */
  const guardarRascunho = async (fingerprint: string | undefined, user = USER) => {
    const reserva = await request(
      `/creations/lesson-studio/${projeto}/upload`,
      'POST',
      {
        formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
        name: 'Meu jogo',
        kind: 'classic',
        itemUpdatedAt: agora.toISOString(),
        bytes: 100,
        ...(fingerprint ? { fingerprint } : {}),
      },
      user,
    )
    if (reserva.status !== 200) return reserva
    const { revision } = (await reserva.json()) as { revision: number }
    return request(
      `/creations/lesson-studio/${projeto}/commit`,
      'POST',
      { revision, verifiedPartHashes: [] },
      user,
    )
  }
  const progresso = async () =>
    (
      (await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()) as {
        sectionProgress: SectionProgressView
      }
    ).sectionProgress
  const parte = async (id: keyof typeof ids) =>
    (await progresso()).sections.find((s) => s.id === ids[id])
  const navegar = (id: keyof typeof ids) =>
    request(`/lessons/${lessonId}/navigation`, 'PUT', { sectionId: ids[id] })
  return {
    ...env,
    course,
    lessonId,
    projeto,
    request,
    avancar,
    enviar,
    guardarRascunho,
    progresso,
    parte,
    navegar,
  }
}

describe('o rascunho da fase guardado na conta', () => {
  test('id de bloco inválido é 400 sem consultar o repositório', async () => {
    const ctx = setup()
    ctx.courses.findBlockLessonId = async () => {
      throw new Error('invalid ID reached database')
    }
    for (const tool of ['lesson-studio', 'lesson-pinta']) {
      const response = await ctx.request(`/creations/${tool}/not-a-uuid/upload`, 'POST', {
        formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
        name: 'x',
        kind: 'classic',
        bytes: 100,
        itemUpdatedAt: '2026-10-10T12:00:00Z',
      })
      expect(response.status).toBe(400)
    }
  })
  test.each([
    'kids',
    'adult',
  ] as const)('reserva pela FASE de %s, sem licença livre, e conserva a impressão', async (audience) => {
    const ctx = setup({ audience })
    const commit = await ctx.guardarRascunho(impressao('a'))
    expect(commit.status).toBe(200)
    const baixar = await ctx.request(`/creations/lesson-studio/${ctx.projeto}/download`)
    expect(baixar.status).toBe(200)
    const ticket = (await baixar.json()) as { summary: { contentFingerprint?: string } }
    expect(ticket.summary.contentFingerprint).toBe(impressao('a'))
  })
  test.each([
    'kids',
    'adult',
  ] as const)('rascunho de %s recusa o contexto da outra plataforma', async (audience) => {
    const ctx = setup({ audience })
    const other = audience === 'adult' ? 'kids' : 'adult'
    const response = await ctx.request(
      `/creations/lesson-studio/${ctx.projeto}/upload?audience=${other}`,
      'POST',
      {
        name: 'Projeto',
        kind: 'classic',
        bytes: 100,
        formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
        itemUpdatedAt: '2026-10-10T12:00:00Z',
      },
    )
    expect(response.status).toBe(404)
  })

  test('quem não tem o curso, ou o tipo errado de rascunho, não guarda', async () => {
    const ctx = setup()
    expect((await ctx.guardarRascunho(impressao('a'), OUTRO)).status).toBe(403)
    const pinta = await ctx.request(`/creations/lesson-pinta/${ctx.projeto}/upload`, 'POST', {
      name: 'x',
      kind: 'pixel-sprite',
      itemUpdatedAt: '2026-10-10T12:00:00.000Z',
      bytes: 10,
    })
    expect(pinta.status).toBe(404)
    const inexistente = await ctx.request(
      `/creations/lesson-studio/${randomUUID()}/upload`,
      'POST',
      {
        formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
        name: 'x',
        kind: 'classic',
        itemUpdatedAt: '2026-10-10T12:00:00.000Z',
        bytes: 10,
      },
    )
    expect(inexistente.status).toBe(404)
  })

  test('a matrícula revogada para de guardar na hora, sem esperar o minuto do cache', async () => {
    const ctx = setup({ matricula: { subscriptionId: 'assinatura-1' } })
    expect((await ctx.guardarRascunho(impressao('a'))).status).toBe(200)
    await new RevokeEntitlementService({
      entitlements: ctx.entitlements,
      clock: () => ctx.clockRef.now,
    }).cancel('assinatura-1')
    expect((await ctx.guardarRascunho(impressao('b'))).status).toBe(403)
  })

  test('a matrícula que vence dentro do minuto do cache não ganha o minuto inteiro', async () => {
    const vence = new Date('2026-10-10T12:00:30.000Z')
    const ctx = setup({ matricula: { expiresAt: vence } })
    expect((await ctx.guardarRascunho(impressao('a'))).status).toBe(200)
    ctx.clockRef.now = new Date(vence.getTime() + 1_000)
    expect((await ctx.guardarRascunho(impressao('b'))).status).toBe(403)
  })

  test('impressão fora do formato é recusada na borda', async () => {
    const ctx = setup()
    const reserva = await ctx.request(`/creations/lesson-studio/${ctx.projeto}/upload`, 'POST', {
      formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
      name: 'x',
      kind: 'classic',
      itemUpdatedAt: '2026-10-10T12:00:00.000Z',
      bytes: 10,
      fingerprint: 'abc',
    })
    expect(reserva.status).toBe(400)
  })
})

describe('o critério "envio em dia"', () => {
  test('mudou depois de enviar: a parte pede "Envie de novo" e avançar é recusado', async () => {
    const ctx = setup()
    expect((await ctx.enviar(impressao('a'))).status).toBe(200)
    ctx.avancar(1)
    expect((await ctx.guardarRascunho(impressao('b'))).status).toBe(200)
    const personalizar = await ctx.parte('personalizar')
    expect(personalizar?.status).toBe('available')
    expect(personalizar?.pendingItems).toEqual([
      { kind: 'submission-outdated', text: 'Você mudou o projeto depois de enviar. Envie de novo' },
    ])
    expect((await ctx.navegar('conclusao')).status).toBe(423)
    // Reenviou o projeto de agora: em dia.
    ctx.avancar(1)
    expect((await ctx.enviar(impressao('b'))).status).toBe(200)
    expect((await ctx.parte('personalizar'))?.status).toBe('completed')
    expect((await ctx.navegar('conclusao')).status).toBe(200)
  })

  test('uma leitura passiva NÃO congela a parte; avançar congela', async () => {
    const ctx = setup()
    await ctx.enviar(impressao('a'))
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('a'))
    // Em dia: a tela mostra a parte concluída (o botão de seguir acende)…
    expect((await ctx.parte('personalizar'))?.status).toBe('completed')
    // …mas ela não foi gravada: uma alteração que chega depois volta a pedir o reenvio.
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('c'))
    expect((await ctx.parte('personalizar'))?.pendingItems[0]?.kind).toBe('submission-outdated')
    ctx.avancar(1)
    await ctx.enviar(impressao('c'))
    expect((await ctx.navegar('conclusao')).status).toBe(200)
    // Depois de avançar, a parte é marco: mexer de novo não a reabre.
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('d'))
    expect((await ctx.parte('personalizar'))?.status).toBe('completed')
  })

  test('abrir a fase NA parte marcada não a congela (só o que fica ANTES do destino)', async () => {
    const ctx = setup()
    await ctx.enviar(impressao('a'))
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('a'))
    expect((await ctx.navegar('personalizar')).status).toBe(200)
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('e'))
    expect((await ctx.parte('personalizar'))?.pendingItems[0]?.kind).toBe('submission-outdated')
  })

  test('sem impressão de um dos lados (cliente antigo), o critério deixa passar', async () => {
    const ctx = setup()
    await ctx.enviar()
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('b'))
    expect((await ctx.parte('personalizar'))?.status).toBe('completed')
    expect((await ctx.navegar('conclusao')).status).toBe(200)
  })

  test('um envio mais novo que o rascunho guardado está em dia', async () => {
    const ctx = setup()
    await ctx.guardarRascunho(impressao('b'))
    ctx.avancar(1)
    await ctx.enviar(impressao('a'))
    expect((await ctx.parte('personalizar'))?.status).toBe('completed')
  })

  test('a parte sem o critério segue como sempre', async () => {
    const ctx = setup({ personalizar: { version: 1, blockIds: [] } })
    await ctx.enviar(impressao('a'))
    ctx.avancar(1)
    await ctx.guardarRascunho(impressao('b'))
    // Sem critério nenhum é questão de autoria, não de reenvio.
    const personalizar = await ctx.parte('personalizar')
    expect(personalizar?.pendingItems.some((i) => i.kind === 'submission-outdated')).toBe(false)
  })
})
