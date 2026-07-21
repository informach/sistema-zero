import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Duelo de Cartas" 🃏 (R30): a vitrine do 🃏 Kit Cartas (deck-battler). O
 * baralho/mao/descarte sao listas do nucleo; cardsStart abre a batalha, cardsOnTurn
 * compra a mao (pileMoveTop + rebaralhar), o clique joga a carta (cardAt + cardsSpend
 * + efeito + descarte), a intencao e telegrafada e o espaco passa o turno. IR one-off.
 */
export const dueloDeCartasExample: ExtensionExample = {
  name: 'Duelo de Cartas',
  experience: 'game',
  description:
    'Um RPG DE CARTAS (deck-battler estilo Slay the Spire): compre a mao do baralho, clique numa carta para joga-la gastando energia (🗡️ ataca, 🛡️ defende), veja a INTENCAO do inimigo e passe o turno (espaco). Prova o Kit Cartas inteiro.',
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
          bg: '#191426',
          accent: '#c084fc',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Duelo de Cartas',
          },
          text: {
            type: 'str',
            value:
              'Clique numa carta da mao para joga-la (custa 1 energia): 🗡️ ataca, 🛡️ defende. Aperte espaco para passar o turno!',
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
            value: 'Voce venceu o duelo!',
          },
          text: {
            type: 'str',
            value: 'Que estrategista!',
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
            value: 'Voce perdeu...',
          },
          text: {
            type: 'str',
            value: 'Tente outra estrategia!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'var',
          name: 'baralho',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'var',
          name: 'mao',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'var',
          name: 'descarte',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'assign',
          name: 'baralho',
          value: {
            type: 'array',
            items: [
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🗡️',
                },
                back: {
                  type: 'str',
                  value: '🗡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🗡️',
                },
                back: {
                  type: 'str',
                  value: '🗡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🗡️',
                },
                back: {
                  type: 'str',
                  value: '🗡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🗡️',
                },
                back: {
                  type: 'str',
                  value: '🗡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🛡️',
                },
                back: {
                  type: 'str',
                  value: '🛡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🛡️',
                },
                back: {
                  type: 'str',
                  value: '🛡️',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🛡️',
                },
                back: {
                  type: 'str',
                  value: '🛡️',
                },
              },
            ],
          },
        },
        {
          type: 'assign',
          name: 'baralho',
          value: {
            type: 'shuffle',
            arrayVar: 'baralho',
          },
        },
        {
          type: 'assign',
          name: 'mao',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'assign',
          name: 'descarte',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'gk:cardsStart',
          heroHp: {
            type: 'num',
            value: 30,
          },
          enemyHp: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:cardsEnergyPerTurn',
          n: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'gk:cardsEnemyIntent',
          action: 'atacar',
          value: {
            type: 'num',
            value: 7,
          },
        },
      ],
      events: [
        {
          type: 'gk:cardsOnTurn',
          body: [
            {
              type: 'repeat',
              times: {
                type: 'num',
                value: 3,
              },
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:pileSize',
                      pileVar: 'baralho',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'gk:pileShuffleFrom',
                      deckVar: 'baralho',
                      discardVar: 'descarte',
                    },
                  ],
                },
                {
                  type: 'gk:pileMoveTop',
                  fromVar: 'baralho',
                  toVar: 'mao',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:cardsOnEnemyTurn',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'gk:cardsIntentAction',
                },
                right: {
                  type: 'str',
                  value: 'atacar',
                },
              },
              then: [
                {
                  type: 'gk:cardsHurtMe',
                  n: {
                    type: 'gk:cardsIntentValue',
                  },
                },
              ],
            },
            {
              type: 'gk:cardsEnemyIntent',
              action: 'atacar',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 5,
                },
                right: {
                  type: 'gk:rollDice',
                  faces: {
                    type: 'num',
                    value: 4,
                  },
                },
              },
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
              name: 'i',
              value: {
                type: 'gk:cardAt',
                x: {
                  type: 'var',
                  name: 'px',
                },
                y: {
                  type: 'var',
                  name: 'py',
                },
                pileVar: 'mao',
              },
              kind: 'const',
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'i',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'gk:cardsEnergy',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  then: [
                    {
                      type: 'gk:cardsSpend',
                      n: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'gk:cardFace',
                          card: {
                            type: 'index',
                            arrayVar: 'mao',
                            index: {
                              type: 'var',
                              name: 'i',
                            },
                          },
                        },
                        right: {
                          type: 'str',
                          value: '🗡️',
                        },
                      },
                      then: [
                        {
                          type: 'gk:cardsHurtEnemy',
                          n: {
                            type: 'num',
                            value: 6,
                          },
                        },
                      ],
                      else: [
                        {
                          type: 'gk:cardsGainBlock',
                          n: {
                            type: 'num',
                            value: 5,
                          },
                        },
                      ],
                    },
                    {
                      type: 'arrayPush',
                      arrayVar: 'descarte',
                      value: {
                        type: 'index',
                        arrayVar: 'mao',
                        index: {
                          type: 'var',
                          name: 'i',
                        },
                      },
                    },
                    {
                      type: 'arraySplice',
                      arrayVar: 'mao',
                      start: {
                        type: 'var',
                        name: 'i',
                      },
                      count: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<=',
                        left: {
                          type: 'gk:cardsEnemyLife',
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
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: ' ',
              },
              then: [
                {
                  type: 'gk:cardsEndTurn',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'gk:cardsHeroLife',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'gk:endGame',
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
              color: '#191426',
              grid: true,
            },
            {
              type: 'gk:cardsDrawHud',
            },
            {
              type: 'gk:handDraw',
              pileVar: 'mao',
              x: {
                type: 'num',
                value: 120,
              },
              y: {
                type: 'num',
                value: 440,
              },
              fan: false,
            },
          ],
        },
      ],
    },
  },
}
