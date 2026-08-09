import type { ExtensionExample } from '#extensions'

/**
 * 🛸 "Invasão dos Óvnis" — a vitrine do 🚀 Kit Nave (asset-free: tudo retângulo
 * colorido). Usa os 8 blocos do kit + o juice do R21 (texto flutuante, leque) e
 * mostra a lição da dificuldade: onda:limpa → velocidade × 1.2 → nova onda.
 *
 * ⚠️ A IR foi GERADA pelo parser real (one-off); o drift vive no examples.test.ts.
 */
export const invasaoDosOvnisExample: ExtensionExample = {
  name: 'Invasão dos Óvnis',
  experience: 'game',
  description:
    'O clássico de nave com o Kit Nave: a formação marcha, desce e acelera; um óvni sorteado atira; power-up de metralhadora, bomba que explode em área e placar com vidas. Não deixe a invasão chegar embaixo!',
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
          name: 'ovni',
          w: {
            type: 'num',
            value: 44,
          },
          h: {
            type: 'num',
            value: 32,
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
            value: 10,
          },
          color: '#5ad66f',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'tiro',
          w: {
            type: 'num',
            value: 6,
          },
          h: {
            type: 'num',
            value: 16,
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
          type: 'gk:defineMold',
          name: 'tiro-ovni',
          w: {
            type: 'num',
            value: 4,
          },
          h: {
            type: 'num',
            value: 12,
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
            value: 10,
          },
          color: '#ffffff',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'bomba',
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 24,
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
          color: '#ff922b',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 16,
          },
          color: '#9775fa',
          size: {
            type: 'num',
            value: 4,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          speed: {
            type: 'num',
            value: 200,
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
          bg: '#0b1020',
          accent: '#7cc7ff',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Invasão dos Óvnis',
          },
          text: {
            type: 'str',
            value: 'Setas ou A/D movem - espaço atira - não deixe descerem!',
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
            value: 'Fim de jogo',
          },
          text: {
            type: 'str',
            value: 'Os óvnis venceram desta vez. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'nave',
          image: '',
          w: {
            type: 'num',
            value: 52,
          },
          h: {
            type: 'num',
            value: 28,
          },
          speed: {
            type: 'num',
            value: 420,
          },
          color: '#7cc7ff',
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
          name: 'vidas',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'var',
          name: 'velocidade',
          value: {
            type: 'num',
            value: 150,
          },
        },
        {
          type: 'gk:naveInvasionLine',
          y: {
            type: 'num',
            value: 430,
          },
        },
        {
          type: 'gk:naveWaveShooter',
          mold: 'ovni',
          seconds: {
            type: 'num',
            value: 1.5,
          },
          bullet: 'tiro-ovni',
          speed: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'assign',
          name: 'pontos',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'vidas',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'assign',
          name: 'velocidade',
          value: {
            type: 'num',
            value: 150,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'nave',
          x: {
            type: 'num',
            value: 454,
          },
          y: {
            type: 'num',
            value: 480,
          },
        },
        {
          type: 'gk:naveWave',
          mold: 'ovni',
          cols: {
            type: 'num',
            value: 8,
          },
          rows: {
            type: 'num',
            value: 3,
          },
          gap: {
            type: 'num',
            value: 60,
          },
          speed: {
            type: 'var',
            name: 'velocidade',
          },
          drop: {
            type: 'num',
            value: 30,
          },
          accel: {
            type: 'num',
            value: 15,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'onda:limpa',
          body: [
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'num',
                  value: 1.2,
                },
              },
            },
            {
              type: 'gk:naveWave',
              mold: 'ovni',
              cols: {
                type: 'num',
                value: 8,
              },
              rows: {
                type: 'num',
                value: 3,
              },
              gap: {
                type: 'num',
                value: 60,
              },
              speed: {
                type: 'var',
                name: 'velocidade',
              },
              drop: {
                type: 'num',
                value: 30,
              },
              accel: {
                type: 'num',
                value: 15,
              },
            },
            {
              type: 'gk:playEffect',
              fx: 'win',
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'onda:invadiu',
          body: [
            {
              type: 'gk:endGame',
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'bomba:acertou',
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
                  value: 50,
                },
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
              type: 'gk:naveShip',
              charVar: 'nave',
              speed: {
                type: 'num',
                value: 420,
              },
              lean: {
                type: 'num',
                value: 10,
              },
              dtVar: 'dt',
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'gk:navePowerOf',
                  charVar: 'nave',
                },
                right: {
                  type: 'str',
                  value: 'metralhadora',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:keyDown',
                      key: ' ',
                    },
                    right: {
                      type: 'gk:cooldownReady',
                      charVar: 'nave',
                      seconds: {
                        type: 'num',
                        value: 0.12,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'gk:fanShot',
                      charVar: 'nave',
                      mold: 'tiro',
                      count: {
                        type: 'num',
                        value: 1,
                      },
                      arc: {
                        type: 'num',
                        value: 0,
                      },
                      degrees: {
                        type: 'num',
                        value: -90,
                      },
                      speed: {
                        type: 'num',
                        value: 600,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'laser',
                    },
                  ],
                },
              ],
              elseif: [
                {
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:navePowerOf',
                      charVar: 'nave',
                    },
                    right: {
                      type: 'str',
                      value: 'leque',
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '&&',
                        left: {
                          type: 'gk:keyPressed',
                          key: ' ',
                        },
                        right: {
                          type: 'gk:cooldownReady',
                          charVar: 'nave',
                          seconds: {
                            type: 'num',
                            value: 0.35,
                          },
                        },
                      },
                      then: [
                        {
                          type: 'gk:fanShot',
                          charVar: 'nave',
                          mold: 'tiro',
                          count: {
                            type: 'num',
                            value: 5,
                          },
                          arc: {
                            type: 'num',
                            value: 40,
                          },
                          degrees: {
                            type: 'num',
                            value: -90,
                          },
                          speed: {
                            type: 'num',
                            value: 600,
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
              ],
              else: [
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:keyPressed',
                      key: ' ',
                    },
                    right: {
                      type: 'gk:cooldownReady',
                      charVar: 'nave',
                      seconds: {
                        type: 'num',
                        value: 0.35,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'gk:fanShot',
                      charVar: 'nave',
                      mold: 'tiro',
                      count: {
                        type: 'num',
                        value: 1,
                      },
                      arc: {
                        type: 'num',
                        value: 0,
                      },
                      degrees: {
                        type: 'num',
                        value: -90,
                      },
                      speed: {
                        type: 'num',
                        value: 600,
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
              type: 'gk:forEachActive',
              mold: 'tiro-ovni',
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
                value: 100,
              },
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'tiro-ovni',
              margin: {
                type: 'num',
                value: 100,
              },
            },
            {
              type: 'gk:overlapGroups',
              aName: 'a',
              moldA: 'tiro',
              bName: 'b',
              moldB: 'ovni',
              body: [
                {
                  type: 'gk:recycle',
                  charVar: 'a',
                },
                {
                  type: 'gk:burst',
                  effect: 'explosao',
                  x: {
                    type: 'gk:charX',
                    charVar: 'b',
                  },
                  y: {
                    type: 'gk:charY',
                    charVar: 'b',
                  },
                },
                {
                  type: 'gk:floatText',
                  text: {
                    type: 'str',
                    value: '+100',
                  },
                  x: {
                    type: 'gk:charX',
                    charVar: 'b',
                  },
                  y: {
                    type: 'gk:charY',
                    charVar: 'b',
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 22,
                  },
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
                      value: 100,
                    },
                  },
                },
                {
                  type: 'gk:playEffect',
                  fx: 'explosion',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:chance',
                    percent: {
                      type: 'num',
                      value: 8,
                    },
                  },
                  then: [
                    {
                      type: 'gk:navePowerup',
                      charVar: 'nave',
                      power: 'metralhadora',
                      seconds: {
                        type: 'num',
                        value: 5,
                      },
                    },
                    {
                      type: 'gk:floatText',
                      text: {
                        type: 'str',
                        value: 'METRALHADORA!',
                      },
                      x: {
                        type: 'gk:charX',
                        charVar: 'b',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'b',
                      },
                      color: '#ffe066',
                      size: {
                        type: 'num',
                        value: 20,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:chance',
                    percent: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
                    {
                      type: 'gk:naveBomb',
                      mold: 'bomba',
                      radius: {
                        type: 'num',
                        value: 160,
                      },
                      target: 'ovni',
                    },
                  ],
                },
                {
                  type: 'gk:recycle',
                  charVar: 'b',
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'tiro-ovni',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'item',
                    bVar: 'nave',
                  },
                  then: [
                    {
                      type: 'gk:recycle',
                      charVar: 'item',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'logicalNot',
                        value: {
                          type: 'gk:isInvincible',
                          charVar: 'nave',
                        },
                      },
                      then: [
                        {
                          type: 'gk:hurt',
                          charVar: 'nave',
                          amount: {
                            type: 'num',
                            value: 0,
                          },
                          iframes: {
                            type: 'num',
                            value: 1.5,
                          },
                        },
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
                          type: 'gk:playEffect',
                          fx: 'hurt',
                        },
                        {
                          type: 'gk:floatText',
                          text: {
                            type: 'str',
                            value: '-1 vida',
                          },
                          x: {
                            type: 'gk:charX',
                            charVar: 'nave',
                          },
                          y: {
                            type: 'gk:charY',
                            charVar: 'nave',
                          },
                          color: '#ff6b6b',
                          size: {
                            type: 'num',
                            value: 20,
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
              color: '#0b1020',
              grid: false,
            },
            {
              type: 'gk:naveStarfield',
              count: {
                type: 'num',
                value: 100,
              },
              speed: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'gk:drawActive',
              mold: 'ovni',
            },
            {
              type: 'gk:drawActive',
              mold: 'tiro',
            },
            {
              type: 'gk:drawActive',
              mold: 'tiro-ovni',
            },
            {
              type: 'gk:drawActive',
              mold: 'bomba',
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
              type: 'gk:drawHearts',
              current: {
                type: 'var',
                name: 'vidas',
              },
              max: {
                type: 'num',
                value: 3,
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
                value: '#ffffff',
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
                value: 70,
              },
            },
          ],
        },
      ],
    },
  },
}
