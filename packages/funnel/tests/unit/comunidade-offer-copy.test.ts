import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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
import { FAQ, SHARED_COPY } from '../../src/funnels/comunidade-dos-criadores/oferta/shared'
import {
  COMUNIDADE_VISUALS,
  FAQ_VISUALS,
  PENDING_VISUALS,
  TOUR,
} from '../../src/funnels/comunidade-dos-criadores/oferta/visuals'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8')
const raw = source('components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro')
const publicCopy = JSON.stringify({ pages: COMUNIDADE_PAGES, shared: SHARED_COPY, faq: FAQ })

// Contratos editoriais e comerciais das quatro páginas. Verificação do HTML,
// âncoras, imagens carregadas, responsividade e modal complementa estes testes no navegador.
describe('Comunidade: quatro perfis, mesma entrega e contratação', () => {
  test('mantém os quatro perfis e acrescenta a página de continuidade', () => {
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
    expect(new Set(Object.values(COMUNIDADE_PAGES).map((page) => page.seoTitle)).size).toBe(5)
  })

  test('cada perfil tem todas as respostas, sem duplicação, com uma prioridade própria', () => {
    const questions = Object.keys(FAQ).sort()
    expect(questions).toHaveLength(40)
    const priorities = new Set<string>()
    for (const page of Object.values(COMUNIDADE_PAGES).filter((page) =>
      isComunidadeProfile(page.id),
    )) {
      const ids = page.faqGroups.flatMap((group) => group.questions)
      expect([...ids].sort()).toEqual(questions)
      expect(new Set(ids).size).toBe(40)
      priorities.add(ids.slice(0, 6).join(','))
      expect(page.hero.title).toContain(page.emphasis)
      expect(page.faqTitle).toBe('Mais sobre a experiência do seu filho')
      expect(page.sections.length).toBeGreaterThanOrEqual(8)
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
    expect(FAQ.liberacao.paragraphs.join(' ')).toContain('cursos em preparação')
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
    expect(ids).toHaveLength(50)
    expect(new Set(ids).size).toBe(50)
    expect([...ids].sort()).toEqual(Object.keys(page.faq ?? {}).sort())
    expect(Object.keys(page.faqVisuals ?? {}).sort()).toEqual([...ids].sort())
    for (const id of Object.keys(FAQ)) expect(ids).toContain(id)
    for (const id of Object.values(page.faqVisuals ?? {}).flat())
      expect(id in COMUNIDADE_VISUALS || id in PENDING_VISUALS).toBe(true)
  })

  test('a transposição preserva cada parágrafo, título, link e célula da copy aprovada', () => {
    const doc = readFileSync(
      join(
        SRC,
        '../../../docs/marketing/kids/comunidade-dos-criadores/copy/pagina-e-continuidade.md',
      ),
      'utf8',
    )
    const strings: string[] = []
    const collect = (value: unknown) => {
      if (typeof value === 'string') strings.push(value)
      else if (Array.isArray(value)) value.forEach(collect)
      else if (value && typeof value === 'object') Object.values(value).forEach(collect)
    }
    collect(COMUNIDADE_PAGES.continuar)
    const missing: string[] = []
    for (const block of doc.trim().split(/\r?\n\r?\n/)) {
      if (block.startsWith('<a ') || block.startsWith('**{{preco_')) continue
      if (block.startsWith('|')) {
        for (const cell of block
          .split(/\r?\n/)
          .filter((line) => !line.includes('---'))
          .flatMap((line) =>
            line
              .split('|')
              .slice(1, -1)
              .map((cell) => cell.trim()),
          ))
          if (!strings.includes(cell)) missing.push(cell)
      } else if (block.startsWith('[')) {
        for (const [, label, href] of block.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
          // Os links editoriais dos planos viram botões que abrem o pré-checkout.
          if (href === '#contratacao') {
            expect([
              COMUNIDADE_PAGES.continuar.offer?.monthly.cta,
              COMUNIDADE_PAGES.continuar.offer?.annual.cta,
            ]).toContain(label)
            continue
          }
          if (!strings.includes(label ?? '') || !strings.includes(href ?? '')) missing.push(block)
        }
      } else if (block.startsWith('- ')) {
        for (const item of block.split(/\r?\n/))
          if (!strings.includes(item.slice(2))) missing.push(item)
      } else if (!strings.includes(block.replace(/^#{1,4} /, ''))) missing.push(block)
    }
    expect(missing).toEqual([])
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
    expect(Object.keys(FAQ_VISUALS).sort()).toEqual(Object.keys(FAQ).sort())
    for (const id of Object.keys(FAQ)) {
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
    // A única repetição pensada: na D o experimento do herói volta em "Você acompanha", ao lado do
    // parágrafo que ele demonstra. A tira "tudo reunido" do fim tem chave própria (`reunida`).
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
    const textos = new Map<string, string[]>()
    for (const page of Object.values(COMUNIDADE_PAGES)) {
      for (const section of page.sections)
        textos.set(
          section.id,
          section.groups.flatMap((group) => group.paragraphs),
        )
      textos.set(
        `${page.id}:convite`,
        page.closing.groups.flatMap((group) => group.paragraphs),
      )
    }
    textos.set(
      'origem',
      SHARED_COPY.founder.groups.flatMap((group) => group.paragraphs),
    )
    textos.set('assinatura', [...SHARED_COPY.offer.paragraphs])
    for (const [chave, frases] of Object.entries(DESTAQUES)) {
      const paragrafos = textos.get(chave)
      expect([chave, Boolean(paragrafos)]).toEqual([chave, true])
      for (const frase of frases) {
        const onde = (paragrafos ?? []).filter((paragrafo) => paragrafo.includes(frase))
        expect([frase, onde.length]).toEqual([frase, 1])
      }
      // Partido em trechos e colado de volta, o parágrafo é o mesmo, com o negrito no lugar.
      for (const paragrafo of paragrafos ?? []) {
        const trechos = comDestaques(paragrafo, frases)
        expect(trechos.map((trecho) => trecho.texto).join('')).toBe(paragrafo)
        expect(trechos.filter((trecho) => trecho.forte).length).toBe(
          frases.filter((frase) => paragrafo.includes(frase)).length,
        )
      }
    }
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
