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
                            value: 236,
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
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: 150,
                    },
                    max: {
                      type: 'num',
                      value: 190,
                    },
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
                        type: 'g2d:spriteY',
                        spriteVar: 'torre',
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
