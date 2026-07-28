import type { ExtensionExample } from '#extensions'
import { beginnerGameExample, EXAMPLE_TREE_IMAGE } from './shared'

/**
 * Exemplo "Dino Corredor": o degrau de ENTRADA da família Clear Code (recriação
 * do Dino runner em três níveis; este é o BÁSICO). Um só obstáculo (cacto), pulo
 * com espaço, placar que cresce a cada segundo de sobrevivência e a vitrine da
 * COLISÃO PERDOADORA: o dino usa 80% do tamanho como área de colisão
 * (setHitboxScale), o dial de dificuldade do estudo Clear Code. Os cactos nascem
 * na borda direita numa raiz "A cada 1,4 segundos" com posição e velocidade
 * levemente sorteadas, e uma raiz "A cada 5 segundos" acelera o jogo aos poucos.
 * Telas de início e fim com reinício por Enter ou espaço. 100% procedural (Kit dino).
 * A behavior abaixo foi GERADA pelo parser real a partir do fonte em
 * __gen_dinoCorredor.ts (drift test: dinoCorredorExample.test.ts).
 */
export const dinoCorredorExample: ExtensionExample = beginnerGameExample({
  name: 'Dino Corredor',
  experience: 'game',
  description:
    'Corra com o dino e pule os cactos apertando espaço. Cada segundo de corrida vale 1 ponto e os cactos vão ficando mais rápidos. Enter ou espaço começa e reinicia.',
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

/**
 * Exemplo 'Batalha de Monstrinhos': o degrau de ENTRADA da família Pokemon-style
 * Battle (Clear Code). Sem movimento: dois monstrinhos desenhados por código
 * frente a frente. Menu por TECLAS (1/2/3) desenhado na tela, tabela de
 * vantagem em ses explícitos (fogo x2 contra planta), cura como dano negativo
 * (o runtime clampa no máximo) LIMITADA a 3 poções por partida (o placar
 * mostra quantas restam; com 0, a tecla 3 avisa e não gasta o turno), turnos
 * com uma raiz 'A cada 1,5 segundos' que só age quando turno == 'inimigo' e a
 * abertura em duas peças: o one-shot afterSeconds marca aberturaPronta aos 2s
 * e uma raiz 'A cada 0,5 segundos' libera os comandos quando cena jogando +
 * aberturaPronta + turno espera (ficar no título não consome o beat; reiniciar
 * re-arma). A behavior abaixo foi GERADA pelo parser real a partir do fonte em
 * __gen_batalhaMonstrinhos.ts (drift test: batalhaMonstrinhosExample.test.ts).
 */
export const batalhaMonstrinhosExample: ExtensionExample = beginnerGameExample({
  name: 'Batalha de Monstrinhos',
  experience: 'game',
  description:
    'Escolha o golpe com as teclas 1, 2 e 3: a Faísca de fogo tira o dobro do monstrinho de planta e a Poção cura. Vença antes que a sua vida acabe!',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#141a2e',
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
          background: '#28325a',
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
          shapeName: 'brasinha',
          body: [
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 16,
              },
              y1: {
                type: 'num',
                value: 26,
              },
              x2: {
                type: 'num',
                value: 34,
              },
              y2: {
                type: 'num',
                value: 58,
              },
              x3: {
                type: 'num',
                value: 6,
              },
              y3: {
                type: 'num',
                value: 62,
              },
              color: '#ff5d3d',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 62,
              },
              y: {
                type: 'num',
                value: 52,
              },
              r: {
                type: 'num',
                value: 30,
              },
              color: '#ff8c42',
            },
            {
              type: 'g2d:paintEllipse',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 46,
              },
              y: {
                type: 'num',
                value: 56,
              },
              w: {
                type: 'num',
                value: 34,
              },
              h: {
                type: 'num',
                value: 24,
              },
              color: '#ffd166',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 76,
              },
              y: {
                type: 'num',
                value: 40,
              },
              r: {
                type: 'num',
                value: 5,
              },
              color: '#1c2030',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 48,
              },
              y: {
                type: 'num',
                value: 80,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#e07030',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 70,
              },
              y: {
                type: 'num',
                value: 80,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#e07030',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'folhito',
          body: [
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 55,
              },
              y1: {
                type: 'num',
                value: 4,
              },
              x2: {
                type: 'num',
                value: 40,
              },
              y2: {
                type: 'num',
                value: 30,
              },
              x3: {
                type: 'num',
                value: 70,
              },
              y3: {
                type: 'num',
                value: 30,
              },
              color: '#2f8f46',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 55,
              },
              y: {
                type: 'num',
                value: 56,
              },
              r: {
                type: 'num',
                value: 28,
              },
              color: '#58b368',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 42,
              },
              y: {
                type: 'num',
                value: 48,
              },
              r: {
                type: 'num',
                value: 5,
              },
              color: '#1c2030',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 40,
              },
              y: {
                type: 'num',
                value: 78,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#3e9d52',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 60,
              },
              y: {
                type: 'num',
                value: 78,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 10,
              },
              color: '#3e9d52',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'meu',
          shapeName: 'brasinha',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 140,
          },
          w: {
            type: 'num',
            value: 110,
          },
          h: {
            type: 'num',
            value: 90,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'rival',
          shapeName: 'folhito',
          x: {
            type: 'num',
            value: 310,
          },
          y: {
            type: 'num',
            value: 44,
          },
          w: {
            type: 'num',
            value: 110,
          },
          h: {
            type: 'num',
            value: 90,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'meu',
          amount: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'rival',
          amount: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'var',
          name: 'turno',
          value: {
            type: 'str',
            value: 'espera',
          },
        },
        {
          type: 'var',
          name: 'forca',
          value: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'var',
          name: 'dano',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'pocoes',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'var',
          name: 'aberturaPronta',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'mensagem',
          value: {
            type: 'str',
            value: 'Os monstrinhos se encaram!',
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
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
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
                      name: 'turno',
                    },
                    right: {
                      type: 'str',
                      value: 'jogador',
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'eventProp',
                          prop: 'key',
                        },
                        right: {
                          type: 'str',
                          value: '1',
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'dano',
                          value: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'var',
                              name: 'forca',
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                        },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'num',
                              value: 0,
                            },
                            right: {
                              type: 'var',
                              name: 'dano',
                            },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: {
                            type: 'num',
                            value: 24,
                          },
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
                          fx: 'explosion',
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'str',
                                value: 'Faísca! Fogo contra planta tira o dobro: ',
                              },
                              right: {
                                type: 'var',
                                name: 'dano',
                              },
                            },
                            right: {
                              type: 'str',
                              value: ' de dano',
                            },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: {
                            type: 'str',
                            value: 'inimigo',
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
                          type: 'eventProp',
                          prop: 'key',
                        },
                        right: {
                          type: 'str',
                          value: '2',
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'dano',
                          value: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'var',
                              name: 'forca',
                            },
                            right: {
                              type: 'num',
                              value: 1,
                            },
                          },
                        },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'num',
                              value: 0,
                            },
                            right: {
                              type: 'var',
                              name: 'dano',
                            },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: {
                            type: 'num',
                            value: 24,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'hit',
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'str',
                              value: 'Jato de água! Dano normal: ',
                            },
                            right: {
                              type: 'var',
                              name: 'dano',
                            },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: {
                            type: 'str',
                            value: 'inimigo',
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
                          type: 'eventProp',
                          prop: 'key',
                        },
                        right: {
                          type: 'str',
                          value: '3',
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '>',
                            left: {
                              type: 'var',
                              name: 'pocoes',
                            },
                            right: {
                              type: 'num',
                              value: 0,
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'pocoes',
                              value: {
                                type: 'binop',
                                op: '-',
                                left: {
                                  type: 'var',
                                  name: 'pocoes',
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'g2d:changeHealth',
                              spriteVar: 'meu',
                              delta: {
                                type: 'num',
                                value: 5,
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'heal',
                            },
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'str',
                                value: 'Poção! Brasinha curou até 5 de vida',
                              },
                            },
                            {
                              type: 'assign',
                              name: 'turno',
                              value: {
                                type: 'str',
                                value: 'inimigo',
                              },
                            },
                          ],
                          else: [
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'str',
                                value: 'As poções acabaram! Use a Faísca ou o Jato',
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
                    value: 'Batalha de Monstrinhos',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Brasinha, o monstrinho de fogo, desafia Folhito, o monstrinho de planta!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para batalhar',
                  },
                  bg: '#233457',
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
                  type: 'g2d:drawSprite',
                  spriteVar: 'meu',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'rival',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Brasinha (fogo)',
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 122,
                  },
                  color: '#ffd166',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: {
                    type: 'g2d:getHealth',
                    spriteVar: 'meu',
                  },
                  max: {
                    type: 'g2d:getMaxHealth',
                    spriteVar: 'meu',
                  },
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 130,
                  },
                  w: {
                    type: 'num',
                    value: 150,
                  },
                  h: {
                    type: 'num',
                    value: 12,
                  },
                  color: '#3fbf6f',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Folhito (planta)',
                  x: {
                    type: 'num',
                    value: 310,
                  },
                  y: {
                    type: 'num',
                    value: 22,
                  },
                  color: '#9be48b',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: {
                    type: 'g2d:getHealth',
                    spriteVar: 'rival',
                  },
                  max: {
                    type: 'g2d:getMaxHealth',
                    spriteVar: 'rival',
                  },
                  x: {
                    type: 'num',
                    value: 310,
                  },
                  y: {
                    type: 'num',
                    value: 30,
                  },
                  w: {
                    type: 'num',
                    value: 150,
                  },
                  h: {
                    type: 'num',
                    value: 12,
                  },
                  color: '#3fbf6f',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'turno',
                    },
                    right: {
                      type: 'str',
                      value: 'espera',
                    },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'Os monstrinhos se preparam...',
                      x: {
                        type: 'num',
                        value: 20,
                      },
                      y: {
                        type: 'num',
                        value: 232,
                      },
                      color: '#aab7d8',
                      size: {
                        type: 'num',
                        value: 13,
                      },
                      align: 'left',
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
                      name: 'turno',
                    },
                    right: {
                      type: 'str',
                      value: 'jogador',
                    },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'Sua vez! Escolha o golpe com as teclas:',
                      x: {
                        type: 'num',
                        value: 20,
                      },
                      y: {
                        type: 'num',
                        value: 232,
                      },
                      color: '#ffe9a8',
                      size: {
                        type: 'num',
                        value: 13,
                      },
                      align: 'left',
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
                      name: 'turno',
                    },
                    right: {
                      type: 'str',
                      value: 'inimigo',
                    },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'Folhito prepara o golpe dele...',
                      x: {
                        type: 'num',
                        value: 20,
                      },
                      y: {
                        type: 'num',
                        value: 232,
                      },
                      color: '#ffb4a8',
                      size: {
                        type: 'num',
                        value: 13,
                      },
                      align: 'left',
                    },
                  ],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: {
                    type: 'var',
                    name: 'mensagem',
                  },
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 252,
                  },
                  color: '#f3f6ff',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: '1 Faísca (fogo, dano x2 na planta)',
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 272,
                  },
                  color: '#ffd166',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                  align: 'left',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: '2 Jato (água, dano x1)',
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 290,
                  },
                  color: '#8fd0ff',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                  align: 'left',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '3 Poção (cura 5) x',
                  value: {
                    type: 'var',
                    name: 'pocoes',
                  },
                  x: {
                    type: 'num',
                    value: 200,
                  },
                  y: {
                    type: 'num',
                    value: 290,
                  },
                  color: '#8fd0ff',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:healthDepleted',
                    spriteVar: 'rival',
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
                    spriteVar: 'meu',
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
                    value: 'Você venceu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Folhito não aguentou a Faísca em dobro. Fogo é forte contra planta!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para batalhar de novo',
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
                    value: 'Você perdeu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Brasinha ficou sem vida. Use a Poção na hora certa e tente de novo!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para batalhar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:afterSeconds',
          seconds: {
            type: 'num',
            value: 2,
          },
          body: [
            {
              type: 'assign',
              name: 'aberturaPronta',
              value: {
                type: 'num',
                value: 1,
              },
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'aberturaPronta',
                    },
                    right: {
                      type: 'num',
                      value: 1,
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
                          name: 'turno',
                        },
                        right: {
                          type: 'str',
                          value: 'espera',
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'turno',
                          value: {
                            type: 'str',
                            value: 'jogador',
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'Sua vez! Aperte 1, 2 ou 3',
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
        {
          type: 'g2d:everySeconds',
          seconds: {
            type: 'num',
            value: 1.5,
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
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'turno',
                    },
                    right: {
                      type: 'str',
                      value: 'inimigo',
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:randomChance',
                        percent: {
                          type: 'num',
                          value: 60,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'meu',
                          delta: {
                            type: 'num',
                            value: -3,
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'Chicote de Cipó! Brasinha perdeu 3 de vida',
                          },
                        },
                      ],
                      else: [
                        {
                          type: 'assign',
                          name: 'dano',
                          value: {
                            type: 'g2d:randomBetween',
                            min: {
                              type: 'num',
                              value: 2,
                            },
                            max: {
                              type: 'num',
                              value: 5,
                            },
                          },
                        },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'meu',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'num',
                              value: 0,
                            },
                            right: {
                              type: 'var',
                              name: 'dano',
                            },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'str',
                                value: 'Folha Afiada! Brasinha perdeu ',
                              },
                              right: {
                                type: 'var',
                                name: 'dano',
                              },
                            },
                            right: {
                              type: 'str',
                              value: ' de vida',
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: 'g2d:blinkSprite',
                      spriteVar: 'meu',
                      frames: {
                        type: 'num',
                        value: 24,
                      },
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
                      name: 'turno',
                      value: {
                        type: 'str',
                        value: 'jogador',
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

/** Tileset procedural da vila (SVG): peça 0 terra, 1 pedra sólida, 2 mato cortável. */
export const AVENTURA_TILESET_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjZDliMzgwIi8+PGNpcmNsZSBjeD0iOSIgY3k9IjExIiByPSIyIiBmaWxsPSIjYzQ5YTYzIi8+PGNpcmNsZSBjeD0iMjIiIGN5PSIyMSIgcj0iMiIgZmlsbD0iI2M0OWE2MyIvPjxyZWN0IHg9IjMyIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiM3ZDg1OTMiLz48cmVjdCB4PSIzNSIgeT0iMyIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iNSIgZmlsbD0iIzVmNjc3MiIvPjxyZWN0IHg9IjQwIiB5PSI5IiB3aWR0aD0iNyIgaGVpZ2h0PSI1IiByeD0iMiIgZmlsbD0iIzhkOTVhMyIvPjxyZWN0IHg9IjUwIiB5PSIxOCIgd2lkdGg9IjgiIGhlaWdodD0iNSIgcng9IjIiIGZpbGw9IiM0YTUxNWIiLz48cmVjdCB4PSI2NCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzljOTRmIi8+PGNpcmNsZSBjeD0iNzIiIGN5PSIxNSIgcj0iNyIgZmlsbD0iIzNlOWQzYSIvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iMTMiIHI9IjgiIGZpbGw9IiM0NmFiNDEiLz48Y2lyY2xlIGN4PSI3OCIgY3k9IjIzIiByPSI5IiBmaWxsPSIjMzU4YzM0Ii8+PGNpcmNsZSBjeD0iODgiIGN5PSIyNCIgcj0iNiIgZmlsbD0iIzJmN2QyZSIvPjwvc3ZnPg=='

/**
 * Exemplo 'Aventura do Herói': o degrau de ENTRADA da família Zelda-style
 * Adventure (Clear Code). Mundo 1600x1200 (tilemap 40x30 com colisão) maior
 * que a tela, com câmera seguindo o herói. Mato sólido e CORTÁVEL
 * (breakTileAtSprite + partículas + ponto), espada como sprite temporário num
 * grupo com pruneOld (0,3s) nascendo na direção olhada (miraX/miraY vindas
 * das setas), inimigos perseguidores do kit com hurtByEnemy (i-frames) e as
 * vitrines drawGroupByY (o herói entra no MESMO grupo das árvores e passa
 * ATRÁS delas) e setHitboxScale 80% (colisão perdoadora). A behavior abaixo
 * foi GERADA pelo parser real a partir do fonte em __gen_aventuraHeroi.ts
 * (drift test: aventuraHeroiExample.test.ts).
 */
export const aventuraHeroiExample: ExtensionExample = beginnerGameExample({
  name: 'Aventura do Herói',
  experience: 'game',
  description:
    'Ande com as setas pelo mundo grande, corte o mato com espaço e derrote os 4 guardiões. A espada nasce na direção em que você olha. Enter começa e reinicia.',
  assets: [
    {
      id: 'example-aventura-tileset',
      name: 'pecas-da-vila',
      kind: 'image',
      dataUrl: AVENTURA_TILESET_IMAGE,
      width: 96,
      height: 32,
      source: 'library',
      libId: 'example-aventura-tileset',
    },
    {
      id: 'example-aventura-arvore',
      name: 'arvore',
      kind: 'image',
      dataUrl: EXAMPLE_TREE_IMAGE,
      width: 54,
      height: 70,
      source: 'library',
      libId: 'example-aventura-arvore',
    },
  ],
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#24401c',
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
          background: '#7ec850',
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
              color: '#2f8f46',
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
          shapeName: 'guardiao',
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
                value: 14,
              },
              color: '#8d55c9',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 6,
              },
              y1: {
                type: 'num',
                value: 6,
              },
              x2: {
                type: 'num',
                value: 12,
              },
              y2: {
                type: 'num',
                value: 2,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5d3591',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 28,
              },
              y1: {
                type: 'num',
                value: 6,
              },
              x2: {
                type: 'num',
                value: 22,
              },
              y2: {
                type: 'num',
                value: 2,
              },
              x3: {
                type: 'num',
                value: 22,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5d3591',
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
                value: 14,
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
                value: 23,
              },
              y: {
                type: 'num',
                value: 14,
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
                value: 11,
              },
              y: {
                type: 'num',
                value: 14,
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
                value: 23,
              },
              y: {
                type: 'num',
                value: 14,
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
          type: 'g2d:createTileMap',
          varName: 'mapa',
          image: 'pecas-da-vila',
          tile: {
            type: 'num',
            value: 32,
          },
          solid: '1 2',
          grid: '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . 2 2 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . 2 . . . . . . . . . . . 1 1 1 1 1 1 1 1 1 . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . 1 0 0 0 0 0 0 0 1 . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . 1 0 0 0 0 0 0 0 2 . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . 1 0 0 0 0 0 0 0 1 . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . 1 1 1 1 1 1 1 1 1 . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2 2 2 . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2 2 2 . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . 2 2 2 2 . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . 2 2 2 2 . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . 1 1 1 1 1 1 1 1 1 . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . 1 0 0 0 0 0 0 0 1 . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . 2 0 0 0 0 0 0 0 1 . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . 1 0 0 0 0 0 0 0 1 . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . 1 1 1 1 1 1 1 1 1 . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . 2 2 2 2 2 2 2 2 2 2 . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1;1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1',
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'heroizinho',
          x: {
            type: 'num',
            value: 773,
          },
          y: {
            type: 'num',
            value: 580,
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
            value: 6,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'cenario',
        },
        {
          type: 'var',
          name: 'pecasDoCenario',
          value: {
            type: 'memberGet',
            object: {
              type: 'var',
              name: 'cenario',
            },
            name: 'items',
          },
          kind: 'const',
        },
        {
          type: 'arrayPush',
          arrayVar: 'pecasDoCenario',
          value: {
            type: 'var',
            name: 'heroi',
          },
        },
        {
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 470,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 860,
          },
          y: {
            type: 'num',
            value: 540,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 640,
          },
          y: {
            type: 'num',
            value: 640,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 900,
          },
          y: {
            type: 'num',
            value: 660,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 500,
          },
          y: {
            type: 'num',
            value: 320,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          type: 'g2d:spawnImageInGroup',
          groupVar: 'cenario',
          x: {
            type: 'num',
            value: 1060,
          },
          y: {
            type: 'num',
            value: 420,
          },
          w: {
            type: 'num',
            value: 54,
          },
          h: {
            type: 'num',
            value: 70,
          },
          image: 'arvore',
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
          varName: 'guarda',
          behavior: 'perseguidor',
          color: '#8d55c9',
          image: '',
          shape: 'guardiao',
          hp: {
            type: 'num',
            value: 3,
          },
          speed: {
            type: 'num',
            value: 1.2,
          },
          dmg: {
            type: 'num',
            value: 1,
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
          type: 'g2d:spawnEnemy',
          typeVar: 'guarda',
          x: {
            type: 'num',
            value: 200,
          },
          y: {
            type: 'num',
            value: 200,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'guarda',
          x: {
            type: 'num',
            value: 1360,
          },
          y: {
            type: 'num',
            value: 240,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'guarda',
          x: {
            type: 'num',
            value: 240,
          },
          y: {
            type: 'num',
            value: 960,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'guarda',
          x: {
            type: 'num',
            value: 1320,
          },
          y: {
            type: 'num',
            value: 880,
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
          typeVar: 'guarda',
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
                value: 18,
              },
              color: '#c084fc',
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
                    value: 'Aventura do Herói',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Corte o mato com espaço e derrote os 4 guardiões que rondam a vila!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1d4d33',
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
                    value: 1600,
                  },
                  worldH: {
                    type: 'num',
                    value: 1200,
                  },
                },
                {
                  type: 'g2d:drawTileMap',
                  ctxVar: 'ctx',
                  mapVar: 'mapa',
                  x: {
                    type: 'num',
                    value: 560,
                  },
                  y: {
                    type: 'num',
                    value: 420,
                  },
                  size: {
                    type: 'num',
                    value: 40,
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
                  type: 'g2d:tileMapCollide',
                  spriteVar: 'heroi',
                  mapVar: 'mapa',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'guarda',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'guarda',
                  itemName: 'inimigo',
                  body: [
                    {
                      type: 'g2d:tileMapCollide',
                      spriteVar: 'inimigo',
                      mapVar: 'mapa',
                    },
                  ],
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'golpes',
                  aName: 'golpe',
                  bGroup: 'guarda',
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
                      fx: 'punch',
                    },
                  ],
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'golpes',
                  itemName: 'golpe',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'g2d:tileAtSprite',
                          mapVar: 'mapa',
                          spriteVar: 'golpe',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                      then: [
                        {
                          type: 'g2d:breakTile',
                          mapVar: 'mapa',
                          spriteVar: 'golpe',
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
                              value: 1,
                            },
                          },
                        },
                        {
                          type: 'g2d:emitParticles',
                          x: {
                            type: 'g2d:centerX',
                            spriteVar: 'golpe',
                          },
                          y: {
                            type: 'g2d:centerY',
                            spriteVar: 'golpe',
                          },
                          count: {
                            type: 'num',
                            value: 12,
                          },
                          color: '#69c25f',
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'collect',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:pruneOld',
                  groupVar: 'golpes',
                  seconds: {
                    type: 'num',
                    value: 0.3,
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
                      groupVar: 'guarda',
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
                  type: 'g2d:drawGroupByY',
                  groupVar: 'cenario',
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
                  typeVar: 'guarda',
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
                    value: 56,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Guardiões:',
                  value: {
                    type: 'g2d:countGroup',
                    groupVar: 'guarda',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 78,
                  },
                  color: '#e8d5ff',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'g2d:countGroup',
                      groupVar: 'guarda',
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
                    value: 'A vila está a salvo!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você derrotou os 4 guardiões e fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos!',
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
                        value: 'Os guardiões venceram desta vez. Você fez ',
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
 * Exemplo 'Chuva de Meteoros': o degrau BÁSICO da família Space Shooter do
 * curso raylib_intro. A nave voa nas 4 direções com diagonal normalizada
 * (topDown) presa na tela; espaço atira laser para CIMA (updateGroup puro, sem
 * gravidade); os meteoros do Kit espaço caem do topo numa raiz 'A cada 0,5
 * segundos' com x, tamanho, diagonal e velocidade sorteados (a pedra já GIRA
 * sozinha, como o Meteor original); laser acerta = explosão + som + remover os
 * dois; nave acerta = fim, com colisão perdoadora de 75% (setHitboxScale). O
 * placar é POR TEMPO (1 ponto por segundo, como o int(get_time()) do original)
 * com bônus de 2 por meteoro destruído, e uma raiz 'A cada 6 segundos' acelera
 * a chuva até um teto. Fundo de estrelas (drawStarfield) + música tensa.
 * Diferente do 'Nave contra Asteroides' (que anda só na horizontal e vence aos
 * 25 pontos): aqui a chuva é VERTICAL, a nave voa para todo lado e não tem
 * vitória, só o recorde de sobrevivência. A behavior abaixo foi GERADA pelo
 * parser real a partir do fonte em __gen_chuvaDeMeteoros.ts (drift test:
 * chuvaDeMeteorosExample.test.ts).
 */
export const chuvaDeMeteorosExample: ExtensionExample = beginnerGameExample({
  name: 'Chuva de Meteoros',
  experience: 'game',
  description:
    'Chuva de meteoros: voe com as setas para os 4 lados, desvie das pedras que caem girando e atire lasers com espaço. Cada segundo vivo vale 1 ponto e destruir meteoro dá bônus. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#05070f',
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
          background: '#0f0a19',
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
          type: 'g2d:createShip',
          varName: 'nave',
          x: {
            type: 'num',
            value: 216,
          },
          y: {
            type: 'num',
            value: 230,
          },
          w: {
            type: 'num',
            value: 48,
          },
          h: {
            type: 'num',
            value: 42,
          },
          bodyColor: '#4f8fea',
          wingColor: '#9cd3ff',
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'nave',
          percent: {
            type: 'num',
            value: 75,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'tiros',
        },
        {
          type: 'g2d:createGroup',
          varName: 'meteoros',
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
            value: 2,
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
                  type: 'g2d:spawnBullet',
                  groupVar: 'tiros',
                  x: {
                    type: 'g2d:centerX',
                    spriteVar: 'nave',
                  },
                  y: {
                    type: 'g2d:spriteY',
                    spriteVar: 'nave',
                  },
                  radius: {
                    type: 'num',
                    value: 4,
                  },
                  color: '#9cff57',
                  vx: {
                    type: 'num',
                    value: 0,
                  },
                  vy: {
                    type: 'num',
                    value: -6,
                  },
                },
                {
                  type: 'g2d:playShoot',
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
              type: 'g2d:starfield',
              ctxVar: 'ctx',
              speed: {
                type: 'num',
                value: 2,
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
                    value: 'Chuva de Meteoros',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Voe com as setas para os 4 lados e atire com espaço. Sobreviva o máximo que você conseguir!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para decolar',
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
                  type: 'g2d:topDown',
                  spriteVar: 'nave',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'nave',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'tiros',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'meteoros',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'nave',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'meteoros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'meteoros',
                  bName: 'pedra',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'pedra',
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
                      spriteVar: 'pedra',
                      groupVar: 'meteoros',
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
                          value: 2,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'nave',
                  groupVar: 'meteoros',
                  itemName: 'pedra',
                  body: [
                    {
                      type: 'g2d:explode',
                      spriteVar: 'nave',
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
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                  itemName: 'tiro',
                  body: [],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'meteoros',
                  ctxVar: 'ctx',
                  itemName: 'pedra',
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
                  color: '#f3f6ff',
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
                    value: 'A nave explodiu!',
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
                      value: ' pontos. Tente voar por mais tempo!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter ou espaço para decolar de novo',
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
                  type: 'g2d:spawnAsteroid',
                  groupVar: 'meteoros',
                  x: {
                    type: 'g2d:randomX',
                  },
                  y: {
                    type: 'num',
                    value: -40,
                  },
                  size: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: 22,
                    },
                    max: {
                      type: 'num',
                      value: 40,
                    },
                  },
                  color: '#b08968',
                  vx: {
                    type: 'g2d:randomBetween',
                    min: {
                      type: 'num',
                      value: -1,
                    },
                    max: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  vy: {
                    type: 'binop',
                    op: '+',
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
                        value: 2,
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
            value: 6,
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
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: 4,
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
 * Exemplo bundlado: "Pong" (degrau BÁSICO da trilogia Pong do Clear Code; refaz
 * o antigo "Pong simples"). Gerado por __gen_pong.ts; drift test: pongExample.test.ts.
 */
export const pongExample: ExtensionExample = beginnerGameExample({
  name: 'Pong',
  experience: 'game',
  description:
    'Dispute Pong contra o computador: mova a raquete azul com as setas para cima e para baixo, rebata a bola e faça 5 pontos antes dele. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 440, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      { selector: 'canvas', declarations: { border: '2px solid #22d3ee', background: '#11172a' } },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: {
            type: 'num',
            value: 20,
          },
          y: {
            type: 'num',
            value: 128,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#22d3ee',
        },
        {
          type: 'g2d:createSprite',
          varName: 'computador',
          x: {
            type: 'num',
            value: 408,
          },
          y: {
            type: 'num',
            value: 128,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 44,
          },
          color: '#f472b6',
        },
        {
          type: 'g2d:createSprite',
          varName: 'bola',
          x: {
            type: 'num',
            value: 214,
          },
          y: {
            type: 'num',
            value: 144,
          },
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 12,
          },
          color: '#fbbf24',
        },
        {
          type: 'g2d:setVelocity',
          spriteVar: 'bola',
          vx: {
            type: 'num',
            value: 3,
          },
          vy: {
            type: 'num',
            value: 2,
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
          name: 'pontosComputador',
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
                    value: 'Pong',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Mova a raquete azul com as setas para cima e para baixo. O primeiro a 5 pontos vence!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#11172a',
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
                    type: 'g2d:keyDown',
                    key: 'ArrowUp',
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'jogador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'jogador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 5,
                        },
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
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'jogador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'jogador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 5,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'y',
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'computador',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'num',
                        value: 26,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'computador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'computador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 3.4,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'y',
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'computador',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'num',
                        value: 18,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'computador',
                      },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'computador',
                          },
                          name: 'y',
                        },
                        right: {
                          type: 'num',
                          value: 3.4,
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'computador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'bola',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'y',
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
                        name: 'bola',
                      },
                      name: 'vy',
                      value: {
                        type: 'mathUnary',
                        fn: 'abs',
                        arg: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bola',
                          },
                          name: 'vy',
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
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'bola',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'bola',
                        },
                        name: 'h',
                      },
                    },
                    right: {
                      type: 'num',
                      value: 300,
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'vy',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'bola',
                            },
                            name: 'vy',
                          },
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'g2d:touches',
                      aVar: 'jogador',
                      bVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '<',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'bola',
                        },
                        name: 'vx',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'bola',
                            },
                            name: 'vx',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 0.3,
                        },
                      },
                      vy: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bola',
                          },
                          name: 'vy',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'binop',
                              op: '-',
                              left: {
                                type: 'memberGet',
                                object: {
                                  type: 'var',
                                  name: 'bola',
                                },
                                name: 'y',
                              },
                              right: {
                                type: 'memberGet',
                                object: {
                                  type: 'var',
                                  name: 'jogador',
                                },
                                name: 'y',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 16,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 0.08,
                          },
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'g2d:touches',
                      aVar: 'computador',
                      bVar: 'bola',
                    },
                    right: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'bola',
                        },
                        name: 'vx',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'binop',
                          op: '-',
                          left: {
                            type: 'num',
                            value: 0,
                          },
                          right: {
                            type: 'mathUnary',
                            fn: 'abs',
                            arg: {
                              type: 'memberGet',
                              object: {
                                type: 'var',
                                name: 'bola',
                              },
                              name: 'vx',
                            },
                          },
                        },
                        right: {
                          type: 'num',
                          value: 0.3,
                        },
                      },
                      vy: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bola',
                          },
                          name: 'vy',
                        },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'binop',
                              op: '-',
                              left: {
                                type: 'memberGet',
                                object: {
                                  type: 'var',
                                  name: 'bola',
                                },
                                name: 'y',
                              },
                              right: {
                                type: 'memberGet',
                                object: {
                                  type: 'var',
                                  name: 'computador',
                                },
                                name: 'y',
                              },
                            },
                            right: {
                              type: 'num',
                              value: 16,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 0.08,
                          },
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'x',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosComputador',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pontosComputador',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'bola',
                      x: {
                        type: 'num',
                        value: 214,
                      },
                      y: {
                        type: 'num',
                        value: 144,
                      },
                    },
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'num',
                        value: 3,
                      },
                      vy: {
                        type: 'g2d:randomBetween',
                        min: {
                          type: 'num',
                          value: -2,
                        },
                        max: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'gameover',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'memberGet',
                      object: {
                        type: 'var',
                        name: 'bola',
                      },
                      name: 'x',
                    },
                    right: {
                      type: 'num',
                      value: 440,
                    },
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
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'bola',
                      x: {
                        type: 'num',
                        value: 214,
                      },
                      y: {
                        type: 'num',
                        value: 144,
                      },
                    },
                    {
                      type: 'g2d:setVelocity',
                      spriteVar: 'bola',
                      vx: {
                        type: 'num',
                        value: -3,
                      },
                      vy: {
                        type: 'g2d:randomBetween',
                        min: {
                          type: 'num',
                          value: -2,
                        },
                        max: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'jump',
                    },
                  ],
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'computador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'bola',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Você:',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                  x: {
                    type: 'num',
                    value: 20,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#22d3ee',
                  size: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'PC:',
                  value: {
                    type: 'var',
                    name: 'pontosComputador',
                  },
                  x: {
                    type: 'num',
                    value: 330,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#f472b6',
                  size: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'pontos',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setScene',
                      name: 'vitoria',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'pontosComputador',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
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
                    value: 'Você venceu!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Você fez 5 pontos antes do computador. Mandou bem!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#14532d',
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
                    value: 'O computador venceu',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ele chegou a 5 pontos primeiro. Tente rebater com a beirada da raquete!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
      ],
    },
  },
})

