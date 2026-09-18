import { describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '../index'
import {
  blockCheckpoint,
  blockPrediction,
  evaluateLearning,
  isInteractiveBlock,
  publicInteractiveBlock,
} from '../index'
import { SCENE_IDS, type SceneId } from './actions'
import type { SceneCast } from './cast'
import { sceneStart } from './index'
import { SCENE_QUESTIONS } from './questions'
import { initialExperiment, packExperiment, stepExperiment } from './session'

const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}

const CONTEXTO = {
  label: 'O botão de teste',
  explanation: 'Nesta experiência, vamos observar o botão de teste antes de escolher um palpite.',
}

const bloco = (scene: SceneId, tipo: 'experimentation' | 'demonstration'): InteractiveBlock => ({
  kind: 'interactive',
  title: 'Bloco',
  instructions: 'Instruções.',
  hints: [],
  required: false,
  activity: { type: tipo, scene },
})

/**
 * A tabela das 45 cenas é conteúdo escrito à mão, e um `correctChoiceId` com um dedo errado
 * embarca uma pergunta que ninguém consegue acertar — em silêncio, porque o gabarito nunca sai do
 * servidor e a criança só vê "essa não é a frase". Não há como conferir isso lendo.
 */
describe('a previsão e a explicação das 45 cenas', () => {
  test('⚠️⚠️ o gabarito aponta para uma alternativa que existe', () => {
    for (const scene of SCENE_IDS) {
      const { prediction, explain } = SCENE_QUESTIONS[scene]
      for (const [nome, q] of [
        ['previsão', prediction],
        ['explicação', explain],
      ] as const) {
        const ids = q.choices.map((c) => c.id)
        expect(ids, `${scene} · ${nome}`).toContain(q.correctChoiceId)
        expect(new Set(ids).size, `${scene} · ${nome}`).toBe(ids.length)
        expect(q.choices.length, `${scene} · ${nome}`).toBeGreaterThanOrEqual(2)
        for (const c of q.choices) {
          expect(c.id.length, `${scene} · ${nome}`).toBeGreaterThan(0)
          expect(c.label.trim().length, `${scene} · ${nome}`).toBeGreaterThan(0)
        }
        expect(q.prompt.trim().length, `${scene} · ${nome}`).toBeGreaterThan(10)
      }
      expect(explain.explanation.trim().length, scene).toBeGreaterThan(10)
      expect(prediction.context.label.trim().length, `${scene} · contexto`).toBeGreaterThan(2)
      expect(prediction.context.explanation.trim().length, `${scene} · contexto`).toBeGreaterThan(
        20,
      )
    }
  })

  test('⚠️ a alternativa errada é plausível: nenhuma das duas repete a outra', () => {
    // Espantalho transforma a pergunta em clique, que é o oposto do que ela existe para fazer.
    // O que dá para travar aqui é o caso degenerado: duas alternativas com o mesmo texto.
    for (const scene of SCENE_IDS) {
      const { prediction, explain } = SCENE_QUESTIONS[scene]
      for (const q of [prediction, explain]) {
        const rotulos = q.choices.map((c) => c.label.trim().toLowerCase())
        expect(new Set(rotulos).size, scene).toBe(rotulos.length)
      }
    }
  })

  test('sem travessão: a voz da casa vale também aqui', () => {
    for (const scene of SCENE_IDS) {
      const { prediction, explain } = SCENE_QUESTIONS[scene]
      const tudo = [
        prediction.prompt,
        ...prediction.choices.map((c) => c.label),
        explain.prompt,
        ...explain.choices.map((c) => c.label),
        explain.explanation,
      ].join(' ')
      expect(tudo, scene).not.toContain('—')
    }
  })

  test('o palpite do leitor de tela nomeia a ferramenta antes de perguntar', () => {
    const { context, prompt } = SCENE_QUESTIONS['screen-reader'].prediction
    expect(context.explanation).toContain('Ouvir a tela')
    expect(prompt).toContain('leitor de tela')
    expect(prompt).toContain('Ouvir a tela')
    expect(prompt).toContain('Quando você apertar')
    expect(prompt).toContain('sem escrever uma descrição do jogo')
    expect(prompt).not.toContain('Antes de apertar')
  })

  test('⚠️⚠️ o texto sobrevive ao elenco: nada volta dizendo "Dino" numa turma de nave', () => {
    // A régua do elenco só flexiona o que está COLADO ao nome. Uma pergunta escrita com o
    // personagem em outra forma passa pelo `castText` intacta, e a criança lê "o Dino" ao lado
    // de uma nave na mesma tela.
    for (const scene of SCENE_IDS) {
      const pergunta = blockCheckpoint({
        ...bloco(scene, 'experimentation'),
        activity: { type: 'experimentation', scene, cast: NAVE },
      })
      const palpite = blockPrediction({
        ...bloco(scene, 'experimentation'),
        activity: { type: 'experimentation', scene, cast: NAVE },
      })
      const tudo = [
        palpite?.context.label,
        palpite?.context.explanation,
        palpite?.prompt,
        ...(palpite?.choices ?? []).map((c) => c.label),
        pergunta?.prompt,
        ...(pergunta?.choices ?? []).map((c) => c.label),
        pergunta?.explanation,
      ].join(' ')
      expect(tudo, scene).not.toMatch(/Dino|cactos?\b/i)
    }
  })
})

