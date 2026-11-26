/**
 * Curso para pais "Como ajudar seu filho autista a lidar com frustrações e evitar crises"
 * (`/kids/como-ajudar-seu-filho-autista-nas-frustracoes`, 25/11/2026), com a psicóloga Vivianne
 * Lima: página de venda do funil, modo presente, Termo, painel do embaixador e pontos de extensão.
 */
import { describe, expect, test } from 'bun:test'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import { analyticsPage } from '../../src/analytics/page-context'
import {
  CURSO_PAIS_AUTISMO_PRESENTE,
  CURSO_PAIS_AUTISMO_SLUG,
  DEPOIMENTOS_CURSO_AUTISMO,
} from '../../src/content/curso-pais-autismo'
import { opcaoDeOferta } from '../../src/content/embaixador'
import { AUTISMO_FRUSTRACOES } from '../../src/funnels/autismo-frustracoes'
import { cursoAutismoVenda } from '../../src/funnels/autismo-frustracoes/oferta'
import {
  apelidoDoProduto,
  funnelForGiftCourse,
  funnelsByApelido,
  getFunnelByKey,
} from '../../src/funnels/registry'
import { comPreco } from '../../src/funnels/vilao-em-aliado/oferta'
import { isRateLimitedGetPath } from '../../src/lib/rate-limit-paths'

const src = (path: string) => Bun.file(new URL(`../../${path}`, import.meta.url)).text()
const PATH = '/kids/como-ajudar-seu-filho-autista-nas-frustracoes'
const venda = comPreco(cursoAutismoVenda(7), 'R$ 67')

/** Todos os textos de uma copy, sem as perguntas das dúvidas (a pergunta é legítima ali). */
function textos(valor: unknown, chave = ''): string[] {
  if (typeof valor === 'string') return chave === 'pergunta' || chave === 'src' ? [] : [valor]
  if (Array.isArray(valor)) return valor.flatMap((item) => textos(item))
  if (valor && typeof valor === 'object')
    return Object.entries(valor).flatMap(([k, item]) => textos(item, k))
  return []
}

describe('copy do curso da Vivianne', () => {
  test('Light Copy em todos os textos, nos dois modos', () => {
    for (const copy of [CURSO_PAIS_AUTISMO_PRESENTE, venda]) {
      for (const texto of textos(copy)) {
        expect(/[—–!]/.test(texto)).toBe(false)
        expect([texto, lintLightCopy(texto).map((i) => i.rule)]).toEqual([texto, []])
      }
      expect(copy.seoTitle.endsWith(' | Sistema Zero')).toBe(true)
    }
  })

  test('cita a Vivianne, psicóloga da Laopa, e diz que não substitui o acompanhamento', () => {
    const tudo = JSON.stringify(venda)
    expect(tudo).toContain('Vivianne Lima, da Laopa')
    expect(venda.quemConduz.titulo).toContain('psicóloga Vivianne Lima')
    expect(venda.duvidas.itens.map((i) => i.pergunta)).toContain(
      'O curso substitui o acompanhamento do meu filho?',
    )
  })

  test('nunca promete acabar com as crises nem acesso vitalício', () => {
    for (const copy of [CURSO_PAIS_AUTISMO_PRESENTE, venda]) {
      const tudo = JSON.stringify(copy)
      expect(tudo).not.toMatch(/acabar com|nunca mais|sem crises|cura|vitalíc|sem prazo/i)
      expect(tudo).not.toMatch(/hiperfoco|foco intenso|interesse intenso/i)
    }
  })

  test('sem presente no fim do curso: nada de selo da surpresa', () => {
    expect(CURSO_PAIS_AUTISMO_PRESENTE.hero.surpresa).toBe('')
    expect(venda.hero.surpresa).toBe('')
  })

  test('a venda mostra o preço do catálogo, 1 ano e a garantia da oferta', () => {
    const tudo = JSON.stringify(venda)
    expect(tudo).not.toContain('{{preco}}')
    expect(tudo).not.toMatch(/gratuit|de graça|sem cartão|presente/i)
    expect(venda.barra.titulo).toBe('R$ 67')
    expect(venda.hero.beneficios[1]).toBe('Pagamento único, com 1 ano de acesso')
    expect(venda.oferta.garantia).toContain('7 dias de garantia')
    expect(comPreco(cursoAutismoVenda(null), 'R$ 67').oferta.garantia).toBeNull()
    // A assinatura Kids inclui os cursos para pais.
    expect(venda.duvidas.itens.at(-1)?.resposta).toContain('inclui os cursos para pais')
  })

  test('o modo presente não fala de preço', () => {
    expect(JSON.stringify(CURSO_PAIS_AUTISMO_PRESENTE)).not.toMatch(/R\$|\{\{preco\}\}|pagamento/i)
  })

  test('depoimento só entra com texto e autor identificado', () => {
    for (const depoimento of DEPOIMENTOS_CURSO_AUTISMO) {
      expect(depoimento.texto.trim().length).toBeGreaterThan(20)
      expect(depoimento.autor.trim().length).toBeGreaterThan(3)
    }
  })

  test('as imagens existem no public', async () => {
    for (const caminho of [
      CURSO_PAIS_AUTISMO_PRESENTE.oQueMuda.figura.imagem.src,
      CURSO_PAIS_AUTISMO_PRESENTE.quemConduz.foto.src,
      CURSO_PAIS_AUTISMO_PRESENTE.ogImage,
      `${AUTISMO_FRUSTRACOES.imagesBase}/${AUTISMO_FRUSTRACOES.checkoutImage}`,
    ])
      expect([
        caminho,
        await Bun.file(new URL(`../../public${caminho}`, import.meta.url)).exists(),
      ]).toEqual([caminho, true])
  })
})

