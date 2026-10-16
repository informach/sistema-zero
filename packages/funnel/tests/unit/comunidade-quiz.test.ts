import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ARQUIVO_PERGUNTAS,
  ARQUIVO_RESULTADOS,
  espelhoPerguntas,
  espelhoResultados,
  PASTA_ESPELHO_QUIZ,
} from '../../scripts/espelho-quiz-comunidade'
import { RELATOS } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import {
  activeCommunitySteps,
  applyCommunityAnswer,
  communityDecision,
  completesQuiz,
  isCommunityQuizComplete,
  profileScores,
  QUIZ_VERSION,
  stepOnScreen,
} from '../../src/funnels/comunidade-dos-criadores/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  quizHeadlineId,
  quizPathWithHeadline,
} from '../../src/funnels/comunidade-dos-criadores/quiz/entry-copy'
import { paraFeminino } from '../../src/funnels/comunidade-dos-criadores/quiz/genero'
import {
  CALCULADORA_POR_DIA,
  COMMUNITY_QUESTIONS,
  HORAS_POR_ANO,
} from '../../src/funnels/comunidade-dos-criadores/quiz/questions'
import {
  buildCommunityResult,
  type CommunityResult,
} from '../../src/funnels/comunidade-dos-criadores/quiz/result'
import * as COPY from '../../src/funnels/comunidade-dos-criadores/quiz/result-copy'
import { orderedOptions } from '../../src/islands/ComunidadeQuiz'
import type { QuizAnswers } from '../../src/lib/quiz-types'

export const communityAnswers = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 10,
  crianca: 'filho_9_11',
  tempo_tela: '2_4h',
  computador: 'sim',
  cena: 'A',
  quando_trava: 'larga',
  tempo_criacao: 'quase_nada',
  preocupacao: 'A',
  cena_desejada: 'A',
  garantia: 'acompanhar',
  sintese: 'A',
  ...patch,
})
const options = (key: string) => COMMUNITY_QUESTIONS.find((s) => s.key === key)!.opcoes
const values = (key: string) => options(key).map((o) => o.value)
/** O perfil F inteiro, com a parte da escola escolhida. */
const perfilF = (patch: QuizAnswers = {}) =>
  communityAnswers({ cena: 'F', preocupacao: 'F', cena_desejada: 'F', sintese: 'F', ...patch })

/** Todo o texto que a família lê no resultado. */
const resultText = (r: CommunityResult) =>
  [
    r.title,
    r.approximateNote ?? '',
    ...r.told,
    ...r.why,
    ...r.change,
    ...r.where,
    ...r.conditions.flatMap((c) => [c.title, c.text]),
    ...r.next,
    r.cta,
  ].join('\n')

/**
 * As 1.080 combinações das quatro perguntas de perfil. As outras respostas (e a pergunta extra)
 * são sorteadas de forma INDEPENDENTE, com semente fixa: um índice comum deixaria pares inteiros
 * de fora (filha nunca com "orçamento", por exemplo).
 */
function* everyProfileCombination(): Generator<QuizAnswers> {
  let seed = 20261016
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const cena of values('cena'))
    for (const preocupacao of values('preocupacao'))
      for (const cena_desejada of values('cena_desejada'))
        for (const sintese of values('sintese')) {
          const base = communityAnswers({
            crianca: sorteio(values('crianca').slice(0, 4)),
            tempo_tela: sorteio(values('tempo_tela')),
            computador: sorteio(values('computador')),
            quando_trava: sorteio(values('quando_trava')),
            tempo_criacao: sorteio(values('tempo_criacao')),
            garantia: sorteio(values('garantia')),
            cena,
            preocupacao,
            cena_desejada,
            sintese,
          })
          const extra = activeCommunitySteps(base).find((s) => s.condicional)
          if (extra) base[extra.key] = sorteio(extra.opcoes.map((o) => o.value))
          yield base
        }
}

