import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Floresta Ninja" — o combate de ACAO (estilo Zelda) sem
 * assets: o heroi anda com WASD e GOLPEIA na direcao que olha (ESPACO); dois
 * ninjas PATRULHAM perto do posto e somem numa poeira ao apanhar; coracoes no
 * HUD. Usa profundidade (sombra) e as faiscas. Complementa a batalha por TURNOS
 * do Kit RPG com o outro estilo de luta.
 *
 * A IR foi GERADA pelo parser real a partir do script achatado (o mesmo codigo
 * vive no drift test examples.test.ts — se o parser mudar a saida, re-embutir).
 */
export const florestaNinjaExample: ExtensionExample = {
  name: 'Floresta Ninja',
  experience: 'game',
  description:
    'Aventura de acao: ande com WASD e GOLPEIE na direcao (ESPACO). Os ninjas patrulham e somem ao apanhar. Derrote os dois!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'gk:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 14,
          },
          color: '#d9f5c8',
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
            value: 180,
          },
          gravity: {
            type: 'num',
            value: 120,
          },
        },
      ],
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
          bg: '#16281c',
          accent: '#8fe388',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Floresta Ninja',
          },
          text: {
            type: 'str',
            value: 'WASD anda, ESPACO ataca. Derrote os ninjas!',
          },
          button: {
            type: 'str',
            value: 'Começar',
          },
        },
        {
          type: 'gk:createScreen',
          name: 'vitoria',
          title: {
            type: 'str',
            value: 'Você venceu!',
          },
          text: {
            type: 'str',
            value: 'Os ninjas foram derrotados!',
          },
        },
        {
          type: 'gk:addButton',
          screen: 'vitoria',
          label: {
            type: 'str',
            value: 'Jogar de novo',
          },
          body: [
            {
              type: 'gk:restartGame',
            },
          ],
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
          },
          speed: {
            type: 'num',
            value: 220,
          },
          color: '#8fe388',
        },
        {
          type: 'gk:createCharacter',
          varName: 'ninja1',
          image: '',
          w: {
            type: 'num',
            value: 36,
          },
          h: {
            type: 'num',
            value: 36,
          },
          speed: {
            type: 'num',
            value: 80,
          },
          color: '#e0526a',
        },
        {
          type: 'gk:createCharacter',
          varName: 'ninja2',
          image: '',
          w: {
            type: 'num',
            value: 36,
          },
          h: {
            type: 'num',
            value: 36,
          },
          speed: {
            type: 'num',
            value: 80,
          },
          color: '#e0526a',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'heroi',
          x: {
            type: 'num',
            value: 380,
          },
          y: {
            type: 'num',
            value: 280,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'ninja1',
          x: {
            type: 'num',
            value: 120,
          },
          y: {
            type: 'num',
            value: 120,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'ninja2',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 440,
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
                type: 'gk:keyPressed',
                key: ' ',
              },
              then: [
                {
                  type: 'gk:attackFacing',
                  charVar: 'heroi',
                  range: {
                    type: 'num',
                    value: 46,
                  },
                  duration: {
                    type: 'num',
                    value: 0.25,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'gk:isDead',
                  charVar: 'ninja1',
                },
              },
              then: [
                {
                  type: 'gk:patrolAround',
                  charVar: 'ninja1',
                  ox: {
                    type: 'num',
                    value: 120,
                  },
                  oy: {
                    type: 'num',
                    value: 120,
                  },
                  radius: {
                    type: 'num',
                    value: 130,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:didHit',
                    aVar: 'heroi',
                    bVar: 'ninja1',
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'ninja1',
                      amount: {
                        type: 'num',
                        value: 5,
                      },
                      iframes: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'gk:burst',
                      effect: 'poeira',
                      x: {
                        type: 'gk:charX',
                        charVar: 'ninja1',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'ninja1',
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'hit',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'gk:isDead',
                  charVar: 'ninja2',
                },
              },
              then: [
                {
                  type: 'gk:patrolAround',
                  charVar: 'ninja2',
                  ox: {
                    type: 'num',
                    value: 620,
                  },
                  oy: {
                    type: 'num',
                    value: 440,
                  },
                  radius: {
                    type: 'num',
                    value: 130,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:didHit',
                    aVar: 'heroi',
                    bVar: 'ninja2',
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'ninja2',
                      amount: {
                        type: 'num',
                        value: 5,
                      },
                      iframes: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'gk:burst',
                      effect: 'poeira',
                      x: {
                        type: 'gk:charX',
                        charVar: 'ninja2',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'ninja2',
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'hit',
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
                  type: 'gk:isDead',
                  charVar: 'ninja1',
                },
                right: {
                  type: 'gk:isDead',
                  charVar: 'ninja2',
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
              color: '#16281c',
              grid: true,
            },
            {
              type: 'gk:drawShadow',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'heroi',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'gk:isDead',
                  charVar: 'ninja1',
                },
              },
              then: [
                {
                  type: 'gk:drawShadow',
                  charVar: 'ninja1',
                },
                {
                  type: 'gk:drawCharacter',
                  charVar: 'ninja1',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'gk:isDead',
                  charVar: 'ninja2',
                },
              },
              then: [
                {
                  type: 'gk:drawShadow',
                  charVar: 'ninja2',
                },
                {
                  type: 'gk:drawCharacter',
                  charVar: 'ninja2',
                },
              ],
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
                type: 'num',
                value: 3,
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
          ],
        },
      ],
    },
  },
}
