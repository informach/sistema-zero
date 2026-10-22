import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  ARQUIVOS_ESPELHO_QUIZ_DESAFIO,
  PASTA_ESPELHO_QUIZ_DESAFIO,
} from '../../scripts/espelho-quiz-desafio'
import {
  type ResultadoConversa,
  semMarcas,
  textoDoResultado,
} from '../../src/content/resultado-conversa'
import { RELATOS } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import { paraFeminino } from '../../src/funnels/comunidade-dos-criadores/quiz/genero'
import { DESAFIO_PRIMEIRO_JOGO as funnel } from '../../src/funnels/desafio-primeiro-jogo'
import { DESAFIO_PERFIL_LABELS, DESAFIO_QUIZ } from '../../src/funnels/desafio-primeiro-jogo/quiz'
import {
  activeDesafioSteps,
  applyDesafioAnswer,
  completesQuiz,
  desafioBranch,
  desafioDecision,
  desafioProfileSlug,
  isAdultExit,
  isDesafioQuizComplete,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  profileScores,
  profileScoresM9,
  QUIZ_VERSION,
  stepOnScreen,
} from '../../src/funnels/desafio-primeiro-jogo/quiz/engine'
import {
  ADULT_EXIT,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  quizHeadlineId,
  STAGE_LABELS,
} from '../../src/funnels/desafio-primeiro-jogo/quiz/entry-copy'
import {
  BRANCHES,
  DESAFIO_QUESTIONS,
  GENERO_STEP,
  IDADE_STEP,
  QUESTIONS_9A17,
  QUESTIONS_M9,
} from '../../src/funnels/desafio-primeiro-jogo/quiz/questions'
import { DESAFIO_QUESTIONS_V4 } from '../../src/funnels/desafio-primeiro-jogo/quiz/questions-v4'
import {
  buildDesafioKidsResult,
  DESAFIO_OFFER_PATHS,
} from '../../src/funnels/desafio-primeiro-jogo/quiz/result'
import * as COPY from '../../src/funnels/desafio-primeiro-jogo/quiz/result-copy'
import { isQuizComplete } from '../../src/funnels/registry'
import { orderedOptions } from '../../src/islands/spin-quiz/useSpinQuiz'
import type { QuizAnswers } from '../../src/lib/quiz-types'

/** Um lead completo do ramo de 9 a 17 (perfil B, filho de 13 a 17). */
export const answers917 = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 9,
  genero: 'filho',
  idade: '13_17',
  tempo_tela: '2_4',
  computador: 'dividido',
  cena: 'B',
  trava: 'chama',
  cena_desejada: 'B',
  garantia: 'ajuda',
  sintese: 'B',
  ...patch,
})
/** Um lead completo do ramo menor de 9 (perfil B, filho). */
export const answersM9 = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 9,
  genero: 'filho',
  idade: 'menos_9',
  m9_leitura: 'comecando',
  m9_computador: 'organizar',
  m9_tempo_juntos: 'duas_tres',
  m9_cena: 'B',
  m9_cena_desejada: 'B',
  m9_garantia: 'nao_programar',
  m9_sintese: 'B',
  ...patch,
})
const step = (key: string) => DESAFIO_QUESTIONS.find((s) => s.key === key)!
const values = (key: string) => step(key).opcoes.map((o) => o.value)

const blocos = (r: ResultadoConversa, tipo: 'p' | 'h') =>
  r.blocos.flatMap((b) => (b.tipo === tipo ? [b.texto] : []))
const cta = (r: ResultadoConversa) => r.blocos.find((b) => b.tipo === 'cta')
const tudo = (r: ResultadoConversa) => textoDoResultado(r).join('\n')

// Unicode: \b do JS não entende acentos.
const masculino =
  /(?<![\p{L}\p{N}])(ele|Ele|dele|Dele|nele|sozinho|seu filho|Seu filho|o filho)(?![\p{L}\p{N}])/u
/**
 * "ele" na copy é SEMPRE a criança: o personagem não pode virar "ela" ("ela some" é a chave, que já
 * é feminina no texto de origem).
 */
