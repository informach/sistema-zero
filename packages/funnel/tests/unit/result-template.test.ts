import { describe, expect, test } from 'bun:test'
import { RESULT_PROFILES } from '../../src/content/result-profiles'
import { projetoLabel, renderTemplate } from '../../src/lib/result-template'

describe('projetoLabel', () => {
  test('mapeia tipo_criar A-D', () => {
    expect(projetoLabel('A')).toBe('um sistema pra organizar')
    expect(projetoLabel('B')).toBe('uma ferramenta de vendas')
    expect(projetoLabel('C')).toBe('uma automação')
    expect(projetoLabel('D')).toBe('um app')
  })
  test('E ou ausente → "uma ideia"', () => {
    expect(projetoLabel('E')).toBe('uma ideia')
    expect(projetoLabel(null)).toBe('uma ideia')
    expect(projetoLabel(undefined)).toBe('uma ideia')
    expect(projetoLabel('zzz')).toBe('uma ideia')
  })
})

describe('renderTemplate', () => {
  test('substitui {{projeto}}', () => {
    const out = renderTemplate('Você tem {{projeto}} em mente.', {
      projeto: 'um app',
      custoMensalCents: 0,
    })
    expect(out).toBe('Você tem um app em mente.')
  })

  test('mantém o bloco [[CUSTO]] e troca {{custo_mensal}} quando há custo (> 0)', () => {
    const out = renderTemplate('Fim. [[CUSTO]] Custa R$ {{custo_mensal}} por mês. [[/CUSTO]]', {
      projeto: 'uma ideia',
      custoMensalCents: 336000, // R$ 3.360
    })
    expect(out).toContain('Custa R$ 3.360 por mês.')
    expect(out).not.toContain('[[CUSTO]]')
    expect(out).not.toContain('{{custo_mensal}}')
  })

  test('remove o bloco [[CUSTO]] inteiro quando o custo é 0/nulo', () => {
    const tpl = 'Frase final. [[CUSTO]] Você perde R$ {{custo_mensal}} por mês. [[/CUSTO]]'
    expect(renderTemplate(tpl, { projeto: 'uma ideia', custoMensalCents: 0 })).toBe('Frase final.')
    expect(renderTemplate(tpl, { projeto: 'uma ideia', custoMensalCents: null })).toBe(
      'Frase final.',
    )
  })

  test('nunca deixa marcador cru e não duplica espaços', () => {
    const out = renderTemplate('A {{projeto}}. [[CUSTO]] x {{custo_mensal}} [[/CUSTO]] B?', {
      projeto: 'um app',
      custoMensalCents: 0,
    })
    expect(out).not.toMatch(/\{\{|\}\}|\[\[/)
    expect(out).not.toMatch(/ {2,}/)
  })

  test('todos os corpos de perfil resolvem sem marcador cru (com e sem custo)', () => {
    for (const p of Object.values(RESULT_PROFILES)) {
      // Os perfis do NCI agora usam `secoes` (blocos); falha alto se faltar.
      const secoes = p.secoes
      if (!secoes?.length) throw new Error('perfil do NCI sem secoes')
      for (const cents of [0, 250000]) {
        for (const s of secoes) {
          const out = renderTemplate(s.texto, { projeto: 'uma ideia', custoMensalCents: cents })
          expect(out).not.toMatch(/\{\{|\}\}|\[\[|\]\]/)
        }
      }
    }
  })
})