// Unicode: \b do JS não entende acentos.
const masculino =
  /(?<![\p{L}\p{N}])(ele|Ele|dele|Dele|nele|sozinho|seu filho|Seu filho)(?![\p{L}\p{N}])/u
/** "ele" na copy é SEMPRE a criança: o personagem e o enunciado não podem virar "ela". */
const femininoErrado =
  /(?<![\p{L}])ela (encosta|pede|aparece|anda|pula|some|reage|soma)(?![\p{L}])|o que ela pede/u
/** O produto antes da hora ("as aulas de ciências" é a escola; "a aula", "na aula" seria o produto). */
const produto =
  /Comunidade|Estúdio|Pinta|Recados|Zappy|[Pp]lataforma|Mural|(?<![\p{L}])([AaNnDd]a|[Aa]s) aulas?(?! de ciências)(?![\p{L}])|(?<![\p{L}])cursos?(?![\p{L}])/u

describe('Comunidade v5: perguntas em SPIN, sem o produto antes do resultado', () => {
  test('entrada, perguntas e títulos montados falam só da criança e da casa', () => {
    const todos = (a: QuizAnswers) =>
      COMMUNITY_QUESTIONS.map((s) => stepOnScreen(s, a)).map((s) => ({
        t: s.titulo,
        h: s.subtitulo,
        o: s.opcoes,
      }))
    const before = JSON.stringify([
      QUIZ_ENTRY,
      QUIZ_HEADLINES,
      todos(communityAnswers()),
      todos(communityAnswers({ crianca: 'filha_12_14', tempo_tela: 'menos_1h' })),
    ])
    expect(before).not.toMatch(
      /Comunidade|Estúdio|Pinta|Jornada|Recados|Zappy|plataforma|assinatura|\baulas?\b|\bcursos?\b|R\$|preço/i,
    )
    // A criação de jogos não aparece como solução antes do resultado (decisão de 16/10). "Jogo"
    // só aparece quando descreve a família ("ele inventa jogos", "a vontade de criar jogos").
    expect(before).not.toMatch(
      /criar (os |o )?(seus |seu |próprios |próprio )jogos?|crie |aprend\w* criando|cria os próprios/i,
    )
    expect(before).not.toMatch(/Descubra|descobrir/)
  })
  test('a manchete padrão é a recomendada; `?manchete=tela` mostra a alternativa', () => {
    expect(quizHeadlineId(null)).toBe('padrao')
    expect(quizHeadlineId('qualquer')).toBe('padrao')
    expect(quizHeadlineId('tela')).toBe('tela')
    expect(QUIZ_HEADLINES.padrao.title).toBe(
      'Em três minutos, veja como usar o que seu filho já gosta de fazer para ele aprender mais',
    )
    for (const h of Object.values(QUIZ_HEADLINES)) expect(h.title).toContain(h.emphasis)
    // Os links de volta ao quiz mantêm a manchete que a família viu.
    expect(quizPathWithHeadline('/kids/x', 'tela')).toBe('/kids/x/quiz?manchete=tela')
    expect(quizPathWithHeadline('/kids/x', 'padrao')).toBe('/kids/x/quiz')
    expect(quizPathWithHeadline('/kids/x', undefined)).toBe('/kids/x/quiz')
  })
  test('dez perguntas para todos e uma condicional só para B, C e F', () => {
    const base = COMMUNITY_QUESTIONS.filter((s) => !s.condicional)
    expect(base).toHaveLength(10)
    const cases: Record<string, string | undefined> = {
      A: undefined,
      B: 'ferramenta',
      C: 'desenho',
      D: undefined,
      F: 'escola',
    }
    for (const [p, extra] of Object.entries(cases)) {
      const steps = activeCommunitySteps(
        communityAnswers({ cena: p, preocupacao: p, cena_desejada: p, sintese: p }),
      )
      expect(steps.filter((s) => s.condicional).map((s) => s.key)).toEqual(extra ? [extra] : [])
      expect(steps).toHaveLength(extra ? 11 : 10)
    }
  })
  test('cada pergunta tem um papel no SPIN e as etapas seguem a ordem', () => {
    const order = COMMUNITY_QUESTIONS.map((s) => s.etapa)
    expect(order.indexOf('casa')).toBeGreaterThan(order.lastIndexOf('rotina'))
    expect(order.indexOf('desejo')).toBeGreaterThan(order.lastIndexOf('casa'))
    expect(COMMUNITY_QUESTIONS.every((s) => s.rotuloCurto)).toBe(true)
    expect(new Set(COMMUNITY_QUESTIONS.map((s) => s.eventName)).size).toBe(
      COMMUNITY_QUESTIONS.length,
    )
    expect(
      COMMUNITY_QUESTIONS.every((s) => s.eventName.startsWith('respondeu_comunidade_v5_')),
    ).toBe(true)
  })
  test('a calculadora repete o tempo por dia e dá a faixa por ano', () => {
    const step = COMMUNITY_QUESTIONS.find((s) => s.key === 'tempo_criacao')!
    for (const tempo of Object.keys(HORAS_POR_ANO)) {
      const titulo = stepOnScreen(step, communityAnswers({ tempo_tela: tempo })).titulo
      expect(titulo).toBe(
        `${CALCULADORA_POR_DIA[tempo]} por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?`,
      )
      expect(titulo).toContain(HORAS_POR_ANO[tempo]!)
      expect(titulo).not.toStartWith('Isso')
    }
  })
  test('para uma filha, as perguntas viram "ela" e nada fica no masculino', () => {
    const filha = communityAnswers({ crianca: 'filha_12_14', cena: 'B', sintese: 'B' })
    for (const step of COMMUNITY_QUESTIONS.slice(1)) {
      const shown = stepOnScreen(step, filha)
      const texto = [shown.titulo, shown.subtitulo ?? '', ...shown.opcoes.map((o) => o.label)]
      expect(texto.join('\n')).not.toMatch(masculino)
      expect(texto.join('\n')).not.toMatch(femininoErrado)
    }
    expect(stepOnScreen(COMMUNITY_QUESTIONS[1]!, filha).titulo).toBe(
      'Num dia comum, quanto tempo ela passa em jogos e vídeos?',
    )
  })
  test('ordem de exibição é estável e mantém as saídas neutras no fim', () => {
    const step = COMMUNITY_QUESTIONS.find((s) => s.key === 'cena')!
    expect(orderedOptions(step, 'lead-1')).toEqual(orderedOptions(step, 'lead-1'))
    expect(orderedOptions(step, 'lead-1').at(-1)?.value).toBe('nenhum')
    expect(
      orderedOptions(COMMUNITY_QUESTIONS.find((s) => s.key === 'sintese')!, 'x').at(-1)?.value,
    ).toBe('conhecer')
  })
  test('o botão diz "Ver o resultado" só quando a resposta escolhida completa o quiz', () => {
    const semSintese = communityAnswers()
    delete semSintese.sintese
    // A e D: a frase-síntese é a última pergunta.
    expect(completesQuiz(semSintese, 'sintese', 'A')).toBe(true)
    expect(completesQuiz(semSintese, 'sintese', 'D')).toBe(true)
    // B: a frase-síntese abre a pergunta extra da ferramenta.
    const rumoB = communityAnswers({ cena: 'B', preocupacao: 'B', cena_desejada: 'B' })
    delete rumoB.sintese
    expect(completesQuiz(rumoB, 'sintese', 'B')).toBe(false)
    // Corrigir a idade depois de "menos de 9" não termina nada.
    expect(
      completesQuiz({ _quiz_version: QUIZ_VERSION, crianca: 'menos_9' }, 'crianca', 'filho_9_11'),
    ).toBe(false)
    // Na revisão, trocar a cena de A para B com a síntese B leva à pergunta extra.
    expect(completesQuiz(communityAnswers({ sintese: 'B', preocupacao: 'B' }), 'cena', 'B')).toBe(
      false,
    )
    expect(completesQuiz(communityAnswers(), 'cena', '')).toBe(false)
  })
})

