import { describe, expect, test } from 'bun:test'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { isLearningAnswers, MAX_LEARNING_STATE_BYTES } from '../index'
import { SCENE_IDS, type SceneAction, type SceneId } from './actions'
import { evaluateExperimentation } from './evaluate'
import {
  applyExperimentSegment,
  type ExperimentSession,
  initialExperiment,
  isExperimentCommand,
  packExperiment,
  readExperimentSession,
  type SceneCheckpoint,
  SESSION_LIMITS,
  stepExperiment,
} from './session'
import { sceneStart } from './start'
import type { SceneStart } from './state'

/**
 * ⚠️⚠️ O retrato da experiência cabe no teto do servidor (bug de 10/10/2026).
 *
 * Na aula 2 do Cadê Todo Mundo, a experiência de Achados (`found-counter`) nunca concluía: no quarto
 * gesto ("Recomeçar a busca") a gravação passava de `MAX_LEARNING_STATE_BYTES`, o servidor voltava
 * 400 e a criança via "Esta experiência mudou.". O estado de todas as cenas tem a mesma forma e ia
 * gravado inteiro, com os quatro retratos do Desfazer: 32.176 bytes para um teto de 32.000. Toda
 * cena abria a 1,2 KB do teto. Agora só os grupos fora do padrão vão gravados (`semGruposNoPadrao`).
 */

const bytes = (valor: unknown) => new TextEncoder().encode(JSON.stringify(valor)).byteLength

/** As respostas como o servidor as grava depois de aplicar o segmento. */
function respostas(scene: SceneId, checkpoint: SceneCheckpoint<ExperimentSession>) {
  return {
    sceneSequence: checkpoint.sequence,
    sceneSessionId: checkpoint.sessionId,
    sceneSegmentId: checkpoint.segmentId,
    sceneCheckpoint: packExperiment(scene, checkpoint.session),
  }
}

/** Cada gesto num segmento próprio, como a criança que espera o "Salvo" entre um e outro. */
function gravarUmPorUm(start: SceneStart, comandos: readonly SceneAction[]) {
  const sessionId = crypto.randomUUID()
  let checkpoint: SceneCheckpoint<ExperimentSession> | null = null
  const pesos: number[] = []
  for (const comando of comandos) {
    checkpoint = applyExperimentSegment(start, checkpoint, {
      sessionId,
      segmentId: crypto.randomUUID(),
      baseSequence: checkpoint?.sequence ?? 0,
      commands: [comando],
    })
    const gravado = respostas(start.scene, checkpoint)
    expect(isLearningAnswers(gravado)).toBe(true)
    pesos.push(bytes(gravado))
  }
  return { checkpoint, pesos }
}

/** O caminho do fixture só com o que a experimentação aceita (como no `hidratacao.test.ts`). */
const caminho = (start: SceneStart) =>
  scenePaths[start.scene].filter((acao) => isExperimentCommand(acao, start))

/**
 * O formato anterior a este conserto: todos os grupos, cactos em tuplas, em pedaços de 7.000
 * caracteres. É o que está gravado no banco hoje.
 */
function retratoInteiro(scene: SceneId, session: ExperimentSession): string[] {
  const inteiro = (s: ExperimentSession['state']) => ({
    ...s,
    crowd: { ...s.crowd, cacti: s.crowd.cacti.map((c) => [c.id, c.x, c.velocity]) },
  })
  const json = JSON.stringify({
    scene,
    state: inteiro(session.state),
    past: session.past.map(inteiro),
    trials: session.trials,
  })
  return json.match(/[\s\S]{1,7000}/g) ?? []
}

/** O mesmo estado, sem depender da ordem das chaves que a leitura devolve. */
const comoJson = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as unknown

describe('o retrato da experiência cabe no teto do servidor', () => {
  test('Cadê Todo Mundo, aula 2: as quatro descobertas de Achados gravam e concluem', () => {
    const start = sceneStart({ type: 'experimentation', scene: 'found-counter', cenario: 'jardim' })
    const { checkpoint, pesos } = gravarUmPorUm(start, [
      { type: 'find-character', id: 0 },
      { type: 'find-character', id: 1 },
      { type: 'look-around' },
      { type: 'restart-search' },
    ])
    expect(checkpoint?.session.past).toHaveLength(SESSION_LIMITS.past)
    const fim = checkpoint?.session.state
    expect(fim && evaluateExperimentation(start.scene, fim).passed).toBe(true)
    // ⚠️ Com folga: o quarto gesto pesava 32.176 bytes. A régua de metade do teto pega o dia em
    // que um grupo novo voltar a ser gravado em toda cena.
    expect(Math.max(...pesos)).toBeLessThan(MAX_LEARNING_STATE_BYTES / 2)
  })

  test.each(
    SCENE_IDS.map((scene) => [scene]),
  )('%s: o caminho de descoberta, gesto a gesto, fica abaixo da metade do teto', (scene) => {
    const start = sceneStart({ type: 'experimentation', scene })
    const { checkpoint, pesos } = gravarUmPorUm(start, caminho(start))
    expect(Math.max(...pesos)).toBeLessThan(MAX_LEARNING_STATE_BYTES / 2)
    // O pior caso da cena: o Desfazer cheio com o estado do fim do caminho. ⚠️ Aqui a régua é o teto
    // inteiro: na `score` os cactos do fim do caminho repetidos cinco vezes dão ~15,6 KB, um estado
    // que a criança não alcança (o Desfazer guarda os retratos de ANTES, com menos cactos).
    const fim = checkpoint?.session as ExperimentSession
    const cheio = { ...fim, past: Array.from({ length: SESSION_LIMITS.past }, () => fim.state) }
    const gravado = respostas(scene, {
      ...(checkpoint as SceneCheckpoint<ExperimentSession>),
      session: cheio,
    })
    expect(bytes(gravado)).toBeLessThan(MAX_LEARNING_STATE_BYTES)
  })

  test.each(
    SCENE_IDS.map((scene) => [scene]),
  )('%s: o retrato enxuto é lido igual ao inteiro, gesto a gesto', (scene) => {
    // ⚠️ Compara com a leitura do formato INTEIRO, não com a sessão: o que este conserto muda é só
    // quais grupos vão gravados. (As tuplas dos cactos são anteriores e ficam fora desta régua.)
    const start = sceneStart({ type: 'experimentation', scene })
    let session = initialExperiment(start)
    for (const comando of [undefined, ...caminho(start)]) {
      if (comando) session = stepExperiment(start, session, comando).session
      const enxuto = readExperimentSession(scene, packExperiment(scene, session))
      expect(enxuto).not.toBeNull()
      expect(comoJson(enxuto)).toEqual(
        comoJson(readExperimentSession(scene, retratoInteiro(scene, session))),
      )
    }
  })

  test('o retrato INTEIRO, gravado antes deste conserto, continua sendo lido', () => {
    const start = sceneStart({ type: 'experimentation', scene: 'found-counter', cenario: 'jardim' })
    let session = initialExperiment(start)
    for (const comando of caminho(start).slice(0, 3))
      session = stepExperiment(start, session, comando).session
    const pedacos = retratoInteiro('found-counter', session)
    expect(pedacos.length).toBeGreaterThan(1)
    expect(comoJson(readExperimentSession('found-counter', pedacos))).toEqual(comoJson(session))
  })
})
