import { describe, expect, test } from 'bun:test'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  type ResultadoConversa,
  semMarcas,
  textoDoResultado,
} from '../../src/content/resultado-conversa'
import { DESAFIO_ADULTO as funnel } from '../../src/funnels/desafio-adulto'
import {
  DESAFIO_ADULTO_PERFIL_LABELS,
  DESAFIO_ADULTO_QUIZ,
} from '../../src/funnels/desafio-adulto/quiz'
import {
  applyDesafioAdultoAnswer,
  completesDesafioAdultoQuiz,
  desafioAdultoDecision,
  desafioAdultoProfileSlug,
  isDesafioAdultoQuizComplete,
  PROFILE_IDS,
  profileScores,
  QUIZ_VERSION,
} from '../../src/funnels/desafio-adulto/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  QUIZ_STAGES,
  quizHeadlineId,
} from '../../src/funnels/desafio-adulto/quiz/entry-copy'
import { DESAFIO_ADULTO_QUESTIONS } from '../../src/funnels/desafio-adulto/quiz/questions'
import {
  buildDesafioAdultoResult,
  DESAFIO_ADULTO_OFFER_PATH,
} from '../../src/funnels/desafio-adulto/quiz/result'
import * as COPY from '../../src/funnels/desafio-adulto/quiz/result-copy'
import { isQuizComplete } from '../../src/funnels/registry'
import type { QuizAnswers } from '../../src/lib/quiz-types'

/** Um lead completo do quiz adulto (perfil B, como o exemplo do Canvas). */
export const answersAdulto = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 8,
  computador: 'meu',
  programacao: 'nunca',
  tempo_livre: '1_3',
  cena: 'B',
  tentativa: 'fechei',
  cena_desejada: 'B',
  garantia: 'terminar',
  sintese: 'B',
  ...patch,
})
const step = (key: string) => DESAFIO_ADULTO_QUESTIONS.find((s) => s.key === key)!
const values = (key: string) => step(key).opcoes.map((o) => o.value)
const blocos = (r: ResultadoConversa, tipo: 'p' | 'h') =>
  r.blocos.flatMap((b) => (b.tipo === tipo ? [b.texto] : []))
const cta = (r: ResultadoConversa) => r.blocos.find((b) => b.tipo === 'cta')

const PALAVRA_PROIBIDA = new RegExp(['car', 'reira'].join(''), 'i')
/** O produto antes do resultado (a nota "Uma orientação do Sistema Zero" é a assinatura da página). */
const produto =
  /Desafio|Farol|Comunidade|Estúdio|[Pp]lataforma|Mural|preço|R\$|assinatura|prazo|30 dias|(?<![\p{L}])aulas?(?![\p{L}])|(?<![\p{L}])cursos?(?![\p{L}])/u
const produtoNaCarta = /Desafio|Farol|Comunidade|Estúdio|[Pp]lataforma|Mural|preço|R\$|30 dias/u

function* combinacoes(): Generator<QuizAnswers> {
  let seed = 20261021
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const cena of values('cena'))
    for (const cena_desejada of values('cena_desejada'))
      for (const sintese of values('sintese'))
        for (const garantia of values('garantia'))
          yield answersAdulto({
            computador: sorteio(values('computador')),
            programacao: sorteio(values('programacao')),
            tempo_livre: sorteio(values('tempo_livre')),
            tentativa: sorteio(values('tentativa')),
            cena,
            cena_desejada,
            sintese,
            garantia,
          })
}

