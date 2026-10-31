import { describe, expect, test } from 'bun:test'
import {
  evaluatesGameCausality,
  type GameCausalityStep,
  isGameCausalityRule,
} from './game-causality'
import { isSectionCompletion } from './section-progression'

const v = (name: string) => ({ type: 'var', name })
const bool = (value: boolean) => ({ type: 'bool', value })
const num = (value: number) => ({ type: 'num', value })
const assign = (name: string, value: unknown) => ({ type: 'assign', name, value })
const se = (cond: unknown, then: unknown[], otherwise: unknown[] = []) => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const encontro = (b: string, body: unknown[]) => ({
  type: 'g2d:onOverlap',
  aVar: 'heroi',
  bVar: b,
  body,
})
const desenhar = { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'porta' }
function projeto(
  events: unknown[],
  start: unknown[] = [{ type: 'var', name: 'pegou', value: bool(false) }],
  loops: unknown[] = [],
) {
  return { ir: { version: 2, behavior: { start, events, loops } } }
}
const confere = (step: GameCausalityStep, p: unknown) =>
  evaluatesGameCausality({ type: 'gameCausality', actor: 'heroi', step }, p)

const exemplo = projeto([
  encontro('chave', [
    assign('pegou', bool(true)),
    { type: 'g2d:destroySprite', spriteVar: 'chave' },
  ]),
  encontro('porta', [se(v('pegou'), [desenhar])]),
  { type: 'g2d:onKey', key: 'Enter', body: [{ type: 'g2d:restart' }] },
])

describe('gameCausality', () => {
  test('o exemplo cumpre os cinco passos', () => {
    for (const step of ['encounter', 'memory', 'decision', 'restart', 'removal'] as const)
      expect(confere(step, exemplo), step).toBe(true)
  })

  test('encontro de OUTRO personagem não conta', () => {
    const p = projeto([{ ...encontro('chave', [assign('pegou', bool(true))]), aVar: 'outro' }])
    expect(confere('encounter', p)).toBe(false)
    expect(confere('memory', p)).toBe(false)
  })

  test('bloco desativado e laço que nunca repete não rodam', () => {
    const desativado = projeto([
      { ...encontro('chave', [assign('pegou', bool(true))]), disabled: true },
    ])
    expect(confere('encounter', desativado)).toBe(false)
    const zero = projeto([
      encontro('chave', [{ type: 'repeat', times: num(0), body: [assign('pegou', bool(true))] }]),
    ])
    expect(confere('memory', zero)).toBe(false)
  })

  test('ramo sempre verdadeiro mata o senão, e "ou verdadeiro" é sempre verdadeiro', () => {
    const p = projeto([
      encontro('chave', [
        se(
          { type: 'logical', op: '||', left: v('x'), right: bool(true) },
          [],
          [assign('pegou', bool(true))],
        ),
      ]),
    ])
    expect(confere('memory', p)).toBe(false)
  })

  test('guardar o mesmo valor do início não é lembrar', () => {
    const p = projeto([encontro('chave', [assign('pegou', bool(false))])])
    expect(confere('encounter', p)).toBe(true)
    expect(confere('memory', p)).toBe(false)
  })

  test('contar também é lembrar, e um limite que a conta não fecha basta ter um ramo que age', () => {
    const p = projeto(
      [
        encontro('moeda', [
          assign('pontos', { type: 'binop', op: '+', left: v('pontos'), right: num(1) }),
        ]),
      ],
      [{ type: 'var', name: 'pontos', value: num(0) }],
      [
        {
          type: 'g2d:updateEachFrame',
          body: [se({ type: 'binop', op: '>=', left: v('pontos'), right: num(3) }, [desenhar])],
        },
      ],
    )
    expect(confere('memory', p)).toBe(true)
    expect(confere('decision', p)).toBe(true)
  })

  test('decisão que não lê a lembrança, ou que só age antes dela, não conta', () => {
    const naoLe = projeto([
      encontro('chave', [assign('pegou', bool(true))]),
      encontro('porta', [se(v('outra'), [desenhar])]),
    ])
    expect(confere('decision', naoLe)).toBe(false)
    const aoContrario = projeto([
      encontro('chave', [assign('pegou', bool(true))]),
      encontro('porta', [se({ type: 'logicalNot', value: v('pegou') }, [desenhar])]),
    ])
    expect(confere('decision', aoContrario)).toBe(false)
  })

  test('senão se: a decisão pode morar no ramo de baixo', () => {
    const p = projeto([
      encontro('chave', [assign('pegou', bool(true))]),
      encontro('porta', [
        {
          ...se(v('outra'), []),
          // biome-ignore lint/suspicious/noThenProperty: campo da árvore de instruções SZIR.
          elseif: [{ cond: v('pegou'), then: [desenhar] }],
        },
      ]),
    ])
    expect(confere('decision', p)).toBe(true)
  })

  test('valor inicial sorteado ainda conta como lembrança', () => {
    const p = projeto(
      [
        encontro('chave', [assign('sorte', num(7))]),
        encontro('porta', [se(v('sorte'), [desenhar])]),
      ],
      [{ type: 'var', name: 'sorte', value: { type: 'g2d:randomBetween', min: 1, max: 9 } }],
    )
    expect(confere('memory', p)).toBe(true)
    expect(confere('decision', p)).toBe(true)
  })

  test('contagem atrás de uma condição constante não decide', () => {
    const p = projeto(
      [
        encontro('moeda', [
          assign('pontos', { type: 'binop', op: '+', left: v('pontos'), right: num(1) }),
        ]),
      ],
      [{ type: 'var', name: 'pontos', value: num(0) }],
      [
        {
          type: 'g2d:updateEachFrame',
          body: [
            se(
              {
                type: 'logical',
                op: '&&',
                left: { type: 'binop', op: '>=', left: v('pontos'), right: num(3) },
                right: bool(false),
              },
              [desenhar],
            ),
          ],
        },
      ],
    )
    expect(confere('decision', p)).toBe(false)
  })

  test('recomeço só dentro de uma tecla', () => {
    const solto = projeto([encontro('chave', [{ type: 'g2d:restart' }])])
    expect(confere('restart', solto)).toBe(false)
  })

  test('a régua da autoria aceita o formato e recusa o resto', () => {
    expect(isGameCausalityRule({ type: 'gameCausality', actor: 'guia', step: 'memory' })).toBe(true)
    expect(isGameCausalityRule({ type: 'gameCausality', actor: 'guia', step: 'voar' })).toBe(false)
    expect(isGameCausalityRule({ type: 'gameCausality', actor: '1x', step: 'memory' })).toBe(false)
    const completion = (rule: unknown) => ({
      version: 1,
      blockIds: [],
      projectChecks: [{ id: 'a', label: 'Encontro', rule }],
    })
    expect(
      isSectionCompletion(completion({ type: 'gameCausality', actor: 'guia', step: 'decision' })),
    ).toBe(true)
    expect(isSectionCompletion(completion({ type: 'gameCausality', actor: 'guia' }))).toBe(false)
  })
})
