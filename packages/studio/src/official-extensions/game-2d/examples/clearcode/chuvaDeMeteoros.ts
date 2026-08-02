import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo 'Chuva de Meteoros': o degrau BÁSICO da família Space Shooter do
 * curso raylib_intro. A nave voa nas 4 direções com diagonal normalizada
 * (topDown) presa na tela; espaço atira laser para CIMA (updateGroup puro, sem
 * gravidade); os meteoros do Kit espaço caem do topo numa raiz 'A cada 0,5
 * segundos' com x, tamanho, diagonal e velocidade sorteados (a pedra já GIRA
 * sozinha, como o Meteor original); laser acerta = explosão + som + remover os
 * dois; nave acerta = fim, com colisão perdoadora de 75% (setHitboxScale). O
 * placar é POR TEMPO (1 ponto por segundo, como o int(get_time()) do original)
 * com bônus de 2 por meteoro destruído, e uma raiz 'A cada 6 segundos' acelera
 * a chuva até um teto. Fundo de estrelas (drawStarfield) + música tensa.
 * Diferente do 'Nave contra Asteroides' (que anda só na horizontal e vence aos
 * 25 pontos): aqui a chuva é VERTICAL, a nave voa para todo lado e não tem
 * vitória, só o recorde de sobrevivência. A behavior abaixo foi GERADA pelo
 * parser real a partir do fonte em __gen_chuvaDeMeteoros.ts (drift test:
 * chuvaDeMeteorosExample.test.ts).
 */
export const chuvaDeMeteorosExample: ExtensionExample = beginnerGameExample({
  name: 'Chuva de Meteoros',
  experience: 'game',
  description:
    'Chuva de meteoros: voe com as setas para os 4 lados, desvie das pedras que caem girando e atire lasers com espaço. Cada segundo vivo vale 1 ponto e destruir meteoro dá bônus. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#05070f',
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
          background: '#0f0a19',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:fitScreen',
          percent: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:createShip',
          varName: 'nave',
          x: {
            type: 'num',
            value: 216,
          },
          y: {
            type: 'num',
            value: 230,
          },
          w: {
            type: 'num',
            value: 48,
          },
          h: {
            type: 'num',
            value: 42,
          },
          bodyColor: '#4f8fea',
          wingColor: '#9cd3ff',
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'nave',
          percent: {
            type: 'num',
            value: 75,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'tiros',
        },
        {
          type: 'g2d:createGroup',
          varName: 'meteoros',
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
          name: 'velocidade',
          value: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'g2d:playMusic',
          tune: 'tense',
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
                name: 'perdeu',
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
                name: 'jogando',
              },
              then: [
                {
                  type: 'g2d:spawnBullet',
                  groupVar: 'tiros',
                  x: {
                    type: 'g2d:centerX',
                    spriteVar: 'nave',
                  },
                  y: {
                    type: 'g2d:spriteY',
                    spriteVar: 'nave',
                  },
                  radius: {
                    type: 'num',
                    value: 4,
                  },
                  color: '#9cff57',
                  vx: {
                    type: 'num',
                    value: 0,
                  },
                  vy: {
                    type: 'num',
                    value: -6,
                  },
                },
                {
                  type: 'g2d:playShoot',
                },
              ],
            },
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
                name: 'perdeu',
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
              type: 'g2d:starfield',
              ctxVar: 'ctx',
              speed: {
                type: 'num',
                value: 2,
              },
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
                    value: 'Chuva de Meteoros',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Voe com as setas para os 4 lados e atire com espaço. Sobreviva o máximo que você conseguir!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para decolar',
                  },
                  bg: '#1d2440',
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
                  type: 'g2d:topDown',
                  spriteVar: 'nave',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'nave',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'tiros',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'meteoros',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'nave',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'meteoros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'meteoros',
                  bName: 'pedra',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'pedra',
                      color: '#ffb347',
                    },
                    {
                      type: 'g2d:playExplosion',
                    },
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'tiro',
                      groupVar: 'tiros',
                    },
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'pedra',
                      groupVar: 'meteoros',
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
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'nave',
                  groupVar: 'meteoros',
                  itemName: 'pedra',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'nave',
                      color: '#ff5d3d',
                    },
                    {
                      type: 'g2d:shake',
                      ctxVar: 'ctx',
                      intensity: {
                        type: 'num',
                        value: 8,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'gameover',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'perdeu',
                    },
                  ],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                  itemName: 'tiro',
                  body: [],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'meteoros',
                  ctxVar: 'ctx',
                  itemName: 'pedra',
                  body: [],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#f3f6ff',
                  size: {
                    type: 'num',
                    value: 22,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'perdeu',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'A nave explodiu!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos. Tente voar por mais tempo!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para decolar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 0.5,
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
                  type: 'g2d:spawnAsteroid',
                  groupVar: 'meteoros',
                  x: {
                    type: 'g2d:randomX',
                  },
                  y: {
                    type: 'num',
                    value: -40,
                  },
                  size: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: 22,
                    },
                    max: {
                      type: 'num',
                      value: 40,
                    },
                  },
                  color: '#b08968',
                  vx: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: -1,
                    },
                    max: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  vy: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'g2d:randomBetween',
                      min: {
                        type: 'num',
                        value: 0,
                      },
                      max: {
                        type: 'num',
                        value: 2,
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 1,
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
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 6,
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'velocidade',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'velocidade',
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
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
