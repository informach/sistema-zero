import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Fazenda Feliz Profissional" — o nível 2 da família farming
 * do Clear Code, sobre o motor avançado. Mundo maior que a tela com cameraFollow,
 * FERRAMENTAS que se trocam com Q (enxada ara, semente planta, regador rega; o
 * canteiro arado ganha um sulco visível), o CICLO DO DIA (só cresce quem foi
 * regado e o dia passa quando você dorme com C) e a colheita vendida na LOJA
 * (rpgMenu) por moedas. Junte 50 e vença (setState "vitoria"). A IR foi GERADA
 * pelo parser real a partir de __gen_fazendaFelizProfissional.ts.
 */
export const fazendaFelizProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Fazenda Feliz Profissional',
  experience: 'game',
  description:
    'A fazenda do motor avançado: mundo com câmera, ferramentas de verdade (enxada, semente, regador) que se trocam, o ciclo do dia (só cresce quem foi regado e você vai dormir) e a colheita vendida na loja por moedas. Setas ou WASD.',
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
            value: 960,
          },
          h: {
            type: 'num',
            value: 540,
          },
          bg: '#2b4a1e',
          accent: '#ffd24a',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Fazenda Feliz Profissional',
          },
          text: {
            type: 'str',
            value:
              'Setas ou WASD: andar. Q: trocar a ferramenta. Espaço: usar. C: dormir. V: vender. Junte 50 moedas!',
          },
          button: {
            type: 'str',
            value: 'Começar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Que fazenda!',
          },
          text: {
            type: 'str',
            value: 'Você juntou 50 moedas cuidando da terra!',
          },
          button: {
            type: 'str',
            value: 'Plantar de novo',
          },
        },
        {
          type: 'gk:defineLook',
          name: 'fazendeiro',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8a5a2b',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 26,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f7c8a2',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#d98c40',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 7,
              },
              y: {
                type: 'num',
                value: 20,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 16,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 34,
          },
          baseH: {
            type: 'num',
            value: 36,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'fazendeiro',
          image: '',
          w: {
            type: 'num',
            value: 34,
          },
          h: {
            type: 'num',
            value: 36,
          },
          speed: {
            type: 'num',
            value: 200,
          },
          color: '#d98c40',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'fazendeiro',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 450,
          },
        },
        {
          type: 'gk:stateLook',
          charVar: 'fazendeiro',
          state: 'parado',
          look: 'fazendeiro',
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
          type: 'var',
          name: 'molhado',
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
            value: 24,
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
                  value: 200,
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
                      value: 6,
                    },
                  },
                  right: {
                    type: 'num',
                    value: 100,
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
                  value: 200,
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
                        value: 6,
                      },
                    },
                  },
                  right: {
                    type: 'num',
                    value: 100,
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
            {
              type: 'arrayPush',
              arrayVar: 'molhado',
              value: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'var',
          name: 'ferramentas',
          value: {
            type: 'array',
            items: [
              {
                type: 'str',
                value: 'enxada',
              },
              {
                type: 'str',
                value: 'semente',
              },
              {
                type: 'str',
                value: 'regador',
              },
            ],
          },
          kind: 'const',
        },
        {
          type: 'var',
          name: 'ferramenta',
          value: {
            type: 'num',
            value: 0,
          },
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
          type: 'var',
          name: 'colheita',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'dia',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'gk:cameraFollow',
          charVar: 'fazendeiro',
          w: {
            type: 'num',
            value: 1400,
          },
          h: {
            type: 'num',
            value: 900,
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
              type: 'gk:moveWithKeys',
              charVar: 'fazendeiro',
              dtVar: 'dt',
            },
            {
              type: 'gk:keepOnScreen',
              charVar: 'fazendeiro',
            },
            {
              type: 'var',
              name: 'cx',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charX',
                  charVar: 'fazendeiro',
                },
                right: {
                  type: 'num',
                  value: 17,
                },
              },
              kind: 'const',
            },
            {
              type: 'var',
              name: 'cy',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charY',
                  charVar: 'fazendeiro',
                },
                right: {
                  type: 'num',
                  value: 18,
                },
              },
              kind: 'const',
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'q',
              },
              then: [
                {
                  type: 'assign',
                  name: 'ferramenta',
                  value: {
                    type: 'binop',
                    op: '%',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'var',
                        name: 'ferramenta',
                      },
                      right: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    right: {
                      type: 'num',
                      value: 3,
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: ' ',
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
                    value: 24,
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
                                type: 'var',
                                name: 'cx',
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
                                type: 'var',
                                name: 'cx',
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
                                  value: 84,
                                },
                              },
                            },
                          },
                          right: {
                            type: 'binop',
                            op: '>=',
                            left: {
                              type: 'var',
                              name: 'cy',
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
                            type: 'var',
                            name: 'cy',
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
                              value: 84,
                            },
                          },
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'logical',
                            op: '&&',
                            left: {
                              type: 'binop',
                              op: '==',
                              left: {
                                type: 'var',
                                name: 'ferramenta',
                              },
                              right: {
                                type: 'num',
                                value: 0,
                              },
                            },
                            right: {
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
                              type: 'gk:playEffect',
                              fx: 'click',
                            },
                          ],
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'logical',
                            op: '&&',
                            left: {
                              type: 'binop',
                              op: '==',
                              left: {
                                type: 'var',
                                name: 'ferramenta',
                              },
                              right: {
                                type: 'num',
                                value: 1,
                              },
                            },
                            right: {
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
                            {
                              type: 'gk:playEffect',
                              fx: 'powerup',
                            },
                          ],
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'logical',
                            op: '&&',
                            left: {
                              type: 'binop',
                              op: '==',
                              left: {
                                type: 'var',
                                name: 'ferramenta',
                              },
                              right: {
                                type: 'num',
                                value: 2,
                              },
                            },
                            right: {
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
                          },
                          then: [
                            {
                              type: 'indexSet',
                              object: {
                                type: 'var',
                                name: 'molhado',
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
                              type: 'gk:playEffect',
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
                type: 'gk:keyPressed',
                key: 'c',
              },
              then: [
                {
                  type: 'assign',
                  name: 'dia',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'dia',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
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
                    value: 24,
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
                        right: {
                          type: 'binop',
                          op: '==',
                          left: {
                            type: 'index',
                            arrayVar: 'molhado',
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
                        {
                          type: 'indexSet',
                          object: {
                            type: 'var',
                            name: 'molhado',
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
                      ],
                    },
                  ],
                },
              ],
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
                value: 24,
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
                          type: 'logical',
                          op: '&&',
                          left: {
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
                          right: {
                            type: 'binop',
                            op: '>=',
                            left: {
                              type: 'var',
                              name: 'cx',
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
                        },
                        right: {
                          type: 'binop',
                          op: '<',
                          left: {
                            type: 'var',
                            name: 'cx',
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
                              value: 84,
                            },
                          },
                        },
                      },
                      right: {
                        type: 'binop',
                        op: '>=',
                        left: {
                          type: 'var',
                          name: 'cy',
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
                        type: 'var',
                        name: 'cy',
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
                          value: 84,
                        },
                      },
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
                      name: 'colheita',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'colheita',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'gk:floatText',
                      text: {
                        type: 'str',
                        value: '+1',
                      },
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
                          value: 40,
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
                      color: '#ffd24a',
                      size: {
                        type: 'num',
                        value: 18,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'coin',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'v',
              },
              then: [
                {
                  type: 'gk:rpgMenu',
                  title: {
                    type: 'str',
                    value: 'Vender a colheita no mercado?',
                  },
                  body: [
                    {
                      type: 'gk:rpgOption',
                      label: {
                        type: 'str',
                        value: 'Vender tudo',
                      },
                      body: [
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
                              type: 'binop',
                              op: '*',
                              left: {
                                type: 'var',
                                name: 'colheita',
                              },
                              right: {
                                type: 'num',
                                value: 5,
                              },
                            },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'colheita',
                          value: {
                            type: 'num',
                            value: 0,
                          },
                        },
                      ],
                    },
                    {
                      type: 'gk:rpgOption',
                      label: {
                        type: 'str',
                        value: 'Agora não',
                      },
                      body: [],
                    },
                  ],
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
                  name: 'moedas',
                },
                right: {
                  type: 'num',
                  value: 50,
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
              color: '#3a5a2a',
              grid: true,
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
                value: 24,
              },
              step: {
                type: 'num',
                value: 1,
              },
              body: [
                {
                  type: 'canvasFillStyle',
                  ctxVar: 'ctx',
                  color: {
                    type: 'color',
                    value: '#6b4a2b',
                  },
                },
                {
                  type: 'canvasFillRect',
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
                    value: 84,
                  },
                  h: {
                    type: 'num',
                    value: 84,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'index',
                      arrayVar: 'molhado',
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
                      type: 'canvasFillStyle',
                      ctxVar: 'ctx',
                      color: {
                        type: 'color',
                        value: '#4a3320',
                      },
                    },
                  ],
                  else: [
                    {
                      type: 'canvasFillStyle',
                      ctxVar: 'ctx',
                      color: {
                        type: 'color',
                        value: '#7a5636',
                      },
                    },
                  ],
                },
                {
                  type: 'canvasFillRect',
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
                      value: 6,
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
                      value: 6,
                    },
                  },
                  w: {
                    type: 'num',
                    value: 72,
                  },
                  h: {
                    type: 'num',
                    value: 72,
                  },
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
                      type: 'canvasFillStyle',
                      ctxVar: 'ctx',
                      color: {
                        type: 'color',
                        value: '#5a4326',
                      },
                    },
                    {
                      type: 'canvasFillRect',
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
                          value: 14,
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
                          value: 28,
                        },
                      },
                      w: {
                        type: 'num',
                        value: 56,
                      },
                      h: {
                        type: 'num',
                        value: 6,
                      },
                    },
                    {
                      type: 'canvasFillRect',
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
                          value: 14,
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
                          value: 48,
                        },
                      },
                      w: {
                        type: 'num',
                        value: 56,
                      },
                      h: {
                        type: 'num',
                        value: 6,
                      },
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
                      type: 'canvasFillStyle',
                      ctxVar: 'ctx',
                      color: {
                        type: 'color',
                        value: '#4fae3a',
                      },
                    },
                    {
                      type: 'canvasArc',
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
                          value: 42,
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
                          value: 50,
                        },
                      },
                      r: {
                        type: 'num',
                        value: 14,
                      },
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
                      type: 'canvasFillStyle',
                      ctxVar: 'ctx',
                      color: {
                        type: 'color',
                        value: '#ffd24a',
                      },
                    },
                    {
                      type: 'canvasArc',
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
                          value: 42,
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
                          value: 42,
                        },
                      },
                      r: {
                        type: 'num',
                        value: 20,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'fazendeiro',
            },
            {
              type: 'gk:drawEffects',
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
                value: '#fff8e1',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 22,
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
                  value: 'Ferramenta: ',
                },
                right: {
                  type: 'index',
                  arrayVar: 'ferramentas',
                  index: {
                    type: 'var',
                    name: 'ferramenta',
                  },
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 34,
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
                  value: 'Moedas: ',
                },
                right: {
                  type: 'var',
                  name: 'moedas',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 62,
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
                  value: 'Colheita: ',
                },
                right: {
                  type: 'var',
                  name: 'colheita',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 90,
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
                  value: 'Dia: ',
                },
                right: {
                  type: 'var',
                  name: 'dia',
                },
              },
              x: {
                type: 'num',
                value: 820,
              },
              y: {
                type: 'num',
                value: 34,
              },
            },
          ],
        },
      ],
    },
  },
})
