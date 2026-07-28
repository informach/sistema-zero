import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Pong Profissional" — nível 2 da trilogia Pong do Clear Code
 * recriado com o motor avançado, SEM assets. Diferencial sobre o Pong básico:
 * personagens + física do motor (setVelocity/moveByVelocity), raquete por tecla
 * SEGURADA com dt, ângulo pelo ponto de contato, a bola ACELERA a cada troca
 * (rally), partida até 7 com tremor de câmera e HUD de trocas.
 *
 * ⚠️ IR GERADA pelo parser a partir do fonte em __gen_pongProfissional.ts; o
 * drift test pongProfissionalExample.test.ts manda re-embutir se o parser mudar.
 */
export const pongProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Pong Profissional',
  experience: 'game',
  description:
    'Pong no motor avançado: mova a raquete com as setas, dê ângulo rebatendo com a beirada e veja a bola acelerar a cada troca. Faça 7 pontos antes do computador. Tudo de formas, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 680,
          },
          h: {
            type: 'num',
            value: 420,
          },
          bg: '#0b1020',
          accent: '#22d3ee',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Pong Profissional',
          },
          text: {
            type: 'str',
            value:
              'Suba e desça a raquete com as setas. Rebata com a beirada para dar ângulo, e a bola acelera a cada troca. Faça 7 pontos!',
          },
          button: {
            type: 'str',
            value: 'Jogar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Você venceu!',
          },
          text: {
            type: 'str',
            value: 'Chegou a 7 pontos antes do computador. Que reflexos de campeão!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O computador venceu',
          },
          text: {
            type: 'str',
            value: 'Ele fez 7 pontos primeiro. Use a beirada da raquete para dar ângulos difíceis!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'jogador',
          image: '',
          w: {
            type: 'num',
            value: 14,
          },
          h: {
            type: 'num',
            value: 74,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#22d3ee',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'jogador',
          x: {
            type: 'num',
            value: 30,
          },
          y: {
            type: 'num',
            value: 173,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'computador',
          image: '',
          w: {
            type: 'num',
            value: 14,
          },
          h: {
            type: 'num',
            value: 74,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#f472b6',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'computador',
          x: {
            type: 'num',
            value: 636,
          },
          y: {
            type: 'num',
            value: 173,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'bola',
          image: '',
          w: {
            type: 'num',
            value: 14,
          },
          h: {
            type: 'num',
            value: 14,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#fbbf24',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'bola',
          x: {
            type: 'num',
            value: 333,
          },
          y: {
            type: 'num',
            value: 203,
          },
        },
        {
          type: 'var',
          name: 'bolaVx',
          value: {
            type: 'num',
            value: 320,
          },
        },
        {
          type: 'var',
          name: 'bolaVy',
          value: {
            type: 'num',
            value: 170,
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
          type: 'var',
          name: 'trocas',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:stateIs',
                name: 'jogando',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:keyDown',
                    key: 'arrowup',
                  },
                  then: [
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'jogador',
                      x: {
                        type: 'num',
                        value: 30,
                      },
                      y: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'gk:charY',
                          charVar: 'jogador',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'num',
                            value: 420,
                          },
                          right: {
                            type: 'var',
                            name: 'dt',
                          },
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:keyDown',
                    key: 'arrowdown',
                  },
                  then: [
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'jogador',
                      x: {
                        type: 'num',
                        value: 30,
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charY',
                          charVar: 'jogador',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'num',
                            value: 420,
                          },
                          right: {
                            type: 'var',
                            name: 'dt',
                          },
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'gk:keepOnScreen',
                  charVar: 'jogador',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'gk:charY',
                      charVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'gk:charY',
                        charVar: 'computador',
                      },
                      right: {
                        type: 'num',
                        value: 6,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'computador',
                      x: {
                        type: 'num',
                        value: 636,
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charY',
                          charVar: 'computador',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'num',
                            value: 320,
                          },
                          right: {
                            type: 'var',
                            name: 'dt',
                          },
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
                      type: 'gk:charY',
                      charVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'gk:charY',
                        charVar: 'computador',
                      },
                      right: {
                        type: 'num',
                        value: 6,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'computador',
                      x: {
                        type: 'num',
                        value: 636,
                      },
                      y: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'gk:charY',
                          charVar: 'computador',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'num',
                            value: 320,
                          },
                          right: {
                            type: 'var',
                            name: 'dt',
                          },
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'gk:keepOnScreen',
                  charVar: 'computador',
                },
                {
                  type: 'gk:setVelocity',
                  charVar: 'bola',
                  vx: {
                    type: 'var',
                    name: 'bolaVx',
                  },
                  vy: {
                    type: 'var',
                    name: 'bolaVy',
                  },
                },
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'bola',
                  dtVar: 'dt',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'gk:charY',
                      charVar: 'bola',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'mathUnary',
                        fn: 'abs',
                        arg: {
                          type: 'var',
                          name: 'bolaVy',
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'gk:charY',
                        charVar: 'bola',
                      },
                      right: {
                        type: 'num',
                        value: 14,
                      },
                    },
                    right: {
                      type: 'num',
                      value: 420,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'var',
                            name: 'bolaVy',
                          },
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:charactersTouch',
                      aVar: 'jogador',
                      bVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '<',
                      left: {
                        type: 'var',
                        name: 'bolaVx',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'bolaVx',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'var',
                            name: 'bolaVx',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 24,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'bolaVy',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'binop',
                              op: '-',
                              left: {
                                type: 'gk:charY',
                                charVar: 'bola',
                              },
                              right: {
                                type: 'gk:charY',
                                charVar: 'jogador',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 6,
                          },
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'trocas',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'trocas',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:charactersTouch',
                      aVar: 'computador',
                      bVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'var',
                        name: 'bolaVx',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'bolaVx',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '-',
                          left: {
                            type: 'num',
                            value: 0,
                          },
                          right: {
                            type: 'mathUnary',
                            fn: 'abs',
                            arg: {
                              type: 'var',
                              name: 'bolaVx',
                            },
                          },
                        },
                        right: {
                          type: 'num',
                          value: 24,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'bolaVy',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'binop',
                              op: '-',
                              left: {
                                type: 'gk:charY',
                                charVar: 'bola',
                              },
                              right: {
                                type: 'gk:charY',
                                charVar: 'computador',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 6,
                          },
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'trocas',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'trocas',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'gk:playEffect',
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
                      type: 'gk:charX',
                      charVar: 'bola',
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
                      type: 'gk:cameraShake',
                      intensity: {
                        type: 'num',
                        value: 6,
                      },
                      seconds: {
                        type: 'num',
                        value: 0.3,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'hit',
                    },
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'bola',
                      x: {
                        type: 'num',
                        value: 333,
                      },
                      y: {
                        type: 'num',
                        value: 203,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVx',
                      value: {
                        type: 'num',
                        value: 320,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'num',
                        value: 170,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'trocas',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'gk:charX',
                      charVar: 'bola',
                    },
                    right: {
                      type: 'num',
                      value: 680,
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
                      type: 'gk:cameraShake',
                      intensity: {
                        type: 'num',
                        value: 6,
                      },
                      seconds: {
                        type: 'num',
                        value: 0.3,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'coin',
                    },
                    {
                      type: 'gk:placeCharacter',
                      charVar: 'bola',
                      x: {
                        type: 'num',
                        value: 333,
                      },
                      y: {
                        type: 'num',
                        value: 203,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVx',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'num',
                          value: 320,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'bolaVy',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'num',
                          value: 170,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'trocas',
                      value: {
                        type: 'num',
                        value: 0,
                      },
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
                      name: 'pontos',
                    },
                    right: {
                      type: 'num',
                      value: 7,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setState',
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
                      value: 7,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setState',
                      name: 'fim',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#0b1020',
              grid: false,
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'jogador',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'computador',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'bola',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#22d3ee',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 30,
              family: 'sans-serif',
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Você: ',
                },
                right: {
                  type: 'var',
                  name: 'pontos',
                },
              },
              x: {
                type: 'num',
                value: 30,
              },
              y: {
                type: 'num',
                value: 44,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f472b6',
              },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'PC: ',
                },
                right: {
                  type: 'var',
                  name: 'pontosComputador',
                },
              },
              x: {
                type: 'num',
                value: 560,
              },
              y: {
                type: 'num',
                value: 44,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#94a3b8',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 18,
              family: 'sans-serif',
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Trocas seguidas: ',
                },
                right: {
                  type: 'var',
                  name: 'trocas',
                },
              },
              x: {
                type: 'num',
                value: 258,
              },
              y: {
                type: 'num',
                value: 40,
              },
            },
          ],
        },
      ],
    },
  },
})
