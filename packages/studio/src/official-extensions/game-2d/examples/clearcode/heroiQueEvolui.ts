import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Herói que Evolui" (degrau BÁSICO da família Zelda do Clear Code,
 * focado no DIFERENCIAL que o Aventura do Herói / Vila Ninja não ensinam: a
 * economia de EXP + subir de nível). Arena de uma tela: espada na direção olhada
 * (espaço), ondas de monstros que perseguem, e cada monstro derrotado dá EXP;
 * encher a barra sobe de nível (mais veloz + cura). Chegar ao nível 5 vence. A
 * behavior abaixo foi GERADA pelo parser real a partir de __gen_heroiQueEvolui.ts
 * (drift test: heroiQueEvoluiExample.test.ts).
 */
export const heroiQueEvoluiExample: ExtensionExample = beginnerGameExample({
  name: 'Herói que Evolui',
  experience: 'game',
  description:
    'Aventura de espada: corte os monstros com espaço para ganhar experiência, suba de nível para ficar mais forte e curar corações, e chegue ao nível 5. Ande com as setas. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1220',
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
          background: '#1d2f4d',
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
                value: 9,
              },
              r: {
                type: 'num',
                value: 8,
              },
              color: '#f7c8a2',
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
                value: 16,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 14,
              },
              color: '#2f6fbf',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#7a4a21',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 19,
              },
              y: {
                type: 'num',
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#7a4a21',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'monstro',
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
                value: 14,
              },
              color: '#8d55c9',
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
                value: 4,
              },
              color: '#f6f2ff',
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
                value: 4,
              },
              color: '#f6f2ff',
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
                value: 2,
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'inimigos',
          behavior: 'perseguidor',
          color: '#8d55c9',
          image: '',
          shape: 'monstro',
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
            value: 32,
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
            value: 40,
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
            value: 5,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'golpes',
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
          name: 'velocidade',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'var',
          name: 'miraX',
          value: {
            type: 'num',
            value: 34,
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
                  color: '#f7d154',
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
          typeVar: 'inimigos',
          itemName: 'bicho',
          body: [
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
              color: '#c084fc',
            },
            {
              type: 'g2d:playFx',
              fx: 'explosion',
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
                      value: 5,
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
                          value: 0.4,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:changeHealth',
                  spriteVar: 'heroi',
                  delta: {
                    type: 'num',
                    value: 2,
                  },
                },
                {
                  type: 'g2d:emitParticles',
                  x: {
                    type: 'g2d:centerX',
                    spriteVar: 'heroi',
                  },
                  y: {
                    type: 'g2d:centerY',
                    spriteVar: 'heroi',
                  },
                  count: {
                    type: 'num',
                    value: 22,
                  },
                  color: '#ffd166',
                },
                {
                  type: 'g2d:playFx',
                  fx: 'powerup',
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
                    value: 'Herói que Evolui',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Corte os monstros com espaço para ganhar experiência. Suba de nível para ficar mais forte e chegue ao nível 5!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para começar',
                  },
                  bg: '#1d2f4d',
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
                    type: 'var',
                    name: 'velocidade',
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
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
                        value: 34,
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
                        value: -34,
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
                        value: -37,
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
                        value: 37,
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'inimigos',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'golpes',
                  aName: 'golpe',
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
                      spriteVar: 'golpe',
                      groupVar: 'golpes',
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'punch',
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
                  type: 'g2d:drawGroup',
                  groupVar: 'golpes',
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
                  label: 'Nível:',
                  value: {
                    type: 'var',
                    name: 'nivel',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 54,
                  },
                  color: '#ffe066',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'EXP:',
                  value: {
                    type: 'var',
                    name: 'exp',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 76,
                  },
                  color: '#f3f6ff',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'nivel',
                    },
                    right: {
                      type: 'num',
                      value: 5,
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
                    value: 'Virou um herói lendário!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Você chegou ao nível 5 evoluindo a cada monstro derrotado!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#1d2f4d',
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
                    value: 'O herói caiu!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você chegou ao nível ',
                      },
                      right: {
                        type: 'var',
                        name: 'nivel',
                      },
                    },
                    right: {
                      type: 'str',
                      value: '. Treine para evoluir mais!',
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
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 1.4,
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
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