describe('funil do curso da Vivianne', () => {
  test('registrado com a página pública, 1 ano de acesso, Termo próprio e apelido', () => {
    expect(getFunnelByKey('kids/como-ajudar-seu-filho-autista-nas-frustracoes')).toBe(
      AUTISMO_FRUSTRACOES,
    )
    expect(AUTISMO_FRUSTRACOES.basePath).toBe(PATH)
    expect(AUTISMO_FRUSTRACOES.productSku).toBe(CURSO_PAIS_AUTISMO_SLUG)
    expect(AUTISMO_FRUSTRACOES.offerContract).toMatchObject({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
    })
    expect(AUTISMO_FRUSTRACOES.lifetimeAccess).toBe(false)
    expect(funnelsByApelido('frustracoes')).toEqual([AUTISMO_FRUSTRACOES])
    expect(apelidoDoProduto(CURSO_PAIS_AUTISMO_SLUG)).toBe('frustracoes')
    // Uma página por curso: o presente do curso abre aqui; o adulto não tem página.
    expect(funnelForGiftCourse(CURSO_PAIS_AUTISMO_SLUG, 'kids')).toBe(AUTISMO_FRUSTRACOES)
    expect(funnelForGiftCourse(CURSO_PAIS_AUTISMO_SLUG, 'adult')).toBeNull()
  })

  test('o Termo é do curso, diz 1 ano e que não substitui o acompanhamento', () => {
    const termo = JSON.stringify(AUTISMO_FRUSTRACOES.legal.termos)
    expect(AUTISMO_FRUSTRACOES.legal.termos.titulo).toContain('Como ajudar seu filho autista')
    expect(termo).toContain('1 (um) ano')
    expect(termo).toContain('não substitui o acompanhamento da criança')
    expect(termo).not.toMatch(/vitalíc|sem prazo|\bguia\b|vilão/i)
    expect(AUTISMO_FRUSTRACOES.legal.termsVersion).toBe('curso-autismo-2026-11-25')
  })

  test('a oferta despacha o corpo próprio e a página pública usa o funil', async () => {
    const despacho = await src('src/components/funnel/OfertaPage.astro')
    expect(despacho).toContain(
      "f.key === AUTISMO_FRUSTRACOES.key\n                  ? 'curso-autismo'",
    )
    expect(despacho).toContain('<CursoPaisAutismoBody {...bodyProps} />')
    const pagina = await src(`src/pages${PATH}.astro`)
    expect(pagina).toContain("produto: 'como-ajudar-seu-filho-autista-nas-frustracoes'")
    // O formulário do presente é o do curso para pais (sem a variante do guia).
    const corpo = await src('src/components/funnel/oferta/CursoPaisAutismoBody.astro')
    expect(corpo).not.toContain('formulario="guia"')
    expect(corpo).toContain('depoimentos={DEPOIMENTOS_CURSO_AUTISMO}')
  })

  test('métricas, teto de GET por IP e sitemap', async () => {
    expect(analyticsPage(PATH)).toMatchObject({
      id: 'kids/como-ajudar-seu-filho-autista-nas-frustracoes',
      kind: 'oferta',
      funnel: 'kids/como-ajudar-seu-filho-autista-nas-frustracoes',
    })
    expect(isRateLimitedGetPath(PATH)).toBe(true)
    expect(isRateLimitedGetPath(`${PATH}/`)).toBe(true)
    expect(isRateLimitedGetPath(`${PATH}-2`)).toBe(false)
    const config = await src('astro.config.mjs')
    expect(config).toContain('/kids/como-ajudar-seu-filho-autista-nas-frustracoes`,')
    expect(config).toContain('/kids/como-ajudar-seu-filho-autista-nas-frustracoes/termos`,')
  })
})

describe('painel do embaixador', () => {
  const base = {
    offerId: '55555555-5555-4555-8555-555555555555',
    includesMural: false,
    offerSlug: 'como-ajudar-seu-filho-autista-nas-frustracoes-15-dias',
    name: 'Como ajudar seu filho autista (presente)',
    audience: 'kids' as const,
    courseSlug: CURSO_PAIS_AUTISMO_SLUG,
    subscription: false,
    accessDays: 7,
    accessMonths: null,
    link: 'https://sistemazero.com.br/i/maria-x7k2/frustracoes/presente',
    checkoutLink: null,
    productSku: CURSO_PAIS_AUTISMO_SLUG,
  }

  test('presente e indicação do curso: cartão de pais, com a copy e a imagem do curso', () => {
    const presente = opcaoDeOferta({ ...base, kind: 'gift' })
    expect(presente.estilo).toBe('pais')
    expect(presente.titulo).toBe(
      'Como ajudar seu filho autista a lidar com frustrações e evitar crises',
    )
    expect(presente.imagem.src).toBe('/img/como-ajudar-seu-filho-autista/capa-do-curso.webp')
    expect(presente.mensagem).toContain('Vivianne Lima')
    expect(presente.mensagem).toContain('{{link}}')
    const indicacao = opcaoDeOferta({
      ...base,
      kind: 'referral',
      accessDays: null,
      accessMonths: 12,
      checkoutLink: 'https://sistemazero.com.br/i/maria-x7k2/frustracoes/pagamento',
    })
    expect(indicacao.estilo).toBe('pais')
    expect(indicacao.texto).toContain('1 ano de acesso')
    expect(indicacao.mensagem).not.toMatch(/presente|gratuito/i)
  })
})
