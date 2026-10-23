import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { CatalogCourseCard } from '../src/components/community/catalog-course-card'
import { comebackSubscriptionId, lockedCourseLink } from '../src/lib/continuity'
import type { CatalogCourseView } from '../src/lib/types'

/**
 * Entradas para a continuidade adulta: curso bloqueado sem página própria e retorno em Compras.
 */

const OFERTA = 'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar'

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