describe('Comunidade v5: o perfil soma quatro respostas', () => {
  test('pesos: cena e frase-síntese valem 3; preocupação e cena desejada valem 2', () => {
    expect(
      profileScores(
        communityAnswers({ cena: 'A', preocupacao: 'B', cena_desejada: 'C', sintese: 'F' }),
      ),
    ).toEqual({ A: 3, B: 2, C: 2, D: 0, F: 3 })
  })
  test('os exemplos da proposta', () => {
    const decide = (cena: string, preocupacao: string, cena_desejada: string, sintese: string) =>
      communityDecision(
        communityAnswers({
          cena,
          preocupacao,
          cena_desejada,
          sintese,
          escola: 'matematica',
          ferramenta: 'pode_outra',
          desenho: 'movimento',
        }),
      )!
    const coerente = decide('F', 'F', 'F', 'F')
    expect([coerente.profile, coerente.secondary, coerente.state]).toEqual([
      'F',
      null,
      'perfil_claro',
    ])
    // A 5 × F 5: empate, vence a frase-síntese; A vira o segundo perfil.
    const misto = decide('A', 'A', 'F', 'F')
    expect([misto.profile, misto.secondary]).toEqual(['F', 'A'])
    // C 3, D 2, B 2: C com a abertura "o caminho mais perto"; no segundo lugar, a preocupação vence.
    const espalhado = decide('C', 'D', 'B', 'conhecer')
    expect([espalhado.profile, espalhado.secondary, espalhado.state]).toEqual([
      'C',
      'D',
      'perfil_aproximado',
    ])
    // Só a cena desejada aponta: sempre sai um perfil.
    const neutro = decide('nenhum', 'nenhum', 'D', 'conhecer')
    expect([neutro.profile, neutro.secondary, neutro.state]).toEqual([
      'D',
      null,
      'perfil_aproximado',
    ])
  })
  test('as cinco motivações levam às cinco páginas de oferta', () => {
    const destino: Record<string, string> = {
      A: '/kids/comunidade-dos-criadores/oferta',
      B: '/kids/comunidade-dos-criadores/oferta/criacao-de-jogos',
      C: '/kids/comunidade-dos-criadores/oferta/expressao-visual',
      D: '/kids/comunidade-dos-criadores/oferta/formacao-tecnologica',
      F: '/kids/comunidade-dos-criadores/oferta/habilidades-escolares',
    }
    for (const [p, path] of Object.entries(destino)) {
      const respostas = communityAnswers({
        cena: p,
        preocupacao: p,
        cena_desejada: p,
        sintese: p,
        ferramenta: 'pode_outra',
        desenho: 'movimento',
        escola: 'leitura',
      })
      const r = buildCommunityResult(respostas)!
      expect(r.offerPath).toBe(path)
      expect(r.cta).toBe(COPY.PROFILE_COPY[p as 'A'].cta)
      expect(buildCommunityResult({ ...respostas, crianca: 'filha_9_11' })!.cta).toBe(
        paraFeminino(COPY.PROFILE_COPY[p as 'A'].cta),
      )
    }
  })
  test('mudar uma resposta de perfil troca a pergunta extra e apaga a antiga', () => {
    const b = communityAnswers({
      cena: 'B',
      preocupacao: 'B',
      cena_desejada: 'B',
      sintese: 'B',
      ferramenta: 'roblox',
    })
    expect(isCommunityQuizComplete(b)).toBe(true)
    let next = applyCommunityAnswer(b, 'sintese', 'F')!
    next = applyCommunityAnswer(next, 'cena', 'F')!
    next = applyCommunityAnswer(next, 'preocupacao', 'F')!
    expect(next.ferramenta).toBeUndefined()
    expect(isCommunityQuizComplete(next)).toBe(false)
    expect(activeCommunitySteps(next).at(-1)?.key).toBe('escola')
    expect(applyCommunityAnswer(next, 'ferramenta', 'roblox')).toBeNull()
  })
  test('fora da faixa só a primeira pergunta fica ativa; outra versão não completa', () => {
    expect(activeCommunitySteps({ crianca: 'menos_9' }).map((s) => s.key)).toEqual(['crianca'])
    expect(
      isCommunityQuizComplete({ ...communityAnswers(), _quiz_version: 'comunidade-orientacao-v4' }),
    ).toBe(false)
    expect(communityDecision({ ...communityAnswers(), crianca: '15_mais' })).toBeNull()
  })
})

