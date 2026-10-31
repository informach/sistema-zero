import { describe, expect, test } from 'bun:test'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvisoDaFerramenta, PortaDoArquipelago } from '../src/components/arquipelago-porta'

const porta = (estado: 'carregando' | 'indisponivel' | 'erro') =>
  renderToStaticMarkup(<PortaDoArquipelago estado={estado} voltarPara="/inicio" />)

const sha = (html: string) => {
  const normalized = (['happy', 'sleeping', 'thinking'] as const).reduce(
    (result, expression) =>
      result.replaceAll(BUILTIN_ART[expression].poster.url, `/zappy/${expression}.webp`),
    html,
  )
  return new Bun.CryptoHasher('sha256').update(normalized).digest('hex')
}

describe('a porta do Arquipélago no Kids', () => {
  test('o Zappy acende o caminho', () => {
    expect(porta('carregando')).toContain(BUILTIN_ART.happy.poster.url)
    expect(porta('carregando')).toContain('O Zappy está acendendo')
  })

  test('esperando não oferece botão; os outros estados levam de volta', () => {
    expect(porta('carregando')).not.toContain('href="/inicio"')
    expect(porta('indisponivel')).toContain('href="/inicio"')
    expect(porta('indisponivel')).not.toContain('Tentar de novo')
    expect(porta('erro')).toContain('Tentar de novo')
    expect(porta('erro')).toContain('href="/inicio"')
  })

  test('a troca da arte preserva a estrutura e os textos da porta', () => {
    // Compare a estrutura histórica, normalizando apenas a URL da reserva substituída.
    expect(sha(porta('carregando'))).toBe(
      '7f0a02f66a807e938e00885aafe4bc527af12ee4b04a604cdf6c2de63d7ef2eb',
    )
    expect(sha(porta('indisponivel'))).toBe(
      'aed6b23e5694de61c74323555f090aa877a9c7a7a675e350f1a166f6e30b58ee',
    )
    expect(sha(porta('erro'))).toBe(
      '8bf58a046f9234780328b6439b79b559847378b9b0d6bc537539bd0d388c4374',
    )
    expect(sha(renderToStaticMarkup(<AvisoDaFerramenta ferramenta="molda" falhou={false} />))).toBe(
      '43592e673078f18f6a003c4de5632231cc04e12a645b49e316e9e76243a73214',
    )
    expect(
      sha(
        renderToStaticMarkup(<AvisoDaFerramenta ferramenta="estudio" falhou onVoltar={() => {}} />),
      ),
    ).toBe('3994f65417f3b016afd591cad039a453ae49dce85ffc942a86f53b4b95c08637')
  })

  test('o estado é anunciado e o texto segue as regras da casa', () => {
    for (const estado of ['carregando', 'indisponivel', 'erro'] as const) {
      const html = porta(estado)
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
