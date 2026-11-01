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
/** Os desenhos dos exemplos, criados no início (o encontro só conta com o que existe). */
const DESENHOS = ['heroi', 'chave', 'porta', 'moeda'].map((varName) => ({
  type: 'g2d:createImageSprite',
  varName,
  image: varName,
  x: 0,
  y: 0,
  w: 32,
  h: 32,
}))
function projeto(
  events: unknown[],
  start: unknown[] = [{ type: 'var', name: 'pegou', value: bool(false) }],
  loops: unknown[] = [],
) {
  return { ir: { version: 2, behavior: { start: [...DESENHOS, ...start], events, loops } } }
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

  describe('as quatro brechas fechadas (lacunas, 01/11/2026)', () => {
    test('encontro com um desenho que nunca é criado, ou criado em código morto, não conta', () => {
      const fantasma = projeto([encontro('ninguem', [assign('pegou', bool(true))])])
      expect(confere('encounter', fantasma)).toBe(false)
      expect(confere('memory', fantasma)).toBe(false)
      const morto = projeto(
        [encontro('ninguem', [assign('pegou', bool(true))])],
        [
          { type: 'var', name: 'pegou', value: bool(false) },
          se(bool(false), [{ ...DESENHOS[1], varName: 'ninguem' }]),
        ],
      )
      expect(confere('encounter', morto)).toBe(false)
      // Grupo: criado e com alguém dentro conta; criado vazio, não.
      const grupo = (comAlguem: boolean) =>
        projeto(
          [
            {
              type: 'g2d:onTouchGroup',
              spriteVar: 'heroi',
              groupVar: 'moedas',
              itemName: 'm',
              body: [assign('pegou', bool(true))],
            },
          ],
          [
            { type: 'var', name: 'pegou', value: bool(false) },
            { type: 'g2d:createGroup', varName: 'moedas' },
            ...(comAlguem
              ? [{ type: 'g2d:addToGroup', spriteVar: 'moeda', groupVar: 'moedas' }]
              : []),
          ],
        )
      expect(confere('encounter', grupo(true))).toBe(true)
      expect(confere('encounter', grupo(false))).toBe(false)
    })

    test('contagem de passo literal só decide se algum valor alcançado vira a condição', () => {
      const conta = (op: string, limite: number, passo = 1) =>
        projeto(
          [
            encontro('moeda', [
              assign('pontos', { type: 'binop', op: '+', left: v('pontos'), right: num(passo) }),
            ]),
          ],
          [{ type: 'var', name: 'pontos', value: num(0) }],
          [
            {
              type: 'g2d:updateEachFrame',
              body: [se({ type: 'binop', op, left: v('pontos'), right: num(limite) }, [desenhar])],
            },
          ],
        )
      expect(confere('decision', conta('<', 0))).toBe(false)
      expect(confere('decision', conta('==', -3))).toBe(false)
      expect(confere('decision', conta('==', 5, 2))).toBe(false)
      expect(confere('decision', conta('>=', 3))).toBe(true)
      expect(confere('decision', conta('==', 6, 2))).toBe(true)
    })

    test('um texto com o nome não solta a constante', () => {
      const p = projeto(
        [
          encontro('chave', [se(v('podeAgir'), [assign('pegou', bool(true))])]),
          {
            type: 'g2d:onKey',
            key: 'Space',
            body: [{ type: 'g2d:drawLabel', ctxVar: 'ctx', text: 'podeAgir', x: 0, y: 0 }],
          },
        ],
        [
          { type: 'var', name: 'pegou', value: bool(false) },
          { type: 'var', name: 'podeAgir', value: bool(false) },
        ],
      )
      expect(confere('memory', p)).toBe(false)
    })

    test('x = x não é efeito', () => {
      const p = projeto([
        encontro('chave', [assign('pegou', v('pegou'))]),
        encontro('porta', [se(v('outra'), [assign('outra', v('outra'))])]),
      ])
      expect(confere('encounter', p)).toBe(false)
    })
  })

  describe('variável que nunca muda é constante (N3)', () => {
    const PASSOS = ['encounter', 'memory', 'decision', 'restart', 'removal'] as const
    const var0 = (name: string, value: unknown) => ({ type: 'var', name, value })
    const travado = (cond: unknown, extraStart: unknown[] = []) =>
      projeto(
        [
          encontro('chave', [
            se(cond, [
              assign('pegou', bool(true)),
              { type: 'g2d:destroySprite', spriteVar: 'chave' },
            ]),
          ]),
          encontro('porta', [se(cond, [se(v('pegou'), [desenhar])])]),
          { type: 'g2d:onKey', key: 'Enter', body: [se(cond, [{ type: 'g2d:restart' }])] },
        ],
        [var0('pegou', bool(false)), ...extraStart],
      )
    const todos = (p: unknown) => PASSOS.map((step) => confere(step, p))

    test('Se podeAgir, com podeAgir sempre falso, reprova os cinco', () => {
      expect(todos(travado(v('podeAgir'), [var0('podeAgir', bool(false))]))).toEqual([
        false,
        false,
        false,
        false,
        false,
      ])
    })

    test('as outras formas da mesma condição impossível também reprovam', () => {
      const formas = [
        { type: 'binop', op: '==', left: v('podeAgir'), right: bool(true) },
        { type: 'logicalNot', value: v('ligado') },
        { type: 'ternary', condition: v('podeAgir'), whenTrue: bool(true), whenFalse: bool(false) },
        { type: 'binop', op: '>', left: v('limite'), right: num(10) },
      ]
      for (const cond of formas)
        expect(
          todos(
            travado(cond, [
              var0('podeAgir', bool(false)),
              var0('ligado', bool(true)),
              var0('limite', num(5)),
            ]),
          ),
          JSON.stringify(cond),
        ).toEqual([false, false, false, false, false])
    })

    test('atribuição em código morto, no ciclo dela mesma ou com o mesmo valor não solta a variável', () => {
      const morto = {
        type: 'g2d:onKey',
        key: 'a',
        body: [se(bool(false), [assign('podeAgir', bool(true))])],
      }
      const ciclo = {
        type: 'g2d:onKey',
        key: 'b',
        body: [se(v('podeAgir'), [assign('podeAgir', bool(true))])],
      }
      const igual = { type: 'g2d:onKey', key: 'c', body: [assign('podeAgir', bool(false))] }
      for (const extra of [morto, ciclo, igual]) {
        const p = travado(v('podeAgir'), [var0('podeAgir', bool(false))]) as {
          ir: { behavior: { events: unknown[] } }
        }
        p.ir.behavior.events.push(extra)
        expect(todos(p)).toEqual([false, false, false, false, false])
      }
    })

    test('apelido de uma constante, laço com vezes 0 e enquanto podeAgir também ficam mortos', () => {
      expect(
        todos(travado(v('b'), [var0('podeAgir', bool(false)), var0('b', v('podeAgir'))])),
      ).toEqual([false, false, false, false, false])
      const zero = projeto(
        [
          encontro('chave', [
            { type: 'repeat', times: v('vezes'), body: [assign('pegou', bool(true))] },
          ]),
        ],
        [var0('pegou', bool(false)), var0('vezes', num(0))],
      )
      expect(confere('memory', zero)).toBe(false)
      const enquanto = projeto(
        [
          encontro('chave', [
            { type: 'while', cond: v('podeAgir'), body: [assign('pegou', bool(true))] },
          ]),
        ],
        [var0('pegou', bool(false)), var0('podeAgir', bool(false))],
      )
      expect(confere('memory', enquanto)).toBe(false)
    })

    test('controles: a variável que muda numa tecla, o sorteio e o nome escondido continuam valendo', () => {
      const liga = travado(v('podeAgir'), [var0('podeAgir', bool(false))]) as {
        ir: { behavior: { events: unknown[] } }
      }
      liga.ir.behavior.events.push({
        type: 'g2d:onKey',
        key: 'Space',
        body: [assign('podeAgir', bool(true))],
      })
      expect(todos(liga)).toEqual([true, true, true, true, true])
      const sorteio = travado(v('podeAgir'), [
        var0('podeAgir', { type: 'g2d:randomBetween', min: num(0), max: num(1) }),
      ])
      expect(todos(sorteio)).toEqual([true, true, true, true, true])
      // Um laço que dá o mesmo nome a outra coisa: fora da conta (pode ser verdadeiro lá dentro).
      const escondido = travado(v('podeAgir'), [var0('podeAgir', bool(false))]) as {
        ir: { behavior: { events: unknown[] } }
      }
      escondido.ir.behavior.events.push({ type: 'forOf', itemName: 'podeAgir', body: [] })
      expect(todos(escondido)).toEqual([true, true, true, true, true])
    })
  })
})

