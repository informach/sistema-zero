import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from './shared'

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

/**
 * Exemplo "Escalada do Guerreiro": recriação BÁSICA do vertical-platformer do
 * Chris Courses. O herói começa embaixo e sobe pulando de plataforma em plataforma
 * (arrowsX + gravidade + pulo no chão) enquanto a câmera acompanha (cameraFollow)
 * num mundo mais alto que a tela; a meta é a bandeira lá no topo. As plataformas
 * viraram um grupo de retângulos com colisão sólida (collideGroup), em ziguezague.
 * 100% procedural (sem os PNGs do warrior/fundo). A behavior foi GERADA pelo parser
 * real a partir do fonte em __gen_escaladaDoGuerreiro.ts (drift test:
 * escaladaDoGuerreiroExample.test.ts).
 */
export const escaladaDoGuerreiroExample: ExtensionExample = beginnerGameExample({
  name: 'Escalada do Guerreiro',
  experience: 'game',
  description:
    'Suba com o guerreiro pulando de plataforma em plataforma até a bandeira dourada lá no topo. Use as setas para andar e pular. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 480 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#1a2712',
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
          background: '#8fc0e8',
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.5,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'guerreirinho',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 8,
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
                value: 6,
              },
              y: {
                type: 'num',
                value: 15,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 16,
              },
              color: '#4a6fd6',
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
                value: 17,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#f7c8a2',
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
                value: 17,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
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
                value: 31,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#33407a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 31,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#33407a',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'guerreirinho',
          x: {
            type: 'num',
            value: 40,
          },
          y: {
            type: 'num',
            value: 860,
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
            value: 916,
          },
          w: {
            type: 'num',
            value: 320,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#5a7a3a',
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
            value: 180,
          },
          y: {
            type: 'num',
            value: 806,
          },
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 20,
          },
          y: {
            type: 'num',
            value: 706,
          },
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 190,
          },
          y: {
            type: 'num',
            value: 606,
          },
          w: {
            type: 'num',
            value: 110,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 30,
          },
          y: {
            type: 'num',
            value: 506,
          },
          w: {
            type: 'num',
            value: 110,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 180,
          },
          y: {
            type: 'num',
            value: 406,
          },
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 20,
          },
          y: {
            type: 'num',
            value: 306,
          },
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 170,
          },
          y: {
            type: 'num',
            value: 206,
          },
          w: {
            type: 'num',
            value: 120,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
            value: 40,
          },
          y: {
            type: 'num',
            value: 116,
          },
          w: {
            type: 'num',
            value: 130,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#7a5a3a',
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
          type: 'g2d:createSprite',
          varName: 'bandeira',
          x: {
            type: 'num',
            value: 84,
          },
          y: {
            type: 'num',
            value: 72,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#ffd166',
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
                      type: 'g2d:setVelocity',
                      spriteVar: 'heroi',
                      vx: {
                        type: 'num',
                        value: 0,
                      },
                      vy: {
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
                    value: 'Escalada do Guerreiro',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Use as setas para andar e a seta pra cima para pular de plataforma em plataforma. Chegue lá no alto, na bandeira dourada!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar a subir',
                  },
                  bg: '#243a1c',
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
                    value: 320,
                  },
                  worldH: {
                    type: 'num',
                    value: 960,
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
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi',
                  groupVar: 'plataformas',
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'plataformas',
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'g2d:spriteY',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 90,
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
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Suba até a bandeira!',
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
                    value: 14,
                  },
                  align: 'left',
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
                    value: 'Chegou ao topo!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'O guerreiro escalou a torre inteira e fincou a bandeira. Escalada perfeita!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para escalar de novo',
                  },
                  bg: '#1d4d33',
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

/**
 * Exemplo "Duelo de Heróis": recriação BÁSICA da luta 1v1 do fighting-game do
 * Chris Courses. Dois jogadores no mesmo teclado, com gravidade e chão sólido:
 * o herói azul anda com A/D, pula com W e golpeia com F; o vermelho usa as setas
 * e a seta pra baixo golpeia. O golpe é a caixa de ataque do original, que
 * aparece virada para o oponente e tira vida quando encosta. Barras de vida no
 * topo e um cronômetro regressivo de 60 segundos: vence por nocaute ou, no fim
 * do tempo, quem tiver mais vida (empate se estiverem iguais). 100% procedural
 * (formas e cores, sem os PNGs de samuraiMack/kenji). A behavior foi GERADA pelo
 * parser real a partir do fonte em __gen_dueloDeHerois.ts (drift test:
 * dueloDeHeroisExample.test.ts).
 */
