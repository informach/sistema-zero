import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Defesa do Reino" (🏰 Kit Defesa de Torre — R26): a IR embutida foi
 * GERADA pelo parser real a partir do SOURCE do teste (one-off do R26).
 */
export const defesaDoReinoExample: ExtensionExample = {
  name: 'Defesa do Reino',
  experience: 'game',
  description:
    'Defenda o castelo com o Kit Defesa de Torre: clique nos lugares para comprar torres (elas miram sozinhas o invasor mais avançado no caminho), some moedas a cada inimigo derrotado e segure as ondas — cada uma vem maior. Deixou 5 passarem? O reino cai.',
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
          name: 'invasor',
          w: {
            type: 'num',
            value: 34,
          },
          h: {
            type: 'num',
            value: 34,
          },
          health: {
            type: 'num',
            value: 30,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#e0526a',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'torre',
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
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
          color: '#4a9eff',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'tiro',
          w: {
            type: 'num',
            value: 10,
          },
          h: {
            type: 'num',
            value: 10,
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
          color: '#ffe066',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineEffect',
          name: 'estouro',
          count: {
            type: 'num',
            value: 12,
          },
          color: '#ffd166',
          size: {
            type: 'num',
            value: 4,
          },
          life: {
            type: 'num',
            value: 0.4,
          },
          speed: {
            type: 'num',
            value: 160,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:definePath',
          name: 'trilha',
          body: [
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: -40,
              },
              y: {
                type: 'num',
                value: 120,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 300,
              },
              y: {
                type: 'num',
                value: 120,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 300,
              },
              y: {
                type: 'num',
                value: 400,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 660,
              },
              y: {
                type: 'num',
                value: 400,
              },
            },
            {
              type: 'gk:pathPoint',
              x: {
                type: 'num',
                value: 660,
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
                value: 1000,
              },
              y: {
                type: 'num',
                value: 200,
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
            value: 960,
          },
          h: {
            type: 'num',
            value: 540,
          },
          bg: '#26331f',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Defesa do Reino',
          },
          text: {
            type: 'str',
            value: 'Clique nos lugares para comprar torres - não deixe os invasores passarem!',
          },
          button: {
            type: 'str',
            value: 'Defender',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O reino caiu!',
          },
          text: {
            type: 'str',
            value: 'Os invasores passaram. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'castelo',
          image: '',
          w: {
            type: 'num',
            value: 44,
          },
          h: {
            type: 'num',
            value: 64,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          color: '#f4a259',
        },
        {
          type: 'var',
          name: 'vidas',
          value: {
            type: 'num',
            value: 5,
          },
        },
        {
          type: 'var',
          name: 'leva',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'gk:tdSetCoins',
          n: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'gk:tdSlot',
          x: {
            type: 'num',
            value: 300,
          },
          y: {
            type: 'num',
            value: 220,
          },
          size: {
            type: 'num',
            value: 60,
          },
        },
        {
          type: 'gk:tdSlot',
          x: {
            type: 'num',
            value: 420,
          },
          y: {
            type: 'num',
            value: 300,
          },
          size: {
            type: 'num',
            value: 60,
          },
        },
        {
          type: 'gk:tdSlot',
          x: {
            type: 'num',
            value: 560,
          },
          y: {
            type: 'num',
            value: 320,
          },
          size: {
            type: 'num',
            value: 60,
          },
        },
        {
          type: 'gk:tdSlot',
          x: {
            type: 'num',
            value: 660,
          },
          y: {
            type: 'num',
            value: 120,
          },
          size: {
            type: 'num',
            value: 60,
          },
        },
        {
          type: 'assign',
          name: 'vidas',
          value: {
            type: 'num',
            value: 5,
          },
        },
        {
          type: 'assign',
          name: 'leva',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'castelo',
          x: {
            type: 'num',
            value: 936,
          },
          y: {
            type: 'num',
            value: 168,
          },
        },
        {
          type: 'gk:tdWave',
          path: 'trilha',
          count: {
            type: 'var',
            name: 'leva',
          },
          mold: 'invasor',
          gap: {
            type: 'num',
            value: 150,
          },
          speed: {
            type: 'num',
            value: 90,
          },
        },
      ],
      events: [
        {
          type: 'gk:tdOnBuy',
          cost: {
            type: 'num',
            value: 50,
          },
          xName: 'lugarX',
          yName: 'lugarY',
          body: [
            {
              type: 'gk:spawnFromMold',
              mold: 'torre',
              x: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'lugarX',
                },
                right: {
                  type: 'num',
                  value: 20,
                },
              },
              y: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'lugarY',
                },
                right: {
                  type: 'num',
                  value: 20,
                },
              },
            },
            {
              type: 'gk:playEffect',
              fx: 'click',
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'compra:negada',
          body: [
            {
              type: 'gk:floatText',
              text: {
                type: 'str',
                value: 'sem moedas!',
              },
              x: {
                type: 'gk:mouseX',
              },
              y: {
                type: 'gk:mouseY',
              },
              color: '#ff6b6b',
              size: {
                type: 'num',
                value: 20,
              },
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'invasor:passou',
          body: [
            {
              type: 'assign',
              name: 'vidas',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'vidas',
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
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'vidas',
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
        {
          type: 'gk:onEvent',
          event: 'onda:limpa',
          body: [
            {
              type: 'assign',
              name: 'leva',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'leva',
                },
                right: {
                  type: 'num',
                  value: 2,
                },
              },
            },
            {
              type: 'gk:tdAddCoins',
              n: {
                type: 'num',
                value: 25,
              },
            },
            {
              type: 'gk:tdWave',
              path: 'trilha',
              count: {
                type: 'var',
                name: 'leva',
              },
              mold: 'invasor',
              gap: {
                type: 'num',
                value: 150,
              },
              speed: {
                type: 'num',
                value: 90,
              },
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
              type: 'gk:forEachActive',
              mold: 'torre',
              itemName: 'torre',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:cooldownReady',
                    charVar: 'torre',
                    seconds: {
                      type: 'num',
                      value: 0.8,
                    },
                  },
                  then: [
                    {
                      type: 'var',
                      name: 'alvo',
                      value: {
                        type: 'gk:pickActive',
                        mold: 'invasor',
                        mode: 'maior',
                        prop: 'pathProgress',
                      },
                      kind: 'const',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'var',
                        name: 'alvo',
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '<',
                            left: {
                              type: 'gk:distanceBetween',
                              a: 'torre',
                              b: 'alvo',
                            },
                            right: {
                              type: 'num',
                              value: 220,
                            },
                          },
                          then: [
                            {
                              type: 'gk:spawnNamed',
                              varName: 'tiro',
                              mold: 'tiro',
                              x: {
                                type: 'gk:charX',
                                charVar: 'torre',
                              },
                              y: {
                                type: 'gk:charY',
                                charVar: 'torre',
                              },
                            },
                            {
                              type: 'gk:launchTowards',
                              charVar: 'tiro',
                              targetVar: 'alvo',
                              speed: {
                                type: 'num',
                                value: 420,
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
            {
              type: 'gk:forEachActive',
              mold: 'tiro',
              itemName: 'item',
              body: [
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'item',
                  dtVar: 'dt',
                },
              ],
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'tiro',
              margin: {
                type: 'num',
                value: 60,
              },
            },
            {
              type: 'gk:overlapGroups',
              aName: 't',
              moldA: 'tiro',
              bName: 'inv',
              moldB: 'invasor',
              body: [
                {
                  type: 'gk:recycle',
                  charVar: 't',
                },
                {
                  type: 'gk:hurt',
                  charVar: 'inv',
                  amount: {
                    type: 'num',
                    value: 15,
                  },
                  iframes: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:isDead',
                    charVar: 'inv',
                  },
                  then: [
                    {
                      type: 'gk:burst',
                      effect: 'estouro',
                      x: {
                        type: 'gk:charX',
                        charVar: 'inv',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'inv',
                      },
                    },
                    {
                      type: 'gk:tdAddCoins',
                      n: {
                        type: 'num',
                        value: 10,
                      },
                    },
                    {
                      type: 'gk:floatText',
                      text: {
                        type: 'str',
                        value: '+10',
                      },
                      x: {
                        type: 'gk:charX',
                        charVar: 'inv',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'inv',
                      },
                      color: '#ffd166',
                      size: {
                        type: 'num',
                        value: 20,
                      },
                    },
                    {
                      type: 'gk:recycle',
                      charVar: 'inv',
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
              color: '#26331f',
              grid: true,
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#4a4028',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: -40,
              },
              y: {
                type: 'num',
                value: 102,
              },
              w: {
                type: 'num',
                value: 340,
              },
              h: {
                type: 'num',
                value: 36,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 282,
              },
              y: {
                type: 'num',
                value: 102,
              },
              w: {
                type: 'num',
                value: 36,
              },
              h: {
                type: 'num',
                value: 316,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 282,
              },
              y: {
                type: 'num',
                value: 382,
              },
              w: {
                type: 'num',
                value: 396,
              },
              h: {
                type: 'num',
                value: 36,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 642,
              },
              y: {
                type: 'num',
                value: 182,
              },
              w: {
                type: 'num',
                value: 36,
              },
              h: {
                type: 'num',
                value: 236,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 642,
              },
              y: {
                type: 'num',
                value: 182,
              },
              w: {
                type: 'num',
                value: 358,
              },
              h: {
                type: 'num',
                value: 36,
              },
            },
            {
              type: 'gk:tdDrawSlots',
            },
            {
              type: 'gk:forEachActive',
              mold: 'torre',
              itemName: 'torre',
              body: [
                {
                  type: 'gk:tdDrawRange',
                  charVar: 'torre',
                  radius: {
                    type: 'num',
                    value: 220,
                  },
                },
              ],
            },
            {
              type: 'gk:drawActive',
              mold: 'torre',
            },
            {
              type: 'gk:drawActive',
              mold: 'invasor',
            },
            {
              type: 'gk:drawActive',
              mold: 'tiro',
            },
            {
              type: 'gk:forEachActive',
              mold: 'invasor',
              itemName: 'inv',
              body: [
                {
                  type: 'gk:drawHealthBar',
                  charVar: 'inv',
                  max: {
                    type: 'num',
                    value: 0,
                  },
                },
              ],
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'castelo',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawHearts',
              current: {
                type: 'var',
                name: 'vidas',
              },
              max: {
                type: 'num',
                value: 5,
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffd166',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 24,
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
                  value: 'Moedas: ',
                },
                right: {
                  type: 'gk:tdCoins',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 70,
              },
            },
          ],
        },
      ],
    },
  },
}
