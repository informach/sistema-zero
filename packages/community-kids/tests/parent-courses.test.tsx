import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HelpContent } from '../src/app/pais/ajuda/help-content'
import { ParentLessonFrame } from '../src/app/pais/cursos/[slug]/aulas/[lessonId]/parent-lesson-frame'
import {
  ParentCourseClosed,
  ParentCourseView,
} from '../src/app/pais/cursos/[slug]/parent-course-view'
import { ParentCoursesView } from '../src/app/pais/cursos/parent-courses-view'
import { resolveParentArea } from '../src/app/pais/parent-access'
import { childTabOf, parentCourseHref, parentDoubtHref } from '../src/app/pais/parent-routes'
import { ParentsClient } from '../src/app/pais/parents-client'
import type {
  CatalogCourseView,
  CourseDetailView,
  MyCourseView,
  TeacherThreadSummaryView,
} from '../src/lib/types'

let pathname = '/pais/cursos'
mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
  usePathname: () => pathname,
}))

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
// O menu lê os filhos em /api/profiles: aqui ele recebe uma lista vazia.
globalThis.fetch = Object.assign(
  mock(async (input: RequestInfo | URL) =>
    Response.json(
      String(input).startsWith('/api/commerce/promotions') ? { items: [] } : { profiles: [] },
    ),
  ),
  { preconnect: originalFetch.preconnect },
)

/** A oferta de venda do guia (Lote 6, 25/11/2026): o preço e a garantia dos cartões. */
const saleOffer: CommerceCatalogOffer = {
  id: '40000000-0000-4000-8000-000000000010',
  slug: 'guia-pais-1-ano',
  name: 'Transformando o vilão em aliado (1 ano)',
  status: 'active',
  isAvailable: true,
  priceCents: 2700,
  pricingMode: 'one_time',
  billingIntervalMonths: null,
  installmentsMax: 3,
  accessMode: 'fixed',
  accessDurationValue: 12,
  accessDurationUnit: 'months',
  guaranteeDays: 7,
  product: {
    id: '50000000-0000-4000-8000-000000000010',
    audience: 'kids',
    sku: 'guia-pais',
    name: 'Transformando o vilão em aliado',
    status: 'active',
    kind: 'course',
  },
  content: { allowsCoupon: true },
  includes: [],
}
/** O destaque da Comunidade que a Início recebe de /api/commerce/promotions. */
function communityPromotion(decision: 'purchase' | 'manage' = 'purchase') {
  return {
    origin: { kind: 'community' },
    offerRef: 'comunidade-mensal',
    promotion: {
      enabled: true,
      mode: 'purchase',
      location: 'parent_home',
      title: 'Seus filhos também podem criar os próprios jogos',
      description: 'Na Comunidade dos Criadores, crianças e adolescentes de 5 a 17 anos aprendem.',
      buttonLabel: 'Assinar a Comunidade',
    },
    decision: { kind: decision, manageUrl: '/pais/conta' },
    offer: {
      ...saleOffer,
      id: '40000000-0000-4000-8000-000000000020',
      slug: 'comunidade-mensal',
      name: 'Comunidade mensal',
      priceCents: 9700,
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      installmentsMax: null,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
      product: {
        ...saleOffer.product,
        id: '50000000-0000-4000-8000-000000000020',
        sku: 'comunidade-dos-criadores',
        name: 'Comunidade dos Criadores',
        kind: 'bundle',
      },
      content: { maxProfiles: 2 },
    },
  }
}

const progress = (completedLessons: number, totalLessons: number) => ({
  completedLessons,
  totalLessons,
  percent: Math.round((completedLessons / totalLessons) * 100),
  lastCompletedAt: null,
})

function catalog(over: Partial<CatalogCourseView> = {}): CatalogCourseView {
  return {
    courseId: 'c1',
    courseSlug: 'ajudar-sem-fazer-por-eles',
    title: 'Ajudar sem fazer por eles',
    subtitle: 'Como ajudar quando seus filhos travam.',
    coverImageUrl: null,
    hasAccess: true,
    salesPageUrl: null,
    accessReason: 'parents',
    ...over,
  } as CatalogCourseView
}

