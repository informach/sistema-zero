import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Sobrevivente Profissional" — o nível 2 da família Vampire
 * Survivor do Clear Code, sobre o motor avançado. Mundo maior que a tela com
 * cameraFollow, mira contínua no MOUSE (launchToPoint em mouseX/mouseY no ritmo
 * do cooldown), horda com pool (defineMold + startSpawner + seek + cullOffscreen),
 * combate P24 (touchCircle + isInvincible -> hurt + knockback + drawHealthBar) e
 * a PROGRESSÃO que o básico não tem: cada monstrinho dá EXP, encher a barra sobe
 * de nível e acelera a arma. Placar por tempo + recorde persistente + missão.
 *
 * A IR foi GERADA pelo parser real a partir de __gen_sobreviventeProfissional.ts
 * (drift test: sobreviventeProfissionalExample.test.ts manda re-embutir aqui).
 */
export const sobreviventeProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Sobrevivente Profissional',
  experience: 'game',
  description:
    'A sobrevivência do motor avançado: mundo com câmera, mira contínua no mouse, horda com pool que persegue, vida com knockback, e cada monstrinho derrotado dá EXP para subir de nível e atirar mais rápido. Setas ou WASD.',
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
          name: 'heroi',
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
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 17,
              },
              r: {
                type: 'num',
                value: 15,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#dbe9ff',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 4,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 34,
          },
          baseH: {
            type: 'num',
            value: 34,
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
                value: '#e05a5a',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 16,
              },
              r: {
                type: 'num',
                value: 15,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2a0f14',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 11,
              },
              y: {
                type: 'num',
                value: 13,
              },
              r: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 21,
              },
              y: {
                type: 'num',
                value: 13,
              },
              r: {
                type: 'num',
                value: 3,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 32,
          },
          baseH: {
            type: 'num',
            value: 32,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'bala',
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
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 5,
              },
              y: {
                type: 'num',
                value: 5,
              },
              r: {
                type: 'num',
                value: 5,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 10,
          },
          baseH: {
            type: 'num',
            value: 10,
          },
        },
        {
          type: 'gk:defineMold',
          name: 'monstro',
          w: {
            type: 'num',
            value: 32,
          },
          h: {
            type: 'num',
            value: 32,
          },
          health: {
            type: 'num',
            value: 2,
          },
          speed: {
            type: 'num',
            value: 62,
          },
          damage: {
            type: 'num',
            value: 1,
          },
          color: '#e05a5a',
          image: '',
          look: 'monstro',
        },
        {
          type: 'gk:defineMold',
          name: 'bala',
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
          color: '#9cff57',
          image: '',
          look: 'bala',
        },
        {
          type: 'gk:defineEffect',
          name: 'estouro',
          count: {
            type: 'num',
            value: 16,
          },
          color: '#ffb347',
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
            value: 220,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
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
          bg: '#140f24',
          accent: '#9cff57',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Sobrevivente Profissional',
          },
          text: {
            type: 'str',
            value:
              'Setas ou WASD: fugir. O mouse mira e a arma atira sozinha. Aguente 90 segundos ou derrote 30 monstrinhos!',
          },
          button: {
            type: 'str',
            value: 'Começar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'Os monstrinhos te alcançaram!',
          },
          text: {
            type: 'str',
            value: 'O recorde fica guardado. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 34,
          },
          h: {
            type: 'num',
            value: 34,
          },
          speed: {
            type: 'num',
            value: 190,
          },
          color: '#4f8fea',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'heroi',
          x: {
            type: 'num',
            value: 800,
          },
          y: {
            type: 'num',
            value: 500,
          },
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'parado',
          look: 'heroi',
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
          name: 'cadencia',
          value: {
            type: 'num',
            value: 0.35,
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
          type: 'gk:cameraFollow',
          charVar: 'heroi',
          w: {
            type: 'num',
            value: 1600,
          },
          h: {
            type: 'num',
            value: 1000,
          },
        },
        {
          type: 'gk:setMission',
          seconds: {
            type: 'num',
            value: 90,
          },
          killCount: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'gk:startSpawner',
          mold: 'monstro',
          seconds: {
            type: 'num',
            value: 0.7,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'heroi:morreu',
          body: [
            {
              type: 'gk:burst',
              effect: 'estouro',
              x: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charX',
                  charVar: 'heroi',
                },
                right: {
                  type: 'num',
                  value: 17,
                },
              },
              y: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'gk:charY',
                  charVar: 'heroi',
                },
                right: {
                  type: 'num',
                  value: 17,
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
                value: 'Os monstrinhos te alcançaram!',
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
                value: 'Tentar de novo',
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
              charVar: 'heroi',
              dtVar: 'dt',
            },
            {
              type: 'gk:keepOnScreen',
              charVar: 'heroi',
            },
            {
              type: 'if',
              cond: {
                type: 'gk:cooldownReady',
                charVar: 'heroi',
                seconds: {
                  type: 'var',
                  name: 'cadencia',
                },
              },
              then: [
                {
                  type: 'gk:spawnNamed',
                  varName: 'bala',
                  mold: 'bala',
                  x: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'gk:charX',
                      charVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 12,
                    },
                  },
                  y: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'gk:charY',
                      charVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 12,
                    },
                  },
                },
                {
                  type: 'gk:launchToPoint',
                  charVar: 'bala',
                  x: {
                    type: 'gk:mouseX',
                  },
                  y: {
                    type: 'gk:mouseY',
                  },
                  speed: {
                    type: 'num',
                    value: 640,
                  },
                },
                {
                  type: 'gk:playEffect',
                  fx: 'laser',
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'monstro',
              itemName: 'item',
              body: [
                {
                  type: 'gk:seek',
                  charVar: 'item',
                  targetVar: 'heroi',
                  dtVar: 'dt',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:touchCircle',
                    aVar: 'heroi',
                    bVar: 'item',
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logicalNot',
                        value: {
                          type: 'gk:isInvincible',
                          charVar: 'heroi',
                        },
                      },
                      then: [
                        {
                          type: 'gk:hurt',
                          charVar: 'heroi',
                          amount: {
                            type: 'num',
                            value: 8,
                          },
                          iframes: {
                            type: 'num',
                            value: 0.8,
                          },
                        },
                        {
                          type: 'gk:knockback',
                          charVar: 'heroi',
                          fromVar: 'item',
                          force: {
                            type: 'num',
                            value: 7,
                          },
                        },
                        {
                          type: 'gk:playEffect',
                          fx: 'hurt',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'bala',
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
              moldA: 'bala',
              bName: 'bicho',
              moldB: 'monstro',
              body: [
                {
                  type: 'gk:hurt',
                  charVar: 'bicho',
                  amount: {
                    type: 'num',
                    value: 1,
                  },
                  iframes: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'gk:recycle',
                  charVar: 'tiro',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:isDead',
                    charVar: 'bicho',
                  },
                  then: [
                    {
                      type: 'gk:burst',
                      effect: 'estouro',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charX',
                          charVar: 'bicho',
                        },
                        right: {
                          type: 'num',
                          value: 16,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charY',
                          charVar: 'bicho',
                        },
                        right: {
                          type: 'num',
                          value: 16,
                        },
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'explosion',
                    },
                    {
                      type: 'gk:recycle',
                      charVar: 'bicho',
                    },
                    {
                      type: 'gk:missionKill',
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
                          value: 3,
                        },
                      },
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
                      type: 'gk:floatText',
                      text: {
                        type: 'str',
                        value: '+1',
                      },
                      x: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charX',
                          charVar: 'bicho',
                        },
                        right: {
                          type: 'num',
                          value: 16,
                        },
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'bicho',
                      },
                      color: '#9cff57',
                      size: {
                        type: 'num',
                        value: 18,
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
                            value: 4,
                          },
                        },
                      },
                      then: [
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
                              value: 0.14,
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
                                  type: 'num',
                                  value: 0.03,
                                },
                              },
                            },
                          ],
                        },
                        {
                          type: 'gk:floatText',
                          text: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'str',
                              value: 'Nivel ',
                            },
                            right: {
                              type: 'var',
                              name: 'nivel',
                            },
                          },
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'gk:charX',
                              charVar: 'heroi',
                            },
                            right: {
                              type: 'num',
                              value: 8,
                            },
                          },
                          y: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'gk:charY',
                              charVar: 'heroi',
                            },
                            right: {
                              type: 'num',
                              value: 24,
                            },
                          },
                          color: '#ffd166',
                          size: {
                            type: 'num',
                            value: 20,
                          },
                        },
                        {
                          type: 'gk:playEffect',
                          fx: 'powerup',
                        },
                      ],
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
                value: 260,
              },
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'bala',
              margin: {
                type: 'num',
                value: 260,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'gk:isDead',
                charVar: 'heroi',
              },
              then: [
                {
                  type: 'gk:emit',
                  event: 'heroi:morreu',
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
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#1c1533',
              grid: true,
            },
            {
              type: 'gk:drawActive',
              mold: 'monstro',
            },
            {
              type: 'gk:drawActive',
              mold: 'bala',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawHealthBar',
              charVar: 'heroi',
              max: {
                type: 'num',
                value: 0,
              },
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
                value: 62,
              },
            },
            {
              type: 'gk:drawTimer',
              x: {
                type: 'num',
                value: 820,
              },
              y: {
                type: 'num',
                value: 34,
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
                  value: 4,
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 76,
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
