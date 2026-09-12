import { describe, expect, it } from 'bun:test'
import { backToSection, isNavActive, NAV_ITEMS, navMatch } from '../src/components/kids/nav'

/**
 * A setinha de voltar das páginas internas (pedido dela, 11/09/2026): cada uma volta para a
 * página principal da SEÇÃO a que pertence, lida do próprio mapa do menu. Esta é a tabela
 * que ela descreveu, rota a rota, mais as regras que morderiam em silêncio: a página
 * principal não tem seta (voltaria para ela mesma) e um prefixo parecido não é a seção.
 */
describe('backToSection', () => {
  const casos: Array<[string, string, string]> = [
    ['/mural-dos-criadores', '/comunidade', 'Voltar à Comunidade'],
    ['/clube-dos-criadores', '/comunidade', 'Voltar à Comunidade'],
    ['/ranking', '/comunidade', 'Voltar à Comunidade'],
    ['/recados', '/comunidade', 'Voltar à Comunidade'],
    ['/recados/conversa-1', '/comunidade', 'Voltar à Comunidade'],
    ['/crianca/perfil-1', '/comunidade', 'Voltar à Comunidade'],
    ['/estudio', '/criar', 'Voltar para Criar'],
    ['/estudio/pro/projeto-1', '/criar', 'Voltar para Criar'],
    ['/pinta', '/criar', 'Voltar para Criar'],
    ['/pensa', '/criar', 'Voltar para Criar'],
    ['/molda', '/criar', 'Voltar para Criar'],
    ['/quarto', '/perfil', 'Voltar ao Meu espaço'],
    ['/meu-avatar', '/perfil', 'Voltar ao Meu espaço'],
    ['/cursos/trilha/faisca', '/cursos', 'Voltar ao mapa'],
    ['/cursos/desafio-do-primeiro-jogo', '/cursos', 'Voltar ao mapa'],
  ]

  it.each(casos)('%s volta para %s', (rota, href, label) => {
    expect(backToSection(rota)).toMatchObject({ href, label })
  })

  it('a página principal de cada seção não tem seta', () => {
    for (const item of NAV_ITEMS) expect(backToSection(item.href)).toBeNull()
  })

  it('um prefixo parecido não é a seção (/pintando não é o Pinta)', () => {
    expect(backToSection('/pintando')).toBeNull()
    expect(backToSection('/recadosx')).toBeNull()
  })

  it('toda seção com página interna devolve a própria frase de voltar', () => {
    // O Início não tem páginas internas (a raiz só casa exata), então fica de fora.
    const secoes = NAV_ITEMS.filter((item) => item.href !== '/')
    expect(secoes.length).toBe(4) // anti-vácuo
    for (const item of secoes) {
      expect(backToSection(`${item.href}/interna`)).toEqual({
        href: item.href,
        label: item.backLabel,
      })
    }
  })

  it('o `match` sai dos FILHOS, e não de uma lista à parte', () => {
    // Esta é a invariante do arquivo: o menu é a fonte única do mapa, e é dela que a
    // setinha de voltar deriva. Com duas listas, um destino novo entraria no accordion
    // e a volta continuaria errada, em silêncio.
    const porHref = new Map(NAV_ITEMS.map((item) => [item.href, navMatch(item)]))
    expect(porHref.get('/criar')).toEqual(['/estudio', '/pinta', '/pensa', '/molda'])
    expect(porHref.get('/comunidade')).toEqual([
      '/mural-dos-criadores',
      '/clube-dos-criadores',
      '/ranking',
    ])
    expect(porHref.get('/perfil')).toEqual(['/meu-avatar', '/quarto'])
    // A página da própria seção é um FILHO (o clique no grupo abre em vez de navegar),
    // mas não pode entrar no `match`: ela já acende pelo `href`.
    for (const item of NAV_ITEMS) expect(navMatch(item)).not.toContain(item.href)
  })

  it('todo filho pertence à seção que o contém', () => {
    for (const item of NAV_ITEMS)
      for (const child of item.children ?? [])
        expect(backToSection(child.href)?.href ?? child.href).toBe(item.href)
  })

  it('os Recados voltam para a Comunidade SEM acender a Comunidade no menu', () => {
    const comunidade = NAV_ITEMS.find((item) => item.href === '/comunidade')
    expect(comunidade).toBeDefined()
    expect(isNavActive('/recados', '/comunidade', comunidade ? navMatch(comunidade) : [])).toBe(
      false,
    )
    expect(backToSection('/recados')?.href).toBe('/comunidade')
  })
})