function mine(over: Partial<MyCourseView> = {}): MyCourseView {
  return {
    courseId: 'c1',
    courseSlug: 'ajudar-sem-fazer-por-eles',
    title: 'Ajudar sem fazer por eles',
    subtitle: 'Como ajudar quando seus filhos travam.',
    coverImageUrl: null,
    access: { accessType: 'all_kids_courses', expiresAt: null },
    progress: progress(2, 5),
    continueLessonId: 'l3',
    accessReason: 'parents',
    ...over,
  } as MyCourseView
}

describe('endereços dos cursos para pais', () => {
  test('curso, aula, dúvida e aba do filho', () => {
    expect(parentCourseHref('ajudar')).toBe('/pais/cursos/ajudar')
    expect(parentCourseHref('ajudar', 'l1')).toBe('/pais/cursos/ajudar/aulas/l1')
    expect(parentDoubtHref('t1')).toBe('/pais/ajuda/duvidas/t1')
    expect(childTabOf('jogo')).toBe('jogo')
    expect(childTabOf('qualquer')).toBe('progresso')
    expect(childTabOf(undefined)).toBe('progresso')
  })

  test('a aula do curso para pais entra no regime de aula', () => {
    expect(isLessonPath('/pais/cursos/ajudar/aulas/l1')).toBe(true)
    expect(isLessonPath('/cursos/cade/aulas/l1')).toBe(true)
    expect(isLessonPath('/pais/cursos/ajudar')).toBe(false)
  })

  test('na aula, a moldura dos pais tem a alça que abre a lista de aulas', () => {
    pathname = '/pais/cursos/ajudar/aulas/l1'
    try {
      render(
        <ParentLessonFrame viewerId="conta" parentName="Helena">
          <p>aula</p>
        </ParentLessonFrame>,
      )
      expect(screen.getByRole('button', { name: 'Mostrar lista de aulas' })).toBeTruthy()
    } finally {
      pathname = '/pais/cursos'
    }
  })
})

