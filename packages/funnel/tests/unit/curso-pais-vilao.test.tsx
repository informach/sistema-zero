/**
 * Página pública do minicurso gratuito para pais "Transformando o vilão em aliado"
 * (`/kids/vilao-em-aliado`, 18/11/2026): a copy segue as regras de voz do presente, o presente do
 * fim do curso continua em segredo, e o cadastro só abre quando a campanha entrega este curso.
 */
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CODIGO_DA_CAMPANHA,
  CURSO_PAIS_VILAO,
  CURSO_PAIS_VILAO_PATH,
  CURSO_PAIS_VILAO_SLUG,
  DEPOIMENTOS_DE_PAIS,
} from '../../src/content/curso-pais-vilao'
import BolsaResgate from '../../src/islands/BolsaResgate'
import { cursoPaisVilaoView } from '../../src/server/curso-pais-vilao'
import { createFakeGateway } from '../fakes/fake-gateway'

const src = (path: string) => Bun.file(new URL(`../../src/${path}`, import.meta.url)).text()
const texto = JSON.stringify([CURSO_PAIS_VILAO, DEPOIMENTOS_DE_PAIS])

const campanha = {
  code: CODIGO_DA_CAMPANHA,
  ownerKind: 'campaign',
  audience: 'kids',
  displayName: 'Minicurso para pais',
  source: { kind: 'campaign', name: 'Minicurso para pais', context: 'other' },
  state: 'active',
  startsAt: '2026-11-18T03:00:00Z',
  endsAt: '2030-01-01T03:00:00Z',
  giftAvailable: true,
}
const oferta = {
  offerId: '44444444-4444-4444-8444-444444444444',
  offerTitle: 'Transformando o vilão em aliado',
  courseSlug: CURSO_PAIS_VILAO_SLUG,
  courseTitle: 'Transformando o vilão em aliado',
  learner: 'parents',
  accessDays: null,
  includesMural: false,
}
const ver = async (status: number, body: unknown) => {
  const fake = createFakeGateway()
  fake.setReferralCodeResult(status, body)
  return cursoPaisVilaoView(fake.gateway, 'https://kids.sistemazero.com.br/')
}

describe('copy da página do curso para pais', () => {
  test('segue as regras de voz do presente', () => {
    expect(/[—–!]/.test(texto)).toBe(false)
    expect(/mesmo que|sem precisar|em preparação|carreira/i.test(texto)).toBe(false)
    expect(/\bsenhora?\b/i.test(texto)).toBe(false)
    expect(/\bIA\b/.test(texto)).toBe(false)
    expect(/não é [^.]{1,40}\. É /i.test(texto)).toBe(false)
    expect(CURSO_PAIS_VILAO.seoTitle.endsWith(' | Sistema Zero')).toBe(true)
  })

  test('o presente do fim do curso é surpresa e não há segunda oferta', () => {
    expect(texto).not.toMatch(/Cadê Todo Mundo|7 dias|sete dias|Desafio do Primeiro Jogo|cupom/i)
    expect(texto).not.toMatch(/R\$|assinatura mensal|plano anual/i)
    expect(texto).toContain('um presente espera por você e pelo seu filho')
  })

  test('diz para quem é, quantas aulas tem e que é gratuito', () => {
    expect(CURSO_PAIS_VILAO.hero.requisitos).toContain('5 a 17 anos')
    expect(CURSO_PAIS_VILAO.aulas.itens).toHaveLength(7)
    expect(CURSO_PAIS_VILAO.paraQuem.cartoes).toHaveLength(6)
    expect(CURSO_PAIS_VILAO.hero.beneficios[1]).toBe('Gratuito, sem cartão e sem assinatura')
    expect(CURSO_PAIS_VILAO_PATH).toBe('/kids/vilao-em-aliado')
  })

  test('depoimento só entra com texto e autor identificado', () => {
    for (const depoimento of DEPOIMENTOS_DE_PAIS) {
      expect(depoimento.texto.trim().length).toBeGreaterThan(20)
      expect(depoimento.autor.trim().length).toBeGreaterThan(3)
    }
  })

  test('as imagens existem no public', async () => {
    for (const caminho of [
      CURSO_PAIS_VILAO.hero.figura.imagem.src,
      CURSO_PAIS_VILAO.quemConduz.foto.src,
      CURSO_PAIS_VILAO.ogImage,
    ])
      expect([
        caminho,
        await Bun.file(new URL(`../../public${caminho}`, import.meta.url)).exists(),
      ]).toEqual([caminho, true])
  })
})

