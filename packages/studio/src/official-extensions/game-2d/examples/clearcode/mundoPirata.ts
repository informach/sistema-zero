import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo bundlado: "Mundo Pirata" (degrau BÁSICO da trilogia de plataforma
 * lateral do Clear Code — Super Pirate World). Gerado por __gen_mundoPirata.ts;
 * drift test: mundoPirataExample.test.ts.
 */
export const mundoPirataExample: ExtensionExample = beginnerGameExample({
  name: 'Mundo Pirata',
  experience: 'game',
  description:
    'Uma aventura de plataforma pirata: corra e pule com as setas por um mundo largo, pegue moedas, pise nos caranguejos e desvie dos buracos até a bandeira do fim. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0e2a38',
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
          border: '3px solid #123a4a',
          'border-radius': '12px',
          background: '#8ecae6',
        },
      },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.5,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'pirata',
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
                value: 14,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 18,
              },
              color: '#c0392b',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 7,
              },
              color: '#f7c8a2',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 3,
              },
              y: {
                type: 'num',
                value: 3,
              },
              w: {
                type: 'num',
                value: 22,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#2c3e50',
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
                value: 32,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#34495e',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 32,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#34495e',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'caranguejo',
          body: [
            {
              type: 'g2d:paintEllipse',
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
                value: 11,
              },
              h: {
                type: 'num',
                value: 7,
              },
              color: '#e67e22',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 2,
              },
              y: {
                type: 'num',
                value: 6,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0392b',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 18,
              },
              y: {
                type: 'num',
                value: 6,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0392b',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'pirata',
          x: {
            type: 'num',
            value: 40,
          },
          y: {
            type: 'num',
            value: 190,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 44,
          },
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'heroi',
          percent: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'plataformas',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 264,
          },
          w: {
            type: 'num',
            value: 360,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 440,
          },
          y: {
            type: 'num',
            value: 264,
          },
          w: {
            type: 'num',
            value: 360,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 880,
          },
          y: {
            type: 'num',
            value: 264,
          },
          w: {
            type: 'num',
            value: 720,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 300,
          },
          y: {
            type: 'num',
            value: 196,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 590,
          },
          y: {
            type: 'num',
            value: 184,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 1040,
          },
          y: {
            type: 'num',
            value: 196,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'plataformas',
          x: {
            type: 'num',
            value: 1280,
          },
          y: {
            type: 'num',
            value: 176,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'moedas',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 200,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 330,
          },
          y: {
            type: 'num',
            value: 168,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 156,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1070,
          },
          y: {
            type: 'num',
            value: 168,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1310,
          },
          y: {
            type: 'num',
            value: 148,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1460,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
          vx: {
            type: 'num',
            value: 0,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'inimigos',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 520,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 980,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 1200,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:createSprite',
          varName: 'bandeira',
          x: {
            type: 'num',
            value: 1540,
          },
          y: {
            type: 'num',
            value: 200,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 64,
          },
          color: '#ffd166',
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
          type: 'g2d:playMusic',
          tune: 'adventure',
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
          key: 'ArrowUp',
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
                    op: '==',
                    left: {
                      type: 'g2d:spriteVy',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi',
                      },
                      name: 'vy',
                      value: {
                        type: 'num',
                        value: -11,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'jump',
                    },
                  ],
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
                    value: 'Mundo Pirata',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Corra com as setas e pule com a seta para cima. Pegue as moedas, pise nos caranguejos e chegue na bandeira do fim. Cuidado com os buracos!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar a aventura',
                  },
                  bg: '#123a4a',
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
                  type: 'g2d:cameraFollow',
                  spriteVar: 'heroi',
                  worldW: {
                    type: 'num',
                    value: 1600,
                  },
                  worldH: {
                    type: 'num',
                    value: 300,
                  },
                },
                {
                  type: 'g2d:arrowsX',
                  spriteVar: 'heroi',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:applyGravity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi',
                  groupVar: 'plataformas',
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'inimigos',
                  itemName: 'bicho',
                  body: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'bicho',
                      },
                      name: 'x',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                        },
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'num',
                          value: 460,
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                          value: {
                            type: 'num',
                            value: 0.7,
                          },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'num',
                          value: 1500,
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                          value: {
                            type: 'num',
                            value: -0.7,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'moedas',
                  itemName: 'moeda',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'moeda',
                      groupVar: 'moedas',
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
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'inimigos',
                  itemName: 'bicho',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '&&',
                        left: {
                          type: 'binop',
                          op: '>',
                          left: {
                            type: 'g2d:spriteVy',
                            spriteVar: 'heroi',
                          },
                          right: {
                            type: 'num',
                            value: 0,
                          },
                        },
                        right: {
                          type: 'binop',
                          op: '<',
                          left: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'g2d:spriteY',
                              spriteVar: 'heroi',
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                          right: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'bicho',
                            },
                            name: 'y',
                          },
                        },
                      },
                      then: [
                        {
                          type: 'g2d:removeFromGroup',
                          spriteVar: 'bicho',
                          groupVar: 'inimigos',
                        },
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'heroi',
                          },
                          name: 'vy',
                          value: {
                            type: 'num',
                            value: -8,
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
                              value: 2,
                            },
                          },
                        },
                        {
                          type: 'g2d:explode',
                          spriteVar: 'bicho',
                          color: '#e67e22',
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'coin',
                        },
                      ],
                      else: [
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
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'g2d:spriteY',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 340,
                    },
                  },
                  then: [
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'g2d:spriteX',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 1524,
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
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'plataformas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'moedas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'inimigos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'bandeira',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Tesouro:',
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
                    value: 26,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 16,
                  },
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
                    value: 'Chegou na bandeira!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você atravessou o Mundo Pirata inteiro e pegou ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' de tesouro. Que aventureiro!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#14532d',
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
                    value: 'Que perrengue!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'O pirata caiu ou encostou de lado num caranguejo. Pise em cima deles e desvie dos buracos!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para tentar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
      ],
    },
  },
})
