import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Chuva de Meteoros Profissional" — o nível 2 da família
 * Space Shooter (o shooter do curso raylib_intro recriado com o motor
 * avançado), SEM assets: nave, meteoro e laser são `defineLook` em blocos de
 * Canvas. Mostra a arquitetura P24 num shooter vertical: moldes com pool
 * (`defineMold` + `spawnFromMold` + `recycle` + `cullOffscreen` 300, o culling
 * do original), nascedouro por `everySeconds` com CADÊNCIA em variável que
 * encurta com o dt (a dificuldade progressiva em duas variáveis: cadência cai,
 * queda sobe), giro contínuo do meteoro POR ESTADO (`setAngle` + `angleOf` no
 * `forEachActive`, o rotation += 50*dt do original), nave nas 4 direções com
 * diagonal normalizada (`moveWithKeys` + `keepOnScreen` + `leanOnMove`), tiro
 * edge-trigger com recarga (`keyPressed` + `cooldownReady`), explosão por
 * EFEITO pooled (`defineEffect` + `burst`), aviso "nave:bateu" no event bus,
 * placar POR TEMPO e RECORDE persistente (`saveValue`/`savedValue`).
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o fonte
 * vive em `__gen_chuvaProfissional.ts` — se o parser mudar a saída, o drift
 * test `chuvaProfissionalExample.test.ts` manda re-embutir aqui).
 */
