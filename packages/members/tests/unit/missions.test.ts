import { describe, expect, test } from 'bun:test'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  CLUBE_ACCESS_REF,
  DAILY_MISSIONS,
  DAILY_SET_SIZE,
  dayBoundsUtc,
  ESTUDIO_ACCESS_REF,
  MISSIONS_BY_SLUG,
  MONTHLY_MISSIONS,
  MONTHLY_SET_SIZE,
  monthBoundsUtc,
  monthlyPeriodKey,
  WEEKLY_MISSIONS,
  WEEKLY_SET_SIZE,
  weekBoundsUtc,
  weeklyPeriodKey,
} from '../../src/domain/gamification/missions'

const ALL_ACCESS = () => true

describe('catálogo de missões', () => {
  test('slugs únicos; prêmios não-negativos; MISSIONS_BY_SLUG sem colisão', () => {
    const all = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS, ...MONTHLY_MISSIONS]
    expect(new Set(all.map((m) => m.slug)).size).toBe(all.length)
    for (const m of all) {
      expect(m.target).toBeGreaterThan(0)
      // Cosmético (quarto/avatar) dá SÓ XP (0 moeda), mas nunca prêmio zerado.
      expect(m.rewardXp + m.rewardCoins).toBeGreaterThan(0)
    }
    expect(MISSIONS_BY_SLUG.size).toBe(all.length)
  })

  test('gating por produto: Clube e Estúdio, cada goalType com a ref certa', () => {
    const all = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS, ...MONTHLY_MISSIONS]
    for (const m of all) {
      if (m.requiresAccess) {
        expect([CLUBE_ACCESS_REF, ESTUDIO_ACCESS_REF]).toContain(m.requiresAccess)
      }
      if (m.goalType === 'clube_thread') expect(m.requiresAccess).toBe(CLUBE_ACCESS_REF)
      if (m.goalType === 'studio_published' || m.goalType === 'studio_remix') {
        expect(m.requiresAccess).toBe(ESTUDIO_ACCESS_REF)
      }
    }
  })
})

describe('atribuição determinística', () => {
  test('mesmo (user, período) → MESMO set; tamanho fixo; distintos', () => {
    const a = assignDailyMissions('user-1', '2026-06-20')
    const b = assignDailyMissions('user-1', '2026-06-20')
    expect(a.map((m) => m.slug)).toEqual(b.map((m) => m.slug))
    expect(a.length).toBe(DAILY_SET_SIZE)
    expect(new Set(a.map((m) => m.slug)).size).toBe(a.length)
  })

  test('semanal e mensal têm o tamanho e a cadência certos', () => {
    const w = assignWeeklyMissions('user-1', weeklyPeriodKey('2026-06-20'), ALL_ACCESS)
    expect(w.length).toBe(WEEKLY_SET_SIZE)
    expect(w.every((m) => m.cadence === 'weekly')).toBe(true)
    const m = assignMonthlyMissions('user-1', monthlyPeriodKey('2026-06-20'), ALL_ACCESS)
    expect(m.length).toBe(MONTHLY_SET_SIZE)
    expect(m.every((x) => x.cadence === 'monthly')).toBe(true)
  })

  test('alcança subconjuntos NÃO-contíguos (não só a janela rotativa da semente)', () => {
    // Com o pool COMPLETO (5 diárias, via ALL_ACCESS), a janela contígua antiga
    // atingiria no MÁX. 5 trios; o Fisher–Yates semeado alcança C(5,3) = 10.
    const sets = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const slugs = assignDailyMissions(`user-${i}`, '2026-06-20', ALL_ACCESS)
        .map((m) => m.slug)
        .sort()
        .join(',')
      sets.add(slugs)
    }
    expect(sets.size).toBeGreaterThan(DAILY_MISSIONS.length)
  })
})

