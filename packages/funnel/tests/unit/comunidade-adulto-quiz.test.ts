import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  type BlocoConversa,
  type ResultadoConversa,
  semMarcas,
  textoDoResultado,
} from '../../src/content/resultado-conversa'
import {
  activeAdultSteps,
  adultDecision,
  applyAdultAnswer,
  completesAdultQuiz,
  isAdultQuizComplete,
  PROFILE_IDS,
  profileScores,
  QUIZ_VERSION,
  stepOnScreen,
} from '../../src/funnels/comunidade-adulto/quiz/engine'
import {
  DEFAULT_HEADLINE,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  QUIZ_STAGES,
  quizHeadlineId,
} from '../../src/funnels/comunidade-adulto/quiz/entry-copy'
import {
  ADULT_PROFILE_LABELS,
  COMUNIDADE_ADULTO_QUIZ,
} from '../../src/funnels/comunidade-adulto/quiz/index'
import {
  ADULT_QUESTIONS,
  CALCULADORA_POR_SEMANA,
  HORAS_POR_ANO,
} from '../../src/funnels/comunidade-adulto/quiz/questions'
import { ADULT_OFFER_PATH, buildAdultResult } from '../../src/funnels/comunidade-adulto/quiz/result'
import * as COPY from '../../src/funnels/comunidade-adulto/quiz/result-copy'
import type { QuizAnswers } from '../../src/lib/quiz-types'

/** A combinação do `EX_ADULTO` (perfil B), o resultado aprovado no Canvas. */
const EX_ANSWERS: QuizAnswers = {
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 11,
  tempo_jogo: '7_14',
  computador: 'compartilhado',
  programacao: 'nunca',
  cena: 'B',
  tentativa: 'perdi',
  tempo_criacao: 'quase_nada',
  preocupacao: 'B',
  cena_desejada: 'B',
  garantia: 'sozinho',
  sintese: 'B',
  ferramenta: 'qualquer',
}
/** O exemplo com uma resposta trocada (a pergunta extra sai quando o perfil deixa de ser B). */
const respostas = (patch: QuizAnswers = {}): QuizAnswers => {
  const answers = { ...EX_ANSWERS, ...patch }
  const active = new Set(activeAdultSteps(answers).map((s) => s.key))
  for (const key of ['ferramenta', 'codigo']) if (!active.has(key)) delete answers[key]
  return answers
}
const perfil = (p: string, patch: QuizAnswers = {}) =>
  respostas({
    cena: p,
    preocupacao: p,
    cena_desejada: p,
    sintese: p,
    ...(p === 'B' ? { ferramenta: 'qualquer' } : p === 'D' ? { codigo: 'logica' } : {}),
    ...patch,
  })

const step = (key: string) => ADULT_QUESTIONS.find((s) => s.key === key)!
const values = (key: string) => step(key).opcoes.map((o) => o.value)
const result = (answers: QuizAnswers) => buildAdultResult(answers)!
const paragraphs = (r: ResultadoConversa) =>
  r.blocos.flatMap((b) => (b.tipo === 'p' ? [b.texto] : []))
const ctaOf = (r: ResultadoConversa) => r.blocos.at(-1) as Extract<BlocoConversa, { tipo: 'cta' }>

/** Os textos com as marcas, como o componente os recebe. */
const rawTexts = (r: ResultadoConversa): string[] => [
  ...(r.aviso ? [r.aviso] : []),
  r.titulo,
  ...r.blocos.flatMap((b) =>
    b.tipo === 'img'
      ? [b.legenda]
      : b.tipo === 'relato'
        ? [b.texto, b.autor]
        : b.tipo === 'cta'
          ? [b.texto, b.rotulo]
          : [b.texto],
  ),
  r.assinatura,
]
const marksOf = (texto: string) => [...texto.matchAll(/\[\[([^[\]]+)\]\]/g)].map((x) => x[1]!)

/** A palavra que o funil não usa fora dos textos jurídicos (montada aqui para não aparecer). */
const PALAVRA_PROIBIDA = new RegExp(['car', 'reira'].join(''), 'i')
/** O valor que a opção "Servir para trabalhar com jogos" tinha no spec. */
const VALOR_ANTIGO = ['car', 'reira'].join('')
const VOCABULARIO_EVITADO =
  /aluno|lúdico|gamificação|jornada de aprendizagem|desenvolvedor|portfólio|idoso|terceira idade/i
/** O produto antes da hora: nenhuma tela antes do resultado nomeia a oferta. */
const OFERTA =
  /Comunidade|\bcursos?\b|\baulas?\b|plataforma|assinatura|preço|R\$|Estúdio|Sistema Zero/i
/** O produto antes de "Onde isso acontece" na carta. */
const PRODUTO =
  /Comunidade|Estúdio\b|Mural|Recados|plataforma|Sistema Zero|assinatura|preço|\bcursos?\b|\baulas?\b/

/** Todas as strings de um valor (objetos e listas), para as guardas de vocabulário. */
const strings = (valor: unknown): string[] =>
  typeof valor === 'string'
    ? [valor]
    : typeof valor === 'function'
      ? []
      : Array.isArray(valor)
        ? valor.flatMap(strings)
        : valor && typeof valor === 'object'
          ? Object.values(valor).flatMap(strings)
          : []

/**
 * Todas as combinações das quatro perguntas de perfil (192), cada uma com seis rodadas: em cada
 * rodada, as outras perguntas giram com um passo diferente, então toda opção de toda pergunta
 * aparece em cada combinação, e os pares entre elas variam de uma combinação para outra.
 */
function* sweep(): Generator<QuizAnswers> {
  const outras = [
    'tempo_jogo',
    'computador',
    'programacao',
    'tentativa',
    'tempo_criacao',
    'garantia',
  ] as const
  let combo = 0
  for (const cena of values('cena'))
    for (const preocupacao of values('preocupacao'))
      for (const cena_desejada of values('cena_desejada'))
        for (const sintese of values('sintese')) {
          combo++
          for (let i = 0; i < 6; i++) {
            const answers: QuizAnswers = {
              _quiz_version: QUIZ_VERSION,
              _quiz_revision: 12,
              cena,
              preocupacao,
              cena_desejada,
              sintese,
            }
            outras.forEach((key, k) => {
              const vs = values(key)
              answers[key] = vs[(i + combo * (k + 1)) % vs.length]!
            })
            const extra = activeAdultSteps(answers).find((s) => s.condicional)
            if (extra) {
              const vs = extra.opcoes.map((o) => o.value)
              answers[extra.key] = vs[(i + combo) % vs.length]!
            }
            yield answers
          }
        }
}

