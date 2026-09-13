import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { draftCommand } from '../../src/interfaces/http/lesson-draft.dtos'

/**
 * ⚠️⚠️ A aula que travou de verdade (13/09/2026).
 *
 * A aula 1 do Corre Dino tinha blocos interativos gravados no modelo ANTERIOR. Quando a reescrita
 * tirou os seis tipos antigos do contrato, esses blocos deixaram de poder ser SALVOS — e como
 * "Importar roteiro com seções" chama `beforeImport`, que salva o bloco aberto ANTES de falar com
 * o servidor, a importação morria antes de começar. Pela tela não havia saída: o editor desabilita
 * o botão quando o bloco interativo é inválido.
 *
 * A mensagem era "O bloco precisa manter os campos do seu tipo" — sem dizer qual bloco nem qual
 * campo. Foram duas coisas a consertar: migrar, e falar.
 */
const bloco = (activity: unknown, extra: Record<string, unknown> = {}) => ({
  expectedRevision: randomUUID(),
  operationId: randomUUID(),
  change: {
    type: 'block' as const,
    block: {
      id: randomUUID(),
      content: {
        kind: 'interactive',
        title: 'Faça o Dino aparecer',
        instructions: 'Crie o Dino e ligue o desenho.',
        hints: [],
        required: true,
        activity,
        ...extra,
      },
    },
  },
})

describe('o rascunho e os blocos do modelo anterior', () => {
  test('⚠️ exploração v3 volta a SALVAR, já convertida na cena de mesmo nome', () => {
    const saida = draftCommand(
      bloco({ type: 'exploration', version: 3, mission: 'world', mode: 'explore' }) as never,
    )
    if (saida.change.type !== 'block') throw new Error('mudança errada')
    expect(saida.change.block.content.activity).toEqual({ type: 'experimentation', scene: 'world' })
  })

  test('o modo demo vira demonstração, não experimentação', () => {
    const saida = draftCommand(
      bloco({ type: 'exploration', version: 3, mission: 'gravity', mode: 'demo' }) as never,
    )
    if (saida.change.type !== 'block') throw new Error('mudança errada')
    expect(saida.change.block.content.activity).toEqual({
      type: 'demonstration',
      scene: 'gravity',
    })
  })

  test('sequência vira pergunta e PRESERVA o gabarito que já existia', () => {
    const checkpoint = {
      prompt: 'O que vem primeiro?',
      choices: [
        { id: 'a', label: 'Preparar' },
        { id: 'b', label: 'Desenhar' },
      ],
      correctChoiceId: 'a',
      explanation: 'Preparar vem antes.',
    }
    const saida = draftCommand(
      bloco({ type: 'sequence', steps: ['a', 'b'] }, { checkpoint }) as never,
    )
    if (saida.change.type !== 'block') throw new Error('mudança errada')
    expect(saida.change.block.content.activity).toEqual({ type: 'question' })
    expect(saida.change.block.content.checkpoint).toEqual(checkpoint)
  })

  test('bloco do modelo de agora passa intocado', () => {
    const entrada = bloco({ type: 'experimentation', scene: 'spawn' })
    const saida = draftCommand(entrada as never)
    if (saida.change.type !== 'block') throw new Error('mudança errada')
    expect(saida.change.block.content.activity).toEqual({ type: 'experimentation', scene: 'spawn' })
  })

  test('⚠️ o que a migração não alcança é RECUSADO nomeando o bloco e o campo', () => {
    // Sem isto, a professora lê "o bloco precisa manter os campos do seu tipo" e não tem como
    // saber de qual bloco a frase fala — foi o que fez esta investigação custar uma hora.
    let erro: unknown
    try {
      draftCommand(bloco({ type: 'experimentation', scene: 'cena-que-nao-existe' }) as never)
    } catch (e) {
      erro = e
    }
    expect(erro).toBeInstanceOf(ValidationError)
    expect((erro as Error).message).toContain('interactive')
    expect((erro as Error).message).toContain('activity')
  })
})
