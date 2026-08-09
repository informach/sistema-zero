import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Herói que Evolui Profissional" — o nível 2 da família Zelda
 * do Clear Code, sobre o motor avançado. REUSA o combate do Vila Ninja (mundo com
 * câmera, FSM de inimigo por distância, attackFacing + didHit, hurt + knockback +
 * i-frames, drawHearts) e acrescenta o DIFERENCIAL que o Vila Ninja não ensina: a
 * economia de EXP com um MENU DE MELHORIA (rpgMenu) a cada nível (espada mais
 * forte, golpe mais longe ou passos rápidos). Enquanto o menu está aberto o mundo
 * congela (a flag "escolhendo" envolve o onUpdate), então o herói não toma dano
 * escolhendo nem desperdiça o último upgrade. Ondas por startSpawner; nível 6
 * vence. A IR foi GERADA pelo parser real a partir de __gen_heroiQueEvoluiProfissional.ts.
 */
export const heroiQueEvoluiProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Herói que Evolui Profissional',
  experience: 'game',
  description:
    'O RPG de evolução do motor avançado: mundo com câmera, combate com FSM de inimigo, e cada monstro dá EXP; a cada nível um menu deixa escolher a melhoria (espada, alcance ou velocidade). Setas ou WASD.',
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
          type: 'gk:defineLook',
          name: 'heroi parado',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2f6fbf',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 2,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f2c6a0',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#274b7a',
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
                value: 24,
              },
              h: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#1a2f4a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 11,
              },
              y: {
                type: 'num',
                value: 40,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 14,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 40,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 14,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 38,
          },
          baseH: {
            type: 'num',
            value: 54,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi andando',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2f6fbf',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 2,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f2c6a0',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#274b7a',
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
                value: 24,
              },
              h: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#1a2f4a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 40,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 14,
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
                value: 40,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 14,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 38,
          },
          baseH: {
            type: 'num',
            value: 54,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi golpe',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2f6fbf',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 5,
              },
              y: {
                type: 'num',
                value: 2,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f2c6a0',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#274b7a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 3,
              },
              y: {
                type: 'num',
                value: 20,
              },
              w: {
                type: 'num',
                value: 24,
              },
              h: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e9edf2',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 27,
              },
              y: {
                type: 'num',
                value: 24,
              },
              w: {
                type: 'num',
                value: 11,
              },
              h: {
                type: 'num',
                value: 5,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 38,
          },
          baseH: {
            type: 'num',
            value: 54,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'monstro',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8d55c9',
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
                value: 8,
              },
              w: {
                type: 'num',
                value: 32,
              },
              h: {
                type: 'num',
                value: 28,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f6f2ff',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 23,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#20122f',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 18,
              },
              w: {
                type: 'num',
                value: 3,
              },
              h: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 25,
              },
              y: {
                type: 'num',
                value: 18,
              },
              w: {
                type: 'num',
                value: 3,
              },
              h: {
                type: 'num',
                value: 3,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 40,
          },
          baseH: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:defineEffect',
          name: 'faisca',
          count: {
            type: 'num',
            value: 12,
          },
          color: '#ffe066',
          size: {
            type: 'num',
            value: 4,
          },
          life: {
            type: 'num',
            value: 0.35,
          },
          speed: {
            type: 'num',
            value: 190,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:defineMold',
          name: 'monstro',
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
            value: 12,
          },
          speed: {
            type: 'num',
            value: 96,
          },
          damage: {
            type: 'num',
            value: 10,
          },
          color: '#8d55c9',
          image: '',
          look: 'monstro',
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
          bg: '#2f5d3a',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Herói que Evolui Profissional',
          },
          text: {
            type: 'str',
            value:
              'Setas ou WASD: andar. Espaço: golpe na direção. A cada nível, escolha uma melhoria. Chegue ao nível 6!',
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
            value: 'Herói lendário!',
          },
          text: {
            type: 'str',
            value: 'Você chegou ao nível 6 evoluindo a cada batalha!',
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
            value: 'O herói caiu!',
          },
          text: {
            type: 'str',
            value: 'Os monstros venceram. Treine para evoluir mais!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'gk:createEmptyTilemap',
          name: 'campo',
          cols: {
            type: 'num',
            value: 26,
          },
          rows: {
            type: 'num',
            value: 16,
          },
          fill: {
            type: 'num',
            value: -1,
          },
          asset: '',
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 38,
          },
          h: {
            type: 'num',
            value: 54,
          },
          speed: {
            type: 'num',
            value: 230,
          },
          color: '#2f6fbf',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'heroi',
          x: {
            type: 'num',
            value: 600,
          },
          y: {
            type: 'num',
            value: 400,
          },
        },
        {
          type: 'gk:setHitbox',
          charVar: 'heroi',
          ox: {
            type: 'num',
            value: 6,
          },
          oy: {
            type: 'num',
            value: 22,
          },
          w: {
            type: 'num',
            value: 26,
          },
          h: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'gk:setSwingWindow',
          charVar: 'heroi',
          start: {
            type: 'num',
            value: 0.08,
          },
          active: {
            type: 'num',
            value: 0.16,
          },
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'parado',
          look: 'heroi parado',
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'andando',
          look: 'heroi andando',
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'golpe',
          look: 'heroi golpe',
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'dano',
          look: 'heroi parado',
        },
        {
          type: 'var',
          name: 'exp',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'nivel',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'dano',
          value: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'var',
          name: 'alcance',
          value: {
            type: 'num',
            value: 48,
          },
        },
        {
          type: 'var',
          name: 'rapidez',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'escolhendo',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:cameraFollowMap',
          charVar: 'heroi',
          map: 'campo',
        },
        {
          type: 'gk:startSpawner',
          mold: 'monstro',
          seconds: {
            type: 'num',
            value: 1.1,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEnterState',
          name: 'vitoria',
          body: [
            {
              type: 'gk:playEffect',
              fx: 'win',
            },
          ],
        },
        {
          type: 'gk:onEnterState',
          name: 'fim',
          body: [
            {
              type: 'gk:playEffect',
              fx: 'gameover',
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
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'escolhendo',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'gk:moveWithKeys',
                  charVar: 'heroi',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:setSpeedMultiplier',
                  charVar: 'heroi',
                  factor: {
                    type: 'var',
                    name: 'rapidez',
                  },
                },
                {
                  type: 'gk:keepOnScreen',
                  charVar: 'heroi',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:keyPressed',
                    key: ' ',
                  },
                  then: [
                    {
                      type: 'gk:playEffect',
                      fx: 'click',
                    },
                    {
                      type: 'gk:attackFacing',
                      charVar: 'heroi',
                      range: {
                        type: 'var',
                        name: 'alcance',
                      },
                      duration: {
                        type: 'num',
                        value: 0.3,
                      },
                    },
                  ],
                },
                {
                  type: 'gk:forEachActive',
                  mold: 'monstro',
                  itemName: 'item',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'gk:entityState',
                          charVar: 'item',
                        },
                        right: {
                          type: 'str',
                          value: 'golpe',
                        },
                      },
                      then: [
                        {
                          type: 'gk:seek',
                          charVar: 'item',
                          targetVar: 'heroi',
                          dtVar: 'dt',
                        },
                      ],
                      elseif: [
                        {
                          cond: {
                            type: 'binop',
                            op: '<',
                            left: {
                              type: 'gk:distanceBetween',
                              a: 'item',
                              b: 'heroi',
                            },
                            right: {
                              type: 'num',
                              value: 60,
                            },
                          },
                          then: [
                            {
                              type: 'gk:setEntityState',
                              charVar: 'item',
                              state: 'golpe',
                              seconds: {
                                type: 'num',
                                value: 0.5,
                              },
                            },
                          ],
                        },
                      ],
                      else: [
                        {
                          type: 'gk:setEntityState',
                          charVar: 'item',
                          state: 'andando',
                          seconds: {
                            type: 'num',
                            value: 0.1,
                          },
                        },
                        {
                          type: 'gk:seek',
                          charVar: 'item',
                          targetVar: 'heroi',
                          dtVar: 'dt',
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'gk:didHit',
                        aVar: 'heroi',
                        bVar: 'item',
                      },
                      then: [
                        {
                          type: 'gk:hurt',
                          charVar: 'item',
                          amount: {
                            type: 'var',
                            name: 'dano',
                          },
                          iframes: {
                            type: 'num',
                            value: 0.25,
                          },
                        },
                        {
                          type: 'gk:knockback',
                          charVar: 'item',
                          fromVar: 'heroi',
                          force: {
                            type: 'num',
                            value: 380,
                          },
                        },
                        {
                          type: 'gk:playEffect',
                          fx: 'hit',
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'gk:isDead',
                            charVar: 'item',
                          },
                          then: [
                            {
                              type: 'gk:burst',
                              effect: 'faisca',
                              x: {
                                type: 'gk:charX',
                                charVar: 'item',
                              },
                              y: {
                                type: 'gk:charY',
                                charVar: 'item',
                              },
                            },
                            {
                              type: 'gk:recycle',
                              charVar: 'item',
                            },
                            {
                              type: 'assign',
                              name: 'exp',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'exp',
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
                                op: '>=',
                                left: {
                                  type: 'var',
                                  name: 'exp',
                                },
                                right: {
                                  type: 'binop',
                                  op: '*',
                                  left: {
                                    type: 'var',
                                    name: 'nivel',
                                  },
                                  right: {
                                    type: 'num',
                                    value: 3,
                                  },
                                },
                              },
                              then: [
                                {
                                  type: 'assign',
                                  name: 'nivel',
                                  value: {
                                    type: 'binop',
                                    op: '+',
                                    left: {
                                      type: 'var',
                                      name: 'nivel',
                                    },
                                    right: {
                                      type: 'num',
                                      value: 1,
                                    },
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'exp',
                                  value: {
                                    type: 'num',
                                    value: 0,
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'escolhendo',
                                  value: {
                                    type: 'num',
                                    value: 1,
                                  },
                                },
                                {
                                  type: 'gk:playEffect',
                                  fx: 'powerup',
                                },
                                {
                                  type: 'gk:rpgMenu',
                                  title: {
                                    type: 'str',
                                    value: 'Subiu de nivel! Escolha a melhoria:',
                                  },
                                  body: [
                                    {
                                      type: 'gk:rpgOption',
                                      label: {
                                        type: 'str',
                                        value: 'Espada mais forte',
                                      },
                                      body: [
                                        {
                                          type: 'assign',
                                          name: 'dano',
                                          value: {
                                            type: 'binop',
                                            op: '+',
                                            left: {
                                              type: 'var',
                                              name: 'dano',
                                            },
                                            right: {
                                              type: 'num',
                                              value: 6,
                                            },
                                          },
                                        },
                                        {
                                          type: 'assign',
                                          name: 'escolhendo',
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
                                        value: 'Golpe mais longe',
                                      },
                                      body: [
                                        {
                                          type: 'assign',
                                          name: 'alcance',
                                          value: {
                                            type: 'binop',
                                            op: '+',
                                            left: {
                                              type: 'var',
                                              name: 'alcance',
                                            },
                                            right: {
                                              type: 'num',
                                              value: 12,
                                            },
                                          },
                                        },
                                        {
                                          type: 'assign',
                                          name: 'escolhendo',
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
                                        value: 'Passos mais rapidos',
                                      },
                                      body: [
                                        {
                                          type: 'assign',
                                          name: 'rapidez',
                                          value: {
                                            type: 'binop',
                                            op: '+',
                                            left: {
                                              type: 'var',
                                              name: 'rapidez',
                                            },
                                            right: {
                                              type: 'num',
                                              value: 0.2,
                                            },
                                          },
                                        },
                                        {
                                          type: 'assign',
                                          name: 'escolhendo',
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
                          ],
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '&&',
                        left: {
                          type: 'logical',
                          op: '&&',
                          left: {
                            type: 'binop',
                            op: '===',
                            left: {
                              type: 'gk:entityState',
                              charVar: 'item',
                            },
                            right: {
                              type: 'str',
                              value: 'golpe',
                            },
                          },
                          right: {
                            type: 'gk:charactersTouch',
                            aVar: 'item',
                            bVar: 'heroi',
                          },
                        },
                        right: {
                          type: 'logicalNot',
                          value: {
                            type: 'gk:isInvincible',
                            charVar: 'heroi',
                          },
                        },
                      },
                      then: [
                        {
                          type: 'gk:hurt',
                          charVar: 'heroi',
                          amount: {
                            type: 'gk:propertyOf',
                            charVar: 'item',
                            prop: 'damage',
                          },
                          iframes: {
                            type: 'num',
                            value: 1,
                          },
                        },
                        {
                          type: 'gk:knockback',
                          charVar: 'heroi',
                          fromVar: 'item',
                          force: {
                            type: 'num',
                            value: 320,
                          },
                        },
                        {
                          type: 'gk:playEffect',
                          fx: 'hurt',
                        },
                        {
                          type: 'gk:cameraShake',
                          intensity: {
                            type: 'num',
                            value: 6,
                          },
                          seconds: {
                            type: 'num',
                            value: 0.25,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'gk:cullOffscreen',
                  mold: 'monstro',
                  margin: {
                    type: 'num',
                    value: 320,
                  },
                },
                {
                  type: 'gk:autoAnimate',
                  charVar: 'heroi',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'binop',
                      op: '>=',
                      left: {
                        type: 'var',
                        name: 'nivel',
                      },
                      right: {
                        type: 'num',
                        value: 6,
                      },
                    },
                    right: {
                      type: 'binop',
                      op: '===',
                      left: {
                        type: 'var',
                        name: 'escolhendo',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
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
                    type: 'gk:isDead',
                    charVar: 'heroi',
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
              color: '#3f7d4e',
              grid: true,
            },
            {
              type: 'gk:drawShadow',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawByDepth',
              charVar: 'heroi',
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
              type: 'gk:drawHearts',
              current: {
                type: 'binop',
                op: '/',
                left: {
                  type: 'gk:healthOf',
                  charVar: 'heroi',
                },
                right: {
                  type: 'num',
                  value: 100,
                },
              },
              max: {
                type: 'num',
                value: 4,
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
                value: '#f3f6ff',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 20,
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
                  value: 'Nivel: ',
                },
                right: {
                  type: 'var',
                  name: 'nivel',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 66,
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
                  value: 'EXP: ',
                },
                right: {
                  type: 'var',
                  name: 'exp',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 92,
              },
            },
            {
              type: 'gk:drawBar',
              current: {
                type: 'var',
                name: 'exp',
              },
              max: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'var',
                  name: 'nivel',
                },
                right: {
                  type: 'num',
                  value: 3,
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 104,
              },
              w: {
                type: 'num',
                value: 160,
              },
              h: {
                type: 'num',
                value: 12,
              },
              color: '#ffd166',
            },
          ],
        },
      ],
    },
  },
})