describe('os resolvedores', () => {
  test('toda cena tem previsão, e só a EXPERIMENTAÇÃO herda a pergunta', () => {
    for (const scene of SCENE_IDS) {
      expect(blockPrediction(bloco(scene, 'experimentation')), scene).toBeDefined()
      expect(blockPrediction(bloco(scene, 'demonstration')), scene).toBeDefined()
      expect(blockCheckpoint(bloco(scene, 'experimentation')), scene).toBeDefined()
      // ⚠️⚠️ Na demonstração a criança ASSISTIU. Cobrar dela a regra depois de um roteiro que
      // não conduziu é cobrar um gesto que a tela não ofereceu.
      expect(blockCheckpoint(bloco(scene, 'demonstration')), scene).toBeUndefined()
    }
  })

  test('⚠️⚠️ a demonstração INLINE não herda previsão: ela é um ▶ e nada mais', () => {
    // A previsão TRAVA o palco até a criança escolher. A `inline` existe para caber no meio de
    // uma explicação (o degrau entre o parágrafo e a simulação), então herdar o padrão punha uma
    // pergunta de duas opções e um portão em frente a um botão de dois segundos. São duas cenas
    // reais hoje (`shading` e `fill-stroke`, no Jogo do Meu Jeito), e as duas são o formato pelo
    // qual a Aula explica um conceito ANTES de pedir qualquer coisa.
    for (const scene of SCENE_IDS) {
      const guiada = bloco(scene, 'demonstration')
      const nolinha = {
        ...guiada,
        activity: { type: 'demonstration' as const, scene, presentation: 'inline' as const },
      }
      expect(blockPrediction(guiada), scene).toBeDefined()
      expect(blockPrediction(nolinha), scene).toBeUndefined()
      expect(publicInteractiveBlock(nolinha).prediction, scene).toBeUndefined()
      // ⚠️ Mas o professor que ESCREVE a sua continua mandando: o que sai é o padrão, não a
      // possibilidade.
      expect(
        blockPrediction({
          ...nolinha,
          prediction: {
            context: CONTEXTO,
            prompt: 'Vai subir?',
            choices: [{ id: 'a', label: 'Vai' }],
          },
        })?.prompt,
        scene,
      ).toBe('Vai subir?')
    }
  })

  test('⚠️⚠️ cena desconhecida não derruba a aula: volta sem pergunta', () => {
    // `publicInteractiveBlock` roda sobre o conteúdo CRU do banco (está escrito no próprio
    // código, e é por isso que a poda de gabarito existe). Uma linha gravada com um id de cena
    // aposentado fazia `SCENE_QUESTIONS[cena].prediction` LANÇAR — e a exceção derrubava o GET
    // da aula inteira, não só aquele bloco.
    const fantasma = {
      ...bloco('world', 'experimentation'),
      activity: { type: 'experimentation', scene: 'cena-que-nao-existe' },
    } as unknown as InteractiveBlock
    expect(blockPrediction(fantasma)).toBeUndefined()
    expect(blockCheckpoint(fantasma)).toBeUndefined()
    expect(() => publicInteractiveBlock(fantasma)).not.toThrow()
  })

  test('o que o bloco escreve VENCE o modelo', () => {
    const meu = {
      prompt: 'A minha pergunta',
      choices: [
        { id: 'a', label: 'Uma' },
        { id: 'b', label: 'Outra' },
      ],
      correctChoiceId: 'a',
      explanation: 'Porque sim.',
    }
    const b: InteractiveBlock = {
      ...bloco('world', 'experimentation'),
      checkpoint: meu,
      prediction: { context: CONTEXTO, prompt: 'O meu palpite', choices: meu.choices },
    }
    expect(blockCheckpoint(b)).toEqual(meu)
    expect(blockPrediction(b)?.prompt).toBe('O meu palpite')
  })

  test('⚠️⚠️ o gabarito herdado NÃO sai para o navegador', () => {
    // A projeção pública é a única porta para a criança, e a pergunta agora chega por ela em
    // TODA experimentação: um vazamento aqui entregaria a resposta das 45 cenas de uma vez.
    for (const scene of SCENE_IDS) {
      const publico = publicInteractiveBlock(bloco(scene, 'experimentation'))
      // ⚠️ Mudou de propósito (lote 2 do Raio-X): a PREVISÃO saiu pública inteira, porque ela
      // não vale nota e o player precisa do gabarito dela para retomar o palpite. O que não pode
      // atravessar continua sendo o da PERGUNTA, que decide o `passed`.
      const pergunta = JSON.stringify(publico.checkpoint)
      expect(pergunta, scene).not.toContain('correctChoiceId')
      expect(pergunta, scene).not.toContain('explanation')
      expect(JSON.stringify(publico), scene).not.toContain(
        SCENE_QUESTIONS[scene].explain.explanation,
      )
      expect(publico.checkpoint?.choices.length, scene).toBeGreaterThanOrEqual(2)
      expect(publico.prediction?.choices.length, scene).toBeGreaterThanOrEqual(2)
    }
  })

  test('⭐ a previsão chega ao navegador com o que o player precisa para retomá-la', () => {
    for (const scene of SCENE_IDS) {
      const modelo = SCENE_QUESTIONS[scene].prediction
      const publico = publicInteractiveBlock({
        ...bloco(scene, 'experimentation'),
        activity: { type: 'experimentation', scene, cast: NAVE },
      }).prediction
      expect(publico?.correctChoiceId, scene).toBe(modelo.correctChoiceId)
      expect(publico?.revealOn, scene).toBe(modelo.revealOn)
      // O "para onde olhar" de cada opção viaja junto, vestido pelo elenco.
      for (const escolha of modelo.choices) {
        const chegou = publico?.choices.find((c) => c.id === escolha.id)
        expect(Boolean(chegou?.shows), `${scene} · ${escolha.id}`).toBe(Boolean(escolha.shows))
      }
    }
    // E o bloco que escreve a sua leva a dele, podada campo a campo (sem chave estranha).
    const escrita = publicInteractiveBlock({
      ...bloco('world', 'experimentation'),
      prediction: {
        context: CONTEXTO,
        prompt: 'Vai aparecer?',
        choices: [
          { id: 'sim', label: 'Sim' },
          { id: 'nao', label: 'Não', shows: 'Olhe a tela: ela ficou vazia.' },
        ],
        correctChoiceId: 'nao',
        revealOn: 'hidden',
        ...{ solucao: 'vazou' },
      } as InteractiveBlock['prediction'],
    }).prediction
    expect(escrita).toEqual({
      context: CONTEXTO,
      prompt: 'Vai aparecer?',
      choices: [
        { id: 'sim', label: 'Sim' },
        { id: 'nao', label: 'Não', shows: 'Olhe a tela: ela ficou vazia.' },
      ],
      correctChoiceId: 'nao',
      revealOn: 'hidden',
    })
  })

  test('⚠️ `revealOn` precisa ser meta DA CENA, e `shows` precisa ser texto', () => {
    const previsao = (extra: Record<string, unknown>, escolha: Record<string, unknown> = {}) =>
      ({
        ...bloco('world', 'experimentation'),
        prediction: {
          context: CONTEXTO,
          prompt: 'Vai aparecer?',
          choices: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não', ...escolha },
          ],
          ...extra,
        },
      }) as unknown
    expect(isInteractiveBlock(previsao({ revealOn: 'hidden' }))).toBe(true)
    // Um id solto é um palpite que só volta na conclusão, sem ninguém avisar quem escreveu.
    expect(isInteractiveBlock(previsao({ revealOn: 'meta-que-nao-existe' }))).toBe(false)
    expect(isInteractiveBlock(previsao({}, { shows: 'Olhe a tela.' }))).toBe(true)
    expect(isInteractiveBlock(previsao({}, { shows: '' }))).toBe(false)
    expect(isInteractiveBlock(previsao({}, { shows: 3 }))).toBe(false)
    expect(
      isInteractiveBlock({
        ...bloco('world', 'experimentation'),
        prediction: {
          prompt: 'Vai aparecer?',
          choices: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
        },
      } as unknown),
    ).toBe(false)
    expect(
      isInteractiveBlock({
        ...bloco('world', 'experimentation'),
        prediction: {
          context: { label: '', explanation: 'Contexto inválido.' },
          prompt: 'Vai aparecer?',
          choices: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
        },
      } as unknown),
    ).toBe(false)
  })
})