describe('Quiz adulto v1: perguntas e entrada', () => {
  test('dez perguntas para todos, na ordem do spec, e uma condicional só para B e D', () => {
    expect(ADULT_QUESTIONS.map((s) => s.key)).toEqual([
      'tempo_jogo',
      'computador',
      'programacao',
      'cena',
      'tentativa',
      'tempo_criacao',
      'preocupacao',
      'cena_desejada',
      'garantia',
      'sintese',
      'ferramenta',
      'codigo',
    ])
    expect(ADULT_QUESTIONS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(ADULT_QUESTIONS.filter((s) => !s.condicional)).toHaveLength(10)
    expect(ADULT_QUESTIONS.filter((s) => s.condicional).map((s) => s.key)).toEqual([
      'ferramenta',
      'codigo',
    ])
    expect(ADULT_QUESTIONS.some((s) => s.key === 'idade')).toBe(false)
    const cases: Record<string, string | undefined> = { A: undefined, B: 'ferramenta', D: 'codigo' }
    for (const [p, extra] of Object.entries(cases)) {
      const steps = activeAdultSteps(perfil(p))
      expect(steps.filter((s) => s.condicional).map((s) => s.key)).toEqual(extra ? [extra] : [])
      expect(steps).toHaveLength(extra ? 11 : 10)
    }
  })
  test('chaves, lastStep e eventName únicos; eventos com o prefixo da v1', () => {
    for (const campo of ['key', 'lastStep', 'eventName'] as const)
      expect(new Set(ADULT_QUESTIONS.map((s) => s[campo])).size).toBe(ADULT_QUESTIONS.length)
    for (const s of ADULT_QUESTIONS) {
      expect(s.eventName).toBe(`respondeu_comunidade_adulto_v1_${s.key}`)
      expect(s.lastStep).toBe(`comunidade_adulto_v1_${s.key}`)
      expect(s.tipo).toBe('selecao')
      expect(s.rotuloCurto).toBeTruthy()
      expect(new Set(s.opcoes.map((o) => o.value)).size).toBe(s.opcoes.length)
    }
  })
  test('etapas na ordem: sua rotina, o que trava e o que você quer', () => {
    const order = ADULT_QUESTIONS.map((s) => s.etapa)
    expect(order.slice(0, 3)).toEqual(['rotina', 'rotina', 'rotina'])
    expect(order.slice(3, 7)).toEqual(['trava', 'trava', 'trava', 'trava'])
    expect(order.slice(7)).toEqual(['quer', 'quer', 'quer', 'quer', 'quer'])
    expect(QUIZ_STAGES).toEqual({
      rotina: 'SUA ROTINA',
      trava: 'O QUE TRAVA',
      quer: 'O QUE VOCÊ QUER',
    })
  })
  test('textos do spec; na garantia, só o valor muda para "trabalho"', () => {
    expect(step('tempo_jogo').subtitulo).toBe('Computador, console e celular, tudo junto. Chute.')
    expect(step('cena').opcoes.map((o) => o.label)).toEqual([
      'Jogo há anos e nunca fiz nada além de jogar',
      'Tenho uma ideia de jogo há anos e nunca comecei',
      'Jogo e fico pensando em como fizeram aquilo',
      'Nenhuma dessas',
    ])
    expect(values('garantia')).toEqual([
      'sozinho',
      'recorrer',
      'tempo',
      'orcamento',
      'ao_vivo',
      'trabalho',
    ])
    expect(step('garantia').opcoes.at(-1)?.label).toBe('Servir para trabalhar com jogos')
    expect(step('codigo').titulo).toBe('Para você, aprender a programar é…')
  })
  test('embaralha onde o spec manda, com as saídas neutras e as condições no fim', () => {
    const fixed = Object.fromEntries(
      ADULT_QUESTIONS.map((s) => [s.key, [Boolean(s.shuffle), s.fixedLast ?? []]]),
    )
    expect(fixed).toEqual({
      tempo_jogo: [false, []],
      computador: [false, []],
      programacao: [false, []],
      cena: [true, ['nenhum']],
      tentativa: [true, ['nao_apareceu']],
      tempo_criacao: [false, []],
      preocupacao: [true, ['nenhum']],
      cena_desejada: [true, []],
      garantia: [true, ['ao_vivo', 'trabalho']],
      sintese: [true, ['conhecer']],
      ferramenta: [false, []],
      codigo: [false, []],
    })
    // As opções fixas são as últimas da lista, na ordem em que aparecem.
    for (const s of ADULT_QUESTIONS)
      if (s.fixedLast?.length)
        expect(s.opcoes.slice(-s.fixedLast.length).map((o) => o.value)).toEqual(s.fixedLast)
  })
  test('a calculadora repete as horas por semana e dá a faixa por ano, como no Canvas', () => {
    const calc = step('tempo_criacao')
    expect(stepOnScreen(calc, respostas()).titulo).toBe(
      'De 7 a 14 horas por semana dão entre 364 e 728 horas por ano. Quanto disso virou alguma coisa sua?',
    )
    for (const tempo of values('tempo_jogo')) {
      const titulo = stepOnScreen(calc, respostas({ tempo_jogo: tempo })).titulo
      expect(titulo).toBe(
        `${CALCULADORA_POR_SEMANA[tempo]} por ano. Quanto disso virou alguma coisa sua?`,
      )
      expect(titulo).toContain(HORAS_POR_ANO[tempo]!)
    }
    // Sem a S2, fica o título genérico; as outras perguntas não mudam.
    expect(stepOnScreen(calc, {}).titulo).toBe(calc.titulo)
    expect(stepOnScreen(step('cena'), respostas())).toBe(step('cena'))
  })
  test('nenhuma tela antes do resultado nomeia a oferta', () => {
    const telas = ADULT_QUESTIONS.flatMap((s) =>
      values('tempo_jogo').map((tempo) => stepOnScreen(s, respostas({ tempo_jogo: tempo }))),
    )
    const perguntas = telas.flatMap((s) => [
      s.titulo,
      s.subtitulo ?? '',
      ...s.opcoes.map((o) => o.label),
    ])
    // "Ter professor ao vivo" é a necessidade que a pessoa declara; nenhuma tela cita aula (o Canvas
    // trazia "Ter aula ao vivo", trocado na revisão de 20/10/2026, como no Kids).
    expect(perguntas.join('\n')).not.toMatch(OFERTA)
    expect(perguntas.filter((t) => /aula/i.test(t))).toEqual([])
    // A entrada também não, exceto a assinatura da orientação ("Uma orientação do Sistema Zero").
    const { minor, note, ...entrada } = QUIZ_ENTRY
    expect(JSON.stringify([entrada, QUIZ_HEADLINES, QUIZ_STAGES])).not.toMatch(OFERTA)
    expect(note.replace('Sistema Zero', '')).not.toMatch(OFERTA)
    // A saída de menor pode nomear o produto Kids: é uma saída, não uma pergunta.
    expect(minor.text).toContain('Comunidade dos Criadores Kids')
  })
  test('Light Copy nas perguntas e na entrada', () => {
    const textos = [
      ...ADULT_QUESTIONS.flatMap((s) => [
        s.titulo,
        s.subtitulo ?? '',
        ...s.opcoes.map((o) => o.label),
      ]),
      ...strings(QUIZ_ENTRY),
      ...strings(QUIZ_HEADLINES),
    ].filter(Boolean)
    for (const texto of textos) {
      expect(texto).not.toMatch(/[—–!]/)
      expect(texto).not.toMatch(PALAVRA_PROIBIDA)
      expect(texto).not.toMatch(VOCABULARIO_EVITADO)
      // As perguntas do quiz são perguntas de propósito: a regra 3 (gancho) não vale para elas.
      expect(lintLightCopy(texto).filter((i) => i.rule !== 3)).toEqual([])
    }
    for (const h of Object.values(QUIZ_HEADLINES)) expect(lintLightCopy(h.title)).toEqual([])
  })
  test('entrada e saída de menor como no Canvas; manchete padrão e alternativa', () => {
    expect(QUIZ_ENTRY.eyebrow).toBe('Para quem tem 18 anos ou mais')
    expect(QUIZ_ENTRY.button).toBe('Começar')
    expect(QUIZ_ENTRY.minorLink).toBe('Tenho menos de 18 anos')
    expect(QUIZ_ENTRY.chips.map((c) => c.toUpperCase())).toEqual([
      '3 MINUTOS',
      'SEM CADASTRO',
      'RESULTADO NA HORA',
    ])
    expect(QUIZ_ENTRY.minor).toMatchObject({
      title: 'Com menos de 18, o caminho é com o responsável',
      text: 'A área adulta é para quem tem 18 anos ou mais. A Comunidade dos Criadores Kids é para quem tem até 17, com a conta no nome de um responsável. Peça para ele responder o quiz infantil.',
      button: 'Abrir o quiz para o responsável',
    })
    expect(QUIZ_ENTRY.pageTitle.length).toBeLessThan(40)
    expect(quizHeadlineId(null)).toBe('padrao')
    expect(quizHeadlineId('qualquer')).toBe('padrao')
    expect(quizHeadlineId('ideia')).toBe('ideia')
    expect(DEFAULT_HEADLINE).toBe('padrao')
    expect(QUIZ_HEADLINES.padrao.title).toBe(
      'Você sempre quis fazer um jogo. Em 3 minutos, veja o que está te travando e por onde começar.',
    )
    for (const h of Object.values(QUIZ_HEADLINES)) expect(h.title).toContain(h.emphasis)
  })
  test('o botão, a nota e o rodapé seguem o conteúdo, sem o vão até o pé da tela', () => {
    // 20/10/2026: com `margin-top: auto` numa coluna de altura cheia, a entrada abria 330 a 380 px
    // vazios entre os chips e o "Começar" (e o mesmo vão antes do "Voltar" nas perguntas).
    const css = readFileSync(join(import.meta.dir, '../../src/styles/quiz-spin.css'), 'utf8')
    for (const seletor of ['.qz-acoes--fim', '.qz-nota', '.qz-rodape']) {
      const regra = css.match(new RegExp(`\\.qz ${seletor.replace('.', '\\.')} \\{([^}]*)\\}`))
      expect(regra?.[1]).toBeDefined()
      expect(regra?.[1]).not.toMatch(/margin-top:\s*auto/)
    }
    // No computador a entrada inteira fica no meio da altura (o bloco desce junto, sem vão).
    const computador = css.slice(css.indexOf('@media (min-width: 640px)'))
    expect(computador).toMatch(/\.qz \.qz-entrada \{\s*justify-content: center;/)
  })
})

describe('Quiz adulto v1: o motor', () => {
  test('pesos: frase e síntese valem 3; o que incomoda e a cena desejada, 2; neutras, 0', () => {
    expect(
      profileScores(respostas({ cena: 'A', preocupacao: 'B', cena_desejada: 'D', sintese: 'D' })),
    ).toEqual({ A: 3, B: 2, D: 5 })
    expect(
      profileScores(
        respostas({
          cena: 'nenhum',
          preocupacao: 'nenhum',
          cena_desejada: 'A',
          sintese: 'conhecer',
        }),
      ),
    ).toEqual({ A: 2, B: 0, D: 0 })
  })
  test('desempates, segundo perfil e diagnóstico claro ou aproximado', () => {
    const decide = (cena: string, preocupacao: string, cena_desejada: string, sintese: string) => {
      const base = respostas({ cena, preocupacao, cena_desejada, sintese })
      const extra = activeAdultSteps(base).find((s) => s.condicional)
      if (extra) base[extra.key] = extra.opcoes[0]!.value
      const d = adultDecision(base)!
      return [d.profile, d.secondary, d.state]
    }
    // A 5 × D 5: vence a frase-síntese; A fica em segundo.
    expect(decide('A', 'A', 'D', 'D')).toEqual(['D', 'A', 'perfil_claro'])
    // A 3 × B 3: vence a síntese (B); A 3 ganha de D 2 no segundo lugar.
    expect(decide('A', 'nenhum', 'D', 'B')).toEqual(['B', 'A', 'perfil_aproximado'])
    // B 3, D 2, A 2: no segundo lugar, o que incomoda vence a cena desejada.
    expect(decide('B', 'D', 'A', 'conhecer')).toEqual(['B', 'D', 'perfil_aproximado'])
    // D 4, A 3, B 3: segundo lugar empatado vai para a frase da P5 (A).
    expect(decide('A', 'D', 'D', 'B')).toEqual(['D', 'A', 'perfil_claro'])
    // Só a cena desejada aponta: sempre sai um perfil, sem segundo.
    expect(decide('nenhum', 'nenhum', 'B', 'conhecer')).toEqual(['B', null, 'perfil_aproximado'])
  })
  test('a pergunta extra aparece e some com o perfil, e a resposta antiga sai', () => {
    const b = perfil('B', { ferramenta: 'unity' })
    expect(isAdultQuizComplete(b)).toBe(true)
    let next = applyAdultAnswer(b, 'sintese', 'D')!
    next = applyAdultAnswer(next, 'cena', 'D')!
    expect(next.ferramenta).toBeUndefined()
    expect(isAdultQuizComplete(next)).toBe(false)
    expect(activeAdultSteps(next).at(-1)?.key).toBe('codigo')
    expect(applyAdultAnswer(next, 'ferramenta', 'unity')).toBeNull()
    next = applyAdultAnswer(next, 'codigo', 'codigo_ja')!
    expect(isAdultQuizComplete(next)).toBe(true)
    // Perfil A: nenhuma pergunta extra, e a do D sai.
    for (const key of ['cena', 'preocupacao', 'cena_desejada', 'sintese'])
      next = applyAdultAnswer(next, key, 'A')!
    expect(next.codigo).toBeUndefined()
    expect(isAdultQuizComplete(next)).toBe(true)
  })
  test('applyAnswer recusa pergunta inativa ou valor inválido e conta a revisão', () => {
    const vazio = { _quiz_version: QUIZ_VERSION }
    expect(applyAdultAnswer(vazio, 'ferramenta', 'unity')).toBeNull()
    expect(applyAdultAnswer(vazio, 'codigo', 'logica')).toBeNull()
    expect(applyAdultAnswer(vazio, 'idade', '18_mais')).toBeNull()
    expect(applyAdultAnswer(vazio, 'garantia', VALOR_ANTIGO)).toBeNull()
    expect(applyAdultAnswer(vazio, 'cena', 'C')).toBeNull()
    expect(applyAdultAnswer(vazio, 'cena', ['A'])).toBeNull()
    const um = applyAdultAnswer(vazio, 'tempo_jogo', '3_7')!
    expect(um).toEqual({ _quiz_version: QUIZ_VERSION, _quiz_revision: 1, tempo_jogo: '3_7' })
    expect(applyAdultAnswer(um, 'garantia', 'trabalho')?._quiz_revision).toBe(2)
  })
  test('outra versão do quiz não completa e começa do zero', () => {
    const antigo = { ...respostas(), _quiz_version: 'comunidade-adulto-v0' }
    expect(isAdultQuizComplete(antigo)).toBe(false)
    expect(adultDecision(antigo)).toBeNull()
    expect(buildAdultResult(antigo)).toBeNull()
    const novo = applyAdultAnswer(antigo, 'cena', 'A')!
    expect(novo).toEqual({ _quiz_version: QUIZ_VERSION, _quiz_revision: 12, cena: 'A' })
    expect(isAdultQuizComplete(respostas())).toBe(true)
  })
  test('o botão diz "Ver o resultado" só quando a resposta escolhida completa o quiz', () => {
    const semSintese = perfil('A')
    delete semSintese.sintese
    expect(completesAdultQuiz(semSintese, 'sintese', 'A')).toBe(true)
    // B e D: a frase-síntese abre a pergunta extra.
    const rumoB = perfil('B')
    delete rumoB.sintese
    delete rumoB.ferramenta
    expect(completesAdultQuiz(rumoB, 'sintese', 'B')).toBe(false)
    expect(completesAdultQuiz(rumoB, 'sintese', 'conhecer')).toBe(false)
    expect(completesAdultQuiz(perfil('A'), 'cena', 'nenhum')).toBe(true)
    expect(completesAdultQuiz(perfil('A'), 'cena', '')).toBe(false)
  })
  test('condições: não atendidas, a conferir e a adequação', () => {
    const d = (patch: QuizAnswers, p = 'B') => {
      const r = adultDecision(perfil(p, { computador: 'meu', ...patch }))!
      return [r.unmet, r.pending, r.adequacy]
    }
    expect(d({})).toEqual([[], [], 'sem_incompatibilidade_declarada'])
    expect(d({ computador: 'meu' })).toEqual([[], [], 'sem_incompatibilidade_declarada'])
    expect(d({ computador: 'compartilhado' })[1]).toEqual(['computador'])
    expect(d({ computador: 'verificar' })).toEqual([[], ['computador'], 'precisa_conferir'])
    expect(d({ computador: 'celular_tablet' })[0]).toEqual(['computador'])
    expect(d({ garantia: 'ao_vivo' })[0]).toEqual(['formato'])
    expect(d({ garantia: 'trabalho' })).toEqual([['trabalho'], [], 'condicao_nao_atendida'])
    for (const ferramenta of ['unity', 'unreal', 'roblox', 'outra'])
      expect(d({ ferramenta })[0]).toEqual(['ferramenta'])
    expect(d({ ferramenta: 'nao_pensei' })[1]).toEqual(['ferramenta'])
    expect(d({ codigo: 'codigo_ja' }, 'D')).toEqual([[], ['codigo'], 'precisa_conferir'])
    expect(d({ codigo: 'tanto_faz' }, 'D')[1]).toEqual([])
  })
  test('a definição do registry: versão, perguntas, validação, perfil e manchetes', () => {
    const q = COMUNIDADE_ADULTO_QUIZ
    expect(q.version).toBe('comunidade-adulto-v1')
    expect(q.presentation).toBe('comunidade-adulto')
    expect(q.total).toBe(10)
    expect(q.steps).toBe(ADULT_QUESTIONS)
    expect(q.branches).toBeUndefined()
    expect(Object.keys(q.valueSchema).sort()).toEqual(ADULT_QUESTIONS.map((s) => s.key).sort())
    expect(q.valueSchema.garantia!.safeParse('trabalho').success).toBe(true)
    expect(q.valueSchema.garantia!.safeParse(VALOR_ANTIGO).success).toBe(false)
    expect(q.valueSchema.cena!.safeParse(['A']).success).toBe(false)
    expect(q.valueSchema.ferramenta!.safeParse('roblox').success).toBe(true)
    expect(q.computePerfil!(respostas())).toBe('adulto-ideia')
    expect(q.computePerfil!(perfil('A'))).toBe('adulto-horas-livres')
    expect(q.computePerfil!(perfil('D'))).toBe('adulto-por-dentro')
    expect(q.computePerfil!({ _quiz_version: QUIZ_VERSION })).toBeNull()
    expect(q.headlines).toEqual({
      padrao: QUIZ_HEADLINES.padrao.label,
      ideia: QUIZ_HEADLINES.ideia.label,
    })
    expect(q.defaultHeadline).toBe('padrao')
    expect(ADULT_PROFILE_LABELS).toEqual({
      'adulto-horas-livres': 'Horas livres',
      'adulto-ideia': 'Ideia',
      'adulto-por-dentro': 'Por dentro',
    })
    expect(PROFILE_IDS).toEqual({
      A: 'adulto-horas-livres',
      B: 'adulto-ideia',
      D: 'adulto-por-dentro',
    })
  })
})

describe('Quiz adulto v1: o resultado em conversa', () => {
  test('a combinação do EX_ADULTO reproduz o exemplo aprovado, bloco a bloco', () => {
    const r = result(EX_ANSWERS)
    expect(r.titulo).toBe('A sua ideia de jogo já existe. O que falta é um começo pequeno')
    expect(r.aviso).toBeUndefined()
    expect(r.assinatura).toBe('Helena e Júlio, Sistema Zero')
    expect(r.tema).toBe('adulto')
    expect(r.perfil).toBe('adulto-ideia')
    expect(r.destino).toBe('/pro/comunidade-dos-criadores/oferta')
    expect(r.blocos).toEqual([
      {
        tipo: 'p',
        texto:
          'Você contou que [[tem uma ideia de jogo há anos e nunca começou]], que joga [[de 7 a 14 horas por semana]] e que, quando tentou, [[abriu um programa e fechou no mesmo dia]]. Essa história tem uma explicação simples.',
      },
      { tipo: 'h', texto: 'Por que a ideia continua na gaveta' },
      {
        tipo: 'p',
        texto:
          'De 7 a 14 horas por semana dão entre 364 e 728 horas por ano jogando, e você disse que [[quase nada disso virou alguma coisa sua]]. Vontade você tem, porque já tentou. O que trava é o ponto de partida. A ideia costuma ser grande, com mundo, história e dezenas de fases, e o programa que você abriu foi feito para estúdios: dezenas de janelas e nenhum próximo passo claro. Com o trabalho, a família e o cansaço da noite, o projeto fica para depois, e a ideia volta para onde estava. É isso que incomoda você: [[ela continuar na gaveta]].',
      },
      { tipo: 'h', texto: 'O que muda quando o primeiro jogo é pequeno' },
      {
        tipo: 'p',
        texto:
          'Fazer um jogo é escrever as regras da ideia em blocos: quando o jogador tocar aqui, acontece isso. Quando o primeiro jogo é pequeno de propósito, você termina, publica e mostra. É esse jogo pronto que tira a ideia grande da gaveta, uma fase de cada vez. A cena que você quer ver, [[um amigo jogando uma fase que você inventou]], é exatamente onde isso termina: um jogo que funciona na mão de outra pessoa, com um link que abre no celular.',
      },
      { tipo: 'h', texto: 'Onde isso acontece' },
      {
        tipo: 'p',
        texto:
          'A Comunidade dos Criadores é a área adulta do Sistema Zero, em que você aprende criando jogos, com as aulas, o Estúdio, o Mural, o Clube e a ajuda da equipe no mesmo lugar. Cada curso é um jogo completo: você joga a versão pronta, muda uma regra, testa e publica no Mural. Os blocos que cada curso ensina ficam na sua caixa de ferramentas, e o Estúdio livre abre logo na primeira etapa: é lá, com o que você já sabe usar, que a sua ideia vira projeto, uma fase de cada vez. Os primeiros cursos são clássicos: uma nave contra asteroides, um dino que corre dos cactos, um farol que só acende com a chave. Como você [[nunca programou]], a primeira fase tira a digitação do caminho: você monta a lógica em blocos e vê cada regra funcionar. A Ponte e o código chegam depois, quando a base estiver firme.',
      },
      {
        tipo: 'img',
        src: '/img/comunidade-adulto/previa-aula.webp',
        legenda:
          'A aula da Nave Contra Asteroides: prévia com dados de teste: vídeo de um lado, Estúdio do outro e o botão de rodar o jogo',
        largura: 1600,
        altura: 800,
      },
      {
        tipo: 'p',
        texto:
          'Quem prepara as aulas somos nós, Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos programando. O Sistema Zero começou com os jogos que fizemos com os nossos filhos.',
      },
      { tipo: 'h', texto: 'Duas coisas que você disse e que importam' },
      {
        tipo: 'p',
        texto:
          'Você precisa [[aprender sozinho, no seu horário]]. As aulas são gravadas, o vídeo fica ao lado do editor e o projeto fica salvo na sua conta: você para hoje e continua amanhã do mesmo ponto. E você [[usa um computador compartilhado]]: como as aulas são gravadas, basta combinar um horário em que o computador esteja livre. Você disse também que [[qualquer ferramenta serve, se conseguir terminar]]. É por aí que a gente começa.',
      },
      {
        tipo: 'cta',
        texto:
          'Na próxima página, você vê a aula da Nave por dentro, os clássicos que vêm primeiro, as três fases até o código e os dois planos.',
        rotulo: 'Ver como a ideia sai da gaveta',
        href: '/pro/comunidade-dos-criadores/oferta',
      },
    ])
    expect(r.evento).toEqual({
      quiz_version: QUIZ_VERSION,
      revision: 11,
      perfil_principal: 'B',
      perfil_secundario: null,
      pontos: { A: 0, B: 10, D: 0 },
      estado: 'perfil_claro',
      adequacao: 'precisa_conferir',
      destino: ADULT_OFFER_PATH,
    })
  })

  test('em todas as combinações: a carta inteira, sem placeholder e dentro do Light Copy', () => {
    const marcas = new Set<string>()
    let n = 0
    let aproximados = 0
    let comSegundo = 0
    for (const answers of sweep()) {
      const r = buildAdultResult(answers)
      expect(r, JSON.stringify(answers)).not.toBeNull()
      if (!r) continue
      const d = adultDecision(answers)!
      const p = d.profile
      // Metadados e destino.
      expect(r.tema).toBe('adulto')
      expect(r.perfil).toBe(PROFILE_IDS[p])
      expect(r.destino).toBe(ADULT_OFFER_PATH)
      expect(r.assinatura).toBe(COPY.SIGNATURE)
      expect(r.evento).toMatchObject({
        quiz_version: QUIZ_VERSION,
        perfil_principal: p,
        perfil_secundario: d.secondary,
        estado: d.state,
        adequacao: d.adequacy,
        destino: ADULT_OFFER_PATH,
      })
      expect(Boolean(r.aviso)).toBe(d.state === 'perfil_aproximado')
      if (r.aviso) aproximados++
      // Os cinco movimentos, na ordem do EX_ADULTO (o segundo perfil ganha um parágrafo).
      const tipos = r.blocos.map((b) => b.tipo).join(',')
      expect(['p,h,p,h,p,h,p,img,p,h,p,cta', 'p,h,p,h,p,p,h,p,img,p,h,p,cta']).toContain(tipos)
      if (tipos.includes('p,p,h')) comSegundo++
      expect(r.blocos.some((b) => b.tipo === 'relato')).toBe(false)
      const headings = r.blocos.flatMap((b) => (b.tipo === 'h' ? [b.texto] : []))
      expect(headings[0]).toStartWith('Por que')
      expect(headings[1]).toStartWith('O que muda quando')
      expect(headings[2]).toBe('Onde isso acontece')
      expect(headings[3]).toBe(COPY.NEEDS_HEADING)
      // O produto só aparece a partir de "Onde isso acontece".
      const onde = r.blocos.findIndex((b) => b.tipo === 'h' && b.texto === 'Onde isso acontece')
      const antes = [r.titulo, ...r.blocos.slice(0, onde).map((b) => ('texto' in b ? b.texto : ''))]
      expect(antes.join('\n')).not.toMatch(PRODUTO)
      // O botão: com condição não atendida, convida a conferir os requisitos.
      const cta = ctaOf(r)
      expect(cta.href).toBe(ADULT_OFFER_PATH)
      expect(cta.texto).toStartWith('Na próxima página, você vê')
      expect(cta.rotulo).toBe(d.unmet.length ? COPY.CTA_UNMET_LABEL : COPY.CTA_LABEL[p])
      // A prévia existe e a legenda diz que é prévia.
      const img = r.blocos.find((b) => b.tipo === 'img') as Extract<BlocoConversa, { tipo: 'img' }>
      expect(img).toMatchObject(COPY.VISUAL[p])
      expect(img.legenda).toMatch(/prévia/)
      // Cada texto: marcas bem formadas, sem placeholder, sem travessão nem exclamação.
      for (const texto of rawTexts(r)) {
        const semMarcasBemFormadas = texto.replace(/\[\[[^[\]]+\]\]/g, '')
        expect(semMarcasBemFormadas, texto).not.toMatch(/\[|\]/)
        for (const marca of marksOf(texto)) marcas.add(marca)
        const visivel = semMarcas(texto)
        expect(visivel, visivel).not.toMatch(/[—–!{}]|undefined|null|NaN| {2}|^ | $| [.,:;]/)
        expect(visivel).not.toMatch(PALAVRA_PROIBIDA)
        expect(visivel).not.toMatch(VOCABULARIO_EVITADO)
        expect(lintLightCopy(visivel), visivel).toEqual([])
      }
      expect(textoDoResultado(r).every((t) => t.length > 0)).toBe(true)
      n++
    }
    expect(n).toBe(192 * 6)
    expect(aproximados).toBeGreaterThan(50)
    expect(comSegundo).toBeGreaterThan(100)
    // Toda opção de toda pergunta volta marcada em ao menos um resultado.
    for (const s of ADULT_QUESTIONS)
      for (const o of s.opcoes)
        expect(marcas.has(COPY.marca(s.key, o.value)), `${s.key}:${o.value}`).toBe(true)
  })

  test('cada opção tem a sua marca e as suas frases', () => {
    for (const s of ADULT_QUESTIONS) {
      const marcas = (COPY.MARCAS as Record<string, Record<string, string>>)[s.key]!
      expect(Object.keys(marcas).sort(), s.key).toEqual(s.opcoes.map((o) => o.value).sort())
    }
    const cover = (key: string, map: Record<string, unknown>) =>
      expect(Object.keys(map).sort(), key).toEqual(values(key).sort())
    cover('tentativa', COPY.OPENING_ATTEMPT)
    for (const p of ['A', 'B', 'D'] as const) cover('tentativa', COPY.WHY[p].attempt)
    cover('tempo_jogo', CALCULADORA_POR_SEMANA)
    cover('tempo_jogo', HORAS_POR_ANO)
    cover('cena_desejada', COPY.WISH)
    cover('programacao', COPY.PROGRAMMING)
    cover('garantia', COPY.NEED)
    cover('computador', COPY.COMPUTER)
    cover('ferramenta', COPY.TOOL)
    cover('codigo', COPY.CODE)
  })

  test('a abertura: a frase da P5 só quando é a do perfil; senão, a resposta que deu o perfil', () => {
    const abertura = (patch: QuizAnswers) => paragraphs(result(respostas(patch)))[0]!
    // A frase do perfil abre.
    expect(abertura({})).toStartWith('Você contou que [[tem uma ideia de jogo há anos')
    // Frase de outro perfil: abre pela síntese do perfil.
    expect(abertura({ cena: 'A' })).toStartWith(
      'Você contou que [[quer tirar a ideia da gaveta e fazer o jogo]], que joga',
    )
    // Sem síntese do perfil: abre pelo que incomoda.
    expect(abertura({ cena: 'nenhum', sintese: 'conhecer' })).toStartWith(
      'Você contou que o que mais incomoda é [[a ideia continuar na gaveta]], que joga',
    )
    // Só a cena desejada: abre por ela, e ela não se repete no "O que muda".
    const soCena = result(respostas({ cena: 'nenhum', preocupacao: 'nenhum', sintese: 'conhecer' }))
    expect(paragraphs(soCena)[0]).toStartWith(
      'Você contou que a cena que quer ver é [[um amigo jogando uma fase que você inventou]]',
    )
    expect(paragraphs(soCena)[2]).toBe(COPY.CHANGE.B)
    // "Nenhuma dessas" é dito com honestidade.
    expect(paragraphs(soCena)[0]).toContain(COPY.OPENING_CLOSE_NO_SCENE)
    // Quando a resposta que abre já fala em jogar, as horas vêm sem o eco de "que joga".
    expect(paragraphs(result(perfil('A')))[0]).toStartWith(
      'Você contou que [[joga há anos e nunca fez nada além de jogar]], que o jogo ocupa [[de 7 a 14 horas por semana]] e que, quando tentou,',
    )
    expect(paragraphs(result(perfil('A', { cena: 'nenhum', sintese: 'conhecer' })))[0]).toStartWith(
      'Você contou que o que mais incomoda é [[continuar só jogando]], que o jogo ocupa [[de 7 a 14 horas por semana]]',
    )
    // O que aconteceu quando tentou, em cada opção.
    expect(abertura({ tentativa: 'vontade' })).toContain(
      ', que joga [[de 7 a 14 horas por semana]] e que [[nunca tentou: ficou só na vontade]].',
    )
    expect(abertura({ tentativa: 'terminei' })).toContain('e que [[já terminou um jogo pequeno]].')
    expect(abertura({ tentativa: 'nao_apareceu' })).toContain(
      'e que [[nunca pensou em fazer um jogo]].',
    )
  })

  test('o porquê: calculadora, o que aconteceu quando tentou e o que incomoda, em cada perfil', () => {
    for (const p of ['A', 'B', 'D'] as const)
      for (const tentativa of values('tentativa'))
        for (const tempo_criacao of values('tempo_criacao'))
          for (const tempo_jogo of values('tempo_jogo')) {
            const r = result(perfil(p, { tentativa, tempo_criacao, tempo_jogo }))
            const porque = paragraphs(r)[1]!
            expect(porque).toStartWith(`${CALCULADORA_POR_SEMANA[tempo_jogo]} por ano jogando`)
            expect(porque).toContain(HORAS_POR_ANO[tempo_jogo]!)
            expect(porque).toContain(
              `[[${COPY.MARCAS.tempo_criacao[tempo_criacao as 'um_pouco']}]]`,
            )
            expect(porque).toContain(COPY.WHY[p].attempt[tentativa]!)
            expect(porque).toEndWith(COPY.WORRY[p])
          }
    // "Vontade você tem, porque já tentou" só para quem tentou.
    for (const tentativa of ['vontade', 'terminei', 'nao_apareceu'])
      expect(paragraphs(result(respostas({ tentativa })))[1]).not.toContain('porque já tentou')
    // "Nada, está bom assim": sem inventar um incômodo.
    const semIncomodo = paragraphs(result(respostas({ preocupacao: 'nenhum' })))[1]!
    expect(semIncomodo).toEndWith(COPY.NO_WORRY)
    expect(semIncomodo).not.toContain('incomoda você')
    // O que incomoda de outro perfil não entra no porquê.
    expect(paragraphs(result(respostas({ preocupacao: 'A' })))[1]).not.toContain('incomoda')
  })

  test('perfil A com "Boa parte": título e porquê próprios', () => {
    const boaParte = result(perfil('A', { tempo_criacao: 'boa_parte' }))
    expect(boaParte.titulo).toBe(COPY.TITLE_A_GOOD_PART)
    expect(boaParte.blocos[1]).toEqual({ tipo: 'h', texto: COPY.WHY_HEADING_A_GOOD_PART })
    expect(paragraphs(boaParte)[1]).not.toContain('quase tudo nele foi decidido')
    const quaseNada = result(perfil('A'))
    expect(quaseNada.titulo).toBe(COPY.TITLES.A)
    expect(quaseNada.blocos[1]).toEqual({ tipo: 'h', texto: COPY.WHY_HEADING.A })
    // Nos outros perfis, "Boa parte" não muda o título.
    expect(result(perfil('D', { tempo_criacao: 'boa_parte' })).titulo).toBe(COPY.TITLES.D)
  })

  test('o segundo perfil volta com a resposta que o somou; a cena desejada sozinha não repete', () => {
    const pelaFrase = result(respostas({ cena: 'A' }))
    expect(adultDecision(respostas({ cena: 'A' }))!.secondary).toBe('A')
    expect(paragraphs(pelaFrase)[3]).toBe(
      `Você também contou que [[${COPY.MARCAS.cena.A}]]. ${COPY.SECONDARY_TAIL.A}`,
    )
    const peloIncomodo = result(perfil('D', { preocupacao: 'B' }))
    expect(paragraphs(peloIncomodo)[3]).toBe(
      `Você também disse que incomoda [[${COPY.MARCAS.preocupacao.B}]]. ${COPY.SECONDARY_TAIL.B}`,
    )
    const pelaSintese = result(perfil('D', { sintese: 'A' }))
    expect(adultDecision(perfil('D', { sintese: 'A' }))!.profile).toBe('D')
    expect(paragraphs(pelaSintese)[3]).toBe(
      `Você também disse que [[${COPY.MARCAS.sintese.A}]]. ${COPY.SECONDARY_TAIL.A}`,
    )
    // Só a cena desejada somou o segundo perfil: a frase da cena já fala dele.
    const soCena = result(respostas({ cena_desejada: 'D' }))
    expect(adultDecision(respostas({ cena_desejada: 'D' }))!.secondary).toBe('D')
    expect(soCena.blocos.map((b) => b.tipo).join(',')).toBe('p,h,p,h,p,h,p,img,p,h,p,cta')
    expect(paragraphs(soCena)[2]).toEndWith(COPY.WISH.D!)
  })

  test('a S4 muda uma frase só: blocos primeiro ou Ponte e código', () => {
    const nunca = result(respostas())
    for (const programacao of ['um_pouco', 'estudei']) {
      const outro = result(respostas({ programacao }))
      const diferentes = outro.blocos.filter(
        (b, i) => JSON.stringify(b) !== JSON.stringify(nunca.blocos[i]),
      )
      expect(diferentes).toHaveLength(1)
      const onde = paragraphs(outro)[3]!
      expect(onde).toContain(COPY.PROGRAMMING[programacao]!)
      expect(onde).toContain('na Ponte, cada bloco aparece ao lado do código que ele gera')
    }
    expect(paragraphs(nunca)[3]).toContain('A Ponte e o código chegam depois')
  })

  test('as condições: não atendidas trocam o botão e dizem o que conferir; as pendentes só avisam', () => {
    const cta = (patch: QuizAnswers, p = 'B') => ctaOf(result(perfil(p, patch)))
    expect(cta({}).rotulo).toBe(COPY.CTA_LABEL.B)
    expect(cta({}, 'A').rotulo).toBe(COPY.CTA_LABEL.A)
    expect(cta({}, 'D').rotulo).toBe(COPY.CTA_LABEL.D)
    expect(cta({ computador: 'verificar', ferramenta: 'nao_pensei' }).rotulo).toBe(COPY.CTA_LABEL.B)
    expect(cta({ codigo: 'codigo_ja' }, 'D').rotulo).toBe(COPY.CTA_LABEL.D)
    const varias = cta({ computador: 'celular_tablet', garantia: 'ao_vivo', ferramenta: 'roblox' })
    expect(varias.rotulo).toBe('Ver como funciona e conferir os requisitos')
    expect(varias.texto).toBe(
      'Na próxima página, você vê como tudo funciona e confere, com calma, o computador de que você precisa, o formato das aulas e a ferramenta usada.',
    )
    expect(cta({ garantia: 'trabalho' }, 'A').texto).toBe(
      'Na próxima página, você vê como tudo funciona e confere, com calma, para quem a área foi feita.',
    )
    // O texto honesto de cada condição está na carta.
    const necessidades = (patch: QuizAnswers, p = 'B') =>
      paragraphs(result(perfil(p, patch))).at(-1)!
    expect(necessidades({ garantia: 'ao_vivo' })).toContain('as aulas são gravadas')
    expect(necessidades({ garantia: 'ao_vivo' })).toContain('ainda não é o formato para você')
    expect(necessidades({ garantia: 'trabalho' })).toContain('sem prometer uma profissão')
    expect(necessidades({ computador: 'celular_tablet' })).toContain(
      'é preciso um computador com mouse e teclado',
    )
    expect(necessidades({ ferramenta: 'unreal' })).toContain('a ferramenta é o Estúdio')
    expect(necessidades({ ferramenta: 'unreal' })).toContain('ainda não é o caminho para você')
    expect(necessidades({ codigo: 'codigo_ja' }, 'D')).toContain('a primeira fase é com blocos')
    expect(necessidades({ sintese: 'conhecer', cena: 'B' })).toEndWith(COPY.STILL_LOOKING)
    // O computador sempre entra; a pergunta extra vem depois dele.
    const a = necessidades({ computador: 'meu' }, 'A')
    expect(a).toBe(`${COPY.NEED.sozinho} ${COPY.COMPUTER.meu}`)
  })

  test('as prévias existem com o tamanho declarado no código', () => {
    for (const visual of Object.values(COPY.VISUAL)) {
      expect(existsSync(join(import.meta.dir, '..', '..', 'public', visual.src))).toBe(true)
      expect(visual.legenda).toMatch(/prévia/)
    }
    expect(COPY.VISUAL.B).toMatchObject({ largura: 1600, altura: 800 })
    expect(COPY.VISUAL.A).toMatchObject({ largura: 1440, altura: 1187 })
    expect(COPY.VISUAL.D).toMatchObject({ largura: 1100, altura: 909 })
  })

  test('quiz incompleto não tem resultado', () => {
    const semGarantia = respostas()
    delete semGarantia.garantia
    expect(buildAdultResult(semGarantia)).toBeNull()
    const semFerramenta = respostas()
    delete semFerramenta.ferramenta
    expect(buildAdultResult(semFerramenta)).toBeNull()
    expect(buildAdultResult({})).toBeNull()
  })

  test('nenhuma string do quiz usa o vocabulário evitado', () => {
    const textos = [
      ...strings(COPY),
      ...strings(ADULT_QUESTIONS),
      ...strings(QUIZ_ENTRY),
      ...strings(QUIZ_HEADLINES),
      ...strings(CALCULADORA_POR_SEMANA),
    ]
    expect(textos.length).toBeGreaterThan(100)
    for (const texto of textos) {
      expect(texto).not.toMatch(PALAVRA_PROIBIDA)
      expect(texto).not.toMatch(VOCABULARIO_EVITADO)
      expect(texto).not.toMatch(/[—–!]|mesmo que|sem precisar/)
    }
  })
})