describe('Comunidade v5: o resultado é a ponte até a oferta', () => {
  test('em todas as combinações: sem placeholder, sem produto antes da hora e nas palavras da família', () => {
    let n = 0
    let filhas = 0
    for (const answers of everyProfileCombination()) {
      const r = buildCommunityResult(answers)!
      expect(r).not.toBeNull()
      const all = resultText(r)
      expect(all).not.toMatch(/\{|\}|undefined|null/)
      // O título, o quadro, o porquê e a solução vêm antes do produto.
      expect([r.title, ...r.told, ...r.why, ...r.change].join('\n')).not.toMatch(produto)
      expect(r.where[0]).toStartWith(COPY.COMMUNITY_OPENING)
      // Decisões de 05/10 e 16/10.
      expect(all).not.toMatch(
        /exigir espera|possível espera|espera pela resposta|levar um tempo|em construção|em preparação|curso obrigatório|ainda não liberad/i,
      )
      expect(all.includes('Recados')).toBe(answers.garantia === 'recorrer')
      expect(all).not.toMatch(/—|–|!/)
      // A tela da Jornada mostra os postos "em construção": não entra no resultado.
      expect(r.visual).not.toBe('jornada')
      // Feminino sem sobra de masculino e sem troca do personagem.
      if (String(answers.crianca).startsWith('filha')) {
        filhas++
        expect(all).not.toMatch(masculino)
        expect(all).not.toMatch(femininoErrado)
      }
      // "Na próxima página…" fica colado ao botão.
      expect(r.next.at(-1)).toStartWith('Na próxima página')
      // Cada resposta volta no quadro; nunca dois relatos da mesma pessoa.
      expect(r.told.length).toBeGreaterThanOrEqual(7)
      expect(new Set(r.told).size).toBe(r.told.length)
      expect(r.relatos.length).toBeGreaterThanOrEqual(1)
      expect(new Set(r.relatos.map((id) => RELATOS[id].nome)).size).toBe(r.relatos.length)
      n++
    }
    expect(n).toBe(1080)
    expect(filhas).toBeGreaterThan(400)
  })
  test('perfil F para filhas: todas as partes da escola, necessidades e computadores', () => {
    for (const escola of values('escola'))
      for (const garantia of values('garantia'))
        for (const computador of values('computador'))
          for (const cena of ['F', 'nenhum']) {
            const r = buildCommunityResult(
              perfilF({ crianca: 'filha_9_11', escola, garantia, computador, cena }),
            )!
            const all = resultText(r)
            expect(all).not.toMatch(masculino)
            expect(all).not.toMatch(femininoErrado)
            expect(all).not.toMatch(/\{|\}|undefined/)
          }
  })
  test('"Por que isso acontece" só afirma a cena de casa quando a família a escolheu', () => {
    const viaEscola = buildCommunityResult(perfilF({ cena: 'A', escola: 'matematica' }))!
    expect(viaEscola.decision.profile).toBe('F')
    expect(viaEscola.why[0]).not.toContain('na lição')
    expect(viaEscola.why[0]).toContain('o que mais preocupa é que a dificuldade na escola')
    expect(viaEscola.why[0]).toContain(COPY.SCHOOL_WEIGHT.matematica!)
    expect(viaEscola.why[1]).toBe(COPY.PROFILE_COPY.F.thesis)
    const pelaCena = buildCommunityResult(perfilF({ escola: 'matematica' }))!
    expect(pelaCena.why[0]).toBe(
      'Você contou que, na lição, ele repete o exemplo e trava quando a pergunta muda, principalmente nas contas.',
    )
  })
  test('F: título, porquê, solução e tela acompanham a parte da escola', () => {
    const leitura = buildCommunityResult(perfilF({ cena: 'nenhum', escola: 'leitura' }))!
    expect(leitura.title).toBe(COPY.SCHOOL_TITLE.leitura!)
    expect(leitura.why[1]).toBe(COPY.SCHOOL_THESIS.leitura!)
    expect(leitura.change[0]).toStartWith(COPY.SCHOOL_CHANGE_REPLACE.leitura!)
    expect([leitura.title, ...leitura.why, ...leitura.change].join(' ')).not.toContain('números')
    const ciencias = buildCommunityResult(perfilF({ escola: 'ciencias' }))!
    expect(ciencias.visual).toBe('regra')
    expect(ciencias.where[0]).toContain('experimento do jardim')
    // Contas sem a cena da lição: o título não afirma que ele só repete passos.
    expect(buildCommunityResult(perfilF({ cena: 'nenhum', escola: 'matematica' }))!.title).toBe(
      COPY.TITLE_F_NUMBERS,
    )
    expect(buildCommunityResult(perfilF({ escola: 'vai_bem' }))!.title).toBe(
      COPY.SCHOOL_TITLE.vai_bem!,
    )
    expect(buildCommunityResult(perfilF({ cena: 'nenhum', escola: 'vai_bem' }))!.why[0]).toBe(
      COPY.F_GOING_WELL_WORRY,
    )
  })
  test('A: a calculadora entra no argumento e o título não contradiz "Boa parte"', () => {
    const quaseNada = buildCommunityResult(communityAnswers())!
    expect(quaseNada.why[0]).toContain('quase nada desse tempo, entre 730 e 1.460 horas por ano')
    expect(quaseNada.why[0]).toEndWith(COPY.A_SCENE_BRIDGE)
    expect(quaseNada.why[1]).toEndWith(COPY.THESIS_A_END.padrao)
    const boaParte = buildCommunityResult(communityAnswers({ tempo_criacao: 'boa_parte' }))!
    expect(boaParte.title).toBe(COPY.TITLE_A_GOOD_PART)
    expect(boaParte.why[1]).toEndWith(COPY.THESIS_A_END.boa_parte)
    // "Isso tem explicação." só depois da cena de casa.
    const pelaSintese = buildCommunityResult(communityAnswers({ cena: 'nenhum' }))!
    expect(pelaSintese.why[0]).not.toContain(COPY.A_SCENE_BRIDGE)
  })
  test('o exemplo da proposta: perfil F para uma filha', () => {
    const r = buildCommunityResult(perfilF({ crianca: 'filha_9_11', escola: 'matematica' }))!
    expect(r.title).toBe('Sua filha aprendeu a repetir os passos. Falta ver o que os números fazem')
    expect(r.told[0]).toBe('Sua filha tem entre 9 e 11 anos e pode usar o computador da casa.')
    expect(r.told[1]).toBe(
      'Ela passa de 2 a 4 horas por dia em jogos e vídeos. Isso dá entre 730 e 1.460 horas por ano, e quase nada desse tempo vira alguma coisa que ela mesma fez.',
    )
    expect(r.change[0]).toContain(
      'No jogo que ela cria, cinco é a distância que o personagem anda.',
    )
    expect(r.change[0]).toContain('ela diz o que vai acontecer no placar')
    expect(r.visual).toBe('contador')
    expect(r.relatos).toEqual(['AV08', 'N15'])
    expect(r.approximateNote).toBeNull()
    expect(r.next[0]).toContain('Você disse que quer acompanhar o que ela aprende.')
  })
  test('o segundo perfil ganha um parágrafo próprio, sem mudar a oferta', () => {
    const r = buildCommunityResult(
      communityAnswers({
        cena: 'A',
        preocupacao: 'A',
        cena_desejada: 'F',
        sintese: 'F',
        escola: 'leitura',
      }),
    )!
    expect(r.offerPath).toEndWith('/habilidades-escolares')
    expect(r.change[1]).toBe(COPY.SECONDARY_SENTENCE.A)
  })
  test('quando o segundo perfil é a própria cena desejada, a frase da cena já basta', () => {
    const r = buildCommunityResult(
      communityAnswers({
        cena: 'C',
        preocupacao: 'nenhum',
        cena_desejada: 'B',
        sintese: 'C',
        desenho: 'movimento',
      }),
    )!
    expect(r.decision.secondary).toBe('B')
    expect(r.change).toHaveLength(1)
    expect(r.change[0]).toEndWith(COPY.WISH_SCENE_SENTENCE.B!)
  })
  test('o espelho editorial (copy/quiz-comunidade.md e resultados-quiz.md) é exatamente o código', () => {
    // Gerado por scripts/espelho-quiz-comunidade.ts: mudou a copy, rode o script.
    const ler = (arquivo: string) =>
      readFileSync(join(PASTA_ESPELHO_QUIZ, arquivo), 'utf8').replaceAll('\r\n', '\n')
    expect(ler(ARQUIVO_PERGUNTAS)).toBe(espelhoPerguntas())
    expect(ler(ARQUIVO_RESULTADOS)).toBe(espelhoResultados())
  })
  test('diagnóstico pouco nítido avisa e não repete a cena desejada que abriu o porquê', () => {
    const r = buildCommunityResult(
      communityAnswers({
        cena: 'nenhum',
        preocupacao: 'nenhum',
        cena_desejada: 'D',
        sintese: 'conhecer',
      }),
    )!
    expect(r.approximateNote).toBe(COPY.APPROXIMATE_NOTE)
    expect(r.why[0]).toContain('a cena que quer ver primeiro')
    expect(r.change.join(' ')).not.toContain(COPY.WISH_SCENE_SENTENCE.D!)
  })
  test('a cena "um amigo jogando o jogo dele" traz o relato do Rafael no perfil B', () => {
    const r = buildCommunityResult(
      communityAnswers({
        cena: 'B',
        preocupacao: 'B',
        cena_desejada: 'B',
        sintese: 'B',
        ferramenta: 'pode_outra',
      }),
    )!
    expect(r.relatos[0]).toBe('AV02')
  })
  test('nunca dois relatos da mesma pessoa: o D troca o segundo trecho do Daniel', () => {
    const d = (garantia: string) =>
      buildCommunityResult(
        communityAnswers({
          cena: 'D',
          preocupacao: 'D',
          cena_desejada: 'D',
          sintese: 'D',
          garantia,
        }),
      )!.relatos
    expect(d('sozinho')).toEqual(['N5', 'AV10'])
    expect(d('tempo_tela')).toEqual(['N5', 'AV12'])
    expect(d('orcamento')).toEqual(['N5', 'N14'])
  })
  test('condições: não atendidas mudam o botão; as pendentes só avisam', () => {
    const roblox = buildCommunityResult(
      communityAnswers({
        cena: 'B',
        preocupacao: 'B',
        cena_desejada: 'B',
        sintese: 'B',
        ferramenta: 'roblox',
      }),
    )!
    expect(roblox.conditions.map((c) => [c.kind, c.unmet])).toEqual([['ferramenta', true]])
    expect(roblox.cta).toBe(COPY.CTA_WITH_UNMET_CONDITION)
    const varias = buildCommunityResult(
      perfilF({ computador: 'celular_tablet', garantia: 'ao_vivo', escola: 'reforco' }),
    )!
    expect(varias.conditions.map((c) => [c.kind, c.unmet])).toEqual([
      ['computador', true],
      ['formato', true],
      ['reforco', false],
    ])
    const pendente = buildCommunityResult(
      communityAnswers({
        computador: 'organizar',
        cena: 'C',
        preocupacao: 'C',
        cena_desejada: 'C',
        sintese: 'C',
        desenho: 'nao_sei',
      }),
    )!
    expect(pendente.conditions.map((c) => c.unmet)).toEqual([false])
    expect(pendente.cta).toBe(COPY.PROFILE_COPY.C.cta)
  })
  test('cada opção de cada pergunta tem a sua frase no resultado', () => {
    const cover = (key: string, map: Record<string, string>, skip: string[] = []) => {
      for (const v of values(key)) if (!skip.includes(v)) expect(map[v], `${key}:${v}`).toBeTruthy()
    }
    cover('crianca', COPY.MIRROR_AGE, ['menos_9', '15_mais'])
    cover('computador', COPY.MIRROR_COMPUTER)
    cover('tempo_tela', COPY.MIRROR_SCREEN_TIME)
    cover('tempo_tela', HORAS_POR_ANO)
    cover('tempo_tela', CALCULADORA_POR_DIA)
    cover('tempo_criacao', COPY.MIRROR_CREATION)
    cover('tempo_criacao', COPY.CREATION_SENTENCE)
    cover('cena', COPY.MIRROR_SCENE, ['nenhum'])
    cover('quando_trava', COPY.MIRROR_STUCK)
    cover('quando_trava', COPY.STUCK_SENTENCE)
    cover('preocupacao', COPY.MIRROR_WORRY, ['nenhum'])
    cover('cena_desejada', COPY.MIRROR_WISH_SCENE)
    cover('cena_desejada', COPY.WISH_SCENE_SENTENCE)
    cover('garantia', COPY.MIRROR_NEED)
    cover('garantia', COPY.NEED_SENTENCE, ['ao_vivo'])
    cover('sintese', COPY.MIRROR_SYNTHESIS, ['conhecer'])
    for (const key of ['ferramenta', 'desenho', 'escola']) cover(key, COPY.MIRROR_CONDITIONAL[key]!)
    for (const escola of values('escola'))
      expect(
        COPY.SCHOOL_CHANGE_REPLACE[escola] ?? COPY.SCHOOL_CHANGE_ADD[escola],
        `escola:${escola}`,
      ).toBeTruthy()
  })
  test('"ele" na copy é sempre a criança: nenhuma frase troca o personagem para "ela"', () => {
    const textos: string[] = []
    const coletar = (v: unknown) => {
      if (typeof v === 'string') textos.push(v)
      else if (Array.isArray(v)) v.forEach(coletar)
      else if (v && typeof v === 'object') Object.values(v).forEach(coletar)
    }
    coletar(COPY)
    for (const texto of textos) expect(paraFeminino(texto)).not.toMatch(femininoErrado)
  })
  test('paraFeminino troca só o que a copy usa', () => {
    expect(paraFeminino('Seu filho tem 9 anos e ele mesmo fez o jogo dele, sozinho.')).toBe(
      'Sua filha tem 9 anos e ela mesma fez o jogo dela, sozinha.',
    )
    // "cada filho" é genérico; "elemento" e "pele" não são o pronome.
    expect(paraFeminino('Na área dos pais, cada filho tem um painel. O elemento da pele.')).toBe(
      'Na área dos pais, cada filho tem um painel. O elemento da pele.',
    )
  })
})
