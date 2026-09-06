import { describe, expect, test } from 'bun:test'
import { TRIAGE_KINDS as CONTRACT_TRIAGE_KINDS } from '@sistemazero/helpdesk-contracts'
import {
  TRIAGE_COLORS,
  TRIAGE_HEADER_RULES,
  TRIAGE_KINDS,
  TRIAGE_LABELS,
  triageRuleDescription,
} from '../src/lib/categories'

describe('triagem: enums e mapas do console', () => {
  test('os 6 vereditos, na ordem do contrato', () => {
    expect(TRIAGE_KINDS).toEqual(['human', 'auto_reply', 'bounce', 'bulk', 'system', 'internal'])
    expect(TRIAGE_KINDS).toBe(CONTRACT_TRIAGE_KINDS)
  })

  test('todo veredito tem rótulo e cor; nenhuma chave sobrando', () => {
    for (const kind of TRIAGE_KINDS) {
      expect(TRIAGE_LABELS[kind]).toBeTruthy()
      expect(TRIAGE_COLORS[kind]).toBeTruthy()
    }
    expect(Object.keys(TRIAGE_LABELS).sort()).toEqual([...TRIAGE_KINDS].sort())
    expect(Object.keys(TRIAGE_COLORS).sort()).toEqual([...TRIAGE_KINDS].sort())
  })

  test('rótulos canônicos', () => {
    expect(TRIAGE_LABELS.human).toBe('Atendimento')
    expect(TRIAGE_LABELS.auto_reply).toBe('Resposta automática')
    expect(TRIAGE_LABELS.bounce).toBe('Devolução')
    expect(TRIAGE_LABELS.bulk).toBe('Newsletter ou lista')
    expect(TRIAGE_LABELS.system).toBe('Sistema')
    expect(TRIAGE_LABELS.internal).toBe('Interno')
  })

  test('toda regra de cabeçalho aponta para um veredito que existe e tem descrição', () => {
    for (const entry of TRIAGE_HEADER_RULES) {
      expect(TRIAGE_KINDS).toContain(entry.kind)
      expect(entry.kind).not.toBe('human')
      expect(entry.description.length).toBeGreaterThan(10)
      expect(triageRuleDescription(entry.rule)).toBe(entry.description)
    }
  })

  test('descrição das regras de provenância e desconhecidas', () => {
    expect(triageRuleDescription('manual:promoted')).toContain('equipe')
    expect(triageRuleDescription('manual:demoted')).toContain('equipe')
    expect(triageRuleDescription('promoted:inbound')).toContain('fila')
    expect(triageRuleDescription('regra:que-nao-existe')).toBeNull()
    expect(triageRuleDescription(null)).toBeNull()
  })

  test('copy sem travessão e sem exclamação (voz sistemazero)', () => {
    const texts = [
      ...Object.values(TRIAGE_LABELS),
      ...TRIAGE_HEADER_RULES.map((entry) => entry.description),
      triageRuleDescription('manual:promoted') ?? '',
      triageRuleDescription('manual:demoted') ?? '',
      triageRuleDescription('promoted:inbound') ?? '',
    ]
    for (const text of texts) {
      expect(text).not.toContain('—')
      expect(text).not.toContain('!')
    }
  })
})
