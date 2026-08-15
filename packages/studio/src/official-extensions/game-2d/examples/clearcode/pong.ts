import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo bundlado: "Pong" (degrau BÁSICO da trilogia Pong do Clear Code; refaz
 * o antigo "Pong simples"). Gerado por __gen_pong.ts; drift test: pongExample.test.ts.
 */
export const pongExample: ExtensionExample = beginnerGameExample({
  name: 'Pong',
  experience: 'game',
  description:
    'Dispute Pong contra o computador: mova a raquete azul com as setas para cima e para baixo, rebata a bola e faça 5 pontos antes dele. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 440, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      { selector: 'canvas', declarations: { border: '2px solid #22d3ee', background: '#11172a' } },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: {
            type: 'num',
            value: 20,
          },
          y: {
            type: 'num',
            value: 128,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#22d3ee',
        },
        {
          type: 'g2d:createSprite',
          varName: 'computador',
          x: {
            type: 'num',
            value: 408,
          },
          y: {
            type: 'num',
            value: 128,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#f472b6',
        },
        {
          type: 'g2d:createSprite',
          varName: 'bola',
          x: {
            type: 'num',
            value: 214,
          },
          y: {
            type: 'num',
            value: 144,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 12,
          },
          color: '#fbbf24',
        },
        {
          type: 'g2d:setVelocity',
          spriteVar: 'bola',
          vx: {
            type: 'num',
            value: 3,
          },
          vy: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'var',
          name: 'pontos',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'pontosComputador',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:setScene',
          name: 'inicio',
        },
      ],
      events: [
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'inicio',
              },
              then: [
                {
                  type: 'g2d:setScene',
                  name: 'jogando',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'vitoria',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'derrota',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            {
              type: 'g2d:clear',
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'inicio',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Pong',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Mova a raquete azul com as setas para cima e para baixo. O primeiro a 5 pontos vence!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#11172a',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'jogando',
              },
              then: [
                {
                  type: 'g2d:arrowsY',
                  spriteVar: 'jogador',
                  speed: {
                    type: 'num',
                    value: 5,
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'y',
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'computador',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'num',
                        value: 26,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'computador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'computador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 3.4,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'y',
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'computador',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'num',
                        value: 18,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'computador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'computador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 3.4,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'computador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'bola',
                },
                {
                  type: 'g2d:bounceOnEdgePair',
                  spriteVar: 'bola',
                  ctxVar: 'ctx',
                  edges: 'top-bottom',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:touches',
                    aVar: 'jogador',
                    bVar: 'bola',
                  },
                  then: [
                    {
                      type: 'g2d:paddleBounce',
                      ballVar: 'bola',
                      paddleVar: 'jogador',
                      boost: {
                        type: 'num',
                        value: 8,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:touches',
                    aVar: 'computador',
                    bVar: 'bola',
                  },
                  then: [
                    {
                      type: 'g2d:paddleBounce',
                      ballVar: 'bola',
                      paddleVar: 'computador',
                      boost: {
                        type: 'num',
                        value: 8,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'x',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosComputador',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pontosComputador',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'bola',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '/',
                          left: {
                            type: 'g2d:stageWidth',
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        right: {
                          type: 'num',
                          value: 6,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '/',
                          left: {
                            type: 'g2d:stageHeight',
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        right: {
                          type: 'num',
                          value: 6,
                        },
                      },
                    },
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'num',
                        value: 3,
                      },
                      vy: {
                        type: 'g2d:randomBetween',
                        min: {
                          type: 'num',
                          value: -2,
                        },
                        max: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'gameover',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'x',
                    },
                    right: {
                      type: 'g2d:stageWidth',
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontos',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pontos',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'bola',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '/',
                          left: {
                            type: 'g2d:stageWidth',
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        right: {
                          type: 'num',
                          value: 6,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '/',
                          left: {
                            type: 'g2d:stageHeight',
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        right: {
                          type: 'num',
                          value: 6,
                        },
                      },
                    },
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'num',
                        value: -3,
                      },
                      vy: {
                        type: 'g2d:randomBetween',
                        min: {
                          type: 'num',
                          value: -2,
                        },
                        max: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'jump',
                    },
                  ],
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'computador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'bola',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Você:',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#22d3ee',
                  size: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'PC:',
                  value: {
                    type: 'var',
                    name: 'pontosComputador',
                  },
                  x: {
                    type: 'num',
                    value: 330,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#f472b6',
                  size: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'pontos',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setScene',
                      name: 'vitoria',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'pontosComputador',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setScene',
                      name: 'derrota',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'vitoria',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Você venceu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Você fez 5 pontos antes do computador. Mandou bem!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#14532d',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'derrota',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'O computador venceu',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ele chegou a 5 pontos primeiro. Tente rebater com a beirada da raquete!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
      ],
    },
  },
})