/**
 * Exemplo bundlado: "Mundo Pirata" (degrau BÁSICO da trilogia de plataforma
 * lateral do Clear Code — Super Pirate World). Gerado por __gen_mundoPirata.ts;
 * drift test: mundoPirataExample.test.ts.
 */
export const mundoPirataExample: ExtensionExample = beginnerGameExample({
  name: 'Mundo Pirata',
  experience: 'game',
  description:
    'Uma aventura de plataforma pirata: corra e pule com as setas por um mundo largo, pegue moedas, pise nos caranguejos e desvie dos buracos até a bandeira do fim. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0e2a38',
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
          border: '3px solid #123a4a',
          'border-radius': '12px',
          background: '#8ecae6',
        },
      },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
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
          shapeName: 'pirata',
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
                value: 14,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 18,
              },
              color: '#c0392b',
            },
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
                value: 7,
              },
              color: '#f7c8a2',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 3,
              },
              y: {
                type: 'num',
                value: 3,
              },
              w: {
                type: 'num',
                value: 22,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#2c3e50',
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
                value: 32,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#34495e',
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
                value: 32,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 11,
              },
              color: '#34495e',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'caranguejo',
          body: [
            {
              type: 'g2d:paintEllipse',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 11,
              },
              h: {
                type: 'num',
                value: 7,
              },
              color: '#e67e22',
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
                value: 6,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0392b',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 18,
              },
              y: {
                type: 'num',
                value: 6,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0392b',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'pirata',
          x: {
            type: 'num',
            value: 40,
          },
          y: {
            type: 'num',
            value: 190,
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
            value: 264,
          },
          w: {
            type: 'num',
            value: 360,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
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
            value: 440,
          },
          y: {
            type: 'num',
            value: 264,
          },
          w: {
            type: 'num',
            value: 360,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
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
            value: 880,
          },
          y: {
            type: 'num',
            value: 264,
          },
          w: {
            type: 'num',
            value: 720,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#8d6e63',
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
            value: 300,
          },
          y: {
            type: 'num',
            value: 196,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
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
            value: 590,
          },
          y: {
            type: 'num',
            value: 184,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
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
            value: 1040,
          },
          y: {
            type: 'num',
            value: 196,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#a1887f',
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
            value: 1280,
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
          color: '#a1887f',
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
          varName: 'moedas',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 200,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 330,
          },
          y: {
            type: 'num',
            value: 168,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 156,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1070,
          },
          y: {
            type: 'num',
            value: 168,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1310,
          },
          y: {
            type: 'num',
            value: 148,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          groupVar: 'moedas',
          x: {
            type: 'num',
            value: 1460,
          },
          y: {
            type: 'num',
            value: 224,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ffd166',
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
          varName: 'inimigos',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 520,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 980,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
          },
          vy: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'inimigos',
          x: {
            type: 'num',
            value: 1200,
          },
          y: {
            type: 'num',
            value: 240,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#e67e22',
          vx: {
            type: 'num',
            value: 0.7,
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
            value: 1540,
          },
          y: {
            type: 'num',
            value: 200,
          },
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 64,
          },
          color: '#ffd166',
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
                    value: 'Mundo Pirata',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Corra com as setas e pule com a seta para cima. Pegue as moedas, pise nos caranguejos e chegue na bandeira do fim. Cuidado com os buracos!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar a aventura',
                  },
                  bg: '#123a4a',
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
                    value: 1600,
                  },
                  worldH: {
                    type: 'num',
                    value: 300,
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
                  type: 'g2d:forEachInGroup',
                  groupVar: 'inimigos',
                  itemName: 'bicho',
                  body: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'bicho',
                      },
                      name: 'x',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                        },
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'num',
                          value: 460,
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                          value: {
                            type: 'num',
                            value: 0.7,
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
                          type: 'memberGet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'x',
                        },
                        right: {
                          type: 'num',
                          value: 1500,
                        },
                      },
                      then: [
                        {
                          type: 'memberSet',
                          object: {
                            type: 'var',
                            name: 'bicho',
                          },
                          name: 'vx',
                          value: {
                            type: 'num',
                            value: -0.7,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'moedas',
                  itemName: 'moeda',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'moeda',
                      groupVar: 'moedas',
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
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'coin',
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'inimigos',
                  itemName: 'bicho',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '&&',
                        left: {
                          type: 'binop',
                          op: '>',
                          left: {
                            type: 'g2d:spriteVy',
                            spriteVar: 'heroi',
                          },
                          right: {
                            type: 'num',
                            value: 0,
                          },
                        },
                        right: {
                          type: 'binop',
                          op: '<',
                          left: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'g2d:spriteY',
                              spriteVar: 'heroi',
                            },
                            right: {
                              type: 'num',
                              value: 30,
                            },
                          },
                          right: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'bicho',
                            },
                            name: 'y',
                          },
                        },
                      },
                      then: [
                        {
                          type: 'g2d:removeFromGroup',
                          spriteVar: 'bicho',
                          groupVar: 'inimigos',
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
                            value: -8,
                          },
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
                              value: 2,
                            },
                          },
                        },
                        {
                          type: 'g2d:explode',
                          spriteVar: 'bicho',
                          color: '#e67e22',
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'coin',
                        },
                      ],
                      else: [
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
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'g2d:spriteY',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 340,
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
                      type: 'g2d:spriteX',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 1524,
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
                  type: 'g2d:drawGroup',
                  groupVar: 'plataformas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'moedas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'inimigos',
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
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Tesouro:',
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
                    value: 26,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 16,
                  },
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
                    value: 'Chegou na bandeira!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Você atravessou o Mundo Pirata inteiro e pegou ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' de tesouro. Que aventureiro!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#14532d',
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
                    value: 'Que perrengue!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'O pirata caiu ou encostou de lado num caranguejo. Pise em cima deles e desvie dos buracos!',
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
  },
})