const femininoErrado = /(?<![\p{L}])ela (encosta|anda|pega|aparece)(?![\p{L}])/u
/** O produto pelo nome no título, na abertura e no porquê da carta. */
const produtoNaCarta =
  /Desafio|Farol|Comunidade|Estúdio|Zappy|[Pp]lataforma|Mural|preço|R\$|assinatura|30 dias/u
/** O produto antes do resultado (inclui as saídas). */
const produto =
  /Desafio|Farol|Comunidade|Estúdio|Zappy|[Pp]lataforma|Mural|preço|R\$|assinatura|prazo|30 dias|(?<![\p{L}])aulas?(?![\p{L}])|(?<![\p{L}])cursos?(?![\p{L}])/u

/** As combinações das três perguntas de perfil nos dois gêneros, com o resto sorteado (semente fixa). */
function* combinacoes917(): Generator<QuizAnswers> {
  let seed = 20261021
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const genero of ['filho', 'filha'])
    for (const cena of values('cena'))
      for (const cena_desejada of values('cena_desejada'))
        for (const sintese of values('sintese'))
          yield answers917({
            genero,
            idade: sorteio(['9_12', '13_17']),
            tempo_tela: sorteio(values('tempo_tela')),
            computador: sorteio(values('computador')),
            trava: sorteio(values('trava')),
            garantia: sorteio(values('garantia')),
            cena,
            cena_desejada,
            sintese,
          })
}
function* combinacoesM9(): Generator<QuizAnswers> {
  let seed = 21102026
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const genero of ['filho', 'filha'])
    for (const m9_cena of values('m9_cena'))
      for (const m9_cena_desejada of values('m9_cena_desejada'))
        for (const m9_sintese of values('m9_sintese'))
          yield answersM9({
            genero,
            m9_leitura: sorteio(values('m9_leitura')),
            m9_computador: sorteio(values('m9_computador')),
            m9_tempo_juntos: sorteio(values('m9_tempo_juntos')),
            m9_garantia: sorteio(values('m9_garantia')),
            m9_cena,
            m9_cena_desejada,
            m9_sintese,
          })
}

