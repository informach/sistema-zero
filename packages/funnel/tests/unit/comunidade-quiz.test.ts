import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  ARQUIVO_PERGUNTAS,
  ARQUIVO_RESULTADOS,
  espelhoPerguntas,
  espelhoResultados,
  PASTA_ESPELHO_QUIZ,
} from '../../scripts/espelho-quiz-comunidade'
import {
  type ResultadoConversa,
  semMarcas,
  textoDoResultado,
} from '../../src/content/resultado-conversa'
import { RELATOS } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import {
  activeCommunitySteps,
  applyCommunityAnswer,
  communityBranch,
  communityDecision,
  communityProfileSlug,
  completesQuiz,
  isAdultExit,
  isCommunityQuizComplete,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  profileScores,
  profileScoresM9,
  QUIZ_VERSION,
  stepOnScreen,
} from '../../src/funnels/comunidade-dos-criadores/quiz/engine'
import {
  ADULT_EXIT,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  quizHeadlineId,
  STAGE_LABELS,
} from '../../src/funnels/comunidade-dos-criadores/quiz/entry-copy'
import { paraFeminino } from '../../src/funnels/comunidade-dos-criadores/quiz/genero'
import {
  BRANCHES,
  CALCULADORA_POR_DIA,
  COMMUNITY_QUESTIONS,
  QUESTIONS_9A17,
  QUESTIONS_M9,
} from '../../src/funnels/comunidade-dos-criadores/quiz/questions'
import { buildCommunityResult } from '../../src/funnels/comunidade-dos-criadores/quiz/result'
import * as COPY9 from '../../src/funnels/comunidade-dos-criadores/quiz/result-copy-9a17'
import * as COPYM9 from '../../src/funnels/comunidade-dos-criadores/quiz/result-copy-m9'
import { orderedOptions } from '../../src/islands/spin-quiz/useSpinQuiz'
import type { QuizAnswers } from '../../src/lib/quiz-types'

/** Um lead completo do ramo 9 a 17 (perfil A, filho de 9 a 12). */
export const answers917 = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 11,
  genero: 'filho',
  idade: '9_12',
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
/** Um lead completo do ramo menor de 9 (perfil B, filha). */
export const answersM9 = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 10,
  genero: 'filha',
  idade: 'menos_9',
  m9_leitura: 'comecando',
  m9_computador: 'sim',
  m9_tempo_juntos: 'duas_tres',
  m9_cena: 'B',
  m9_preocupacao: 'B',
  m9_cena_desejada: 'B',
  m9_garantia: 'conduzir',
  m9_sintese: 'B',
  ...patch,
})
const step = (key: string) => COMMUNITY_QUESTIONS.find((s) => s.key === key)!
const values = (key: string) => step(key).opcoes.map((o) => o.value)

const blocos = (r: ResultadoConversa, tipo: 'p' | 'h') =>
  r.blocos.flatMap((b) => (b.tipo === tipo ? [b.texto] : []))
const cta = (r: ResultadoConversa) => r.blocos.find((b) => b.tipo === 'cta')
const tudo = (r: ResultadoConversa) => textoDoResultado(r).join('\n')

// Unicode: \b do JS não entende acentos.
const masculino =
  /(?<![\p{L}\p{N}])(ele|Ele|dele|Dele|nele|sozinho|seu filho|Seu filho|esse menino)(?![\p{L}\p{N}])/u
/** "ele" na copy é SEMPRE a criança: o personagem e o enunciado não podem virar "ela". */
const femininoErrado =
  /(?<![\p{L}])ela (encosta|pede|aparece|anda|pula|some|reage|soma)(?![\p{L}])|o que ela pede/u
/** O produto pelo nome, na abertura e no porquê da carta ("muitos cursos" é genérico). */
const produtoNaCarta =
  /Comunidade|Estúdio|Pinta|Recados|Zappy|[Pp]lataforma|Mural|preço|R\$|assinatura/u
/** O produto antes do resultado. */
const produto =
  /Comunidade|Estúdio|Pinta|Recados|Zappy|[Pp]lataforma|Mural|preço|R\$|assinatura|(?<![\p{L}])aulas?(?![\p{L}])|(?<![\p{L}])cursos?(?![\p{L}])/u

