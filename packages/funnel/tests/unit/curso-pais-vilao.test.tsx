/**
 * Página pública do guia para pais "Transformando o vilão em aliado" (`/kids/vilao-em-aliado`,
 * 18/11/2026; texto e layout novos em 21/11/2026; página de venda do funil `kids/vilao-em-aliado`
 * desde 25/11/2026): a copy segue as regras de voz do presente, não resume aula, chama o curso de
 * guia e o presente do fim continua em segredo. A copy aprovada do guia gratuito é a do modo
 * presente; a venda troca só o que falava de "gratuito".
 */
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CURSO_PAIS_VILAO,
  CURSO_PAIS_VILAO_PATH,
  CURSO_PAIS_VILAO_SLUG,
  DEPOIMENTOS_DE_PAIS,
} from '../../src/content/curso-pais-vilao'
import { resgateCopy } from '../../src/content/presente-resgate'
import { getFunnelByKey } from '../../src/funnels/registry'
import { VILAO_EM_ALIADO } from '../../src/funnels/vilao-em-aliado'
import { comPreco, guiaPaisVenda } from '../../src/funnels/vilao-em-aliado/oferta'
import BolsaResgate from '../../src/islands/BolsaResgate'

const src = (path: string) => Bun.file(new URL(`../../src/${path}`, import.meta.url)).text()
const texto = JSON.stringify([CURSO_PAIS_VILAO, DEPOIMENTOS_DE_PAIS])

const CODIGO = 'guia-pais-presente'
const oferta = {
  offerId: '44444444-4444-4444-8444-444444444444',
  offerTitle: 'Transformando o vilão em aliado',
  courseSlug: CURSO_PAIS_VILAO_SLUG,
  courseTitle: 'Transformando o vilão em aliado',
  learner: 'parents',
  accessDays: null,
  includesMural: false,
}
/** A oferta tipada como a leitura pública do referrals, para o formulário e a copy. */
const ofertaDoGuia = { ...oferta, learner: 'parents' as const }

describe('copy da página do curso para pais', () => {
  test('segue as regras de voz do presente', () => {
    expect(/[—–!]/.test(texto)).toBe(false)
    expect(/mesmo que|sem precisar|em preparação|carreira/i.test(texto)).toBe(false)
    expect(/\bsenhora?\b/i.test(texto)).toBe(false)
    expect(/\bIA\b/.test(texto)).toBe(false)
    expect(/não é [^.]{1,40}\. É /i.test(texto)).toBe(false)
    expect(CURSO_PAIS_VILAO.seoTitle.endsWith(' | Sistema Zero')).toBe(true)
  })

  test('o curso se chama guia; "Cursos para pais" só como o nome do menu', () => {
    expect(texto).not.toMatch(/\bcursos?\b(?! para pais)|minicurso/i)
    expect(CURSO_PAIS_VILAO.hero.selo).toBe('Guia gratuito para pais')
    expect(CURSO_PAIS_VILAO.seoTitle).toContain('guia gratuito para pais')
  })

  test('o presente do fim é surpresa e não há segunda oferta', () => {
    expect(texto).not.toMatch(/Cadê Todo Mundo|7 dias|sete dias|Desafio do Primeiro Jogo|cupom/i)
    expect(texto).not.toMatch(/R\$|assinatura mensal|plano anual|presente/i)
    expect(CURSO_PAIS_VILAO.hero.surpresa).toBe('Uma surpresa na última aula')
  })

  test('a página não resume aula: sem lista de aulas, cenas ou o fim da história do André', () => {
    for (const secao of ['aulas', 'porQue', 'paraQuem', 'comoFunciona', 'resgatar'])
      expect(Object.keys(CURSO_PAIS_VILAO)).not.toContain(secao)
    expect(texto).not.toMatch(/faculdade|palestr|autonomia|função executiva|porta de entrada/i)
  })

  test('diz para quem é, quantas aulas tem e que é gratuito', () => {
    expect(CURSO_PAIS_VILAO.hero.requisitos).toContain('5 a 17 anos')
    expect(CURSO_PAIS_VILAO.hero.beneficios[0]).toContain('7 aulas')
    expect(CURSO_PAIS_VILAO.hero.beneficios[1]).toBe('Gratuito, sem cartão e sem assinatura')
    expect(CURSO_PAIS_VILAO.oQueMuda.itens).toHaveLength(3)
    expect(CURSO_PAIS_VILAO_PATH).toBe('/kids/vilao-em-aliado')
  })

  test('as dúvidas falam de como fazer o guia, não de aplicar o conteúdo', () => {
    expect(CURSO_PAIS_VILAO.duvidas.itens.map((item) => item.pergunta)).toEqual([
      'Para quem é o guia?',
      'Tem que pagar alguma coisa?',
      'Onde eu assisto?',
      'Quanto tempo leva?',
      'Já tenho conta no Sistema Zero Kids. Preciso de outra?',
      'Por quanto tempo fico com o guia?',
    ])
  })

  test('depoimento só entra com texto e autor identificado', () => {
    for (const depoimento of DEPOIMENTOS_DE_PAIS) {
      expect(depoimento.texto.trim().length).toBeGreaterThan(20)
      expect(depoimento.autor.trim().length).toBeGreaterThan(3)
    }
  })

  test('as imagens existem no public', async () => {
    for (const caminho of [
      CURSO_PAIS_VILAO.oQueMuda.figura.imagem.src,
      CURSO_PAIS_VILAO.quemConduz.foto.src,
      CURSO_PAIS_VILAO.ogImage,
    ])
      expect([
        caminho,
        await Bun.file(new URL(`../../public${caminho}`, import.meta.url)).exists(),
      ]).toEqual([caminho, true])
  })
})

