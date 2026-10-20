import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import { TERMOS_COMUNIDADE_ADULTO } from '../../src/content/legal/termos-comunidade-adulto'
import { COMUNIDADE_ADULTO } from '../../src/funnels/comunidade-adulto'
import {
  COMUNIDADE_ADULTO_CHECKOUT,
  COMUNIDADE_ADULTO_OBRIGADO,
  COMUNIDADE_ADULTO_PRECO_FALLBACK,
} from '../../src/funnels/comunidade-adulto/content'
import { PAGINA_ADULTO } from '../../src/funnels/comunidade-adulto/oferta/pagina'
import { COMUNIDADE_PRECO_FALLBACK } from '../../src/funnels/comunidade-dos-criadores/content'
import {
  DEFAULT_FUNNEL,
  FUNNELS,
  getFunnel,
  getFunnelByKey,
  isFunnelKey,
} from '../../src/funnels/registry'
import { offerEnvKey } from '../../src/lib/env'

// Funil adulto da Comunidade dos Criadores (20/10/2026, Canvas de 19/10): o registro, o despacho da
// oferta pela chave, a copy da página e as etapas compartilhadas (checkout, pré-checkout, obrigado).
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

describe('registro do funil adulto', () => {
  test('resolve pela URL e pela chave', () => {
    expect(getFunnel('pro', 'comunidade-dos-criadores')).toBe(COMUNIDADE_ADULTO)
    expect(getFunnelByKey('pro/comunidade-dos-criadores')).toBe(COMUNIDADE_ADULTO)
    expect(isFunnelKey('pro/comunidade-dos-criadores')).toBe(true)
  })

  test('a landing /pro segue no NCI e a /kids no Desafio (primeiro funil de cada público)', () => {
    const funis = Object.values(FUNNELS)
    expect(funis.find((f) => f.audience === 'pro')?.key).toBe('pro/no-comando-da-ia')
    expect(funis.find((f) => f.audience === 'kids')?.key).toBe('kids/desafio-primeiro-jogo')
    expect(DEFAULT_FUNNEL.key).toBe('pro/no-comando-da-ia')
  })

  test('def coerente: pro, assinatura, tema arcade, quiz e body próprios', () => {
    const f = COMUNIDADE_ADULTO
    expect(f.key).toBe('pro/comunidade-dos-criadores')
    expect(f.basePath).toBe('/pro/comunidade-dos-criadores')
    expect(f.theme).toBe('arcade')
    expect(f.lifetimeAccess).toBe(false)
    expect(f.steps).toEqual({ quiz: true, resultado: true, upsell: false, downsell: false })
    expect(f.content.quiz?.presentation).toBe('comunidade-adulto')
    expect(f.content.quiz?.conversa).toBeDefined()
    expect(f.content.sales).toBeUndefined()
    expect(existsSync(join(ROOT, 'public', f.imagesBase, f.checkoutImage ?? ''))).toBe(true)
    expect(f.seoTitle).toBe(PAGINA_ADULTO.seoTitle)
    expect(f.seoTitle).toContain(' | Sistema Zero')
  })

  test('o Termo é o da Comunidade adulta, com versão própria', () => {
    expect(COMUNIDADE_ADULTO.legal.termos).toBe(TERMOS_COMUNIDADE_ADULTO)
    expect(COMUNIDADE_ADULTO.legal.termsVersion).toBe('comunidade-adulto-2026-10-20')
    const versoes = Object.values(FUNNELS).map((f) => f.legal.termsVersion)
    expect(new Set(versoes).size).toBe(versoes.length)
  })

  test('a oferta vem da env declarada no Railway e no exemplo', () => {
    const env = offerEnvKey(COMUNIDADE_ADULTO.key)
    expect(env).toBe('FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES')
    expect(readFileSync(join(ROOT, '..', '..', '.railway', 'variables.ts'), 'utf8')).toContain(
      `'${env}'`,
    )
    expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).toContain(
      `${env}=comunidade-dos-criadores-adulto-mensal`,
    )
  })

  test('o preço de reserva é o mesmo da Comunidade Kids (R$ 97 e R$ 797)', () => {
    expect(COMUNIDADE_ADULTO_PRECO_FALLBACK).toEqual(COMUNIDADE_PRECO_FALLBACK)
  })
})