/** As combinações das quatro perguntas de perfil, com as outras respostas sorteadas (semente fixa). */
function* combinacoes917(): Generator<QuizAnswers> {
  let seed = 20261020
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const cena of values('cena'))
    for (const preocupacao of values('preocupacao'))
      for (const cena_desejada of values('cena_desejada'))
        for (const sintese of values('sintese')) {
          const base = answers917({
            genero: sorteio(['filho', 'filha']),
            idade: sorteio(['9_12', '13_17']),
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
function* combinacoesM9(): Generator<QuizAnswers> {
  let seed = 19102026
  const sorteio = (lista: string[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return lista[seed % lista.length]!
  }
  for (const m9_cena of values('m9_cena'))
    for (const m9_preocupacao of values('m9_preocupacao'))
      for (const m9_cena_desejada of values('m9_cena_desejada'))
        for (const m9_sintese of values('m9_sintese'))
          for (const genero of ['filho', 'filha'])
            yield answersM9({
              genero,
              m9_leitura: sorteio(values('m9_leitura')),
              m9_computador: sorteio(values('m9_computador')),
              m9_tempo_juntos: sorteio(values('m9_tempo_juntos')),
              m9_garantia: sorteio(values('m9_garantia')),
              m9_cena,
              m9_preocupacao,
              m9_cena_desejada,
              m9_sintese,
            })
}

describe('Comunidade v6: entrada, ramos e perguntas sem o produto antes do resultado', () => {
  test('entrada, perguntas, etapas e títulos montados falam só da criança e da casa', () => {
    const textos = [
      QUIZ_ENTRY.eyebrow,
      QUIZ_ENTRY.description,
      QUIZ_ENTRY.note,
      ...Object.values(QUIZ_HEADLINES).map((h) => h.title),
      ...Object.values(STAGE_LABELS).flatMap((l) => Object.values(l)),
      ...COMMUNITY_QUESTIONS.flatMap((s) => [
        s.titulo,
        s.subtitulo ?? '',
        ...s.opcoes.map((o) => o.label),
      ]),
      ...Object.values(CALCULADORA_POR_DIA),
    ]
    for (const texto of textos) {
      expect([texto, produto.test(texto)]).toEqual([texto, false])
      // As perguntas são perguntas: a regra do gancho (3) não vale para elas.
      expect([texto, lintLightCopy(texto).filter((i) => i.rule !== 3)]).toEqual([texto, []])
    }
    // A saída de 18 ou mais pode falar da área adulta: é uma saída, não uma pergunta.
    expect(lintLightCopy(`${ADULT_EXIT.title}. ${ADULT_EXIT.text}`)).toEqual([])
  })

  test('as manchetes do Canvas: a padrão sem parâmetro, `?manchete=tela` a alternativa', () => {
    expect(quizHeadlineId(null)).toBe('padrao')
    expect(quizHeadlineId('qualquer')).toBe('padrao')
    expect(quizHeadlineId('tela')).toBe('tela')
    expect(QUIZ_HEADLINES.padrao.title).toBe(
      'Seu filho vive no jogo. Em 3 minutos, veja como usar isso para ele aprender de verdade.',
    )
    for (const h of Object.values(QUIZ_HEADLINES)) expect(h.title).toContain(h.emphasis)
  })

  test('chaves e eventos únicos; cada pergunta sabe o seu ramo', () => {
    const keys = COMMUNITY_QUESTIONS.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(COMMUNITY_QUESTIONS.map((s) => s.eventName)).size).toBe(keys.length)
    for (const s of COMMUNITY_QUESTIONS) {
      expect(s.eventName).toBe(`respondeu_comunidade_v6_${s.key}`)
      expect(s.lastStep).toBe(`comunidade_v6_${s.key}`)
    }
    expect(COMMUNITY_QUESTIONS.slice(0, 2).map((s) => [s.key, s.ramo])).toEqual([
      ['genero', undefined],
      ['idade', undefined],
    ])
    for (const s of QUESTIONS_9A17) expect(s.ramo).toBe('9a17')
    for (const s of QUESTIONS_M9) {
      expect(s.ramo).toBe('m9')
      expect(s.key).toStartWith('m9_')
    }
    expect(Object.keys(BRANCHES)).toEqual(['9a17', 'm9', 'adulto'])
    // O ramo 9 a 17 conserva as chaves e as letras da v5.
    expect(QUESTIONS_9A17.map((s) => s.key)).toEqual([
      'tempo_tela',
      'computador',
      'cena',
      'quando_trava',
      'tempo_criacao',
      'preocupacao',
      'cena_desejada',
      'garantia',
      'sintese',
      'ferramenta',
      'desenho',
      'escola',
    ])
  })

  test('a idade abre o ramo: 9 a 17 com dez perguntas, menor de 9 com nove, 18 ou mais sai', () => {
    const v = (patch: QuizAnswers) => ({ _quiz_version: QUIZ_VERSION, genero: 'filho', ...patch })
    expect(activeCommunitySteps({}).map((s) => s.key)).toEqual(['genero', 'idade'])
    expect(communityBranch(v({}))).toBeNull()
    expect(communityBranch(v({ idade: '9_12' }))).toBe('9a17')
    expect(communityBranch(v({ idade: '13_17' }))).toBe('9a17')
    expect(communityBranch(v({ idade: 'menos_9' }))).toBe('m9')
    expect(communityBranch(v({ idade: '18_mais' }))).toBe('adulto')
    // A carta de filho ou filha fica fora da contagem da tela: idade + 9 e idade + 8.
    expect(activeCommunitySteps(v({ idade: '9_12' }))).toHaveLength(2 + 9)
    expect(activeCommunitySteps(v({ idade: 'menos_9' }))).toHaveLength(2 + 8)
    expect(activeCommunitySteps(v({ idade: '18_mais' }))).toHaveLength(2)
    expect(isAdultExit(v({ idade: '18_mais' }))).toBe(true)
    expect(isCommunityQuizComplete(v({ idade: '18_mais' }))).toBe(false)
    // Respostas de outra versão contam como vazias.
    expect(communityBranch({ idade: '9_12' })).toBeNull()
  })

  test('trocar a idade troca o ramo e apaga as respostas do ramo anterior', () => {
    const completo = answers917()
    expect(isCommunityQuizComplete(completo)).toBe(true)
    const menor = applyCommunityAnswer(completo, 'idade', 'menos_9')!
    expect(menor.cena).toBeUndefined()
    expect(menor.tempo_tela).toBeUndefined()
    expect(menor.genero).toBe('filho')
    expect(menor._quiz_revision).toBe(12)
    expect(isCommunityQuizComplete(menor)).toBe(false)
    // Entre 9 a 12 e 13 a 17 o ramo é o mesmo: nada se perde.
    const maior = applyCommunityAnswer(completo, 'idade', '13_17')!
    expect(isCommunityQuizComplete(maior)).toBe(true)
    // Pergunta fora do percurso e valor fora da lista são recusados.
    expect(applyCommunityAnswer(completo, 'm9_leitura', 'nao_le')).toBeNull()
    expect(applyCommunityAnswer(completo, 'cena', 'Z')).toBeNull()
  })

  test('mudar uma resposta de perfil troca a pergunta extra e apaga a antiga', () => {
    const b = answers917({
      cena: 'B',
      preocupacao: 'B',
      cena_desejada: 'B',
      sintese: 'B',
      ferramenta: 'pode_outra',
    })
    expect(isCommunityQuizComplete(b)).toBe(true)
    const c = applyCommunityAnswer(b, 'sintese', 'C')!
    // B ainda soma 7 e C soma 3: a extra continua a da ferramenta.
    expect(c.ferramenta).toBe('pode_outra')
    const virou = applyCommunityAnswer(
      applyCommunityAnswer(applyCommunityAnswer(c, 'cena', 'C')!, 'preocupacao', 'C')!,
      'cena_desejada',
      'C',
    )!
    expect(virou.ferramenta).toBeUndefined()
    expect(activeCommunitySteps(virou).some((s) => s.key === 'desenho')).toBe(true)
  })

  test('a calculadora repete o tempo por dia; para uma filha, nada fica no masculino', () => {
    const calc = stepOnScreen(step('tempo_criacao'), answers917({ tempo_tela: '1_2h' }))
    expect(calc.titulo).toStartWith('De 1 a 2 horas por dia dão entre 365 e 730 horas por ano')
    for (const branch of [answers917({ genero: 'filha' }), answersM9({ genero: 'filha' })])
      for (const s of activeCommunitySteps(branch)) {
        const shown = stepOnScreen(s, branch)
        const texto = [
          shown.titulo,
          shown.subtitulo ?? '',
          ...shown.opcoes.map((o) => o.label),
        ].join(' ')
        expect([s.key, masculino.test(texto)]).toEqual([s.key, false])
      }
    expect(stepOnScreen(step('idade'), answers917({ genero: 'filha' })).titulo).toBe(
      'Quantos anos ela tem?',
    )
  })

  test('ordem estável por lead, com as saídas neutras no fim', () => {
    const cena = step('cena')
    expect(orderedOptions(cena, 'lead-1')).toEqual(orderedOptions(cena, 'lead-1'))
    expect(orderedOptions(cena, 'lead-1').at(-1)?.value).toBe('nenhum')
    expect(orderedOptions(step('m9_garantia'), 'x').at(-1)?.value).toBe('ao_vivo')
  })

  test('completesQuiz: só a resposta que fecha o percurso leva ao resultado', () => {
    const quase = { ...answers917() }
    delete quase.sintese
    expect(completesQuiz(quase, 'sintese', 'A')).toBe(true)
    // A frase-síntese B abre a extra da ferramenta: ainda não termina.
    const quaseB = { ...answers917({ cena: 'B', preocupacao: 'B', cena_desejada: 'B' }) }
    delete quaseB.sintese
    expect(completesQuiz(quaseB, 'sintese', 'B')).toBe(false)
    expect(completesQuiz(answers917(), 'idade', '18_mais')).toBe(false)
  })
})

describe('Comunidade v6: o perfil soma quatro respostas em cada ramo', () => {
  test('9 a 17: os pesos da v5 (cena e frase-síntese 3; preocupação e cena desejada 2)', () => {
    expect(
      profileScores(answers917({ cena: 'B', preocupacao: 'C', cena_desejada: 'D', sintese: 'B' })),
    ).toEqual({
      A: 0,
      B: 6,
      C: 2,
      D: 2,
      F: 0,
    })
    expect(communityProfileSlug(answers917())).toBe(PROFILE_IDS.A)
  })

  test('menor de 9: a cena dos avós soma para o tempo a dois; o irmão não soma', () => {
    expect(
      profileScoresM9(
        answersM9({
          m9_cena: 'irmao',
          m9_preocupacao: 'D',
          m9_cena_desejada: 'A2',
          m9_sintese: 'A',
        }),
      ),
    ).toEqual({ A: 5, B: 0, D: 2 })
    expect(communityProfileSlug(answersM9())).toBe(PROFILE_IDS_M9.B)
    const d = communityDecision(
      answersM9({ m9_garantia: 'sozinho', m9_computador: 'celular_tablet' }),
    )!
    expect(d.branch).toBe('m9')
    expect(d.unmet).toEqual(['computador'])
    expect(d.pending).toEqual(['sozinho'])
  })

  test('os slugs cabem no lead (até 32 caracteres) e não repetem entre os ramos', () => {
    const slugs = [...Object.values(PROFILE_IDS), ...Object.values(PROFILE_IDS_M9)]
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s.length).toBeLessThanOrEqual(32)
  })
})

/** Os blocos `p`/`h` e o botão de um exemplo do Canvas (`resultado-exemplos.py.txt`). */
function exemploDoCanvas(nome: 'EX_917' | 'EX_M9') {
  const arquivo = readFileSync(
    join(
      import.meta.dir,
      '..',
      '..',
      '..',
      '..',
      'docs',
      'marketing',
      'comunidade-dos-criadores',
      'proposta-2026-10-19',
      'resultado-exemplos.py.txt',
    ),
    'utf8',
  )
  const inicio = arquivo.indexOf(`${nome} = dict(`)
  const fim = arquivo.indexOf('\n    ])', inicio)
  const trecho = arquivo.slice(inicio, fim)
  const titulo = trecho.match(/titulo='([^']+)'/)?.[1]
  const textos = [...trecho.matchAll(/\('(p|h)', '((?:[^'\\]|\\.)*)'\)/g)].map((m) => ({
    tipo: m[1] as 'p' | 'h',
    texto: m[2]!,
  }))
  const botao = trecho.match(/\('cta', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\)/)
  return { titulo, textos, botao: { texto: botao?.[1], rotulo: botao?.[2] } }
}

