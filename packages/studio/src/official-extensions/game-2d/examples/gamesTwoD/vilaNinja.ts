import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Vila Ninja": recriação BÁSICA e MINI do ninja-adventure do Chris
 * Courses. Aventura top-down num mundo maior que a tela (cameraFollow) com muros
 * de pedra sólidos (grupo + collideGroup, sem tilemap PNG). O ninja anda nas 4
 * direções (topDown) e ATACA corpo-a-corpo com espaço (golpe temporário na
 * direção olhada). Os monstros patrulham e levam 3 golpes; derrotar os 4 vence,
 * ficar sem corações perde. 100% procedural. A behavior foi GERADA pelo parser
 * real a partir do fonte em __gen_vilaNinja.ts (drift test:
 * vilaNinjaExample.test.ts).
 */
export const vilaNinjaExample: ExtensionExample = beginnerGameExample({
  name: 'Vila Ninja',
  experience: 'game',
  description:
    'Explore a vila com as setas e ataque com espaço. Derrote os 4 monstros que patrulham sem perder toda a vida. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#14162a',
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
          background: '#3a5a3e',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'g2d:defineShape',
          shapeName: 'ninjazinho',
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
                value: 4,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 14,
              },
              color: '#2a2a3a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 10,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#e8e0d0',
            },
            {
              type: 'g2d:paintCircle',
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
                value: 1,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 18,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
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
                value: 18,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 14,
              },
              color: '#3a3a55',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 20,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b0a0',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 21,
              },
              y: {
                type: 'num',
                value: 20,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b0a0',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'monstrinho',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 16,
              },
              r: {
                type: 'num',
                value: 12,
              },
              color: '#8b3a62',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 8,
              },
              y1: {
                type: 'num',
                value: 6,
              },
              x2: {
                type: 'num',
                value: 4,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 6,
              },
              color: '#6e2a4c',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 22,
              },
              y1: {
                type: 'num',
                value: 6,
              },
              x2: {
                type: 'num',
                value: 26,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 18,
              },
              y3: {
                type: 'num',
                value: 6,
              },
              color: '#6e2a4c',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'monstros',
          behavior: 'patrulha',
          color: '#8b3a62',
          image: '',
          shape: 'monstrinho',
          hp: {
            type: 'num',
            value: 3,
          },
          speed: {
            type: 'num',
            value: 1,
          },
          dmg: {
            type: 'num',
            value: 1,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 32,
          },
        },
      ],
      start: [
        {
          type: 'g2d:fitScreen',
          percent: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'ninjazinho',
          x: {
            type: 'num',
            value: 340,
          },
          y: {
            type: 'num',
            value: 260,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 34,
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
          type: 'g2d:setHealth',
          spriteVar: 'heroi',
          amount: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'muros',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
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
            value: 720,
          },
          h: {
            type: 'num',
            value: 30,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 510,
          },
          w: {
            type: 'num',
            value: 720,
          },
          h: {
            type: 'num',
            value: 30,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
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
            value: 30,
          },
          h: {
            type: 'num',
            value: 540,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 690,
          },
          y: {
            type: 'num',
            value: 0,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 540,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 150,
          },
          y: {
            type: 'num',
            value: 150,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 90,
          },
          color: '#5a4e42',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 480,
          },
          y: {
            type: 'num',
            value: 300,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 90,
          },
          color: '#5a4e42',
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
          varName: 'coracoes',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'coracoes',
          x: {
            type: 'num',
            value: 360,
          },
          y: {
            type: 'num',
            value: 440,
          },
          w: {
            type: 'num',
            value: 20,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#ff6b81',
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
          varName: 'golpes',
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'monstros',
          x: {
            type: 'num',
            value: 120,
          },
          y: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'monstros',
          x: {
            type: 'num',
            value: 600,
          },
          y: {
            type: 'num',
            value: 130,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'monstros',
          x: {
            type: 'num',
            value: 130,
          },
          y: {
            type: 'num',
            value: 420,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'monstros',
          x: {
            type: 'num',
            value: 600,
          },
          y: {
            type: 'num',
            value: 430,
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
          name: 'miraX',
          value: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'var',
          name: 'miraY',
          value: {
            type: 'num',
            value: 0,
          },
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
                name: 'vitoria',
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
                name: 'derrota',
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
                  type: 'g2d:spawnInGroup',
                  groupVar: 'golpes',
                  x: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'g2d:centerX',
                        spriteVar: 'heroi',
                      },
                      right: {
                        type: 'var',
                        name: 'miraX',
                      },
                    },
                    right: {
                      type: 'num',
                      value: 13,
                    },
                  },
                  y: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'g2d:centerY',
                        spriteVar: 'heroi',
                      },
                      right: {
                        type: 'var',
                        name: 'miraY',
                      },
                    },
                    right: {
                      type: 'num',
                      value: 13,
                    },
                  },
                  w: {
                    type: 'num',
                    value: 26,
                  },
                  h: {
                    type: 'num',
                    value: 26,
                  },
                  color: '#c0c8d8',
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
                  type: 'g2d:playFx',
                  fx: 'whoosh',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onEnemyDefeated',
          typeVar: 'monstros',
          itemName: 'inimigo',
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
                  value: 5,
                },
              },
            },
            {
              type: 'g2d:emitParticles',
              x: {
                type: 'g2d:centerX',
                spriteVar: 'inimigo',
              },
              y: {
                type: 'g2d:centerY',
                spriteVar: 'inimigo',
              },
              count: {
                type: 'num',
                value: 16,
              },
              color: '#f472b6',
            },
            {
              type: 'g2d:playFx',
              fx: 'explosion',
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
                    value: 'Vila Ninja',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Explore a vila com as setas e use espaço para atacar. Derrote os 4 monstros para vencer, mas cuidado com a sua vida!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1f2340',
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
                    value: 720,
                  },
                  worldH: {
                    type: 'num',
                    value: 540,
                  },
                },
                {
                  type: 'g2d:topDown',
                  spriteVar: 'heroi',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowRight',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'miraX',
                      value: {
                        type: 'num',
                        value: 30,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'miraY',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'g2d:flipSprite',
                      spriteVar: 'heroi',
                      dir: 'right',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowLeft',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'miraX',
                      value: {
                        type: 'num',
                        value: -30,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'miraY',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'g2d:flipSprite',
                      spriteVar: 'heroi',
                      dir: 'left',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowUp',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'miraX',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'miraY',
                      value: {
                        type: 'num',
                        value: -32,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowDown',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'miraX',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'assign',
                      name: 'miraY',
                      value: {
                        type: 'num',
                        value: 32,
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi',
                  groupVar: 'muros',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'monstros',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'monstros',
                  itemName: 'inimigo',
                  body: [
                    {
                      type: 'g2d:collideGroup',
                      spriteVar: 'inimigo',
                      groupVar: 'muros',
                    },
                  ],
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'golpes',
                  aName: 'golpe',
                  bGroup: 'monstros',
                  bName: 'inimigo',
                  body: [
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'inimigo',
                      delta: {
                        type: 'num',
                        value: -1,
                      },
                    },
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'golpe',
                      groupVar: 'golpes',
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'hit',
                    },
                  ],
                },
                {
                  type: 'g2d:pruneOld',
                  groupVar: 'golpes',
                  seconds: {
                    type: 'num',
                    value: 0.25,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logicalNot',
                    value: {
                      type: 'g2d:isInvincible',
                      spriteVar: 'heroi',
                    },
                  },
                  then: [
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'heroi',
                      groupVar: 'monstros',
                      itemName: 'inimigo',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'inimigo',
                        },
                        {
                          type: 'g2d:shake',
                          ctxVar: 'ctx',
                          intensity: {
                            type: 'num',
                            value: 5,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'hurt',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'coracoes',
                  itemName: 'coracao',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'coracao',
                      groupVar: 'coracoes',
                    },
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'heal',
                    },
                  ],
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'muros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'coracoes',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'golpes',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'monstros',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawParticles',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSpriteHealth',
                  ctxVar: 'ctx',
                  spriteVar: 'heroi',
                  style: 'hearts',
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 24,
                  },
                  size: {
                    type: 'num',
                    value: 16,
                  },
                  color: '#ff6b81',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Monstros:',
                  value: {
                    type: 'g2d:countGroup',
                    groupVar: 'monstros',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 52,
                  },
                  color: '#f9a8d4',
                  size: {
                    type: 'num',
                    value: 16,
                  },
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
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 74,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'g2d:countGroup',
                      groupVar: 'monstros',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'win',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'vitoria',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:healthDepleted',
                    spriteVar: 'heroi',
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'gameover',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'derrota',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'vitoria',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'A vila está em paz!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você derrotou os 4 monstros e fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos. Um ninja de verdade!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#1d4d33',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'derrota',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'O ninja caiu!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Os monstros venceram desta vez. Você fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos.',
                    },
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
    extensions: [{ extensionId: 'game-2d' }],
  },
})