describe('cadastro da página do curso para pais', () => {
  test('campanha ativa do curso abre o formulário, com a URL do app Kids sem a barra', async () => {
    const view = await ver(200, { ...campanha, gift: oferta })
    expect(view).toMatchObject({
      ready: true,
      podeRetomar: false,
      resgate: {
        code: CODIGO_DA_CAMPANHA,
        campaign: true,
        communityUrl: 'https://kids.sistemazero.com.br',
        gift: { courseSlug: CURSO_PAIS_VILAO_SLUG, learner: 'parents' },
      },
    })
    expect(view.estado).toBeUndefined()
  })

  test('campanha inexistente, referrals fora do ar ou resposta torta: em breve, sem formulário', async () => {
    for (const [status, body] of [
      [404, {}],
      [503, {}],
      [200, { ...campanha, gift: { ...oferta, learner: 'adulto' } }],
    ] as const) {
      const view = await ver(status, body)
      expect([status, view.ready, view.resgate, view.estado?.etiqueta]).toEqual([
        status,
        false,
        undefined,
        'Em breve',
      ])
    }
  })

  test('falha fechada quando a campanha entrega outra coisa', async () => {
    const outras = [
      { ...campanha },
      { ...campanha, gift: { ...oferta, courseSlug: 'outro-curso-para-pais' } },
      { ...campanha, gift: { ...oferta, learner: 'child' } },
      { ...campanha, audience: 'adult', gift: oferta },
      {
        ...campanha,
        gift: { ...oferta, courseSlug: 'cade-todo-mundo', learner: 'child', accessDays: 7 },
      },
    ]
    for (const body of outras) {
      const view = await ver(200, body)
      expect([view.ready, view.resgate]).toEqual([false, undefined])
    }
  })

  test('agendada ou sem disponibilidade: em breve; pausada ou encerrada: fechada, com retomada', async () => {
    const agendada = await ver(200, { ...campanha, state: 'scheduled', gift: oferta })
    expect([agendada.ready, agendada.podeRetomar, agendada.estado?.etiqueta]).toEqual([
      false,
      false,
      'Em breve',
    ])
    const indisponivel = await ver(200, { ...campanha, giftAvailable: false, gift: oferta })
    expect([indisponivel.ready, indisponivel.estado?.etiqueta]).toEqual([false, 'Em breve'])
    for (const state of ['paused', 'ended']) {
      const fechada = await ver(200, { ...campanha, state, giftAvailable: false, gift: oferta })
      expect([state, fechada.ready, fechada.podeRetomar, fechada.estado?.etiqueta]).toEqual([
        state,
        false,
        true,
        'Inscrições fechadas',
      ])
      expect(fechada.resgate?.code).toBe(CODIGO_DA_CAMPANHA)
    }
  })

  test('o formulário é o do curso para pais: dados do adulto, sem perfil de criança', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code={CODIGO_DA_CAMPANHA}
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
})

describe('rota e peças da página', () => {
  test('a rota é pública, indexável e usa o layout e o corpo do curso', async () => {
    const rota = await src('pages/kids/vilao-em-aliado.astro')
    expect(rota).toContain('export const prerender = false')
    expect(rota).toContain('<PresenteLayout')
    expect(rota).toContain(' indexavel>')
    expect(rota).toContain('<CursoPaisOferta')
    expect(rota).toContain('cursoPaisVilaoView(gateway, env.KIDS_COMMUNITY_URL)')
    const layout = await src('components/referrals/PresenteLayout.astro')
    expect(layout).toContain('noindex={!indexavel}')
    expect(layout).toContain('indexavel = false')
  })

  test('o corpo mostra o formulário na variante pais e os depoimentos só quando existem', async () => {
    const corpo = await src('components/referrals/CursoPaisOferta.astro')
    expect(corpo).toContain("variante: 'pais'")
    expect(corpo).toContain('<BolsaResgate client:load {...formulario} />')
    expect(corpo).toContain('<BolsaResgate client:load {...formulario} retryOnly />')
    expect(corpo).toContain('DEPOIMENTOS_DE_PAIS.length > 0 &&')
    expect(corpo).not.toMatch(/Cadê|7 dias/)
  })

  test('a página está no sitemap', async () => {
    const config = await Bun.file(new URL('../../astro.config.mjs', import.meta.url)).text()
    expect(config).toContain('`${site}/kids/vilao-em-aliado`')
  })
})
