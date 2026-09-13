import { describe, expect, test } from 'bun:test'
import type { LearningAnswers } from '@sistemazero/core/learning'
import {
  applyExperimentSegment,
  type DemonstrationActivity,
  type DemonstrationSession,
  type ExperimentationActivity,
  type ExperimentSession,
  packExperiment,
  readSceneSegment,
  SCENE_MODELS,
  type SceneCheckpoint,
  type SceneCommand,
  type SceneSession,
  sceneStart,
} from '@sistemazero/core/learning/scene'
import { SceneController } from '../src/lib/scene-controller'

const mundo: ExperimentationActivity = { type: 'experimentation', scene: 'world' }

/**
 * O que o servidor devolveria: aplica o segmento sobre o que ele já tinha e escreve o
 * checkpoint. ⚠️ Ele GUARDA o anterior de propósito — um servidor que recomeça do zero a cada
 * envio aceitaria qualquer `baseSequence` e o teste de várias voltas não provaria nada.
 */
function servidor(activity: ExperimentationActivity) {
  let checkpoint: SceneCheckpoint<ExperimentSession> | null = null
  return (answers: LearningAnswers): LearningAnswers => {
    const segment = readSceneSegment(answers)
    if (!segment) throw new Error('Segmento inválido no teste.')
    checkpoint = applyExperimentSegment(sceneStart(activity), checkpoint, segment)
    return {
      sceneSequence: checkpoint.sequence,
      sceneSessionId: checkpoint.sessionId,
      sceneSegmentId: checkpoint.segmentId,
      sceneCheckpoint: packExperiment(activity.scene, checkpoint.session),
    }
  }
}
const aceitar = (activity: ExperimentationActivity, answers: LearningAnswers) =>
  servidor(activity)(answers)
const experimento = (c: SceneController<SceneSession, SceneCommand>) =>
  c.getSnapshot() as ExperimentSession

