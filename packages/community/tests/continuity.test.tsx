import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { CatalogCourseCard } from '../src/components/community/catalog-course-card'
import { NciContinuityCard } from '../src/components/community/courses/continuity-card'
import {
  ADULT_CLUB_ACCESS_KEY,
  comebackSubscriptionId,
  lockedCourseLink,
  NCI_ACCESS_KEY,
  showNciContinuityCard,
} from '../src/lib/continuity'
import type { CatalogCourseView } from '../src/lib/types'

/**
 * As entradas do app para a oferta de continuidade adulta (20/10/2026): o cartão de Cursos para
 * quem só tem o No Comando da IA, o curso bloqueado sem página própria e o retorno em Compras.
 */

const OFERTA = 'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar'

describe('cartão do No Comando da IA em Cursos', () => {
  const ok = (access: Record<string, boolean>) => ({ status: 200, body: { access } })

  test('as chaves são o NCI e o Clube adulto', () => {
    expect(NCI_ACCESS_KEY).toBe('no-comando-da-ia')
    expect(ADULT_CLUB_ACCESS_KEY).toBe('adult-clube-dos-criadores')
  })

  test('NCI sim e Clube não: cartão', () => {
    expect(
      showNciContinuityCard(ok({ [NCI_ACCESS_KEY]: true, [ADULT_CLUB_ACCESS_KEY]: false })),
    ).toBe(true)
  })

  test('qualquer outra combinação: sem cartão', () => {
    expect(
      showNciContinuityCard(ok({ [NCI_ACCESS_KEY]: true, [ADULT_CLUB_ACCESS_KEY]: true })),
    ).toBe(false)
    expect(
      showNciContinuityCard(ok({ [NCI_ACCESS_KEY]: false, [ADULT_CLUB_ACCESS_KEY]: false })),
    ).toBe(false)
    expect(
      showNciContinuityCard(ok({ [NCI_ACCESS_KEY]: false, [ADULT_CLUB_ACCESS_KEY]: true })),
    ).toBe(false)
    // Chave do Clube ausente não conta como "não tem".
    expect(showNciContinuityCard(ok({ [NCI_ACCESS_KEY]: true }))).toBe(false)
  })

  test('erro fecha: sem cartão', () => {
    expect(showNciContinuityCard(null)).toBe(false)
    expect(showNciContinuityCard(undefined)).toBe(false)
    expect(
      showNciContinuityCard({
        status: 502,
        body: { access: { [NCI_ACCESS_KEY]: true, [ADULT_CLUB_ACCESS_KEY]: false } },
      }),
    ).toBe(false)
    expect(showNciContinuityCard({ status: 200, body: null })).toBe(false)
  })

  test('o cartão tem o texto e o botão com a origem cursos-nci', () => {
    const html = renderToStaticMarkup(<NciContinuityCard />)
    expect(html).toContain(
      'Você já tem o No Comando da IA. Com a Comunidade, os cursos adultos abrem nesta mesma conta, e as ferramentas do Estúdio abrem conforme você avança nas etapas.',
    )
    expect(html).toContain('Ver como continuar')
    expect(html).toContain(
      `href="${OFERTA}?utm_source=plataforma&amp;utm_medium=app&amp;utm_content=cursos-nci"`,
    )
  })
})

describe('curso bloqueado sem página de vendas', () => {
  test('usa a página do curso quando existe e a oferta da Comunidade quando não', () => {
    expect(lockedCourseLink('https://exemplo.com/curso')).toEqual({
      href: 'https://exemplo.com/curso',
      label: 'Conhecer o curso',
      note: 'Abre a página do curso em outra aba.',
    })
    const fallback = {
      href: `${OFERTA}?utm_source=plataforma&utm_medium=app&utm_content=curso-bloqueado`,
      label: 'Conhecer a Comunidade',
      note: 'Abre a página da Comunidade em outra aba.',
    }
    expect(lockedCourseLink(null)).toEqual(fallback)
    expect(lockedCourseLink(undefined)).toEqual(fallback)
    expect(lockedCourseLink('')).toEqual(fallback)
  })

  const course = (salesPageUrl: string | null) =>
    ({
      courseId: '00000000-0000-4000-8000-000000000001',
      courseSlug: 'curso-x',
      title: 'Curso X',
      hasAccess: false,
      salesPageUrl,
      coverImageUrl: null,
      milestones: null,
    }) as unknown as CatalogCourseView

  test('o cartão do catálogo sem página própria diz que abre a Comunidade', () => {
    const html = renderToStaticMarkup(
      <CatalogCourseCard course={course(null)} progress={null} locked={lockedCourseLink(null)} />,
    )
    expect(html).toContain('Conhecer a Comunidade')
    expect(html).toContain('Abre a página da Comunidade em outra aba.')
    expect(html).not.toContain('Conhecer o curso')
    expect(html).toContain('utm_content=curso-bloqueado')
  })

  test('o cartão do catálogo com página própria leva ao curso', () => {
    const url = 'https://exemplo.com/curso'
    const html = renderToStaticMarkup(
      <CatalogCourseCard course={course(url)} progress={null} locked={lockedCourseLink(url)} />,
    )
    expect(html).toContain('Conhecer o curso')
    expect(html).toContain(`href="${url}"`)
  })
})

describe('Voltar para a Comunidade em Compras', () => {
  const sub = (id: string, status: string, description: string | null, createdAt: string) => ({
    id,
    status,
    description,
    createdAt,
  })
  const ADULT = 'Comunidade dos Criadores (adultos)'

  test('só a assinatura adulta Encerrada mais recente ganha o botão', () => {
    expect(
      comebackSubscriptionId([
        sub('a', 'EXPIRED', ADULT, '2026-01-01T00:00:00Z'),
        sub('b', 'EXPIRED', ADULT, '2026-05-01T00:00:00Z'),
      ]),
    ).toBe('b')
    expect(comebackSubscriptionId([sub('a', 'EXPIRED', ADULT, '2026-01-01')])).toBe('a')
  })

  test('Cancelada ainda tem acesso: sem botão', () => {
    expect(comebackSubscriptionId([sub('a', 'CANCELED', ADULT, '2026-05-01')])).toBeNull()
    expect(
      comebackSubscriptionId([
        sub('a', 'EXPIRED', ADULT, '2026-01-01'),
        sub('b', 'CANCELED', ADULT, '2026-05-01'),
      ]),
    ).toBeNull()
  })

  test('com outra adulta Ativa, nenhuma; a Pendente não segura o botão', () => {
    expect(
      comebackSubscriptionId([
        sub('a', 'EXPIRED', ADULT, '2026-01-01'),
        sub('b', 'ACTIVE', ADULT, '2026-05-01'),
      ]),
    ).toBeNull()
    expect(
      comebackSubscriptionId([
        sub('a', 'EXPIRED', ADULT, '2026-01-01'),
        sub('b', 'PENDING', ADULT, '2026-05-01'),
      ]),
    ).toBe('a')
  })

  test('a Comunidade Kids da mesma conta e outros produtos não ganham o botão', () => {
    // A oferta principal Kids cobra como "Comunidade dos Criadores", sem "(adultos)".
    expect(
      comebackSubscriptionId([sub('a', 'EXPIRED', 'Comunidade dos Criadores', '2026-01-01')]),
    ).toBeNull()
    expect(comebackSubscriptionId([sub('a', 'EXPIRED', 'Outro produto', '2026-01-01')])).toBeNull()
    expect(comebackSubscriptionId([sub('a', 'EXPIRED', null, '2026-01-01')])).toBeNull()
    expect(comebackSubscriptionId([])).toBeNull()
  })
})
