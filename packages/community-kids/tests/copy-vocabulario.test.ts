import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  lessonCompletionRequirements,
  type SectionPendingItem,
  type SectionPendingKind,
  sectionProgressView,
} from '@sistemazero/core/learning'
import { textoDoItem } from '@sistemazero/member-shell/components/lesson-section-status'
import { ADULT_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy'
// Só LEITURA: a régua de concordância é dos roteiros (outro dono); a tela segue a mesma.
import { CONCORDANCIA_ERRADA } from '../../../docs/aulas-interativas/qa/palavras-da-escola'
import { conclusaoRecusada, KIDS_LESSON_COPY, PALAVRAS_DA_ESCOLA } from '../src/lib/lesson-copy'
import {
  linhasVisiveis,
  listarFontes,
  literaisVisiveis,
  naoETextoDeTela,
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
 * Na área da criança curso é **aventura**, aula é **fase**, seção é **parte**, unidade é
 * **Mundo**, o caderno é o **Mapa da Aventura** e quem lê os projetos e responde os recados é **a
 * equipe** (Diretrizes Pedagógicas, seção 6; o "guia" saiu da tela da criança no mesmo dia, e os
 * botões de envio dizem o que vai, sem destinatário). Também saem as palavras que lembram a escola: atividade, entrega,
 * trabalho, devolutiva, lição, formatura, diploma, estudar e nota mínima. Por dentro tudo segue com os
 * nomes de sempre: rotas (`/cursos/…/aulas/…`), identificadores, Admin e a área dos pais.
 *
 * O guarda olha só o TEXTO DE TELA (literais, texto de JSX e rótulos, sem comentários), porque o
 * código fala curso e aula o tempo todo. O alcance é tudo o que desenha a área da criança: o
 * `src/` do app (menos os arquivos da área dos pais); o member-shell que roda dentro dele
 * (`components`, `lib`, `routes` e `server`, porque a frase de uma rota ou de um erro chega à
 * tela); o `core/src` (títulos de parte, metas e frases das cenas, entre outros); e o `src/` do
 * Estúdio, do Pinta, do Molda e do `ui`. O texto compartilhado que muda com o app mora no
 * `LessonCopy`: a versão adulta
 * (`member-shell/src/lib/lesson-copy.ts`) fica fora, a da criança (`lesson-copy-kids.ts`) é
 * varrida como qualquer outro arquivo.
 *
 * O que sobra tem motivo escrito, em dois níveis: o arquivo inteiro cujo texto nunca chega à
 * tela da criança (`FORA_DA_VARREDURA`) e o trecho exato que ela não lê, ou em que a palavra
 * quer dizer outra coisa (`EXCECOES`). Um trecho cobre só as palavras DENTRO dele, e só uma
 * vez: a mesma palavra em outro ponto do texto, ou o trecho repetido em outro literal, reprova.
 */

const PACOTES = join(import.meta.dir, '..', '..')

/** As raízes da varredura, a partir de `packages/`, com o mínimo de arquivos de cada uma. */
const ALCANCE: { raiz: string; minimo: number }[] = [
  { raiz: 'community-kids/src', minimo: 100 },
  { raiz: 'member-shell/src/components', minimo: 50 },
  { raiz: 'member-shell/src/lib', minimo: 20 },
  { raiz: 'member-shell/src/routes', minimo: 5 },
  { raiz: 'member-shell/src/server', minimo: 10 },
  { raiz: 'core/src', minimo: 50 },
  { raiz: 'studio/src', minimo: 300 },
  { raiz: 'pinta/src', minimo: 50 },
  { raiz: 'molda/src', minimo: 300 },
  { raiz: 'ui/src', minimo: 20 },
]

/** Teste e declaração de tipo não vão à tela. */
const NAO_E_FONTE = /\.test\.tsx?$|\.d\.ts$|[\\/]__tests__[\\/]/

/**
 * A área dos pais segue com curso, aula e professor (é a língua deles, e a do Admin). ⚠️ A grade
 * de perfis (`perfis-client.tsx`, "Quem vai criar hoje?") e a página dela ficam DENTRO da
 * varredura: a criança também as lê. O que é dos pais ali dentro é exceção com motivo.
 */
const AREA_DOS_PAIS = [
  'community-kids/src/app/perfis/ambassador-card.tsx',
  'community-kids/src/app/perfis/parent-dashboard.tsx',
  'community-kids/src/app/perfis/purchases-view.tsx',
  'community-kids/src/app/responsavel/',
]

interface ForaDaVarredura {
  /** O arquivo exato, a pasta (termina em `/`) ou um padrão, a partir de `packages/`. */
  caminho: string | RegExp
  motivo: string
}

/**
 * Arquivos inteiros cujo texto não chega à tela da criança. Cada entrada precisa esconder
 * alguma coisa: entrada que não esconde nada é lista que mente.
 */
const FORA_DA_VARREDURA: ForaDaVarredura[] = [
  {
    caminho: 'member-shell/src/lib/lesson-copy.ts',
    motivo:
      'o vocabulário ADULTO do `LessonCopy`; o Kids passa o dele (`lesson-copy-kids.ts`, varrido) pelo `KidsLessonCopy`',
  },
  {
    caminho: 'core/src/learning/requirements.ts',
    motivo:
      'a `action` vira item da faixa "o que falta para seguir", que o Kids troca pelo `kind` (ver o describe de baixo); o `title` só a barra do ADULTO desenha (`!kids`)',
  },
  {
    caminho: 'core/src/learning/section-progression.ts',
    motivo:
      'mensagens de AUTORIA de seção (só o Admin mostra) e o item `locked` ("Conclua a seção anterior"), que o Kids troca pelo `kind`',
  },
  {
    caminho: 'studio/src/examples/',
    motivo:
      'a galeria de exemplos só abre para a equipe (`showExamples`) e o Zappy lê o índice sem citar o exemplo; o texto de dentro é do JOGO',
  },
  {
    caminho: /^studio\/src\/official-extensions\/[^/]+\/(?:examples\/|__gen_)/,
    motivo:
      'os exemplos de cada extensão e o fonte gerado deles: só a equipe abre; "caderno de monstros" e o "Professor" são personagens e objetos do JOGO',
  },
  {
    caminho: 'studio/src/ai/prompts.ts',
    motivo: 'instrução para o modelo de IA do Estúdio, nunca desenhada',
  },
  {
    caminho: /^studio\/src\/official-extensions\/[^/]+\/(?:ai|aiSummary)\.ts$/,
    motivo: 'o manual de cada extensão escrito para o modelo de IA (Zappy), nunca desenhado',
  },
]

interface Excecao {
  /** O arquivo, a partir de `packages/`. */
  arquivo: string
  /** Trechos EXATOS do texto (com os espaços normalizados). */
  trechos: string[]
  motivo: string
}

/**
 * Trechos que a criança não lê, ou em que a palavra quer dizer outra coisa. Cada trecho tem de
 * aparecer UMA vez no arquivo e cobrir alguma palavra; o resto do mesmo texto continua varrido.
 */
const EXCECOES: Excecao[] = [
  {
    arquivo: 'member-shell/src/components/lesson-video-gate.tsx',
    trechos: ['A atividade abre depois que você assistir ao vídeo uma vez.', 'Atividade liberada.'],
    motivo:
      'ramo `kids` falso; o Kids lê "Depois esta parte abre, e é a sua vez!" e "Pronto! Agora é a sua vez"',
  },
  {
    arquivo: 'member-shell/src/components/customer-helpdesk-portal.tsx',
    trechos: ['Ex.: não consigo acessar meu curso'],
    motivo: 'Atendimento: no Kids só abre na área dos pais',
  },
  {
    arquivo: 'member-shell/src/components/quiz-block.tsx',
    trechos: ['Nota mínima:'],
    motivo: 'o Kids desenha o quiz pelo `kids-quiz.tsx` ("Meta: N% de acertos")',
  },
  {
    arquivo: 'member-shell/src/components/lesson-sections.tsx',
    trechos: ['Atividade concluída', 'Atividade obrigatória'],
    motivo: 'o player do Kids passa `showActivityRequirement: false`',
  },
  {
    arquivo: 'member-shell/src/components/lesson-blocks.tsx',
    trechos: ['Esta aula ainda está sendo preparada.'],
    motivo: 'o Kids desenha o bloco "Em breve" pelo `kids-lesson-blocks.tsx`',
  },
  {
    arquivo: 'member-shell/src/components/lesson-progress-bar.tsx',
    trechos: ['Progresso da aula', 'seções concluídas'],
    motivo: 'só o player adulto monta a barra (o Kids tem o `KidsLessonProgress`)',
  },
  {
    arquivo: 'member-shell/src/components/studio/studio-block.tsx',
    trechos: ['Ative o modo de edição no banner para reenviar esta atividade.'],
    motivo: 'só aparece para a equipe, numa sessão de suporte somente leitura',
  },
  {
    arquivo: 'member-shell/src/lib/env.ts',
    trechos: ['downloads de aula'],
    motivo: 'erro de BOOT, lido por quem opera o deploy no log do Railway',
  },
  {
    arquivo: 'member-shell/src/routes/pensa-ai.ts',
    trechos: ['da etapa Z'],
    motivo:
      'no Pensa, "etapa" é o passo do método ZERO (Etapa Z…), não a da escola (decisão de 06/10/2026)',
  },
  {
    arquivo: 'member-shell/src/server/pensa-agents/stage-z.ts',
    trechos: ['da etapa Z (Zerar a Bagunça)'],
    motivo: 'instrução para o modelo do Pensa; e "etapa" é o passo do método ZERO',
  },
  {
    arquivo: 'member-shell/src/server/zappy-ai.ts',
    trechos: [
      'curso é "aventura", aula é "fase", seção é "parte", caderno é "Mapa da Aventura" e quem lê os projetos e responde os recados é "a equipe". Nunca diga aula, curso, professor, aluno, seção ou caderno para a criança.',
    ],
    motivo: 'instrução para o modelo do Zappy: é ela que manda a IA falar a língua da aventura',
  },
  {
    arquivo: 'member-shell/src/server/zappy-ai.ts',
    trechos: ['sem entregar uma solução inteira.'],
    motivo: 'instrução para o modelo do Zappy no modo Ponte, nunca desenhada',
  },
  {
    arquivo: 'core/src/learning/index.ts',
    trechos: ['Entrega e compartilhamento', 'Material do curso'],
    motivo: '`SECTION_INTENT_LABELS`, o tipo de seção que só o editor do Admin mostra',
  },
  {
    arquivo: 'core/src/learning/index.ts',
    trechos: ['Tipo de atividade interativa inválido.'],
    motivo: 'erro da projeção pública (`publicActivity`), que roda no members e na prévia do Admin',
  },
  {
    arquivo: 'core/src/learning/index.ts',
    trechos: ['Esta pergunta mudou. Abra a aula de novo.'],
    motivo:
      '`PERGUNTA_MUDOU`, contrato com o members: o player a reconhece por igualdade e desenha `copy.cena.perguntaMudou`',
  },
  {
    arquivo: 'core/src/learning/index.ts',
    trechos: [
      'A aula precisa ter entre 1 e 60 seções.',
      'As seções precisam ter identificadores diferentes.',
      'Cada bloco deve pertencer a uma seção, sem duplicação.',
      'Informe um título e um objetivo válido para cada seção.',
      'O espaço de trabalho deve ser um Estúdio ou Pinta desta aula.',
      'Escolha um espaço de trabalho incorporado ou uma ferramenta externa.',
    ],
    motivo: '`validateLessonSections`, a validação da AUTORIA (Admin e members)',
  },
  {
    arquivo: 'core/src/learning/section-templates.ts',
    trechos: [
      'A entrega fica em outra etapa.',
      'A criança testa o projeto e envia ao professor. Esta etapa pode vir antes do quiz final.',
      'Critério: atingir a nota mínima do quiz.',
      'Não substitui uma entrega feita em ferramenta externa.',
      'Entregar',
      'Material do curso',
    ],
    motivo:
      'o rótulo e a orientação dos modelos de seção, que só o Admin mostra (o `title` é que vira o título que a criança lê)',
  },
  {
    arquivo: 'studio/src/blockly/blocks/html.ts',
    trechos: [
      'Criar seção com id opcional %1',
      'Cria uma seção (um bloco da página).',
      'Criar título de seção %1',
      'Criar título dentro da seção %1',
      'Seção',
      'dentro de uma seção.',
    ],
    motivo: 'o elemento `<section>` do HTML: é o nome técnico da tag, não a seção da aula',
  },
  {
    arquivo: 'studio/src/blockly/projectCheckAuthoring.ts',
    trechos: ['no Estúdio da seção.', 'com os blocos disponíveis nesta aula.'],
    motivo: 'validação da AUTORIA do objetivo de projeto: só o Admin mostra',
  },
  {
    arquivo: 'studio/src/official-extensions/game-2d/docs.ts',
    trechos: ['ler mundo, etapa, pontos de nascimento'],
    motivo: '`etapa` é um dado do JSON da campanha (o Reino Zero o lê), não a etapa da aula',
  },
  {
    arquivo: 'studio/src/official-extensions/game-3d-advanced/blocks.ts',
    trechos: ['unidades por segundo'],
    motivo: 'unidade de MEDIDA do mundo 3D, não a unidade do curso',
  },
  {
    arquivo: 'studio/src/official-extensions/world-3d/blocks.ts',
    trechos: ['Dar %1 unidades do item %2', 'Tirar %1 unidades do item %2'],
    motivo: 'quantidade de um item da mochila, não a unidade do curso',
  },
  {
    arquivo: 'studio/src/official-extensions/game-3d-advanced/manifest.ts',
    trechos: ['Unidades são METROS do mundo 3D'],
    motivo: 'unidade de MEDIDA do mundo 3D, não a unidade do curso',
  },
  {
    arquivo: 'studio/src/official-extensions/scene-2d/docs.ts',
    trechos: ['em unidades da pista'],
    motivo: 'unidade de MEDIDA da pista, não a unidade do curso',
  },
  {
    arquivo: 'studio/src/official-extensions/game-2d-advanced/docs.ts',
    trechos: ['O kit entrega vida'],
    motivo: '"entrega" é o verbo (o kit dá vida, energia…), não a entrega de trabalho',
  },
  {
    arquivo: 'studio/src/export/deployTemplates.ts',
    trechos: ['# Etapa 1:', '# Etapa 2:'],
    motivo:
      'comentários do Dockerfile que vão no .zip do projeto Pro (as fases do build), não a etapa da aula',
  },
  {
    arquivo: 'molda/src/core/copy.ts',
    trechos: ['Uma unidade equivale à imagem inteira.'],
    motivo: 'unidade de MEDIDA da textura (o mapa UV), não a unidade do curso',
  },
  {
    arquivo: 'molda/src/import/gltfSkinWeightValues.ts',
    trechos: ['somar uma unidade exata'],
    motivo: 'o número 1 (os pesos somam um inteiro), não a unidade do curso',
  },
]

interface Achado {
  arquivo: string
  linha: number
  texto: string
  palavras: string[]
}

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim()

/**
 * O "guia" como PESSOA (decisão da dona, 06/10/2026): quem lê os projetos e responde os recados é "a
 * equipe", e os botões de envio dizem o que vai, sem destinatário. Sobra só o "Guia do Pensa", que é o
 * painel das tarefas e não uma pessoa. A régua pega o artigo antes ("ao guia", "do guia", "seu guia")
 * e o rótulo solto com inicial maiúscula (o autor "Guia" de um recado).
 *
 * ⚠️ Vale só para a PLATAFORMA (o app e o member-shell), que é onde mora a pessoa dos recados. Nas
 * oficinas "guia" é outra coisa e fica: a personagem "Guia" de um jogo de exemplo do Mundo 3D, a
 * linha-guia de um apoio do Molda e o nome do painel de tarefa do Estúdio ("Guia da tarefa").
 */
const GUIA_DA_PLATAFORMA = ['community-kids/', 'member-shell/']
const GUIA_PESSOA =
  /\b(?:[Oo]|[Aa]o|[Dd]o|[Pp]elo|[Pp]ro|[Ss]eu|[Tt]eu|[Mm]eu|[Uu]m|[Nn]osso)\s+guia\b(?!\s+do\s+Pensa)|\bGuia\b(?!\s+do\s+Pensa)/

/**
 * As palavras da escola de um texto que nenhum trecho cobre, e os trechos que cobriram alguma
 * (uma entrada por ocorrência).
 */
function palavrasSoltas(
  texto: string,
  trechos: readonly string[],
): { soltas: string[]; usados: string[] } {
  const palavras = [...texto.matchAll(new RegExp(PALAVRAS_DA_ESCOLA.source, 'gi'))].map((m) => ({
    palavra: m[0],
    de: m.index ?? 0,
    ate: (m.index ?? 0) + m[0].length,
  }))
  const cobertas = new Set<number>()
  const usados: string[] = []
  for (const trecho of trechos) {
    for (let i = texto.indexOf(trecho); i !== -1; i = texto.indexOf(trecho, i + 1)) {
      const dentro = palavras.filter((p) => p.de >= i && p.ate <= i + trecho.length)
      if (!dentro.length) continue
      usados.push(trecho)
      for (const p of dentro) cobertas.add(p.de)
    }
  }
  return { soltas: palavras.filter((p) => !cobertas.has(p.de)).map((p) => p.palavra), usados }
}

const casaCaminho = (caminho: string | RegExp, arquivo: string) =>
  caminho instanceof RegExp
    ? caminho.test(arquivo)
    : caminho.endsWith('/')
      ? arquivo.startsWith(caminho)
      : arquivo === caminho

function varrerAlcance() {
  const achados: Achado[] = []
  /** "o fase", "no parte", "próximo parte": a troca palavra por palavra deixa o gênero errado. */
  const concordancias: string[] = []
  /** O "guia" que responde os recados: na tela da criança ele virou "a equipe". */
  const guias: string[] = []
  const lidos = new Map<string, number>()
  const escondidosPor = new Map<ForaDaVarredura, number>()
  const usosDoTrecho = new Map<string, number>()
  for (const { raiz } of ALCANCE) {
    const fontes = listarFontes(join(PACOTES, raiz)).filter((f) => !NAO_E_FONTE.test(f))
    lidos.set(raiz, fontes.length)
    for (const fonte of fontes) {
      const arquivo = relative(PACOTES, fonte).replaceAll('\\', '/')
      if (AREA_DOS_PAIS.some((pasta) => arquivo.startsWith(pasta))) continue
      const fora = FORA_DA_VARREDURA.find((f) => casaCaminho(f.caminho, arquivo))
      const trechos = EXCECOES.filter((e) => e.arquivo === arquivo).flatMap((e) => e.trechos)
      for (const literal of literaisVisiveis(readFileSync(fonte, 'utf8'), fonte)) {
        if (naoETextoDeTela(literal)) continue
        if (!fora && CONCORDANCIA_ERRADA.test(literal.texto))
          concordancias.push(`${arquivo}:${literal.linha} → ${normalizar(literal.texto)}`)
        const daPlataforma = GUIA_DA_PLATAFORMA.some((pacote) => arquivo.startsWith(pacote))
        if (!fora && daPlataforma && GUIA_PESSOA.test(literal.texto))
          guias.push(`${arquivo}:${literal.linha} → ${normalizar(literal.texto)}`)
        if (!PALAVRAS_DA_ESCOLA.test(literal.texto)) continue
        if (fora) {
          escondidosPor.set(fora, (escondidosPor.get(fora) ?? 0) + 1)
          continue
        }
        const texto = normalizar(literal.texto)
        const { soltas, usados } = palavrasSoltas(texto, trechos)
        for (const trecho of usados) {
          const chave = `${arquivo} → ${trecho}`
          usosDoTrecho.set(chave, (usosDoTrecho.get(chave) ?? 0) + 1)
        }
        if (soltas.length) achados.push({ arquivo, linha: literal.linha, texto, palavras: soltas })
      }
    }
  }
  return { achados, concordancias, guias, lidos, escondidosPor, usosDoTrecho }
}

const descrever = (a: Achado) =>
  `${a.arquivo}:${a.linha} [${a.palavras.join(', ')}] → ${a.texto.slice(0, 120)}`

describe('a criança lê aventura, não escola', () => {
  const varredura = varrerAlcance()

  test('nada que a criança lê diz aula, curso, seção, caderno, professor nem aluno', () => {
    // ⚠️ Guarda que não lê nada aprova tudo, e em silêncio: cada raiz precisa ter sido lida.
    const vazias = ALCANCE.filter(({ raiz, minimo }) => (varredura.lidos.get(raiz) ?? 0) < minimo)
    expect(vazias.map(({ raiz }) => raiz)).toEqual([])
    expect(varredura.achados.map(descrever)).toEqual([])
  })

  test('e a troca não deixou o gênero errado ("o fase", "no parte", "próximo parte")', () => {
    expect(varredura.concordancias).toEqual([])
    // O detector da régua dos roteiros pega o caso que a troca palavra por palavra deixa.
    expect(CONCORDANCIA_ERRADA.test('Voltar ao fase')).toBe(true)
    expect(CONCORDANCIA_ERRADA.test('Voltar à fase')).toBe(false)
  })

  test('e o "guia" não volta: quem lê os projetos e responde os recados é a equipe', () => {
    expect(varredura.guias).toEqual([])
    // A régua pega a pessoa e deixa passar o painel das tarefas do Pensa.
    for (const pessoa of ['Pedir ajuda ao guia', 'Recados do guia', 'O seu guia já viu', 'Guia'])
      expect(GUIA_PESSOA.test(pessoa)).toBe(true)
    for (const painel of ['Guia do Pensa', 'Abra o guia do Pensa', 'Recados da equipe'])
      expect(GUIA_PESSOA.test(painel)).toBe(false)
  })

  test('cada exceção ainda esconde alguma coisa, e uma vez só', () => {
    // Entrada que sobra é lista que mente: ela taparia a volta da palavra no mesmo lugar.
    const foraSemUso = FORA_DA_VARREDURA.filter((f) => !varredura.escondidosPor.get(f)).map((f) =>
      String(f.caminho),
    )
    expect(foraSemUso).toEqual([])
    const trechosFora = EXCECOES.flatMap((e) =>
      e.trechos
        .map((trecho) => ({
          chave: `${e.arquivo} → ${trecho}`,
          usos: varredura.usosDoTrecho.get(`${e.arquivo} → ${trecho}`) ?? 0,
        }))
        .filter(({ usos }) => usos !== 1)
        .map(({ chave, usos }) => `${chave} (${usos}×)`),
    )
    expect(trechosFora).toEqual([])
  })

  test('um trecho cobre só as palavras de dentro dele', () => {
    expect(palavrasSoltas('Nota mínima: 70%', ['Nota mínima:'])).toEqual({
      soltas: [],
      usados: ['Nota mínima:'],
    })
    // A mesma frase com uma palavra NOVA fora do trecho reprova (o `includes` de antes aprovava).
    expect(
      palavrasSoltas('Nota mínima: 70% para concluir a aula', ['Nota mínima:']).soltas,
    ).toEqual(['aula'])
    // Trecho sem palavra da escola não conta como uso.
    expect(palavrasSoltas('Próxima parte', ['Próxima parte']).usados).toEqual([])
  })

  test('o detector pega a escola no texto de tela e ignora o código', () => {
    const achar = (fonte: string, nome?: string) =>
      literaisVisiveis(fonte, nome).filter(
        (l) => !naoETextoDeTela(l) && PALAVRAS_DA_ESCOLA.test(l.texto),
      )
    // Texto de tela: literal, crase com interpolação e texto solto de JSX.
    expect(achar("const t = 'Próxima seção'")).toHaveLength(1)
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const t = `Voltar ao curso ${course.title}`')).toHaveLength(1)
    expect(achar('<p>Envie para o professor</p>')).toHaveLength(1)
    expect(achar('<span>Complete a etapa</span>')).toHaveLength(1)
    expect(achar("toast.error('Não foi possível salvar o trabalho')")).toHaveLength(1)
    expect(achar("const t = 'Meta: nota mínima 70%'")).toHaveLength(1)
    // ⚠️ O que o detector deixava passar até o review de 06/10/2026 (provado por mutação):
    // o texto de JSX depois de `{expr}` (começa com ". "), a palavra solta de rótulo, a crase que
    // sobra uma palavra só, o `aria-label` e as palavras que faltavam na régua.
    expect(achar('<span>{a} de {b} aulas</span>')).toHaveLength(1)
    expect(achar('<p>{x}. Continue nos cursos</p>')).toHaveLength(1)
    expect(achar("const t = 'Aluno'")).toHaveLength(1)
    expect(achar('<h2>Atividades</h2>')).toHaveLength(1)
    expect(achar('<nav aria-label="Aulas" />')).toHaveLength(1)
    expect(achar('<nav aria-label="aulas" />')).toHaveLength(1)
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const t = `${n} cursos`')).toHaveLength(1)
    expect(achar("const t = 'Unidade 1'")).toHaveLength(1)
    expect(achar("const t = 'Leia a devolutiva'")).toHaveLength(1)
    expect(achar("const t = 'Hora de estudar'")).toHaveLength(1)
    expect(achar("const t = 'Seu diploma de formatura'")).toHaveLength(1)
    expect(achar("const t = 'Entregou a lição'")).toHaveLength(1)
    // O erro de um componente chega à tela (o Molda faz `setError(cause.message)`); o da página,
    // da rota e do servidor, não.
    expect(
      achar("throw new Error('Falha ao carregar o curso')", 'src/components/x.tsx'),
    ).toHaveLength(1)
    expect(achar("throw new Error('Falha ao carregar o curso')", 'src/server/x.ts')).toEqual([])
    expect(achar("throw new Error('Falha ao carregar o curso')", 'src/app/x/page.tsx')).toEqual([])
    expect(achar("throw new Error('Falha ao carregar o curso')", 'src/app/api/x/route.ts')).toEqual(
      [],
    )
    // O código JS que o Estúdio injeta no preview é lido por dentro: o comentário dele passa, a
    // frase que aparece no console da criança, não.
    const runtime = '`(function () {\n  // o código do aluno roda aqui\n  var a = 1\n})()`'
    expect(achar(`const r = ${runtime}`)).toEqual([])
    expect(
      achar(
        "const r = `(function () {\n  throw new Error('Peça ao professor para liberar')\n})()`",
      ),
    ).toHaveLength(1)
    // ⚠️ E o que ainda passava depois dele (review independente de 06/10/2026): o runtime que
    // abre com comentário (`// ----`), o manual em markdown (`## …`), o plural de contagem e a
    // frase minúscula com `:` ou `-`, que parecia classe CSS.
    expect(achar("const r = `// ---- HUD\n  ctx.fillText('Fim da aula', 10, 10)\n`")).toHaveLength(
      1,
    )
    expect(
      achar("const r = `\n  /**\n   * o HUD do aluno\n   */\n  ctx.fillText('ok', 1, 1)`"),
    ).toEqual([])
    expect(achar('const docs = `## Jogo 2D\n\nUse na aula para criar o jogo.`')).toHaveLength(1)
    expect(achar("const t = n + ' aulas'")).toHaveLength(1)
    expect(achar("const t = plural(n, 'aula', 'aulas')")).toHaveLength(2)
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar("const t = `${n} ${n === 1 ? 'aula' : 'aulas'}`")).toHaveLength(2)
    expect(achar("const t = 'aula: comece aqui'")).toHaveLength(1)
    expect(achar("const t = 'parte - aula 2'")).toHaveLength(1)
    // Código passa: rota, identificador, classe, seletor, comentário, erro do servidor e log.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const href = `/cursos/${slug}/aulas/${id}`')).toEqual([])
    expect(achar("const id = 'meus-cursos'")).toEqual([])
    expect(achar("const chave = 'aulas'")).toEqual([])
    expect(achar("const c = 'kids-aula w-full flex-1'")).toEqual([])
    expect(achar("const c = 'md:flex -mt-2 sz-aula'")).toEqual([])
    // biome-ignore lint/suspicious/noTemplateCurlyInString: é a FONTE de um arquivo, com a crase dentro
    expect(achar('const c = `kids-aula-${tom} w-full`')).toEqual([])
    expect(achar("const k = tipo === 'aula' ? 'aula' : 'curso'")).toEqual([])
    expect(achar("const s = '.sz-aula'")).toEqual([])
    expect(achar('// a próxima aula do curso')).toEqual([])
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
  /**
   * De onde vem o texto de CADA motivo da faixa. ⚠️ É um `Record` EXAUSTIVO de propósito: um
   * motivo novo no core é erro de tipo aqui (o typecheck do Kids lê os testes), e não um buraco
   * que a lista à mão de antes deixava passar calado.
   * - `core`: o texto sai do core de verdade, nas chamadas logo acima;
   * - `amostra`: o texto é escrito por quem monta o item (o members), copiado daqui de lá;
   * - `fora`: o motivo nunca chega à faixa do Kids com texto de servidor (diz por quê).
   */
  type Origem = { core: true } | { amostra: string; de: string } | { fora: string }
  const ORIGEM_DO_MOTIVO: Record<SectionPendingKind, Origem> = {
    QUIZ_GATE_NOT_PASSED: { core: true },
    STUDIO_GATE_NOT_SUBMITTED: { core: true },
    STUDIO_GATE_NOT_PASSED: { core: true },
    PINTA_GATE_NOT_SUBMITTED: { core: true },
    CERTIFICATE_GATE_NOT_ISSUED: { core: true },
    LEARNING_GATE_INCOMPLETE: { core: true },
    VIDEO_GATE_NOT_WATCHED: { core: true },
    MATERIAL_GATE_NOT_ACCESSED: { core: true },
    LESSON_COMING_SOON: { core: true },
    locked: { core: true },
    SECTION_GATE_INCOMPLETE: {
      fora: 'só existe com `sectionProgress`, na barra do ADULTO (`!kids`); o members monta os itens sem ele',
    },
    authoring: {
      amostra: 'A verificação desta seção precisa ser configurada pelo professor.',
      de: 'members/src/application/learning/section-progression.service.ts',
    },
    'platform-action': {
      amostra: 'Depois de personalizar o avatar, toque em "Verificar minha ação"',
      de: 'members/src/application/learning/section-progression.service.ts',
    },
    'project-check': {
      amostra: 'Confira o objetivo desta parte no seu projeto',
      de: 'members/src/application/learning/section-progression.service.ts',
    },
    lesson: {
      fora: 'o texto é do próprio app (o `completionMessage` do player e o `secoes.pronta`), que o guarda acima já varre',
    },
    other: {
      fora: 'texto cru que o `sectionProgressView` converte; o members manda itens tipados',
    },
  }
  const itens: SectionPendingItem[] = [
    ...[...requisitos, ...emBreve].map((r) => ({ kind: r.reason, text: r.action })),
    ...trancada,
    ...Object.entries(ORIGEM_DO_MOTIVO).flatMap(([kind, origem]) =>
      'amostra' in origem ? [{ kind: kind as SectionPendingKind, text: origem.amostra }] : [],
    ),
  ]

  test('cobre os motivos de verdade (anti-vácuo)', () => {
    const motivos = new Set(itens.map((item) => item.kind))
    const faltando = Object.entries(ORIGEM_DO_MOTIVO)
      .filter(([kind, origem]) => !('fora' in origem) && !motivos.has(kind as SectionPendingKind))
      .map(([kind]) => kind)
    expect(faltando).toEqual([])
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
    expect(
      erroDoServidor({ code: 'GALLERY_DELIVERY_FAILED', message: 'Timeout do members' }, 'x'),
    ).toBe('Não foi possível enviar. Suas criações continuam na galeria. Tente de novo.')
    expect(erroDoServidor({ code: 'VALIDATION_ERROR', message: 'Entrada inválida' }, 'x')).toBe(
      'Não deu certo agora. Confira e tente de novo.',
    )
    // O adulto segue com a frase do servidor.
    expect(
      ADULT_LESSON_COPY.erroDoServidor(
        { code: 'SECTION_LOCKED', message: 'Conclua a seção anterior.' },
        'Padrão',
      ),
    ).toBe('Conclua a seção anterior.')
  })

  test('erro SEM code não é do servidor: a frase dele nunca vai à tela, nos dois apps', () => {
    // `TypeError: Failed to fetch` (rede caiu) chegava inteiro, em inglês.
    const rede = new TypeError('Failed to fetch')
    expect(KIDS_LESSON_COPY.erroDoServidor(rede, 'Padrão')).toBe('Padrão')
    expect(ADULT_LESSON_COPY.erroDoServidor(rede, 'Padrão')).toBe('Padrão')
    expect(ADULT_LESSON_COPY.erroDoServidor({ message: 'Sem código' }, 'Padrão')).toBe('Padrão')
    // O gateway caiu (502/504) e a resposta veio sem envelope: o `apiSend` inventa
    // `{ code: 'ERROR', message: 'Algo deu errado.' }`. Não é frase do servidor.
    const semEnvelope = { status: 502, code: 'ERROR', message: 'Algo deu errado.' }
    expect(KIDS_LESSON_COPY.erroDoServidor(semEnvelope, 'Padrão')).toBe('Padrão')
    expect(ADULT_LESSON_COPY.erroDoServidor(semEnvelope, 'Padrão')).toBe('Padrão')
    // Código de verdade com a frase que faltou no envelope: a frase inventada também não vale.
    expect(
      ADULT_LESSON_COPY.erroDoServidor({ code: 'X', message: 'Algo deu errado.' }, 'Padrão'),
    ).toBe('Padrão')
  })

  test('a recusa de concluir a fase troca pelo code, e a desconhecida só passa sem escola', () => {
    // Antes caía sempre na frase padrão, e a sessão de suporte lia "Tente novamente".
    expect(
      conclusaoRecusada({
        code: 'IMPERSONATION_READONLY',
        message: 'Sessão de suporte é somente-leitura.',
      }),
    ).toBe('Sessão de suporte é só leitura. Ative o modo de edição no banner.')
    expect(
      conclusaoRecusada({ code: 'QUIZ_GATE_NOT_PASSED', message: 'Conclua o quiz da aula' }),
    ).toBe('Passe no quiz desta fase para concluir.')
    expect(conclusaoRecusada({ code: 'OUTRO', message: 'Escolha um perfil.' })).toBe(
      'Escolha um perfil.',
    )
    const padrao = 'Não foi possível concluir a fase. Tente novamente.'
    expect(conclusaoRecusada({ code: 'OUTRO', message: 'Conclua a aula anterior.' })).toBe(padrao)
    expect(conclusaoRecusada(new TypeError('Failed to fetch'))).toBe(padrao)
    expect(conclusaoRecusada({ status: 502, code: 'ERROR', message: 'Algo deu errado.' })).toBe(
      padrao,
    )
    expect(conclusaoRecusada(undefined)).toBe(padrao)
  })

  test('os dois rótulos de navegação das partes têm nomes diferentes (leitor de tela)', () => {
    for (const copy of [KIDS_LESSON_COPY, ADULT_LESSON_COPY])
      expect(copy.secoes.indice).not.toBe(copy.secoes.lista)
  })
})