describe('o rascunho da experimentação', () => {
  test('guardar e recarregar preserva o que passou durante a animação', () => {
    const spawn: ExperimentationActivity = { type: 'experimentation', scene: 'spawn' }
    const controller = SceneController.create(spawn, 'sessao-123')
    for (let quadro = 0; quadro < 20; quadro++)
      controller.dispatch({ type: 'advance', seconds: 0.05 })
    const visto = controller.getSnapshot()
    const guardado = controller.previewConfirm()
    const recarregado = SceneController.create(spawn, 'sessao-123', guardado)
    expect(recarregado.getSnapshot()).toEqual(visto)
  })

  test('restaurar preserva a fronteira do pedido em voo', () => {
    const impulso: ExperimentationActivity = { type: 'experimentation', scene: 'impulse' }
    const original = SceneController.create(impulso, 'sessao-123')
    original.dispatch({ type: 'advance', seconds: 0.2 })
    const pedido = original.segment()
    original.dispatch({ type: 'advance', seconds: 0.4 })
    const restaurado = SceneController.create(impulso, 'sessao-123')
    expect(restaurado.restore(original.draft())).toBe(true)
    expect(restaurado.segment()).toEqual(pedido)
    expect(experimento(restaurado).state.crowd.elapsed).toBeCloseTo(0.6)
  })

  test('resposta perdida repete o MESMO segmento, inclusive depois de recarregar a aba', () => {
    const original = SceneController.create(mundo, 'sessao-123')
    original.dispatch({ type: 'create' })
    const pedido = original.segment()
    if (!pedido) throw new Error('Faltou o segmento.')
    const recarregado = SceneController.create(mundo, 'sessao-123')
    expect(recarregado.restore(original.draft())).toBe(true)
    expect(recarregado.segment()).toEqual(pedido)
    recarregado.dispatch({ type: 'connect', port: 'draw', enabled: true })
    recarregado.acknowledge(aceitar(mundo, pedido))
    // Confirmado o primeiro, o segmento seguinte leva só o que veio DEPOIS dele.
    expect(readSceneSegment(recarregado.segment() ?? {})?.commands).toEqual([
      { type: 'connect', port: 'draw', enabled: true },
    ])
    expect(experimento(recarregado).state.evidence.discoveries).toEqual(['hidden', 'visible'])
  })

  test('recarregar depois do aceite do servidor tira só o prefixo confirmado', () => {
    const original = SceneController.create(mundo, 'sessao-123')
    original.dispatch({ type: 'create' })
    const pedido = original.segment()
    if (!pedido) throw new Error('Faltou o segmento.')
    original.dispatch({ type: 'connect', port: 'draw', enabled: true })
    const recarregado = SceneController.create(mundo, 'sessao-123', aceitar(mundo, pedido))
    expect(recarregado.restore(original.draft())).toBe(true)
    expect(readSceneSegment(recarregado.segment() ?? {})?.commands).toEqual([
      { type: 'connect', port: 'draw', enabled: true },
    ])
    expect(experimento(recarregado).state.evidence.actions).toBe(2)
  })

  test('⚠️ a confirmação do servidor é conferida em CADA campo, não só na forma', () => {
    // Uma confirmação que não é DESTE envio não pode cortar os pendentes: o `acknowledge`
    // apaga comandos pela contagem, então aceitar a resposta errada joga fora o que a criança
    // fez e ainda grava um checkpoint que não corresponde ao que ela vê na tela. As três
    // conferências (sessão, segmento, sequência) passavam sem teste nenhum.
    const preparar = () => {
      const c = SceneController.create(mundo, 'sessao-123')
      c.dispatch({ type: 'create' })
      const pedido = c.segment()
      if (!pedido) throw new Error('Faltou o segmento.')
      return { c, aceite: aceitar(mundo, pedido) }
    }
    for (const [campo, adulterar] of [
      ['sessão', (a: LearningAnswers) => ({ ...a, sceneSessionId: 'sessao-999' })],
      ['segmento', (a: LearningAnswers) => ({ ...a, sceneSegmentId: crypto.randomUUID() })],
      ['sequência', (a: LearningAnswers) => ({ ...a, sceneSequence: 7 })],
    ] as const) {
      const { c, aceite } = preparar()
      expect(() => c.acknowledge(adulterar(aceite)), campo).toThrow()
      // E o pendente continua lá, esperando a confirmação certa.
      expect(readSceneSegment(c.segment() ?? {})?.commands, campo).toEqual([{ type: 'create' }])
    }
    // A confirmação correta é aceita e limpa o pendente.
    const { c, aceite } = preparar()
    c.acknowledge(aceite)
    expect(c.segment()).toBeNull()
  })

  test('⚠️ o segmento respeita o teto e ESVAZIA a fila em voltas sucessivas', () => {
    // Sem o teto o envio cresce sem limite e passa do que o servidor aceita; com o teto, mas
    // sem avançar, a fila nunca esvazia. As duas metades são a mesma invariante.
    const c = SceneController.create(mundo, 'sessao-123')
    for (let i = 0; i < 130; i++)
      c.dispatch({ type: 'connect', port: 'draw', enabled: i % 2 === 0 })
    const responder = servidor(mundo)
    let voltas = 0
    while (c.segment() && voltas < 10) {
      const pedido = c.segment()
      if (!pedido) break
      const enviados = readSceneSegment(pedido)?.commands ?? []
      expect(enviados.length).toBeLessThanOrEqual(100)
      c.acknowledge(responder(pedido))
      voltas++
    }
    expect(c.segment()).toBeNull()
    expect(voltas).toBe(2)
  })

  test('⚠️ rascunho com segmento em voo VAZIO é recusado', () => {
    // O servidor recusa segmento sem comando; o cliente aceitava. E `inFlight` não é trocado
    // enquanto existe, então nada do que a criança fizesse depois chegaria à conta — nem com F5.
    const c = SceneController.create(mundo, 'sessao-123')
    c.dispatch({ type: 'create' })
    c.segment()
    const draft = c.draft()
    const vazio = { ...draft, inFlight: { ...(draft.inFlight as object), commands: [] } }
    expect(SceneController.create(mundo, 'sessao-123').restore(vazio)).toBe(false)
  })

  test('⚠️ checkpoint de outra sessão no rascunho não vira "concluído" na tela', () => {
    // O servidor recusa um checkpoint forjado, mas a TELA acreditava nele: o `fieldset` fica
    // desabilitado por "concluído" e a criança se tranca fora da própria cena.
    const outra = SceneController.create(mundo, 'sessao-999')
    outra.dispatch({ type: 'create' })
    outra.dispatch({ type: 'connect', port: 'draw', enabled: true })
    const emprestado = outra.previewConfirm()
    const aqui = SceneController.create(mundo, 'sessao-123')
    expect(aqui.restore({ ...aqui.draft(), confirmed: emprestado })).toBe(false)
    expect(experimento(aqui).state.evidence.discoveries).toEqual([])
  })

  test('⚠️ rascunho com o segmento em voo fora do prefixo dos pendentes é recusado', () => {
    // O `acknowledge` corta os pendentes pelo TAMANHO do segmento em voo. Se a ordem não bater,
    // confirmar o primeiro envio apagaria o comando errado — o trabalho da criança, em silêncio.
    const c = SceneController.create(mundo, 'sessao-123')
    c.dispatch({ type: 'create' })
    c.segment()
    c.dispatch({ type: 'connect', port: 'draw', enabled: true })
    const adulterado = { ...c.draft(), pending: [...c.draft().pending].reverse() }
    expect(SceneController.create(mundo, 'sessao-123').restore(adulterado)).toBe(false)
  })

  test('⚠️ rascunho de OUTRA sessão não ressuscita como estado válido', () => {
    const outro = SceneController.create(mundo, 'sessao-999')
    outro.dispatch({ type: 'create' })
    const aqui = SceneController.create(mundo, 'sessao-123')
    expect(aqui.restore(outro.draft())).toBe(false)
    expect(experimento(aqui).state.evidence.actions).toBe(0)
  })
})

describe('o rascunho da demonstração', () => {
  const assistir: DemonstrationActivity = { type: 'demonstration', scene: 'world' }

  test('o mesmo controlador atende os dois tipos, cada um com os comandos DELE', () => {
    const controller = SceneController.create(assistir, 'sessao-123')
    controller.dispatch({ type: 'start' })
    controller.dispatch({ type: 'tick', seconds: 0.5 })
    const guardado = controller.previewConfirm()
    const recarregado = SceneController.create(assistir, 'sessao-123', guardado)
    const sessao = recarregado.getSnapshot() as DemonstrationSession
    expect(sessao.step).toBe(0)
    expect(SCENE_MODELS.world.script.length).toBeGreaterThan(0)
    // Ação de cena não é comando de quem assiste: um rascunho com ela é recusado inteiro.
    expect(recarregado.restore({ ...controller.draft(), pending: [{ type: 'create' }] })).toBe(
      false,
    )
  })
})
