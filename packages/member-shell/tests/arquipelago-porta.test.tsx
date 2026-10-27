import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvisoDaFerramenta, PortaDoArquipelago } from '../src/components/arquipelago-porta'

const porta = (estado: 'carregando' | 'indisponivel' | 'erro', publico: 'kids' | 'adulto') =>
  renderToStaticMarkup(
    <PortaDoArquipelago estado={estado} publico={publico} voltarPara="/inicio" />,
  )

describe('a porta do Arquipélago', () => {
  test('o Zappy aparece só no Kids e a voz muda por público', () => {
    expect(porta('carregando', 'kids')).toContain('/zappy/happy.webp')
    expect(porta('carregando', 'kids')).toContain('O Zappy está acendendo')
    expect(porta('carregando', 'adulto')).not.toContain('/zappy/')
    expect(porta('carregando', 'adulto')).toContain('Preparando a sua ilha.')
  })

  test('esperando não oferece botão; os outros estados levam de volta', () => {
    expect(porta('carregando', 'kids')).not.toContain('href="/inicio"')
    expect(porta('indisponivel', 'kids')).toContain('href="/inicio"')
    expect(porta('indisponivel', 'kids')).not.toContain('Tentar de novo')
    expect(porta('erro', 'adulto')).toContain('Tentar de novo')
    expect(porta('erro', 'adulto')).toContain('href="/inicio"')
  })

  test('o estado é anunciado e o texto segue as regras da casa', () => {
    for (const estado of ['carregando', 'indisponivel', 'erro'] as const)
      for (const publico of ['kids', 'adulto'] as const) {
        const html = porta(estado, publico)
        expect(html).toContain('aria-live="polite"')
        const texto = html.replace(/<[^>]+>/g, ' ')
        expect(texto).not.toContain('!')
        expect(texto).not.toContain('—')
        expect(texto).not.toContain('…')
      }
  })
})

describe('o aviso da ferramenta por cima do jogo', () => {
  test('diz qual ferramenta está abrindo, sem botão enquanto espera', () => {
    const html = renderToStaticMarkup(<AvisoDaFerramenta ferramenta="molda" falhou={false} />)
    expect(html).toContain('Abrindo o Molda')
    expect(html).toContain('role="status"')
    expect(html).not.toContain('<button')
  })

  test('na falha, avisa que o jogo ficou pausado e devolve ao jogo', () => {
    const html = renderToStaticMarkup(
      <AvisoDaFerramenta ferramenta="estudio" falhou onVoltar={() => {}} />,
    )
    expect(html).toContain('Não consegui abrir o Estúdio agora')
    expect(html).toContain('role="alert"')
    expect(html).toContain('Voltar ao jogo')
  })
})
