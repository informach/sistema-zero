import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  espelhoDesafio,
  MODULOS_ESPELHO_DESAFIO,
  PASTA_ESPELHO_DESAFIO,
} from '../../scripts/espelho-copy-desafio'
import { TERMOS_DESAFIO } from '../../src/content/legal/termos-desafio'
import { TERMOS_DESAFIO_ADULTO } from '../../src/content/legal/termos-desafio-adulto'
import { COMUNIDADE_ADULTO } from '../../src/funnels/comunidade-adulto'
import { RELATOS } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import { DESAFIO_ADULTO } from '../../src/funnels/desafio-adulto'
import { PAGINA_DESAFIO_ADULTO } from '../../src/funnels/desafio-adulto/oferta/pagina'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import {
  PAGINA_DESAFIO_9A17,
  RELATOS_DESAFIO_9A17,
} from '../../src/funnels/desafio-primeiro-jogo/oferta/pagina-9a17'
import {
  precoDoDesafio,
  preencherPreco,
} from '../../src/funnels/desafio-primeiro-jogo/oferta/preco'
import {
  DESAFIO_OFERTAS_ANTIGAS,
  isDesafioOfertaAntiga,
} from '../../src/funnels/desafio-primeiro-jogo/offer'
import { FUNNELS, getFunnel, isDesafioFunnel } from '../../src/funnels/registry'
import { offerEnvKey } from '../../src/lib/env'

// As páginas de oferta do Desafio do Primeiro Jogo: a Kids, de 5 a 17 anos
// (`/kids/desafio-primeiro-jogo/oferta`, a única Kids desde 13/11/2026, quando a "criar junto" saiu)
// e a adulta (`/pro/desafio-primeiro-jogo/oferta`, outro funil com a MESMA oferta).
const ROOT = join(import.meta.dir, '..', '..')
const SRC = join(ROOT, 'src')
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), 'utf8')

/** Todas as strings de um objeto de copy, com o caminho de cada uma. */
function textos(valor: unknown, caminho = ''): [string, string][] {
  if (typeof valor === 'string') return [[caminho, valor]]
  if (Array.isArray(valor)) return valor.flatMap((v, i) => textos(v, `${caminho}[${i}]`))
  if (valor && typeof valor === 'object')
    return Object.entries(valor).flatMap(([k, v]) => textos(v, caminho ? `${caminho}.${k}` : k))
  return []
}

const PAGINAS = {
  '9a17': {
    modulo: PAGINA_DESAFIO_9A17,
    corpo: ler('components', 'funnel', 'oferta', 'Desafio917Body.astro'),
  },
  adulto: {
    modulo: PAGINA_DESAFIO_ADULTO,
    corpo: ler('components', 'funnel', 'oferta', 'DesafioAdultoBody.astro'),
  },
} as const

/** A razão social é a única que leva travessão (o nome jurídico da empresa). */
const RAZAO_SOCIAL = 'Informach — Núcleo de Aprendizagem Ltda.'

describe('rotas e despacho', () => {
  test('a Kids é só a /oferta; a criar-junto saiu sem redirecionar; as variantes antigas redirecionam', () => {
    for (const antiga of DESAFIO_OFERTAS_ANTIGAS) expect(isDesafioOfertaAntiga(antiga)).toBe(true)
    expect(isDesafioOfertaAntiga('criar-junto')).toBe(false)
    const rota = ler('pages', '[audience]', '[produto]', 'oferta', '[perfilOferta].astro')
    expect(rota).toContain(
      'return Astro.redirect(`/kids/desafio-primeiro-jogo/oferta${Astro.url.search}`, 301)',
    )
    expect(rota).toContain(
      "const desafioKids = kids && Astro.params.produto === 'desafio-primeiro-jogo'",
    )
    // Sem subpágina do Desafio: `/oferta/criar-junto` cai no 404 das subpáginas desconhecidas.
    expect(rota).not.toContain('isDesafioSubpagina')
    expect(rota).toContain(
      'if (!(comunidade && isComunidadeSubpagina(profile)) && !comunidadeAdulto)',
    )
    expect(existsSync(join(SRC, 'components', 'funnel', 'oferta', 'DesafioMenor9Body.astro'))).toBe(
      false,
    )
    expect(
      existsSync(join(SRC, 'funnels', 'desafio-primeiro-jogo', 'oferta', 'pagina-menor9.ts')),
    ).toBe(false)
  })

  test('o corpo vem da chave do funil e, no Kids, da página', () => {
    const oferta = ler('components', 'funnel', 'OfertaPage.astro')
    expect(oferta).toContain("corpo === 'desafio-adulto' ? (")
    expect(oferta).toContain('<DesafioAdultoBody {...bodyProps} />')
    expect(oferta).not.toContain('DesafioMenor9Body')
    expect(oferta).toContain('<Desafio917Body {...bodyProps} />')
    expect(existsSync(join(SRC, 'components', 'funnel', 'oferta', 'DesafioOfertaBody.astro'))).toBe(
      false,
    )
  })

  test('as três páginas não são cacheadas (preço e contrato conferidos a cada visita)', () => {
    expect(ler('pages', '[audience]', '[produto]', 'oferta.astro')).toContain(
      "Astro.params.produto === 'desafio-primeiro-jogo'\n    ? 'no-store'",
    )
  })
})

