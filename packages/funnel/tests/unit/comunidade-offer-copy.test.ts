import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ARQUIVOS_ESPELHO,
  espelhoDaPagina,
  espelhoDoModulo,
  MODULOS_ESPELHO,
  PASTA_ESPELHO,
} from '../../scripts/espelho-copy-comunidade'
import {
  COMUNIDADE_OFERTAS_ANTIGAS,
  COMUNIDADE_PAGES,
  comunidadeOfferPath,
  isComunidadeOfertaAntiga,
  isComunidadeSubpagina,
} from '../../src/funnels/comunidade-dos-criadores/oferta'
import {
  ENFASE_NUMA_LINHA,
  ICONES_DE_CAPITULO,
  ICONES_DE_DUVIDAS,
  ICONES_DE_GRUPO,
} from '../../src/funnels/comunidade-dos-criadores/oferta/arte'
import { comDestaques } from '../../src/funnels/comunidade-dos-criadores/oferta/destacar'
import { DESTAQUES } from '../../src/funnels/comunidade-dos-criadores/oferta/destaques'
import { calcularEconomiaAnual } from '../../src/funnels/comunidade-dos-criadores/oferta/economia'
import {
  PAGINA_9A17,
  RELATOS_9A17,
} from '../../src/funnels/comunidade-dos-criadores/oferta/pagina-9a17'
import { PAGINA_MENOR9 } from '../../src/funnels/comunidade-dos-criadores/oferta/pagina-menor9'
import { RELATOS, RELATOS_RESERVA } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import {
  FAQ,
  FAQ_EXTRA,
  FOUNDER_SEM_RELATO,
  SHARED_COPY,
} from '../../src/funnels/comunidade-dos-criadores/oferta/shared'
import type {
  ComunidadePageId,
  RelatoId,
} from '../../src/funnels/comunidade-dos-criadores/oferta/types'
import {
  COMUNIDADE_VISUALS,
  FAQ_VISUALS,
  PENDING_VISUALS,
  TOUR,
} from '../../src/funnels/comunidade-dos-criadores/oferta/visuals'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8')
const raw = source('components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro')
const raw917 = source('components', 'funnel', 'oferta', 'Comunidade917Body.astro')
const rawMenor9 = source('components', 'funnel', 'oferta', 'ComunidadeMenor9Body.astro')
const publicCopy = JSON.stringify({
  pages: COMUNIDADE_PAGES,
  pagina917: PAGINA_9A17,
  paginaMenor9: PAGINA_MENOR9,
  shared: SHARED_COPY,
  faq: FAQ,
  extra: FAQ_EXTRA,
  relatos: RELATOS,
})
/** Os ids de relato citados num módulo de copy (`id: 'AV08'` ou `RELATOS.AV10`). */
const relatosNoModulo = (...partes: string[]) =>
  new Set(
    [
      ...source(...partes).matchAll(
        /(?:id: '|relato: '|RELATOS\.|legendaDoRelato\(')((?:AV|N)\d+)/g,
      ),
    ].map((m) => m[1] as RelatoId),
  )

// Contratos editoriais e comerciais das páginas de oferta Kids (20/10/2026): 9 a 17 em `/oferta`,
// "criar junto" (menor de 9) e a continuidade. O HTML, as âncoras e a responsividade ficam nos
// testes de navegador.
describe('Comunidade Kids: 9 a 17, criar junto e continuidade', () => {
  test('três endereços; as cinco páginas de perfil de antes redirecionam para a de 9 a 17', () => {
    expect(comunidadeOfferPath('9a17')).toBe('/kids/comunidade-dos-criadores/oferta')
    expect(comunidadeOfferPath('criar-junto')).toBe(
      '/kids/comunidade-dos-criadores/oferta/criar-junto',
    )
    expect(comunidadeOfferPath('continuar')).toBe('/kids/comunidade-dos-criadores/oferta/continuar')
    for (const id of ['criar-junto', 'continuar']) expect(isComunidadeSubpagina(id)).toBe(true)
    for (const value of [undefined, '', '9a17', 'tempo-de-tela', 'toString', '__proto__'])
      expect(isComunidadeSubpagina(value)).toBe(false)
    expect([...COMUNIDADE_OFERTAS_ANTIGAS].sort()).toEqual([
      'criacao-de-jogos',
      'expressao-visual',
      'formacao-tecnologica',
      'habilidades-escolares',
      'tempo-de-tela',
    ])
    for (const id of COMUNIDADE_OFERTAS_ANTIGAS) expect(isComunidadeOfertaAntiga(id)).toBe(true)
    expect(isComunidadeOfertaAntiga('continuar')).toBe(false)
    const rota = source('pages', '[audience]', '[produto]', 'oferta', '[perfilOferta].astro')
    expect(rota).toContain(
      `Astro.redirect(\`/kids/comunidade-dos-criadores/oferta${'$'}{Astro.url.search}\`, 301)`,
    )
    // O corpo é escolhido pela chave do funil: um funil novo nunca cai na página do Desafio.
    const despacho = source('components', 'funnel', 'OfertaPage.astro')
    expect(despacho).toContain('Funil sem corpo de oferta declarado')
    expect(despacho).toContain("comunidadePage === 'criar-junto'")
  })

  test('as páginas novas: sem "Jogue um jogo", sem preço escrito à mão, termos da oferta', () => {
    for (const [nome, modulo] of [
      ['9a17', PAGINA_9A17],
      ['criar-junto', PAGINA_MENOR9],
    ] as const) {
      const texto = JSON.stringify(modulo)
      expect([nome, /jogue um jogo/i.test(texto)]).toEqual([nome, false])
      expect([nome, /R\$\s*\d/.test(texto)]).toEqual([nome, false])
      expect([nome, /[—–]/.test(texto)]).toEqual([nome, false])
      expect([nome, /mesmo que|sem precisar|em preparação/i.test(texto)]).toEqual([nome, false])
      expect([nome, texto.includes('/kids/comunidade-dos-criadores/termos')]).toEqual([nome, true])
      expect([nome, texto.includes('/privacidade')]).toEqual([nome, true])
    }
    expect(PAGINA_9A17.seoTitle).not.toBe(PAGINA_MENOR9.seoTitle)
  })

  test('o tour configurado tem destino único e os CTAs apontam para seções existentes', () => {
    for (const page of Object.values(COMUNIDADE_PAGES)) {
      const sectionIds = page.sections.map((section) => section.id)
      expect(new Set(sectionIds).size).toBe(sectionIds.length)
      if (page.tourAfterSection)
        expect(sectionIds.filter((id) => id === page.tourAfterSection)).toHaveLength(1)
      const anchors = new Set([...sectionIds, 'planos', 'garantia', 'contratacao', 'experiencia'])
      for (const action of [
        page.hero.primary,
        page.hero.secondary,
        ...page.sections.flatMap((section) => section.actions),
        ...page.closing.actions,
      ]) {
        if (action.href.startsWith('#')) expect(anchors.has(action.href.slice(1))).toBe(true)
      }
    }
  })

  test('as respostas comuns da continuidade', () => {
    // Proposta de 16/10/2026: 26 respostas comuns; a continuidade escolhe as dela.
    expect(Object.keys(FAQ)).toHaveLength(26)
    expect(FAQ.programacao.question).not.toContain('desenhar')
    expect(FAQ.desenho.question).not.toContain('programar')
    expect(FAQ.ia.paragraphs.join(' ')).toContain('Pensa')
    expect(FAQ.ia.paragraphs.join(' ')).toContain('Zappy')
  })

  test('não promete revisão universal, resposta imediata, liberação total ou resultado em prazo fixo', () => {
    expect(publicCopy).not.toMatch(
      /cada atividade enviada|lendo as atividades|lidas por uma pessoa|na primeira semana/i,
    )
    expect(publicCopy).not.toMatch(
      /respost[ae].{0,25}em \d+ horas|fica tudo liberado|aviso (por e-mail )?antes de (toda|cada) renovação/i,
    )
    expect(publicCopy).not.toMatch(/vício|sessão de terapia|profissão do futuro/i)
    expect(publicCopy).not.toMatch(/[—–]/)
    expect(publicCopy).toContain('Construtor')
    expect(publicCopy).toContain('Inventor')
    // Decisão da dona (16/10/2026): a página mostra o que a plataforma oferece; não anuncia curso
    // em preparação nem ferramenta "ainda não liberada". A liberação por posto continua explicada.
    expect(publicCopy).not.toMatch(/em preparação/i)
    expect(FAQ.liberacao.paragraphs.join(' ')).toContain('Construtor')
    expect(SHARED_COPY.offer.paragraphs.join(' ')).toContain('até dois perfis de criança')
  })

  test('continuidade tem endereço próprio, sem a variante por origem', () => {
    expect(raw).not.toContain('posDesafio')
    expect(source('server', 'offer-page.ts')).not.toContain("searchParams.get('origem')")
    const page = COMUNIDADE_PAGES.continuar
    const ids = page.faqGroups.flatMap((group) => group.questions)
    // Tráfego quente: menos perguntas, todas respondidas, cada uma com a sua tela.
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeLessThanOrEqual(30)
    for (const id of ids) expect([id, Boolean(page.faq?.[id])]).toEqual([id, true])
    expect(Object.keys(page.faqVisuals ?? {}).sort()).toEqual([...ids].sort())
    for (const id of Object.values(page.faqVisuals ?? {}).flat())
      expect(id in COMUNIDADE_VISUALS || id in PENDING_VISUALS).toBe(true)
  })

  test('o espelho editorial (copy/pagina-*.md) é exatamente a copy que cada página renderiza', () => {
    // Gerado por scripts/espelho-copy-comunidade.ts: mudou a copy, rode o script (README da copy).
    for (const [id, arquivo] of Object.entries(ARQUIVOS_ESPELHO)) {
      const doc = readFileSync(join(PASTA_ESPELHO, arquivo), 'utf8').replaceAll('\r\n', '\n')
      expect(doc).toBe(espelhoDaPagina(COMUNIDADE_PAGES[id as ComunidadePageId]))
    }
    for (const { arquivo, modulo } of Object.values(MODULOS_ESPELHO)) {
      const doc = readFileSync(join(PASTA_ESPELHO, arquivo), 'utf8').replaceAll('\r\n', '\n')
      expect([arquivo, doc]).toEqual([arquivo, espelhoDoModulo(modulo)])
    }
  })

  test('economia do anual: só com os dois preços ao vivo, arredondada para baixo', () => {
    expect(calcularEconomiaAnual(9_700, 79_700)).toBe(36_700)
    expect(calcularEconomiaAnual(10_900, 89_900)).toBe(40_900)
    // 12 × 97,55 − 1.070 = 100,60: anuncia R$ 100, nunca R$ 101.
    expect(calcularEconomiaAnual(9_755, 107_000)).toBe(10_000)
    // 50 centavos não viram "R$ 1"; anual mais caro não vira economia negativa.
    expect(calcularEconomiaAnual(9_700, 116_350)).toBe(0)
    expect(calcularEconomiaAnual(9_700, 115_950)).toBe(400)
    expect(calcularEconomiaAnual(9_700, 120_000)).toBe(0)
    // Sem um dos preços ao vivo, não compara com o fallback.
    expect(calcularEconomiaAnual(undefined, 79_700)).toBe(0)
    expect(calcularEconomiaAnual(9_700, null)).toBe(0)
    expect(raw).toContain('calcularEconomiaAnual(mensal?.priceCents, anual?.priceCents)')
    expect(raw.match(/filter\(comEconomia\)/g)).toHaveLength(2)
    for (const offer of [SHARED_COPY.offer, COMUNIDADE_PAGES.continuar.offer]) {
      // A frase da economia fica num parágrafo só dela: sem economia, ela sai inteira e nada mais.
      const comMarcador = (offer?.annual.paragraphs ?? []).filter((paragrafo) =>
        paragrafo.includes('{{economia_anual}}'),
      )
      expect(comMarcador).toHaveLength(1)
      expect(comMarcador[0]).not.toContain('{{equivalente_mensal_anual}}')
    }
  })

  test('preços vêm do catálogo e cada plano mantém sua seleção no pré-checkout', () => {
    for (const corpo of [raw917, rawMenor9]) {
      expect(corpo).toContain('plans?.main.intervalMonths === n')
      expect(corpo).toContain('mensal?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.mensalCents')
      expect(corpo).toContain('anual?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.anualCents')
      expect(corpo).toContain('calcularEconomiaAnual(mensal?.priceCents, anual?.priceCents)')
      expect(corpo).toContain('data-checkout-oferta={mensal?.slug}')
      expect(corpo).toContain('data-checkout-oferta={anual?.slug}')
      expect(corpo.match(/data-checkout-cta/g)).toHaveLength(2)
      expect(corpo).toContain('<PreCheckoutModal')
      // O rodapé leva ao Termo da oferta (`termosHref={`${f.basePath}/termos`}`).
      expect(corpo).toContain(`termosHref={\`${'$'}{f.basePath}/termos\`}`)
    }
    expect(raw).toContain('plans?.main.intervalMonths === n')
    expect(raw).toContain('mensal?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.mensalCents')
    expect(raw).toContain('anual?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.anualCents')
    expect(raw).toContain('Math.round(anualCents / 12)')
    expect(raw).toContain('data-checkout-oferta={mensal?.slug}')
    expect(raw).toContain('data-checkout-oferta={anual?.slug}')
    expect(raw.match(/data-checkout-cta/g)).toHaveLength(2)
    expect(SHARED_COPY.offer.monthly.paragraphs.join(' ')).toContain(
      'renovação automática no cartão',
    )
    expect(SHARED_COPY.offer.annual.paragraphs.join(' ')).toContain(
      'No Pix, uma nova contratação é necessária ao fim dos 12 meses',
    )
    expect(SHARED_COPY.offer.guarantee.paragraphs.join(' ')).toContain(
      'cada nova contratação anual via Pix',
    )
    expect(SHARED_COPY.offer.guarantee.paragraphs.join(' ')).toContain('reembolso integral')
    expect(publicCopy).not.toMatch(/R\$\s*\d/)
  })

  test('cada explicação prática aponta para uma demonstração conhecida; reembolso remete aos termos', () => {
    const todas = [...Object.keys(FAQ), ...Object.keys(FAQ_EXTRA)]
    expect(Object.keys(FAQ_VISUALS).sort()).toEqual(todas.sort())
    for (const id of todas) {
      if (id === 'reembolso') {
        expect(FAQ_VISUALS[id]).toEqual([])
      } else {
        expect(FAQ_VISUALS[id]?.length).toBeGreaterThan(0)
      }
    }
    expect(FAQ_VISUALS.ia).toEqual(['pensa', 'zappy'])
    expect(FAQ_VISUALS.desenho).toContain('pinta')
    expect(FAQ_VISUALS.programacao).toContain('estudio')
    expect(raw).toContain('Ver o canal e as condições nos termos da assinatura')
  })

  test('toda imagem é uma tela REAL; o que falta capturar fica declarado e não aparece', () => {
    const pages = Object.values(COMUNIDADE_PAGES)
    // `a+b` põe duas demonstrações no mesmo grupo da seção.
    const referenced = pages.flatMap((page) => [
      page.heroVisual,
      ...page.sections.flatMap((section) => section.visuals.flatMap((id) => id.split('+'))),
    ])
    referenced.push(...Object.values(FAQ_VISUALS).flat())
    for (const id of referenced)
      expect([id, id in COMUNIDADE_VISUALS || id in PENDING_VISUALS]).toEqual([id, true])
    // O herói nunca fica sem tela, e uma chave não pode ser real e pendente ao mesmo tempo.
    for (const page of pages) expect(COMUNIDADE_VISUALS[page.heroVisual]).toBeDefined()
    for (const id of Object.keys(PENDING_VISUALS)) expect(COMUNIDADE_VISUALS[id]).toBeUndefined()

    const pasta = join(SRC, '..', 'public', 'img', 'comunidade-dos-criadores')
    const frames = [
      ...Object.values(COMUNIDADE_VISUALS).flatMap((visual) => visual.frames),
      ...TOUR,
    ]
    for (const frame of frames) {
      expect(frame.file).toMatch(/^tela-[a-z0-9-]+\.webp$/)
      expect(frame.retina).toBe(frame.file.replace('.webp', '@2x.webp'))
      expect([frame.file, existsSync(join(pasta, frame.file))]).toEqual([frame.file, true])
      expect([frame.retina, existsSync(join(pasta, frame.retina))]).toEqual([frame.retina, true])
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.height).toBeGreaterThan(0)
      expect(frame.alt.length).toBeGreaterThan(20)
      expect(frame.label.length).toBeGreaterThan(2)
    }
    for (const visual of Object.values(COMUNIDADE_VISUALS)) {
      expect(visual.caption.length).toBeGreaterThan(20)
      expect(visual.frames.length).toBeGreaterThanOrEqual(1)
      expect(visual.frames.length).toBeLessThanOrEqual(3)
    }
    // A venda não mostra "em construção" (decisão de 16/10/2026): as capturas inteiras da Jornada
    // e do catálogo trazem "Mais 6 postos estão sendo construídos"; só os recortes entram.
    const jornadaComConstrucao = [
      'tela-jornada.webp',
      'tela-jornada-postos.webp',
      'tela-catalogo.webp',
    ]
    for (const frame of frames) expect(jornadaComConstrucao).not.toContain(frame.file)
    expect(COMUNIDADE_VISUALS.jornada!.frames.map((f) => f.file)).toEqual([
      'tela-jornada-meus-postos.webp',
    ])
    for (const frame of frames) expect(frame.alt).not.toMatch(/em construção/i)
    // As prévias desenhadas saíram de vez: nenhuma ilustração se passa por tela da plataforma.
    expect(existsSync(join(pasta, 'previas'))).toBe(false)
    expect(JSON.stringify(COMUNIDADE_VISUALS)).not.toMatch(/\.svg|previas\//)

    const component = source('components', 'funnel', 'oferta', 'ComunidadeVisual.astro')
    expect(component).toContain('width={frame.width}')
    expect(component).toContain('height={frame.height}')
    expect(component).toContain('data-zoom')
    expect(raw).toContain('imagesrcset={heroSrcset}')
  })

  test('a direção de arte por assunto aponta para seções, grupos e assuntos que existem', () => {
    const secoes = new Map(
      Object.values(COMUNIDADE_PAGES).flatMap((page) =>
        page.sections.map((section) => [section.id, section] as const),
      ),
    )
    for (const [id, icone] of Object.entries(ICONES_DE_CAPITULO)) {
      expect([id, secoes.has(id)]).toEqual([id, true])
      // A Jornada tem o ícone dela (`route`): declarar outro seria ignorado em silêncio.
      expect([id, secoes.get(id)?.layout]).not.toEqual([id, 'journey'])
      expect(icone).toMatch(/^[a-z0-9_]+$/)
    }
    for (const [id, icones] of Object.entries(ICONES_DE_GRUPO)) {
      const section = secoes.get(id)
      expect([id, Boolean(section)]).toEqual([id, true])
      expect(icones.length).toBe(section?.groups.length ?? -1)
      // Ícone só em grupo com subtítulo: é ao lado dele que o ícone aparece.
      icones.forEach((icone, i) => {
        expect([id, i, Boolean(icone)]).toEqual([id, i, Boolean(section?.groups[i]?.title)])
      })
    }
    // Grupo com subtítulo (fora das ferramentas, que têm ícones próprios) não fica com o ícone da
    // posição: a Jornada de B e C ficou com "palette" no Pensa antes desta guarda.
    for (const section of secoes.values())
      if (section.layout !== 'tools' && section.groups.some((group) => group.title))
        expect([section.id, section.id in ICONES_DE_GRUPO]).toEqual([section.id, true])
    for (const [id, icones] of Object.entries(ICONES_DE_DUVIDAS)) {
      const page = COMUNIDADE_PAGES[id as keyof typeof COMUNIDADE_PAGES]
      expect(icones?.length).toBe(page.faqGroups.length)
    }
    for (const [id, largura] of Object.entries(ENFASE_NUMA_LINHA)) {
      expect(id in COMUNIDADE_PAGES).toBe(true)
      expect(largura).toBeGreaterThan(0)
    }
  })

  test('nenhuma demonstração se repete no corpo de uma página', () => {
    const permitidas: Record<string, string[]> = {}
    for (const page of Object.values(COMUNIDADE_PAGES)) {
      const telas = [
        page.heroVisual,
        ...page.sections.flatMap((section) => section.visuals.flatMap((id) => id.split('+'))),
      ].filter((id) => id in COMUNIDADE_VISUALS)
      const repetidas = [...new Set(telas.filter((id, i) => telas.indexOf(id) !== i))]
      expect([page.id, repetidas]).toEqual([page.id, permitidas[page.id] ?? []])
    }
  })

  test('continuidade: cada situação é uma carta com subtítulo e a sua tela', () => {
    const page = COMUNIDADE_PAGES.continuar
    const situacoes = page.sections.filter((section) => section.layout === 'cases')
    expect(situacoes.map((section) => section.id)).toEqual(['proximo-passo'])
    for (const section of situacoes) {
      // O primeiro grupo é só a abertura; os demais viram uma carta cada, com a sua tela.
      const [abertura, ...cartas] = section.groups
      expect([abertura?.title, abertura?.paragraphs.length]).toEqual([null, 1])
      expect(cartas.every((group) => group.title)).toBe(true)
      expect(section.visuals).toHaveLength(cartas.length)
    }
  })

  test('os destaques são trechos LITERAIS da copy: o negrito não muda uma palavra', () => {
    // Cada chave vale para um ou mais textos (os fundadores e a assinatura têm variantes por
    // página): o trecho aparece no máximo uma vez em cada variante e em pelo menos uma delas.
    const textos = new Map<string, string[][]>()
    for (const page of Object.values(COMUNIDADE_PAGES)) {
      for (const section of page.sections)
        textos.set(section.id, [section.groups.flatMap((group) => group.paragraphs)])
      textos.set(`${page.id}:convite`, [page.closing.groups.flatMap((group) => group.paragraphs)])
    }
    textos.set(
      'origem',
      [SHARED_COPY.founder, FOUNDER_SEM_RELATO].map((founder) =>
        founder.groups.flatMap((group) => group.paragraphs),
      ),
    )
    // A abertura da assinatura não recebe negrito; os itens começam no segundo parágrafo.
    const ofertas = [SHARED_COPY.offer, COMUNIDADE_PAGES.continuar.offer]
    textos.set(
      'assinatura',
      ofertas.map((offer) => (offer?.paragraphs ?? []).slice(1)),
    )
    for (const [chave, frases] of Object.entries(DESTAQUES)) {
      const variantes = textos.get(chave)
      expect([chave, Boolean(variantes)]).toEqual([chave, true])
      for (const frase of frases) {
        const vezes = (variantes ?? []).map(
          (paragrafos) => paragrafos.filter((paragrafo) => paragrafo.includes(frase)).length,
        )
        expect([frase, vezes.every((n) => n <= 1), vezes.some((n) => n === 1)]).toEqual([
          frase,
          true,
          true,
        ])
      }
      // Partido em trechos e colado de volta, o parágrafo é o mesmo, com o negrito no lugar.
      for (const paragrafo of (variantes ?? []).flat()) {
        const trechos = comDestaques(paragrafo, frases)
        expect(trechos.map((trecho) => trecho.texto).join('')).toBe(paragrafo)
        expect(trechos.filter((trecho) => trecho.forte).length).toBe(
          frases.filter((frase) => paragrafo.includes(frase)).length,
        )
      }
    }
    // Na assinatura, cada item da lista abre em negrito, nas duas variantes.
    for (const offer of ofertas) {
      for (const item of (offer?.paragraphs ?? []).slice(1, -1))
        expect([item.slice(0, 40), DESTAQUES.assinatura?.some((f) => item.startsWith(f))]).toEqual([
          item.slice(0, 40),
          true,
        ])
    }
  })

  test('relatos: falas reais com retrato, sem repetir na mesma página', () => {
    const pasta = join(SRC, '..', 'public', 'img', 'comunidade-dos-criadores')
    for (const [id, relato] of Object.entries(RELATOS)) {
      expect([id, existsSync(join(pasta, relato.retrato))]).toEqual([id, true])
      expect(relato.fala.length).toBeGreaterThan(20)
      expect(relato.nome.length).toBeGreaterThan(2)
      expect(relato.papel).toMatch(/^(Aluno|Aluna|Pai d[oa] .+|Mãe d[oa] .+)$/)
      expect(relato.contexto.length).toBeGreaterThan(5)
    }
    for (const page of Object.values(COMUNIDADE_PAGES)) {
      const usadas: RelatoId[] = [
        ...page.sections.flatMap((section) => section.falas ?? []),
        ...(page.showFounder === false ? [] : ((page.founder ?? SHARED_COPY.founder).falas ?? [])),
        ...((page.offer ?? SHARED_COPY.offer).falas ?? []),
      ]
      for (const id of usadas) expect([page.id, id, id in RELATOS]).toEqual([page.id, id, true])
      const repetidas = [...new Set(usadas.filter((id, i) => usadas.indexOf(id) !== i))]
      expect([page.id, repetidas]).toEqual([page.id, []])
      // A faixa tem cartas; a fala solta não entra na banda navy (contraste da carta branca).
      for (const section of page.sections) {
        if (section.layout === 'relatos')
          expect((section.falas ?? []).length).toBeGreaterThanOrEqual(3)
        if (section.layout === 'band') expect(section.falas ?? []).toEqual([])
      }
    }
    // Toda fala guardada aparece em alguma página (continuidade, 9 a 17, criar junto, cartas do
    // resultado do quiz ou citada numa dúvida) ou está na reserva, com o motivo. O convite final,
    // que o corpo monta sem relatos, não declara falas.
    const citadas = new Set<string>([
      ...Object.values(COMUNIDADE_PAGES).flatMap((page) => [
        ...page.sections.flatMap((section) => section.falas ?? []),
        ...(page.showFounder === false ? [] : ((page.founder ?? SHARED_COPY.founder).falas ?? [])),
        ...((page.offer ?? SHARED_COPY.offer).falas ?? []),
      ]),
      ...RELATOS_9A17,
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'oferta', 'pagina-menor9.ts'),
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'quiz', 'result-copy-9a17.ts'),
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'quiz', 'result-copy-m9.ts'),
    ])
    for (const id of relatosNoModulo(
      'funnels',
      'comunidade-dos-criadores',
      'oferta',
      'pagina-menor9.ts',
    ))
      expect([id, id in RELATOS]).toEqual([id, true])
    for (const id of RELATOS_9A17) expect([id, id in RELATOS]).toEqual([id, true])
    const duvidas = JSON.stringify([
      FAQ,
      FAQ_EXTRA,
      ...Object.values(COMUNIDADE_PAGES).map((page) => page.faq),
    ])
    for (const [id, relato] of Object.entries(RELATOS)) {
      const citada = citadas.has(id) || duvidas.includes(relato.fala)
      const reserva = id in RELATOS_RESERVA
      // Citada e na reserva ao mesmo tempo seria uma reserva esquecida.
      expect([id, citada !== reserva]).toEqual([id, true])
    }
    for (const motivo of Object.values(RELATOS_RESERVA)) expect(motivo?.length).toBeGreaterThan(20)
    for (const page of Object.values(COMUNIDADE_PAGES))
      expect([page.id, page.closing.falas ?? []]).toEqual([page.id, []])
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
