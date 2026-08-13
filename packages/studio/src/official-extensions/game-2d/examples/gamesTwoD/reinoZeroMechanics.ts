import type { JSExpr, JSStatement } from '#ir'

const n = (value: number): JSExpr => ({ type: 'num', value })
const variable = (name: string): JSExpr => ({ type: 'var', name })
const binary = (
  op: Extract<JSExpr, { type: 'binop' }>['op'],
  left: JSExpr,
  right: JSExpr,
): JSExpr => ({ type: 'binop', op, left, right })
const equals = (left: JSExpr, right: number): JSExpr => binary('==', left, n(right))

/** Uma única regra para toda moeda: pontua e troca cada centena por uma vida. */
export function reinoZeroCollectCoin(points: number): JSStatement[] {
  return [
    { type: 'assign', name: 'moedas', value: binary('+', variable('moedas'), n(1)) },
    { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(points)) },
    { type: 'g2d:playFx', fx: 'coin' },
    {
      type: 'if',
      cond: binary('>=', variable('moedas'), n(100)),
      then: [
        { type: 'assign', name: 'moedas', value: binary('-', variable('moedas'), n(100)) },
        {
          type: 'if',
          cond: equals(variable('jogador'), 1),
          then: [{ type: 'assign', name: 'vidas1', value: binary('+', variable('vidas1'), n(1)) }],
          else: [{ type: 'assign', name: 'vidas2', value: binary('+', variable('vidas2'), n(1)) }],
        },
        { type: 'g2d:playFx', fx: 'win' },
      ],
    },
  ]
}

/** Move um poder pelo mundo; a colisão inverte paredes e a estrela também quica. */
export function reinoZeroMovePowerup(
  spriteVar: string,
  directionVar: string,
  speed: number,
  bounce: number,
): JSStatement {
  // Nós independentes mantêm cada ocorrência simples de transformar e inspecionar,
  // embora a guarda do catálogo aceite referências compartilhadas serializáveis.
  const vx = (): JSExpr => ({ type: 'g2d:spriteVx', spriteVar })
  const vy = (): JSExpr => ({ type: 'g2d:spriteVy', spriteVar })
  return {
    type: 'if',
    cond: binary('>', { type: 'g2d:spriteX', spriteVar }, n(-50)),
    then: [
      {
        type: 'if',
        cond: equals(vx(), 0),
        then: [
          {
            type: 'g2d:setVelocity',
            spriteVar,
            vx: binary('*', variable(directionVar), n(speed)),
            vy: vy(),
          },
        ],
      },
      { type: 'g2d:applyGravity', spriteVar },
      { type: 'g2d:applyVelocity', spriteVar },
      { type: 'g2d:collideWorld', spriteVar, worldVar: 'areaAtual' },
      {
        type: 'if',
        cond: equals(vx(), 0),
        then: [
          {
            type: 'assign',
            name: directionVar,
            value: binary('*', variable(directionVar), n(-1)),
          },
        ],
      },
      ...(bounce > 0
        ? [
            {
              type: 'if' as const,
              cond: equals(vy(), 0),
              then: [
                {
                  type: 'g2d:setVelocity' as const,
                  spriteVar,
                  vx: vx(),
                  vy: n(-bounce),
                },
              ],
            },
          ]
        : []),
    ],
  }
}