describe('o funil adulto tem a mesma oferta do Kids', () => {
  test('registrado depois da Comunidade adulta; os quizzes do Desafio apontam um para o outro', () => {
    const keys = Object.keys(FUNNELS)
    expect(keys.indexOf(DESAFIO_ADULTO.key)).toBeGreaterThan(keys.indexOf(COMUNIDADE_ADULTO.key))
    expect(Object.values(FUNNELS).find((f) => f.audience === 'pro')?.key).toBe(
      'pro/comunidade-dos-criadores',
    )
    expect(getFunnel('pro', 'desafio-primeiro-jogo')).toBe(DESAFIO_ADULTO)
    const quiz = ler('pages', '[audience]', '[produto]', 'quiz.astro')
    expect(quiz).toMatch(
      /const desafioAdultQuizPath = desafioAdulto\?\.steps\.quiz\s+\? `\$\{desafioAdulto\.basePath\}\/quiz`/,
    )
    expect(quiz).toContain('adultQuizPath={desafioAdultQuizPath}')
    expect(quiz).toContain('kidsQuizPath={desafioKidsQuizPath}')
    const sitemap = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8')
    expect(sitemap).toContain('`${site}/pro/desafio-primeiro-jogo/oferta`')
    expect(sitemap).toContain('`${site}/pro/desafio-primeiro-jogo/termos`')
  })

  test('mesmo contrato, mesma política de acesso, tema arcade e Termo adulto', () => {
    expect(DESAFIO_ADULTO.offerContract).toEqual(DESAFIO_PRIMEIRO_JOGO.offerContract!)
    expect(DESAFIO_ADULTO.lifetimeAccess).toBe(false)
    expect(DESAFIO_ADULTO.theme).toBe('arcade')
    expect(DESAFIO_ADULTO.steps).toEqual({
      quiz: true,
      resultado: true,
      upsell: false,
      downsell: false,
    })
    expect(DESAFIO_ADULTO.legal).toEqual({
      termos: TERMOS_DESAFIO_ADULTO,
      termsVersion: 'desafio-adulto-2026-10-21',
    })
    expect(DESAFIO_ADULTO.chargeName).toBe('Desafio do Primeiro Jogo (adultos)')
    const termo = JSON.stringify(TERMOS_DESAFIO_ADULTO)
    expect(termo).toContain('maior de 18 anos')
    expect(termo).toContain('30 (trinta) dias')
    expect(termo).toContain('7 (sete) dias')
  })

  test('isDesafioFunnel reconhece os dois Desafios e mais nada', () => {
    expect(isDesafioFunnel('kids/desafio-primeiro-jogo')).toBe(true)
    expect(isDesafioFunnel('pro/desafio-primeiro-jogo')).toBe(true)
    expect(isDesafioFunnel('pro/comunidade-dos-criadores')).toBe(false)
    expect(isDesafioFunnel(null)).toBe(false)
    // O pré-checkout não importa o registry (é ilha): reconhece os dois pela chave.
    expect(ler('islands', 'PreCheckoutModal.tsx')).toContain(
      "const isChallenge = funnel.endsWith('/desafio-primeiro-jogo')",
    )
  })

  test('a oferta vem da env, declarada no Railway e no exemplo', () => {
    const env = offerEnvKey(DESAFIO_ADULTO.key)
    expect(env).toBe('FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO')
    expect(readFileSync(join(ROOT, '..', '..', '.railway', 'variables.ts'), 'utf8')).toContain(
      `'${env}'`,
    )
    expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).toContain(
      `${env}=desafio-primeiro-jogo-adulto-30-dias`,
    )
  })

  test('a faixa do Kids é 5 a 17 na página e no SEO; o Termo segue a versão de 21/10', () => {
    expect(JSON.stringify(TERMOS_DESAFIO)).toContain(
      'A criança menor de 9 anos usa o Produto junto com o Responsável',
    )
    expect(DESAFIO_PRIMEIRO_JOGO.legal?.termsVersion).toBe('desafio-2026-10-21')
    expect(DESAFIO_PRIMEIRO_JOGO.seoDescription).toContain(
      '5 a 17 anos; abaixo de 9, com acompanhante',
    )
    const pagina = JSON.stringify(PAGINA_DESAFIO_9A17)
    expect(pagina).toContain('5 a 17 anos')
    expect(pagina).not.toMatch(/9 a 17|9 aos 17|criar-junto|menores de 9 anos também/)
    expect(PAGINA_DESAFIO_9A17.hero.selo).toContain('Habilidades cognitivas para a vida')
    expect(PAGINA_DESAFIO_9A17.treina.texto).toContain('funções executivas')
    expect(pagina).toContain('causa e consequência')
    // Os botões convidam, sem preço: o preço fica ao lado e no pagamento.
    expect(PAGINA_DESAFIO_9A17.cta).toBe('Quero ajudar meu filho')
    expect(PAGINA_DESAFIO_9A17.barra.cta).toBe('Quero ajudar meu filho')
  })
})

