import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from './shared'

export const numberRainExample: ExtensionExample = beginnerGameExample({
  name: 'Chuva de números',
  experience: 'game',
  description:
    'Colete 10 números pares e desvie dos ímpares. Use as setas ou o dedo para mover a cesta. Enter ou toque no botão para começar e jogar de novo.',
  ir: {
    version: 2,
    html: [
      {
        type: 'canvas',
        id: 'tela',
        width: 600,
        height: 400,
      },
    ],
    css: [
      {
        selector: 'body',
        declarations: {
          margin: '0',
          background: '#102030',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          background: '#102030',
        },
      },
    ],
    behavior: {
      start: [
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
          name: 'vidas',
          value: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'numeros',
        },
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: {
            type: 'num',
            value: 270,
          },
          y: {
            type: 'num',
            value: 350,
          },
          w: {
            type: 'num',
            value: 60,
          },
          h: {
            type: 'num',
            value: 24,
          },
          color: '#38bdf8',
        },
        {
          type: 'g2d:createTextSprite',
          varName: 'comecar',
          text: {
            type: 'str',
            value: 'Começar / jogar de novo',
          },
          x: {
            type: 'num',
            value: 100,
          },
          y: {
            type: 'num',
            value: 290,
          },
        },
        {
          type: 'g2d:setTextStyle',
          spriteVar: 'comecar',
          size: {
            type: 'num',
            value: 24,
          },
          color: '#ffffff',
        },
        {
          type: 'g2d:setTextBox',
          spriteVar: 'comecar',
          width: {
            type: 'num',
            value: 400,
          },
          align: 'center',
          padding: {
            type: 'num',
            value: 14,
          },
          background: {
            type: 'color',
            value: '#166534',
          },
        },
        {
          type: 'forRange',
          varName: 'n',
          from: {
            type: 'num',
            value: 1,
          },
          to: {
            type: 'num',
            value: 101,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'g2d:spawnTextInGroup',
              varName: 'numero',
              groupVar: 'numeros',
              text: {
                type: 'var',
                name: 'n',
              },
              x: {
                type: 'g2d:randomBetween',
                min: {
                  type: 'num',
                  value: 12,
                },
                max: {
                  type: 'num',
                  value: 530,
                },
              },
              y: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'num',
                    value: 0,
                  },
                  right: {
                    type: 'var',
                    name: 'n',
                  },
                },
                right: {
                  type: 'num',
                  value: 60,
                },
              },
            },
            {
              type: 'g2d:setSpriteData',
              spriteVar: 'numero',
              key: 'valor',
              value: {
                type: 'var',
                name: 'n',
              },
            },
            {
              type: 'g2d:setTextStyle',
              spriteVar: 'numero',
              size: {
                type: 'num',
                value: 28,
              },
              color: '#fde047',
            },
            {
              type: 'g2d:setVelocity',
              spriteVar: 'numero',
              vx: {
                type: 'num',
                value: 0,
              },
              vy: {
                type: 'num',
                value: 3,
              },
            },
          ],
        },
        {
          type: 'g2d:setScene',
          name: 'inicio',
        },
      ],
      events: [
        {
          type: 'g2d:onSpriteClick',
          spriteVar: 'comecar',
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
              else: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
          ],
        },
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
              else: [
                {
                  type: 'if',
                  cond: {
                    type: 'logicalNot',
                    value: {
                      type: 'g2d:sceneIs',
                      name: 'jogando',
                    },
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
                name: 'jogando',
              },
              then: [
                {
                  type: 'g2d:arrowsX',
                  spriteVar: 'jogador',
                  speed: {
                    type: 'num',
                    value: 6,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:pointerDown',
                  },
                  then: [
                    {
                      type: 'g2d:dragX',
                      spriteVar: 'jogador',
                    },
                  ],
                },
                {
                  type: 'g2d:clampToScreen',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:updateGroup',
                  groupVar: 'numeros',
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'jogador',
                  groupVar: 'numeros',
                  itemName: 'numero',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'binop',
                          op: '%',
                          left: {
                            type: 'g2d:spriteData',
                            spriteVar: 'numero',
                            key: 'valor',
                            fallback: {
                              type: 'num',
                              value: 0,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        right: {
                          type: 'num',
                          value: 0,
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
                      ],
                      else: [
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
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'numero',
                      groupVar: 'numeros',
                    },
                  ],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'numeros',
                  ctxVar: 'ctx',
                  itemName: 'numero',
                  body: [],
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'numeros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'jogador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pares:',
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
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 24,
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
                    value: 450,
                  },
                  y: {
                    type: 'num',
                    value: 28,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 24,
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
                      value: 10,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setScene',
                      name: 'vitoria',
                    },
                  ],
                  else: [
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '||',
                        left: {
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
                        right: {
                          type: 'binop',
                          op: '===',
                          left: {
                            type: 'g2d:countGroup',
                            groupVar: 'numeros',
                          },
                          right: {
                            type: 'num',
                            value: 0,
                          },
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
              ],
              else: [
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
                        value: 'Chuva de números',
                      },
                      subtitle: {
                        type: 'str',
                        value: 'Pegue 10 números pares e desvie dos ímpares. Você tem 3 vidas.',
                      },
                      hint: {
                        type: 'str',
                        value: 'Use as setas ou mova o dedo na tela.',
                      },
                      bg: '#102030',
                    },
                  ],
                  else: [
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
                            value: 'Você conseguiu!',
                          },
                          subtitle: {
                            type: 'str',
                            value: '10 números pares coletados!',
                          },
                          hint: {
                            type: 'str',
                            value: 'Enter ou toque para jogar de novo.',
                          },
                          bg: '#102030',
                        },
                      ],
                      else: [
                        {
                          type: 'g2d:showScreen',
                          ctxVar: 'ctx',
                          title: {
                            type: 'str',
                            value: 'Vamos tentar de novo?',
                          },
                          subtitle: {
                            type: 'str',
                            value: 'Procure números que terminam em 0, 2, 4, 6 ou 8.',
                          },
                          hint: {
                            type: 'str',
                            value: 'Enter ou toque para jogar de novo.',
                          },
                          bg: '#102030',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'comecar',
                  ctxVar: 'ctx',
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [
      {
        extensionId: 'game-2d',
      },
    ],
  },
})

