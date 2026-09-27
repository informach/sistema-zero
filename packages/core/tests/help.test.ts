import { describe, expect, test } from 'bun:test'
import {
  buildHelpSearchText,
  buildHelpZappyText,
  emptyHelpTutorialDocument,
  HELP_RESERVED_SLUGS,
  type HelpTutorialDocument,
  type HelpTutorialEntry,
  helpEditorialWarnings,
  isHelpSlug,
  normalizeHelpQuery,
  scoreHelpTutorial,
  searchHelpTutorials,
  stripHelpMarkdown,
  validateHelpCollection,
  validateHelpTutorial,
} from '../src/help'

const valido: HelpTutorialDocument = {
  title: 'Como ver meu jogo na Pré-visualização',
  summary: 'Onde o jogo aparece enquanto você monta os blocos, em tela larga e no celular.',
  keywords: ['prévia', 'ver o jogo', 'olhinho', 'testar'],
  toolRef: 'estudio-completo',
  steps: [
    {
      id: 'abas',
      title: 'Em tela estreita, abra a aba Pré-visualização',
      body: 'Toque em **Pré-visualização** no alto da área de trabalho. O jogo começa sozinho.',
    },
    {
      id: 'olho',
      title: 'Em tela larga, use o olhinho',
      body: 'O botão **Mostrar pré-visualização** fica na barra de cima. ![O olhinho](https://cdn.exemplo.com/olho.webp)',
      imageUrl: 'https://cdn.exemplo.com/olho.webp',
      imageAlt: 'A barra do Estúdio com o botão do olhinho em destaque',
    },
  ],
}

function entrada(
  partial: Partial<HelpTutorialEntry> & { doc?: HelpTutorialDocument },
): HelpTutorialEntry {
  const doc = partial.doc ?? valido
  return {
    id: partial.id ?? 'id',
    slug: partial.slug ?? 'estudio-pre-visualizacao',
    collectionId: 'c1',
    collectionSlug: 'estudio',
    title: doc.title,
    summary: doc.summary,
    keywords: doc.keywords,
    toolRef: doc.toolRef ?? null,
    searchText: buildHelpSearchText(doc),
    position: 0,
    updatedAt: '2026-09-26T00:00:00.000Z',
    ...partial,
  }
}

describe('validateHelpTutorial', () => {
  test('documento válido não tem bloqueio', () => {
    expect(validateHelpTutorial(valido, { slug: 'estudio-pre-visualizacao' })).toEqual([])
  })

  test('cada bloqueio aparece sozinho', () => {
    const casos: Array<[Partial<HelpTutorialDocument>, string]> = [
      [{ title: 'Oi' }, 'title'],
      [{ summary: 'curto' }, 'summary'],
      [{ steps: [] }, 'steps'],
      [{ steps: [{ id: 'a', title: 'Título', body: '   ' }] }, 'steps.a.body'],
      [{ steps: [{ id: 'a', title: '', body: 'Corpo' }] }, 'steps.a.title'],
      [
        { steps: [{ id: 'a', title: 'T', body: 'C', imageUrl: 'https://x.com/a.png' }] },
        'steps.a.imageAlt',
      ],
      [
        {
          steps: [
            { id: 'a', title: 'T', body: 'C', imageUrl: 'http://x.com/a.png', imageAlt: 'a' },
          ],
        },
        'steps.a.imageUrl',
      ],
      [{ video: { provider: 'vimeo', src: 'https://drive.google.com/x' } }, 'video.src'],
      [{ video: { provider: 'youtube', src: 'https://vimeo.com/123' } }, 'video.src'],
      [{ related: ['estudio-pre-visualizacao'] }, 'related'],
      [{ related: ['Maiúsculo'] }, 'related'],
      [{ toolRef: 'tesoura' as never }, 'toolRef'],
    ]
    for (const [parcial, campo] of casos) {
      const issues = validateHelpTutorial(
        { ...valido, ...parcial },
        { slug: 'estudio-pre-visualizacao' },
      )
      expect(issues.map((i) => i.field)).toContain(campo)
    }
  })

  test('slug reservado ou inválido bloqueia', () => {
    for (const slug of [...HELP_RESERVED_SLUGS, 'Com Espaço', '', '-a']) {
      expect(validateHelpTutorial(valido, { slug }).map((i) => i.field)).toContain('slug')
      expect(isHelpSlug(slug)).toBe(false)
    }
    expect(isHelpSlug('pinta-usar-uma-camada')).toBe(true)
  })

  test('passos com id repetido bloqueiam', () => {
    const issues = validateHelpTutorial(
      { ...valido, steps: [valido.steps[0]!, { ...valido.steps[1]!, id: 'abas' }] },
      { slug: 'x' },
    )
    expect(issues.some((i) => i.field.endsWith('.id'))).toBe(true)
  })

  test('o documento vazio do editor reprova, mas de forma dirigida', () => {
    const issues = validateHelpTutorial(emptyHelpTutorialDocument(), { slug: 'novo' })
    expect(issues.map((i) => i.field)).toEqual(
      expect.arrayContaining(['title', 'summary', 'steps.passo-1.title', 'steps.passo-1.body']),
    )
  })
})

describe('validateHelpCollection', () => {
  test('aceita a coleção certa e reprova ícone e cor fora da lista', () => {
    expect(
      validateHelpCollection({
        slug: 'pinta',
        title: 'Pinta',
        description: 'Desenhos e camadas',
        icon: 'palette',
        tone: 'pinta',
      }),
    ).toEqual([])
    const issues = validateHelpCollection({
      slug: 'colecao',
      title: 'P',
      description: '',
      icon: 'foguete' as never,
      tone: 'roxo' as never,
    })
    expect(issues.map((i) => i.field).sort()).toEqual(['icon', 'slug', 'title', 'tone'])
  })
})

