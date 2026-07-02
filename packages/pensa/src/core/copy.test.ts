import { describe, expect, it } from 'bun:test'
import { friendlyErrorMessage, getCopy, versionLabel } from './copy'
import { PensaApiError } from './types'

describe('copy centralizada', () => {
  it('nomes kids das etapas seguem o contrato', () => {
    const copy = getCopy('kids')
    expect(copy.stages.z.name).toBe('Zerar a Bagunça')
    expect(copy.stages.e.name).toBe('Enxergar o Jogo')
    expect(copy.stages.r.name).toBe('Rodar as Missões')
    expect(copy.stages.o.name).toBe('O Grande Lançamento')
  })

  it('nomes adult usam os títulos originais da metodologia', () => {
    const copy = getCopy('adult')
    expect(copy.stages.z.name).toBe('Zerar a Confusão')
    expect(copy.stages.e.name).toBe('Esboçar o Sistema')
    expect(copy.stages.r.name).toBe('Rodar por Partes')
    expect(copy.stages.o.name).toBe('Operar de Verdade')
  })

  it('colunas do kanban kids seguem o contrato', () => {
    const copy = getCopy('kids')
    expect(copy.kanban.backlog).toBe('Missões')
    expect(copy.kanban.doing).toBe('Fazendo agora')
    expect(copy.kanban.review).toBe('Hora de testar')
    expect(copy.kanban.done).toBe('Prontas')
  })

  it('ciclos são "Versão N"', () => {
    expect(versionLabel(1)).toBe('Versão 1')
    expect(versionLabel(3)).toBe('Versão 3')
  })

  it('nenhuma copy usa travessão nem jargão técnico', () => {
    for (const mode of ['kids', 'adult'] as const) {
      const text = JSON.stringify(getCopy(mode))
      expect(text).not.toContain('—')
      expect(text).not.toContain('PRD')
      expect(text).not.toContain('MVP')
    }
  })

  it('friendlyErrorMessage mapeia códigos de domínio p/ texto gentil', () => {
    const quota = friendlyErrorMessage(new PensaApiError('quota', 409, 'PENSA_QUOTA_EXCEEDED'))
    expect(quota).toContain('Arquive')
    const generic = friendlyErrorMessage(new Error('boom'))
    expect(generic.length).toBeGreaterThan(0)
    // Nunca vaza a mensagem técnica crua.
    expect(generic).not.toContain('boom')
  })

  it('friendlyErrorMessage aceita erro duck-typed {status, code} (host via dynamic import)', () => {
    const duck = Object.assign(new Error('403'), { status: 403, code: 'ACCESS_DENIED' })
    expect(friendlyErrorMessage(duck)).toContain('acesso')
    expect(friendlyErrorMessage(duck)).not.toContain('403')
  })
})