export const dueloDeHeroisExample: ExtensionExample = beginnerGameExample({
  name: 'Duelo de Heróis',
  experience: 'game',
  description:
    'Dois jogadores no mesmo teclado lutam 1 contra 1. Azul usa A, D, W e F; Vermelho usa as setas. Golpeie o rival e zere a vida dele antes do tempo. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#120c1c',
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
          background: '#2a2140',
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.7,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'heroiAzul',
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
                value: 6,
              },
              y: {
                type: 'num',
                value: 17,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 22,
              },
              color: '#3b6fd6',
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
                value: 39,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 13,
              },
              color: '#26356e',
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
                value: 39,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 13,
              },
              color: '#26356e',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'heroiVermelho',
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
                value: 6,
              },
              y: {
                type: 'num',
                value: 17,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 22,
              },
              color: '#d64550',
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
                value: 39,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 13,
              },
              color: '#7a2530',
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
                value: 39,
              },
              w: {
                type: 'num',
                value: 7,
              },
              h: {
                type: 'num',
                value: 13,
              },
              color: '#7a2530',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi1',
          shapeName: 'heroiAzul',
          x: {
            type: 'num',
            value: 90,
          },
          y: {
            type: 'num',
            value: 180,
          },
          w: {
            type: 'num',
            value: 32,
          },
          h: {
            type: 'num',
            value: 52,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi2',
          shapeName: 'heroiVermelho',
          x: {
            type: 'num',
            value: 358,
          },
          y: {
            type: 'num',
            value: 180,
          },
          w: {
            type: 'num',
            value: 32,
          },
          h: {
            type: 'num',
            value: 52,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'heroi1',
          amount: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'heroi2',
          amount: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'chao',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 256,
          },
          w: {
            type: 'num',
            value: 480,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#3a2f22',
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
          type: 'g2d:createSprite',
          varName: 'golpe1',
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
            value: 26,
          },
          h: {
            type: 'num',
            value: 30,
          },
          color: '#ffe08a',
        },
        {
          type: 'g2d:createSprite',
          varName: 'golpe2',
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
            value: 26,
          },
          h: {
            type: 'num',
            value: 30,
          },
          color: '#ffe08a',
        },
        {
          type: 'var',
          name: 'atacando1',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'atacando2',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'tempo',
          value: {
            type: 'num',
            value: 60,
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
                name: 'ganhou1',
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
                name: 'ganhou2',
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
                name: 'empate',
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
          key: 'w',
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
                      spriteVar: 'heroi1',
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
                        name: 'heroi1',
                      },
                      name: 'vy',
                      value: {
                        type: 'num',
                        value: -13,
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
                      spriteVar: 'heroi2',
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
                        name: 'heroi2',
                      },
                      name: 'vy',
                      value: {
                        type: 'num',
                        value: -13,
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
        {
          type: 'g2d:onKey',
          key: 'f',
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
                      type: 'var',
                      name: 'atacando1',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:cooldownReady',
                        spriteVar: 'heroi1',
                        frames: {
                          type: 'num',
                          value: 30,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'atacando1',
                          value: {
                            type: 'num',
                            value: 12,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'punch',
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
          type: 'g2d:onKey',
          key: 'ArrowDown',
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
                      type: 'var',
                      name: 'atacando2',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:cooldownReady',
                        spriteVar: 'heroi2',
                        frames: {
                          type: 'num',
                          value: 30,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'atacando2',
                          value: {
                            type: 'num',
                            value: 12,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'punch',
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
                    value: 'Duelo de Heróis',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Dois jogadores no mesmo teclado. Azul anda com A e D, pula com W e golpeia com F. Vermelho usa as setas e a seta pra baixo golpeia. Zere a vida do outro!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para lutar',
                  },
                  bg: '#241830',
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
                  type: 'memberSet',
                  object: {
                    type: 'var',
                    name: 'heroi1',
                  },
                  name: 'vx',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'a',
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi1',
                      },
                      name: 'vx',
                      value: {
                        type: 'num',
                        value: -3,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'd',
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi1',
                      },
                      name: 'vx',
                      value: {
                        type: 'num',
                        value: 3,
                      },
                    },
                  ],
                },
                {
                  type: 'memberSet',
                  object: {
                    type: 'var',
                    name: 'heroi2',
                  },
                  name: 'vx',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowLeft',
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi2',
                      },
                      name: 'vx',
                      value: {
                        type: 'num',
                        value: -3,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:keyDown',
                    key: 'ArrowRight',
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi2',
                      },
                      name: 'vx',
                      value: {
                        type: 'num',
                        value: 3,
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi1',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi2',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi1',
                  groupVar: 'chao',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi2',
                  groupVar: 'chao',
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'heroi1',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'heroi2',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'chao',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi1',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi2',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'atacando1',
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
                        name: 'golpe1',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'heroi1',
                        },
                        right: {
                          type: 'num',
                          value: 10,
                        },
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi1',
                        },
                        right: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi2',
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'golpe1',
                          },
                          name: 'x',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'g2d:spriteX',
                              spriteVar: 'heroi1',
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>=',
                        left: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi1',
                        },
                        right: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi2',
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'golpe1',
                          },
                          name: 'x',
                          value: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'g2d:spriteX',
                              spriteVar: 'heroi1',
                            },
                            right: {
                              type: 'num',
                              value: 24,
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'golpe1',
                      ctxVar: 'ctx',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:touches',
                        aVar: 'golpe1',
                        bVar: 'heroi2',
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'atacando1',
                            },
                            right: {
                              type: 'num',
                              value: 12,
                            },
                          },
                          then: [
                            {
                              type: 'g2d:changeHealth',
                              spriteVar: 'heroi2',
                              delta: {
                                type: 'num',
                                value: -8,
                              },
                            },
                            {
                              type: 'g2d:explode',
                              spriteVar: 'heroi2',
                              color: '#ffb347',
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
                      type: 'assign',
                      name: 'atacando1',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'atacando1',
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'atacando2',
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
                        name: 'golpe2',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'heroi2',
                        },
                        right: {
                          type: 'num',
                          value: 10,
                        },
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi2',
                        },
                        right: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi1',
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'golpe2',
                          },
                          name: 'x',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'g2d:spriteX',
                              spriteVar: 'heroi2',
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>=',
                        left: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi2',
                        },
                        right: {
                          type: 'g2d:centerX',
                          spriteVar: 'heroi1',
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'golpe2',
                          },
                          name: 'x',
                          value: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'g2d:spriteX',
                              spriteVar: 'heroi2',
                            },
                            right: {
                              type: 'num',
                              value: 24,
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'golpe2',
                      ctxVar: 'ctx',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:touches',
                        aVar: 'golpe2',
                        bVar: 'heroi1',
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'atacando2',
                            },
                            right: {
                              type: 'num',
                              value: 12,
                            },
                          },
                          then: [
                            {
                              type: 'g2d:changeHealth',
                              spriteVar: 'heroi1',
                              delta: {
                                type: 'num',
                                value: -8,
                              },
                            },
                            {
                              type: 'g2d:explode',
                              spriteVar: 'heroi1',
                              color: '#ffb347',
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
                      type: 'assign',
                      name: 'atacando2',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'atacando2',
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
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: {
                    type: 'g2d:getHealth',
                    spriteVar: 'heroi1',
                  },
                  max: {
                    type: 'num',
                    value: 100,
                  },
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 14,
                  },
                  w: {
                    type: 'num',
                    value: 190,
                  },
                  h: {
                    type: 'num',
                    value: 16,
                  },
                  color: '#4f8fea',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: {
                    type: 'g2d:getHealth',
                    spriteVar: 'heroi2',
                  },
                  max: {
                    type: 'num',
                    value: 100,
                  },
                  x: {
                    type: 'num',
                    value: 278,
                  },
                  y: {
                    type: 'num',
                    value: 14,
                  },
                  w: {
                    type: 'num',
                    value: 190,
                  },
                  h: {
                    type: 'num',
                    value: 16,
                  },
                  color: '#e05a5a',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Tempo:',
                  value: {
                    type: 'var',
                    name: 'tempo',
                  },
                  x: {
                    type: 'num',
                    value: 210,
                  },
                  y: {
                    type: 'num',
                    value: 26,
                  },
                  color: '#ffffff',
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
                      type: 'g2d:getHealth',
                      spriteVar: 'heroi2',
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
                      name: 'ganhou1',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'g2d:getHealth',
                      spriteVar: 'heroi1',
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
                      name: 'ganhou2',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'var',
                      name: 'tempo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi1',
                        },
                        right: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi2',
                        },
                      },
                      then: [
                        {
                          type: 'g2d:setScene',
                          name: 'ganhou1',
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi2',
                        },
                        right: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi1',
                        },
                      },
                      then: [
                        {
                          type: 'g2d:setScene',
                          name: 'ganhou2',
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi1',
                        },
                        right: {
                          type: 'g2d:getHealth',
                          spriteVar: 'heroi2',
                        },
                      },
                      then: [
                        {
                          type: 'g2d:setScene',
                          name: 'empate',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'ganhou1',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'O herói Azul venceu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'O lutador azul derrubou o adversário. Que duelo!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para lutar de novo',
                  },
                  bg: '#1b2b5a',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'ganhou2',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'O herói Vermelho venceu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'O lutador vermelho derrubou o adversário. Que duelo!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para lutar de novo',
                  },
                  bg: '#5a2020',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'empate',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Empate!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'O tempo acabou com os dois heróis igualmente fortes. Ninguém caiu!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para o desempate',
                  },
                  bg: '#3a3352',
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'tempo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'tempo',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'tempo',
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