/**
 * "Esta cena entra sem a pergunta do fim" (`semPerguntaFinal`), a decisão da dona de 17/09/2026.
 *
 * A Aula 1 do Corre Dino tem QUATRO cenas seguidas, e até aqui cada experimentação herdava a
 * pergunta do modelo sem jeito nenhum de dispensá-la: com as quatro previsões, eram oito momentos
 * de responder na primeira aula da criança. O campo é a única porta para "aqui ela só mexe" — e a
 * régua dele é a de sempre: só onde tem efeito, e a cena continua concluindo sozinha.
 */
describe('a cena que entra sem a pergunta do fim', () => {
  const semPergunta = (scene: SceneId = 'stage-size'): InteractiveBlock => ({
    ...bloco(scene, 'experimentation'),
    semPerguntaFinal: true,
  })

  test('a pergunta de fábrica não chega ao bloco, e a previsão continua chegando', () => {
    const b = semPergunta()
    expect(blockCheckpoint(b)).toBeUndefined()
    // ⚠️ A previsão NÃO vai junto: ela é o palpite de ANTES, não vale nota, e a decisão foi manter
    // as quatro. Tirar as duas com um campo só apagaria metade do ciclo sem ninguém pedir.
    expect(blockPrediction(b)?.prompt).toBe(SCENE_QUESTIONS['stage-size'].prediction.prompt)
    // E a mesma cena sem o campo segue recebendo a pergunta do modelo.
    expect(blockCheckpoint(bloco('stage-size', 'experimentation'))?.prompt).toBe(
      SCENE_QUESTIONS['stage-size'].explain.prompt,
    )
  })

  test('⚠️ a pergunta ESCRITA no bloco vence, mesmo com o campo (linha crua do banco)', () => {
    // O resolvedor roda sobre o conteúdo do banco, sem passar pelo guard. Os dois juntos são
    // recusados na autoria; se uma linha antiga carregar os dois, a criança vê a que alguém
    // escreveu, e não um bloco mudo.
    const escrita = {
      prompt: 'Por quê?',
      choices: [
        { id: 'a', label: 'Porque sim' },
        { id: 'b', label: 'Porque não' },
      ],
      correctChoiceId: 'a',
      explanation: 'É isso.',
    }
    expect(blockCheckpoint({ ...semPergunta(), checkpoint: escrita })).toEqual(escrita)
  })

  test('⚠️⚠️ a projeção pública não manda pergunta nenhuma, nem o campo, ao navegador', () => {
    const publico = publicInteractiveBlock(semPergunta()) as unknown as Record<string, unknown>
    expect(publico.checkpoint).toBeUndefined()
    expect(publico.semPerguntaFinal).toBeUndefined()
    expect(publico.prediction).toBeDefined()
    expect(publicInteractiveBlock(bloco('stage-size', 'experimentation')).checkpoint).toBeDefined()
  })

  test('⚠️⚠️ só `true`, e só onde o campo TEM efeito', () => {
    expect(isInteractiveBlock(semPergunta())).toBe(true)
    expect(isInteractiveBlock(semPergunta('screen-reader'))).toBe(true)
    // `false` seria um segundo jeito de dizer "com pergunta", que já é a ausência do campo.
    expect(isInteractiveBlock({ ...semPergunta(), semPerguntaFinal: false })).toBe(false)
    expect(isInteractiveBlock({ ...semPergunta(), semPerguntaFinal: 'nao' })).toBe(false)
    // Duas ordens contrárias: tirar a pergunta e escrever a minha.
    expect(
      isInteractiveBlock({
        ...semPergunta(),
        checkpoint: {
          prompt: 'Por quê?',
          choices: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
          correctChoiceId: 'a',
          explanation: 'É isso.',
        },
      }),
    ).toBe(false)
    // A demonstração NÃO tem pergunta de fábrica: ali o campo seria decoração silenciosa.
    expect(isInteractiveBlock({ ...bloco('world', 'demonstration'), semPerguntaFinal: true })).toBe(
      false,
    )
    expect(
      isInteractiveBlock({
        kind: 'interactive',
        title: 'B',
        instructions: 'I',
        hints: [],
        required: false,
        activity: { type: 'html', html: '<p>oi</p>' },
        semPerguntaFinal: true,
      }),
    ).toBe(false)
  })
})

