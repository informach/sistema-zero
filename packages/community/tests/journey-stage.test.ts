import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JourneyRibbon, StageChip, StageFace } from '../src/components/community/journey/stage'
import {
  normalizeJourney,
  STAGE_COLOR_COUNT,
  stageBadgeOf,
  stageColor,
  stageLabel,
  stageShortLabel,
} from '../src/lib/journey-stage'

/**
 * A cor da etapa da jornada adulta (19/10/2026): a cor vem da POSIÇÃO e é a mesma do nível de mesma
 * posição no Kids; o nome da etapa vem sempre escrito junto; a última posição é a Lenda.
 */

const stage = (position: number, total = 8, title: string | null = `Etapa ${position}`) => ({
  position,
  total,
  title,
})

const view = (completed: boolean[]) => ({
  audience: 'adult' as const,
  policyVersion: 1,
  configured: completed.length > 0,
  capabilities: [],
  stages: completed.map((done, index) => ({
    id: `etapa-${index + 1}`,
    title: `Nome ${index + 1}`,
    completed: done,
    available: index === 0 || completed[index - 1] === true,
    requirements: [],
    missing: [],
    capabilities: [],
  })),
})

describe('a cor e o nome da etapa', () => {
  test('a cor vem da posição; a última posição é sempre a Lenda, em dourado', () => {
    expect(stageColor(stage(1))).toBe('var(--etapa-1)')
    expect(stageColor(stage(3))).toBe('var(--etapa-3)')
    expect(stageColor(stage(7))).toBe('var(--etapa-7)')
    expect(stageColor(stage(8, 8, null))).toBe('var(--etapa-lenda)')
    // Jornada mais curta: a Lenda continua dourada, as outras não mudam de cor.
    expect(stageColor(stage(4, 4, null))).toBe('var(--etapa-lenda)')
    expect(stageColor(stage(3, 4))).toBe('var(--etapa-3)')
    // Mais de 7 etapas: a lista de cores volta ao começo.
    expect(stageColor(stage(STAGE_COLOR_COUNT + 1, 12))).toBe('var(--etapa-1)')
  })

  test('o nome vem escrito: "Etapa 3 de 8 · Inventor(a)" e "Lenda · jornada completa"', () => {
    expect(stageLabel(stage(3, 8, 'Inventor(a)'))).toBe('Etapa 3 de 8 · Inventor(a)')
    expect(stageShortLabel(stage(3))).toBe('Etapa 3 de 8')
    expect(stageLabel(stage(8, 8, null))).toBe('Lenda · jornada completa')
    expect(stageShortLabel(stage(8, 8, null))).toBe('Lenda')
  })

  test('a etapa atual é a primeira não concluída; sem jornada, nada', () => {
    expect(stageBadgeOf(view([true, false, false]))).toEqual({
      position: 2,
      total: 4,
      title: 'Nome 2',
    })
    expect(stageBadgeOf(view([true, true]))).toEqual({ position: 3, total: 3, title: null })
    expect(stageBadgeOf(view([]))).toBeNull()
    expect(stageBadgeOf(undefined)).toBeNull()
  })

  test('um members anterior sem requirements/capabilities não quebra a tela', () => {
    const antigo = view([true, false]) as unknown as {
      stages: Record<string, unknown>[]
    }
    for (const stage of antigo.stages) {
      delete stage.requirements
      delete stage.capabilities
    }
    const normal = normalizeJourney(antigo as unknown as ReturnType<typeof view>)
    expect(normal.stages.every((stage) => Array.isArray(stage.requirements))).toBe(true)
    expect(normal.stages.every((stage) => Array.isArray(stage.capabilities))).toBe(true)
    expect(normalizeJourney(undefined)).toBeUndefined()
  })

  test('todo token de cor existe no globals.css (e é o mesmo do Kids nas cores da marca)', () => {
    const css = readFileSync(join(import.meta.dir, '..', 'src', 'app', 'globals.css'), 'utf8')
    for (let position = 1; position <= STAGE_COLOR_COUNT; position++)
      expect(css).toContain(`--etapa-${position}:`)
    expect(css).toContain('--etapa-lenda:')
    expect(css).toContain('--etapa-lenda-tinta:')
    const kids = readFileSync(
      join(import.meta.dir, '..', '..', 'community-kids', 'src', 'app', 'globals.css'),
      'utf8',
    )
    // As cinco cores literais do Kids aparecem iguais aqui (as duas da marca vêm de tokens).
    for (const value of [
      'oklch(0.55 0.02 255)',
      'oklch(0.5 0.14 195)',
      'oklch(0.5 0.2 300)',
      'oklch(0.48 0.16 356)',
      'oklch(0.45 0.19 265)',
      'oklch(0.66 0.16 75)',
    ]) {
      expect(kids).toContain(value)
      expect(css).toContain(value)
    }
  })
})

describe('as peças', () => {
  test('o chip escreve a etapa; a cor nunca é a única pista', () => {
    const html = renderToStaticMarkup(
      createElement(StageChip, { badge: stage(3, 8, 'Inventor(a)') }),
    )
    expect(html).toContain('Etapa 3 de 8 · Inventor(a)')
    expect(html).toContain('--etapa-cor:var(--etapa-3)')
  })

  test('a fita descreve a jornada inteira para o leitor de tela', () => {
    const html = renderToStaticMarkup(createElement(JourneyRibbon, { badge: stage(3) }))
    expect(html).toContain('role="img"')
    expect(html).toContain('Etapa 3 de 8: etapas 1 e 2 concluídas, etapa 3 em andamento')
    expect(html).toContain('etapas 4 a 8 à frente')
    expect(html.match(/data-estado="feita"/g)).toHaveLength(2)
    expect(html.match(/data-estado="atual"/g)).toHaveLength(1)
    expect(html.match(/data-estado="futura"/g)).toHaveLength(5)
    const done = renderToStaticMarkup(createElement(JourneyRibbon, { badge: stage(8, 8, null) }))
    expect(done).toContain('Jornada completa: as 7 etapas concluídas.')
    const one = renderToStaticMarkup(createElement(JourneyRibbon, { badge: stage(2, 2, null) }))
    expect(one).toContain('Jornada completa: a etapa concluída.')
    expect(done.match(/data-estado="feita"/g)).toHaveLength(8)
  })

  test('a foto com o anel; sem foto, as iniciais; sem etapa, sem anel', () => {
    const withRing = renderToStaticMarkup(
      createElement(StageFace, {
        name: 'Rita Lima',
        photoUrl: 'https://cdn.exemplo/rita.png',
        badge: stage(2),
      }),
    )
    expect(withRing).toContain('sz-etapa-anel')
    expect(withRing).toContain('alt=""')
    const initials = renderToStaticMarkup(
      createElement(StageFace, { name: 'Rita Lima', badge: null }),
    )
    expect(initials).not.toContain('sz-etapa-anel')
    expect(initials).toContain('>RL<')
  })
})