/**
 * "Safári de Monstros" (base): overworld de captura estilo Monster Hunter
 * (Python-Monsters). Diferencial da trilogia = capturar NO MAPA (sem tela de
 * batalha) + parceiro que evolui. Gerado por __gen_safariDeMonstros.ts;
 * drift test: safariDeMonstrosExample.test.ts.
 */
export const safariDeMonstrosExample: ExtensionExample = beginnerGameExample({
  name: 'Safári de Monstros',
  experience: 'game',
  description:
    'Explore um mundo de monstros com as setas. No mato alto aparecem monstros selvagens: chegue perto e aperte Espaço para capturar. Junte 5 no caderno e veja seu parceiro evoluir. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#12281c',
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
          border: '3px solid #1d3a28',
          'border-radius': '12px',
          background: '#3a7d44',
        },
      },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
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
          shapeName: 'explorador',
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
                value: 6,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#b8860b',
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
                value: 9,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#e8b088',
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
                value: 19,
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
                value: 7,
              },
              y: {
                type: 'num',
                value: 15,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 12,
              },
              color: '#2e8b57',
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
                value: 16,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b088',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 24,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b088',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'filhote',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 9,
              },
              color: '#4fa3d1',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffffff',
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffffff',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
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
                value: 15,
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
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'adulto',
          body: [
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 2,
              },
              y1: {
                type: 'num',
                value: 18,
              },
              x2: {
                type: 'num',
                value: 12,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 22,
              },
              color: '#2c78a8',
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
                value: 18,
              },
              x2: {
                type: 'num',
                value: 12,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 22,
              },
              color: '#2c78a8',
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
                value: 15,
              },
              r: {
                type: 'num',
                value: 11,
              },
              color: '#4fa3d1',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
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
                value: 16,
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
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'selvagem',
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
                value: 16,
              },
              r: {
                type: 'num',
                value: 12,
              },
              color: '#8e44ad',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 6,
              },
              y1: {
                type: 'num',
                value: 8,
              },
              x2: {
                type: 'num',
                value: 3,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 11,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5a2d82',
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
                value: 8,
              },
              x2: {
                type: 'num',
                value: 25,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 17,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5a2d82',
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
                value: 15,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ff5e5e',
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
                value: 15,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ff5e5e',
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
                value: 15,
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
                value: 15,
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
          type: 'g2d:defineShape',
          shapeName: 'sabio',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 4,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#dcd6c8',
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
                value: 9,
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
                value: 16,
              },
              y: {
                type: 'num',
                value: 9,
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
                value: 10,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0c0c0',
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
                value: 18,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 12,
              },
              color: '#6a5acd',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'explorador',
          shapeName: 'explorador',
          x: {
            type: 'num',
            value: 90,
          },
          y: {
            type: 'num',
            value: 210,
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
          type: 'g2d:setHitboxScale',
          spriteVar: 'explorador',
          percent: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'filhote',
          shapeName: 'filhote',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 26,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'adulto',
          shapeName: 'adulto',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'selvagem',
          shapeName: 'selvagem',
          x: {
            type: 'num',
            value: -100,
          },
          y: {
            type: 'num',
            value: -100,
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
          type: 'g2d:createShapeSprite',
          varName: 'sabio',
          shapeName: 'sabio',
          x: {
            type: 'num',
            value: 240,
          },
          y: {
            type: 'num',
            value: 60,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 34,
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
            value: 480,
          },
          h: {
            type: 'num',
            value: 20,
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
            value: 250,
          },
          w: {
            type: 'num',
            value: 480,
          },
          h: {
            type: 'num',
            value: 20,
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
            value: 20,
          },
          h: {
            type: 'num',
            value: 270,
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
            value: 460,
          },
          y: {
            type: 'num',
            value: 0,
          },
          w: {
            type: 'num',
            value: 20,
          },
          h: {
            type: 'num',
            value: 270,
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
            value: 120,
          },
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
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
          varName: 'matos',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 300,
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
            value: 70,
          },
          color: '#2e7d4f',
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
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 60,
          },
          w: {
            type: 'num',
            value: 80,
          },
          h: {
            type: 'num',
            value: 60,
          },
          color: '#2e7d4f',
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
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 340,
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
            value: 40,
          },
          color: '#2e7d4f',
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
          type: 'var',
          name: 'capturados',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'selvagemAtivo',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'evoluido',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'mensagem',
          value: {
            type: 'str',
            value: 'Ande no mato para achar um monstro selvagem!',
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
                  name: 'mundo',
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
                name: 'mundo',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:touches',
                        aVar: 'explorador',
                        bVar: 'selvagem',
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'g2d:randomChance',
                            percent: {
                              type: 'num',
                              value: 70,
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'capturados',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'capturados',
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'str',
                                  value: 'Capturou! Monstros no caderno: ',
                                },
                                right: {
                                  type: 'var',
                                  name: 'capturados',
                                },
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'win',
                            },
                          ],
                          else: [
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'str',
                                value: 'O monstro fugiu! Procure outro no mato.',
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'hurt',
                            },
                          ],
                        },
                        {
                          type: 'assign',
                          name: 'selvagemAtivo',
                          value: {
                            type: 'bool',
                            value: false,
                          },
                        },
                        {
                          type: 'g2d:setPosition',
                          spriteVar: 'selvagem',
                          x: {
                            type: 'num',
                            value: -100,
                          },
                          y: {
                            type: 'num',
                            value: -100,
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
                    value: 'Safári de Monstros',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande com as setas pelo mundo. No mato alto aparecem monstros selvagens. Chegue perto e aperte Espaço para capturar. Junte 5 e seu parceiro evolui!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1f2a44',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'mundo',
              },
              then: [
                {
                  type: 'g2d:topDown',
                  spriteVar: 'explorador',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'explorador',
                  groupVar: 'muros',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'matos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'muros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'sabio',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'evoluido',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'adulto',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'g2d:spriteX',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 26,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 4,
                        },
                      },
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'adulto',
                      ctxVar: 'ctx',
                    },
                  ],
                  else: [
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'filhote',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'g2d:spriteX',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 24,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 4,
                        },
                      },
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'filhote',
                      ctxVar: 'ctx',
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
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'selvagem',
                      ctxVar: 'ctx',
                    },
                  ],
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'explorador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Caderno de monstros:',
                  value: {
                    type: 'var',
                    name: 'capturados',
                  },
                  x: {
                    type: 'num',
                    value: 26,
                  },
                  y: {
                    type: 'num',
                    value: 40,
                  },
                  color: '#f3f6ff',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: {
                    type: 'var',
                    name: 'mensagem',
                  },
                  x: {
                    type: 'num',
                    value: 26,
                  },
                  y: {
                    type: 'num',
                    value: 262,
                  },
                  color: '#ffe9a8',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:touches',
                    aVar: 'explorador',
                    bVar: 'sabio',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'mensagem',
                      value: {
                        type: 'str',
                        value: 'Sabio: fique no mato e aperte Espaco colado no monstro!',
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
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: false,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'explorador',
                      groupVar: 'matos',
                      itemName: 'mato',
                      body: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'selvagemAtivo',
                            },
                            right: {
                              type: 'bool',
                              value: false,
                            },
                          },
                          then: [
                            {
                              type: 'if',
                              cond: {
                                type: 'g2d:randomChance',
                                percent: {
                                  type: 'num',
                                  value: 3,
                                },
                              },
                              then: [
                                {
                                  type: 'g2d:setPosition',
                                  spriteVar: 'selvagem',
                                  x: {
                                    type: 'binop',
                                    op: '+',
                                    left: {
                                      type: 'g2d:spriteX',
                                      spriteVar: 'explorador',
                                    },
                                    right: {
                                      type: 'num',
                                      value: 32,
                                    },
                                  },
                                  y: {
                                    type: 'g2d:spriteY',
                                    spriteVar: 'explorador',
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'selvagemAtivo',
                                  value: {
                                    type: 'bool',
                                    value: true,
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'mensagem',
                                  value: {
                                    type: 'str',
                                    value: 'Um monstro selvagem apareceu! Aperte Espaco!',
                                  },
                                },
                                {
                                  type: 'g2d:playFx',
                                  fx: 'start',
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
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'capturados',
                    },
                    right: {
                      type: 'num',
                      value: 3,
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
                          name: 'evoluido',
                        },
                        right: {
                          type: 'bool',
                          value: false,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'evoluido',
                          value: {
                            type: 'bool',
                            value: true,
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'Seu parceiro evoluiu!',
                          },
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
                          fx: 'powerup',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'capturados',
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
                    value: 'Safari completo!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Voce capturou 5 monstros e seu parceiro evoluiu. Um verdadeiro cacador de monstros!',
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
      ],
    },
  },
})