describe('Desafio v5: entrada, ramos e perguntas sem o produto antes do resultado', () => {
  test('entrada, perguntas, etapas e saída falam só da criança e da casa', () => {
    const textos = [
      QUIZ_ENTRY.eyebrow,
      QUIZ_ENTRY.pageTitle,
      QUIZ_ENTRY.description,
      QUIZ_ENTRY.note,
      ...Object.values(QUIZ_HEADLINES).map((h) => h.title),
      ...Object.values(STAGE_LABELS).flatMap((l) => Object.values(l)),
      ...Object.values(ADULT_EXIT),
      ...DESAFIO_QUESTIONS.flatMap((s) => [
        s.titulo,
        s.subtitulo ?? '',
        ...s.opcoes.map((o) => o.label),
      ]),
    ]
    for (const texto of textos) {
      expect([texto, produto.test(texto)]).toEqual([texto, false])
      // As perguntas são perguntas: a regra do gancho (3) não vale para elas.
      expect([texto, lintLightCopy(texto).filter((i) => i.rule !== 3)]).toEqual([texto, []])
    }
  })

  test('as manchetes do Canvas: a padrão sem parâmetro, `?manchete=tela` a alternativa', () => {
    expect(quizHeadlineId(null)).toBe('padrao')
    expect(quizHeadlineId('qualquer')).toBe('padrao')
    expect(quizHeadlineId('tela')).toBe('tela')
    expect(QUIZ_HEADLINES.padrao.title).toBe(
      'Seu filho vive no jogo. Em 2 minutos, veja como esse tempo pode virar algo que ele faz.',
    )
    for (const h of Object.values(QUIZ_HEADLINES)) expect(h.title).toContain(h.emphasis)
    expect(DESAFIO_QUIZ.headlines).toEqual({
      padrao: QUIZ_HEADLINES.padrao.label,
      tela: QUIZ_HEADLINES.tela.label,
    })
    expect(DESAFIO_QUIZ.defaultHeadline).toBe('padrao')
  })

  test('chaves e eventos únicos, todos da v5; cada pergunta sabe o seu ramo', () => {
    const keys = DESAFIO_QUESTIONS.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const s of DESAFIO_QUESTIONS) {
      expect(s.lastStep).toBe(`desafio_v5_${s.key}`)
      expect(s.eventName).toBe(`respondeu_desafio_v5_${s.key}`)
      expect(s.rotuloCurto?.length).toBeGreaterThan(0)
    }
    expect(QUESTIONS_9A17.every((s) => s.ramo === '9a17')).toBe(true)
    expect(QUESTIONS_M9.every((s) => s.ramo === 'm9' && s.key.startsWith('m9_'))).toBe(true)
    expect(QUESTIONS_9A17).toHaveLength(7)
    expect(QUESTIONS_M9).toHaveLength(7)
    expect(GENERO_STEP.ramo).toBeUndefined()
    expect(IDADE_STEP.ramo).toBeUndefined()
    expect(Object.keys(BRANCHES)).toEqual(['9a17', 'm9', 'adulto'])
    expect(DESAFIO_QUIZ.branches).toBe(BRANCHES)
    expect(DESAFIO_QUIZ.presentation).toBe('desafio-kids')
    expect(DESAFIO_QUIZ.total).toBe(8)
    // A v4 só rotula leads antigos no /admin.
    expect(DESAFIO_QUIZ.legacySteps).toBe(DESAFIO_QUESTIONS_V4)
  })

  test('a idade abre o ramo: 9 a 17 e menor de 9 com sete perguntas, 18 ou mais sai', () => {
    const v = { _quiz_version: QUIZ_VERSION }
    expect(activeDesafioSteps({ ...v })).toEqual([GENERO_STEP, IDADE_STEP])
    expect(activeDesafioSteps({ ...v, idade: '9_12' })).toHaveLength(9)
    expect(activeDesafioSteps({ ...v, idade: 'menos_9' })).toHaveLength(9)
    expect(desafioBranch({ ...v, idade: '13_17' })).toBe('9a17')
    expect(desafioBranch({ ...v, idade: 'menos_9' })).toBe('m9')
    expect(desafioBranch({ ...v, idade: '18_mais' })).toBe('adulto')
    expect(desafioBranch({ idade: '9_12' })).toBeNull()
    expect(isAdultExit({ ...v, genero: 'filho', idade: '18_mais' })).toBe(true)
    expect(isDesafioQuizComplete({ ...v, genero: 'filho', idade: '18_mais' })).toBe(false)
    expect(DESAFIO_QUIZ.branchOf?.({ ...v, idade: 'menos_9' })).toBe('m9')
  })

  test('applyAnswer grava versão e revisão; trocar a idade apaga o ramo anterior', () => {
    const a = applyDesafioAnswer({}, 'genero', 'filha')!
    expect(a).toMatchObject({ genero: 'filha', _quiz_version: QUIZ_VERSION, _quiz_revision: 1 })
    expect(applyDesafioAnswer(a, 'tempo_tela', '2_4')).toBeNull()
    const b = applyDesafioAnswer(a, 'idade', '9_12')!
    const c = applyDesafioAnswer(b, 'tempo_tela', '2_4')!
    expect(c.tempo_tela).toBe('2_4')
    const d = applyDesafioAnswer(c, 'idade', 'menos_9')!
    expect(d.tempo_tela).toBeUndefined()
    expect(d._quiz_revision).toBe(4)
    expect(applyDesafioAnswer(d, 'm9_leitura', 'inexistente')).toBeNull()
    // Respostas de outra versão contam como vazias.
    expect(
      applyDesafioAnswer({ _quiz_version: 'desafio-farol-v4', idade: '9_11' }, 'genero', 'filho'),
    ).toMatchObject({ genero: 'filho', _quiz_version: QUIZ_VERSION })
  })

  test('para uma filha, as perguntas viram "ela" sem sobrar masculino', () => {
    for (const branch of [answers917({ genero: 'filha' }), answersM9({ genero: 'filha' })])
      for (const s of activeDesafioSteps(branch)) {
        if (s.key === GENERO_STEP.key) continue
        const shown = stepOnScreen(s, branch)
        const texto = [shown.titulo, shown.subtitulo ?? '', ...shown.opcoes.map((o) => o.label)]
        for (const t of texto) expect([s.key, t, masculino.test(t)]).toEqual([s.key, t, false])
      }
    expect(stepOnScreen(IDADE_STEP, answers917({ genero: 'filha' })).opcoes.at(-1)?.label).toBe(
      'Ela tem 18 anos ou mais',
    )
  })

  test('ordem estável por lead, com as opções neutras no fim', () => {
    for (const key of ['cena', 'sintese', 'm9_cena', 'm9_sintese', 'garantia', 'm9_garantia']) {
      const a = orderedOptions(step(key), 'sessao-1').map((o) => o.value)
      expect(orderedOptions(step(key), 'sessao-1').map((o) => o.value)).toEqual(a)
      for (const fixo of step(key).fixedLast ?? [])
        expect(a.slice(-(step(key).fixedLast ?? []).length)).toContain(fixo)
    }
  })

  test('completesQuiz: só a resposta que fecha o ramo leva ao resultado', () => {
    const quase = answers917()
    delete quase.sintese
    expect(completesQuiz(quase, 'sintese', 'B')).toBe(true)
    expect(completesQuiz(quase, 'cena', 'A')).toBe(false)
    expect(isQuizComplete(funnel.content.quiz!, answers917())).toBe(true)
    expect(isQuizComplete(funnel.content.quiz!, answersM9())).toBe(true)
  })
})

