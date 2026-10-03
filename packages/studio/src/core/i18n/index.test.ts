import { describe, expect, it } from 'bun:test'
import { createTranslator, en, type Locale, ptBR, t, translate } from './index'

describe('i18n t()', () => {
  it('substitui placeholders {nome} pelas vars', () => {
    expect(t('projects.confirmDelete', { name: 'X' })).toContain('X')
  })

  it('cai em pt-BR (sem lançar) quando o locale está fora do enum (C1)', () => {
    const locale = 'fr-FR' as unknown as Locale
    expect(() => translate(locale, 'projects.rename')).not.toThrow()
    // Renderiza o texto pt-BR em vez da chave crua.
    expect(translate(locale, 'projects.rename')).toBe('Renomear')
    // Chave inexistente continua devolvendo a própria chave (não lança).
    expect(translate(locale, 'chave.que.nao.existe')).toBe('chave.que.nao.existe')
  })

  it('cria tradutores independentes para português e inglês', () => {
    const pt = createTranslator('pt-BR')
    const english = createTranslator('en')

    expect(pt('mode.blocks')).toBe('Blocos')
    expect(english('mode.blocks')).toBe('Blocks')
  })

  it('mantém os dicionários com as mesmas chaves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort())
  })

  it('nenhuma frase em português tem travessão', () => {
    const comTravessao = (dict: Record<string, string>) =>
      Object.entries(dict)
        .filter(([, texto]) => texto.includes('—'))
        .map(([chave]) => chave)
    // Anti-vácuo: a régua acha o travessão quando ele existe, e o dicionário veio inteiro.
    expect(comTravessao({ ok: 'Pronto.', ruim: 'Pronto — feito.' })).toEqual(['ruim'])
    expect(Object.keys(ptBR).length).toBeGreaterThan(100)
    expect(comTravessao(ptBR)).toEqual([])
  })
})
