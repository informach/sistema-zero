import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Quebra-blocos" 🧱 (R29): a vitrine da raquete (paddleBounce). A bola
 * anda por velocidade, quica nas bordas e REBATE na raquete com o angulo pelo ponto
 * de impacto; os blocos sao um enxame e o toque recolhe + inverte o vy. Breakout
 * inteiro montado com pecas neutras. IR do parser (one-off), asset-free.
 */
export const quebraBlocosExample: ExtensionExample = {
  name: 'Quebra-blocos',
  experience: 'game',
  description:
    'Breakout na unha: a bola anda, quica nas paredes e REBATE na raquete (o angulo muda pelo ponto que bateu). Mova a raquete com as SETAS e derrube todos os blocos. Prova a peca Rebater na raquete + quicar nas bordas.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'gk:defineMold',
          name: 'bloco',
          w: {
            type: 'num',
            value: 72,
          },
          h: {
            type: 'num',
            value: 24,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#f472b6',
          image: '',
          look: '',
        },
      ],
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 800,
          },
          h: {
            type: 'num',
            value: 600,
          },
          bg: '#0b1020',
          accent: '#22d3ee',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Quebra-blocos',
          },
          text: {
            type: 'str',
            value: 'Mova a raquete com as SETAS. Nao deixe a bola cair!',
          },
          button: {
            type: 'str',
            value: 'Jogar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'A bola caiu!',
          },
          text: {
            type: 'str',
            value: 'Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'raquete',
          image: '',
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 18,
          },
          speed: {
            type: 'num',
            value: 520,
          },
          color: '#22d3ee',
        },
        {
          type: 'gk:createCharacter',
          varName: 'bola',
          image: '',
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#fde047',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'raquete',
          x: {
            type: 'num',
            value: 340,
          },
          y: {
            type: 'num',
            value: 540,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'bola',
          x: {
            type: 'num',
            value: 392,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:setVelocity',
          charVar: 'bola',
          vx: {
            type: 'num',
            value: 220,
          },
          vy: {
            type: 'num',
            value: 260,
          },
        },
        {
          type: 'forRange',
          varName: 'linha',
          from: {
            type: 'num',
            value: 0,
          },
          to: {
            type: 'num',
            value: 3,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'forRange',
              varName: 'coluna',
              from: {
                type: 'num',
                value: 0,
              },
              to: {
                type: 'num',
                value: 9,
              },
              step: {
                type: 'num',
                value: 1,
              },
              body: [
                {
                  type: 'gk:spawnFromMold',
                  mold: 'bloco',
                  x: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'num',
                      value: 40,
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'var',
                        name: 'coluna',
                      },
                      right: {
                        type: 'num',
                        value: 84,
                      },
                    },
                  },
                  y: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'num',
                      value: 80,
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'var',
                        name: 'linha',
                      },
                      right: {
                        type: 'num',
                        value: 36,
                      },
                    },
                  },
                },
              ],
            },
          ],
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
                type: 'gk:keyDown',
                key: 'arrowleft',
              },
              then: [
                {
                  type: 'gk:setProperty',
                  charVar: 'raquete',
                  prop: 'x',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'gk:propertyOf',
                      charVar: 'raquete',
                      prop: 'x',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 520,
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
                key: 'arrowright',
              },
              then: [
                {
                  type: 'gk:setProperty',
                  charVar: 'raquete',
                  prop: 'x',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'gk:propertyOf',
                      charVar: 'raquete',
                      prop: 'x',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 520,
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
              charVar: 'raquete',
            },
            {
              type: 'gk:moveByVelocity',
              charVar: 'bola',
              dtVar: 'dt',
            },
            {
              type: 'gk:bounceOnEdges',
              charVar: 'bola',
            },
            {
              type: 'gk:paddleBounce',
              ballVar: 'bola',
              paddleVar: 'raquete',
            },
            {
              type: 'gk:forEachActive',
              mold: 'bloco',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'bola',
                    bVar: 'item',
                  },
                  then: [
                    {
                      type: 'gk:recycle',
                      charVar: 'item',
                    },
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bola',
                      vx: {
                        type: 'gk:velocityOf',
                        charVar: 'bola',
                        axis: 'x',
                      },
                      vy: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'gk:velocityOf',
                          charVar: 'bola',
                          axis: 'y',
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'gk:propertyOf',
                  charVar: 'bola',
                  prop: 'y',
                },
                right: {
                  type: 'gk:gameHeight',
                },
              },
              then: [
                {
                  type: 'gk:endGame',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'gk:countActive',
                  mold: 'bloco',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'gk:setState',
                  name: 'vitoria',
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
              type: 'gk:drawActive',
              mold: 'bloco',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'raquete',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'bola',
            },
          ],
        },
      ],
    },
  },
}
