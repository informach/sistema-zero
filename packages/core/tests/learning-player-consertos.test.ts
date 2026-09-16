import { describe, expect, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isPublicInteractiveBlock,
  PERGUNTA_MUDOU,
  publicInteractiveBlock,
} from '../src/learning'
import { initialExperiment, packExperiment, stepExperiment } from '../src/learning/scene'

/**
 * Os consertos do PLAYER depois do review do lote 2 do Raio-X (16/09/2026), no lado do core.
 * Os dois moram na janela em que members e kids estão em versões diferentes.
 */

const mundo: InteractiveBlock = {
  kind: 'interactive',
  title: 'Faça o Dino aparecer',
  instructions: 'Crie o Dino e ligue o desenho.',
  required: true,
  hints: [],
  activity: { type: 'experimentation', scene: 'world' },
}

function sessaoCompleta() {
  const start = { scene: 'world' } as const
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  s = stepExperiment(start, s, { type: 'connect', port: 'draw', enabled: true }).session
  return packExperiment('world', s)
}

describe('o guarda PÚBLICO e a previsão retomável', () => {
  test('⚠️⚠️ `revealOn` que o navegador não conhece NÃO derruba a atividade', () => {
    // O caso real: o members sobe um lote que acrescenta uma meta e aponta a previsão para ela;
    // a aba aberta antes do deploy (e o kids ainda velho) não conhece a meta. O guarda público
    // conferia o `revealOn` contra o catálogo do NAVEGADOR e a cena virava "precisa de uma
    // configuração válida".
    const publico = publicInteractiveBlock(mundo)
    expect(publico.prediction?.revealOn).toBeTruthy()
    const doFuturo = {
      ...publico,
      prediction: { ...publico.prediction, revealOn: 'meta-de-um-lote-futuro' },
    }
    expect(isPublicInteractiveBlock(doFuturo)).toBe(true)
    // E a AUTORIA continua recusando: quem escreve precisa saber que a meta não existe.
    expect(
      isInteractiveBlock({
        ...mundo,
        prediction: {
          prompt: 'Vai aparecer?',
          choices: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
          revealOn: 'meta-de-um-lote-futuro',
        },
      }),
    ).toBe(false)
    // O guarda público continua guardando o resto da previsão.
    expect(isPublicInteractiveBlock({ ...publico, prediction: { prompt: 'x', choices: [] } })).toBe(
      false,
    )
  })
})

describe('a resposta de uma pergunta que mudou', () => {
  const comPergunta: InteractiveBlock = {
    ...mundo,
    checkpoint: {
      prompt: 'Por quê?',
      choices: [
        { id: 'certa', label: 'Uma' },
        { id: 'errada', label: 'Outra' },
      ],
      correctChoiceId: 'certa',
      explanation: 'Porque sim.',
    },
  }

  test('⚠️ id que não é opção da pergunta de agora diz que a pergunta MUDOU, não "tente outra"', () => {
    // Uma aba aberta antes do deploy tem as opções com os ids antigos: toda opção dela respondia
    // "Ainda não é essa" até um F5, inclusive a que era a certa.
    const velha = evaluateLearning(comPergunta, {
      sceneCheckpoint: sessaoCompleta(),
      checkpoint: 'id-da-pergunta-antiga',
    })
    expect(velha.passed).toBe(false)
    expect(velha.feedback).toBe(PERGUNTA_MUDOU)
    // A errada de verdade continua sendo "não é essa", e a certa continua aprovando.
    const errada = evaluateLearning(comPergunta, {
      sceneCheckpoint: sessaoCompleta(),
      checkpoint: 'errada',
    })
    expect(errada.feedback).not.toBe(PERGUNTA_MUDOU)
    expect(errada.feedback).toContain('não é essa')
    expect(
      evaluateLearning(comPergunta, { sceneCheckpoint: sessaoCompleta(), checkpoint: 'certa' })
        .passed,
    ).toBe(true)
    // E sem a cena concluída o recado continua sendo o da cena.
    expect(
      evaluateLearning(comPergunta, { checkpoint: 'id-da-pergunta-antiga' }).feedback,
    ).not.toBe(PERGUNTA_MUDOU)
  })
})
