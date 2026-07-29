import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Salto na Floresta" — o 🏃 Kit Plataforma inteiro num
 * mini-jogo SEM assets (tudo retângulo colorido): herói tudo-em-um com o pulo
 * gostoso (coyote + buffer + pulo variável), chão sólido, tábua de atravessar
 * por baixo, plataforma que anda e CARREGA, pisar no bicho (por velocidade),
 * patrulha que vira na parede, checkpoint/renascer no buraco e faíscas.
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o mesmo
 * código vive no drift test `examples.test.ts` — se o parser mudar a saída, o
 * teste manda re-embutir aqui).
 */
export const saltoNaFlorestaExample: ExtensionExample = {
  name: 'Salto na Floresta',
  experience: 'game',
  description:
    'Um jogo de plataforma de verdade: pulo gostoso (dá para pular saindo da beirada!), tábuas que se atravessa por baixo, plataforma que anda e te leva junto, e bichos que você derrota pisando. Pegue as 5 frutas!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
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
          bg: '#87ceeb',
          accent: '#e07a3f',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Salto na Floresta',
          },
          text: {
            type: 'str',
            value: 'Setas ou A/D para andar - espaço para pular - pise nos bichos!',
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
            value: 'Você chegou!',
          },
          text: {
            type: 'str',
            value: 'Pegou as 5 frutas e chegou na bandeira!',
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
            value: 'Ai!',
          },
          text: {
            type: 'str',
            value: 'Um bicho te pegou. Tente de novo!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:setJumpFeel',
          coyote: {
            type: 'num',
            value: 0.1,
          },
          buffer: {
            type: 'num',
            value: 0.1,
          },
          hold: {
            type: 'num',
            value: 0.3,
          },
          gravity: {
            type: 'num',
            value: 2160,
          },
        },
        {
          type: 'gk:defineMold',
          name: 'chao',
          w: {
            type: 'num',
            value: 200,
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
          color: '#3f7d3f',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'tabua',
          w: {
            type: 'num',
            value: 120,
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
            value: 0,
          },
          color: '#a0522d',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'movel',
          w: {
            type: 'num',
            value: 120,
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
          color: '#c08040',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'bicho',
          w: {
            type: 'num',
            value: 36,
          },
          h: {
            type: 'num',
            value: 36,
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
          color: '#8b3a3a',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineMold',
          name: 'fruta',
          w: {
            type: 'num',
            value: 22,
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
          color: '#e6398b',
          image: '',
          look: '',
        },
        {
          type: 'gk:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 10,
          },
          color: '#ffffff',
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
            value: 120,
          },
          gravity: {
            type: 'num',
            value: 300,
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
            value: 46,
          },
          speed: {
            type: 'num',
            value: 240,
          },
          color: '#2b6cb0',
        },
        {
          type: 'var',
          name: 'frutas',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'assign',
          name: 'frutas',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:setCheckpoint',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:respawn',
          charVar: 'heroi',
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 460,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 260,
          },
          y: {
            type: 'num',
            value: 460,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 460,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 520,
          },
          y: {
            type: 'num',
            value: 360,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 210,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 760,
          },
          y: {
            type: 'num',
            value: 260,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'movel',
          x: {
            type: 'num',
            value: 380,
          },
          y: {
            type: 'num',
            value: 380,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'bicho',
          x: {
            type: 'num',
            value: 300,
          },
          y: {
            type: 'num',
            value: 424,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'bicho',
          x: {
            type: 'num',
            value: 740,
          },
          y: {
            type: 'num',
            value: 424,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'fruta',
          x: {
            type: 'num',
            value: 240,
          },
          y: {
            type: 'num',
            value: 250,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'fruta',
          x: {
            type: 'num',
            value: 560,
          },
          y: {
            type: 'num',
            value: 310,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'fruta',
          x: {
            type: 'num',
            value: 800,
          },
          y: {
            type: 'num',
            value: 210,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'fruta',
          x: {
            type: 'num',
            value: 420,
          },
          y: {
            type: 'num',
            value: 330,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'fruta',
          x: {
            type: 'num',
            value: 120,
          },
          y: {
            type: 'num',
            value: 410,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'plataforma:pisou',
          body: [
            {
              type: 'gk:burst',
              effect: 'poeira',
              x: {
                type: 'gk:charX',
                charVar: 'heroi',
              },
              y: {
                type: 'gk:charY',
                charVar: 'heroi',
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
              mold: 'movel',
              itemName: 'item',
              body: [
                {
                  type: 'gk:movingPlatform',
                  charVar: 'item',
                  x1: {
                    type: 'num',
                    value: 380,
                  },
                  y1: {
                    type: 'num',
                    value: 380,
                  },
                  x2: {
                    type: 'num',
                    value: 620,
                  },
                  y2: {
                    type: 'num',
                    value: 380,
                  },
                  seconds: {
                    type: 'num',
                    value: 3,
                  },
                  dtVar: 'dt',
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'bicho',
              itemName: 'item',
              body: [
                {
                  type: 'gk:patrolTurnAtWall',
                  charVar: 'item',
                  speed: {
                    type: 'num',
                    value: 60,
                  },
                },
                {
                  type: 'gk:applyGravity',
                  charVar: 'item',
                  g: {
                    type: 'num',
                    value: 2160,
                  },
                  dtVar: 'dt',
                },
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'item',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:collideGroup',
                  charVar: 'item',
                  mold: 'chao',
                },
              ],
            },
            {
              type: 'gk:platformerHero',
              charVar: 'heroi',
              speed: {
                type: 'num',
                value: 240,
              },
              force: {
                type: 'num',
                value: 660,
              },
              dtVar: 'dt',
            },
            {
              type: 'gk:dropThrough',
              charVar: 'heroi',
            },
            {
              type: 'gk:collideGroup',
              charVar: 'heroi',
              mold: 'chao',
            },
            {
              type: 'gk:oneWayPlatform',
              charVar: 'heroi',
              mold: 'tabua',
              dtVar: 'dt',
            },
            {
              type: 'gk:rideOn',
              charVar: 'heroi',
              mold: 'movel',
            },
            {
              type: 'gk:stompKill',
              charVar: 'heroi',
              mold: 'bicho',
              bounce: {
                type: 'num',
                value: 400,
              },
            },
            {
              type: 'gk:platformerAnim',
              charVar: 'heroi',
            },
            {
              type: 'gk:forEachActive',
              mold: 'fruta',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'item',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'frutas',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'frutas',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'gk:burst',
                      effect: 'poeira',
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
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'bicho',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'item',
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
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'gk:charY',
                  charVar: 'heroi',
                },
                right: {
                  type: 'num',
                  value: 540,
                },
              },
              then: [
                {
                  type: 'gk:respawn',
                  charVar: 'heroi',
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
                  name: 'frutas',
                },
                right: {
                  type: 'num',
                  value: 5,
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
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'SZGameKit',
              },
              method: 'drawBackground',
              args: [],
            },
            {
              type: 'gk:drawActive',
              mold: 'chao',
            },
            {
              type: 'gk:drawActive',
              mold: 'tabua',
            },
            {
              type: 'gk:drawActive',
              mold: 'movel',
            },
            {
              type: 'gk:drawActive',
              mold: 'fruta',
            },
            {
              type: 'gk:drawActive',
              mold: 'bicho',
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
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'SZGameKit',
              },
              method: 'drawEffects',
              args: [
                {
                  type: 'var',
                  name: 'ctx',
                },
              ],
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
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Frutas: ',
                  },
                  right: {
                    type: 'var',
                    name: 'frutas',
                  },
                },
                right: {
                  type: 'str',
                  value: '/5',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 36,
              },
            },
          ],
        },
      ],
    },
  },
}
