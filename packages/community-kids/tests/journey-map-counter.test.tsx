import { describe, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  type KidsJourneyCourseFact,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { render, screen } from '@testing-library/react'
import { JourneyMap } from '../src/components/kids/journey-map'
import type { TierCompletion } from '../src/lib/journey-map'
import type { StudentLevelSlug } from '../src/lib/types'

/**
 * O contador do medalhão ("N de M cursos prontos") e o card "Você está em dia".
 *
 * ⚠️ As duas contas da tela são DIFERENTES de propósito e é aí que mora o risco: o
 * `journeyProgress` (que decide o card) só conhece as posições OBRIGATÓRIAS, enquanto o
 * contador conta a trilha inteira, bônus incluído. Sem cuidado, a criança lê "8 de 9"
 * no medalhão e "você já fez tudo que está pronto" logo abaixo.
 */

// Five canonical base positions exist and are actually completed/showcased; the rest are unavailable.
const facts: KidsJourneyCourseFact[] = [1, 2, 3, 4, 5].map((slot) => ({
  id: `00000000-0000-4000-8000-${String(slot).padStart(12, '0')}`,
  tier: 'iniciante-2d',
  slot,
  audience: 'kids',
  modality: 'recorded',
  status: 'published',
  graduationOnly: false,
  journeyRole: 'positioned',
  hasShowcaseBlock: true,
}))
const journey = projectKidsJourney({
  policy: initialKidsJourneyPolicy(),
  policyVersion: 1,
  catalog: facts,
  milestones: facts.map((course) => ({
    courseId: course.id,
    qualifiedTier: course.tier,
    qualifiedSlot: course.slot,
    completed: true,
    showcased: true,
  })),
  earned: {
    level: 'coder',
    capabilities: ['studio', 'pinta'],
    courseAccess: { entry: ['iniciante-2d'], expanded: [], reward: [] },
  },
})
const completion = (done: number, total: number): Record<StudentLevelSlug, TierCompletion> =>
  ({ coder: { done, total } }) as Record<StudentLevelSlug, TierCompletion>

describe('JourneyMap — contador e o card "em dia"', () => {
  test('o link do posto anuncia o progresso que aparece na legenda', () => {
    render(<JourneyMap journey={journey} completionByLevel={completion(5, 6)} />)

    const link = screen.getByRole('link', { name: 'Abrir a trilha Construtor(a)' })
    const descriptionId = link.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
      '5 de 6 cursos prontos',
    )
  })

  test('🚨 com aventura por fazer, o card "Você está em dia" NÃO aparece', () => {
    // A criança fez as 5 obrigatórias e ainda não fez o bônus novo.
    render(<JourneyMap journey={journey} completionByLevel={completion(5, 6)} />)

    expect(screen.getByText(/5 de 6/)).toBeTruthy()
    // O card afirmaria "você já fez tudo que está pronto por aqui" — a mentira que este
    // contador existe para matar. Ele é regido pelo `journeyProgress`, que não vê o bônus.
    expect(screen.queryByText('Você está em dia!')).toBeNull()
  })

  test('com a trilha inteira feita, o card volta', () => {
    render(<JourneyMap journey={journey} completionByLevel={completion(6, 6)} />)

    expect(screen.getByText(/6 de 6/)).toBeTruthy()
    expect(screen.getByText('Você está em dia!')).toBeTruthy()
  })

  test('⚠️ trilha grande demais perde as BOLINHAS, nunca o número', () => {
    // A legenda é `w-44` (176px) e a fileira não quebra linha: cada bolinha custa 12px,
    // então 15 estouram a caixa e vazam por cima da fita. O total deixou de ter teto quando
    // o bônus entrou na conta — antes eram no máximo 8 posições obrigatórias.
    const { container } = render(
      <JourneyMap journey={journey} completionByLevel={completion(4, 14)} />,
    )

    expect(screen.getByText(/4 de 14/)).toBeTruthy()
    expect(container.querySelectorAll('span.size-2').length).toBe(0)
  })

  test('⚠️ sem o contador, o ✓ volta a ser posicional em vez de virar "0 de N"', () => {
    // A página SEMPRE calcula hoje (os marcos vêm no catálogo), mas o caminho defensivo
    // continua: prop ausente não pode inventar "nada feito" e apagar a jornada inteira.
    render(<JourneyMap journey={journey} />)

    expect(screen.queryByText(/de 6/)).toBeNull()
    expect(screen.getByText('Você está em dia!')).toBeTruthy()
  })
})
