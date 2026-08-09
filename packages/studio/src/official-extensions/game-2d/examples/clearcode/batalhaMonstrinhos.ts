import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

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
      molds: [
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