describe('Desafio adulto v1: entrada e perguntas sem o produto antes do resultado', () => {
  test('entrada, perguntas, etapas e saída de menor sem o produto e na Light Copy', () => {
    const textos = [
      QUIZ_ENTRY.eyebrow,
      QUIZ_ENTRY.pageTitle,
      QUIZ_ENTRY.description,
      QUIZ_ENTRY.button,
      QUIZ_ENTRY.minorLink,
      ...QUIZ_ENTRY.chips,
      QUIZ_ENTRY.minor.title,
      QUIZ_ENTRY.minor.text,
      QUIZ_ENTRY.minor.button,
      ...Object.values(QUIZ_HEADLINES).map((h) => h.title),
      ...Object.values(QUIZ_STAGES),
      ...DESAFIO_ADULTO_QUESTIONS.flatMap((s) => [
        s.titulo,
        s.subtitulo ?? '',
        ...s.opcoes.map((o) => o.label),
      ]),
    ]
    for (const texto of textos) {
      // "Não ser curso de criança" é o medo do adulto nas palavras dele (Canvas), não o produto.
      if (texto !== 'Não ser curso de criança')
        expect([texto, produto.test(texto)]).toEqual([texto, false])
      expect(texto).not.toMatch(PALAVRA_PROIBIDA)
      expect([texto, lintLightCopy(texto).filter((i) => i.rule !== 3)]).toEqual([texto, []])
    }
  })

  test('como no Canvas: manchetes, selos, oito perguntas e a saída para o quiz Kids do Desafio', () => {
    expect(QUIZ_HEADLINES.padrao.title).toBe(
      'Você sempre quis fazer um jogo. Em 2 minutos, veja por onde começar o primeiro.',
    )
    expect(QUIZ_HEADLINES.ideia.title).toBe(
      'Aquela ideia de jogo que está na sua cabeça há anos. Em 2 minutos, veja o que falta para ela sair do papel.',
    )
    for (const h of Object.values(QUIZ_HEADLINES)) expect(h.title).toContain(h.emphasis)
    expect(quizHeadlineId('ideia')).toBe('ideia')
    expect(quizHeadlineId('tela')).toBe('padrao')
    expect(QUIZ_ENTRY.chips).toEqual(['2 minutos', 'Sem cadastro', 'Resultado na hora'])
    expect(QUIZ_ENTRY.minor.href).toBe('/kids/desafio-primeiro-jogo/quiz')
    expect(DESAFIO_ADULTO_QUESTIONS.map((s) => s.key)).toEqual([
      'computador',
      'programacao',
      'tempo_livre',
      'cena',
      'tentativa',
      'cena_desejada',
      'garantia',
      'sintese',
    ])
    for (const s of DESAFIO_ADULTO_QUESTIONS) {
      expect(s.lastStep).toBe(`desafio_adulto_v1_${s.key}`)
      expect(s.eventName).toBe(`respondeu_desafio_adulto_v1_${s.key}`)
      expect(['rotina', 'trava', 'quer']).toContain(s.etapa)
    }
    expect(DESAFIO_ADULTO_QUIZ).toMatchObject({
      version: QUIZ_VERSION,
      presentation: 'desafio-adulto',
      total: 8,
      defaultHeadline: 'padrao',
    })
    expect(DESAFIO_ADULTO_QUIZ.branches).toBeUndefined()
  })

  test('o funil adulto liga quiz e resultado, com os rótulos dos perfis', () => {
    expect(funnel.steps).toMatchObject({ quiz: true, resultado: true })
    expect(funnel.content.quiz).toBe(DESAFIO_ADULTO_QUIZ)
    expect(funnel.content.result?.perfilLabels).toBe(DESAFIO_ADULTO_PERFIL_LABELS)
    for (const slug of Object.values(PROFILE_IDS)) {
      expect(slug.length).toBeLessThanOrEqual(32)
      expect(DESAFIO_ADULTO_PERFIL_LABELS[slug]).toBeTruthy()
    }
  })

  test('applyAnswer grava versão e revisão; completesQuiz só na última resposta', () => {
    const a = applyDesafioAdultoAnswer({}, 'computador', 'meu')!
    expect(a).toMatchObject({ computador: 'meu', _quiz_version: QUIZ_VERSION, _quiz_revision: 1 })
    expect(applyDesafioAdultoAnswer(a, 'computador', 'outro')).toBeNull()
    expect(applyDesafioAdultoAnswer(a, 'idade', '18_mais')).toBeNull()
    const quase = answersAdulto()
    delete quase.sintese
    expect(completesDesafioAdultoQuiz(quase, 'sintese', 'conhecer')).toBe(true)
    expect(completesDesafioAdultoQuiz(quase, 'cena', 'A')).toBe(false)
    expect(isDesafioAdultoQuizComplete({ ...answersAdulto(), _quiz_version: 'outra' })).toBe(false)
    expect(isQuizComplete(DESAFIO_ADULTO_QUIZ, answersAdulto())).toBe(true)
  })
})

