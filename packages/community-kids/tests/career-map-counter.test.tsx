import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { CareerMap } from '../src/components/kids/career-map'
import type { CareerCatalogEntry } from '../src/lib/career-horizon'
import type { TierCompletion } from '../src/lib/career-map'
import type { StudentLevelSlug, StudentLevelView } from '../src/lib/types'

/**
 * O contador do medalhão ("N de M aventuras prontas") e o card "Você está em dia".
 *
 * ⚠️ As duas contas da tela são DIFERENTES de propósito e é aí que mora o risco: o
 * `careerProgress` (que decide o card) só conhece as posições OBRIGATÓRIAS, enquanto o
 * contador conta a trilha inteira, bônus incluído. Sem cuidado, a criança lê "8 de 9"
 * no medalhão e "você já fez tudo que está pronto" logo abaixo.
 */

/** Construtor(a) com 5 das 8 posições do iniciante-2d publicadas → `careerProgress` = em dia. */
const level: StudentLevelView = {
  slug: 'coder',
  next: 'hacker',
  // 3 posições faltando, mas só 5 existem no catálogo: nada mais a fazer pela régua.
  remaining: { any: 0, 'iniciante-2d': 3 },
} as unknown as StudentLevelView

const catalogo: CareerCatalogEntry[] = [
  ...[1, 2, 3, 4, 5].map((slot) => ({
    level: 'iniciante' as const,
    track: '2d' as const,
    careerSlot: slot,
  })),
  // O bônus não entra no `careerProgress` (que só olha posição obrigatória).
  { level: 'iniciante' as const, track: '2d' as const, careerSlot: null },
]

const completion = (done: number, total: number): Record<StudentLevelSlug, TierCompletion> =>
  ({ coder: { done, total } }) as Record<StudentLevelSlug, TierCompletion>

describe('CareerMap — contador e o card "em dia"', () => {
  test('o link do posto anuncia o progresso que aparece na legenda', () => {
    render(<CareerMap level={level} courses={catalogo} completionByLevel={completion(5, 6)} />)

    const link = screen.getByRole('link', { name: 'Abrir a trilha Construtor(a)' })
    const descriptionId = link.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
      '5 de 6 aventuras prontas',
    )
  })

  test('🚨 com aventura por fazer, o card "Você está em dia" NÃO aparece', () => {
    // A criança fez as 5 obrigatórias e ainda não fez o bônus novo.
    render(<CareerMap level={level} courses={catalogo} completionByLevel={completion(5, 6)} />)

    expect(screen.getByText(/5 de 6/)).toBeTruthy()
    // O card afirmaria "você já fez tudo que está pronto por aqui" — a mentira que este
    // contador existe para matar. Ele é regido pelo `careerProgress`, que não vê o bônus.
    expect(screen.queryByText('Você está em dia!')).toBeNull()
  })

  test('com a trilha inteira feita, o card volta', () => {
    render(<CareerMap level={level} courses={catalogo} completionByLevel={completion(6, 6)} />)

    expect(screen.getByText(/6 de 6/)).toBeTruthy()
    expect(screen.getByText('Você está em dia!')).toBeTruthy()
  })

  test('⚠️ trilha grande demais perde as BOLINHAS, nunca o número', () => {
    // A legenda é `w-44` (176px) e a fileira não quebra linha: cada bolinha custa 12px,
    // então 15 estouram a caixa e vazam por cima da fita. O total deixou de ter teto quando
    // o bônus entrou na conta — antes eram no máximo 8 posições obrigatórias.
    const muitos = [...Array(9).keys()].map((i) => ({
      level: 'iniciante' as const,
      track: '2d' as const,
      careerSlot: i < 5 ? i + 1 : null,
    }))
    const { container } = render(
      <CareerMap level={level} courses={muitos} completionByLevel={completion(4, 14)} />,
    )

    expect(screen.getByText(/4 de 14/)).toBeTruthy()
    expect(container.querySelectorAll('span.size-2').length).toBe(0)
  })

  test('⚠️ sem o contador, o ✓ volta a ser posicional em vez de virar "0 de N"', () => {
    // A página SEMPRE calcula hoje (os marcos vêm no catálogo), mas o caminho defensivo
    // continua: prop ausente não pode inventar "nada feito" e apagar a carreira inteira.
    render(<CareerMap level={level} courses={catalogo} />)

    expect(screen.queryByText(/de 6/)).toBeNull()
    expect(screen.getByText('Você está em dia!')).toBeTruthy()
  })
})