describe('venda do guia', () => {
  const venda = comPreco(guiaPaisVenda(7), 'R$ 27')
  const textoVenda = JSON.stringify(venda)

  test('o funil do guia é registrado com a página pública, 1 ano de acesso e Termo próprio', () => {
    expect(getFunnelByKey('kids/vilao-em-aliado')).toBe(VILAO_EM_ALIADO)
    expect(VILAO_EM_ALIADO.basePath).toBe(CURSO_PAIS_VILAO_PATH)
    expect(VILAO_EM_ALIADO.offerContract).toMatchObject({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
    })
    // Nada de prometer acesso vitalício (decisão de 25/11/2026).
    expect(VILAO_EM_ALIADO.lifetimeAccess).toBe(false)
    expect(JSON.stringify(VILAO_EM_ALIADO.legal.termos)).not.toMatch(
      /vitalíc|sem prazo|não tem prazo/i,
    )
    expect(textoVenda).not.toMatch(/vitalíc|sem prazo/i)
    expect(VILAO_EM_ALIADO.legal.termos.titulo).toContain('Transformando o vilão em aliado')
    expect(VILAO_EM_ALIADO.productSku).toBe(CURSO_PAIS_VILAO_SLUG)
  })

  test('a venda não diz gratuito e mostra o preço do catálogo', () => {
    expect(textoVenda).not.toMatch(/gratuit|de graça|sem cartão/i)
    expect(textoVenda).not.toContain('{{preco}}')
    expect(venda.hero.selo).toBe('Guia para pais')
    expect(venda.barra.titulo).toBe('R$ 27')
    expect(venda.duvidas.itens.map((item) => item.pergunta)).toContain('Quanto custa?')
    expect(venda.oferta.garantia).toContain('7 dias de garantia')
    expect(comPreco(guiaPaisVenda(null), 'R$ 27').oferta.garantia).toBeNull()
  })

  test('a venda segue as regras de voz e o presente do fim continua surpresa', () => {
    expect(/[—–!]/.test(textoVenda)).toBe(false)
    expect(/mesmo que|sem precisar|em preparação|carreira/i.test(textoVenda)).toBe(false)
    expect(textoVenda).not.toMatch(/Cadê Todo Mundo|Desafio do Primeiro Jogo|presente/i)
    expect(textoVenda).not.toMatch(/\bcursos?\b(?! para pais)|minicurso/i)
    expect(venda.hero.surpresa).toBe('Uma surpresa na última aula')
  })
})

