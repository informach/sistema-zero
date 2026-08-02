import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

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
                  type: 'g2d:applyGravity',
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
