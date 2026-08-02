import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Muralha do Reino": recriação BÁSICA do tower-defense do Chris Courses.
 * Os invasores marcham da esquerda rumo ao castelo; a criança CLICA na faixa de
 * baixo para comprar torres (50 moedas) que atiram sozinhas para a esquerda. Tiro
 * que encosta no invasor explode e dá 25 moedas; invasor que encosta no castelo
 * tira 1 vida. Seis ondas que crescem: vencer é segurar todas, perder é ficar sem
 * vidas. O caminho em ziguezague por waypoints do original virou uma fila reta
 * (updateGroup) e a mira homing virou tiro reto, para caber no básico. 100%
 * procedural (formas e cores, sem os PNGs de orc/torre). A behavior foi GERADA
 * pelo parser real a partir do fonte em __gen_muralhaDoReino.ts (drift test:
 * muralhaDoReinoExample.test.ts).
 */
export const muralhaDoReinoExample: ExtensionExample = beginnerGameExample({
  name: 'Muralha do Reino',
  experience: 'game',
  description:
    'Clique embaixo para comprar torres que atiram sozinhas nos invasores. Segure as 6 ondas e não deixe ninguém encostar no castelo. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0f1424',
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
          background: '#33502f',
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
          type: 'g2d:defineShape',
          shapeName: 'torreDoReino',
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
                value: 20,
              },
              w: {
                type: 'num',
                value: 24,
              },
              h: {
                type: 'num',
                value: 24,
              },
              color: '#8a8f99',
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
                value: 4,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 18,
              },
              color: '#6f7681',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#2f3540',
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
                value: 3,
              },
              color: '#ffd166',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'casteloDoReino',
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
                value: 20,
              },
              w: {
                type: 'num',
                value: 44,
              },
              h: {
                type: 'num',
                value: 60,
              },
              color: '#b0785a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 72,
              },
              color: '#8a5c42',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 42,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 72,
              },
              color: '#8a5c42',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 7,
              },
              y1: {
                type: 'num',
                value: 8,
              },
              x2: {
                type: 'num',
                value: 0,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 14,
              },
              y3: {
                type: 'num',
                value: 0,
              },
              color: '#d64550',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 49,
              },
              y1: {
                type: 'num',
                value: 8,
              },
              x2: {
                type: 'num',
                value: 42,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 56,
              },
              y3: {
                type: 'num',
                value: 0,
              },
              color: '#d64550',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 22,
              },
              y: {
                type: 'num',
                value: 46,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 34,
              },
              color: '#4a2f22',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'castelo',
          shapeName: 'casteloDoReino',
          x: {
            type: 'num',
            value: 408,
          },
          y: {
            type: 'num',
            value: 150,
          },
          w: {
            type: 'num',
            value: 56,
          },
          h: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'inimigos',
        },
        {
          type: 'g2d:createGroup',
          varName: 'torres',
        },
        {
          type: 'g2d:createGroup',
          varName: 'tiros',
        },
        {
          type: 'var',
          name: 'moedas',
          value: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'var',
          name: 'vidas',
          value: {
            type: 'num',
            value: 10,
          },
        },
        {
          type: 'var',
          name: 'onda',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'porOnda',
          value: {
            type: 'num',
            value: 3,
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
          ],
        },
        {
          type: 'g2d:onPointer',
          xName: 'px',
          yName: 'py',
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
                      name: 'px',
                    },
                    right: {
                      type: 'num',
                      value: 380,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>=',
                        left: {
                          type: 'var',
                          name: 'moedas',
                        },
                        right: {
                          type: 'num',
                          value: 50,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'moedas',
                          value: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'var',
                              name: 'moedas',
                            },
                            right: {
                              type: 'num',
                              value: 50,
                            },
                          },
                        },
                        {
                          type: 'g2d:spawnInGroup',
                          groupVar: 'torres',
                          x: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'var',
                              name: 'px',
                            },
                            right: {
                              type: 'num',
                              value: 18,
                            },
                          },
                          y: {
                            type: 'num',
                            value: 196,
                          },
                          w: {
                            type: 'num',
                            value: 36,
                          },
                          h: {
                            type: 'num',
                            value: 44,
                          },
                          color: '#8a8f99',
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
                          fx: 'confirm',
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
                    value: 'Muralha do Reino',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Clique embaixo para comprar torres (50 moedas). Elas atiram sozinhas nos invasores. Não deixe eles chegarem no castelo!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
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
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Faixa de construção: clique aqui para pôr uma torre',
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 214,
                  },
                  color: '#7f8aa8',
                  size: {
                    type: 'num',
                    value: 12,
                  },
                  align: 'left',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'inimigos',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'tiros',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'castelo',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'torres',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'inimigos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'inimigos',
                  bName: 'invasor',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'invasor',
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
                      spriteVar: 'invasor',
                      groupVar: 'inimigos',
                    },
                    {
                      type: 'assign',
                      name: 'moedas',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'moedas',
                        },
                        right: {
                          type: 'num',
                          value: 25,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'castelo',
                  groupVar: 'inimigos',
                  itemName: 'invasor',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'invasor',
                      color: '#ff5d3d',
                    },
                    {
                      type: 'g2d:shake',
                      ctxVar: 'ctx',
                      intensity: {
                        type: 'num',
                        value: 6,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'hurt',
                    },
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'invasor',
                      groupVar: 'inimigos',
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
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Moedas:',
                  value: {
                    type: 'var',
                    name: 'moedas',
                  },
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#ffd166',
                  size: {
                    type: 'num',
                    value: 18,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Vidas:',
                  value: {
                    type: 'var',
                    name: 'vidas',
                  },
                  x: {
                    type: 'num',
                    value: 200,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#ff8a8a',
                  size: {
                    type: 'num',
                    value: 18,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Onda:',
                  value: {
                    type: 'var',
                    name: 'onda',
                  },
                  x: {
                    type: 'num',
                    value: 340,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#a7e3ff',
                  size: {
                    type: 'num',
                    value: 18,
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
                      type: 'var',
                      name: 'onda',
                    },
                    right: {
                      type: 'num',
                      value: 6,
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
                    value: 'O castelo caiu!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Os invasores passaram pela muralha. Você segurou até a onda ',
                      },
                      right: {
                        type: 'var',
                        name: 'onda',
                      },
                    },
                    right: {
                      type: 'str',
                      value: '.',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para defender de novo',
                  },
                  bg: '#5a2a2a',
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
                    value: 'O reino está a salvo!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Você segurou todas as 6 ondas de invasores. Muralha firme!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#1d4d33',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 1.2,
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
                  type: 'g2d:spawnInGroup',
                  groupVar: 'inimigos',
                  x: {
                    type: 'num',
                    value: -40,
                  },
                  y: {
                    type: 'num',
                    value: 168,
                  },
                  w: {
                    type: 'num',
                    value: 30,
                  },
                  h: {
                    type: 'num',
                    value: 30,
                  },
                  color: '#c0504d',
                  vx: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'onda',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  vy: {
                    type: 'num',
                    value: 0,
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
                  type: 'g2d:forEachInGroup',
                  groupVar: 'torres',
                  itemName: 'torre',
                  body: [
                    {
                      type: 'g2d:spawnBullet',
                      groupVar: 'tiros',
                      x: {
                        type: 'g2d:centerX',
                        spriteVar: 'torre',
                      },
                      y: {
                        type: 'num',
                        value: 182,
                      },
                      radius: {
                        type: 'num',
                        value: 5,
                      },
                      color: '#9cff57',
                      vx: {
                        type: 'num',
                        value: -6,
                      },
                      vy: {
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
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 8,
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
                  name: 'onda',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'onda',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'assign',
                  name: 'porOnda',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'porOnda',
                    },
                    right: {
                      type: 'num',
                      value: 2,
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