/**
 * ⚠️⚠️ A prova que a decisão exige: SEM a pergunta, a cena ainda CONCLUI.
 *
 * Sem isto o campo seria uma armadilha: a seção da Aula 1 tem a cena como critério de conclusão
 * (`completion.blockIds`), e um bloco que nunca fecha tranca a criança na primeira aula dela.
 */
describe('sem a pergunta, quem conclui é a descoberta', () => {
  /** Os gestos da `stage-size`: ligar a borda, mexer nos números e chegar em 480 por 270. */
  const CAMINHO = [
    { type: 'border', visible: true },
    { type: 'stage', width: 600, height: 300 },
    { type: 'stage', width: 480, height: 270 },
  ] as const

  const sessaoCompleta = (b: InteractiveBlock) => {
    const start = sceneStart(b.activity as Parameters<typeof sceneStart>[0])
    let sessao = initialExperiment(start)
    for (const acao of CAMINHO) sessao = stepExperiment(start, sessao, acao).session
    return { sceneCheckpoint: packExperiment('stage-size', sessao) }
  }

  test('a descoberta sozinha conclui o bloco, e nada conclui antes dela', () => {
    const b: InteractiveBlock = {
      ...bloco('stage-size', 'experimentation'),
      semPerguntaFinal: true,
    }
    expect(evaluateLearning(b, {}).passed).toBe(false)
    expect(evaluateLearning(b, sessaoCompleta(b)).passed).toBe(true)
  })

  test('⚠️ a MESMA cena com a pergunta de fábrica ainda espera a resposta', () => {
    // O contraste é o teste: sem ele, um `blockCheckpoint` devolvendo `undefined` por engano
    // (uma cena sem pergunta no catálogo, por exemplo) passaria por "a dona pediu assim".
    const b = bloco('stage-size', 'experimentation')
    const guardado = sessaoCompleta(b)
    expect(evaluateLearning(b, guardado).passed).toBe(false)
    const pergunta = blockCheckpoint(b)
    if (!pergunta) throw new Error('a experimentação herda a pergunta do modelo')
    expect(evaluateLearning(b, { ...guardado, checkpoint: pergunta.correctChoiceId }).passed).toBe(
      true,
    )
  })
})
