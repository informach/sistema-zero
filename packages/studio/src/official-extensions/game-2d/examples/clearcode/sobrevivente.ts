import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Sobrevivente" (degrau BÁSICO da família Vampire Survivor do Clear
 * Code). Arena de uma tela: a arma atira sozinha no inimigo mais perto e o herói
 * foge da horda. A câmera que segue vem nos níveis Profissional e "na mão". A
 * behavior abaixo foi GERADA pelo parser real a partir de __gen_sobrevivente.ts
 * (drift test: sobreviventeExample.test.ts).
 */
export const sobreviventeExample: ExtensionExample = beginnerGameExample({
  name: 'Sobrevivente',
  experience: 'game',
  description:
    'Atirador de sobrevivência: fuja dos monstrinhos com as setas enquanto sua arma atira sozinha no inimigo mais perto. Cada segundo vivo vale 1 ponto e derrotar monstrinho dá bônus. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0a0713',
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
          background: '#2c2140',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'g2d:defineShape',
          shapeName: 'heroizinho',
          body: [
            {
              type: 'g2d:paintCircle',
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
                value: 12,
              },
              color: '#4f8fea',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 13,
              },
              y: {
                type: 'num',
                value: 13,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#dbe9ff',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 14,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c9d7ef',
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
                value: 15,
              },
              r: {
                type: 'num',
                value: 13,
              },
              color: '#e05a5a',
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#2a0f14',
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#2a0f14',
            },
          ],
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'inimigos',
          behavior: 'perseguidor',
          color: '#e05a5a',
          image: '',
          shape: 'monstrinho',
          hp: {
            type: 'num',
            value: 2,
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
            value: 30,
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
          shapeName: 'heroizinho',
          x: {
            type: 'num',
            value: 223,
          },
          y: {
            type: 'num',
            value: 133,
          },
          w: {
            type: 'num',
            value: 34,
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
            value: 70,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'heroi',
          amount: {
            type: 'num',
            value: 5,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'tiros',
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
          type: 'g2d:onEnemyDefeated',
          typeVar: 'inimigos',
          itemName: 'bicho',
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
                  value: 3,
                },
              },
            },
            {
              type: 'g2d:emitParticles',
              x: {
                type: 'g2d:centerX',
                spriteVar: 'bicho',
              },
              y: {
                type: 'g2d:centerY',
                spriteVar: 'bicho',
              },
              count: {
                type: 'num',
                value: 14,
              },
              color: '#ffb347',
            },
            {
              type: 'g2d:playExplosion',
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
                    value: 'Sobrevivente',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Fuja dos monstrinhos com as setas. Sua arma atira sozinha no inimigo mais perto. Aguente o máximo que você conseguir!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para começar',
                  },
                  bg: '#241a33',
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
                  spriteVar: 'heroi',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'inimigos',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'var',
                  name: 'maisPerto',
                  value: {
                    type: 'var',
                    name: 'heroi',
                  },
                },
                {
                  type: 'var',
                  name: 'menorDistancia',
                  value: {
                    type: 'num',
                    value: 9999,
                  },
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'inimigos',
                  itemName: 'bicho',
                  body: [
                    {
                      type: 'var',
                      name: 'dist',
                      value: {
                        type: 'g2d:distance',
                        aVar: 'heroi',
                        bVar: 'bicho',
                      },
                      kind: 'const',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'var',
                          name: 'dist',
                        },
                        right: {
                          type: 'var',
                          name: 'menorDistancia',
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'menorDistancia',
                          value: {
                            type: 'var',
                            name: 'dist',
                          },
                        },
                        {
                          type: 'assign',
                          name: 'maisPerto',
                          value: {
                            type: 'var',
                            name: 'bicho',
                          },
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
                      type: 'g2d:countGroup',
                      groupVar: 'inimigos',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:aimAt',
                      spriteVar: 'heroi',
                      targetVar: 'maisPerto',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:cooldownReady',
                        spriteVar: 'heroi',
                        frames: {
                          type: 'num',
                          value: 16,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:shootFrom',
                          spriteVar: 'heroi',
                          groupVar: 'tiros',
                          speed: {
                            type: 'num',
                            value: 7,
                          },
                          color: '#9cff57',
                        },
                        {
                          type: 'g2d:playShoot',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'tiros',
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'inimigos',
                  bName: 'bicho',
                  body: [
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'bicho',
                      delta: {
                        type: 'num',
                        value: -1,
                      },
                    },
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'tiro',
                      groupVar: 'tiros',
                    },
                  ],
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
                      groupVar: 'inimigos',
                      itemName: 'bicho',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'bicho',
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
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                  itemName: 'tiro',
                  body: [],
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'inimigos',
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
                    value: 26,
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
                    value: 54,
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
                      name: 'perdeu',
                    },
                  ],
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
                    value: 'Os monstrinhos te alcançaram!',
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
                      value: ' pontos. Tente aguentar mais tempo!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para tentar de novo',
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
            value: 0.8,
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
                  type: 'var',
                  name: 'bx',
                  value: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: 30,
                    },
                    max: {
                      type: 'num',
                      value: 450,
                    },
                  },
                },
                {
                  type: 'var',
                  name: 'by',
                  value: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:randomChance',
                    percent: {
                      type: 'num',
                      value: 50,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'by',
                      value: {
                        type: 'num',
                        value: 280,
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:spawnEnemy',
                  typeVar: 'inimigos',
                  x: {
                    type: 'var',
                    name: 'bx',
                  },
                  y: {
                    type: 'var',
                    name: 'by',
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
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
