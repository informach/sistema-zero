import { describe, expect, it } from 'bun:test'
import { NAV_ITEMS, type NavItem, openGroupFor, visibleChildren } from '../src/components/kids/nav'

const item = (href: string): NavItem => {
  const found = NAV_ITEMS.find((nav) => nav.href === href)
  if (!found) throw new Error(`sem item ${href}`)
  return found
}
const rotulos = (href: string, tools: Parameters<typeof visibleChildren>[1]) =>
  visibleChildren(item(href), tools).map((child) => child.label)

describe('o que o menu oferece', () => {
  it('mostra só as ferramentas que a criança pode abrir', () => {
    // A régua é a mesma da página de destino: o menu não leva a porta trancada.
    expect(rotulos('/criar', ['estudio-completo', 'pinta'])).toEqual([
      'Meus trabalhos',
      'Estúdio',
      'Pinta',
    ])
    expect(rotulos('/criar', [])).toEqual(['Meus trabalhos'])
  })

  it('sem o dado de posse, mostra TODAS (fail-open)', () => {
    // Um soluço de rede não pode encolher o menu na cara da criança; a página de
    // destino já tem a tela de "tente de novo".
    expect(rotulos('/criar', null)).toEqual([
      'Meus trabalhos',
      'Estúdio',
      'Pinta',
      'Pensa',
      'Molda',
    ])
  })

  it('Meu espaço e Comunidade não dependem de posse', () => {
    expect(rotulos('/perfil', [])).toEqual(['Meu perfil', 'Meu avatar', 'Meu quarto'])
    expect(rotulos('/comunidade', [])).toEqual([
      'Nossa turma',
      'Mural dos Criadores',
      'Clube dos Criadores',
      'Ranking',
    ])
  })

  it('Início e Carreira continuam links simples', () => {
    expect(visibleChildren(item('/'), null)).toEqual([])
    expect(visibleChildren(item('/cursos'), null)).toEqual([])
  })
})

describe('qual grupo fica aberto', () => {
  it('por padrão, o da página em que a criança está', () => {
    // É o que devolve o atalho: no Estúdio, o Pinta fica a UM clique.
    expect(openGroupFor('/estudio', null)).toBe('/criar')
    expect(openGroupFor('/pinta', null)).toBe('/criar')
    expect(openGroupFor('/quarto', null)).toBe('/perfil')
    expect(openGroupFor('/mural-dos-criadores', null)).toBe('/comunidade')
  })

  it('a escolha da criança vence enquanto ela não navega', () => {
    expect(openGroupFor('/estudio', '/perfil')).toBe('/perfil')
  })

  it('fora de qualquer seção, nenhum grupo abre', () => {
    // Os Recados voltam para a Comunidade pela setinha, mas não acendem o menu — e
    // também não devem abrir o grupo dela.
    expect(openGroupFor('/recados', null)).toBeNull()
  })

  it('na Carreira e no Início não há grupo a abrir', () => {
    expect(openGroupFor('/', null)).toBe('/')
    expect(openGroupFor('/cursos', null)).toBe('/cursos')
  })
})
