import { describe, expect, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  publicInteractiveBlock,
} from './index'
import { sectionCompletionIssues } from './section-progression'

const activity: InteractiveBlock = {
  kind: 'interactive',
  title: 'Procure no jardim',
  instructions: 'Encontre os três personagens.',
  hints: [],
  required: true,
  activity: {
    type: 'project-play',
    project: {
      formatVersion: 2,
      id: 'demo',
      name: 'Jardim',
      mode: 'blocks',
      files: { 'index.html': '', 'style.css': '', 'script.js': 'SZGame2D.setupStage(640,360)' },
      installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
    },
    stage: { width: 640, height: 360 },
    targets: [
      { id: 'arbusto', label: 'arbusto', x: 60, y: 166, width: 154, height: 116 },
      { id: 'pedras', label: 'pedras', x: 229.5, y: 170, width: 161, height: 112 },
      { id: 'flores', label: 'flores', x: 416.5, y: 138, width: 133, height: 144 },
    ],
  },
}

describe('jogo pronto como atividade da aula', () => {
  test('o jogo conclui pela ação de jogar, sem perguntas anexas ignoradas', () => {
    expect(
      isInteractiveBlock({
        ...activity,
        checkpoint: {
          prompt: 'Quem apareceu?',
          choices: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
          correctChoiceId: 'a',
          explanation: 'A apareceu.',
        },
      }),
    ).toBe(false)
  })
  test('aceita o projeto Jogo 2D e recusa alvos duplicados', () => {
    expect(isInteractiveBlock(activity)).toBe(true)
    const duplicate = structuredClone(activity)
    if (duplicate.activity.type !== 'project-play') throw new Error('atividade alterada')
    const first = duplicate.activity.targets[0]
    const second = duplicate.activity.targets[1]
    if (!first || !second) throw new Error('alvos ausentes')
    second.id = first.id
    expect(isInteractiveBlock(duplicate)).toBe(false)
  })

  test('três alvos diferentes concluem; repetidos ou incompletos não', () => {
    expect(
      evaluateLearning(activity, { foundTargets: ['arbusto', 'arbusto', 'flores'] }).passed,
    ).toBe(false)
    expect(evaluateLearning(activity, { foundTargets: ['arbusto', 'pedras'] }).passed).toBe(false)
    expect(
      evaluateLearning(activity, { foundTargets: ['arbusto', 'pedras', 'flores'] }).passed,
    ).toBe(true)
  })

  test('projeta o jogo para a criança e aceita o bloco como critério de seção', () => {
    expect(publicInteractiveBlock(activity).activity).toEqual(activity.activity)
    const section = {
      id: 'abertura',
      title: 'Bem-vindo',
      objective: 'Jogar',
      intent: 'presentation' as const,
      blockIds: ['jogo'],
      workspaceBlockId: null,
      externalTool: null,
      pendingMedia: [],
      completion: { version: 1 as const, blockIds: ['jogo'] },
    }
    expect(sectionCompletionIssues([section], [{ id: 'jogo', content: activity }])).toEqual([])
  })
})
