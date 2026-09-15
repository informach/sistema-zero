import { describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '../index'
import { blockCheckpoint, blockPrediction, publicInteractiveBlock } from '../index'
import { SCENE_IDS, type SceneId } from './actions'
import type { SceneCast } from './cast'
import { SCENE_QUESTIONS } from './questions'

const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
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
          prediction: { prompt: 'Vai subir?', choices: [{ id: 'a', label: 'Vai' }] },
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
      prediction: { prompt: 'O meu palpite', choices: meu.choices },
    }
    expect(blockCheckpoint(b)).toEqual(meu)
    expect(blockPrediction(b)?.prompt).toBe('O meu palpite')
  })

  test('⚠️⚠️ o gabarito herdado NÃO sai para o navegador', () => {
    // A projeção pública é a única porta para a criança, e a pergunta agora chega por ela em
    // TODA experimentação: um vazamento aqui entregaria a resposta das 45 cenas de uma vez.
    for (const scene of SCENE_IDS) {
      const publico = publicInteractiveBlock(bloco(scene, 'experimentation'))
      const serializado = JSON.stringify(publico)
      expect(serializado, scene).not.toContain('correctChoiceId')
      expect(serializado, scene).not.toContain('explanation')
      expect(publico.checkpoint?.choices.length, scene).toBeGreaterThanOrEqual(2)
      expect(publico.prediction?.choices.length, scene).toBeGreaterThanOrEqual(2)
    }
  })
})