describe('a página de oferta adulta', () => {
  const ofertaPage = ler('components', 'funnel', 'OfertaPage.astro')
  const body = ler('components', 'funnel', 'oferta', 'ComunidadeAdultoOfertaBody.astro')

  test('o corpo é escolhido pela chave do funil, nunca por exclusão', () => {
    expect(ofertaPage).toContain('f.key === COMUNIDADE_ADULTO.key')
    expect(ofertaPage).toContain("corpo === 'comunidade-adulto' ? (")
    expect(ofertaPage).toContain('<ComunidadeAdultoOfertaBody {...bodyProps} plans={plans} />')
    expect(ofertaPage).toContain('throw new Error(`Funil sem corpo de oferta declarado')
  })

  test('dois CTAs de compra, um por plano, e o pré-checkout no modo assinatura', () => {
    expect(body.match(/data-checkout-cta/g)?.length).toBe(2)
    expect(body).toContain('data-checkout-oferta={mensal?.slug}')
    expect(body).toContain('data-checkout-oferta={anual?.slug}')
    expect(body).toContain(
      '<PreCheckoutModal client:idle basePath={f.basePath} funnel={f.key} assinatura />',
    )
    expect(body).toContain(`termosHref={\`${'$'}{f.basePath}/termos\`}`)
    expect(body).not.toContain('<style')
  })

  test('Light Copy em toda a página; sem preço escrito à mão nem "carreira"', () => {
    for (const [caminho, texto] of textos(PAGINA_ADULTO)) {
      // As perguntas das dúvidas são perguntas de propósito, e uma fala citada ("foi você que
      // fez?") não é gancho: a regra 3 não vale para elas.
      const pergunta = caminho.endsWith('.pergunta') || /\?["”]/.test(texto)
      const regras = lintLightCopy(texto).filter((i) => !(i.rule === 3 && pergunta))
      expect([caminho, regras.map((i) => i.rule)]).toEqual([caminho, []])
      expect([caminho, /R\$\s*\d/.test(texto)]).toEqual([caminho, false])
      expect([caminho, /carreira/i.test(texto)]).toEqual([caminho, false])
    }
  })

  test('toda imagem da página existe em /public', () => {
    const imagens = textos(PAGINA_ADULTO)
      .filter(([caminho]) => caminho.endsWith('.src'))
      .map(([, src]) => src)
    expect(imagens.length).toBeGreaterThan(5)
    for (const src of imagens)
      expect([src, existsSync(join(ROOT, 'public', src))]).toEqual([src, true])
  })

  test('as telas adultas são prévias e dizem isso na legenda', () => {
    const previas = textos(PAGINA_ADULTO).filter(([, v]) => v.includes('/previa-'))
    expect(previas.length).toBeGreaterThan(0)
    const legendas = textos(PAGINA_ADULTO)
      .filter(([caminho]) => /legenda|rotulo/.test(caminho))
      .map(([, v]) => v.toLowerCase())
    expect(legendas.some((l) => l.includes('prévia'))).toBe(true)
  })
})

describe('etapas compartilhadas do funil adulto', () => {
  const checkout = ler('pages', '[audience]', '[produto]', 'checkout.astro')
  const obrigado = ler('pages', '[audience]', '[produto]', 'obrigado.astro')
  const pre = ler('islands', 'PreCheckoutModal.tsx')
  const quizRoute = ler('pages', '[audience]', '[produto]', 'quiz.astro')
  const global = ler('styles', 'global.css')

  test('checkout e obrigado leem o texto do funil, sem chave presa ao Kids', () => {
    expect(checkout).not.toContain("f.key === 'kids/comunidade-dos-criadores'")
    expect(obrigado).not.toContain("f.key === 'kids/comunidade-dos-criadores'")
    expect(COMUNIDADE_ADULTO.content.checkout).toBe(COMUNIDADE_ADULTO_CHECKOUT)
    expect(COMUNIDADE_ADULTO_OBRIGADO.titulo).toBe('Sua assinatura está confirmada.')
    expect(COMUNIDADE_ADULTO_OBRIGADO.botao).toBe('Entrar na Comunidade →')
    // O que a compra entrega é a mesma lista do cartão de planos da página.
    expect(COMUNIDADE_ADULTO_OBRIGADO.entrega).toEqual(PAGINA_ADULTO.oferta.cartao.inclui)
    // Adulto não fala de responsável nem de filho nas etapas compartilhadas.
    for (const [caminho, texto] of [
      ...textos(COMUNIDADE_ADULTO_CHECKOUT),
      ...textos(COMUNIDADE_ADULTO_OBRIGADO),
    ]) {
      expect([caminho, /respons[aá]vel|filh[oa]|crian[cç]a/i.test(texto)]).toEqual([caminho, false])
      expect([caminho, lintLightCopy(texto).map((i) => i.rule)]).toEqual([caminho, []])
    }
  })

  test('no modo assinatura, o pré-checkout não promete Pix no rodapé', () => {
    expect(pre).toContain('const isSubscription = isCommunity || assinatura')
    expect(pre).toContain(
      "? 'Assinatura mensal ou anual, com 7 dias de garantia. As formas de pagamento aparecem na próxima tela.'",
    )
  })

  test('o quiz adulto tem a sua ilha, e as saídas cruzadas ligam os dois quizzes', () => {
    expect(quizRoute).toContain("quiz.presentation === 'comunidade-adulto' ? (")
    expect(quizRoute).toContain('<ComunidadeAdultoQuiz client:load')
    expect(quizRoute).toContain("getFunnelByKey('pro/comunidade-dos-criadores')")
    expect(quizRoute).toContain("getFunnelByKey('kids/comunidade-dos-criadores')")
  })

  test('o tema arcade das páginas compartilhadas só aponta para os tokens --cda-*', () => {
    expect(global).toContain('@import "./theme-arcade.css";')
    const inicio = global.indexOf('.theme-arcade {')
    const bloco = global.slice(inicio, global.indexOf('\n}', inicio))
    for (const [, nome, valor] of bloco.matchAll(/^\s*(--color-[\w-]+):\s*([^;]+);/gm))
      expect([nome, valor]).toEqual([nome, expect.stringMatching(/^var\(--cda-[\w-]+\)$/)])
  })
})
