import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Corrida de Tabuleiro" 🎲 (R30): a vitrine dos JOGOS DE TABULEIRO. Dois
 * peoes numa trilha de casas (cada ponto do caminho e uma casa); clicar rola o dado
 * (rollDice), anda o peao da vez esse tanto (moveAlongTrack), a casa premiada da
 * pontos (onLandSpace + spaceOf) e passa a vez (nextPlayer). IR do parser (one-off).
 */
export const corridaTabuleiroExample: ExtensionExample = {
  name: 'Corrida de Tabuleiro',
  experience: 'game',
  description:
    'Um jogo de TABULEIRO para dois: clique para rolar o dado e andar as casas na trilha, e passe a vez. Cada peao para na casa e a casa premiada da pontos. Prova o dado + a ordem de turno + a trilha de casas.',
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
          type: 'gk:definePath',
          name: 'trilha',
          body: [
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 120,
              },
              y: {
                type: 'num',
                value: 480,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 260,
              },
              y: {
                type: 'num',
                value: 480,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 400,
              },
              y: {
                type: 'num',
                value: 480,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 540,
              },
              y: {
                type: 'num',
                value: 420,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 680,
              },
              y: {
                type: 'num',
                value: 340,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 680,
              },
              y: {
                type: 'num',
                value: 200,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 520,
              },
              y: {
                type: 'num',
                value: 150,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 380,
              },
              y: {
                type: 'num',
                value: 150,
              },
            },
          ],
        },
      ],
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 900,
          },
          h: {
            type: 'num',
            value: 600,
          },
          bg: '#1b3a2a',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Corrida de Tabuleiro',
          },
          text: {
            type: 'str',
            value:
              'Clique para rolar o dado e andar as casas. Dois peoes: chegue ao fim e pegue os pontos da casa premiada!',
          },
          button: {
            type: 'str',
            value: 'Jogar',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'azul',
          image: '',
          w: {
            type: 'num',
            value: 36,
          },
          h: {
            type: 'num',
            value: 36,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#4a9eff',
        },
        {
          type: 'gk:createCharacter',
          varName: 'vermelho',
          image: '',
          w: {
            type: 'num',
            value: 36,
          },
          h: {
            type: 'num',
            value: 36,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#ef4444',
        },
        {
          type: 'var',
          name: 'pontosAzul',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'pontosVermelho',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:playersSetup',
          n: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'assign',
          name: 'pontosAzul',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'pontosVermelho',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'azul',
          x: {
            type: 'num',
            value: 120,
          },
          y: {
            type: 'num',
            value: 480,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'vermelho',
          x: {
            type: 'num',
            value: 120,
          },
          y: {
            type: 'num',
            value: 480,
          },
        },
      ],
      events: [
        {
          type: 'gk:onTurnChange',
          body: [
            {
              type: 'gk:emit',
              event: 'vez:mudou',
            },
          ],
        },
        {
          type: 'gk:onLandSpace',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'gk:currentPlayer',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:spaceOf',
                      who: 'azul',
                    },
                    right: {
                      type: 'num',
                      value: 7,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosAzul',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pontosAzul',
                        },
                        right: {
                          type: 'num',
                          value: 10,
                        },
                      },
                    },
                  ],
                },
              ],
              else: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:spaceOf',
                      who: 'vermelho',
                    },
                    right: {
                      type: 'num',
                      value: 7,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosVermelho',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pontosVermelho',
                        },
                        right: {
                          type: 'num',
                          value: 10,
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:nextPlayer',
            },
          ],
        },
        {
          type: 'gk:onGameClick',
          xName: 'px',
          yName: 'py',
          body: [
            {
              type: 'var',
              name: 'passos',
              value: {
                type: 'gk:rollDice',
                faces: {
                  type: 'num',
                  value: 6,
                },
              },
              kind: 'const',
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'gk:currentPlayer',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'gk:moveAlongTrack',
                  who: 'azul',
                  spaces: {
                    type: 'var',
                    name: 'passos',
                  },
                  path: 'trilha',
                },
              ],
              else: [
                {
                  type: 'gk:moveAlongTrack',
                  who: 'vermelho',
                  spaces: {
                    type: 'var',
                    name: 'passos',
                  },
                  path: 'trilha',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#1b3a2a',
              grid: true,
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'azul',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'vermelho',
            },
          ],
        },
      ],
    },
  },
}