describe('Cursos para pais', () => {
  test('o curso em andamento continua de onde parou e cada curso tem o seu selo', () => {
    render(
      <ParentCoursesView
        parentName="Helena"
        catalog={[
          catalog(),
          catalog({ courseId: 'c2', courseSlug: 'tela-que-constroi', title: 'Tela que constrói' }),
          catalog({
            courseId: 'c3',
            courseSlug: 'conversas',
            title: 'Conversas sobre o que eles criaram',
          }),
        ]}
        mine={[
          mine(),
          mine({
            courseId: 'c3',
            courseSlug: 'conversas',
            title: 'Conversas sobre o que eles criaram',
            progress: progress(3, 3),
          }),
        ]}
        failed={false}
      />,
    )
    const main = screen.getByRole('main')
    expect(within(main).getByText('Todos estão incluídos na sua assinatura.', { exact: false }))
    expect(
      within(main).getByRole('link', { name: 'Continuar de onde parei' }).getAttribute('href'),
    ).toBe('/pais/cursos/ajudar-sem-fazer-por-eles/aulas/l3')
    expect(within(main).getByText('Concluído')).toBeTruthy()
    expect(
      within(main)
        .getByRole('link', { name: /Tela que constrói/ })
        .getAttribute('href'),
    ).toBe('/pais/cursos/tela-que-constroi')
  })

  test('quem não assina vê o curso fechado, sem a frase da assinatura', () => {
    render(<ParentCoursesView catalog={[catalog({ hasAccess: false })]} mine={[]} failed={false} />)
    const main = screen.getByRole('main')
    expect(within(main).getByText('Ver o curso')).toBeTruthy()
    expect(within(main).queryByText(/incluídos na sua assinatura/)).toBeNull()
  })

  test('Lote 6: o cartão do curso fechado mostra as aulas e o preço da oferta de venda', () => {
    render(
      <ParentCoursesView
        catalog={[
          catalog({
            hasAccess: false,
            courseSlug: 'transformando-o-vilao-em-aliado',
            title: 'Transformando o vilão em aliado',
            lessonsCount: 7,
            salesOfferRef: saleOffer.slug,
          }),
        ]}
        offers={{ 'transformando-o-vilao-em-aliado': saleOffer }}
        mine={[]}
        failed={false}
      />,
    )
    const main = screen.getByRole('main')
    const text = (main.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(text).toContain('7 aulas')
    expect(text).toContain('Apostila e certificado')
    expect(text).toContain('R$ 27')
    expect(text).toContain('Curso para pais')
  })

  test('falha na leitura vira recado, não erro', () => {
    render(<ParentCoursesView catalog={[]} mine={[]} failed />)
    expect(
      screen.getByText('Não conseguimos carregar os cursos agora. Tente de novo daqui a pouco.'),
    ).toBeTruthy()
  })
})

describe('o curso fechado com a oferta de venda (Lote 6, 25/11/2026)', () => {
  const guia = () =>
    catalog({
      hasAccess: false,
      courseSlug: 'transformando-o-vilao-em-aliado',
      title: 'Transformando o vilão em aliado',
      lessonsCount: 7,
      salesOfferRef: saleOffer.slug,
    })
  test('capa com a promessa, o que muda, quem conduz e a compra pelo mini checkout', () => {
    render(<ParentCourseClosed course={guia()} offer={saleOffer} />)
    const main = screen.getByRole('main')
    const text = (main.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
      'Transformando o vilão em aliado',
    )
    expect(text).toContain('7 aulas curtas em vídeo')
    expect(text).toContain('O erro pesa menos')
    expect(text).toContain('Eu sou a Helena')
    expect(within(main).getByRole('heading', { name: 'Liberar este curso' })).toBeTruthy()
    expect(text).toContain('R$ 27')
    expect(text).toContain('pagamento único, sem assinatura')
    expect(text).toContain('Acesso por 1 ano')
    expect(text).toContain('7 dias de garantia')
    expect(within(main).getByRole('button', { name: 'Comprar este curso' })).toBeTruthy()
    // A compra é na plataforma: nada de link para a página de venda nem promessa de vitalício.
    expect(text).not.toMatch(/vitalíci|sem prazo/i)
    expect(within(main).queryByRole('link', { name: /Comprar este curso/ })).toBeNull()
  })
  test('sem oferta de venda, os caminhos de antes', () => {
    render(<ParentCourseClosed course={guia()} offer={null} />)
    expect(screen.getByRole('heading', { name: 'Como liberar este curso' })).toBeTruthy()
  })
})

describe('a página do curso para pais', () => {
  const course = {
    id: 'c1',
    slug: 'ajudar-sem-fazer-por-eles',
    title: 'Ajudar sem fazer por eles',
    subtitle: 'Como ajudar quando seus filhos travam.',
    description: null,
    coverImageUrl: null,
    access: { accessType: 'all_kids_courses', expiresAt: null },
    progress: progress(1, 3),
    continueLessonId: 'l2',
    myRating: null,
    salesPageUrl: null,
    materialLessonIds: ['l3'],
    accessReason: 'parents',
    modules: [
      {
        id: 'm1',
        title: 'Entender o momento deles',
        summary: 'Por que eles chamam você.',
        sortOrder: 0,
        lessons: [
          {
            id: 'l1',
            slug: 'l1',
            title: 'O que acontece quando eles travam',
            sortOrder: 0,
            estimatedMinutes: 9,
            completed: true,
            locked: false,
          },
          {
            id: 'l2',
            slug: 'l2',
            title: 'Quando eles pedem ajuda',
            sortOrder: 1,
            estimatedMinutes: 12,
            completed: false,
            locked: false,
          },
          {
            id: 'l3',
            slug: 'l3',
            title: 'Perguntas que destravam',
            sortOrder: 2,
            estimatedMinutes: 10,
            completed: false,
            locked: true,
          },
        ],
      },
    ],
  } as unknown as CourseDetailView

  test('módulos, aulas e o continuar levam à aula na área dos pais', () => {
    render(<ParentCourseView parentName="Helena" course={course} />)
    const main = screen.getByRole('main')
    expect(within(main).getByText(/Curso para pais · 3 aulas · cerca de 31 min/)).toBeTruthy()
    expect(
      within(main).getByRole('link', { name: 'Continuar de onde parei' }).getAttribute('href'),
    ).toBe('/pais/cursos/ajudar-sem-fazer-por-eles/aulas/l2')
    expect(
      within(main).getByRole('link', { name: 'Quando eles pedem ajuda' }).getAttribute('href'),
    ).toBe('/pais/cursos/ajudar-sem-fazer-por-eles/aulas/l2')
    expect(within(main).getByText('Abre quando a anterior for concluída')).toBeTruthy()
    expect(within(main).getByText('Continue aqui')).toBeTruthy()
    expect(within(main).getByRole('heading', { name: 'Materiais de apoio' })).toBeTruthy()
    expect(within(main).getByRole('link', { name: 'Ver suas dúvidas' }).getAttribute('href')).toBe(
      '/pais/ajuda#duvidas',
    )
  })

  test('curso fechado: a Comunidade e a compra só deste curso', () => {
    render(
      <ParentCourseClosed
        course={catalog({ hasAccess: false, salesPageUrl: 'https://exemplo.com/curso' })}
      />,
    )
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { name: 'Como liberar este curso' })).toBeTruthy()
    expect(
      within(main)
        .getByRole('link', { name: /Comprar este curso/ })
        .getAttribute('href'),
    ).toBe('https://exemplo.com/curso')
    expect(within(main).getByRole('link', { name: /Conhecer a Comunidade/ })).toBeTruthy()
    expect(within(main).getByRole('button', { name: /Atualizar o acesso/ })).toBeTruthy()
  })
})