describe('helpEditorialWarnings', () => {
  test('documento cuidado não gera sugestão', () => {
    expect(helpEditorialWarnings(valido)).toEqual([])
  })

  test('pega pitch, travessão, falta de imagem, passo longo e falta de keywords', () => {
    const doc: HelpTutorialDocument = {
      ...valido,
      keywords: [],
      steps: [
        {
          id: 'a',
          title: 'Peça para o seu pai assinar',
          body: `Entre na Comunidade dos Criadores — é rápido. ${'x'.repeat(800)}`,
        },
      ],
    }
    const avisos = helpEditorialWarnings(doc).join('\n')
    expect(avisos).toContain('palavras alternativas')
    expect(avisos).toContain('700 caracteres')
    expect(avisos).toContain('Nenhuma imagem')
    expect(avisos).toContain('convencer os responsáveis')
    expect(avisos).toContain('Comunidade dos Criadores')
    expect(avisos).toContain('travessão')
  })
})

describe('busca', () => {
  test('normaliza acento, caixa e pontuação', () => {
    expect(normalizeHelpQuery('Pré-Visualização!')).toEqual(['pre', 'visualizacao'])
    expect(normalizeHelpQuery('a')).toEqual([])
  })

  test('stripHelpMarkdown tira imagem, link, ênfase e marcação', () => {
    expect(
      stripHelpMarkdown(
        '## Título\n- Toque em **Salvar** ([ajuda](https://x.com)) ![alt](https://x.com/a.png){width=50}',
      ),
    ).toBe('Título Toque em Salvar (ajuda)')
  })

  test('searchText inclui título, resumo, keywords e passos', () => {
    const texto = buildHelpSearchText(valido)
    expect(texto).toContain('pre visualizacao')
    expect(texto).toContain('olhinho')
    expect(texto).toContain('mostrar pre visualizacao')
    expect(texto).not.toContain('https')
  })

  test('"pre visualizacao", "previa" e "prévia" acham o tutorial certo', () => {
    const outro: HelpTutorialDocument = {
      title: 'Como usar uma camada',
      summary: 'Camadas separam partes do desenho para você mexer numa sem bagunçar a outra.',
      keywords: ['camadas', 'esconder', 'trancar'],
      steps: [{ id: 'a', title: 'Crie uma camada', body: 'Toque em **Nova camada**.' }],
    }
    const lista = [entrada({ id: '1' }), entrada({ id: '2', slug: 'pinta-camada', doc: outro })]
    for (const consulta of [
      'pre visualizacao',
      'previa',
      'prévia',
      'Pré-visualização',
      'ver o jogo',
    ]) {
      const hits = searchHelpTutorials(lista, consulta)
      expect(hits[0]?.entry.slug).toBe('estudio-pre-visualizacao')
    }
    expect(searchHelpTutorials(lista, 'camada')[0]?.entry.slug).toBe('pinta-camada')
    expect(searchHelpTutorials(lista, 'camada')).toHaveLength(1)
  })

  test('todos os termos precisam casar; consulta vazia devolve nada', () => {
    const lista = [entrada({})]
    expect(searchHelpTutorials(lista, 'olhinho foguete')).toEqual([])
    expect(searchHelpTutorials(lista, '')).toEqual([])
    expect(searchHelpTutorials(lista, 'olhinho tela')).toHaveLength(1)
  })

  test('título pesa mais que keyword, que pesa mais que corpo', () => {
    const noTitulo = entrada({
      doc: {
        ...valido,
        title: 'Como trancar',
        keywords: [],
        steps: [{ id: 'a', title: 'x', body: 'y' }],
      },
    })
    const naKeyword = entrada({
      doc: {
        ...valido,
        title: 'Outro',
        keywords: ['trancar'],
        steps: [{ id: 'a', title: 'x', body: 'y' }],
      },
    })
    const noCorpo = entrada({
      doc: {
        ...valido,
        title: 'Outro',
        keywords: [],
        steps: [{ id: 'a', title: 'x', body: 'toque em trancar' }],
      },
    })
    const termos = normalizeHelpQuery('trancar')
    expect(scoreHelpTutorial(noTitulo, termos)).toBeGreaterThan(
      scoreHelpTutorial(naKeyword, termos),
    )
    expect(scoreHelpTutorial(naKeyword, termos)).toBeGreaterThan(scoreHelpTutorial(noCorpo, termos))
    expect(scoreHelpTutorial(noCorpo, termos)).toBeGreaterThan(0)
  })

  test('o texto do Zappy é legível, numerado e tem teto', () => {
    const texto = buildHelpZappyText(valido)
    expect(texto.startsWith(valido.summary)).toBe(true)
    expect(texto).toContain('1. Em tela estreita')
    expect(texto).toContain('2. Em tela larga')
    expect(texto).not.toContain('**')
    const longo = buildHelpZappyText({
      ...valido,
      steps: Array.from({ length: 30 }, (_, i) => ({
        id: `s${i}`,
        title: `Passo ${i}`,
        body: 'x'.repeat(200),
      })),
    })
    expect(longo.length).toBeLessThanOrEqual(1_500)
    expect(longo.endsWith('…')).toBe(true)
  })
})
