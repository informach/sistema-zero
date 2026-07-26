import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from './shared'

/**
 * Exemplo "Dino Corredor": o degrau de ENTRADA da família Clear Code (recriação
 * do Dino runner em três níveis; este é o BÁSICO). Um só obstáculo (cacto), pulo
 * com espaço, placar que cresce a cada segundo de sobrevivência e a vitrine da
 * COLISÃO PERDOADORA: o dino usa 80% do tamanho como área de colisão
 * (setHitboxScale), o dial de dificuldade do estudo Clear Code. Os cactos nascem
 * na borda direita numa raiz "A cada 1,4 segundos" com posição e velocidade
 * levemente sorteadas, e uma raiz "A cada 5 segundos" acelera o jogo aos poucos.
 * Telas de início e fim com reinício por Enter. 100% procedural (Kit dino).
 * A behavior abaixo foi GERADA pelo parser real a partir do fonte em
 * __gen_dinoCorredor.ts (drift test: dinoCorredorExample.test.ts).
 */
export const dinoCorredorExample: ExtensionExample = beginnerGameExample({
  name: 'Dino Corredor',
  experience: 'game',
  description:
    'Corra com o dino e pule os cactos apertando espaço. Cada segundo de corrida vale 1 ponto e os cactos vão ficando mais rápidos. Enter ou espaço começa; Enter reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#bdf4ff',
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
          background: '#bdf4ff',
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
          type: 'g2d:createDino',
          varName: 'dino',
          x: {
            type: 'num',
            value: 110,
          },
          y: {
            type: 'num',
            value: 150,
          },
          size: {
            type: 'num',
            value: 64,
          },
          color: '#5fb45f',
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'dino',
          percent: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'cactos',
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
          name: 'velocidade',
          value: {
            type: 'num',
            value: -5,
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
                      spriteVar: 'dino',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'jump',
                    },
                  ],
                },
              ],
            },
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
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            {
              type: 'g2d:clear',
            },
            {
              type: 'g2d:forest',
              ctxVar: 'ctx',
              speed: {
                type: 'num',
                value: 5,
              },
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
                    value: 'Dino Corredor',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Pule os cactos e sobreviva o maior tempo que você conseguir!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para começar',
                  },
                  bg: '#185078',
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
                  type: 'g2d:controlDino',
                  spriteVar: 'dino',
                  ctxVar: 'ctx',
                  jump: {
                    type: 'num',
                    value: 15,
                  },
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'dino',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'cactos',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'cactos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'dino',
                  groupVar: 'cactos',
                  itemName: 'cacto',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'cacto',
                      color: '#ff5d3d',
                    },
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
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'cactos',
                  ctxVar: 'ctx',
                  itemName: 'cacto',
                  body: [],
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
                    value: 12,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#20415c',
                  size: {
                    type: 'num',
                    value: 22,
                  },
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
                    value: 'Bateu no cacto!',
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
                      value: ' pontos. Tente bater essa marca!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para reiniciar',
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
                  type: 'g2d:spawnObstacle',
                  groupVar: 'cactos',
                  ctxVar: 'ctx',
                  shape: 'cactus',
                  x: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: 500,
                    },
                    max: {
                      type: 'num',
                      value: 560,
                    },
                  },
                  size: {
                    type: 'num',
                    value: 44,
                  },
                  vx: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'g2d:randomBetween',
                      min: {
                        type: 'num',
                        value: 0,
                      },
                      max: {
                        type: 'num',
                        value: 1,
                      },
                    },
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
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 5,
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
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: -9,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'velocidade',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'velocidade',
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
