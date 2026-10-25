// GERADO por scripts/gen-game-2d-recipes.ts.
import type { ExtensionExample } from '#extensions'

export const gameTwoDRecipes: readonly ExtensionExample[] = [
  {
    name: 'Meu personagem do Pinta',
    description:
      'Setas movem o personagem. Espaço toca uma animação uma vez; ao terminar ele volta a andar. A tecla I troca a imagem e R recomeça.',
    concepts: ['Pinta', 'animação de uma vez', 'animação por estado', 'folha de quadros'],
    assets: [
      {
        id: 'receita-fundo',
        name: 'cenario-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
        width: 32,
        height: 24,
      },
      {
        id: 'receita-heroi',
        name: 'heroi-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==',
        width: 32,
        height: 32,
      },
      {
        id: 'receita-folha',
        name: 'folha-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4=',
        width: 128,
        height: 32,
        sprite: {
          frameW: 32,
          frameH: 32,
          animations: [
            {
              name: 'andando',
              from: 0,
              to: 3,
              fps: 8,
              loop: true,
            },
          ],
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#102238',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Use setas para andar, Espaço para animar uma vez, I para trocar a imagem e R para recomeçar.',
          },
          {
            type: 'g2d:useFont',
            font: 'nunito',
          },
          {
            type: 'g2d:createImageSprite',
            varName: 'heroi',
            x: {
              type: 'num',
              value: 260,
            },
            y: {
              type: 'num',
              value: 180,
            },
            w: {
              type: 'num',
              value: 64,
            },
            h: {
              type: 'num',
              value: 64,
            },
            image: 'heroi-receita',
          },
          {
            type: 'g2d:loadSpritesheet',
            varName: 'folha',
            image: 'folha-receita',
            frameW: {
              type: 'num',
              value: 32,
            },
            frameH: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'var',
            name: 'modoVisual',
            value: {
              type: 'str',
              value: 'automatico',
            },
          },
          {
            type: 'g2d:setStateAnim',
            spriteVar: 'heroi',
            state: 'parado',
            sheetVar: 'folha',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 0,
            },
            fps: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'g2d:setStateAnim',
            spriteVar: 'heroi',
            state: 'andando',
            sheetVar: 'folha',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 3,
            },
            fps: {
              type: 'num',
              value: 8,
            },
          },
        ],
        events: [
          {
            type: 'g2d:onKey',
            key: 'Space',
            body: [
              {
                type: 'g2d:animateOnce',
                spriteVar: 'heroi',
                sheetVar: 'folha',
                from: {
                  type: 'num',
                  value: 0,
                },
                to: {
                  type: 'num',
                  value: 3,
                },
                fps: {
                  type: 'num',
                  value: 5,
                },
              },
              {
                type: 'assign',
                name: 'modoVisual',
                value: {
                  type: 'str',
                  value: 'uma-vez',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'i',
            body: [
              {
                type: 'g2d:setImage',
                spriteVar: 'heroi',
                image: 'heroi-receita',
              },
              {
                type: 'assign',
                name: 'modoVisual',
                value: {
                  type: 'str',
                  value: 'imagem',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                type: 'g2d:drawBackdrop',
                ctxVar: 'ctx',
                image: 'cenario-receita',
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
                type: 'g2d:clampToScreen',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'modoVisual',
                  },
                  right: {
                    type: 'str',
                    value: 'uma-vez',
                  },
                },
                then: [
                  {
                    type: 'if',
                    cond: {
                      type: 'g2d:animEnded',
                      spriteVar: 'heroi',
                    },
                    then: [
                      {
                        type: 'assign',
                        name: 'modoVisual',
                        value: {
                          type: 'str',
                          value: 'automatico',
                        },
                      },
                    ],
                  },
                ],
                elseif: [
                  {
                    cond: {
                      type: 'binop',
                      op: '===',
                      left: {
                        type: 'var',
                        name: 'modoVisual',
                      },
                      right: {
                        type: 'str',
                        value: 'automatico',
                      },
                    },
                    then: [
                      {
                        type: 'g2d:autoAnimate',
                        spriteVar: 'heroi',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawFrame',
                sheetVar: 'folha',
                ctxVar: 'ctx',
                index: {
                  type: 'num',
                  value: 0,
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 80,
                },
                w: {
                  type: 'num',
                  value: 32,
                },
                h: {
                  type: 'num',
                  value: 32,
                },
              },
              {
                type: 'g2d:drawFrame',
                sheetVar: 'folha',
                ctxVar: 'ctx',
                index: {
                  type: 'num',
                  value: 3,
                },
                x: {
                  type: 'num',
                  value: 58,
                },
                y: {
                  type: 'num',
                  value: 80,
                },
                w: {
                  type: 'num',
                  value: 32,
                },
                h: {
                  type: 'num',
                  value: 32,
                },
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: 'Meu desenho em movimento',
                x: {
                  type: 'num',
                  value: 20,
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
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: 'Setas: andar | Espaço: uma vez | I: imagem | R: recomeçar',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 54,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 16,
                },
                align: 'left',
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
  },
  {
    name: 'Placas e camadas',
    description:
      'Clique nas placas para trazê-las à frente. As teclas 1 e 2 mudam a letra e o tamanho; 3 manda a placa para trás e 4 muda sua visibilidade.',
    concepts: ['sprites de texto', 'tamanho', 'camadas', 'visibilidade', 'clique'],
    assets: [
      {
        id: 'receita-fundo',
        name: 'cenario-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
        width: 32,
        height: 24,
      },
      {
        id: 'receita-heroi',
        name: 'heroi-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==',
        width: 32,
        height: 32,
      },
      {
        id: 'receita-folha',
        name: 'folha-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4=',
        width: 128,
        height: 32,
        sprite: {
          frameW: 32,
          frameH: 32,
          animations: [
            {
              name: 'andando',
              from: 0,
              to: 3,
              fps: 8,
              loop: true,
            },
          ],
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#102238',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Clique nas placas. Teclas 1 e 2 ampliam letra e caixa, 3 manda para trás, 4 muda visibilidade e R recomeça.',
          },
          {
            type: 'g2d:createGroup',
            varName: 'placas',
          },
          {
            type: 'g2d:createTextSprite',
            varName: 'primeira',
            text: {
              type: 'str',
              value: 'Olá, criador!',
            },
            x: {
              type: 'num',
              value: 100,
            },
            y: {
              type: 'num',
              value: 120,
            },
          },
          {
            type: 'g2d:setTextImage',
            spriteVar: 'primeira',
            image: 'cenario-receita',
            valign: 'middle',
          },
          {
            type: 'g2d:setSize',
            spriteVar: 'primeira',
            w: {
              type: 'num',
              value: 280,
            },
            h: {
              type: 'num',
              value: 150,
            },
          },
          {
            type: 'g2d:setTextStyle',
            spriteVar: 'primeira',
            size: {
              type: 'num',
              value: 22,
            },
            color: '#142d39',
          },
          {
            type: 'g2d:addToGroup',
            spriteVar: 'primeira',
            groupVar: 'placas',
          },
          {
            type: 'g2d:createTextSprite',
            varName: 'segunda',
            text: {
              type: 'str',
              value: 'Toque para escolher',
            },
            x: {
              type: 'num',
              value: 240,
            },
            y: {
              type: 'num',
              value: 170,
            },
          },
          {
            type: 'g2d:setTextBox',
            spriteVar: 'segunda',
            width: {
              type: 'num',
              value: 250,
            },
            align: 'center',
            padding: {
              type: 'num',
              value: 12,
            },
            background: {
              type: 'color',
              value: '#fbd270',
            },
          },
          {
            type: 'g2d:setTextStyle',
            spriteVar: 'segunda',
            size: {
              type: 'num',
              value: 20,
            },
            color: '#142d39',
          },
          {
            type: 'g2d:addToGroup',
            spriteVar: 'segunda',
            groupVar: 'placas',
          },
          {
            type: 'var',
            name: 'selecionada',
            value: {
              type: 'var',
              name: 'primeira',
            },
          },
        ],
        events: [
          {
            type: 'g2d:onGroupClick',
            groupVar: 'placas',
            itemName: 'placa',
            body: [
              {
                type: 'assign',
                name: 'selecionada',
                value: {
                  type: 'var',
                  name: 'placa',
                },
              },
              {
                type: 'g2d:bringToFront',
                spriteVar: 'placa',
                groupVar: 'placas',
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '1',
            body: [
              {
                type: 'g2d:scaleTextSize',
                spriteVar: 'selecionada',
                factor: {
                  type: 'num',
                  value: 1.1,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '2',
            body: [
              {
                type: 'g2d:scaleSprite',
                spriteVar: 'selecionada',
                factor: {
                  type: 'num',
                  value: 1.1,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '3',
            body: [
              {
                type: 'g2d:sendToBack',
                spriteVar: 'selecionada',
                groupVar: 'placas',
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '4',
            body: [
              {
                type: 'g2d:setOpacity',
                spriteVar: 'selecionada',
                percent: {
                  type: 'num',
                  value: 50,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                type: 'g2d:drawGroup',
                groupVar: 'placas',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Escolhida: ',
                  },
                  right: {
                    type: 'g2d:spriteText',
                    spriteVar: 'selecionada',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 28,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 20,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
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
                        type: 'str',
                        value: 'Caixa: ',
                      },
                      right: {
                        type: 'g2d:spriteW',
                        spriteVar: 'selecionada',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' × ',
                    },
                  },
                  right: {
                    type: 'g2d:spriteH',
                    spriteVar: 'selecionada',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 54,
                },
                color: '#a7ddff',
                size: {
                  type: 'num',
                  value: 16,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: 'Clique | 1 letra | 2 caixa | 3 atrás | 4 transparência | R reinicia',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 335,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 15,
                },
                align: 'left',
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
  },
  {
    name: 'Quatro jeitos de mover',
    description:
      'Escolha 1 para voo com inércia, 2 para bater asas, 3 para seguir o ponteiro ou 4 para pilotar com impulso. Um companheiro acompanha você.',
    concepts: ['movimento', 'inércia', 'impulso', 'ponteiro', 'direção'],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#132336',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Escolha um modo com 1 a 4. Setas ou toque movem, e Espaço impulsiona no modo 4. R recomeça.',
          },
          {
            type: 'g2d:createSprite',
            varName: 'heroi',
            x: {
              type: 'num',
              value: 280,
            },
            y: {
              type: 'num',
              value: 140,
            },
            w: {
              type: 'num',
              value: 30,
            },
            h: {
              type: 'num',
              value: 30,
            },
            color: '#66e8c0',
          },
          {
            type: 'g2d:createSprite',
            varName: 'amigo',
            x: {
              type: 'num',
              value: 80,
            },
            y: {
              type: 'num',
              value: 220,
            },
            w: {
              type: 'num',
              value: 18,
            },
            h: {
              type: 'num',
              value: 18,
            },
            color: '#ffce63',
          },
          {
            type: 'var',
            name: 'modo',
            value: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'g2d:setGravity',
            value: {
              type: 'num',
              value: 0.25,
            },
          },
        ],
        events: [
          {
            type: 'g2d:onKey',
            key: '1',
            body: [
              {
                type: 'assign',
                name: 'modo',
                value: {
                  type: 'num',
                  value: 1,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '2',
            body: [
              {
                type: 'assign',
                name: 'modo',
                value: {
                  type: 'num',
                  value: 2,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '3',
            body: [
              {
                type: 'assign',
                name: 'modo',
                value: {
                  type: 'num',
                  value: 3,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '4',
            body: [
              {
                type: 'assign',
                name: 'modo',
                value: {
                  type: 'num',
                  value: 4,
                },
              },
              {
                type: 'g2d:pointSprite',
                spriteVar: 'heroi',
                deg: {
                  type: 'num',
                  value: -90,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'modo',
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
                then: [
                  {
                    type: 'g2d:flyFree',
                    spriteVar: 'heroi',
                    speed: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  {
                    type: 'g2d:clampToScreen',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'modo',
                  },
                  right: {
                    type: 'num',
                    value: 2,
                  },
                },
                then: [
                  {
                    type: 'g2d:applyGravity',
                    spriteVar: 'heroi',
                  },
                  {
                    type: 'g2d:flap',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                    force: {
                      type: 'num',
                      value: 6,
                    },
                  },
                  {
                    type: 'g2d:bounceOnEdges',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'modo',
                  },
                  right: {
                    type: 'num',
                    value: 3,
                  },
                },
                then: [
                  {
                    type: 'g2d:followPointer',
                    spriteVar: 'heroi',
                    speed: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  {
                    type: 'g2d:clampToScreen',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'modo',
                  },
                  right: {
                    type: 'num',
                    value: 4,
                  },
                },
                then: [
                  {
                    type: 'if',
                    cond: {
                      type: 'g2d:keyDown',
                      key: 'ArrowLeft',
                    },
                    then: [
                      {
                        type: 'g2d:rotateSprite',
                        spriteVar: 'heroi',
                        deg: {
                          type: 'num',
                          value: -4,
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
                        type: 'g2d:rotateSprite',
                        spriteVar: 'heroi',
                        deg: {
                          type: 'num',
                          value: 4,
                        },
                      },
                    ],
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'g2d:keyDown',
                      key: 'Space',
                    },
                    then: [
                      {
                        type: 'g2d:thrust',
                        spriteVar: 'heroi',
                        force: {
                          type: 'num',
                          value: 0.2,
                        },
                      },
                    ],
                  },
                  {
                    type: 'g2d:applyFriction',
                    spriteVar: 'heroi',
                    factor: {
                      type: 'num',
                      value: 0.99,
                    },
                  },
                  {
                    type: 'g2d:applyVelocity',
                    spriteVar: 'heroi',
                  },
                  {
                    type: 'g2d:wrapEdges',
                    spriteVar: 'heroi',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '>',
                  left: {
                    type: 'g2d:distance',
                    aVar: 'amigo',
                    bVar: 'heroi',
                  },
                  right: {
                    type: 'num',
                    value: 50,
                  },
                },
                then: [
                  {
                    type: 'g2d:moveToward',
                    spriteVar: 'amigo',
                    targetVar: 'heroi',
                    speed: {
                      type: 'num',
                      value: 1.5,
                    },
                  },
                ],
              },
              {
                type: 'g2d:pointSprite',
                spriteVar: 'amigo',
                deg: {
                  type: 'g2d:angleTo',
                  aVar: 'amigo',
                  bVar: 'heroi',
                },
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'amigo',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'str',
                      value: 'Modo ',
                    },
                    right: {
                      type: 'var',
                      name: 'modo',
                    },
                  },
                  right: {
                    type: 'str',
                    value: ' | 1 voo | 2 asas | 3 ponteiro | 4 impulso',
                  },
                },
                x: {
                  type: 'num',
                  value: 18,
                },
                y: {
                  type: 'num',
                  value: 25,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 18,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
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
                        type: 'str',
                        value: 'Velocidade: ',
                      },
                      right: {
                        type: 'g2d:spriteSpeed',
                        spriteVar: 'heroi',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' | direção: ',
                    },
                  },
                  right: {
                    type: 'g2d:spriteAngle',
                    spriteVar: 'heroi',
                  },
                },
                x: {
                  type: 'num',
                  value: 18,
                },
                y: {
                  type: 'num',
                  value: 52,
                },
                color: '#a7ddff',
                size: {
                  type: 'num',
                  value: 16,
                },
                align: 'left',
              },
              {
                type: 'if',
                cond: {
                  type: 'g2d:isMoving',
                  spriteVar: 'heroi',
                },
                then: [
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
                    text: 'Em movimento',
                    x: {
                      type: 'num',
                      value: 18,
                    },
                    y: {
                      type: 'num',
                      value: 78,
                    },
                    color: '#66e8c0',
                    size: {
                      type: 'num',
                      value: 16,
                    },
                    align: 'left',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'g2d:isMovingV',
                  spriteVar: 'heroi',
                },
                then: [
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
                    text: 'Subindo ou descendo',
                    x: {
                      type: 'num',
                      value: 18,
                    },
                    y: {
                      type: 'num',
                      value: 102,
                    },
                    color: '#ffce63',
                    size: {
                      type: 'num',
                      value: 16,
                    },
                    align: 'left',
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
  },
  {
    name: 'Caixas, círculos e plataformas',
    description:
      'Ande e pule nas plataformas. A caixa de contato mostra por que o círculo amarelo é coletado. O bloco vermelho tira vida com recarga; R recomeça.',
    concepts: ['colisão sólida', 'plataformas', 'colisão circular', 'vida', 'recarga'],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#142436',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Setas movem e Espaço pula. Alcance a moeda amarela; o bloco vermelho tira vida com recarga. R recomeça.',
          },
          {
            type: 'g2d:createSprite',
            varName: 'heroi',
            x: {
              type: 'num',
              value: 40,
            },
            y: {
              type: 'num',
              value: 240,
            },
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 36,
            },
            color: '#66e8c0',
          },
          {
            type: 'g2d:createSprite',
            varName: 'chao',
            x: {
              type: 'num',
              value: 0,
            },
            y: {
              type: 'num',
              value: 330,
            },
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 30,
            },
            color: '#35556a',
          },
          {
            type: 'g2d:createSprite',
            varName: 'degrau',
            x: {
              type: 'num',
              value: 130,
            },
            y: {
              type: 'num',
              value: 265,
            },
            w: {
              type: 'num',
              value: 140,
            },
            h: {
              type: 'num',
              value: 14,
            },
            color: '#79a7c2',
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
              value: 330,
            },
            y: {
              type: 'num',
              value: 205,
            },
            w: {
              type: 'num',
              value: 150,
            },
            h: {
              type: 'num',
              value: 14,
            },
            color: '#79a7c2',
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
            varName: 'perigo',
            x: {
              type: 'num',
              value: 270,
            },
            y: {
              type: 'num',
              value: 300,
            },
            w: {
              type: 'num',
              value: 40,
            },
            h: {
              type: 'num',
              value: 30,
            },
            color: '#f96d78',
          },
          {
            type: 'g2d:createSprite',
            varName: 'moeda',
            x: {
              type: 'num',
              value: 390,
            },
            y: {
              type: 'num',
              value: 166,
            },
            w: {
              type: 'num',
              value: 24,
            },
            h: {
              type: 'num',
              value: 24,
            },
            color: '#ffce63',
          },
          {
            type: 'var',
            name: 'coletou',
            value: {
              type: 'bool',
              value: false,
            },
          },
          {
            type: 'g2d:setGravity',
            value: {
              type: 'num',
              value: 0.4,
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
        ],
        events: [
          {
            type: 'g2d:onOverlap',
            aVar: 'heroi',
            bVar: 'moeda',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'g2d:circleTouches',
                  aVar: 'heroi',
                  bVar: 'moeda',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'coletou',
                    value: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  {
                    type: 'g2d:destroySprite',
                    spriteVar: 'moeda',
                  },
                ],
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                  type: 'g2d:hasHealth',
                  spriteVar: 'heroi',
                },
                then: [
                  {
                    type: 'g2d:applyGravity',
                    spriteVar: 'heroi',
                  },
                  {
                    type: 'g2d:platformer',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                    speed: {
                      type: 'num',
                      value: 3,
                    },
                    jump: {
                      type: 'num',
                      value: 10,
                    },
                  },
                  {
                    type: 'g2d:collideSprite',
                    spriteVar: 'heroi',
                    otherVar: 'chao',
                  },
                  {
                    type: 'g2d:collidePlatform',
                    spriteVar: 'heroi',
                    otherVar: 'degrau',
                  },
                  {
                    type: 'g2d:collidePlatformGroup',
                    spriteVar: 'heroi',
                    groupVar: 'plataformas',
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'g2d:touches',
                      aVar: 'heroi',
                      bVar: 'perigo',
                    },
                    then: [
                      {
                        type: 'g2d:withCooldown',
                        spriteVar: 'heroi',
                        frames: {
                          type: 'num',
                          value: 60,
                        },
                        key: 'perigo',
                        body: [
                          {
                            type: 'g2d:damageSprite',
                            spriteVar: 'heroi',
                            amount: {
                              type: 'num',
                              value: 1,
                            },
                            invincibilityFrames: {
                              type: 'num',
                              value: 60,
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'g2d:drawSprite',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                  },
                  {
                    type: 'g2d:drawHitbox',
                    spriteVar: 'heroi',
                  },
                ],
                else: [
                  {
                    type: 'g2d:gameOver',
                    ctxVar: 'ctx',
                    text: {
                      type: 'str',
                      value: 'Sem vidas. Aperte R para recomeçar.',
                    },
                  },
                ],
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'chao',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'degrau',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'perigo',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawGroup',
                groupVar: 'plataformas',
                ctxVar: 'ctx',
              },
              {
                type: 'if',
                cond: {
                  type: 'logicalNot',
                  value: {
                    type: 'var',
                    name: 'coletou',
                  },
                },
                then: [
                  {
                    type: 'g2d:drawSprite',
                    spriteVar: 'moeda',
                    ctxVar: 'ctx',
                  },
                  {
                    type: 'g2d:drawHitbox',
                    spriteVar: 'moeda',
                  },
                ],
              },
              {
                type: 'g2d:drawSpriteHealth',
                ctxVar: 'ctx',
                spriteVar: 'heroi',
                style: 'hearts',
                x: {
                  type: 'num',
                  value: 18,
                },
                y: {
                  type: 'num',
                  value: 16,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: '#66e8c0',
              },
              {
                type: 'if',
                cond: {
                  type: 'var',
                  name: 'coletou',
                },
                then: [
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
                    text: 'Você alcançou a moeda! R recomeça.',
                    x: {
                      type: 'num',
                      value: 150,
                    },
                    y: {
                      type: 'num',
                      value: 40,
                    },
                    color: '#ffce63',
                    size: {
                      type: 'num',
                      value: 20,
                    },
                    align: 'left',
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
  },
  {
    name: 'Mesa de som',
    description:
      '1 toca um arquivo, 2 para o efeito, 3 repete como música e 4 para a música. As teclas 5 e 6 tocam uma nota e um tom. O arquivo está no projeto.',
    concepts: ['som de arquivo', 'música', 'nota', 'tom', 'volume'],
    assets: [
      {
        id: 'receita-som',
        name: 'sinal-receita',
        kind: 'audio',
        source: 'upload',
        dataUrl:
          'data:audio/wav;base64,UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAMAAAAAEoF8wltDU8PYg+kDUoKuQV9ADT7ffbo8uDwovA18mn13PkI/08EEgnBDO0OVQ/tDeAKiwZyAS/8YPeZ80nxuPD18dr0EPkW/lQDLAgMDH0OOA8lDmgLUgdgAij9SPhS9MDx3fDE8Vr0T/gs/VwCRAdOCwAOCw9ODuALDAhGAx/+MvkU9UPyEvGk8erzm/dK/GcBWAaICncNzw5lDkkMuggjBBL/Hvre9dHyVfGV8Yjz9fZx+3YAbAW7CeMMhA5tDqIMWgn3BAAAC/ut9mvzpvGV8TfzXPaj+ov/fwTqCEUMLA5mDuwM7AnABekA9/uB9w70BfKk8fXy0fXf+aX+kwMTCJ0Lxw1PDiYNcAp/BssB4vxa+Lr0cfLC8cPyVPUm+cf9qQI5B+0KVQ0pDlAN5QoxB6UCy/01+W716PLv8aDy5fR6+PD8wgFdBjUK2Az1DWsNTAvYB3gDsP4S+in2a/Mq8o3yhvTZ9yL83wB/BXcJUAyzDXcNpAtyCEEEkf/w+ur2+PNz8ojyNfRG9177AAChBLQIvgtkDXUN7gv/CAEFbQDO+7D3jvTI8pLy8/O/9qP6J//DA+wHIwsJDWMNKQx/CbcFQwGr/Hn4LfUp86vywPNH9vP5Vf7nAiAHgQqiDEQNVQzxCWEGEgKG/Ub51PWW89Hym/Pb9U75if0OAlMG1gkvDBcNcgxVCgAH2QJd/hX6gfYO9AXzhfN+9bT4xvw4AYMFJgmzC90MgQyrCpQHmAMx/+T6NPeP9EXzffMv9Sf4DPxnALQEcQgtC5YMggz0ChsITgQAALT77PcZ9ZHzgvPt9Kb3W/ub/+UDtwefCkQMdgwuC5UI+gTJAIP8p/ir9enzlvO69DL3tPrV/hcD+gYJCucLXAxbCwMJnAWMAU/9ZflF9kz0tvOU9Mv2F/oV/ksCOwZsCX8LNQx6C2QJMwZIAhn+Jvrl9rn04/N89HD2hvld/YMBegXJCA0LAgyLC7gJvwb7At/+5/qK9y/1HPRx9CP2//iu/L8AuAQhCJIKwwuPC/4JQAenA6H/qPs0+K71YfRz9OP1hfgH/AAA9wN1BxAKeQuHCzgKtAdJBF4Aafzi+DT2sPSC9LD1Fvhp+0b/OAPGBoYJJAtxC2QKHQjiBBQBJ/2T+cL2CvWe9Ir1s/fW+pP+egIVBvUIxgpQC4QKeghwBcQB4/1F+lX3bfXF9HH1XfdM+uf9wAFiBV8IXwojC5cKygj0BWwCnP74+u332PX49GX1E/fO+UP9CQGvBMUH7wnrCp0KDgluBgwDUf+r+4r4TPY19WX11fZa+ab8VwD8AyYHdwmoCpcKRQncBqQDAABd/Cr5x/Z99XD1o/bx+BP8qv9KA4UG+QhcCoYKcQk/BzMEqgAO/c35SffO9Yf1fvaU+In7BP+aAuEFdAgGCmkKkAmXB7kETQG8/XH60Pco9qr1ZfZC+Aj7Y/7uATwF6geoCUEKownjBzQF6gFn/hf7XPiK9tf1V/b895L6yv1FAZcEXAdCCQ8KqwkjCKYFfwIO/7z77Pj09g72VfbB9yX6Of2gAPIDywbVCNMJqAlYCA0GDAOx/2D8f/lk9072XvaS98P5sPwAAE4DNgZhCI4JmQmCCGoGkQNOAAP9Ffrb95j2cvZu92z5MPxm/6wCoAXoB0AJgAmgCLwGDQTlAKT9rPpW+Or2kfZV9yD5ufvS/g0CCQVqB+sIXAmzCAMHfwR1AUH+Q/vW+EP3ufZI9974S/tF/nIBcQToBo4ILwm7CD8H6QT/Adv+2/ta+aP36/ZF96f45/q//doA2gNjBioI+Qi5CHAHSAWBAnD/cvzg+Qr4JfdM93v4jPpB/UcARAPcBcEHuwisCJcHnQX7AgAAB/1p+nb4aPde91n4PPrL/Lr/sAJSBVIHdAiWCLMH6QVtA4oAmv3z+ub4svd590L49fle/DP/HgLIBOAGJgh2CMUHKgbWAw8BKf59+1v5A/ie9zb4ufn5+7L+kAE+BGkG0gdNCM0HYQY2BIwBtv4H/NP5W/jL9zP4h/md+zj+BgG0A/AFdwccCMsHjwaNBAMCPf+R/E76uPgA+Dr4XvlL+8X9gAArA3QFFwfjB8AHsgbbBHICwP8Y/cr6Gvk8+Er4QPkC+1r9AAClAvgEswajB6sHywYfBdkCPgCe/Uf7gfmA+GL4K/nC+vf8hf8hAnoESwZcB44H2wZaBTgDtgAg/sX76/nK+IT4IPmM+pz8Ef+gAf0D3wUPB2kH4gaMBY8DJwGf/kL8V/oZ+a34Hvlf+kn8o/4jAYADcQW9BjwH3wa0Bd0DkgEZ/778xvpu+d74Jfk8+gD8O/6rAAUDAgVmBgcH1AbTBSIE9QGP/zj9N/vH+RX5NPkh+r/72/04AIwCkQQLBs0GwQbpBV8EUgIAALD9qPsk+lP5TPkQ+ob7g/3K/xUCIASsBYwGpQb2BZMEpgJrACX+GfyE+pb5a/kH+lf7M/1i/6IBrwNLBUYGgwb6Bb4E8wLQAJb+ifzm+t/5kfkH+jD76vwA/zIBPwPoBPsFWQb3BeAENwMvAQT/+PxK+yz6vvkO+hL7qfyl/scA0QKDBKwFKQbrBfoEdAOGAWz/Zv2v+3z68fke+vz6cfxQ/mEAZQIeBFoF8wXYBQwFqAPXAdD/0P0U/ND6Kvo1+u76QfwD/gAA+wG5AwUFuAW9BRUF1AMhAi4AOP55/Cf7aPpT+un6Gfy9/aX/lQFUA60EeAWcBRcF+ANjAocAnP7e/H/7qvp3+uv6+ft//U//MwHxAlQEMwV1BREFFQSeAtkA/P5A/dn78Pqh+vX64PtI/QD/1QCPAvoD7ARIBQQFKQTRAiUBWP+h/TP8OfvR+gX70PsZ/bj+fAAwAqADoQQWBfAENQT8AmoBr////Y38hfsF+xz7x/vx/Hb+KADUAUYDVQTfBNYEOgQgA6gBAABZ/ub80/s++zr7xvvR/Dv+2f97Ae0CBgSkBLUEOAQ8A+ABTACx/j/9Ivx7+137y/u4/Af+kf8lAZYCtwNmBJAELwRRAxACkQAD/5X9cfy6+4X71/un/Nv9Tv/VAEACZwMlBGUEIARfAzkC0QBS/+n9wfz9+7L76vud/LX9Ev+JAO4BFwPhAzYECwRmA1sCCgGc/zv+Ef1B/OP7AvyZ/Jf93P5CAJ4ByAKcAwME8ANmA3YCPQHg/4n+X/2H/Bj8IPyd/H/9rP4AAFIBegJWA8wDzwNfA4oCaQEfANP+rP3N/FD8Q/ym/G/9hP7E/woBLgIQA5MDqgNTA5cCjgFYABn/9/0U/Yr8avy2/GX9Yv6O/8YA5QHJAlgDgQNAA50CrQGLAFr/P/5a/cb8lfzL/GL9Rv5e/4cAngGDAhsDVAMoA54CxQG4AJf/hP6f/QT9xPzl/GX9Mv40/00AWwE/At0CJAMMA5gC1gHeAM7/xf7j/UL99fwE/W39I/4R/xgAGwH8AZ4C8QLrAowC4QH/AAAAA/8l/oH9Kf0o/Xz9HP7z/un/4AC7AWACvALFAnsC5gEZASwAPP9l/r/9X/1P/ZD9Gv7c/sD/qQB9ASIChgKdAmUC5QEtAVMAcf+h/vz9lv15/aj9Hv7M/pz/dwBCAeUBTgJxAkoC3gE6AXMAoP/a/jj+zf2m/cX9KP7B/n//SgALAaoBFwJDAisC0QFCAY4Ay/8P/3L+Bf7V/eb9N/69/mf/IgDXAHIB3wETAggCvwFDAaIA8P9B/6r+Pf4G/gv+S/6+/lb/AACpADwBqAHhAeEBqQE/AbEADwBt/97+c/44/jP+ZP7F/kr/4/9+AAkBcgGvAbkBjgE1AbkAKQCV/xD/qP5q/l3+gf7R/kX/zf9ZANkAPgF8AY0BbwEmAbwAPQC4/z3/2/6d/on+ov7j/kX/vP85AK0ADAFKAWABTQETAbkASwDV/2f/DP/P/rf+xv75/kv/sP8eAIYA3QAYATIBJwH6ALAAUwDt/4z/Of8A/+X+7P4U/1b/q/8JAGMAsQDoAAMB/wDeAKMAVgAAAKz/ZP8v/xT/Ff8y/2b/q//5/0YAiAC6ANQA1QC9AJAAUgANAMj/iv9d/0P/QP9U/3v/sf/v/y0AZACOAKYAqgCaAHgASgAUAN7/rf+I/3H/bf95/5X/vf/q/xkAQwBkAHgAfQBzAFwAPAAWAO7/y/+v/57/mv+h/7P/zf/s/wsAKAA+AEwAUABKAD0AKQARAPr/5P/U/8r/x//L/9X/4//z/wMAEQAbACEAIwAgABkAEQAIAP//+f/0//P/9P/2//r//f///w==',
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#17243b',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Use 1 a 6 para experimentar sons. 1 toca, 2 para, 3 repete, 4 para músicas, 5 nota e 6 tom.',
          },
          {
            type: 'g2d:loadSound',
            name: 'sinal',
            asset: 'sinal-receita',
          },
          {
            type: 'g2d:setVolume',
            level: {
              type: 'num',
              value: 5,
            },
          },
          {
            type: 'var',
            name: 'ultima',
            value: {
              type: 'str',
              value: 'Escolha um som',
            },
          },
        ],
        events: [
          {
            type: 'g2d:onKey',
            key: '1',
            body: [
              {
                type: 'g2d:playClip',
                name: 'sinal',
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Efeito de arquivo',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '2',
            body: [
              {
                type: 'g2d:stopClip',
                name: 'sinal',
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Efeito parado',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '3',
            body: [
              {
                type: 'g2d:playTrack',
                name: 'sinal',
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Arquivo repetindo como música',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '4',
            body: [
              {
                type: 'g2d:stopTrack',
                scope: 'all',
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Música parada',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '5',
            body: [
              {
                type: 'g2d:playNote',
                note: 'C',
                ms: {
                  type: 'num',
                  value: 300,
                },
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Nota dó',
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '6',
            body: [
              {
                type: 'g2d:playSound',
                freq: {
                  type: 'num',
                  value: 660,
                },
                durationMs: {
                  type: 'num',
                  value: 300,
                },
              },
              {
                type: 'assign',
                name: 'ultima',
                value: {
                  type: 'str',
                  value: 'Tom de 660 Hz',
                },
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
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: 'Mesa de som',
                x: {
                  type: 'num',
                  value: 35,
                },
                y: {
                  type: 'num',
                  value: 55,
                },
                color: '#ffce63',
                size: {
                  type: 'num',
                  value: 32,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: '1 tocar | 2 parar efeito | 3 música | 4 parar músicas',
                x: {
                  type: 'num',
                  value: 35,
                },
                y: {
                  type: 'num',
                  value: 110,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 19,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: '5 nota | 6 tom | volume inicial: 5 de 10',
                x: {
                  type: 'num',
                  value: 35,
                },
                y: {
                  type: 'num',
                  value: 148,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 19,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'var',
                  name: 'ultima',
                },
                x: {
                  type: 'num',
                  value: 35,
                },
                y: {
                  type: 'num',
                  value: 230,
                },
                color: '#66e8c0',
                size: {
                  type: 'num',
                  value: 24,
                },
                align: 'left',
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
  },
  {
    name: 'Mapa do Pinta e duas fases',
    description:
      'Setas movem e Espaço pula pelo mapa do Pinta. N troca para uma fase vetorial; R restaura a fase. A câmera acompanha e as plataformas são atravessáveis por baixo.',
    concepts: ['mapa do Pinta', 'mapa vetorial', 'Mundo', 'Fase', 'câmera', 'reinício'],
    assets: [
      {
        id: 'receita-mapa',
        name: 'mapa-do-pinta',
        kind: 'image',
        source: 'upload',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNMCA4aDMyTTAgMTZoMzJNMCAyNGgzMiIgc3Ryb2tlPSIjNDc1NTY5Ii8+PHJlY3QgeD0iMzIiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzdjM2FlZCIvPjxwYXRoIGQ9Ik0zMiA4aDMyTTMyIDE2aDMyTTMyIDI0aDMyTTQwIDB2OG0xNiAwdjhtLTE2IDB2OG0xNiAwdjgiIHN0cm9rZT0iI2M0YjVmZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
        width: 64,
        height: 32,
        tilemap: {
          tileSize: 32,
          cols: 12,
          rows: 8,
          grid: '. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . 1 1 . . . . . .;. . . . . . . . . . . .;1 1 1 1 1 1 1 1 1 1 1 1',
          solid: [1],
          tileset: {
            dataUrl:
              'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNMCA4aDMyTTAgMTZoMzJNMCAyNGgzMiIgc3Ryb2tlPSIjNDc1NTY5Ii8+PHJlY3QgeD0iMzIiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzdjM2FlZCIvPjxwYXRoIGQ9Ik0zMiA4aDMyTTMyIDE2aDMyTTMyIDI0aDMyTTQwIDB2OG0xNiAwdjhtLTE2IDB2OG0xNiAwdjgiIHN0cm9rZT0iI2M0YjVmZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
            width: 64,
            height: 32,
          },
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'g2d:defineShape',
            shapeName: 'grama',
            body: [
              {
                type: 'g2d:paintRect',
                ctxVar: 'ctx',
                x: {
                  type: 'num',
                  value: 0,
                },
                y: {
                  type: 'num',
                  value: 0,
                },
                w: {
                  type: 'g2d:shapeW',
                },
                h: {
                  type: 'g2d:shapeH',
                },
                color: '#456c39',
              },
              {
                type: 'g2d:paintLine',
                ctxVar: 'ctx',
                x1: {
                  type: 'num',
                  value: 0,
                },
                y1: {
                  type: 'num',
                  value: 2,
                },
                x2: {
                  type: 'g2d:shapeW',
                },
                y2: {
                  type: 'num',
                  value: 2,
                },
                color: '#83cf67',
                width: {
                  type: 'num',
                  value: 4,
                },
              },
            ],
          },
        ],
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 480,
            },
            height: {
              type: 'num',
              value: 320,
            },
            bg: '#19394b',
          },
          {
            type: 'g2d:createVectorTileset',
            varName: 'pecas',
            size: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'g2d:defineVectorTile',
            tilesetVar: 'pecas',
            index: {
              type: 'num',
              value: 1,
            },
            shape: 'grama',
            role: 'solid',
          },
          {
            type: 'g2d:setStageDescription',
            description: 'Setas movem, Espaço pula, N troca a fase e R restaura a fase atual.',
          },
          {
            type: 'g2d:createSprite',
            varName: 'heroi',
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
              value: 24,
            },
            h: {
              type: 'num',
              value: 30,
            },
            color: '#ffce63',
          },
          {
            type: 'g2d:createTileMapFromAsset',
            varName: 'mapa',
            image: 'mapa-do-pinta',
          },
          {
            type: 'g2d:placeTileMap',
            mapVar: 'mapa',
            x: {
              type: 'num',
              value: 0,
            },
            y: {
              type: 'num',
              value: 0,
            },
            size: {
              type: 'num',
              value: 40,
            },
          },
          {
            type: 'g2d:createWorld',
            varName: 'mundo',
            width: {
              type: 'num',
              value: 480,
            },
            height: {
              type: 'num',
              value: 320,
            },
          },
          {
            type: 'g2d:addTileMapToWorld',
            worldVar: 'mundo',
            mapVar: 'mapa',
          },
          {
            type: 'g2d:createGroup',
            varName: 'apoios',
          },
          {
            type: 'g2d:spawnInGroup',
            groupVar: 'apoios',
            x: {
              type: 'num',
              value: 40,
            },
            y: {
              type: 'num',
              value: 240,
            },
            w: {
              type: 'num',
              value: 80,
            },
            h: {
              type: 'num',
              value: 12,
            },
            color: '#76b4cf',
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
            type: 'g2d:addPlatformGroupToWorld',
            worldVar: 'mundo',
            groupVar: 'apoios',
          },
          {
            type: 'g2d:createLevel',
            varName: 'fase',
            worldVar: 'mundo',
            spawnX: {
              type: 'num',
              value: 40,
            },
            spawnY: {
              type: 'num',
              value: 190,
            },
          },
          {
            type: 'g2d:createVectorTileMap',
            varName: 'mapa2',
            tilesetVar: 'pecas',
            grid: '. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . 1 1 . . . . . . 1 1 . . . .;1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1',
          },
          {
            type: 'g2d:createWorldFromTileMap',
            varName: 'mundo2',
            mapVar: 'mapa2',
            size: {
              type: 'num',
              value: 40,
            },
          },
          {
            type: 'g2d:createLevel',
            varName: 'fase2',
            worldVar: 'mundo2',
            spawnX: {
              type: 'num',
              value: 40,
            },
            spawnY: {
              type: 'num',
              value: 190,
            },
          },
          {
            type: 'g2d:createGroup',
            varName: 'moedas',
          },
          {
            type: 'g2d:resetGroupWithLevel',
            levelVar: 'fase2',
            groupVar: 'moedas',
          },
          {
            type: 'g2d:setGravity',
            value: {
              type: 'num',
              value: 0.4,
            },
          },
          {
            type: 'g2d:enterLevel',
            levelVar: 'fase',
            spriteVar: 'heroi',
          },
        ],
        events: [
          {
            type: 'g2d:onLevelEnter',
            levelVar: 'fase2',
            body: [
              {
                type: 'g2d:spawnInGroup',
                groupVar: 'moedas',
                x: {
                  type: 'num',
                  value: 400,
                },
                y: {
                  type: 'num',
                  value: 220,
                },
                w: {
                  type: 'num',
                  value: 20,
                },
                h: {
                  type: 'num',
                  value: 20,
                },
                color: '#ffce63',
                vx: {
                  type: 'num',
                  value: 0,
                },
                vy: {
                  type: 'num',
                  value: 0,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'n',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'g2d:levelIsActive',
                  levelVar: 'fase',
                },
                then: [
                  {
                    type: 'g2d:enterLevel',
                    levelVar: 'fase2',
                    spriteVar: 'heroi',
                  },
                ],
                else: [
                  {
                    type: 'g2d:enterLevel',
                    levelVar: 'fase',
                    spriteVar: 'heroi',
                  },
                ],
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'g2d:levelIsActive',
                  levelVar: 'fase',
                },
                then: [
                  {
                    type: 'g2d:restartLevel',
                    levelVar: 'fase',
                    spriteVar: 'heroi',
                  },
                ],
                else: [
                  {
                    type: 'g2d:restartLevel',
                    levelVar: 'fase2',
                    spriteVar: 'heroi',
                  },
                ],
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'e',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'g2d:levelIsActive',
                  levelVar: 'fase',
                },
                then: [
                  {
                    type: 'g2d:setTile',
                    mapVar: 'mapa',
                    index: {
                      type: 'num',
                      value: 1,
                    },
                    spriteVar: 'heroi',
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
                type: 'g2d:applyGravity',
                spriteVar: 'heroi',
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
                type: 'g2d:jumpWithTerrain',
                spriteVar: 'heroi',
                jump: {
                  type: 'num',
                  value: 9,
                },
              },
              {
                type: 'g2d:collideCurrentLevel',
                spriteVar: 'heroi',
              },
              {
                type: 'g2d:followCurrentLevelCamera',
                spriteVar: 'heroi',
              },
              {
                type: 'g2d:drawCurrentLevel',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawGroup',
                groupVar: 'moedas',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: 'N troca fase | R restaura | E põe peça no mapa do Pinta',
                x: {
                  type: 'num',
                  value: 12,
                },
                y: {
                  type: 'num',
                  value: 24,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 15,
                },
                align: 'left',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
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
                        type: 'str',
                        value: 'Câmera: ',
                      },
                      right: {
                        type: 'g2d:cameraX',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ', ',
                    },
                  },
                  right: {
                    type: 'g2d:cameraY',
                  },
                },
                x: {
                  type: 'num',
                  value: 12,
                },
                y: {
                  type: 'num',
                  value: 47,
                },
                color: '#ffce63',
                size: {
                  type: 'num',
                  value: 15,
                },
                align: 'left',
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
  },
  {
    name: 'Pista do meu desenho',
    description:
      'Desça a pista com as setas, escolha a vista com 1, 2 ou 3 e alcance a chegada. As bandeiras se movem; o placar mostra a distância percorrida.',
    concepts: ['pista', 'perspectiva', 'distância', 'câmera', 'chegada'],
    assets: [
      {
        id: 'receita-fundo',
        name: 'cenario-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
        width: 32,
        height: 24,
      },
      {
        id: 'receita-heroi',
        name: 'heroi-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==',
        width: 32,
        height: 32,
      },
      {
        id: 'receita-folha',
        name: 'folha-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4=',
        width: 128,
        height: 32,
        sprite: {
          frameW: 32,
          frameH: 32,
          animations: [
            {
              name: 'andando',
              from: 0,
              to: 3,
              fps: 8,
              loop: true,
            },
          ],
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 480,
            },
            height: {
              type: 'num',
              value: 540,
            },
            bg: '#d8edf5',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Setas viram, 1, 2 e 3 escolhem a vista. Chegue ao fim da pista. Enter começa e R recomeça.',
          },
          {
            type: 'g2d:sceneCommand',
            method: 'addSceneBackdrop',
            args: [
              {
                type: 'str',
                value: 'ceu',
              },
              {
                type: 'str',
                value: 'cenario-receita',
              },
              {
                type: 'str',
                value: 'far',
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'sceneBackdropFit',
            args: [
              {
                type: 'str',
                value: 'ceu',
              },
              {
                type: 'str',
                value: 'cover',
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'createSpriteTrack',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
            ],
          },
          {
            type: 'g2d:createImageSprite',
            varName: 'heroi',
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
              value: 42,
            },
            h: {
              type: 'num',
              value: 42,
            },
            image: 'heroi-receita',
          },
          {
            type: 'g2d:createSprite',
            varName: 'bandeira',
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
              value: 24,
            },
            h: {
              type: 'num',
              value: 60,
            },
            color: '#fa6868',
          },
          {
            type: 'g2d:sceneCommand',
            method: 'trackPlayer',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'var',
                name: 'heroi',
              },
              {
                type: 'num',
                value: 3,
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'trackControls',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'num',
                value: 140,
              },
              {
                type: 'num',
                value: 120,
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'trackTravel',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'num',
                value: 160,
              },
              {
                type: 'num',
                value: 600,
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'putTrackSpriteAt',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'var',
                name: 'bandeira',
              },
              {
                type: 'str',
                value: 'left',
              },
              {
                type: 'num',
                value: 180,
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'trackSpriteVelocity',
            args: [
              {
                type: 'var',
                name: 'bandeira',
              },
              {
                type: 'num',
                value: 30,
              },
              {
                type: 'num',
                value: 0,
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'trackCameraView',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'str',
                value: 'wide',
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'sceneGameScreens',
            args: [
              {
                type: 'str',
                value: 'Pista do meu desenho',
              },
              {
                type: 'str',
                value: 'Use setas e chegue ao fim. 1, 2 e 3 mudam a vista.',
              },
            ],
          },
        ],
        events: [
          {
            type: 'g2d:sceneEvent',
            method: 'onTrackFinish',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
            ],
            body: [
              {
                type: 'g2d:sceneCommand',
                method: 'sceneResult',
                args: [
                  {
                    type: 'str',
                    value: 'won',
                  },
                ],
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: '1',
            body: [
              {
                type: 'g2d:sceneCommand',
                method: 'trackCameraView',
                args: [
                  {
                    type: 'str',
                    value: 'pista',
                  },
                  {
                    type: 'str',
                    value: 'near',
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
                type: 'g2d:sceneCommand',
                method: 'trackCameraView',
                args: [
                  {
                    type: 'str',
                    value: 'pista',
                  },
                  {
                    type: 'str',
                    value: 'wide',
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
                type: 'g2d:sceneCommand',
                method: 'trackCameraView',
                args: [
                  {
                    type: 'str',
                    value: 'pista',
                  },
                  {
                    type: 'str',
                    value: 'high',
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
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Distância: ',
                  },
                  right: {
                    type: 'g2d:sceneValue',
                    method: 'spriteTrackValue',
                    args: [
                      {
                        type: 'str',
                        value: 'pista',
                      },
                      {
                        type: 'str',
                        value: 'distance',
                      },
                    ],
                  },
                },
                x: {
                  type: 'num',
                  value: 12,
                },
                y: {
                  type: 'num',
                  value: 115,
                },
                color: '#173d52',
                size: {
                  type: 'num',
                  value: 18,
                },
                align: 'left',
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
  },
  {
    name: 'Inimigo que muda ao levar dano',
    description:
      'Desvie com as setas e atire com Espaço. Ao levar dano, o inimigo passa a perseguir o jogador. Seus raios tiram vida com invencibilidade; R recomeça.',
    concepts: ['tipo de inimigo', 'comportamentos', 'animação', 'dano', 'raio'],
    assets: [
      {
        id: 'receita-fundo',
        name: 'cenario-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
        width: 32,
        height: 24,
      },
      {
        id: 'receita-heroi',
        name: 'heroi-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==',
        width: 32,
        height: 32,
      },
      {
        id: 'receita-folha',
        name: 'folha-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4=',
        width: 128,
        height: 32,
        sprite: {
          frameW: 32,
          frameH: 32,
          animations: [
            {
              name: 'andando',
              from: 0,
              to: 3,
              fps: 8,
              loop: true,
            },
          ],
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'g2d:defineEnemySmart',
            varName: 'guardas',
            smart: 'basica',
            color: '#f96d78',
            image: 'heroi-receita',
            hp: {
              type: 'num',
              value: 4,
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
              value: 48,
            },
            h: {
              type: 'num',
              value: 48,
            },
          },
        ],
        start: [
          {
            type: 'g2d:setupStage',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
            bg: '#142436',
          },
          {
            type: 'g2d:enemyAddBehavior',
            typeVar: 'guardas',
            behavior: 'raio',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Setas movem, Espaço atira. O inimigo passa a perseguir ao levar dano. Desvie do raio. R recomeça.',
          },
          {
            type: 'g2d:createSprite',
            varName: 'heroi',
            x: {
              type: 'num',
              value: 300,
            },
            y: {
              type: 'num',
              value: 280,
            },
            w: {
              type: 'num',
              value: 26,
            },
            h: {
              type: 'num',
              value: 26,
            },
            color: '#66e8c0',
          },
          {
            type: 'g2d:createGroup',
            varName: 'tiros',
          },
          {
            type: 'g2d:loadSpritesheet',
            varName: 'folha',
            image: 'folha-receita',
            frameW: {
              type: 'num',
              value: 32,
            },
            frameH: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'g2d:enemyStateAnim',
            typeVar: 'guardas',
            state: 'parado',
            sheetVar: 'folha',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 3,
            },
            fps: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'g2d:createWorld',
            varName: 'mundo',
            width: {
              type: 'num',
              value: 640,
            },
            height: {
              type: 'num',
              value: 360,
            },
          },
          {
            type: 'g2d:addEnemyTypeToWorld',
            worldVar: 'mundo',
            typeVar: 'guardas',
          },
          {
            type: 'g2d:spawnEnemy',
            typeVar: 'guardas',
            x: {
              type: 'num',
              value: 300,
            },
            y: {
              type: 'num',
              value: 100,
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
            type: 'var',
            name: 'dano',
            value: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'var',
            name: 'venceu',
            value: {
              type: 'bool',
              value: false,
            },
          },
        ],
        events: [
          {
            type: 'g2d:onEnemyHurt',
            typeVar: 'guardas',
            itemName: 'inimigo',
            body: [
              {
                type: 'g2d:enemyAddBehavior',
                typeVar: 'guardas',
                behavior: 'perseguidor-lado',
              },
              {
                type: 'assign',
                name: 'dano',
                value: {
                  type: 'g2d:enemyDamage',
                  spriteVar: 'inimigo',
                },
              },
            ],
          },
          {
            type: 'g2d:onEnemyDefeated',
            typeVar: 'guardas',
            itemName: 'inimigo',
            body: [
              {
                type: 'assign',
                name: 'venceu',
                value: {
                  type: 'bool',
                  value: true,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'Space',
            body: [
              {
                type: 'g2d:spawnInGroup',
                groupVar: 'tiros',
                x: {
                  type: 'g2d:centerX',
                  spriteVar: 'heroi',
                },
                y: {
                  type: 'g2d:spriteY',
                  spriteVar: 'heroi',
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 12,
                },
                color: '#ffce63',
                vx: {
                  type: 'num',
                  value: 0,
                },
                vy: {
                  type: 'num',
                  value: -7,
                },
              },
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                type: 'g2d:topDown',
                spriteVar: 'heroi',
                speed: {
                  type: 'num',
                  value: 3,
                },
              },
              {
                type: 'g2d:clampToScreen',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:updateEnemyType',
                typeVar: 'guardas',
                ctxVar: 'ctx',
                targetVar: 'heroi',
              },
              {
                type: 'g2d:drawEnemyType',
                ctxVar: 'ctx',
                typeVar: 'guardas',
              },
              {
                type: 'g2d:updateGroup',
                groupVar: 'tiros',
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
                bGroup: 'guardas',
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
                    spriteVar: 'tiro',
                    groupVar: 'tiros',
                  },
                ],
              },
              {
                type: 'g2d:onEnemyBeamHit',
                spriteVar: 'heroi',
                typeVar: 'guardas',
                itemName: 'dono',
                body: [
                  {
                    type: 'g2d:hurtByEnemy',
                    spriteVar: 'heroi',
                    enemyVar: 'dono',
                  },
                ],
              },
              {
                type: 'g2d:drawSprite',
                spriteVar: 'heroi',
                ctxVar: 'ctx',
              },
              {
                type: 'g2d:drawSpriteHealth',
                ctxVar: 'ctx',
                spriteVar: 'heroi',
                style: 'hearts',
                x: {
                  type: 'num',
                  value: 18,
                },
                y: {
                  type: 'num',
                  value: 18,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: '#66e8c0',
              },
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Dano do inimigo: ',
                  },
                  right: {
                    type: 'var',
                    name: 'dano',
                  },
                },
                x: {
                  type: 'num',
                  value: 170,
                },
                y: {
                  type: 'num',
                  value: 32,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 17,
                },
                align: 'left',
              },
              {
                type: 'if',
                cond: {
                  type: 'var',
                  name: 'venceu',
                },
                then: [
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
                    text: 'Você venceu! R recomeça.',
                    x: {
                      type: 'num',
                      value: 160,
                    },
                    y: {
                      type: 'num',
                      value: 200,
                    },
                    color: '#ffce63',
                    size: {
                      type: 'num',
                      value: 24,
                    },
                    align: 'left',
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
                    type: 'g2d:gameOver',
                    ctxVar: 'ctx',
                    text: {
                      type: 'str',
                      value: 'Tente de novo com R.',
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
  },
  {
    name: 'Tela que acompanha a janela',
    description:
      'Toque ou aperte uma tecla para começar. O personagem pula na borda da tela, que acompanha a janela. Veja o tamanho do jogo e os quadros por segundo.',
    concepts: ['tela responsiva', 'entrada', 'pulo', 'inspeção'],
    assets: [
      {
        id: 'receita-fundo',
        name: 'cenario-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
        width: 32,
        height: 24,
      },
      {
        id: 'receita-heroi',
        name: 'heroi-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==',
        width: 32,
        height: 32,
      },
      {
        id: 'receita-folha',
        name: 'folha-receita',
        kind: 'image',
        source: 'library',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4=',
        width: 128,
        height: 32,
        sprite: {
          frameW: 32,
          frameH: 32,
          animations: [
            {
              name: 'andando',
              from: 0,
              to: 3,
              fps: 8,
              loop: true,
            },
          ],
        },
      },
    ],
    experience: 'demo',
    difficulty: 'intermediate',
    genre: 'receita',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'g2d:setupFull',
            bg: '#17354b',
          },
          {
            type: 'g2d:setStageDescription',
            description:
              'Toque ou aperte qualquer tecla para começar. Espaço ou toque pula. R recomeça. A tela acompanha a janela.',
          },
          {
            type: 'g2d:createImageSprite',
            varName: 'heroi',
            x: {
              type: 'num',
              value: 40,
            },
            y: {
              type: 'num',
              value: 80,
            },
            w: {
              type: 'num',
              value: 48,
            },
            h: {
              type: 'num',
              value: 48,
            },
            image: 'heroi-receita',
          },
          {
            type: 'g2d:setGravity',
            value: {
              type: 'num',
              value: 0.4,
            },
          },
          {
            type: 'g2d:setScene',
            name: 'inicio',
          },
        ],
        events: [
          {
            type: 'g2d:onAnyInput',
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
            ],
          },
          {
            type: 'g2d:onKey',
            key: 'r',
            body: [
              {
                type: 'g2d:restart',
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
                    type: 'g2d:showImageScreen',
                    ctxVar: 'ctx',
                    image: 'cenario-receita',
                  },
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
                    text: 'Toque ou aperte uma tecla',
                    x: {
                      type: 'num',
                      value: 20,
                    },
                    y: {
                      type: 'num',
                      value: 45,
                    },
                    color: '#17354b',
                    size: {
                      type: 'num',
                      value: 24,
                    },
                    align: 'left',
                  },
                ],
                else: [
                  {
                    type: 'g2d:applyGravity',
                    spriteVar: 'heroi',
                  },
                  {
                    type: 'g2d:jumpOnGround',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                    jump: {
                      type: 'num',
                      value: 10,
                    },
                  },
                  {
                    type: 'g2d:drawSprite',
                    spriteVar: 'heroi',
                    ctxVar: 'ctx',
                  },
                  {
                    type: 'g2d:drawLabel',
                    ctxVar: 'ctx',
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
                            type: 'str',
                            value: 'Tela: ',
                          },
                          right: {
                            type: 'g2d:stageWidth',
                          },
                        },
                        right: {
                          type: 'str',
                          value: ' × ',
                        },
                      },
                      right: {
                        type: 'g2d:stageHeight',
                      },
                    },
                    x: {
                      type: 'num',
                      value: 20,
                    },
                    y: {
                      type: 'num',
                      value: 65,
                    },
                    color: '#ffffff',
                    size: {
                      type: 'num',
                      value: 20,
                    },
                    align: 'left',
                  },
                  {
                    type: 'g2d:showFps',
                    x: {
                      type: 'num',
                      value: 20,
                    },
                    y: {
                      type: 'num',
                      value: 30,
                    },
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
  },
]
