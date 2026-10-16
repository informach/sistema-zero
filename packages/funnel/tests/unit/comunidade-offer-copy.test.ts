import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ARQUIVOS_ESPELHO,
  espelhoDaPagina,
  PASTA_ESPELHO,
} from '../../scripts/espelho-copy-comunidade'
import {
  COMUNIDADE_PAGES,
  comunidadeOfferPath,
  isComunidadePage,
  isComunidadeProfile,
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
import { RELATOS } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import {
  FAQ,
  FAQ_EXTRA,
  FOUNDER_COM_ESCOLA,
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
const publicCopy = JSON.stringify({
  pages: COMUNIDADE_PAGES,
  shared: SHARED_COPY,
  faq: FAQ,
  extra: FAQ_EXTRA,
  relatos: RELATOS,
})

// Contratos editoriais e comerciais dos perfis e variantes. Verificação do HTML,
// âncoras, imagens carregadas, responsividade e modal complementa estes testes no navegador.
describe('Comunidade: quatro perfis, mesma entrega e contratação', () => {
  test('mantém os quatro perfis com variantes editoriais de endereço próprio', () => {
    expect(comunidadeOfferPath('tempo-de-tela')).toBe('/kids/comunidade-dos-criadores/oferta')
    for (const profile of [
      'criacao-de-jogos',
      'expressao-visual',
      'formacao-tecnologica',
    ] as const) {
      expect(comunidadeOfferPath(profile)).toBe(`/kids/comunidade-dos-criadores/oferta/${profile}`)
      expect(isComunidadeProfile(profile)).toBe(true)
    }
    for (const value of [undefined, '', 'toString', '__proto__', 'adultos']) {
      expect(isComunidadeProfile(value)).toBe(false)
    }
    expect(new Set(Object.values(COMUNIDADE_PAGES).map((page) => page.seoTitle)).size).toBe(6)
    expect(Object.keys(COMUNIDADE_PAGES).filter(isComunidadeProfile)).toHaveLength(4)
  })

  test('habilidades escolares tem rota própria e não vira perfil de quiz', () => {
    expect(isComunidadePage('habilidades-escolares')).toBe(true)
    expect(isComunidadeProfile('habilidades-escolares')).toBe(false)
    expect(comunidadeOfferPath('habilidades-escolares')).toBe(
      '/kids/comunidade-dos-criadores/oferta/habilidades-escolares',
    )
    const page = COMUNIDADE_PAGES['habilidades-escolares']
    expect(page.tourAfterSection).toBe(page.sections[0]?.id)
    expect(page.offer).toBeUndefined()
    const ids = page.faqGroups.flatMap((group) => group.questions)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(Object.keys(page.faq ?? {}).sort())
    expect(Object.keys(page.faqVisuals ?? {}).sort()).toEqual([...ids].sort())
    for (const id of Object.keys(FAQ)) expect(ids).toContain(id)
    for (const id of Object.values(page.faqVisuals ?? {}).flat())
      expect(id in COMUNIDADE_VISUALS || id in PENDING_VISUALS).toBe(true)
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

  test('cada perfil tem todas as respostas comuns, sem duplicação, com uma prioridade própria', () => {
    // Proposta de 16/10/2026: 26 respostas comuns; Roblox, Desafio e desenho só onde importam.
    const questions = Object.keys(FAQ)
    expect(questions).toHaveLength(26)
    const permitidas = new Set([...questions, ...Object.keys(FAQ_EXTRA)])
    const priorities = new Set<string>()
    for (const page of Object.values(COMUNIDADE_PAGES).filter((page) =>
      isComunidadeProfile(page.id),
    )) {
      const ids = page.faqGroups.flatMap((group) => group.questions)
      for (const id of questions) expect([page.id, ids.includes(id)]).toEqual([page.id, true])
      for (const id of ids) expect([page.id, id, permitidas.has(id)]).toEqual([page.id, id, true])
      expect(new Set(ids).size).toBe(ids.length)
      priorities.add(ids.slice(0, 6).join(','))
      expect(page.hero.title).toContain(page.emphasis)
      expect(page.faqTitle).toBe('Mais sobre a experiência do seu filho')
      expect(page.sections.length).toBeGreaterThanOrEqual(7)
      expect(new Set(page.sections.map((section) => section.id)).size).toBe(page.sections.length)
    }
    expect(priorities.size).toBe(4)
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
    expect(comunidadeOfferPath('continuar')).toBe('/kids/comunidade-dos-criadores/oferta/continuar')
    expect(isComunidadePage('continuar')).toBe(true)
    expect(isComunidadeProfile('continuar')).toBe(false)
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
    // A única repetição pensada: na D a tela da aprendizagem do herói volta em "o que você
    // acompanha", ao lado do parágrafo que ela demonstra.
    const permitidas: Record<string, string[]> = { 'formacao-tecnologica': ['aprendizagem'] }
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
      [SHARED_COPY.founder, FOUNDER_SEM_RELATO, FOUNDER_COM_ESCOLA].map((founder) =>
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
    // Toda fala guardada aparece em alguma página (como carta ou citada numa dúvida), e o convite
    // final, que o corpo monta sem relatos, não declara falas que nunca apareceriam.
    const citadas = new Set<string>(
      Object.values(COMUNIDADE_PAGES).flatMap((page) => [
        ...page.sections.flatMap((section) => section.falas ?? []),
        ...(page.showFounder === false ? [] : ((page.founder ?? SHARED_COPY.founder).falas ?? [])),
        ...((page.offer ?? SHARED_COPY.offer).falas ?? []),
      ]),
    )
    const duvidas = JSON.stringify([
      FAQ,
      FAQ_EXTRA,
      ...Object.values(COMUNIDADE_PAGES).map((page) => page.faq),
    ])
    for (const [id, relato] of Object.entries(RELATOS))
      expect([id, citadas.has(id) || duvidas.includes(relato.fala)]).toEqual([id, true])
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
