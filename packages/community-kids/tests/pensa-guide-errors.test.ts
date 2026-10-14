import { describe, expect, test } from 'bun:test'
import { CLOUD_MESSAGES } from '../src/lib/creations-cloud'
import { cloudConfirmRefusal, guideError, progressRefusal } from '../src/lib/pensa-guide-errors'

/**
 * M2: o Guia do Pensa mostra a frase quando a recusa traz `childMessage`, e o recado da internet
 * quando não traz. Aqui mora a decisão de QUAL recusa do servidor é frase de criança.
 */
describe('as recusas do Guia do Pensa falam com a criança', () => {
  test('dependência não cumprida: a frase do servidor, que já é de criança', () => {
    const error = progressRefusal(409, {
      error: {
        code: 'PENSA_TASK_DEPENDENCY_PENDING',
        message: 'Conclua as tarefas anteriores antes de começar esta',
      },
    })
    expect(error.childMessage).toBe('Conclua as tarefas anteriores antes de começar esta')
    expect(error.code).toBe('PENSA_TASK_DEPENDENCY_PENDING')
  })

  test('frase do servidor com palavra de escola cai na frase do host', () => {
    const error = progressRefusal(409, {
      error: { code: 'PENSA_TASK_DEPENDENCY_PENDING', message: 'Conclua a aula anterior' },
    })
    expect(error.childMessage).toBe('Termine antes as missões que vêm antes desta no seu plano.')
  })

  test('plano alterado (voz técnica do servidor) vira a frase do host', () => {
    const error = progressRefusal(400, {
      error: {
        code: 'PENSA_TASK_TRANSITION_INVALID',
        message: 'O progresso contém um passo ou critério desconhecido',
      },
    })
    expect(error.childMessage).toBe('Seu plano mudou. Volte ao plano para ver esta missão de novo.')
  })

  test('missão que sumiu e recusa desconhecida também têm frase (não é falta de internet)', () => {
    expect(progressRefusal(404, null).childMessage).toContain('não está mais no seu plano')
    expect(progressRefusal(500, null).childMessage).toBe(
      'Não consegui concluir agora. Tente de novo daqui a pouco.',
    )
  })

  test('a fila da nuvem que FALHOU traz a frase dela (com o código)', () => {
    const failed = Object.assign(new Error(CLOUD_MESSAGES.reopenRequired), {
      code: 'CREATION_REOPEN_REQUIRED',
    })
    const error = cloudConfirmRefusal(failed, 'Seu jogo')
    expect(error.childMessage).toBe(CLOUD_MESSAGES.reopenRequired)
    expect(error.code).toBe('CREATION_REOPEN_REQUIRED')
  })

  test('prazo da nuvem vencido: diz que não chegou e aponta a internet', () => {
    const error = cloudConfirmRefusal(
      new Error('A versão ainda não foi guardada na conta'),
      'Seu jogo',
    )
    expect(error.childMessage).toBe(
      'Seu jogo ainda não chegou à conta. Confira a internet e tente de novo.',
    )
  })

  test('`guideError` carrega a frase nos dois campos', () => {
    const error = guideError('Espere seu jogo ficar guardado na conta.')
    expect(error.message).toBe(error.childMessage!)
  })

  test('A2: o recado de reabrir é neutro e verdadeiro (não culpa o Pensa)', () => {
    expect(CLOUD_MESSAGES.reopenRequired).not.toContain('no Pensa')
    expect(CLOUD_MESSAGES.reopenRequired).toContain('versão guardada')
  })
})
