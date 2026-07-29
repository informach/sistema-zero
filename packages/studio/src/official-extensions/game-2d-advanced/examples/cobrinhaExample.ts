import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo "Cobrinha" 🐍 (R29): a vitrine da 🧩 Grade. A grade guarda, em cada
 * celula, por quantos PASSOS ela ainda e corpo (a cabeca marca `tamanho`, tudo
 * decai 1/passo, 0 = vazio) — Snake SEM lista, so com boardGet/boardSet + os lacos
 * do nucleo. Comer a maca aumenta `tamanho`. IR do parser (one-off), asset-free.
 */
export const cobrinhaExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Cobrinha',
  experience: 'game',
  description:
    'A cobrinha classica montada numa 🧩 Grade: cada celula guarda por quantos passos faz parte do corpo. Vire com as SETAS, coma as macas e cresca. Bateu na parede ou no proprio corpo, perdeu. Prova o primitivo de grade (sem lista, sem magica).',
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
            value: 640,
          },
          h: {
            type: 'num',
            value: 640,
          },
          bg: '#0b160b',
          accent: '#4ade80',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Cobrinha',
          },
          text: {
            type: 'str',
            value: 'Use as SETAS para virar. Coma as macas e cresca!',
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
            value: 'Perdeu!',
          },
          text: {
            type: 'str',
            value: 'A cobra bateu. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'var',
          name: 'cabecaCol',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'var',
          name: 'cabecaLin',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'var',
          name: 'dirCol',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'dirLin',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'tamanho',
          value: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'var',
          name: 'macaCol',
          value: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'var',
          name: 'macaLin',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'gk:boardCreate',
          name: 'cobra',
          cols: {
            type: 'num',
            value: 16,
          },
          rows: {
            type: 'num',
            value: 16,
          },
          empty: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'cabecaCol',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'assign',
          name: 'cabecaLin',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'assign',
          name: 'dirCol',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'assign',
          name: 'dirLin',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'tamanho',
          value: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'assign',
          name: 'macaCol',
          value: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'assign',
          name: 'macaLin',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'gk:boardSet',
          name: 'cobra',
          value: {
            type: 'var',
            name: 'tamanho',
          },
          col: {
            type: 'var',
            name: 'cabecaCol',
          },
          row: {
            type: 'var',
            name: 'cabecaLin',
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
                type: 'gk:keyPressed',
                key: 'arrowleft',
              },
              then: [
                {
                  type: 'assign',
                  name: 'dirCol',
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
                  name: 'dirLin',
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
                type: 'gk:keyPressed',
                key: 'arrowright',
              },
              then: [
                {
                  type: 'assign',
                  name: 'dirCol',
                  value: {
                    type: 'num',
                    value: 1,
                  },
                },
                {
                  type: 'assign',
                  name: 'dirLin',
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
                type: 'gk:keyPressed',
                key: 'arrowup',
              },
              then: [
                {
                  type: 'assign',
                  name: 'dirCol',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'assign',
                  name: 'dirLin',
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
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'arrowdown',
              },
              then: [
                {
                  type: 'assign',
                  name: 'dirCol',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'assign',
                  name: 'dirLin',
                  value: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
            {
              type: 'gk:everySeconds',
              seconds: {
                type: 'num',
                value: 0.16,
              },
              body: [
                {
                  type: 'assign',
                  name: 'cabecaCol',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'cabecaCol',
                    },
                    right: {
                      type: 'var',
                      name: 'dirCol',
                    },
                  },
                },
                {
                  type: 'assign',
                  name: 'cabecaLin',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'cabecaLin',
                    },
                    right: {
                      type: 'var',
                      name: 'dirLin',
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:boardIn',
                    name: 'cobra',
                    col: {
                      type: 'var',
                      name: 'cabecaCol',
                    },
                    row: {
                      type: 'var',
                      name: 'cabecaLin',
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: {
                          type: 'gk:boardGet',
                          name: 'cobra',
                          col: {
                            type: 'var',
                            name: 'cabecaCol',
                          },
                          row: {
                            type: 'var',
                            name: 'cabecaLin',
                          },
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
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'var',
                          name: 'cabecaCol',
                        },
                        right: {
                          type: 'var',
                          name: 'macaCol',
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '===',
                            left: {
                              type: 'var',
                              name: 'cabecaLin',
                            },
                            right: {
                              type: 'var',
                              name: 'macaLin',
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'tamanho',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'tamanho',
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'assign',
                              name: 'macaCol',
                              value: {
                                type: 'mathUnary',
                                fn: 'floor',
                                arg: {
                                  type: 'binop',
                                  op: '*',
                                  left: {
                                    type: 'randomFloat',
                                  },
                                  right: {
                                    type: 'num',
                                    value: 16,
                                  },
                                },
                              },
                            },
                            {
                              type: 'assign',
                              name: 'macaLin',
                              value: {
                                type: 'mathUnary',
                                fn: 'floor',
                                arg: {
                                  type: 'binop',
                                  op: '*',
                                  left: {
                                    type: 'randomFloat',
                                  },
                                  right: {
                                    type: 'num',
                                    value: 16,
                                  },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'forRange',
                      varName: 'coluna',
                      from: {
                        type: 'num',
                        value: 0,
                      },
                      to: {
                        type: 'num',
                        value: 16,
                      },
                      step: {
                        type: 'num',
                        value: 1,
                      },
                      body: [
                        {
                          type: 'forRange',
                          varName: 'linha',
                          from: {
                            type: 'num',
                            value: 0,
                          },
                          to: {
                            type: 'num',
                            value: 16,
                          },
                          step: {
                            type: 'num',
                            value: 1,
                          },
                          body: [
                            {
                              type: 'if',
                              cond: {
                                type: 'binop',
                                op: '>',
                                left: {
                                  type: 'gk:boardGet',
                                  name: 'cobra',
                                  col: {
                                    type: 'var',
                                    name: 'coluna',
                                  },
                                  row: {
                                    type: 'var',
                                    name: 'linha',
                                  },
                                },
                                right: {
                                  type: 'num',
                                  value: 0,
                                },
                              },
                              then: [
                                {
                                  type: 'gk:boardSet',
                                  name: 'cobra',
                                  value: {
                                    type: 'binop',
                                    op: '-',
                                    left: {
                                      type: 'gk:boardGet',
                                      name: 'cobra',
                                      col: {
                                        type: 'var',
                                        name: 'coluna',
                                      },
                                      row: {
                                        type: 'var',
                                        name: 'linha',
                                      },
                                    },
                                    right: {
                                      type: 'num',
                                      value: 1,
                                    },
                                  },
                                  col: {
                                    type: 'var',
                                    name: 'coluna',
                                  },
                                  row: {
                                    type: 'var',
                                    name: 'linha',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'gk:boardSet',
                      name: 'cobra',
                      value: {
                        type: 'var',
                        name: 'tamanho',
                      },
                      col: {
                        type: 'var',
                        name: 'cabecaCol',
                      },
                      row: {
                        type: 'var',
                        name: 'cabecaLin',
                      },
                    },
                  ],
                  else: [
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
              color: '#0b160b',
              grid: true,
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ef4444',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'macaCol',
                  },
                  right: {
                    type: 'num',
                    value: 40,
                  },
                },
                right: {
                  type: 'num',
                  value: 4,
                },
              },
              y: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'macaLin',
                  },
                  right: {
                    type: 'num',
                    value: 40,
                  },
                },
                right: {
                  type: 'num',
                  value: 4,
                },
              },
              w: {
                type: 'num',
                value: 32,
              },
              h: {
                type: 'num',
                value: 32,
              },
            },
            {
              type: 'forRange',
              varName: 'coluna',
              from: {
                type: 'num',
                value: 0,
              },
              to: {
                type: 'num',
                value: 16,
              },
              step: {
                type: 'num',
                value: 1,
              },
              body: [
                {
                  type: 'forRange',
                  varName: 'linha',
                  from: {
                    type: 'num',
                    value: 0,
                  },
                  to: {
                    type: 'num',
                    value: 16,
                  },
                  step: {
                    type: 'num',
                    value: 1,
                  },
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: {
                          type: 'gk:boardGet',
                          name: 'cobra',
                          col: {
                            type: 'var',
                            name: 'coluna',
                          },
                          row: {
                            type: 'var',
                            name: 'linha',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      then: [
                        {
                          type: 'canvasFillStyle',
                          ctxVar: 'ctx',
                          color: {
                            type: 'color',
                            value: '#4ade80',
                          },
                        },
                        {
                          type: 'canvasFillRect',
                          ctxVar: 'ctx',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '*',
                              left: {
                                type: 'var',
                                name: 'coluna',
                              },
                              right: {
                                type: 'num',
                                value: 40,
                              },
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          y: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '*',
                              left: {
                                type: 'var',
                                name: 'linha',
                              },
                              right: {
                                type: 'num',
                                value: 40,
                              },
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          w: {
                            type: 'num',
                            value: 36,
                          },
                          h: {
                            type: 'num',
                            value: 36,
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
  },
})