describe('formulário do guia no modo presente', () => {
  test('o formulário é o do curso para pais: dados do adulto, sem perfil de criança', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code={CODIGO}
        referrerName="Minicurso para pais"
        communityUrl="https://kids.sistemazero.com.br"
        audience="kids"
        campaign
        gift={{ ...oferta, learner: 'parents' }}
        variante="pais"
      />,
    )
    expect(html).toContain('Estes dados são seus')
    expect(html).not.toMatch(/Mural|perfil do seu filho|Cadê/)
  })

  test('na variante guia, o formulário diz guia e não chama o guia de presente', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code={CODIGO}
        referrerName="Minicurso para pais"
        communityUrl="https://kids.sistemazero.com.br"
        audience="kids"
        campaign
        gift={ofertaDoGuia}
        variante="guia"
      />,
    )
    expect(html).toContain(
      '(mãe, pai ou responsável). Para assistir, você não precisa criar o perfil do seu filho.',
    )
    expect(html).toContain('Liberar o meu guia')
    expect(html).toContain('O guia fica na sua conta do Sistema Zero Kids, sem prazo.')
    expect(html).not.toMatch(/\bcurso\b|presente|Minicurso|Mural|Cadê|tutor/i)
  })

  test('as telas depois do envio da variante guia dizem guia; os outros cursos para pais seguem com curso', () => {
    const guia = resgateCopy('kids', ofertaDoGuia, 'guia')
    expect(guia.concluido).toMatchObject({
      titulo: 'O seu guia está liberado',
      entrar: 'Abrir o guia',
      nota: 'O guia fica na sua conta sem prazo e não gera cobrança.',
    })
    expect(guia.concluido.proximo).toContain('abra o guia em Cursos para pais')
    expect(guia.jaResgatado).toMatchObject({
      titulo: 'Este e-mail já tem o guia',
      texto: 'Entre com ele e abra o guia em Cursos para pais, na área dos pais.',
    })
    const textos = JSON.stringify([
      guia.aviso,
      guia.botao,
      guia.rodapeCampanha,
      guia.concluido.titulo,
      guia.concluido.proximo,
      guia.concluido.entrar,
      guia.concluido.nota,
      guia.jaResgatado,
    ])
    expect(textos).not.toMatch(/[—–!]|\bcurso\b|presente/i)
    expect(resgateCopy('kids', { ...ofertaDoGuia, accessDays: 30 }, 'guia').rodapeCampanha).toBe(
      'O guia fica na sua conta do Sistema Zero Kids por 30 dias.',
    )
    expect(resgateCopy('kids', ofertaDoGuia, 'pais').botao).toBe('Liberar o meu curso')
    expect(resgateCopy('adult', ofertaDoGuia, 'guia').botao).toBe(
      resgateCopy('adult', ofertaDoGuia, 'curso').botao,
    )
  })
})

describe('rota e peças da página', () => {
  test('a rota pública é a oferta do funil do guia, sem campanha fixa no código', async () => {
    const rota = await src('pages/kids/vilao-em-aliado.astro')
    expect(rota).toContain('export const prerender = false')
    expect(rota).toContain("{ audience: 'kids', produto: 'vilao-em-aliado' }")
    expect(rota).toContain('<OfertaPage {...page} />')
    expect(rota).not.toMatch(/CODIGO_DA_CAMPANHA|cursoPaisVilaoView/)
    const conteudo = await src('content/curso-pais-vilao.ts')
    expect(conteudo).not.toContain('CODIGO_DA_CAMPANHA')
    expect(
      await Bun.file(new URL('../../src/server/curso-pais-vilao.ts', import.meta.url)).exists(),
    ).toBe(false)
  })

  test('o corpo do guia: compra no topo, presente com o formulário do guia, página indexável', async () => {
    const corpo = await src('components/funnel/oferta/GuiaPaisBody.astro')
    expect(corpo).toContain('<CursoPaisOferta copy={P}')
    expect(corpo).toContain('data-checkout-cta')
    expect(corpo).toContain('formulario="guia"')
    expect(corpo).toContain('{!presente && <PreCheckoutModal')
    expect(corpo).toContain('indexavel={!presente}')
    const peca = await src('components/referrals/CursoPaisOferta.astro')
    expect(peca).toContain("variante: 'guia'")
    expect(peca).toContain('<slot name="compra" />')
    expect(peca).toContain('DEPOIMENTOS_DE_PAIS.length > 0 &&')
    expect(peca).not.toMatch(/Cadê|7 dias/)
    const formulario = peca.indexOf('<div id="resgatar"')
    expect(formulario).toBeGreaterThan(peca.indexOf('id="cpv-titulo"'))
    expect(formulario).toBeLessThan(peca.indexOf('id="o-que-muda"'))
    const layout = await src('components/referrals/PresenteLayout.astro')
    expect(layout).toContain('noindex={!indexavel}')
    expect(layout).toContain('indexavel = false')
  })

  test('a página e o Termo estão no sitemap', async () => {
    const config = await Bun.file(new URL('../../astro.config.mjs', import.meta.url)).text()
    expect(config).toContain('`${site}/kids/vilao-em-aliado`')
    expect(config).toContain('`${site}/kids/vilao-em-aliado/termos`')
  })
})