/**
 * Exemplo "Portas do Castelo": recriação BÁSICA do plataforma por fases do
 * kings-and-pigs do Chris Courses. O rei anda e pula com colisão sólida contra
 * um grupo de blocos (o CollisionBlock do original) e chega numa PORTA que
 * dispara a transição: um clarão preto (flash) escurece a tela por alguns quadros
 * (o gsap.to overlay do original) e no meio troca de fase, remontando as
 * plataformas e reposicionando o rei (o levels[level].init()). São três salões
 * com layouts diferentes; a porta do último vence o jogo. 100% procedural
 * (formas e cores, sem tilemap nem os PNGs de king/background). A behavior foi
 * GERADA pelo parser real a partir do fonte em __gen_portasDoCastelo.ts (drift
 * test: portasDoCasteloExample.test.ts).
 */
export const portasDoCasteloExample: ExtensionExample = beginnerGameExample({
  name: 'Portas do Castelo',
  experience: 'game',
  description:
    'Guie o rei pelas plataformas e ache a porta de cada fase para atravessar o castelo em três salões. Use as setas para andar e pular. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0d1220',
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
          background: '#243050',
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.6,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'reizinho',
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
                value: 2,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#f4d35e',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
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
                value: 5,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 18,
              },
              color: '#6a8cd6',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 5,
              },
              y: {
                type: 'num',
                value: 34,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#33407a',
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
                value: 34,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#33407a',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'rei',
          shapeName: 'reizinho',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 200,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 42,
          },
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'rei',
          percent: {
            type: 'num',
            value: 85,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'blocos',
        },
        {
          type: 'g2d:createSprite',
          varName: 'porta',
          x: {
            type: 'num',
            value: 420,
          },
          y: {
            type: 'num',
            value: 216,
          },
          w: {
            type: 'num',
            value: 34,
          },
          h: {
            type: 'num',
            value: 52,
          },
          color: '#4a2f22',
        },
        {
          type: 'var',
          name: 'fase',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'vitoria',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'escurecendo',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'blocos',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 268,
          },
          w: {
            type: 'num',
            value: 480,
          },
          h: {
            type: 'num',
            value: 32,
          },
          color: '#5a4632',
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
          groupVar: 'blocos',
          x: {
            type: 'num',
            value: 150,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#6f5640',
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
          groupVar: 'blocos',
          x: {
            type: 'num',
            value: 300,
          },
          y: {
            type: 'num',
            value: 160,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#6f5640',
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
                      type: 'var',
                      name: 'escurecendo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'g2d:spriteVy',
                          spriteVar: 'rei',
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
                            name: 'rei',
                          },
                          name: 'vy',
                          value: {
                            type: 'num',
                            value: -12,
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
                    value: 'Portas do Castelo',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Use as setas para andar e a seta pra cima para pular. Chegue na porta de cada fase para atravessar o castelo!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para entrar no castelo',
                  },
                  bg: '#1b2440',
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'escurecendo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:arrowsX',
                      spriteVar: 'rei',
                      speed: {
                        type: 'num',
                        value: 3,
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'rei',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'rei',
                  groupVar: 'blocos',
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'rei',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'blocos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'porta',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'rei',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'escurecendo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:touches',
                        aVar: 'rei',
                        bVar: 'porta',
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'escurecendo',
                          value: {
                            type: 'num',
                            value: 40,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'select',
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
                      type: 'var',
                      name: 'escurecendo',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:flash',
                      ctxVar: 'ctx',
                      color: '#050510',
                    },
                    {
                      type: 'assign',
                      name: 'escurecendo',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'escurecendo',
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
                        op: '==',
                        left: {
                          type: 'var',
                          name: 'escurecendo',
                        },
                        right: {
                          type: 'num',
                          value: 20,
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'fase',
                            },
                            right: {
                              type: 'num',
                              value: 3,
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'vitoria',
                              value: {
                                type: 'bool',
                                value: true,
                              },
                            },
                          ],
                        },
                        {
                          type: 'assign',
                          name: 'fase',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'var',
                              name: 'fase',
                            },
                            right: {
                              type: 'num',
                              value: 1,
                            },
                          },
                        },
                        {
                          type: 'g2d:clearGroup',
                          groupVar: 'blocos',
                        },
                        {
                          type: 'g2d:spawnInGroup',
                          groupVar: 'blocos',
                          x: {
                            type: 'num',
                            value: 0,
                          },
                          y: {
                            type: 'num',
                            value: 268,
                          },
                          w: {
                            type: 'num',
                            value: 480,
                          },
                          h: {
                            type: 'num',
                            value: 32,
                          },
                          color: '#5a4632',
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
                          type: 'g2d:setPosition',
                          spriteVar: 'rei',
                          x: {
                            type: 'num',
                            value: 60,
                          },
                          y: {
                            type: 'num',
                            value: 200,
                          },
                        },
                        {
                          type: 'g2d:setVelocity',
                          spriteVar: 'rei',
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
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'fase',
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          then: [
                            {
                              type: 'g2d:spawnInGroup',
                              groupVar: 'blocos',
                              x: {
                                type: 'num',
                                value: 90,
                              },
                              y: {
                                type: 'num',
                                value: 200,
                              },
                              w: {
                                type: 'num',
                                value: 80,
                              },
                              h: {
                                type: 'num',
                                value: 18,
                              },
                              color: '#6f5640',
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
                              groupVar: 'blocos',
                              x: {
                                type: 'num',
                                value: 250,
                              },
                              y: {
                                type: 'num',
                                value: 150,
                              },
                              w: {
                                type: 'num',
                                value: 80,
                              },
                              h: {
                                type: 'num',
                                value: 18,
                              },
                              color: '#6f5640',
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
                              type: 'g2d:setPosition',
                              spriteVar: 'porta',
                              x: {
                                type: 'num',
                                value: 410,
                              },
                              y: {
                                type: 'num',
                                value: 216,
                              },
                            },
                          ],
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'fase',
                            },
                            right: {
                              type: 'num',
                              value: 3,
                            },
                          },
                          then: [
                            {
                              type: 'g2d:spawnInGroup',
                              groupVar: 'blocos',
                              x: {
                                type: 'num',
                                value: 120,
                              },
                              y: {
                                type: 'num',
                                value: 170,
                              },
                              w: {
                                type: 'num',
                                value: 70,
                              },
                              h: {
                                type: 'num',
                                value: 18,
                              },
                              color: '#6f5640',
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
                              groupVar: 'blocos',
                              x: {
                                type: 'num',
                                value: 240,
                              },
                              y: {
                                type: 'num',
                                value: 220,
                              },
                              w: {
                                type: 'num',
                                value: 70,
                              },
                              h: {
                                type: 'num',
                                value: 18,
                              },
                              color: '#6f5640',
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
                              groupVar: 'blocos',
                              x: {
                                type: 'num',
                                value: 340,
                              },
                              y: {
                                type: 'num',
                                value: 150,
                              },
                              w: {
                                type: 'num',
                                value: 70,
                              },
                              h: {
                                type: 'num',
                                value: 18,
                              },
                              color: '#6f5640',
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
                              type: 'g2d:setPosition',
                              spriteVar: 'porta',
                              x: {
                                type: 'num',
                                value: 360,
                              },
                              y: {
                                type: 'num',
                                value: 98,
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
                        op: '==',
                        left: {
                          type: 'var',
                          name: 'escurecendo',
                        },
                        right: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'var',
                            name: 'vitoria',
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
                  ],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Fase:',
                  value: {
                    type: 'var',
                    name: 'fase',
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
                    value: 20,
                  },
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Ache a porta para a próxima fase',
                  x: {
                    type: 'num',
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 292,
                  },
                  color: '#c7d2fe',
                  size: {
                    type: 'num',
                    value: 12,
                  },
                  align: 'left',
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
                    value: 'Você cruzou o castelo!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'O rei atravessou as três portas e chegou ao salão do trono. Que jornada!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para explorar de novo',
                  },
                  bg: '#1d4d33',
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

/**
 * Exemplo "Vale Ensolarado": recriação BÁSICA do sunnyland-platformer do Chris
 * Courses. O herói anda e pula (platformer + gravidade + colisão sólida contra o
 * grupo de plataformas) por um vale maior que a tela (cameraFollow), juntando as
 * 6 gemas para vencer. Um gambá patrulha o chão e uma águia voa; encostar tira 1
 * coração (hurtByEnemy com piscar). Ficar sem corações perde. 100% procedural
 * (formas e cores, sem tilemap nem PNGs). A behavior foi GERADA pelo parser real
 * a partir do fonte em __gen_valeEnsolarado.ts (drift test:
 * valeEnsolaradoExample.test.ts).
 */
export const valeEnsolaradoExample: ExtensionExample = beginnerGameExample({
  name: 'Vale Ensolarado',
  experience: 'game',
  description:
    'Ande e pule pelo vale para juntar as 6 gemas azuis. Desvie do gambá e da águia e cuide da sua vida. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0e2a1a',
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
          background: '#8fd0a8',
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.6,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'raposinha',
          body: [
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
                value: 8,
              },
              color: '#e8813a',
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
                value: 15,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 15,
              },
              color: '#f0a05a',
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
                value: 5,
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
                value: 3,
              },
              color: '#e8813a',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 20,
              },
              y1: {
                type: 'num',
                value: 5,
              },
              x2: {
                type: 'num',
                value: 24,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 16,
              },
              y3: {
                type: 'num',
                value: 3,
              },
              color: '#e8813a',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 11,
              },
              y: {
                type: 'num',
                value: 9,
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
                value: 17,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 2,
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
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#7a4a21',
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
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#7a4a21',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'gambazinho',
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
                value: 12,
              },
              color: '#7a5a3a',
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
                value: 3,
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
                value: 6,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#5a3f28',
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
                value: 8,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#5a3f28',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'aguiazinha',
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 9,
              },
              color: '#a8763a',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 3,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 15,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 15,
              },
              y3: {
                type: 'num',
                value: 18,
              },
              color: '#c69150',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 27,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 15,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 15,
              },
              y3: {
                type: 'num',
                value: 18,
              },
              color: '#c69150',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 15,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 22,
              },
              y2: {
                type: 'num',
                value: 10,
              },
              x3: {
                type: 'num',
                value: 22,
              },
              y3: {
                type: 'num',
                value: 14,
              },
              color: '#ffd166',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 10,
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
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'raposinha',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 150,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 38,
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
            value: 3,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'chao',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 236,
          },
          w: {
            type: 'num',
            value: 340,
          },
          h: {
            type: 'num',
            value: 34,
          },
          color: '#5a8f3a',
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
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 400,
          },
          y: {
            type: 'num',
            value: 236,
          },
          w: {
            type: 'num',
            value: 560,
          },
          h: {
            type: 'num',
            value: 34,
          },
          color: '#5a8f3a',
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
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 150,
          },
          y: {
            type: 'num',
            value: 186,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 330,
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
            value: 18,
          },
          color: '#7a5a3a',
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
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 520,
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
          color: '#7a5a3a',
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
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 140,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          varName: 'gemas',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 190,
          },
          y: {
            type: 'num',
            value: 156,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 366,
          },
          y: {
            type: 'num',
            value: 120,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 470,
          },
          y: {
            type: 'num',
            value: 206,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 556,
          },
          y: {
            type: 'num',
            value: 146,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 736,
          },
          y: {
            type: 'num',
            value: 110,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 890,
          },
          y: {
            type: 'num',
            value: 206,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
            value: 420,
          },
          y: {
            type: 'num',
            value: 204,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 16,
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
          type: 'g2d:defineEnemyType',
          varName: 'gambas',
          behavior: 'patrulha',
          color: '#7a5a3a',
          image: '',
          shape: 'gambazinho',
          hp: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0.8,
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
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'gambas',
          x: {
            type: 'num',
            value: 260,
          },
          y: {
            type: 'num',
            value: 206,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'gambas',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 206,
          },
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'aguias',
          behavior: 'voador',
          color: '#a8763a',
          image: '',
          shape: 'aguiazinha',
          hp: {
            type: 'num',
            value: 1,
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
            value: 24,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'aguias',
          x: {
            type: 'num',
            value: 480,
          },
          y: {
            type: 'num',
            value: 90,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'aguias',
          x: {
            type: 'num',
            value: 760,
          },
          y: {
            type: 'num',
            value: 70,
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
          name: 'gemasVale',
          value: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'g2d:playMusic',
          tune: 'happy',
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
                    value: 'Vale Ensolarado',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande e pule pelo vale para juntar as 6 gemas azuis. Desvie do gambá e da águia. Use as setas e a seta pra cima para pular!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1d5a78',
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
                    value: 960,
                  },
                  worldH: {
                    type: 'num',
                    value: 270,
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
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi',
                  groupVar: 'chao',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'g2d:centerY',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 300,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'num',
                        value: -1,
                      },
                    },
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'heroi',
                      x: {
                        type: 'num',
                        value: 60,
                      },
                      y: {
                        type: 'num',
                        value: 150,
                      },
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
                        value: 0,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'hurt',
                    },
                  ],
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'gambas',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'gambas',
                  itemName: 'gamba',
                  body: [
                    {
                      type: 'g2d:collideGroup',
                      spriteVar: 'gamba',
                      groupVar: 'chao',
                    },
                  ],
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'aguias',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'chao',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'gemas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'coracoes',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'gambas',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'aguias',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'gemas',
                  itemName: 'gema',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'gema',
                      groupVar: 'gemas',
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
                          value: 10,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'gemasVale',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'gemasVale',
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
                        spriteVar: 'gema',
                      },
                      y: {
                        type: 'g2d:centerY',
                        spriteVar: 'gema',
                      },
                      count: {
                        type: 'num',
                        value: 12,
                      },
                      color: '#7dd3fc',
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'gem',
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
                      groupVar: 'gambas',
                      itemName: 'gamba',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'gamba',
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
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'heroi',
                      groupVar: 'aguias',
                      itemName: 'aguia',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'aguia',
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
                  label: 'Gemas:',
                  value: {
                    type: 'var',
                    name: 'gemasVale',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 52,
                  },
                  color: '#7dd3fc',
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
                    op: '<=',
                    left: {
                      type: 'var',
                      name: 'gemasVale',
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
                    value: 'Você juntou as gemas!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Todas as 6 gemas brilham no seu bolso e você fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos. Que aventura no vale!',
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
                    value: 'O herói cansou!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Os bichos do vale venceram desta vez. Você juntou ',
                      },
                      right: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 6,
                        },
                        right: {
                          type: 'var',
                          name: 'gemasVale',
                        },
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' gemas.',
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

