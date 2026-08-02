import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

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
                  type: 'g2d:applyGravity',
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
