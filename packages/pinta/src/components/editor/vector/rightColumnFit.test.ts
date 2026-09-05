import { describe, expect, it } from 'bun:test'
import { pickPanelToCollapse, touchRecent } from './rightColumnFit'

describe('touchRecent (a lista LRU da coluna direita)', () => {
  const recent = ['appearance', 'layers', 'preview', 'colors'] as const

  it('abrir manda a chave para o fim, sem repetir', () => {
    expect(touchRecent(recent, 'layers')).toEqual(['appearance', 'preview', 'colors', 'layers'])
  })

  it('chave que já é a última devolve a MESMA lista (recolher não passa por aqui)', () => {
    expect(touchRecent(recent, 'colors')).toBe(recent)
  })
})

describe('pickPanelToCollapse (accordion por medida da coluna direita)', () => {
  const recent = ['appearance', 'layers', 'preview', 'colors'] as const

  it('fecha o aberto há mais tempo (a frente da lista LRU)', () => {
    expect(pickPanelToCollapse(recent, () => true)).toBe('appearance')
  })

  it('pula quem está recolhido ou ausente da tela', () => {
    const present = new Set(['layers', 'colors'])
    expect(pickPanelToCollapse(recent, (key) => present.has(key))).toBe('layers')
  })

  it('nunca fecha o último que sobrou (o recém-aberto, por construção)', () => {
    expect(pickPanelToCollapse(recent, (key) => key === 'colors')).toBeNull()
    expect(pickPanelToCollapse(recent, () => false)).toBeNull()
  })

  it('abrir de novo manda a chave para o fim: ela vira a última a fechar', () => {
    // O chamador reordena a lista ao abrir; a régua só olha a ordem recebida.
    const reopened = [...recent.filter((k) => k !== 'appearance'), 'appearance'] as const
    expect(pickPanelToCollapse(reopened, () => true)).toBe('layers')
  })
})