export const textQuizExample: ExtensionExample = beginnerGameExample({
  name: 'Quiz de números',
  experience: 'game',
  description:
    'Use as teclas 1, 2 ou 3 ou toque na resposta correta. Cada alternativa é um sprite criado de uma lista. Enter avança após responder e reinicia ao terminar.',
  ir: {
    version: 2,
    html: [
      {
        type: 'canvas',
        id: 'tela',
        width: 600,
        height: 400,
      },
    ],
    css: [
      {
        selector: 'body',
        declarations: {
          margin: '0',
          background: '#102030',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          background: '#102030',
        },
      },
    ],
    behavior: {
      start: [
        {
          type: 'var',
          name: 'pergunta',
          value: {
            type: 'num',
            value: 0,
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
          name: 'escolhida',
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
            value: '',
          },
        },
        {
          type: 'var',
          name: 'perguntas',
          value: {
            type: 'array',
            items: [
              {
                type: 'str',
                value: 'Quanto é 3 + 5?',
              },
              {
                type: 'str',
                value: 'Qual destes números é ímpar?',
              },
            ],
          },
          kind: 'const',
        },
        {
          type: 'var',
          name: 'alternativas',
          value: {
            type: 'array',
            items: [
              {
                type: 'str',
                value: '6',
              },
              {
                type: 'str',
                value: '8',
              },
              {
                type: 'str',
                value: '9',
              },
              {
                type: 'str',
                value: '12',
              },
              {
                type: 'str',
                value: '7',
              },
              {
                type: 'str',
                value: '20',
              },
            ],
          },
          kind: 'const',
        },
        {
          type: 'var',
          name: 'gabarito',
          value: {
            type: 'array',
            items: [
              {
                type: 'num',
                value: 1,
              },
              {
                type: 'num',
                value: 1,
              },
            ],
          },
          kind: 'const',
        },
        {
          type: 'g2d:createGroup',
          varName: 'respostas',
        },
        {
          type: 'g2d:createTextSprite',
          varName: 'proxima',
          text: {
            type: 'str',
            value: 'Próxima pergunta',
          },
          x: {
            type: 'num',
            value: 140,
          },
          y: {
            type: 'num',
            value: 315,
          },
        },
        {
          type: 'g2d:setTextStyle',
          spriteVar: 'proxima',
          size: {
            type: 'num',
            value: 24,
          },
          color: '#ffffff',
        },
        {
          type: 'g2d:setTextBox',
          spriteVar: 'proxima',
          width: {
            type: 'num',
            value: 320,
          },
          align: 'center',
          padding: {
            type: 'num',
            value: 10,
          },
          background: {
            type: 'color',
            value: '#166534',
          },
        },
        {
          type: 'forRange',
          varName: 'i',
          from: {
            type: 'num',
            value: 0,
          },
          to: {
            type: 'num',
            value: 3,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'g2d:spawnTextInGroup',
              varName: 'resposta',
              groupVar: 'respostas',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'i',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  right: {
                    type: 'str',
                    value: ': ',
                  },
                },
                right: {
                  type: 'index',
                  arrayVar: 'alternativas',
                  index: {
                    type: 'var',
                    name: 'i',
                  },
                },
              },
              x: {
                type: 'num',
                value: 190,
              },
              y: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 95,
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'i',
                  },
                  right: {
                    type: 'num',
                    value: 65,
                  },
                },
              },
            },
            {
              type: 'g2d:setTextStyle',
              spriteVar: 'resposta',
              size: {
                type: 'num',
                value: 26,
              },
              color: '#ffffff',
            },
            {
              type: 'g2d:setTextBox',
              spriteVar: 'resposta',
              width: {
                type: 'num',
                value: 220,
              },
              align: 'center',
              padding: {
                type: 'num',
                value: 10,
              },
              background: {
                type: 'color',
                value: '#334155',
              },
            },
            {
              type: 'g2d:setSpriteData',
              spriteVar: 'resposta',
              key: 'indice',
              value: {
                type: 'var',
                name: 'i',
              },
            },
            {
              type: 'g2d:setSpriteData',
              spriteVar: 'resposta',
              key: 'correta',
              value: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'i',
                },
                right: {
                  type: 'index',
                  arrayVar: 'gabarito',
                  index: {
                    type: 'var',
                    name: 'pergunta',
                  },
                },
              },
            },
          ],
        },
        {
          type: 'g2d:setScene',
          name: 'jogando',
        },
        {
          type: 'funcDecl',
          name: 'responder',
          params: ['indiceEscolhido'],
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g2d:sceneIs',
                  name: 'jogando',
                },
                right: {
                  type: 'logicalNot',
                  value: {
                    type: 'var',
                    name: 'escolhida',
                  },
                },
              },
              then: [
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'respostas',
                  itemName: 'resposta',
                  body: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'g2d:spriteData',
                          spriteVar: 'resposta',
                          key: 'indice',
                          fallback: {
                            type: 'num',
                            value: 0,
                          },
                        },
                        right: {
                          type: 'var',
                          name: 'indiceEscolhido',
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'escolhida',
                          value: {
                            type: 'bool',
                            value: true,
                          },
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'g2d:spriteData',
                            spriteVar: 'resposta',
                            key: 'correta',
                            fallback: {
                              type: 'bool',
                              value: false,
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
                                    value: 'Acertou! Você escolheu ',
                                  },
                                  right: {
                                    type: 'index',
                                    arrayVar: 'alternativas',
                                    index: {
                                      type: 'binop',
                                      op: '+',
                                      left: {
                                        type: 'binop',
                                        op: '*',
                                        left: {
                                          type: 'var',
                                          name: 'pergunta',
                                        },
                                        right: {
                                          type: 'num',
                                          value: 3,
                                        },
                                      },
                                      right: {
                                        type: 'var',
                                        name: 'indiceEscolhido',
                                      },
                                    },
                                  },
                                },
                                right: {
                                  type: 'str',
                                  value: '.',
                                },
                              },
                            },
                            {
                              type: 'g2d:setTextBox',
                              spriteVar: 'resposta',
                              width: {
                                type: 'num',
                                value: 220,
                              },
                              align: 'center',
                              padding: {
                                type: 'num',
                                value: 10,
                              },
                              background: {
                                type: 'color',
                                value: '#166534',
                              },
                            },
                          ],
                          else: [
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
                                    value: 'Quase! A resposta correta é ',
                                  },
                                  right: {
                                    type: 'index',
                                    arrayVar: 'alternativas',
                                    index: {
                                      type: 'binop',
                                      op: '+',
                                      left: {
                                        type: 'binop',
                                        op: '*',
                                        left: {
                                          type: 'var',
                                          name: 'pergunta',
                                        },
                                        right: {
                                          type: 'num',
                                          value: 3,
                                        },
                                      },
                                      right: {
                                        type: 'index',
                                        arrayVar: 'gabarito',
                                        index: {
                                          type: 'var',
                                          name: 'pergunta',
                                        },
                                      },
                                    },
                                  },
                                },
                                right: {
                                  type: 'str',
                                  value: '.',
                                },
                              },
                            },
                            {
                              type: 'g2d:setTextBox',
                              spriteVar: 'resposta',
                              width: {
                                type: 'num',
                                value: 220,
                              },
                              align: 'center',
                              padding: {
                                type: 'num',
                                value: 10,
                              },
                              background: {
                                type: 'color',
                                value: '#991b1b',
                              },
                            },
                            {
                              type: 'g2d:forEachInGroup',
                              groupVar: 'respostas',
                              itemName: 'opcao',
                              body: [
                                {
                                  type: 'if',
                                  cond: {
                                    type: 'g2d:spriteData',
                                    spriteVar: 'opcao',
                                    key: 'correta',
                                    fallback: {
                                      type: 'bool',
                                      value: false,
                                    },
                                  },
                                  then: [
                                    {
                                      type: 'g2d:setTextBox',
                                      spriteVar: 'opcao',
                                      width: {
                                        type: 'num',
                                        value: 220,
                                      },
                                      align: 'center',
                                      padding: {
                                        type: 'num',
                                        value: 10,
                                      },
                                      background: {
                                        type: 'color',
                                        value: '#166534',
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
            },
          ],
        },
        {
          type: 'funcDecl',
          name: 'avancar',
          params: [],
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'fim',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
              else: [
                {
                  type: 'if',
                  cond: {
                    type: 'var',
                    name: 'escolhida',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pergunta',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pergunta',
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
                        op: '>=',
                        left: {
                          type: 'var',
                          name: 'pergunta',
                        },
                        right: {
                          type: 'arrayLength',
                          arrayVar: 'perguntas',
                        },
                      },
                      then: [
                        {
                          type: 'g2d:setScene',
                          name: 'fim',
                        },
                        {
                          type: 'g2d:setSpriteText',
                          spriteVar: 'proxima',
                          text: {
                            type: 'str',
                            value: 'Jogar de novo',
                          },
                        },
                      ],
                      else: [
                        {
                          type: 'assign',
                          name: 'escolhida',
                          value: {
                            type: 'bool',
                            value: false,
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: '',
                          },
                        },
                        {
                          type: 'g2d:forEachInGroup',
                          groupVar: 'respostas',
                          itemName: 'resposta',
                          body: [
                            {
                              type: 'var',
                              name: 'indice',
                              value: {
                                type: 'g2d:spriteData',
                                spriteVar: 'resposta',
                                key: 'indice',
                                fallback: {
                                  type: 'num',
                                  value: 0,
                                },
                              },
                              kind: 'const',
                            },
                            {
                              type: 'g2d:setSpriteText',
                              spriteVar: 'resposta',
                              text: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'binop',
                                  op: '+',
                                  left: {
                                    type: 'binop',
                                    op: '+',
                                    left: {
                                      type: 'var',
                                      name: 'indice',
                                    },
                                    right: {
                                      type: 'num',
                                      value: 1,
                                    },
                                  },
                                  right: {
                                    type: 'str',
                                    value: ': ',
                                  },
                                },
                                right: {
                                  type: 'index',
                                  arrayVar: 'alternativas',
                                  index: {
                                    type: 'binop',
                                    op: '+',
                                    left: {
                                      type: 'binop',
                                      op: '*',
                                      left: {
                                        type: 'var',
                                        name: 'pergunta',
                                      },
                                      right: {
                                        type: 'num',
                                        value: 3,
                                      },
                                    },
                                    right: {
                                      type: 'var',
                                      name: 'indice',
                                    },
                                  },
                                },
                              },
                            },
                            {
                              type: 'g2d:setSpriteData',
                              spriteVar: 'resposta',
                              key: 'correta',
                              value: {
                                type: 'binop',
                                op: '===',
                                left: {
                                  type: 'var',
                                  name: 'indice',
                                },
                                right: {
                                  type: 'index',
                                  arrayVar: 'gabarito',
                                  index: {
                                    type: 'var',
                                    name: 'pergunta',
                                  },
                                },
                              },
                            },
                            {
                              type: 'g2d:setTextBox',
                              spriteVar: 'resposta',
                              width: {
                                type: 'num',
                                value: 220,
                              },
                              align: 'center',
                              padding: {
                                type: 'num',
                                value: 10,
                              },
                              background: {
                                type: 'color',
                                value: '#334155',
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
      events: [
        {
          type: 'g2d:onGroupClick',
          groupVar: 'respostas',
          itemName: 'resposta',
          body: [
            {
              type: 'callFunction',
              name: 'responder',
              args: [
                {
                  type: 'g2d:spriteData',
                  spriteVar: 'resposta',
                  key: 'indice',
                  fallback: {
                    type: 'num',
                    value: 0,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onSpriteClick',
          spriteVar: 'proxima',
          body: [
            {
              type: 'callFunction',
              name: 'avancar',
              args: [],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: '1',
          body: [
            {
              type: 'callFunction',
              name: 'responder',
              args: [
                {
                  type: 'num',
                  value: 0,
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: '2',
          body: [
            {
              type: 'callFunction',
              name: 'responder',
              args: [
                {
                  type: 'num',
                  value: 1,
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: '3',
          body: [
            {
              type: 'callFunction',
              name: 'responder',
              args: [
                {
                  type: 'num',
                  value: 2,
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'callFunction',
              name: 'avancar',
              args: [],
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
                name: 'jogando',
              },
              then: [
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: {
                    type: 'index',
                    arrayVar: 'perguntas',
                    index: {
                      type: 'var',
                      name: 'pergunta',
                    },
                  },
                  x: {
                    type: 'num',
                    value: 300,
                  },
                  y: {
                    type: 'num',
                    value: 48,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 25,
                  },
                  align: 'center',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Use 1, 2 ou 3 para responder. Enter avança.',
                  x: {
                    type: 'num',
                    value: 300,
                  },
                  y: {
                    type: 'num',
                    value: 76,
                  },
                  color: '#cbd5e1',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                  align: 'center',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'respostas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: {
                    type: 'var',
                    name: 'mensagem',
                  },
                  x: {
                    type: 'num',
                    value: 300,
                  },
                  y: {
                    type: 'num',
                    value: 293,
                  },
                  color: '#fde047',
                  size: {
                    type: 'num',
                    value: 20,
                  },
                  align: 'center',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'var',
                    name: 'escolhida',
                  },
                  then: [
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'proxima',
                      ctxVar: 'ctx',
                    },
                  ],
                },
              ],
              else: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Quiz concluído!',
                  },
                  subtitle: {
                    type: 'str',
                    value: 'Cada resposta foi um sprite criado da lista.',
                  },
                  hint: {
                    type: 'str',
                    value: 'Enter ou toque em jogar de novo para recomeçar.',
                  },
                  bg: '#102030',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Acertos:',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                  x: {
                    type: 'num',
                    value: 230,
                  },
                  y: {
                    type: 'num',
                    value: 110,
                  },
                  color: '#fde047',
                  size: {
                    type: 'num',
                    value: 28,
                  },
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'proxima',
                  ctxVar: 'ctx',
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [
      {
        extensionId: 'game-2d',
      },
    ],
  },
})
