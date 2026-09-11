import { describe, expect, it } from 'bun:test'
import { backToSection, isNavActive, NAV_ITEMS } from '../src/components/kids/nav'

/**
 * A setinha de voltar das páginas internas (pedido dela, 11/09/2026): cada uma volta para a
 * página principal da SEÇÃO a que pertence, lida do próprio mapa do menu. Esta é a tabela
 * que ela descreveu, rota a rota, mais as duas regras que morderiam em silêncio: a página
 * principal não tem seta (voltaria para ela mesma) e o nome curto da seção está CONTIDO na
 * frase inteira, porque a seta das ferramentas mostra só o nome e fala a frase (WCAG 2.5.3).
 */
describe('backToSection', () => {
  const casos: Array<[string, string, string]> = [
    ['/mural-dos-criadores', '/comunidade', 'Voltar à Comunidade'],
    ['/clube-dos-criadores', '/comunidade', 'Voltar à Comunidade'],
    ['/ranking', '/comunidade', 'Voltar à Comunidade'],
    ['/recados', '/comunidade', 'Voltar à Comunidade'],
    ['/recados/conversa-1', '/comunidade', 'Voltar à Comunidade'],
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

  it('o texto curto está CONTIDO na frase inteira em toda seção com página interna', () => {
    // O Início não tem páginas internas (a raiz só casa exata), então fica de fora.
    const secoes = NAV_ITEMS.filter((item) => item.href !== '/')
    expect(secoes.length).toBe(4) // anti-vácuo
    for (const item of secoes) {
      const back = backToSection(`${item.href}/interna`)
      expect(back).not.toBeNull()
      expect(back?.label).toContain(back?.text ?? '∅')
    }
  })

  it('é o nome da seção quando a frase o contém, e a frase quando não contém', () => {
    expect(backToSection('/pinta')?.text).toBe('Criar')
    expect(backToSection('/ranking')?.text).toBe('Comunidade')
    expect(backToSection('/quarto')?.text).toBe('Meu espaço')
    // "Voltar ao mapa" não contém "Carreira": mostrar "Carreira" e falar "Voltar ao mapa"
    // quebraria o casamento entre o que se vê e o que se diz.
    expect(backToSection('/cursos/trilha/faisca')?.text).toBe('Voltar ao mapa')
  })

  it('os Recados voltam para a Comunidade SEM acender a Comunidade no menu', () => {
    const comunidade = NAV_ITEMS.find((item) => item.href === '/comunidade')
    expect(comunidade).toBeDefined()
    expect(isNavActive('/recados', '/comunidade', comunidade?.match)).toBe(false)
    expect(backToSection('/recados')?.href).toBe('/comunidade')
  })
})
