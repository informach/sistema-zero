import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { BadgeShowcase } from '../src/components/kids/badge-showcase'
import { BADGE_INFO, badgeTone } from '../src/components/kids/badges'
import { CareerTimeline } from '../src/components/kids/career-timeline'
import type { GamificationMeView } from '../src/lib/types'

/**
 * As seções do Meu perfil no desenho das telas-modelo (11/09/2026). O que se prova aqui é o
 * que o desenho promete à criança: onde ela está, qual é o próximo passo, e quais
 * conquistas já são dela.
 */

const conquistadas: Record<string, string> = {
  'first-lesson': '2026-10-02T12:00:00Z',
  'streak-7': '2026-10-07T12:00:00Z',
  'pensa-first-idea': '2026-10-02T14:00:00Z',
}

function gamificacao(): GamificationMeView {
  return {
    xp: 565,
    streak: { current: 10, best: 10, activeToday: true },
    badges: Object.keys(BADGE_INFO).map((slug) => ({
      slug,
      unlockedAt: conquistadas[slug] ?? null,
    })),
    level: {
      slug: 'noob',
      next: 'coder',
      remaining: {
        any: 1,
        'primeiros-passos-2d': 1,
        'iniciante-2d': 0,
        'iniciante-3d': 0,
        'intermediario-2d': 0,
        'intermediario-3d': 0,
        'avancado-2d': 0,
        'avancado-3d': 0,
      },
    },
  }
}

describe('Minha carreira', () => {
  test('marca o posto atual e só o seguinte como "Próximo nível"', () => {
    // Catálogo desconhecido (`null`) desenha a escada inteira.
    render(<CareerTimeline gamification={gamificacao()} courses={null} />)
    expect(screen.getAllByText('Você está aqui')).toHaveLength(1)
    expect(screen.getAllByText('Próximo nível')).toHaveLength(1)
    // O nome do posto sai do LEVEL_INFO, nunca da tela-modelo.
    expect(screen.getByText('Faísca')).toBeTruthy()
    expect(screen.getByText('Construtor(a)')).toBeTruthy()
  })

  test('feitos universais e bônus dos apps em grupos separados', () => {
    render(<CareerTimeline gamification={gamificacao()} courses={null} />)
    expect(screen.getByText('Feitos da jornada')).toBeTruthy()
    expect(screen.getByText('Bônus dos apps criativos')).toBeTruthy()
    expect(screen.getByText('Semana em chamas')).toBeTruthy()
    expect(screen.getByText('Ideia brilhante')).toBeTruthy()
  })
})

describe('Minhas conquistas', () => {
  test('mostra o catálogo inteiro e data só nas conquistadas', () => {
    render(<BadgeShowcase gamification={gamificacao()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(Object.keys(BADGE_INFO).length)
    expect(screen.getAllByText(/^Conquistada em/)).toHaveLength(3)
    expect(screen.getByText('565 XP')).toBeTruthy()
    expect(screen.getByText(/Recorde: 10/)).toBeTruthy()
  })
})

describe('badgeTone', () => {
  test('toda conquista do catálogo ganha um ladrilho com fundo e tinta', () => {
    for (const slug of Object.keys(BADGE_INFO)) {
      const tom = badgeTone(slug)
      expect(tom.fundo).toMatch(/^var\(--/)
      expect(tom.tinta).toMatch(/^var\(--/)
    }
  })

  test('a família decide a cor: fogo, nota e aula não se confundem', () => {
    expect(badgeTone('streak-7')).not.toEqual(badgeTone('quiz-perfect'))
    expect(badgeTone('quiz-perfect')).not.toEqual(badgeTone('first-lesson'))
    expect(badgeTone('streak-7')).toEqual(badgeTone('streak-365'))
  })
})
