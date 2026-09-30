import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8')
const raw = source('components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro')
const markup = raw.slice(raw.indexOf('<div class="cdc">'), raw.indexOf('<Footer'))
const publicText = markup
  .replace(/\{[^{}<>]*\}/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
const journeyCopy = [
  publicText,
  source('funnels', 'comunidade-dos-criadores', 'content.ts'),
  source('funnels', 'comunidade-dos-criadores', 'index.ts'),
].join(' ')

describe('Comunidade: promessa coerente e condições de contratação', () => {
  test('não reintroduz compromissos de revisão ou prazo pedagógico em oferta, metadados e entrega', () => {
    expect(journeyCopy).not.toMatch(
      /cada atividade enviada|lendo as atividades|lidas por uma pessoa|na primeira semana|uma pessoa acompanhando/i,
    )
    expect(journeyCopy).not.toMatch(
      /respost[ae].{0,25}em \d+ horas|fica tudo liberado|aviso (por e-mail )?antes de (toda|cada) renovação/i,
    )
    expect(publicText).not.toMatch(/vício|sessão de terapia|profissão do futuro/i)
    expect(publicText).not.toMatch(/[—–]|\bmesmo que\b|\bsem precisar\b|não é [^.]*\. é /i)
    expect(publicText).not.toMatch(/[\p{L}.)"”]!/u)
  })

  test('origem Desafio permite continuar sem presumir conclusão', () => {
    expect(raw).toContain("origem === 'desafio'")
    expect(publicText).toContain('Quem ainda está montando pode continuar a etapa começada')
    expect(publicText).not.toContain('O primeiro jogo ficou pronto.')
    expect(publicText).not.toContain('Para quem já publicou o primeiro jogo')
    const route = source('pages', '[audience]', '[produto]', 'oferta.astro')
    expect(route).toContain("Astro.url.searchParams.get('origem') === 'desafio' ? 'desafio' : null")
    expect(route).toContain('<ComunidadeOfertaBody {...bodyProps} plans={plans} origem={origem} />')
  })

  test('preço vem dos planos, economia não fica negativa e seleção segue para o pré-checkout', () => {
    expect(raw).toContain('plans?.main.intervalMonths === n')
    expect(raw).toContain('mensal?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.mensalCents')
    expect(raw).toContain('anual?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.anualCents')
    expect(raw).toContain('Math.round(anualCents / 12)')
    expect(raw).toContain('economiaCents > 0')
    expect(markup).toContain('data-checkout-oferta={mensal?.slug}')
    expect(markup).toContain('data-checkout-oferta={anual?.slug}')
    expect(markup.match(/data-checkout-cta/g)).toHaveLength(2)
    expect(publicText).not.toMatch(/R\$\s*\d/)
    expect(publicText).toContain('Renovação automática no cartão')
    expect(publicText).toContain('No Pix, é necessário contratar novamente após 12 meses')
    expect(publicText).toContain(
      'A garantia vale para a contratação inicial e para cada nova contratação anual via Pix',
    )
  })

  test('condições de acesso são visíveis e não antecipam ferramentas posteriores', () => {
    expect(publicText).toContain(
      'depois de concluir o curso obrigatório de entrada e publicar seu projeto',
    )
    expect(publicText).toContain('Estúdio e Pinta no posto Construtor')
    expect(publicText).toContain('Algumas liberações dependem de cursos que ainda serão publicados')
    expect(publicText).toContain('A plataforma está em lançamento')
    expect(publicText).toContain('até dois perfis de criança')
  })

  test('preserva os três relatos reais sem inventar resultados ou avaliações', () => {
    for (const quote of [
      'Fiz uma nave que atira nos asteroides e marca ponto. No fim eu peguei o link e mandei pro meu amigo jogar.',
      'Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No terceiro dia chamei a minha mãe pra ver o meu jogo.',
      'Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior.',
    ])
      expect(publicText).toContain(quote)
    expect(publicText).toContain('Filho dos criadores da plataforma')
    expect(publicText).not.toContain('★')
  })

  test('âncoras têm destino e imagens locais existem, com dimensões e identificação das ilustrações', () => {
    const ids = new Set([...markup.matchAll(/id="([^"{}]+)"/g)].map((m) => m[1]))
    for (const [, id] of markup.matchAll(/href="#([^"{}]+)"/g)) expect(ids.has(id)).toBe(true)
    const imgs = [...markup.matchAll(/<img[^>]+>/g)].map((m) => m[0])
    expect(imgs.length).toBeGreaterThan(5)
    for (const img of imgs) {
      expect(img).toMatch(/width="\d+"/)
      expect(img).toMatch(/height="\d+"/)
      expect(img).toContain('alt=')
    }
    for (const [, file] of raw.matchAll(/img\('([^']+)'\)/g)) {
      expect(
        existsSync(join(SRC, '..', 'public', 'img', 'comunidade-dos-criadores', file ?? '')),
      ).toBe(true)
    }
    expect(publicText).toContain('Ilustração da experiência')
    expect(raw).not.toContain("img('print-recados.webp')")
  })

  test('etapas compartilhadas não prometem começar antes de pagar ou reiniciar progresso', () => {
    const pre = source('islands', 'PreCheckoutModal.tsx')
    const checkout = source('pages', '[audience]', '[produto]', 'checkout.astro')
    const thanks = source('pages', '[audience]', '[produto]', 'obrigado.astro')
    expect(pre).toContain('Informe os dados do responsável')
    expect(pre).toContain('Continuar para o pagamento')
    expect(checkout).toContain('Confirme sua assinatura da Comunidade dos Criadores')
    expect(checkout).not.toContain('pelas atividades enviadas')
    expect(thanks).toContain('Sua assinatura está confirmada.')
    expect(thanks).toContain('Se já tem conta, entre com seu acesso habitual')
    expect(thanks).toContain('approved && (')
    expect(thanks).toContain('Pagamento ainda aguardando confirmação.')
  })
})
