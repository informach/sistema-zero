/**
 * Uma página por oferta (25/11/2026): o Cadê Todo Mundo Kids e adulto ganharam funis de venda, com
 * a mesma oferta do presente. A copy de venda reaproveita as seções aprovadas do presente e lê o
 * prazo e a garantia da oferta do catálogo.
 */
import { describe, expect, test } from 'bun:test'
import { TERMOS_CADE_ADULTO } from '../../src/content/legal/termos-cade-adulto'
import { TERMOS_CADE_KIDS } from '../../src/content/legal/termos-cade-kids'
import { TERMOS_GUIA_PAIS } from '../../src/content/legal/termos-guia-pais'
import { prazoDoCade } from '../../src/content/presente-resgate'
import { CADE_ADULTO } from '../../src/funnels/cade-adulto'
import { cadeAdultoVenda } from '../../src/funnels/cade-adulto/oferta'
import { CADE_TODO_MUNDO } from '../../src/funnels/cade-todo-mundo'
import { cadeKidsVenda } from '../../src/funnels/cade-todo-mundo/oferta'
import { FUNNEL_KEYS, FUNNELS, getFunnelByKey } from '../../src/funnels/registry'
import { offerEnvKey } from '../../src/lib/env'
import { checkOfferContract } from '../../src/server/offer-contract'

const src = (path: string) => Bun.file(new URL(`../../src/${path}`, import.meta.url)).text()

const politica = (over: Partial<Parameters<typeof checkOfferContract>[1] & object> = {}) => ({
  pricingMode: 'one_time' as const,
  accessMode: 'fixed' as const,
  accessDurationValue: 7,
  accessDurationUnit: 'days' as const,
  guaranteeDays: 7,
  ...over,
})

describe('registro dos funis novos', () => {
  test('Cadê Kids, Cadê adulto e o guia, cada um com a sua env', () => {
    expect(getFunnelByKey('kids/cade-todo-mundo')).toBe(CADE_TODO_MUNDO)
    expect(getFunnelByKey('pro/cade-todo-mundo')).toBe(CADE_ADULTO)
    expect(offerEnvKey(CADE_TODO_MUNDO.key)).toBe('FUNNEL_OFFER_KIDS_CADE_TODO_MUNDO')
    expect(offerEnvKey(CADE_ADULTO.key)).toBe('FUNNEL_OFFER_PRO_CADE_TODO_MUNDO')
    expect(offerEnvKey('kids/vilao-em-aliado')).toBe('FUNNEL_OFFER_KIDS_VILAO_EM_ALIADO')
  })

  test('as landings /kids e /pro continuam no primeiro funil de antes', () => {
    const primeiro = (audience: string) =>
      FUNNEL_KEYS.find((k) => FUNNELS[k]?.audience === audience)
    expect(primeiro('kids')).toBe('kids/desafio-primeiro-jogo')
    expect(primeiro('pro')).toBe('pro/comunidade-dos-criadores')
  })

  test('as envs novas estão declaradas no Railway', async () => {
    const vars = await Bun.file(
      new URL('../../../../.railway/variables.ts', import.meta.url),
    ).text()
    for (const key of ['kids/cade-todo-mundo', 'pro/cade-todo-mundo', 'kids/vilao-em-aliado'])
      expect(vars).toContain(`'${offerEnvKey(key)}'`)
  })
})

describe('contrato do Cadê: o prazo e a garantia vêm da oferta', () => {
  test('aceita qualquer prazo fixo em dias e qualquer garantia', () => {
    for (const contrato of [CADE_TODO_MUNDO.offerContract, CADE_ADULTO.offerContract]) {
      expect(checkOfferContract(contrato, politica()).ok).toBe(true)
      expect(
        checkOfferContract(contrato, politica({ accessDurationValue: 30, guaranteeDays: null })).ok,
      ).toBe(true)
    }
  })

  test('recusa vitalício, meses e assinatura', () => {
    const contrato = CADE_TODO_MUNDO.offerContract
    expect(
      checkOfferContract(
        contrato,
        politica({ accessMode: 'lifetime', accessDurationValue: null, accessDurationUnit: null }),
      ).ok,
    ).toBe(false)
    expect(checkOfferContract(contrato, politica({ accessDurationUnit: 'months' })).ok).toBe(false)
    expect(checkOfferContract(contrato, politica({ pricingMode: 'subscription' })).ok).toBe(false)
  })

  test('o contrato do Desafio continua rígido', () => {
    const desafio = getFunnelByKey('kids/desafio-primeiro-jogo')?.offerContract
    expect(checkOfferContract(desafio, politica({ accessDurationValue: 30 })).ok).toBe(true)
    expect(checkOfferContract(desafio, politica({ accessDurationValue: 7 })).ok).toBe(false)
  })
})