describe('a régua do Início e da Família (resolveParentArea)', () => {
  const lidos = (courses: MyCourseView[]) => ({ status: 200, body: { courses } })
  test('sem perfil liberado: curso para pais entra; nada entra em "não incluído"', () => {
    const nenhum = { kind: 'none' } as const
    expect(
      resolveParentArea({ profilesCount: 0, allowance: nenhum, parentCourses: lidos([mine()]) }),
    ).toEqual({ tela: 'area', purpose: 'curso', courses: [mine()] })
    expect(
      resolveParentArea({ profilesCount: 0, allowance: nenhum, parentCourses: lidos([]) }),
    ).toEqual({ tela: 'nao-incluido' })
  })
  test('falha ao ler os cursos (ou o limite) nunca diz que nada está incluído', () => {
    const nenhum = { kind: 'none' } as const
    expect(resolveParentArea({ profilesCount: 0, allowance: nenhum, parentCourses: null })).toEqual(
      { tela: 'indisponivel' },
    )
    expect(
      resolveParentArea({
        profilesCount: 0,
        allowance: nenhum,
        parentCourses: { status: 503, body: null },
      }),
    ).toEqual({ tela: 'indisponivel' })
    expect(
      resolveParentArea({
        profilesCount: 0,
        allowance: { kind: 'unavailable' },
        parentCourses: lidos([mine()]),
      }),
    ).toEqual({ tela: 'indisponivel' })
  })
  test('com filho, ou com perfil liberado, é a área dos filhos', () => {
    expect(
      resolveParentArea({
        profilesCount: 1,
        allowance: { kind: 'none' },
        parentCourses: null,
      }),
    ).toEqual({ tela: 'area', purpose: 'filhos', courses: [] })
    expect(
      resolveParentArea({
        profilesCount: 0,
        allowance: { kind: 'limited', maxProfiles: 2 },
        parentCourses: lidos([mine()]),
      }),
    ).toEqual({ tela: 'area', purpose: 'filhos', courses: [mine()] })
  })
})