describe('Comunidade v6: o resultado em conversa', () => {
  test('o exemplo do Canvas, 9 a 17: perfil B de uma filha de 13 a 17, palavra por palavra', () => {
    const r = buildCommunityResult(
      answers917({
        genero: 'filha',
        idade: '13_17',
        cena: 'B',
        quando_trava: 'tenta',
        tempo_tela: '2_4h',
        tempo_criacao: 'um_pouco',
        preocupacao: 'B',
        cena_desejada: 'B',
        garantia: 'acompanhar',
        sintese: 'B',
        ferramenta: 'pode_outra',
      }),
    )!
    const canvas = exemploDoCanvas('EX_917')
    expect(r.titulo).toBe(canvas.titulo!)
    const meus = r.blocos.flatMap((b) =>
      b.tipo === 'p' || b.tipo === 'h' ? [{ tipo: b.tipo, texto: b.texto }] : [],
    )
    expect(meus).toEqual(canvas.textos)
    expect(cta(r)).toMatchObject(canvas.botao)
    expect(r.tema).toBe('kids')
    expect(r.destino).toBe('/kids/comunidade-dos-criadores/oferta')
  })

  test('o exemplo do Canvas, menor de 9: perfil B de uma filha, palavra por palavra', () => {
    const r = buildCommunityResult(answersM9())!
    const canvas = exemploDoCanvas('EX_M9')
    expect(r.titulo).toBe(canvas.titulo!)
    const meus = r.blocos.flatMap((b) =>
      b.tipo === 'p' || b.tipo === 'h' ? [{ tipo: b.tipo, texto: b.texto }] : [],
    )
    expect(meus).toEqual(canvas.textos)
    // O botão segue a tabela de perfis do Canvas (B: "Ver as ideias dela virando jogo"); o exemplo
    // da carta usava o botão do perfil A. O texto acima do botão é o do exemplo.
    expect(cta(r)).toMatchObject({
      texto: canvas.botao.texto,
      rotulo: 'Ver as ideias dela virando jogo',
    })
    expect(r.tema).toBe('kids-m9')
    expect(r.destino).toBe('/kids/comunidade-dos-criadores/oferta/criar-junto')
    expect(r.blocos.find((b) => b.tipo === 'relato')).toMatchObject({
      texto: RELATOS.AV03.fala,
      autor: 'Débora, aluna, 7 anos',
    })
  })

  test('todas as combinações dos dois ramos e dos dois gêneros: carta completa e limpa', () => {
    let n = 0
    for (const answers of [...combinacoes917(), ...combinacoesM9()]) {
      const r = buildCommunityResult(answers)
      expect(r).not.toBeNull()
      if (!r) continue
      const texto = tudo(r)
      expect(texto).not.toMatch(/\{|\}|undefined|null|\[\[|\]\]| {2}/)
      expect(texto).not.toMatch(/—|–|!/)
      for (const b of r.blocos)
        if (b.tipo === 'p' || b.tipo === 'h') {
          // As marcas abrem e fecham em pares.
          expect(b.texto.split('[[').length).toBe(b.texto.split(']]').length)
          expect([b.texto, lintLightCopy(semMarcas(b.texto))]).toEqual([b.texto, []])
        }
      expect(blocos(r, 'h')).toHaveLength(4)
      expect(r.blocos.filter((b) => b.tipo === 'img')).toHaveLength(1)
      expect(r.blocos.filter((b) => b.tipo === 'relato')).toHaveLength(1)
      expect(r.blocos.at(-1)?.tipo).toBe('cta')
      // O título, a abertura e o porquê não falam do produto (o "O que muda" já pode citar o botão
      // Ouvir e o vídeo da aula, como no Canvas).
      const antes = r.blocos.slice(0, 3)
      expect(produtoNaCarta.test(r.titulo)).toBe(false)
      for (const b of antes)
        if (b.tipo === 'p' || b.tipo === 'h')
          expect([b.texto, produtoNaCarta.test(semMarcas(b.texto))]).toEqual([b.texto, false])
      // Os relatos são citados literalmente, sem trocar o gênero de quem fala.
      const relato = r.blocos.find((b) => b.tipo === 'relato')
      expect(Object.values(RELATOS).some((x) => x.fala === relato?.texto)).toBe(true)
      if (answers.genero === 'filha') {
        const meu = r.blocos
          .flatMap((b) => (b.tipo === 'p' || b.tipo === 'h' ? [semMarcas(b.texto)] : []))
          .join('\n')
        expect(meu).not.toMatch(masculino)
        expect(meu).not.toMatch(femininoErrado)
      }
      const botao = cta(r)
      expect(botao?.tipo === 'cta' && botao.href).toBe(r.destino)
      if (botao?.tipo === 'cta')
        expect(botao.rotulo === COPY9.CTA_WITH_UNMET_CONDITION).toBe(
          (communityDecision(answers)?.unmet.length ?? 0) > 0,
        )
      n++
    }
    expect(n).toBe(1080 + 640)
  })

  test('cada opção de cada pergunta volta como frase na carta', () => {
    const cobre = (mapa: Record<string, unknown>, key: string, ignorar: string[] = []) => {
      for (const v of values(key).filter((x) => !ignorar.includes(x)))
        expect([key, v, v in mapa]).toEqual([key, v, true])
    }
    cobre(COPY9.CENA, 'cena', ['nenhum'])
    cobre(COPY9.QUANDO_TRAVA, 'quando_trava', ['nao_reparou'])
    cobre(COPY9.PREOCUPACAO, 'preocupacao', ['nenhum'])
    cobre(COPY9.CENA_DESEJADA, 'cena_desejada')
    cobre(COPY9.SINTESE, 'sintese', ['conhecer'])
    cobre(COPY9.CALCULADORA, 'tempo_tela')
    cobre(COPY9.CRIACAO, 'tempo_criacao')
    cobre(COPY9.NEED_SENTENCE, 'garantia')
    cobre(COPY9.CONDITION_SENTENCE.computador, 'computador', ['sim'])
    cobre(COPY9.CONDITION_SENTENCE.ferramenta, 'ferramenta')
    cobre(COPY9.CONDITION_SENTENCE.desenho, 'desenho')
    cobre(COPY9.ESCOLA, 'escola')
    cobre(COPY9.IDADE, 'idade', ['menos_9', '18_mais'])
    cobre(COPYM9.LEITURA, 'm9_leitura')
    cobre(COPYM9.CENA_M9, 'm9_cena', ['nenhum'])
    cobre(COPYM9.PREOCUPACAO_M9, 'm9_preocupacao', ['nenhum'])
    cobre(COPYM9.CENA_DESEJADA_M9, 'm9_cena_desejada')
    cobre(COPYM9.SINTESE_M9, 'm9_sintese', ['conhecer'])
    cobre(COPYM9.TEMPO_JUNTOS, 'm9_tempo_juntos')
    cobre(COPYM9.NEED_M9, 'm9_garantia')
    cobre(COPYM9.COMPUTADOR_M9, 'm9_computador', ['sim'])
  })

  test('condições: não atendidas mudam o botão; as pendentes só avisam', () => {
    const tablet = buildCommunityResult(answers917({ computador: 'celular_tablet' }))!
    expect(cta(tablet)).toMatchObject({ rotulo: COPY9.CTA_WITH_UNMET_CONDITION })
    expect(tudo(tablet)).toContain('só celular ou tablet')
    const organizar = buildCommunityResult(answers917({ computador: 'organizar' }))!
    expect(cta(organizar)).toMatchObject({ rotulo: COPY9.PERFIS_917.A.cta })
    const roblox = buildCommunityResult(
      answers917({
        cena: 'B',
        preocupacao: 'B',
        cena_desejada: 'B',
        sintese: 'B',
        ferramenta: 'roblox',
      }),
    )!
    expect(cta(roblox)).toMatchObject({ rotulo: COPY9.CTA_WITH_UNMET_CONDITION })
    const aoVivo = buildCommunityResult(answersM9({ m9_garantia: 'ao_vivo' }))!
    expect(cta(aoVivo)).toMatchObject({ rotulo: COPY9.CTA_WITH_UNMET_CONDITION })
    expect(tudo(aoVivo)).toContain('não atende esse ponto')
    const sozinha = buildCommunityResult(answersM9({ m9_garantia: 'sozinho' }))!
    expect(tudo(sozinha)).toContain('a plataforma pede um adulto ao lado')
    expect(cta(sozinha)).toMatchObject({ rotulo: paraFeminino(COPYM9.PERFIS_M9.B.cta) })
  })

  test('o diagnóstico pouco nítido avisa antes do título; o segundo perfil ganha uma frase', () => {
    const aproximado = buildCommunityResult(
      answers917({
        cena: 'nenhum',
        preocupacao: 'nenhum',
        cena_desejada: 'C',
        sintese: 'conhecer',
        desenho: 'movimento',
      }),
    )!
    expect(aproximado.aviso).toBe(COPY9.APPROXIMATE_NOTE)
    const dois = buildCommunityResult(
      answers917({
        cena: 'B',
        preocupacao: 'C',
        cena_desejada: 'B',
        sintese: 'B',
        ferramenta: 'pode_outra',
      }),
    )!
    expect(tudo(dois)).toContain(semMarcas(COPY9.SECONDARY_SENTENCE.C))
  })

  test('o irmão mais velho lembra os dois perfis; o evento leva ramo, perfil e destino', () => {
    const irmao = buildCommunityResult(answersM9({ m9_cena: 'irmao' }))!
    expect(tudo(irmao)).toContain(semMarcas(COPYM9.IRMAO_M9))
    expect(irmao.evento).toMatchObject({
      quiz_version: QUIZ_VERSION,
      ramo: 'm9',
      perfil_principal: 'B',
      destino: '/kids/comunidade-dos-criadores/oferta/criar-junto',
    })
    expect(buildCommunityResult(answers917({ idade: '18_mais' }))).toBeNull()
  })

  test('o espelho editorial (copy/quiz-comunidade.md e resultados-quiz.md) é exatamente o código', () => {
    for (const [arquivo, gerar] of [
      [ARQUIVO_PERGUNTAS, espelhoPerguntas],
      [ARQUIVO_RESULTADOS, espelhoResultados],
    ] as const) {
      const doc = readFileSync(join(PASTA_ESPELHO_QUIZ, arquivo), 'utf8').replaceAll('\r\n', '\n')
      expect([arquivo, doc]).toEqual([arquivo, gerar()])
    }
  })

  test('"ele" na copy é sempre a criança, e paraFeminino troca só o que a copy usa', () => {
    const textos: string[] = []
    const coletar = (v: unknown) => {
      if (typeof v === 'string') textos.push(v)
      else if (Array.isArray(v)) v.forEach(coletar)
      else if (v && typeof v === 'object') Object.values(v).forEach(coletar)
    }
    coletar(COPY9)
    coletar(COPYM9)
    for (const texto of textos) expect(paraFeminino(texto)).not.toMatch(femininoErrado)
    expect(paraFeminino('Seu filho tem 9 anos e ele mesmo fez o jogo dele, sozinho.')).toBe(
      'Sua filha tem 9 anos e ela mesma fez o jogo dela, sozinha.',
    )
    expect(paraFeminino('A gente conhece bem esse menino.')).toBe(
      'A gente conhece bem essa menina.',
    )
    expect(paraFeminino('Na área dos pais, cada filho tem um painel. O elemento da pele.')).toBe(
      'Na área dos pais, cada filho tem um painel. O elemento da pele.',
    )
  })
})
