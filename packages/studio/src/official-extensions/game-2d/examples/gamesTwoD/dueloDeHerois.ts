import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

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
      molds: [
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
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.7,
          },
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
                  type: 'g2d:applyGravity',
                  spriteVar: 'heroi1',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi1',
                },
                {
                  type: 'g2d:applyGravity',
                  spriteVar: 'heroi2',
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
                        {
                          type: 'assign',
                          name: 'atacando1',
                          value: {
                            type: 'num',
                            value: 1,
                          },
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
                        {
                          type: 'assign',
                          name: 'atacando2',
                          value: {
                            type: 'num',
                            value: 1,
                          },
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
                    type: 'logical',
                    op: '&&',
                    left: {
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
                    right: {
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
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'win',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'empate',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
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
                    right: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'g2d:getHealth',
                        spriteVar: 'heroi1',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
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
                    type: 'logical',
                    op: '&&',
                    left: {
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
                    right: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'g2d:getHealth',
                        spriteVar: 'heroi2',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
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
                    value: 'A luta terminou sem vencedor. Os dois heróis deram tudo de si!',
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