export const chuvaProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Chuva de Meteoros Profissional',
  experience: 'game',
  description:
    'A chuva de meteoros do motor avançado: moldes com pool, giro por estado, tiro com recarga, explosão por efeito, chuva que acelera sozinha e recorde guardado de verdade. Voe com setas ou WASD.',
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
          bg: '#0f0a19',
          accent: '#ffb347',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Chuva de Meteoros Profissional',
          },
          text: {
            type: 'str',
            value:
              'Setas ou WASD: voar para os 4 lados. Espaço: atirar. Desvie da chuva e destrua o que puder!',
          },
          button: {
            type: 'str',
            value: 'Decolar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'A nave explodiu!',
          },
          text: {
            type: 'str',
            value: 'O recorde fica guardado. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Decolar de novo',
          },
        },
        {
          type: 'gk:defineLook',
          name: 'nave',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#4f8fea',
              },
            },
            {
              type: 'canvasBeginPath',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasMoveTo',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 28,
              },
              y: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'canvasLineTo',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 52,
              },
              y: {
                type: 'num',
                value: 44,
              },
            },
            {
              type: 'canvasLineTo',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 44,
              },
            },
            {
              type: 'canvasClosePath',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFill',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#9cd3ff',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 22,
              },
              y: {
                type: 'num',
                value: 22,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 14,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffb347',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 24,
              },
              y: {
                type: 'num',
                value: 44,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 4,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 56,
          },
          baseH: {
            type: 'num',
            value: 48,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'meteoro',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8d99ae',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 32,
              },
              y: {
                type: 'num',
                value: 32,
              },
              r: {
                type: 'num',
                value: 30,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#6c757d',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 22,
              },
              y: {
                type: 'num',
                value: 24,
              },
              r: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 42,
              },
              y: {
                type: 'num',
                value: 40,
              },
              r: {
                type: 'num',
                value: 9,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 64,
          },
          baseH: {
            type: 'num',
            value: 64,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'laser',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#9cff57',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 6,
              },
              h: {
                type: 'num',
                value: 22,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 6,
          },
          baseH: {
            type: 'num',
            value: 22,
          },
        },
        {
          type: 'gk:defineMold',
          name: 'meteoro',
          w: {
            type: 'num',
            value: 64,
          },
          h: {
            type: 'num',
            value: 64,
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
            value: 1,
          },
          color: '#8d99ae',
          image: '',
          look: 'meteoro',
        },
        {
          type: 'gk:defineMold',
          name: 'laser',
          w: {
            type: 'num',
            value: 6,
          },
          h: {
            type: 'num',
            value: 22,
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
          color: '#9cff57',
          image: '',
          look: 'laser',
        },
        {
          type: 'gk:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 26,
          },
          color: '#ffb347',
          size: {
            type: 'num',
            value: 5,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          speed: {
            type: 'num',
            value: 240,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'nave',
          image: '',
          w: {
            type: 'num',
            value: 56,
          },
          h: {
            type: 'num',
            value: 48,
          },
          speed: {
            type: 'num',
            value: 340,
          },
          color: '#4f8fea',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'nave',
          x: {
            type: 'num',
            value: 452,
          },
          y: {
            type: 'num',
            value: 420,
          },
        },
        {
          type: 'gk:setHitbox',
          charVar: 'nave',
          ox: {
            type: 'num',
            value: 7,
          },
          oy: {
            type: 'num',
            value: 6,
          },
          w: {
            type: 'num',
            value: 42,
          },
          h: {
            type: 'num',
            value: 36,
          },
        },
        {
          type: 'gk:stateLook',
          charVar: 'nave',
          state: 'parado',
          look: 'nave',
        },
        {
          type: 'gk:leanOnMove',
          charVar: 'nave',
          degrees: {
            type: 'num',
            value: 10,
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
          name: 'recorde',
          value: {
            type: 'gk:savedValue',
            name: 'recorde',
          },
        },
        {
          type: 'var',
          name: 'cadencia',
          value: {
            type: 'num',
            value: 0.9,
          },
        },
        {
          type: 'var',
          name: 'queda',
          value: {
            type: 'num',
            value: 240,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'nave:bateu',
          body: [
            {
              type: 'gk:burst',
              effect: 'explosao',
              x: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charX',
                  charVar: 'nave',
                },
                right: {
                  type: 'num',
                  value: 28,
                },
              },
              y: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charY',
                  charVar: 'nave',
                },
                right: {
                  type: 'num',
                  value: 24,
                },
              },
            },
            {
              type: 'gk:playEffect',
              fx: 'explosion',
            },
            {
              type: 'gk:cameraShake',
              intensity: {
                type: 'num',
                value: 10,
              },
              seconds: {
                type: 'num',
                value: 0.4,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'var',
                  name: 'pontos',
                },
                right: {
                  type: 'var',
                  name: 'recorde',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'recorde',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                },
                {
                  type: 'gk:saveValue',
                  name: 'recorde',
                  value: {
                    type: 'var',
                    name: 'recorde',
                  },
                },
              ],
            },
            {
              type: 'gk:setScreenText',
              screen: 'fim',
              title: {
                type: 'str',
                value: 'A nave explodiu!',
              },
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'str',
                      value: 'Pontos: ',
                    },
                    right: {
                      type: 'var',
                      name: 'pontos',
                    },
                  },
                  right: {
                    type: 'str',
                    value: ' / Recorde: ',
                  },
                },
                right: {
                  type: 'var',
                  name: 'recorde',
                },
              },
              button: {
                type: 'str',
                value: 'Decolar de novo',
              },
            },
            {
              type: 'gk:endGame',
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
              type: 'gk:moveWithKeys',
              charVar: 'nave',
              dtVar: 'dt',
            },
            {
              type: 'gk:keepOnScreen',
              charVar: 'nave',
            },
            {
              type: 'gk:autoAnimate',
              charVar: 'nave',
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: ' ',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:cooldownReady',
                    charVar: 'nave',
                    seconds: {
                      type: 'num',
                      value: 0.25,
                    },
                  },
                  then: [
                    {
                      type: 'gk:spawnNamed',
                      varName: 'tiro',
                      mold: 'laser',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charX',
                          charVar: 'nave',
                        },
                        right: {
                          type: 'num',
                          value: 25,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'gk:charY',
                          charVar: 'nave',
                        },
                        right: {
                          type: 'num',
                          value: 20,
                        },
                      },
                    },
                    {
                      type: 'gk:setVelocity',
                      charVar: 'tiro',
                      vx: {
                        type: 'num',
                        value: 0,
                      },
                      vy: {
                        type: 'num',
                        value: -720,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'laser',
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
                  type: 'var',
                  name: 'cadencia',
                },
                right: {
                  type: 'num',
                  value: 0.35,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'cadencia',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'cadencia',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 0.03,
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
                  type: 'var',
                  name: 'queda',
                },
                right: {
                  type: 'num',
                  value: 430,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'queda',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'queda',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 10,
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
              type: 'gk:everySeconds',
              seconds: {
                type: 'var',
                name: 'cadencia',
              },
              body: [
                {
                  type: 'gk:spawnNamed',
                  varName: 'pedra',
                  mold: 'meteoro',
                  x: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'randomFloat',
                    },
                    right: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'gk:gameWidth',
                      },
                      right: {
                        type: 'num',
                        value: 64,
                      },
                    },
                  },
                  y: {
                    type: 'num',
                    value: -80,
                  },
                },
                {
                  type: 'gk:setVelocity',
                  charVar: 'pedra',
                  vx: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'randomFloat',
                      },
                      right: {
                        type: 'num',
                        value: 240,
                      },
                    },
                    right: {
                      type: 'num',
                      value: 120,
                    },
                  },
                  vy: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'queda',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'randomFloat',
                      },
                      right: {
                        type: 'num',
                        value: 120,
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'gk:everySeconds',
              seconds: {
                type: 'num',
                value: 1,
              },
              body: [
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
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'meteoro',
              itemName: 'item',
              body: [
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'item',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:setAngle',
                  charVar: 'item',
                  degrees: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'gk:angleOf',
                      charVar: 'item',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 120,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'nave',
                    bVar: 'item',
                  },
                  then: [
                    {
                      type: 'gk:emit',
                      event: 'nave:bateu',
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'laser',
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
              type: 'gk:overlapGroups',
              aName: 'tiro',
              moldA: 'laser',
              bName: 'pedra',
              moldB: 'meteoro',
              body: [
                {
                  type: 'gk:burst',
                  effect: 'explosao',
                  x: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'gk:charX',
                      charVar: 'pedra',
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
                      type: 'gk:charY',
                      charVar: 'pedra',
                    },
                    right: {
                      type: 'num',
                      value: 32,
                    },
                  },
                },
                {
                  type: 'gk:playEffect',
                  fx: 'explosion',
                },
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
                      value: 2,
                    },
                  },
                },
                {
                  type: 'gk:recycle',
                  charVar: 'tiro',
                },
                {
                  type: 'gk:recycle',
                  charVar: 'pedra',
                },
              ],
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'meteoro',
              margin: {
                type: 'num',
                value: 300,
              },
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'laser',
              margin: {
                type: 'num',
                value: 300,
              },
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#0f0a19',
              grid: false,
            },
            {
              type: 'gk:naveStarfield',
              count: {
                type: 'num',
                value: 30,
              },
              speed: {
                type: 'num',
                value: 26,
              },
            },
            {
              type: 'gk:drawActive',
              mold: 'meteoro',
            },
            {
              type: 'gk:drawActive',
              mold: 'laser',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'nave',
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
                value: '#f3f6ff',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 26,
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
                  value: 'Pontos: ',
                },
                right: {
                  type: 'var',
                  name: 'pontos',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 40,
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
                  value: 'Recorde: ',
                },
                right: {
                  type: 'var',
                  name: 'recorde',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 72,
              },
            },
          ],
        },
      ],
    },
  },
})
