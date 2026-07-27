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
