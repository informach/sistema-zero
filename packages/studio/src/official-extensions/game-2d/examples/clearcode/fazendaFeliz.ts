import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Fazenda Feliz" (degrau BÁSICO da família farming/Stardew do Clear
 * Code). Uma tela só, grade fixa de canteiros: o MODELO de cada canteiro é um
 * número numa lista (0 terra, 1 broto, 2 crescendo, 3 maduro) e o visual sai por
 * código. Espaço planta e colhe; os brotos crescem no relógio do jogo. A câmera,
 * o inventário e a loja vêm nos níveis Profissional e "na mão". A behavior abaixo
 * foi GERADA pelo parser real a partir de __gen_fazendaFeliz.ts (drift test:
 * fazendaFelizExample.test.ts).
 */
export const fazendaFelizExample: ExtensionExample = beginnerGameExample({
  name: 'Fazenda Feliz',
  experience: 'game',
  description:
    'Fazendinha: ande com as setas até um canteiro e aperte espaço para plantar. Espere os brotos crescerem, colha o que estiver maduro e junte 30 moedas para vencer. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#22331a',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          border: '3px solid #ffffff',
          'border-radius': '18px',
          background: '#4a6b3a',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'g2d:defineShape',
          shapeName: 'fazendeiro',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 2,
              },
              w: {
                type: 'num',
                value: 22,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#8a5a2b',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 11,
              },
              r: {
                type: 'num',
                value: 8,
              },
              color: '#f7c8a2',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 18,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 16,
              },
              color: '#d98c40',
            },
          ],
        },
      ],
      start: [
        {
          type: 'g2d:fitScreen',
          percent: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'fazendeiro',
          shapeName: 'fazendeiro',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 250,
          },
          w: {
            type: 'num',
            value: 34,
          },
          h: {
            type: 'num',
            value: 34,
          },
        },
        {
          type: 'var',
          name: 'canteiroX',
          value: {
            type: 'array',
            items: [],
          },
          kind: 'const',
        },
        {
          type: 'var',
          name: 'canteiroY',
          value: {
            type: 'array',
            items: [],
          },
          kind: 'const',
        },
        {
          type: 'var',
          name: 'canteiro',
          value: {
            type: 'array',
            items: [],
          },
          kind: 'const',
        },
        {
          type: 'forRange',
          varName: 'i',
          from: {
            type: 'num',
            value: 0,
          },
          to: {
            type: 'num',
            value: 15,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'arrayPush',
              arrayVar: 'canteiroX',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 82,
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'binop',
                    op: '%',
                    left: {
                      type: 'var',
                      name: 'i',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  right: {
                    type: 'num',
                    value: 70,
                  },
                },
              },
            },
            {
              type: 'arrayPush',
              arrayVar: 'canteiroY',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 44,
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'mathUnary',
                    fn: 'floor',
                    arg: {
                      type: 'binop',
                      op: '/',
                      left: {
                        type: 'var',
                        name: 'i',
                      },
                      right: {
                        type: 'num',
                        value: 5,
                      },
                    },
                  },
                  right: {
                    type: 'num',
                    value: 70,
                  },
                },
              },
            },
            {
              type: 'arrayPush',
              arrayVar: 'canteiro',
              value: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'var',
          name: 'moedas',
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
                name: 'venceu',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: 'Space',
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
                name: 'jogando',
              },
              then: [
                {
                  type: 'forRange',
                  varName: 'i',
                  from: {
                    type: 'num',
                    value: 0,
                  },
                  to: {
                    type: 'num',
                    value: 15,
                  },
                  step: {
                    type: 'num',
                    value: 1,
                  },
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '&&',
                        left: {
                          type: 'logical',
                          op: '&&',
                          left: {
                            type: 'logical',
                            op: '&&',
                            left: {
                              type: 'binop',
                              op: '>=',
                              left: {
                                type: 'g2d:centerX',
                                spriteVar: 'fazendeiro',
                              },
                              right: {
                                type: 'index',
                                arrayVar: 'canteiroX',
                                index: {
                                  type: 'var',
                                  name: 'i',
                                },
                              },
                            },
                            right: {
                              type: 'binop',
                              op: '<',
                              left: {
                                type: 'g2d:centerX',
                                spriteVar: 'fazendeiro',
                              },
                              right: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'index',
                                  arrayVar: 'canteiroX',
                                  index: {
                                    type: 'var',
                                    name: 'i',
                                  },
                                },
                                right: {
                                  type: 'num',
                                  value: 64,
                                },
                              },
                            },
                          },
                          right: {
                            type: 'binop',
                            op: '>=',
                            left: {
                              type: 'g2d:centerY',
                              spriteVar: 'fazendeiro',
                            },
                            right: {
                              type: 'index',
                              arrayVar: 'canteiroY',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                          },
                        },
                        right: {
                          type: 'binop',
                          op: '<',
                          left: {
                            type: 'g2d:centerY',
                            spriteVar: 'fazendeiro',
                          },
                          right: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroY',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 64,
                            },
                          },
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiro',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 0,
                            },
                          },
                          then: [
                            {
                              type: 'indexSet',
                              object: {
                                type: 'var',
                                name: 'canteiro',
                              },
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                              value: {
                                type: 'num',
                                value: 1,
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'collect',
                            },
                          ],
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiro',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 3,
                            },
                          },
                          then: [
                            {
                              type: 'indexSet',
                              object: {
                                type: 'var',
                                name: 'canteiro',
                              },
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                              value: {
                                type: 'num',
                                value: 0,
                              },
                            },
                            {
                              type: 'assign',
                              name: 'moedas',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'moedas',
                                },
                                right: {
                                  type: 'num',
                                  value: 3,
                                },
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'coin',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'venceu',
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
                    value: 'Fazenda Feliz',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande com as setas até um canteiro e aperte espaço para plantar. Espere crescer, colha o que estiver maduro e junte 30 moedas!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para começar',
                  },
                  bg: '#3a5a2a',
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
                  type: 'forRange',
                  varName: 'i',
                  from: {
                    type: 'num',
                    value: 0,
                  },
                  to: {
                    type: 'num',
                    value: 15,
                  },
                  step: {
                    type: 'num',
                    value: 1,
                  },
                  body: [
                    {
                      type: 'g2d:paintRect',
                      ctxVar: 'ctx',
                      x: {
                        type: 'index',
                        arrayVar: 'canteiroX',
                        index: {
                          type: 'var',
                          name: 'i',
                        },
                      },
                      y: {
                        type: 'index',
                        arrayVar: 'canteiroY',
                        index: {
                          type: 'var',
                          name: 'i',
                        },
                      },
                      w: {
                        type: 'num',
                        value: 64,
                      },
                      h: {
                        type: 'num',
                        value: 64,
                      },
                      color: '#6b4a2b',
                    },
                    {
                      type: 'g2d:paintRect',
                      ctxVar: 'ctx',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'index',
                          arrayVar: 'canteiroX',
                          index: {
                            type: 'var',
                            name: 'i',
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
                          type: 'index',
                          arrayVar: 'canteiroY',
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 4,
                        },
                      },
                      w: {
                        type: 'num',
                        value: 56,
                      },
                      h: {
                        type: 'num',
                        value: 56,
                      },
                      color: '#7a5636',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'index',
                          arrayVar: 'canteiro',
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:paintCircle',
                          ctxVar: 'ctx',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroX',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 32,
                            },
                          },
                          y: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroY',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 44,
                            },
                          },
                          r: {
                            type: 'num',
                            value: 6,
                          },
                          color: '#7ec850',
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'index',
                          arrayVar: 'canteiro',
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:paintCircle',
                          ctxVar: 'ctx',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroX',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 32,
                            },
                          },
                          y: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroY',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 38,
                            },
                          },
                          r: {
                            type: 'num',
                            value: 12,
                          },
                          color: '#4fae3a',
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'index',
                          arrayVar: 'canteiro',
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 3,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:paintCircle',
                          ctxVar: 'ctx',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroX',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 32,
                            },
                          },
                          y: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiroY',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 34,
                            },
                          },
                          r: {
                            type: 'num',
                            value: 16,
                          },
                          color: '#ffd24a',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:topDown',
                  spriteVar: 'fazendeiro',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'fazendeiro',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'fazendeiro',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Moedas:',
                  value: {
                    type: 'var',
                    name: 'moedas',
                  },
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 24,
                  },
                  color: '#fff8e1',
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
                      name: 'moedas',
                    },
                    right: {
                      type: 'num',
                      value: 30,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'win',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'venceu',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'venceu',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Que colheita!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Você juntou 30 moedas cuidando da sua fazenda!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para plantar de novo',
                  },
                  bg: '#3a5a2a',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 3,
          },
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'jogando',
              },
              then: [
                {
                  type: 'forRange',
                  varName: 'i',
                  from: {
                    type: 'num',
                    value: 0,
                  },
                  to: {
                    type: 'num',
                    value: 15,
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
                        op: '==',
                        left: {
                          type: 'index',
                          arrayVar: 'canteiro',
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                      then: [
                        {
                          type: 'indexSet',
                          object: {
                            type: 'var',
                            name: 'canteiro',
                          },
                          index: {
                            type: 'var',
                            name: 'i',
                          },
                          value: {
                            type: 'num',
                            value: 2,
                          },
                        },
                      ],
                      elseif: [
                        {
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'index',
                              arrayVar: 'canteiro',
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          then: [
                            {
                              type: 'indexSet',
                              object: {
                                type: 'var',
                                name: 'canteiro',
                              },
                              index: {
                                type: 'var',
                                name: 'i',
                              },
                              value: {
                                type: 'num',
                                value: 3,
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
    extensions: [{ extensionId: 'game-2d' }],
  },
})