describe('Desafio v5: o perfil soma três respostas em cada ramo', () => {
  test('9 a 17: cena e síntese valem 3, a cena desejada 2; o empate vai para a síntese', () => {
    expect(profileScores(answers917({ cena: 'A', cena_desejada: 'C', sintese: 'D' }))).toEqual({
      A: 3,
      B: 0,
      C: 2,
      D: 3,
    })
    expect(
      desafioDecision(answers917({ cena: 'A', cena_desejada: 'C', sintese: 'D' }))?.profile,
    ).toBe('D')
    const aproximado = desafioDecision(
      answers917({ cena: 'nenhum', cena_desejada: 'C', sintese: 'conhecer' }),
    )!
    expect(aproximado).toMatchObject({ profile: 'C', state: 'perfil_aproximado' })
  })

  test('menor de 9: a cena dos avós soma para o tempo a dois; o irmão não soma', () => {
    expect(
      profileScoresM9(answersM9({ m9_cena: 'irmao', m9_cena_desejada: 'A2', m9_sintese: 'D' })),
    ).toEqual({ A: 2, B: 0, D: 3 })
    expect(
      desafioDecision(
        answersM9({ m9_cena: 'irmao', m9_cena_desejada: 'A2', m9_sintese: 'conhecer' }),
      ),
    ).toMatchObject({ profile: 'A', state: 'perfil_aproximado' })
  })

  test('slugs: os da v4 no 9 a 17, próprios no menor de 9, até 32 caracteres; todos rotulados', () => {
    const slugs = [...Object.values(PROFILE_IDS), ...Object.values(PROFILE_IDS_M9)]
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) {
      expect(s.length).toBeLessThanOrEqual(32)
      expect(DESAFIO_PERFIL_LABELS[s]).toBeTruthy()
    }
    expect(Object.values(PROFILE_IDS)).toEqual([
      'tempo-de-tela',
      'criacao-de-jogos',
      'expressao-visual',
      'iniciacao-tecnologica',
    ])
    expect(funnel.content.result?.perfilLabels).toBe(DESAFIO_PERFIL_LABELS)
    expect(desafioProfileSlug(answersM9())).toBe('m9-ideias')
    expect(DESAFIO_QUIZ.computePerfil?.(answers917())).toBe('criacao-de-jogos')
  })
})