describe('copy de venda do Cadê', () => {
  const kids = cadeKidsVenda(prazoDoCade(10), 7)
  const adulto = cadeAdultoVenda(prazoDoCade(10), null)
  const vendaKids = JSON.stringify([
    kids.topo.cta,
    kids.hero.beneficios,
    kids.hero.cta,
    kids.condicoes,
    kids.duvidas,
    kids.oferta,
    kids.barra,
    kids.seoTitle,
    kids.description,
  ])
  const vendaAdulto = JSON.stringify([
    adulto.topo.cta,
    adulto.hero.beneficios,
    adulto.hero.cta,
    adulto.condicoes,
    adulto.duvidas,
    adulto.oferta,
    adulto.barra,
    adulto.depois.titulo,
    adulto.seoTitle,
    adulto.description,
  ])

  test('a venda não fala de presente, de gratuito nem de cadastro como início do prazo', () => {
    for (const texto of [vendaKids, vendaAdulto]) {
      expect(texto).not.toMatch(/presente|gratuit|sem cartão|R\$ 0|resgat/i)
      expect(texto).not.toMatch(/contados do cadastro|No cadastro\./)
    }
  })

  test('o prazo vem da oferta, nunca escrito à mão', () => {
    expect(kids.hero.beneficios[1]).toBe('10 dias de acesso ao curso e ao Mural')
    expect(adulto.hero.beneficios[1]).toContain('10 dias de curso')
    expect(JSON.stringify(cadeKidsVenda(prazoDoCade(10), null))).not.toMatch(/7 dias|sete dias/)
    expect(kids.oferta.garantia).toContain('7 dias de garantia')
    expect(adulto.oferta.garantia).toBeNull()
  })

  test('segue as regras de voz da copy', () => {
    for (const texto of [vendaKids, vendaAdulto]) {
      expect(/[—–!]/.test(texto)).toBe(false)
      expect(/mesmo que|sem precisar|em preparação|carreira/i.test(texto)).toBe(false)
    }
    expect(kids.seoTitle.endsWith(' | Sistema Zero')).toBe(true)
    expect(adulto.seoTitle.endsWith(' | Sistema Zero')).toBe(true)
  })

  test('as seções editoriais aprovadas continuam as do presente', async () => {
    const { presenteKids } = await import('../../src/content/presente')
    const base = presenteKids(prazoDoCade(10))
    expect(kids.jogo).toEqual(base.jogo)
    expect(kids.habilidades).toEqual(base.habilidades)
    expect(kids.aula).toEqual(base.aula)
  })
})

describe('corpos e despacho', () => {
  test('cada funil novo tem o seu corpo, escolhido pela chave', async () => {
    const pagina = await src('components/funnel/OfertaPage.astro')
    expect(pagina).toContain('<CadeKidsBody {...bodyProps} />')
    expect(pagina).toContain('<CadeAdultoBody {...bodyProps} />')
    expect(pagina).toContain('<GuiaPaisBody {...bodyProps} />')
  })

  test('venda com pré-checkout; presente com o OfertaPresente e sem pré-checkout', async () => {
    for (const corpo of ['CadeKidsBody', 'CadeAdultoBody']) {
      const texto = await src(`components/funnel/oferta/${corpo}.astro`)
      expect(texto).toContain('data-checkout-cta')
      expect(texto).toContain('<OfertaPresente presente={presente}')
      expect(texto).toContain('{!presente && <PreCheckoutModal')
      expect(texto).toContain('alvo="oferta"')
      expect(texto).toContain('f.basePath}/termos`}')
    }
  })

  test('as páginas do presente seguem iguais sem o slot de compra', async () => {
    const corpo = await src('components/referrals/PresenteOferta.astro')
    expect(corpo).toContain("const alvo = compra ? '#oferta' : '#resgatar'")
    expect(corpo).toContain('{compra ? <slot name="compra" /> : gift && (')
  })
})

describe('Termos das ofertas novas', () => {
  test('um Termo por oferta, sem sobra do Desafio', () => {
    for (const termos of [TERMOS_CADE_KIDS, TERMOS_CADE_ADULTO, TERMOS_GUIA_PAIS]) {
      const texto = JSON.stringify(termos)
      expect(texto).not.toMatch(/Desafio do Primeiro Jogo\b(?! Kids)|30 \(trinta\)|30 dias/)
      expect(termos.atualizadoEm).toBe('25 de novembro de 2026')
    }
    expect(TERMOS_CADE_KIDS.titulo).toBe('Termos de Uso do curso Cadê Todo Mundo')
    expect(JSON.stringify(TERMOS_GUIA_PAIS)).not.toMatch(/Mural|Estúdio/)
    expect(CADE_TODO_MUNDO.legal.termos).toBe(TERMOS_CADE_KIDS)
    expect(CADE_ADULTO.legal.termos).toBe(TERMOS_CADE_ADULTO)
  })
})