describe.each(Object.entries(PAGINAS))('página %s', (nome, { modulo, corpo }) => {
  test('Light Copy em toda a página; sem preço escrito à mão nem "carreira"', () => {
    for (const [caminho, texto] of textos(modulo)) {
      // As perguntas das dúvidas são perguntas de propósito, e uma fala citada ("E se o personagem
      // chegar sem a chave?") não é gancho: a regra 3 não vale para elas.
      const pergunta =
        caminho.endsWith('.pergunta') ||
        /\?["”]/.test(texto) ||
        caminho === 'oferta.jaTem' ||
        (nome === 'adulto' && ['programacao.paragrafos[1]', 'aula.paragrafos[5]'].includes(caminho))
      const regras = lintLightCopy(texto).filter((i) => !(i.rule === 3 && pergunta))
      expect([caminho, regras.map((i) => i.rule)]).toEqual([caminho, []])
      expect([caminho, /R\$\s*\d/.test(texto)]).toEqual([caminho, false])
      expect([caminho, /carreira|em prepara[cç][aã]o|mesmo que|sem precisar/i.test(texto)]).toEqual(
        [caminho, false],
      )
      expect([caminho, /!/.test(texto)]).toEqual([caminho, false])
      expect([caminho, texto.replace(RAZAO_SOCIAL, '').includes('—')]).toEqual([caminho, false])
      expect([caminho, /\bnave\b|aster[oó]ide|cinco dias|Mapa dos Pais/i.test(texto)]).toEqual([
        caminho,
        false,
      ])
    }
  })

  test('toda imagem citada existe em /public/img', () => {
    const imagens = textos(modulo)
      .filter(([caminho]) => caminho.endsWith('.src'))
      .map(([, src]) => src)
    expect(imagens.length).toBeGreaterThan(2)
    for (const src of imagens)
      expect([
        src,
        existsSync(join(ROOT, 'public', src.startsWith('/') ? src : `img/${src}`)),
      ]).toEqual([src, true])
  })

  test('CTA de compra, pré-checkout com cupom, Termo da oferta e nenhum <style>', () => {
    expect(corpo.match(/data-checkout-cta/g)?.length).toBe(nome === 'adulto' ? 1 : 2)
    expect(corpo).toContain(
      '<PreCheckoutModal client:idle basePath={f.basePath} funnel={f.key} couponCode={preco.codigo} />',
    )
    expect(corpo).toContain('const preco = precoDoDesafio(priceReais, coupon)')
    expect(corpo).toContain(`termosHref={\`${'$'}{f.basePath}/termos\`}`)
    expect(corpo).not.toContain('<style')
    // O BaseLayout já dá o `id="topo"` ao <body>: repetir no corpo quebraria o "voltar ao topo".
    expect(corpo).not.toContain('id="topo"')
  })

  test(`o espelho ${MODULOS_ESPELHO_DESAFIO[nome]?.arquivo} é exatamente a copy da página`, () => {
    const espelho = MODULOS_ESPELHO_DESAFIO[nome]!
    const doc = readFileSync(join(PASTA_ESPELHO_DESAFIO, espelho.arquivo), 'utf8')
    expect(doc).toBe(espelhoDesafio(modulo))
  })
})

describe('Kids: fala de "seu filho" e cita só relatos reais', () => {
  test('a copy Kids não presume menina (a maioria dos alunos são meninos)', () => {
    for (const [caminho, texto] of textos(PAGINA_DESAFIO_9A17))
      expect([caminho, /\bsua filha\b|\bdela\b/i.test(texto)]).toEqual([caminho, false])
  })

  test('os relatos citados existem em relatos.ts', () => {
    for (const id of RELATOS_DESAFIO_9A17) expect([id, Boolean(RELATOS[id])]).toEqual([id, true])
  })
})

/** O formatador de moeda separa "R$" com espaço inseparável. */
const espaco = <T extends object>(p: T) =>
  JSON.parse(JSON.stringify(p).replaceAll('\u00a0', ' ')) as T

describe('preço do catálogo', () => {
  test('sem cupom: o preço da oferta e menos de um trinta avos por dia', () => {
    const p = espaco(precoDoDesafio('67', { status: 'none' }))
    expect(p).toMatchObject({ preco: 'R$ 67', precoCheio: null, codigo: null, aviso: null })
    expect(p.precoDia).toBe('R$ 2,30')
    expect(preencherPreco('{{preco}} · {{preco_dia}}', p)).toBe('R$ 67 · R$ 2,30')
  })

  test('com cupom válido a página mostra o valor descontado e o cheio riscado', () => {
    const p = espaco(
      precoDoDesafio('67', {
        status: 'valid',
        code: 'FEIRA',
        listPriceCents: 6700,
        discountCents: 3000,
        finalPriceCents: 3700,
      }),
    )
    expect(p).toMatchObject({
      preco: 'R$ 37',
      precoCheio: 'R$ 67',
      codigo: 'FEIRA',
      descontoPct: 45,
    })
    expect(p.aviso).toEqual({
      texto: 'Cupom FEIRA aplicado: 45% de desconto. De R$ 67 por R$ 37.',
      alerta: false,
    })
  })

  test('com cupom de 50% sobre R$ 67 o valor mostra os centavos, como no checkout', () => {
    const p = espaco(
      precoDoDesafio('67', {
        status: 'valid',
        code: 'LAOPA131126',
        listPriceCents: 6700,
        discountCents: 3350,
        finalPriceCents: 3350,
      }),
    )
    expect(p).toMatchObject({ preco: 'R$ 33,50', precoCheio: 'R$ 67', descontoPct: 50 })
    expect(p.aviso?.texto).toBe(
      'Cupom LAOPA131126 aplicado: 50% de desconto. De R$ 67 por R$ 33,50.',
    )
  })

  test('o topo, o cartão e a barra do celular mostram o desconto só com cupom válido', () => {
    const corpo = PAGINAS['9a17'].corpo
    expect(corpo).toContain('{preco.precoCheio && preco.descontoPct && (')
    expect(corpo).toContain(
      '<span class="d9-desconto__selo">Cupom {preco.codigo} · {preco.descontoPct}% de desconto</span>',
    )
    expect(corpo).toContain('De <s>{preco.precoCheio}</s> por <strong>{preco.preco}</strong>')
    expect(corpo).toContain('<span>{preco.descontoPct}% de desconto</span>')
  })

  test('cupom que não vale avisa e segue para o checkout conferir', () => {
    const p = espaco(
      precoDoDesafio('67', { status: 'invalid', code: 'X', message: 'Cupom esgotado.' }),
    )
    expect(p).toMatchObject({ preco: 'R$ 67', precoCheio: null, codigo: 'X' })
    expect(p.aviso).toEqual({
      texto: 'Cupom esgotado. Confira o valor no checkout antes de pagar.',
      alerta: true,
    })
  })
})