describe('Desafio adulto v1: perfil e condições', () => {
  test('a frase e a síntese valem 3, daqui a um mês 2; o empate vai para a síntese', () => {
    expect(profileScores(answersAdulto({ cena: 'A', cena_desejada: 'B', sintese: 'D' }))).toEqual({
      A: 3,
      B: 2,
      D: 3,
    })
    expect(
      desafioAdultoDecision(answersAdulto({ cena: 'A', cena_desejada: 'B', sintese: 'D' })),
    ).toMatchObject({ profile: 'D', state: 'perfil_aproximado' })
    expect(
      desafioAdultoDecision(answersAdulto({ cena: 'D', cena_desejada: 'B', sintese: 'D' })),
    ).toMatchObject({ profile: 'D', state: 'perfil_claro' })
    expect(
      desafioAdultoDecision(
        answersAdulto({ cena: 'nenhum', cena_desejada: 'A', sintese: 'conhecer' }),
      ),
    ).toMatchObject({ profile: 'A', state: 'perfil_aproximado' })
    expect(desafioAdultoProfileSlug(answersAdulto())).toBe('desafio-adulto-ideia')
  })

  test('só celular, aula ao vivo e trabalhar com jogos trocam o botão e apontam as dúvidas', () => {
    for (const patch of [
      { computador: 'celular_tablet' },
      { garantia: 'ao_vivo' },
      { garantia: 'trabalho' },
    ] as QuizAnswers[]) {
      const r = buildDesafioAdultoResult(answersAdulto(patch))!
      expect(cta(r)).toMatchObject({
        rotulo: COPY.CTA_UNMET_LABEL,
        href: `${DESAFIO_ADULTO_OFFER_PATH}#duvidas`,
      })
      expect(r.evento).toMatchObject({ adequacao: 'condicao_nao_atendida' })
    }
    expect(desafioAdultoDecision(answersAdulto({ computador: 'verificar' }))).toMatchObject({
      unmet: [],
      pending: ['computador'],
    })
  })
})