describe('gating por posse de produto', () => {
  test('sem posse (default), missão gated NUNCA é atribuída', () => {
    for (let i = 0; i < 100; i++) {
      const daily = assignDailyMissions(`u-${i}`, '2026-06-20') // default: sem posse
      expect(daily.some((m) => m.requiresAccess)).toBe(false)
    }
  })

  test('com posse do Clube, a missão gated PODE ser atribuída', () => {
    const hasClube = (ref: string) => ref === CLUBE_ACCESS_REF
    let seenGated = false
    for (let i = 0; i < 200 && !seenGated; i++) {
      const daily = assignDailyMissions(`u-${i}`, '2026-06-20', hasClube)
      if (daily.some((m) => m.requiresAccess === CLUBE_ACCESS_REF)) seenGated = true
    }
    expect(seenGated).toBe(true)
  })

  test('sem posse do Estúdio, missão de criar NUNCA entra no set semanal/mensal', () => {
    for (let i = 0; i < 100; i++) {
      const w = assignWeeklyMissions(`u-${i}`, 'w:2026-06-15')
      const m = assignMonthlyMissions(`u-${i}`, 'm:2026-06')
      expect([...w, ...m].some((x) => x.requiresAccess === ESTUDIO_ACCESS_REF)).toBe(false)
    }
  })
})

describe('garantia de 1 missão do estúdio (sorteio 2 fases)', () => {
  const hasEstudio = (ref: string) => ref === ESTUDIO_ACCESS_REF

  test('com posse do Estúdio, TODO set semanal e mensal tem ≥1 missão do estúdio', () => {
    // Sem a garantia, o Fisher–Yates uniforme daria semanas só de missões de aula —
    // estruturalmente travadas p/ quem já terminou os cursos. Varre muitos usuários.
    for (let i = 0; i < 200; i++) {
      const w = assignWeeklyMissions(`u-${i}`, 'w:2026-06-15', hasEstudio)
      const m = assignMonthlyMissions(`u-${i}`, 'm:2026-06', hasEstudio)
      expect(w.some((x) => x.requiresAccess === ESTUDIO_ACCESS_REF)).toBe(true)
      expect(m.some((x) => x.requiresAccess === ESTUDIO_ACCESS_REF)).toBe(true)
      // Tamanho e unicidade preservados pela garantia.
      expect(w.length).toBe(WEEKLY_SET_SIZE)
      expect(new Set(w.map((x) => x.slug)).size).toBe(w.length)
      expect(m.length).toBe(MONTHLY_SET_SIZE)
      expect(new Set(m.map((x) => x.slug)).size).toBe(m.length)
    }
  })

  test('determinístico: mesmo (user, período, posse) → mesmo set', () => {
    const a = assignWeeklyMissions('user-9', 'w:2026-06-15', hasEstudio)
    const b = assignWeeklyMissions('user-9', 'w:2026-06-15', hasEstudio)
    expect(a.map((x) => x.slug)).toEqual(b.map((x) => x.slug))
  })

  test('a vaga garantida varia entre as missões do estúdio (não é sempre a mesma)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const w = assignWeeklyMissions(`u-${i}`, 'w:2026-06-15', hasEstudio)
      const studio = w.find((x) => x.requiresAccess === ESTUDIO_ACCESS_REF)
      if (studio) seen.add(studio.slug)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('janelas de período (SP = UTC-3 → começa 03:00Z)', () => {
  test('dia civil → [dia 03:00Z, dia+1 03:00Z)', () => {
    const { from, to } = dayBoundsUtc('2026-06-20')
    expect(from.toISOString()).toBe('2026-06-20T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-06-21T03:00:00.000Z')
  })

  test('semana → segunda-feira da semana; janela de 7 dias', () => {
    // 2026-06-20 é sábado → segunda da semana = 2026-06-15.
    expect(weeklyPeriodKey('2026-06-20')).toBe('w:2026-06-15')
    const { from, to } = weekBoundsUtc('w:2026-06-15')
    expect(from.toISOString()).toBe('2026-06-15T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-06-22T03:00:00.000Z')
  })

  test('mês civil → chave m:YYYY-MM e janela [dia1 03:00Z, próximo mês dia1 03:00Z)', () => {
    expect(monthlyPeriodKey('2026-06-20')).toBe('m:2026-06')
    const { from, to } = monthBoundsUtc('m:2026-06')
    expect(from.toISOString()).toBe('2026-06-01T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-07-01T03:00:00.000Z')
  })

  test('mês de dezembro → overflow para janeiro do ano seguinte', () => {
    const { from, to } = monthBoundsUtc('m:2026-12')
    expect(from.toISOString()).toBe('2026-12-01T03:00:00.000Z')
    expect(to.toISOString()).toBe('2027-01-01T03:00:00.000Z')
  })
})
