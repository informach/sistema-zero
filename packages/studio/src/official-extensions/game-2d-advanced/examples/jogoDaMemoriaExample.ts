import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Jogo da Memoria" 🃏 (R30): a vitrine das CARTAS. Uma lista de cartas
 * de 2 faces (card) embaralhada (shuffle do nucleo); handDraw desenha a fileira,
 * cardAt descobre a clicada, cardFlip vira, cardFace compara o par. Sem par →
 * waitThen desvira as duas. Pilha = lista do nucleo. IR do parser (one-off).
 */
export const jogoDaMemoriaExample: ExtensionExample = {
  name: 'Jogo da Memoria',
  experience: 'game',
  description:
    'O classico jogo da memoria montado com CARTAS: uma lista de cartas pareadas embaralhadas; clique para virar duas e, se forem iguais, o par fica. Ache os 3 pares! Prova a carta de 2 faces + a pilha (lista) + a mao clicavel.',
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
            value: 720,
          },
          h: {
            type: 'num',
            value: 560,
          },
          bg: '#2a1a3a',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Jogo da Memoria',
          },
          text: {
            type: 'str',
            value: 'Clique nas cartas para virar e ache todos os pares iguais!',
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
            value: 'Voce achou todos os pares!',
          },
          text: {
            type: 'str',
            value: 'Muito bem!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'var',
          name: 'cartas',
          value: {
            type: 'array',
            items: [],
          },
        },
        {
          type: 'var',
          name: 'primeira',
          value: {
            type: 'binop',
            op: '-',
            left: {
              type: 'num',
              value: 0,
            },
            right: {
              type: 'num',
              value: 1,
            },
          },
        },
        {
          type: 'var',
          name: 'segunda',
          value: {
            type: 'binop',
            op: '-',
            left: {
              type: 'num',
              value: 0,
            },
            right: {
              type: 'num',
              value: 1,
            },
          },
        },
        {
          type: 'var',
          name: 'pares',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'cartas',
          value: {
            type: 'array',
            items: [
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍎',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍎',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍌',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍌',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍇',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
              {
                type: 'gk:card',
                front: {
                  type: 'str',
                  value: '🍇',
                },
                back: {
                  type: 'str',
                  value: '?',
                },
              },
            ],
          },
        },
        {
          type: 'assign',
          name: 'cartas',
          value: {
            type: 'shuffle',
            arrayVar: 'cartas',
          },
        },
        {
          type: 'assign',
          name: 'primeira',
          value: {
            type: 'binop',
            op: '-',
            left: {
              type: 'num',
              value: 0,
            },
            right: {
              type: 'num',
              value: 1,
            },
          },
        },
        {
          type: 'assign',
          name: 'segunda',
          value: {
            type: 'binop',
            op: '-',
            left: {
              type: 'num',
              value: 0,
            },
            right: {
              type: 'num',
              value: 1,
            },
          },
        },
        {
          type: 'assign',
          name: 'pares',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
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
                pileVar: 'cartas',
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
                    op: '===',
                    left: {
                      type: 'gk:cardIsUp',
                      card: {
                        type: 'index',
                        arrayVar: 'cartas',
                        index: {
                          type: 'var',
                          name: 'i',
                        },
                      },
                    },
                    right: {
                      type: 'bool',
                      value: false,
                    },
                  },
                  then: [
                    {
                      type: 'gk:cardFlip',
                      card: {
                        type: 'index',
                        arrayVar: 'cartas',
                        index: {
                          type: 'var',
                          name: 'i',
                        },
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'var',
                          name: 'primeira',
                        },
                        right: {
                          type: 'binop',
                          op: '-',
                          left: {
                            type: 'num',
                            value: 0,
                          },
                          right: {
                            type: 'num',
                            value: 1,
                          },
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'primeira',
                          value: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                      ],
                      else: [
                        {
                          type: 'assign',
                          name: 'segunda',
                          value: {
                            type: 'var',
                            name: 'i',
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
                                arrayVar: 'cartas',
                                index: {
                                  type: 'var',
                                  name: 'primeira',
                                },
                              },
                            },
                            right: {
                              type: 'gk:cardFace',
                              card: {
                                type: 'index',
                                arrayVar: 'cartas',
                                index: {
                                  type: 'var',
                                  name: 'segunda',
                                },
                              },
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'pares',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'pares',
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'assign',
                              name: 'primeira',
                              value: {
                                type: 'binop',
                                op: '-',
                                left: {
                                  type: 'num',
                                  value: 0,
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'if',
                              cond: {
                                type: 'binop',
                                op: '===',
                                left: {
                                  type: 'var',
                                  name: 'pares',
                                },
                                right: {
                                  type: 'num',
                                  value: 3,
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
                          else: [
                            {
                              type: 'gk:waitThen',
                              seconds: {
                                type: 'num',
                                value: 0.7,
                              },
                              body: [
                                {
                                  type: 'gk:cardFlip',
                                  card: {
                                    type: 'index',
                                    arrayVar: 'cartas',
                                    index: {
                                      type: 'var',
                                      name: 'primeira',
                                    },
                                  },
                                },
                                {
                                  type: 'gk:cardFlip',
                                  card: {
                                    type: 'index',
                                    arrayVar: 'cartas',
                                    index: {
                                      type: 'var',
                                      name: 'segunda',
                                    },
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'primeira',
                                  value: {
                                    type: 'binop',
                                    op: '-',
                                    left: {
                                      type: 'num',
                                      value: 0,
                                    },
                                    right: {
                                      type: 'num',
                                      value: 1,
                                    },
                                  },
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
              color: '#2a1a3a',
              grid: true,
            },
            {
              type: 'gk:handDraw',
              pileVar: 'cartas',
              x: {
                type: 'num',
                value: 90,
              },
              y: {
                type: 'num',
                value: 220,
              },
              fan: false,
            },
          ],
        },
      ],
    },
  },
}