describe('combinação de três postos (lacunas, 01/11/2026)', () => {
  const grupo = { type: 'g2d:createGroup', varName: 'pedras' }
  const relogio = (body: unknown[]) => ({
    type: 'g2d:everySeconds',
    seconds: num(2),
    body,
  })
  const criar = {
    type: 'g2d:spawnObstacle',
    groupVar: 'pedras',
    ctxVar: 'ctx',
    shape: 'pedra',
    x: num(700),
    size: num(30),
    vx: num(-4),
  }
  const bater = (body: unknown[]) => ({
    type: 'g2d:onSpriteGroupOverlap',
    spriteVar: 'heroi',
    groupVar: 'pedras',
    itemName: 'pedra',
    body,
  })
  const gravidade = { type: 'g2d:applyGravity', spriteVar: 'heroi' }
  const dino = { type: 'g2d:controlDino', spriteVar: 'heroi', ctxVar: 'ctx', jump: num(12) }
  const fim = { type: 'g2d:setScene', name: 'fim' }
  const combinado = (extra: { start?: unknown[]; events?: unknown[]; loops?: unknown[] } = {}) =>
    projeto(
      [
        encontro('chave', [assign('pegou', bool(true))]),
        encontro('porta', [se(v('pegou'), [desenhar])]),
        bater([fim]),
        ...(extra.events ?? []),
      ],
      [{ type: 'var', name: 'pegou', value: bool(false) }, grupo, ...(extra.start ?? [])],
      [
        { type: 'g2d:updateEachFrame', body: [relogio([criar]), gravidade, dino] },
        ...(extra.loops ?? []),
      ],
    )

  test('decisão do Faísca, grupo com relógio do Construtor e pulo do Inventor: combina', () => {
    expect(confere('combination', combinado())).toBe(true)
  })

  test('dois postos não bastam', () => {
    const semPulo = combinado()
    const loop = semPulo.ir.behavior.loops[0] as { body: unknown[] }
    loop.body = [relogio([criar])]
    expect(confere('combination', semPulo)).toBe(false)
    const semRelogio = combinado()
    ;(semRelogio.ir.behavior.loops[0] as { body: unknown[] }).body = [criar, gravidade, dino]
    expect(confere('combination', semRelogio)).toBe(false)
  })

  test('mecânica em código que não roda não conta', () => {
    const morto = combinado()
    ;(morto.ir.behavior.loops[0] as { body: unknown[] }).body = [
      relogio([criar]),
      gravidade,
      se(bool(false), [dino]),
    ]
    expect(confere('combination', morto)).toBe(false)
    const relogioMorto = combinado()
    ;(relogioMorto.ir.behavior.loops[0] as { body: unknown[] }).body = [
      relogio([se(bool(false), [criar])]),
      gravidade,
      dino,
    ]
    expect(confere('combination', relogioMorto)).toBe(false)
  })

  test('o encontro com o grupo precisa fazer alguma coisa, e o grupo precisa existir', () => {
    const vazio = combinado()
    ;(vazio.ir.behavior.events as { type: string; body: unknown[] }[]).find(
      (e) => e.type === 'g2d:onSpriteGroupOverlap',
    )!.body = []
    expect(confere('combination', vazio)).toBe(false)
    const semGrupo = combinado()
    semGrupo.ir.behavior.start = semGrupo.ir.behavior.start.filter((s) => s !== grupo)
    expect(confere('combination', semGrupo)).toBe(false)
  })

  test('gravidade sozinha ou pulo sozinho não são o Inventor; gravidade e pulo no chão, sim', () => {
    const soPulo = combinado()
    ;(soPulo.ir.behavior.loops[0] as { body: unknown[] }).body = [relogio([criar]), dino]
    expect(confere('combination', soPulo)).toBe(false)
    const soValor = combinado()
    ;(soValor.ir.behavior.loops[0] as { body: unknown[] }).body = [
      relogio([criar]),
      { type: 'g2d:setGravity', value: num(0.8) },
      dino,
    ]
    expect(confere('combination', soValor)).toBe(false)
    const noChao = { type: 'g2d:jumpOnGround', spriteVar: 'heroi', ctxVar: 'ctx', jump: num(10) }
    const so = combinado()
    ;(so.ir.behavior.loops[0] as { body: unknown[] }).body = [relogio([criar]), gravidade]
    expect(confere('combination', so)).toBe(false)
    const ambos = combinado()
    ;(ambos.ir.behavior.loops[0] as { body: unknown[] }).body = [
      relogio([criar]),
      gravidade,
      noChao,
    ]
    expect(confere('combination', ambos)).toBe(true)
  })

  test('é um passo válido da regra', () => {
    expect(
      isGameCausalityRule({ type: 'gameCausality', actor: 'heroi', step: 'combination' }),
    ).toBe(true)
  })
})