describe('Desafio adulto v1: o resultado em conversa', () => {
  test('o exemplo do Canvas: perfil B, palavra por palavra', () => {
    const r = buildDesafioAdultoResult(answersAdulto())!
    expect(r.tema).toBe('adulto')
    expect(r.titulo).toBe(
      'A sua ideia de jogo já existe. Falta um primeiro jogo pequeno para ela sair do papel',
    )
    expect(blocos(r, 'h')).toEqual([
      'Por que a ideia continua na gaveta',
      'O que muda quando o primeiro jogo é pequeno',
      'Onde isso acontece',
      'Duas coisas que você disse e que importam',
    ])
    expect(blocos(r, 'p').map(semMarcas)).toEqual([
      'Você contou que tem uma ideia de jogo há anos e nunca começou, que, quando tentou, abriu um programa e fechou no mesmo dia e que sobram de 1 a 3 horas por semana para um projeto seu. A gente ouve essa história com frequência, e ela tem uma explicação simples.',
      'A ideia costuma ser grande, com mundo, história e muitas fases. E o programa que você abriu foi feito para estúdios: dezenas de janelas e nenhum próximo passo claro. Com o trabalho e o cansaço da noite, o projeto fica para depois, e a ideia volta para onde estava.',
      'Fazer um jogo é escrever as regras da ideia: quando o personagem encostar na chave, ela some e o jogo guarda que você pegou. Num primeiro jogo pequeno de propósito, você monta essas regras em blocos, testa cada uma e termina. Como você nunca programou, os blocos tiram a digitação do caminho, e a lógica é a mesma do código. A cena que você quer, a sua ideia funcionando na tela, começa assim: depois de um jogo pronto, a próxima ideia já cabe no tamanho certo.',
      'No Desafio do Primeiro Jogo, você faz A Chave do Farol em 3 fases: o personagem anda, a chave muda o jogo, o farol acende. São 30 dias para fazer no seu ritmo. No fim, você escolhe o personagem e o cenário, escreve os avisos e decide onde a chave fica. Depois publica e manda o link para os amigos jogarem.',
      'Quem prepara as aulas somos nós, Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres. O Sistema Zero começou com os jogos que fizemos com os nossos filhos.',
      'Você precisa de um projeto que consiga terminar. O Desafio é um jogo só, do começo ao fim, com o certificado no final. E você tem de 1 a 3 horas por semana: as aulas são divididas em seções, e o projeto fica salvo na sua conta, então você para hoje e continua outro dia do mesmo ponto.',
    ])
    expect(r.blocos.find((b) => b.tipo === 'img')).toMatchObject({
      legenda: 'A Chave do Farol, o jogo que você monta nas 3 fases',
    })
    expect(cta(r)).toEqual({
      tipo: 'cta',
      texto:
        'Na próxima página, você vê o jogo por dentro, as 3 fases, o que acontece depois dos 30 dias e a resposta para quem tem receio de ser curso de criança.',
      rotulo: 'Ver como a ideia sai do papel',
      href: '/pro/desafio-primeiro-jogo/oferta',
      nota: 'O preço aparece na próxima página.',
    })
    expect(r.assinatura).toBe('Helena e Júlio, Sistema Zero')
  })

  test('todas as combinações de perfil e garantia: carta completa, limpa e sem relato', () => {
    let n = 0
    for (const answers of combinacoes()) {
      const r = buildDesafioAdultoResult(answers)
      expect([answers, r === null]).toEqual([answers, false])
      if (!r) continue
      const texto = textoDoResultado(r).join('\n')
      expect(texto).not.toMatch(/\{|\}|undefined|null|\[\[|\]\]| {2}|\.\.|,,| ,/)
      expect(texto).not.toMatch(/—|–|!/)
      expect(texto).not.toMatch(PALAVRA_PROIBIDA)
      for (const b of r.blocos)
        if (b.tipo === 'p' || b.tipo === 'h') {
          expect(b.texto.split('[[').length).toBe(b.texto.split(']]').length)
          expect([b.texto, lintLightCopy(semMarcas(b.texto))]).toEqual([b.texto, []])
        }
      expect(blocos(r, 'h')).toHaveLength(4)
      expect(r.blocos.filter((b) => b.tipo === 'img')).toHaveLength(1)
      expect(r.blocos.filter((b) => b.tipo === 'relato')).toHaveLength(0)
      expect(r.blocos.at(-1)?.tipo).toBe('cta')
      expect(produtoNaCarta.test(r.titulo)).toBe(false)
      for (const b of r.blocos.slice(0, 3))
        if (b.tipo === 'p' || b.tipo === 'h')
          expect([b.texto, produtoNaCarta.test(semMarcas(b.texto))]).toEqual([b.texto, false])
      // O título das necessidades conta as frases do parágrafo.
      const frases = semMarcas(blocos(r, 'p').at(-1) ?? '')
      expect(blocos(r, 'h').at(-1)).toMatch(/^(Duas|Três|Quatro) coisas/)
      expect(frases.length).toBeGreaterThan(0)
      n++
    }
    expect(n).toBe(4 * 3 * 4 * 6)
  })

  test('cada opção de cada pergunta volta como frase na carta', () => {
    const cobre = (mapa: Record<string, unknown>, key: string, ignorar: string[] = []) => {
      for (const v of values(key).filter((x) => !ignorar.includes(x)))
        expect([key, v, v in mapa]).toEqual([key, v, true])
    }
    cobre(COPY.COMPUTADOR, 'computador')
    cobre(COPY.PROGRAMACAO, 'programacao')
    cobre(COPY.TEMPO, 'tempo_livre')
    cobre(COPY.TEMPO_NEED, 'tempo_livre')
    cobre(COPY.TEMPO_CURTO, 'tempo_livre')
    cobre(COPY.CENA, 'cena', ['nenhum'])
    cobre(COPY.TENTATIVA, 'tentativa')
    cobre(COPY.WHY_TENTATIVA, 'tentativa')
    cobre(COPY.DESEJO, 'cena_desejada')
    cobre(COPY.WISH, 'cena_desejada')
    cobre(COPY.NEED, 'garantia')
    cobre(COPY.SINTESE, 'sintese', ['conhecer'])
  })

  test('o título das necessidades conta as frases; quem pede pouco tempo não ouve duas vezes', () => {
    const quatro = buildDesafioAdultoResult(
      answersAdulto({ computador: 'compartilhado', sintese: 'conhecer' }),
    )!
    expect(blocos(quatro, 'h').at(-1)).toBe('Quatro coisas que você disse e que importam')
    const curto = buildDesafioAdultoResult(answersAdulto({ garantia: 'pouco_tempo' }))!
    expect(semMarcas(blocos(curto, 'p').at(-1) ?? '').split('divididas em seções')).toHaveLength(2)
  })
})
