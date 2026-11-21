/**
 * Página pública do guia gratuito para pais "Transformando o vilão em aliado"
 * (`/kids/vilao-em-aliado`, 18/11/2026; texto e layout novos em 21/11/2026): a copy segue as regras
 * de voz do presente, não resume aula, chama o curso de guia, o presente do fim continua em segredo,
 * e o cadastro (no topo) só abre quando a campanha entrega este curso.
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
import { resgateCopy } from '../../src/content/presente-resgate'
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
/** A oferta tipada como a leitura pública do referrals, para o formulário e a copy. */
const ofertaDoGuia = { ...oferta, learner: 'parents' as const }
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

  test('na variante guia, o formulário diz guia e não chama o guia de presente', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code={CODIGO_DA_CAMPANHA}
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

  test('o corpo mostra o formulário no topo, na variante guia, e os depoimentos só quando existem', async () => {
    const corpo = await src('components/referrals/CursoPaisOferta.astro')
    expect(corpo).toContain("variante: 'guia'")
    expect(corpo).toContain('<BolsaResgate client:load {...formulario} />')
    expect(corpo).toContain('<BolsaResgate client:load {...formulario} retryOnly />')
    expect(corpo).toContain('DEPOIMENTOS_DE_PAIS.length > 0 &&')
    expect(corpo).not.toMatch(/Cadê|7 dias/)
    const formulario = corpo.indexOf('<div id="resgatar"')
    expect(formulario).toBeGreaterThan(corpo.indexOf('id="cpv-titulo"'))
    expect(formulario).toBeLessThan(corpo.indexOf('id="o-que-muda"'))
    expect(corpo).toMatch(/\{ready && \(\s*<section class="c9-fim"/)
  })

  test('a página está no sitemap', async () => {
    const config = await Bun.file(new URL('../../astro.config.mjs', import.meta.url)).text()
    expect(config).toContain('`${site}/kids/vilao-em-aliado`')
  })
})