describe('o Início de quem comprou só um curso para pais', () => {
  const inicio = (over: Partial<Parameters<typeof ParentsClient>[0]> = {}) =>
    render(
      <ParentsClient
        accountId="conta-curso"
        parentName="Helena"
        initialProfiles={[]}
        avatarPhotoByProfile={{}}
        profileAllowance={{ kind: 'none' }}
        parentCourse={mine({ progress: progress(0, 5), continueLessonId: 'l1' })}
        purpose="curso"
        {...over}
      />,
    )

  afterEach(() => localStorage.clear())
  let promotions: unknown[] = [communityPromotion()]
  beforeEach(() => {
    promotions = [communityPromotion()]
    // O menu lê os filhos em /api/profiles: esta conta não tem nenhum.
    globalThis.fetch = Object.assign(
      mock(async (input: RequestInfo | URL) =>
        Response.json(
          String(input).startsWith('/api/commerce/promotions')
            ? { items: promotions }
            : { profiles: [] },
        ),
      ),
      { preconnect: originalFetch.preconnect },
    )
  })

  test('o guia leva ao curso e o destaque da Comunidade toma o lugar dos filhos', async () => {
    inicio()
    const guia = await screen.findByRole('region', { name: 'Seu curso está pronto' })
    expect(within(guia).getByRole('link', { name: 'Começar o curso' }).getAttribute('href')).toBe(
      '/pais/cursos/ajudar-sem-fazer-por-eles/aulas/l1',
    )
    expect(await screen.findByText('Seus filhos também podem criar os próprios jogos')).toBeTruthy()
    expect(screen.getByText('Até 2 perfis de criança na mesma conta, um para cada filho'))
    expect(screen.queryByText(/cursos para pais, inclusive/)).toBeNull()
    expect(screen.queryByText('Seus filhos esta semana')).toBeNull()
    // Nada de cadastrar filho nem autorizar aparelho.
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
    // Sem filho na conta, não há área da criança para abrir.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ir para a área da criança' })).toBeNull(),
    )
  })

  test('fechar o guia guarda a escolha; curso começado não abre o guia', async () => {
    const primeiro = inicio()
    fireEvent.click(await screen.findByRole('button', { name: 'Fechar orientação' }))
    expect(screen.queryByRole('region', { name: 'Seu curso está pronto' })).toBeNull()
    primeiro.unmount()
    inicio()
    await screen.findByText('Seus filhos também podem criar os próprios jogos')
    expect(screen.queryByRole('region', { name: 'Seu curso está pronto' })).toBeNull()
    localStorage.clear()
    cleanup()
    inicio({ parentCourse: mine() })
    await screen.findByText('Seus filhos também podem criar os próprios jogos')
    expect(screen.queryByRole('region', { name: 'Seu curso está pronto' })).toBeNull()
  })

  test('Lote 6: quem já assina não vê o destaque da Comunidade', async () => {
    promotions = [communityPromotion('manage')]
    inicio()
    await screen.findByRole('region', { name: 'Seu curso está pronto' })
    await waitFor(() => expect((globalThis.fetch as ReturnType<typeof mock>).mock.calls.length > 0))
    expect(screen.queryByText('Seus filhos também podem criar os próprios jogos')).toBeNull()
  })

  test('Lote 6: sem curso liberado, a lateral vende o curso fechado pela oferta', async () => {
    promotions = []
    inicio({
      parentCourse: null,
      purpose: 'filhos',
      saleCourse: {
        course: catalog({
          hasAccess: false,
          courseSlug: 'transformando-o-vilao-em-aliado',
          title: 'Transformando o vilão em aliado',
          subtitle: 'A tela que hoje vira briga em casa pode ser sua aliada.',
          lessonsCount: 7,
        }),
        offer: saleOffer,
      },
    })
    const text = (document.body.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(text).toContain('Para você')
    expect(text).toContain('7 aulas')
    expect(text).toContain('Com a Helena')
    expect(text).toContain('R$ 27')
    expect(screen.getByRole('button', { name: 'Comprar o curso' })).toBeTruthy()
  })
})

describe('Ajuda: as dúvidas dos cursos para pais', () => {
  const doubt = {
    id: 't1',
    userId: 'conta',
    accountId: 'conta',
    audience: 'kids',
    contextType: 'lesson_section',
    contextRef: 'l2:s1',
    courseId: 'c1',
    lessonId: 'l2',
    title: 'Quando eles pedem ajuda · O primeiro minuto',
    lastMessageAt: '2026-11-14T15:00:00.000Z',
    createdAt: '2026-11-14T14:00:00.000Z',
    lastMessagePreview: 'Obrigado!',
    lastMessageRole: 'teacher',
    messageCount: 2,
    unread: true,
    workflowStatus: 'waiting_student',
  } as TeacherThreadSummaryView

  test('a lista aparece depois da primeira dúvida e leva à conversa', () => {
    render(<HelpContent parentName="Helena" doubts={[doubt]} />)
    const region = screen.getByRole('region', { name: 'Suas dúvidas sobre os cursos' })
    const link = within(region).getByRole('link', { name: /O primeiro minuto/ })
    expect(link.getAttribute('href')).toBe('/pais/ajuda/duvidas/t1')
    expect(within(region).getByText('Nova resposta')).toBeTruthy()
    expect(within(region).getByText(/Respondida/)).toBeTruthy()
  })

  test('sem dúvidas, a parte não aparece; as perguntas dos cursos sim', () => {
    render(<HelpContent parentName="Helena" />)
    expect(screen.queryByRole('region', { name: 'Suas dúvidas sobre os cursos' })).toBeNull()
    expect(screen.getByText('Fazer um curso gasta os créditos do Zappy?')).toBeTruthy()
  })
})