describe('Desafio v5: o resultado em conversa', () => {
  test('o exemplo do Canvas, 9 a 17: perfil B de um filho de 13 a 17', () => {
    const r = buildDesafioKidsResult(answers917())!
    expect(r.tema).toBe('kids')
    expect(r.titulo).toBe(
      'As ideias de jogo do seu filho já existem. Falta a primeira sair do papel',
    )
    const p = blocos(r, 'p').map(semMarcas)
    expect(p[0]).toBe(
      'Você contou que ele tem entre 13 e 17 anos, passa de 2 a 4 horas por dia em jogos e vídeos e inventa jogo o tempo todo, mas fica só na conversa. Isso é comum em quem gosta de criar, e tem uma explicação simples.',
    )
    expect(blocos(r, 'h')).toEqual([
      'Por que as ideias ficam na conversa',
      'O que muda quando ele monta as regras',
      'Onde isso acontece',
      'O que você disse que precisa',
    ])
    expect(p.at(-1)).toBe(
      'Você quer ter ajuda quando ele travar. Em cada parte da aula, o botão Verificar esta parte mostra o que falta, e o vídeo fica do lado dos blocos. E o computador é dividido em casa: o projeto fica guardado na conta dele, então ele para num dia e continua no outro, do mesmo ponto.',
    )
    expect(cta(r)).toEqual({
      tipo: 'cta',
      texto:
        'Na próxima página, você vê o jogo, as 3 etapas, como você acompanha pela Área dos pais e o que acontece depois dos 30 dias.',
      rotulo: 'Ver como a ideia vira jogo',
      href: '/kids/desafio-primeiro-jogo/oferta',
      nota: 'O preço aparece na próxima página.',
    })
    expect(r.assinatura).toBe('Helena e Júlio, Sistema Zero Kids')
  })

  test('o exemplo do Canvas, menor de 9: perfil B de um filho', () => {
    const r = buildDesafioKidsResult(answersM9())!
    expect(r.tema).toBe('kids-m9')
    expect(r.titulo).toBe(
      'As brincadeiras que seu filho inventa podem virar o primeiro jogo de vocês',
    )
    const p = blocos(r, 'p').map(semMarcas)
    expect(p[0]).toBe(
      'Você contou que ele inventa brincadeira e personagem o tempo todo, que ele está começando a ler e que vocês conseguem sentar juntos no computador duas ou três vezes por semana. Nessa idade a imaginação está a toda, e dá para aproveitar isso de um jeito novo.',
    )
    expect(p).toContain(
      'Fora da tela, ele inventa o personagem, a regra e o fim da história. No tablet, os joguinhos já vêm decididos: ele só aperta. Falta um lugar onde a ideia dele mande no que acontece, com você do lado para ler e ajudar com o mouse.',
    )
    expect(p.at(-1)).toBe(
      'Você quer não precisar saber programar. O vídeo mostra cada passo, e os blocos têm as palavras escritas: o seu papel é ler, perguntar e deixar ele escolher. E o computador precisa de um horário combinado: como as aulas são em vídeo, vocês escolhem a hora.',
    )
    expect(cta(r)).toMatchObject({
      rotulo: 'Ver como criar o primeiro jogo de vocês',
      href: DESAFIO_OFFER_PATHS.m9,
    })
  })

  test('a abertura com marcas que têm vírgula e "e" continua uma lista bem formada', () => {
    const r = buildDesafioKidsResult(
      answersM9({
        m9_leitura: 'prefere',
        m9_tempo_juntos: 'uma',
        m9_cena: 'nenhum',
        m9_sintese: 'B',
      }),
    )!
    expect(semMarcas(blocos(r, 'p')[0]!)).toBe(
      'Você contou que você quer ver as ideias dele virando jogo, que ele lê, mas prefere que você leia e que vocês conseguem sentar juntos no computador uma vez por semana, um pouquinho. Nessa idade a imaginação está a toda, e dá para aproveitar isso de um jeito novo.',
    )
  })

  test('todas as combinações dos dois ramos e dos dois gêneros: carta completa e limpa', () => {
    let n = 0
    for (const answers of [...combinacoes917(), ...combinacoesM9()]) {
      const r = buildDesafioKidsResult(answers)
      expect([answers, r === null]).toEqual([answers, false])
      if (!r) continue
      const texto = tudo(r)
      expect(texto).not.toMatch(/\{|\}|undefined|null|\[\[|\]\]| {2}|\.\.|,,| ,/)
      expect(texto).not.toMatch(/—|–|!/)
      for (const b of r.blocos)
        if (b.tipo === 'p' || b.tipo === 'h') {
          expect(b.texto.split('[[').length).toBe(b.texto.split(']]').length)
          expect([b.texto, lintLightCopy(semMarcas(b.texto))]).toEqual([b.texto, []])
        }
      expect(blocos(r, 'h')).toHaveLength(4)
      expect(r.blocos.filter((b) => b.tipo === 'img')).toHaveLength(1)
      expect(r.blocos.filter((b) => b.tipo === 'relato')).toHaveLength(1)
      expect(r.blocos.at(-1)?.tipo).toBe('cta')
      // O título, a abertura e o porquê não falam do produto.
      expect(produtoNaCarta.test(r.titulo)).toBe(false)
      for (const b of r.blocos.slice(0, 3))
        if (b.tipo === 'p' || b.tipo === 'h')
          expect([b.texto, produtoNaCarta.test(semMarcas(b.texto))]).toEqual([b.texto, false])
      // Os relatos são citados literalmente, sem trocar o gênero de quem fala.
      const relato = r.blocos.find((b) => b.tipo === 'relato')
      expect(Object.values(RELATOS).some((x) => x.fala === relato?.texto)).toBe(true)
      if (answers.genero === 'filha') {
        const meu = r.blocos
          .flatMap((b) =>
            b.tipo === 'p' || b.tipo === 'h'
              ? [semMarcas(b.texto)]
              : b.tipo === 'cta'
                ? [b.texto, b.rotulo]
                : b.tipo === 'img'
                  ? [b.legenda]
                  : [],
          )
          .concat(r.titulo)
          .join('\n')
        expect([meu, masculino.test(meu)]).toEqual([meu, false])
        expect(meu).not.toMatch(femininoErrado)
      }
      const d = desafioDecision(answers)!
      const botao = cta(r)
      const destino = DESAFIO_OFFER_PATHS[d.branch]
      expect(r.destino).toBe(destino)
      if (botao?.tipo === 'cta') {
        // A seção que responde à condição: o computador nas dúvidas, o formato na aula ou na sessão.
        const ancora =
          d.unmet[0] === 'computador' ? '#duvidas' : d.branch === 'm9' ? '#sessao' : '#aula'
        expect(botao.href).toBe(d.unmet.length ? `${destino}${ancora}` : destino)
        expect(botao.rotulo === COPY.CTA_UNMET_LABEL).toBe(d.unmet.length > 0)
        expect(botao.nota).toBe(COPY.CTA_NOTA)
      }
      expect(r.evento).toMatchObject({
        quiz_version: QUIZ_VERSION,
        ramo: d.branch,
        perfil_principal: d.profile,
        destino: botao?.tipo === 'cta' ? botao.href : '',
      })
      n++
    }
    expect(n).toBe(2 * (5 * 4 * 5) + 2 * (5 * 4 * 4))
  })

  test('cada opção de cada pergunta volta como frase na carta', () => {
    const cobre = (mapa: Record<string, unknown>, key: string, ignorar: string[] = []) => {
      for (const v of values(key).filter((x) => !ignorar.includes(x)))
        expect([key, v, v in mapa]).toEqual([key, v, true])
    }
    cobre(COPY.MARCAS_917.idade, 'idade', ['menos_9', '18_mais'])
    cobre(COPY.MARCAS_917.tempo_tela, 'tempo_tela')
    cobre(COPY.COMPUTADOR_917, 'computador')
    cobre(COPY.CENA_917, 'cena', ['nenhum'])
    cobre(COPY.TRAVA, 'trava')
    cobre(COPY.DESEJO_917, 'cena_desejada')
    cobre(COPY.NEED_917, 'garantia')
    cobre(COPY.SINTESE_917, 'sintese', ['conhecer'])
    cobre(COPY.MARCAS_M9.m9_leitura, 'm9_leitura')
    cobre(COPY.LEITURA_M9, 'm9_leitura')
    cobre(COPY.COMPUTADOR_M9, 'm9_computador')
    cobre(COPY.MARCAS_M9.m9_tempo_juntos, 'm9_tempo_juntos', ['nao_sei'])
    cobre(COPY.CENA_M9, 'm9_cena', ['nenhum', 'irmao'])
    cobre(COPY.DESEJO_M9, 'm9_cena_desejada')
    cobre(COPY.WISH_M9, 'm9_cena_desejada')
    cobre(COPY.NEED_M9, 'm9_garantia')
    cobre(COPY.SINTESE_M9, 'm9_sintese', ['conhecer'])
  })

  test('condições: só celular e professor ao vivo trocam o botão e apontam a seção que responde', () => {
    const tablet = buildDesafioKidsResult(answers917({ computador: 'celular_tablet' }))!
    expect(cta(tablet)).toMatchObject({
      rotulo: COPY.CTA_UNMET_LABEL,
      href: '/kids/desafio-primeiro-jogo/oferta#duvidas',
    })
    expect(tudo(tablet)).toContain('só tem celular ou tablet')
    const aoVivo = buildDesafioKidsResult(answersM9({ m9_garantia: 'ao_vivo' }))!
    expect(cta(aoVivo)).toMatchObject({
      rotulo: COPY.CTA_UNMET_LABEL,
      href: '/kids/desafio-primeiro-jogo/oferta/criar-junto#sessao',
    })
    expect(desafioDecision(answers917({ computador: 'verificar' }))).toMatchObject({
      unmet: [],
      pending: ['computador'],
      adequacy: 'precisa_conferir',
    })
    expect(cta(buildDesafioKidsResult(answers917({ computador: 'verificar' }))!)).toMatchObject({
      rotulo: 'Ver como a ideia vira jogo',
    })
  })

  test('o irmão mais velho ganha uma frase; 18 ou mais não tem carta', () => {
    const irmao = buildDesafioKidsResult(answersM9({ m9_cena: 'irmao' }))!
    expect(tudo(irmao)).toContain(semMarcas(COPY.IRMAO))
    expect(buildDesafioKidsResult(answers917({ idade: '18_mais' }))).toBeNull()
  })

  test('o espelho editorial (copy/quiz.md, resultados-quiz.md e os adultos) é exatamente o código', () => {
    for (const [arquivo, gerar] of Object.entries(ARQUIVOS_ESPELHO_QUIZ_DESAFIO)) {
      const doc = readFileSync(join(PASTA_ESPELHO_QUIZ_DESAFIO, arquivo), 'utf8').replaceAll(
        '\r\n',
        '\n',
      )
      expect([arquivo, doc]).toEqual([arquivo, gerar()])
    }
  })

  test('"ele" na copy é sempre a criança', () => {
    const textos: string[] = []
    const coletar = (v: unknown) => {
      if (typeof v === 'string') textos.push(v)
      else if (Array.isArray(v)) v.forEach(coletar)
      else if (v && typeof v === 'object') Object.values(v).forEach(coletar)
    }
    coletar(COPY)
    for (const texto of textos)
      expect([texto, femininoErrado.test(paraFeminino(texto))]).toEqual([texto, false])
  })

  test('o contrato da oferta não mudou', () => {
    expect(funnel.offerContract).toEqual({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      guaranteeDays: 7,
    })
  })
})