/**
 * Exemplo "Treinador de Criaturas": recriacao BASICA e ENXUTA do
 * pokemon-style-game do Chris Courses (RPG top-down + batalha por turnos). O
 * heroi anda nas 4 direcoes com colisao contra os muros; ao encostar no mato
 * alto uma batalha por turnos comeca contra uma criatura selvagem (golpes por
 * teclas 1/2/3, barras de vida, vencer ou perder) e o objetivo e vencer a
 * batalha. 100% procedural (formas e cores, sem os PNGs do mapa e dos monstros).
 * A behavior foi GERADA pelo parser real a partir do fonte em
 * __gen_treinadorDeCriaturas.ts (drift test: treinadorDeCriaturasExample.test.ts).
 */
export const treinadorDeCriaturasExample: ExtensionExample = beginnerGameExample({
  name: 'Treinador de Criaturas',
  experience: 'game',
  description:
    'Ande com as setas e entre no mato alto para achar uma criatura. Vença a batalha por turnos com as teclas 1, 2 e 3. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0f1220',
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
          background: '#3f7d4f',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g2d:fitScreen', percent: { type: 'num', value: 100 } },
        {
          type: 'g2d:defineShape',
          shapeName: 'treinador',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 4 },
              w: { type: 'num', value: 14 },
              h: { type: 'num', value: 12 },
              color: '#3a2a1a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 14 },
              w: { type: 'num', value: 18 },
              h: { type: 'num', value: 8 },
              color: '#c0392b',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 12 },
              y: { type: 'num', value: 10 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 18 },
              y: { type: 'num', value: 10 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 14 },
              h: { type: 'num', value: 12 },
              color: '#2c5aa0',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 4 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 5 },
              h: { type: 'num', value: 9 },
              color: '#e8b088',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 5 },
              h: { type: 'num', value: 9 },
              color: '#e8b088',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'criatura',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 16 },
              y: { type: 'num', value: 18 },
              r: { type: 'num', value: 13 },
              color: '#7b4fbf',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: { type: 'num', value: 8 },
              y1: { type: 'num', value: 8 },
              x2: { type: 'num', value: 4 },
              y2: { type: 'num', value: 0 },
              x3: { type: 'num', value: 13 },
              y3: { type: 'num', value: 8 },
              color: '#5a3a92',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: { type: 'num', value: 24 },
              y1: { type: 'num', value: 8 },
              x2: { type: 'num', value: 28 },
              y2: { type: 'num', value: 0 },
              x3: { type: 'num', value: 19 },
              y3: { type: 'num', value: 8 },
              color: '#5a3a92',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 11 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 3 },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 3 },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 11 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'treinador',
          x: { type: 'num', value: 90 },
          y: { type: 'num', value: 210 },
          w: { type: 'num', value: 30 },
          h: { type: 'num', value: 34 },
        },
        { type: 'g2d:setHitboxScale', spriteVar: 'heroi', percent: { type: 'num', value: 80 } },
        {
          type: 'g2d:createShapeSprite',
          varName: 'rival',
          shapeName: 'criatura',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 60 },
          w: { type: 'num', value: 96 },
          h: { type: 'num', value: 96 },
        },
        { type: 'g2d:setHealth', spriteVar: 'heroi', amount: { type: 'num', value: 24 } },
        { type: 'g2d:setHealth', spriteVar: 'rival', amount: { type: 'num', value: 24 } },
        { type: 'g2d:createGroup', varName: 'muros' },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 480 },
          h: { type: 'num', value: 20 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 250 },
          w: { type: 'num', value: 480 },
          h: { type: 'num', value: 20 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 20 },
          h: { type: 'num', value: 270 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 460 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 20 },
          h: { type: 'num', value: 270 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 150 },
          y: { type: 'num', value: 120 },
          w: { type: 'num', value: 60 },
          h: { type: 'num', value: 60 },
          color: '#5a4e42',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:createSprite',
          varName: 'mato',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 170 },
          w: { type: 'num', value: 90 },
          h: { type: 'num', value: 70 },
          color: '#2e7d4f',
        },
        { type: 'var', name: 'turno', value: { type: 'str', value: 'espera' } },
        { type: 'var', name: 'dano', value: { type: 'num', value: 0 } },
        {
          type: 'var',
          name: 'mensagem',
          value: { type: 'str', value: 'Ache o mato alto para achar uma criatura!' },
        },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'mapa' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'jogador' },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '1' },
                      },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 8 } },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: { type: 'num', value: 0 },
                            right: { type: 'var', name: 'dano' },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: { type: 'num', value: 24 },
                        },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: { type: 'num', value: 6 } },
                        { type: 'g2d:playFx', fx: 'explosion' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: { type: 'str', value: 'Brasa! A criatura perdeu ' },
                              right: { type: 'var', name: 'dano' },
                            },
                            right: { type: 'str', value: ' de vida' },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '2' },
                      },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 5 } },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: { type: 'num', value: 0 },
                            right: { type: 'var', name: 'dano' },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: { type: 'num', value: 24 },
                        },
                        { type: 'g2d:playFx', fx: 'hit' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: { type: 'str', value: 'Rajada! A criatura perdeu ' },
                              right: { type: 'var', name: 'dano' },
                            },
                            right: { type: 'str', value: ' de vida' },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '3' },
                      },
                      then: [
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'heroi',
                          delta: { type: 'num', value: 3 },
                        },
                        { type: 'g2d:playFx', fx: 'heal' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: { type: 'str', value: 'Foco! Você recuperou um pouco de vida' },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
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
            { type: 'g2d:clear' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Treinador de Criaturas' },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande com as setas e entre no mato alto para encontrar uma criatura selvagem. Vença a batalha por turnos!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para começar' },
                  bg: '#1f2a44',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'mapa' },
              then: [
                { type: 'g2d:topDown', spriteVar: 'heroi', speed: { type: 'num', value: 3 } },
                { type: 'g2d:collideGroup', spriteVar: 'heroi', groupVar: 'muros' },
                { type: 'g2d:drawSprite', spriteVar: 'mato', ctxVar: 'ctx' },
                { type: 'g2d:drawGroup', groupVar: 'muros', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: { type: 'var', name: 'mensagem' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 40 },
                  color: '#f3f6ff',
                  size: { type: 'num', value: 14 },
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:touches', aVar: 'heroi', bVar: 'mato' },
                  then: [
                    { type: 'assign', name: 'turno', value: { type: 'str', value: 'jogador' } },
                    {
                      type: 'assign',
                      name: 'mensagem',
                      value: { type: 'str', value: 'Uma criatura selvagem apareceu!' },
                    },
                    { type: 'g2d:playFx', fx: 'start' },
                    { type: 'g2d:setScene', name: 'batalha' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'rival', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Você',
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 208 },
                  color: '#a8d8ff',
                  size: { type: 'num', value: 14 },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: { type: 'g2d:getHealth', spriteVar: 'heroi' },
                  max: { type: 'g2d:getMaxHealth', spriteVar: 'heroi' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 216 },
                  w: { type: 'num', value: 150 },
                  h: { type: 'num', value: 12 },
                  color: '#3fbf6f',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Criatura selvagem',
                  x: { type: 'num', value: 300 },
                  y: { type: 'num', value: 36 },
                  color: '#d8b4ff',
                  size: { type: 'num', value: 14 },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: { type: 'g2d:getHealth', spriteVar: 'rival' },
                  max: { type: 'g2d:getMaxHealth', spriteVar: 'rival' },
                  x: { type: 'num', value: 300 },
                  y: { type: 'num', value: 44 },
                  w: { type: 'num', value: 150 },
                  h: { type: 'num', value: 12 },
                  color: '#3fbf6f',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'jogador' },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'Sua vez! Escolha o golpe com as teclas:',
                      x: { type: 'num', value: 26 },
                      y: { type: 'num', value: 234 },
                      color: '#ffe9a8',
                      size: { type: 'num', value: 13 },
                      align: 'left',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'criatura' },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'A criatura prepara o golpe dela...',
                      x: { type: 'num', value: 26 },
                      y: { type: 'num', value: 234 },
                      color: '#ffb4a8',
                      size: { type: 'num', value: 13 },
                      align: 'left',
                    },
                  ],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: { type: 'var', name: 'mensagem' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 252 },
                  color: '#f3f6ff',
                  size: { type: 'num', value: 13 },
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: '1 Brasa (forte)   2 Rajada (média)   3 Foco (cura)',
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 270 },
                  color: '#c7d2fe',
                  size: { type: 'num', value: 13 },
                  align: 'left',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'rival' },
                  then: [
                    { type: 'g2d:playFx', fx: 'win' },
                    { type: 'g2d:setScene', name: 'vitoria' },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'heroi' },
                  then: [
                    { type: 'g2d:playFx', fx: 'gameover' },
                    { type: 'g2d:setScene', name: 'derrota' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Você venceu a batalha!' },
                  subtitle: {
                    type: 'str',
                    value: 'A criatura selvagem desmaiou. Você é um treinador de verdade!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para jogar de novo' },
                  bg: '#1d4d33',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Você perdeu!' },
                  subtitle: {
                    type: 'str',
                    value:
                      'Sua vida acabou nesta batalha. Escolha melhor os golpes e tente de novo!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para tentar de novo' },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: { type: 'num', value: 1.2 },
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'criatura' },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: { type: 'g2d:randomChance', percent: { type: 'num', value: 50 } },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 4 } },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: { type: 'str', value: 'A criatura mordeu! Você perdeu 4 de vida' },
                        },
                      ],
                      else: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 6 } },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'A criatura deu uma patada! Você perdeu 6 de vida',
                          },
                        },
                      ],
                    },
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'binop',
                        op: '-',
                        left: { type: 'num', value: 0 },
                        right: { type: 'var', name: 'dano' },
                      },
                    },
                    {
                      type: 'g2d:blinkSprite',
                      spriteVar: 'heroi',
                      frames: { type: 'num', value: 24 },
                    },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: { type: 'num', value: 5 } },
                    { type: 'g2d:playFx', fx: 'hurt' },
                    { type: 'assign', name: 'turno', value: { type: 'str', value: 'jogador' } },
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
