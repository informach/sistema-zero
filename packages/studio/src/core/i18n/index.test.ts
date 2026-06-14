import { afterEach, describe, expect, it } from 'bun:test'
import { getLocale, type Locale, setLocale, t } from './index'

describe('i18n t()', () => {
  afterEach(() => {
    // `currentLocale` é um singleton de módulo (ver index.ts) — restaura para não
    // vazar para os próximos arquivos da suíte.
    setLocale('pt-BR')
  })

  it('substitui placeholders {nome} pelas vars', () => {
    expect(t('projects.confirmDelete', { name: 'X' })).toContain('X')
  })

  it('cai em pt-BR (sem lançar) quando o locale está fora do enum (C1)', () => {
    // Host sem tipagem seta um locale desconhecido; t() não pode estourar
    // TypeError ao indexar DICT[locale-inexistente].
    setLocale('fr-FR' as unknown as Locale)
    expect(getLocale() as string).toBe('fr-FR')
    expect(() => t('projects.rename')).not.toThrow()
    // Renderiza o texto pt-BR em vez da chave crua.
    expect(t('projects.rename')).toBe('Renomear')
    // Chave inexistente continua devolvendo a própria chave (não lança).
    expect(t('chave.que.nao.existe')).toBe('chave.que.nao.existe')
  })
})
