import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  lessonCompletionRequirements,
  type SectionPendingItem,
  sectionProgressView,
} from '@sistemazero/core/learning'
import { textoDoItem } from '@sistemazero/member-shell/components/lesson-section-status'
import { ADULT_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy'
import { KIDS_LESSON_COPY, PALAVRAS_DA_ESCOLA } from '../src/lib/lesson-copy'
import {
  type LiteralVisivel,
  linhasVisiveis,
  listarFontes,
  literaisVisiveis,
  naoETextoDeTela,
  SRC,
  varrerCopy,
} from './helpers/copy-scan'

/**
 * A criança nunca lê a linguagem com que a EQUIPE monta o curso.
 *
 * Dois termos são internos: **"curso-base"** e os nomes de degrau (**"Iniciante 2D"**,
 * "Avançado 3D"…). Para a criança, trilha se chama pelo POSTO dela ("Trilha Faísca",
 * "Trilha Construtor(a)"). "Etapa" também era daqui; desde 06/10/2026 ela mora no guarda de
 * baixo, junto com o resto do vocabulário da escola.
 *
 * A usuária já apontou esse vazamento DUAS vezes, e nas duas ele tinha voltado por um
 * componente novo. Uma varredura manual não segura isso; um teste segura. A máquina é a
 * mesma do `copy-sem-travessao` (comentários são NOSSOS e podem usar o vocabulário interno
 * à vontade — é justamente onde ele deve estar).
 *
 * ⚠️ `courseTierOf`/`COURSE_TIER_LABELS` continuam vivos como LÓGICA (horizonte, trava,
 * admin): o que este guarda proíbe é a EXIBIÇÃO, não o conceito.
 */

const JARGAO: { nome: string; padrao: RegExp }[] = [
  {
    nome: 'nome de degrau',
    // Só a forma HUMANA, com espaço. O slug `iniciante-2d` é lógica e passa.
    padrao: /\b(iniciante|intermediári?o|avançado|avancado)\s+(2d|3d)\b/i,
  },
  { nome: '"curso-base"', padrao: /curso[\s-]base/i },
]

const temJargao = (texto: string) => JARGAO.some(({ padrao }) => padrao.test(texto))

describe('copy do aluno: vocabulário da criança, não o da equipe', () => {
  test('nenhum termo interno fora de comentário em src/', () => {
    // ⚠️ Guarda que não lê nada aprova tudo, e em silêncio.
    expect(listarFontes().length).toBeGreaterThan(100)

    expect(varrerCopy(temJargao)).toEqual([])
  })

  test('o detector pega cada termo e ignora o que é lógica', () => {
    // Sem estes casos o teste acima passaria com o detector quebrado.
    const achar = (fonte: string) => linhasVisiveis(fonte).filter((l) => temJargao(l.texto))
    expect(achar('<p>Faça o primeiro curso Iniciante 2D</p>')).toHaveLength(1)
    expect(achar('const t = "Trilha Avançado 3D"')).toHaveLength(1)
    expect(achar('const t = "Ir para o curso-base"')).toHaveLength(1)
    // Lógica e comentário passam.
    expect(achar("const tier = 'iniciante-2d'")).toEqual([])
    expect(achar('// o curso-base da etapa Iniciante 2D')).toEqual([])
    expect(achar('const label = COURSE_TIER_LABELS[tier]')).toEqual([])
  })
})

/**
 * ⭐ A criança lê aventura, não escola (decisão da dona, 06/10/2026).
 *
 * Na área da criança curso é **aventura**, aula é **fase**, seção é **parte**, o caderno é o
 * **Mapa da Aventura** e o professor é o **guia** (Diretrizes Pedagógicas, seção 6). Também
 * saem as palavras que lembram a escola: atividade, entrega, trabalho, devolutiva, formatura,
 * diploma, estudar e nota mínima. Por dentro tudo segue com os nomes de sempre: rotas
 * (`/cursos/…/aulas/…`), identificadores, Admin e a área dos pais.
 *
 * O guarda olha só o TEXTO DE TELA (literais e texto de JSX, sem comentários), porque o código
 * fala curso e aula o tempo todo. Ele varre o app E os componentes compartilhados do
 * member-shell que aparecem nas fases: o texto de lá que dependa do app mora no
 * `LessonCopy` (`lib/lesson-copy.ts` do member-shell, fora da varredura), e o Kids passa o dele
 * pelo `KidsLessonCopy`. O que sobra na lista abaixo é texto que só o app ADULTO desenha.
 */

const PACOTES = join(import.meta.dir, '..', '..')
const COMPONENTES_COMPARTILHADOS = join(PACOTES, 'member-shell', 'src', 'components')

/** A área dos pais segue com curso, aula e professor (é a língua deles, e a do Admin). */
const AREA_DOS_PAIS = ['app/perfis/', 'app/responsavel/']

/**
 * Texto do member-shell que a criança NUNCA vê, com o motivo. Cada entrada precisa continuar
 * existindo: uma entrada que sobra esconderia uma volta da palavra no mesmo arquivo.
 */
const SO_NO_ADULTO: { arquivo: string; trecho: string; motivo: string }[] = [
  {
    arquivo: 'lesson-video-gate.tsx',
    trecho: 'A atividade abre depois que você assistir ao vídeo uma vez.',
    motivo: 'ramo `kids` falso; o Kids lê "Depois esta parte abre, e é a sua vez!"',
  },
  {
    arquivo: 'lesson-video-gate.tsx',
    trecho: 'Atividade liberada.',
    motivo: 'ramo `kids` falso; o Kids lê "Pronto! Agora é a sua vez"',
  },
  {
    arquivo: 'customer-helpdesk-portal.tsx',
    trecho: 'Ex.: não consigo acessar meu curso',
    motivo: 'Atendimento: no Kids só abre na área dos pais',
  },
  {
    arquivo: 'quiz-block.tsx',
    trecho: 'Nota mínima:',
    motivo: 'o Kids desenha o quiz pelo `kids-quiz.tsx` ("Meta: N% de acertos")',
  },
  {
    arquivo: 'lesson-sections.tsx',
    trecho: 'Atividade concluída',
    motivo: 'o player do Kids passa `showActivityRequirement: false`',
  },
  {
    arquivo: 'lesson-sections.tsx',
    trecho: 'Atividade obrigatória',
    motivo: 'o player do Kids passa `showActivityRequirement: false`',
  },
  {
    arquivo: 'lesson-blocks.tsx',
    trecho: 'Esta aula ainda está sendo preparada.',
    motivo: 'o Kids desenha o bloco "Em breve" pelo `kids-lesson-blocks.tsx`',
  },
  {
    arquivo: 'lesson-progress-bar.tsx',
    trecho: 'Progresso da aula',
    motivo: 'só o player adulto monta a barra (o Kids tem o `KidsLessonProgress`)',
  },
  {
    arquivo: 'lesson-progress-bar.tsx',
    trecho: 'seções concluídas',
    motivo: 'só o player adulto monta a barra (o Kids tem o `KidsLessonProgress`)',
  },
  {
    arquivo: 'studio-block.tsx',
    trecho: 'Ative o modo de edição no banner para reenviar esta atividade.',
    motivo: 'só aparece para a equipe, numa sessão de suporte somente leitura',
  },
]

interface Achado extends LiteralVisivel {
  arquivo: string
}

function achadosDaEscola(raiz: string): Achado[] {
  const achados: Achado[] = []
  for (const arquivo of listarFontes(raiz)) {
    if (/\.test\.tsx?$/.test(arquivo)) continue
    for (const literal of literaisVisiveis(readFileSync(arquivo, 'utf8'), arquivo)) {
      if (naoETextoDeTela(literal) || !PALAVRAS_DA_ESCOLA.test(literal.texto)) continue
      achados.push({ ...literal, arquivo: relative(raiz, arquivo).replaceAll('\\', '/') })
    }
  }
  return achados
}

const descrever = (a: Achado) => `${a.arquivo}:${a.linha} → ${a.texto.trim().slice(0, 90)}`

describe('a criança lê aventura, não escola', () => {
  test('o app não diz aula, curso, seção, caderno, professor nem aluno para a criança', () => {
    expect(listarFontes().length).toBeGreaterThan(100)
    const achados = achadosDaEscola(SRC).filter(
      (a) => !AREA_DOS_PAIS.some((pasta) => a.arquivo.startsWith(pasta)),
    )
    expect(achados.map(descrever)).toEqual([])
  })

  test('os componentes compartilhados das fases também não', () => {
    const fontes = listarFontes(COMPONENTES_COMPARTILHADOS)
    expect(fontes.length).toBeGreaterThan(50)
    const achados = achadosDaEscola(COMPONENTES_COMPARTILHADOS)
    const permitido = (a: Achado) =>
      SO_NO_ADULTO.some((p) => a.arquivo.endsWith(p.arquivo) && a.texto.includes(p.trecho))
    expect(achados.filter((a) => !permitido(a)).map(descrever)).toEqual([])
    // Entrada que sobra na lista é lista que mente: ela taparia a volta da palavra.
    const usadas = SO_NO_ADULTO.filter(
      (p) => !achados.some((a) => a.arquivo.endsWith(p.arquivo) && a.texto.includes(p.trecho)),
    )
    expect(usadas.map((p) => `${p.arquivo}: ${p.trecho}`)).toEqual([])
  })

  test('o detector pega a escola no texto de tela e ignora o código', () => {
    const achar = (fonte: string) =>
      literaisVisiveis(fonte).filter((l) => !naoETextoDeTela(l) && PALAVRAS_DA_ESCOLA.test(l.texto))
    // Texto de tela: literal, crase com interpolação e texto solto de JSX.
    expect(achar("const t = 'Próxima seção'")).toHaveLength(1)
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const t = `Voltar ao curso ${course.title}`')).toHaveLength(1)
    expect(achar('<p>Envie para o professor</p>')).toHaveLength(1)
    expect(achar('<span>Complete a etapa</span>')).toHaveLength(1)
    expect(achar("toast.error('Não foi possível salvar o trabalho')")).toHaveLength(1)
    expect(achar("const t = 'Meta: nota mínima 70%'")).toHaveLength(1)
    // Código passa: rota, identificador, classe, comentário, erro interno e log.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const href = `/cursos/${slug}/aulas/${id}`')).toEqual([])
    expect(achar("const id = 'meus-cursos'")).toEqual([])
    expect(achar("const c = 'kids-aula w-full flex-1'")).toEqual([])
    expect(achar('// a próxima aula do curso')).toEqual([])
    expect(achar("throw new Error('Falha ao carregar o curso')")).toEqual([])
    expect(achar("console.warn('[aula] seção sem critério')")).toEqual([])
    expect(achar('const ok = itens.map((aula) => aula.id) && x < y')).toEqual([])
  })
})

/**
 * O "o que falta para seguir" chega pronto do servidor, na voz adulta ("Envie seu projeto
 * para o professor"). O Kids troca a frase pelo `kind` (`KIDS_LESSON_COPY.itemPendente`). Este
 * teste passa os textos de VERDADE do core pela troca: um motivo novo no core com palavra da
 * escola reprova aqui antes de chegar à faixa do rodapé.
 */
describe('o que falta para seguir, na voz da aventura', () => {
  const blocos = [
    { id: 'quiz', kind: 'quiz', content: { passingScore: 70, questions: [{}] } },
    { id: 'estudio', kind: 'studio', content: {}, studioState: { submitted: false } },
    {
      id: 'estudio-nota',
      kind: 'studio',
      content: { activity: { passingScore: 60 } },
      studioState: { submitted: true, passed: false },
    },
    { id: 'pinta', kind: 'pinta', content: {} },
    { id: 'certificado', kind: 'certificate', content: {} },
    { id: 'jogo', kind: 'interactive', content: { required: true, activity: { type: 'x' } } },
    { id: 'video', kind: 'video', content: {}, blockRevision: 'r1' },
    { id: 'livro', kind: 'ebook', content: {}, blockRevision: 'r1' },
    { id: 'materiais', kind: 'materials', content: {}, blockRevision: 'r1' },
  ]
  const requisitos = lessonCompletionRequirements({
    blocks: blocos,
    completed: false,
    videoBlockIds: ['video'],
    materialBlockIds: ['livro'],
    materialItems: [{ blockId: 'materiais', itemIds: ['a', 'b'] }],
  })
  const emBreve = lessonCompletionRequirements({
    blocks: [{ id: 'breve', kind: 'coming_soon', content: {} }],
    completed: false,
  })
  const trancada = sectionProgressView(
    'r',
    [
      { id: 's1', title: 'Começo' },
      { id: 's2', title: 'Depois' },
    ],
    new Set(),
    new Map(),
  ).sections[1]?.pendingItems as SectionPendingItem[]
  const itens: SectionPendingItem[] = [
    ...[...requisitos, ...emBreve].map((r) => ({ kind: r.reason, text: r.action })),
    ...trancada,
    {
      kind: 'authoring',
      text: 'A verificação desta seção precisa ser configurada pelo professor.',
    },
  ]

  test('cobre os motivos de verdade (anti-vácuo)', () => {
    const motivos = new Set(itens.map((item) => item.kind))
    for (const motivo of [
      'QUIZ_GATE_NOT_PASSED',
      'STUDIO_GATE_NOT_SUBMITTED',
      'STUDIO_GATE_NOT_PASSED',
      'PINTA_GATE_NOT_SUBMITTED',
      'CERTIFICATE_GATE_NOT_ISSUED',
      'LEARNING_GATE_INCOMPLETE',
      'VIDEO_GATE_NOT_WATCHED',
      'MATERIAL_GATE_NOT_ACCESSED',
      'LESSON_COMING_SOON',
      'locked',
      'authoring',
    ])
      expect(motivos.has(motivo as SectionPendingItem['kind'])).toBe(true)
    // E o adulto continua lendo a frase do servidor: é por isso que a troca existe.
    expect(
      itens.some((item) => PALAVRAS_DA_ESCOLA.test(ADULT_LESSON_COPY.itemPendente(item))),
    ).toBe(true)
  })

  test('nenhuma frase da faixa fala a língua da escola no Kids', () => {
    const frases = itens.map((item) => textoDoItem(item, false, KIDS_LESSON_COPY))
    expect(frases.filter((frase) => PALAVRAS_DA_ESCOLA.test(frase))).toEqual([])
  })

  test('o quiz diz a meta de acertos com o número da fase', () => {
    const quiz = itens.find((item) => item.kind === 'QUIZ_GATE_NOT_PASSED') as SectionPendingItem
    expect(KIDS_LESSON_COPY.itemPendente(quiz)).toBe('Passe no quiz (meta: 70% de acertos)')
  })

  test('o erro do servidor vira a frase da aventura, e a frase da escola cai na padrão', () => {
    const { erroDoServidor } = KIDS_LESSON_COPY
    expect(
      erroDoServidor({ code: 'SECTION_LOCKED', message: 'Conclua a seção anterior.' }, 'x'),
    ).toBe('Conclua a parte anterior para continuar.')
    expect(
      erroDoServidor({ code: 'OUTRO', message: 'Conclua as atividades da aula.' }, 'Padrão'),
    ).toBe('Padrão')
    expect(erroDoServidor({ code: 'OUTRO', message: 'Escolha um perfil.' }, 'Padrão')).toBe(
      'Escolha um perfil.',
    )
    expect(erroDoServidor(null, 'Padrão')).toBe('Padrão')
    // O adulto segue com a frase do servidor.
    expect(
      ADULT_LESSON_COPY.erroDoServidor({ message: 'Conclua a seção anterior.' }, 'Padrão'),
    ).toBe('Conclua a seção anterior.')
  })
})
