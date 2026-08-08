import { describe, expect, test } from 'bun:test'
import {
  type AiCreditsView,
  aiCreditsLowThreshold,
  aiQuotaScopeOf,
  diaCivilPorExtenso,
  isAiQuotaError,
  resolveAiCredits,
} from './credits'

function view(patch: Partial<AiCreditsView> = {}): AiCreditsView {
  return {
    dayLimit: 50,
    dayRemaining: 30,
    monthLimit: 500,
    monthRemaining: 300,
    monthRenewsOn: '2026-09-01',
    ...patch,
  }
}

describe('resolveAiCredits — estados', () => {
  test('sem dado é "não sei", NUNCA zero', () => {
    for (const entrada of [null, undefined, {}, { dayRemaining: 3 }]) {
      const meter = resolveAiCredits(entrada as AiCreditsView | null)
      expect(meter.state).toBe('unknown')
      expect(meter.inline).toBe('')
    }
  })

  test('equipe vem sem limite e nem olha os números', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 0, monthRemaining: 0, unlimited: true }))
    expect(meter.state).toBe('unlimited')
    expect(meter.inline).toBe('✨ ideias sem limite')
  })

  test('com folga o medidor é discreto', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 13 }))
    expect(meter.state).toBe('plenty')
    expect(meter.inline).toBe('✨ 13 ideias hoje')
  })

  test('a fronteira do "está acabando" no dia é 5', () => {
    expect(resolveAiCredits(view({ dayRemaining: 6 })).state).toBe('plenty')
    expect(resolveAiCredits(view({ dayRemaining: 5 })).state).toBe('low')
    expect(resolveAiCredits(view({ dayRemaining: 1 })).state).toBe('low')
    expect(resolveAiCredits(view({ dayRemaining: 0 })).state).toBe('exhausted')
  })

  test('a fronteira do mês é 25', () => {
    expect(resolveAiCredits(view({ dayRemaining: 50, monthRemaining: 26 })).state).toBe('plenty')
    expect(resolveAiCredits(view({ dayRemaining: 50, monthRemaining: 25 })).state).toBe('low')
  })

  test('acabando, o medidor já diz quando volta', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 2 }))
    expect(meter.inline).toBe('⚠️ Só 2 ideias hoje! Amanhã de manhã tem mais.')
  })

  test('uma ideia só fica no singular', () => {
    expect(resolveAiCredits(view({ dayRemaining: 1 })).inline).toContain('1 ideia hoje')
    expect(resolveAiCredits(view({ dayRemaining: 2 })).inline).toContain('2 ideias hoje')
  })
})

describe('resolveAiCredits — qual teto manda na copy', () => {
  test('sobrando mais mês que dia, a conversa é sobre hoje', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 13, monthRemaining: 400 }))
    expect(meter.scope).toBe('day')
    expect(meter.inline).toContain('hoje')
  })

  test('sobrando menos mês que dia, a conversa vira o mês', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 13, monthRemaining: 3 }))
    expect(meter.scope).toBe('month')
    expect(meter.inline).toContain('este mês')
    expect(meter.inline).toContain('1º de setembro')
  })

  test('no EMPATE vence o mês: prometer "amanhã" ali seria mentira', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 3, monthRemaining: 3 }))
    expect(meter.scope).toBe('month')
    expect(meter.inline).not.toContain('Amanhã')
  })

  test('tudo zerado fala do mês, não do dia', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 0, monthRemaining: 0 }))
    expect(meter.scope).toBe('month')
    expect(meter.exhausted).toContain('1º de setembro')
  })

  test('dia zerado com mês sobrando promete o amanhã', () => {
    const meter = resolveAiCredits(view({ dayRemaining: 0, monthRemaining: 200 }))
    expect(meter.scope).toBe('day')
    expect(meter.exhausted).toContain('Amanhã de manhã')
  })
})

describe('copy do "acabou"', () => {
  test('explica que o bolso é da família', () => {
    for (const patch of [{ dayRemaining: 0 }, { dayRemaining: 0, monthRemaining: 0 }]) {
      const meter = resolveAiCredits(view(patch))
      expect(meter.exhausted).toContain('de toda a família')
      expect(meter.exhausted).toContain('vocês dividem')
    }
  })

  test('o rótulo de leitor de tela também menciona a família', () => {
    expect(resolveAiCredits(view({ dayRemaining: 13 })).ariaLabel).toContain('de toda a família')
  })

  test('nenhuma frase usa travessão nem jargão de IA', () => {
    const casos: Partial<AiCreditsView>[] = [
      { dayRemaining: 13 },
      { dayRemaining: 2 },
      { dayRemaining: 0 },
      { dayRemaining: 0, monthRemaining: 0 },
      { dayRemaining: 13, monthRemaining: 3 },
      { unlimited: true },
    ]
    for (const patch of casos) {
      const meter = resolveAiCredits(view(patch))
      const texto = [meter.inline, meter.ariaLabel, meter.exhausted, meter.renews].join(' ')
      expect(texto).not.toContain('—')
      for (const jargao of ['crédito', 'token', 'modelo', 'quota', 'limite de IA']) {
        expect(texto.toLowerCase()).not.toContain(jargao)
      }
    }
  })
})

describe('helpers', () => {
  test('data civil vira dia por extenso', () => {
    expect(diaCivilPorExtenso('2026-09-01')).toBe('1º de setembro')
    expect(diaCivilPorExtenso('2026-12-12')).toBe('12 de dezembro')
    expect(diaCivilPorExtenso('2027-01-01')).toBe('1º de janeiro')
  })

  test('o piso do aviso acompanha tetos menores', () => {
    expect(aiCreditsLowThreshold('day', 50)).toBe(5)
    expect(aiCreditsLowThreshold('day', 200)).toBe(20)
    expect(aiCreditsLowThreshold('month', 500)).toBe(25)
    expect(aiCreditsLowThreshold('month', 1000)).toBe(50)
  })

  test('reconhece a recusa por quota vinda de outro pacote', () => {
    expect(isAiQuotaError({ code: 'AI_QUOTA_EXCEEDED' })).toBe(true)
    expect(isAiQuotaError(new Error('qualquer'))).toBe(false)
    expect(isAiQuotaError(null)).toBe(false)
    expect(aiQuotaScopeOf({ code: 'AI_QUOTA_EXCEEDED', scope: 'month' })).toBe('month')
    expect(aiQuotaScopeOf({ code: 'AI_QUOTA_EXCEEDED' })).toBe('day')
  })
})
