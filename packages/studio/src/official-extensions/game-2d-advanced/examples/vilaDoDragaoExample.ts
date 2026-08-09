import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Vila do Dragão" — o 🧙 Kit RPG inteiro numa mini-aventura
 * SEM assets (NPCs por aparência vetorial): vila em GRADE (andar célula a
 * célula, paredes), NPC com conversa que MUDA pela história (flags), item
 * (chave) que abre a PORTA da caverna (mapas), e batalha por TURNOS contra o
 * dragão com o menu pronto (Atacar/Defender/Fugir) — vitória na tela pronta.
 * Também prova o rpgCell dentro de soquete e o inventário no HUD.
 *
 * ⚠️ IR GERADA pelo parser real (o mesmo código vive no drift test) — se o
 * parser mudar a saída, re-embutir aqui.
 */
export const vilaDoDragaoExample: ExtensionExample = {
  name: 'Vila do Dragão',
  experience: 'game',
  description:
    'Uma aventura de RPG com cena de abertura, batalha por turnos RICA (defesa, golpe especial, poção e XP que sobe de nível) e história: fale com o ferreiro, ganhe a chave e a poção, e derrote o dragão. Cenas, escolhas, combate de progressão — tudo em blocos.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'gk:defineLook',
          name: 'ferreiro',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8b5a2b',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 24,
              },
              w: {
                type: 'num',
                value: 40,
              },
              h: {
                type: 'num',
                value: 40,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f3c78a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 24,
              },
              h: {
                type: 'num',
                value: 20,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 64,
          },
          baseH: {
            type: 'num',
            value: 64,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'dragao',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2f9e44',
              },
            },
            {
              type: 'canvasFillRect',
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
                value: 48,
              },
              h: {
                type: 'num',
                value: 40,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#b2f2bb',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 24,
              },
              w: {
                type: 'num',
                value: 10,
              },
              h: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e03131',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 40,
              },
              y: {
                type: 'num',
                value: 24,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 64,
          },
          baseH: {
            type: 'num',
            value: 64,
          },
        },
      ],
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 960,
          },
          h: {
            type: 'num',
            value: 640,
          },
          bg: '#1c1330',
          accent: '#fbbf24',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Vila do Dragão',
          },
          text: {
            type: 'str',
            value: 'Setas andam - espaço conversa - derrote o dragão!',
          },
          button: {
            type: 'str',
            value: 'Começar a aventura',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Vila salva!',
          },
          text: {
            type: 'str',
            value: 'O dragão foi derrotado. Você é uma lenda!',
          },
          button: {
            type: 'str',
            value: '',
          },
        },
        {
          type: 'gk:rpgBattleStats',
          hp: {
            type: 'num',
            value: 30,
          },
          str: {
            type: 'num',
            value: 8,
          },
          def: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'gk:rpgSetSpecial',
          name: 'Espada flamejante',
          dmg: {
            type: 'num',
            value: 18,
          },
          cost: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 64,
          },
          h: {
            type: 'num',
            value: 64,
          },
          speed: {
            type: 'num',
            value: 260,
          },
          color: '#4a9eff',
        },
        { type: 'gk:rpgSetStartMap', map: 'vila' },
        {
          type: 'gk:rpgCreateMap',
          map: 'vila',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#5c7f45', grid: false },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#d8c28f' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 128 },
              w: { type: 'num', value: 960 },
              h: { type: 'num', value: 128 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 512 },
              y: { type: 'num', value: 128 },
              w: { type: 'num', value: 128 },
              h: { type: 'num', value: 320 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#7f3f2b' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 64 },
              y: { type: 'num', value: 32 },
              w: { type: 'num', value: 160 },
              h: { type: 'num', value: 96 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#30343b' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 320 },
              y: { type: 'num', value: 64 },
              w: { type: 'num', value: 64 },
              h: { type: 'num', value: 128 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#3c2f2f' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 560 },
              y: { type: 'num', value: 384 },
              w: { type: 'num', value: 96 },
              h: { type: 'num', value: 64 },
            },
            {
              type: 'if',
              cond: { type: 'gk:rpgHasItem', item: 'chave' },
              then: [
                {
                  type: 'canvasFillStyle',
                  ctxVar: 'ctx',
                  color: { type: 'color', value: '#f3c969' },
                },
                {
                  type: 'canvasFillRect',
                  ctxVar: 'ctx',
                  x: { type: 'num', value: 584 },
                  y: { type: 'num', value: 396 },
                  w: { type: 'num', value: 48 },
                  h: { type: 'num', value: 52 },
                },
              ],
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ffffff' } },
            { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'VILA DO DRAGÃO' },
              x: { type: 'num', value: 24 },
              y: { type: 'num', value: 34 },
            },
            { type: 'canvasFont', ctxVar: 'ctx', size: 18, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'FERRARIA' },
              x: { type: 'num', value: 304 },
              y: { type: 'num', value: 56 },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'Ferreiro' },
              x: { type: 'num', value: 430 },
              y: { type: 'num', value: 190 },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'PORTA DA CAVERNA' },
              x: { type: 'num', value: 564 },
              y: { type: 'num', value: 478 },
            },
          ],
        },
        {
          type: 'gk:rpgCreateMap',
          map: 'caverna',
          cols: { type: 'num', value: 12 },
          rows: { type: 'num', value: 8 },
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#17131f', grid: false },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#31283d' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 768 },
              h: { type: 'num', value: 64 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 448 },
              w: { type: 'num', value: 768 },
              h: { type: 'num', value: 64 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#8f3b24' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 256 },
              y: { type: 'num', value: 384 },
              w: { type: 'num', value: 256 },
              h: { type: 'num', value: 32 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#7a263a' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 480 },
              y: { type: 'num', value: 96 },
              w: { type: 'num', value: 112 },
              h: { type: 'num', value: 112 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ffffff' } },
            { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'CAVERNA DO DRAGÃO' },
              x: { type: 'num', value: 24 },
              y: { type: 'num', value: 34 },
            },
            { type: 'canvasFont', ctxVar: 'ctx', size: 18, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'SAÍDA' },
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 310 },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'Dragão' },
              x: { type: 'num', value: 496 },
              y: { type: 'num', value: 88 },
            },
          ],
        },
      ],
      events: [
        {
          type: 'gk:rpgOnEnterMap',
          map: 'vila',
          body: [
            {
              type: 'gk:placeCharacter',
              charVar: 'heroi',
              x: {
                type: 'gk:rpgCell',
                n: {
                  type: 'num',
                  value: 2,
                },
              },
              y: {
                type: 'gk:rpgCell',
                n: {
                  type: 'num',
                  value: 2,
                },
              },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: {
                type: 'num',
                value: 5,
              },
              cy: {
                type: 'num',
                value: 1,
              },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: {
                type: 'num',
                value: 5,
              },
              cy: {
                type: 'num',
                value: 2,
              },
            },
            {
              type: 'gk:rpgCreateNpc',
              name: 'ferreiro',
              cx: {
                type: 'num',
                value: 7,
              },
              cy: {
                type: 'num',
                value: 3,
              },
              image: '',
              look: 'ferreiro',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'gk:rpgHasFlag',
                  flag: 'intro',
                },
              },
              then: [
                {
                  type: 'gk:rpgCutscene',
                  body: [
                    {
                      type: 'gk:rpgNpcWalkTo',
                      npc: 'ferreiro',
                      cx: {
                        type: 'num',
                        value: 3,
                      },
                      cy: {
                        type: 'num',
                        value: 2,
                      },
                    },
                    {
                      type: 'gk:rpgFace',
                      npc: 'ferreiro',
                      dir: 'left',
                    },
                    {
                      type: 'gk:rpgSay',
                      text: {
                        type: 'str',
                        value: 'Ei, viajante! A vila do dragao precisa de voce.',
                      },
                      speaker: {
                        type: 'str',
                        value: 'Ferreiro',
                      },
                    },
                    {
                      type: 'gk:rpgSay',
                      text: {
                        type: 'str',
                        value: 'O dragão roubou o ouro. Tome a chave e entre na caverna ao sul!',
                      },
                      speaker: { type: 'str', value: 'Ferreiro' },
                    },
                    { type: 'gk:rpgAddFlag', flag: 'missao-pronta' },
                    {
                      type: 'gk:rpgGivePotion',
                      name: 'Poção',
                      heal: { type: 'num', value: 20 },
                    },
                  ],
                },
                {
                  type: 'gk:rpgAddFlag',
                  flag: 'intro',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:rpgHasItem',
                item: 'chave',
              },
              then: [
                {
                  type: 'gk:rpgCreateDoor',
                  cx: {
                    type: 'num',
                    value: 9,
                  },
                  cy: {
                    type: 'num',
                    value: 6,
                  },
                  map: 'caverna',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:rpgOnEnterMap',
          map: 'caverna',
          body: [
            {
              type: 'gk:placeCharacter',
              charVar: 'heroi',
              x: {
                type: 'gk:rpgCell',
                n: {
                  type: 'num',
                  value: 1,
                },
              },
              y: {
                type: 'gk:rpgCell',
                n: {
                  type: 'num',
                  value: 5,
                },
              },
            },
            {
              type: 'gk:rpgCreateNpc',
              name: 'dragao',
              cx: {
                type: 'num',
                value: 8,
              },
              cy: {
                type: 'num',
                value: 2,
              },
              image: '',
              look: 'dragao',
            },
            {
              type: 'gk:rpgCreateDoor',
              cx: {
                type: 'num',
                value: 0,
              },
              cy: {
                type: 'num',
                value: 5,
              },
              map: 'vila',
            },
            {
              type: 'gk:rpgOnStep',
              cx: { type: 'num', value: 4 },
              cy: { type: 'num', value: 5 },
              body: [
                {
                  type: 'gk:rpgSay',
                  text: {
                    type: 'str',
                    value: 'Cheiro de enxofre... o dragao esta perto!',
                  },
                  speaker: { type: 'str', value: '' },
                },
              ],
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'ferreiro',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:rpgHasFlag',
                flag: 'aceitou-missao',
              },
              then: [
                {
                  type: 'gk:rpgSay',
                  text: {
                    type: 'str',
                    value: 'A caverna fica no canto de baixo. Boa sorte!',
                  },
                  speaker: {
                    type: 'str',
                    value: 'Ferreiro',
                  },
                },
              ],
              else: [
                {
                  type: 'gk:rpgSay',
                  text: {
                    type: 'str',
                    value: 'O dragão roubou o ouro da vila!',
                  },
                  speaker: {
                    type: 'str',
                    value: 'Ferreiro',
                  },
                },
                {
                  type: 'gk:rpgSay',
                  text: {
                    type: 'str',
                    value: 'Tome a chave da caverna e esta poção. Só você pode nos salvar!',
                  },
                  speaker: {
                    type: 'str',
                    value: 'Ferreiro',
                  },
                },
                {
                  type: 'gk:rpgGiveItem',
                  item: 'chave',
                  image: '',
                },
                {
                  type: 'gk:rpgGivePotion',
                  name: 'Poção',
                  heal: {
                    type: 'num',
                    value: 20,
                  },
                },
                {
                  type: 'gk:rpgAddFlag',
                  flag: 'aceitou-missao',
                },
                {
                  type: 'gk:rpgCreateDoor',
                  cx: {
                    type: 'num',
                    value: 9,
                  },
                  cy: {
                    type: 'num',
                    value: 6,
                  },
                  map: 'caverna',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'dragao',
          body: [
            {
              type: 'gk:rpgBattleStart',
              name: 'Dragão',
              hp: {
                type: 'num',
                value: 40,
              },
              str: {
                type: 'num',
                value: 6,
              },
              def: {
                type: 'num',
                value: 3,
              },
            },
          ],
        },
        {
          type: 'gk:rpgOnBattleEnd',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:rpgBattleWon',
              },
              then: [
                {
                  type: 'gk:rpgBattleReward',
                  xp: {
                    type: 'num',
                    value: 25,
                  },
                },
                {
                  type: 'gk:setState',
                  name: 'vitoria',
                },
              ],
              else: [
                {
                  type: 'gk:endGame',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: { type: 'gk:rpgHasFlag', flag: 'missao-pronta' },
                right: {
                  type: 'logicalNot',
                  value: { type: 'gk:rpgHasItem', item: 'chave' },
                },
              },
              then: [
                { type: 'gk:rpgGiveItem', item: 'chave', image: '' },
                { type: 'gk:rpgAddFlag', flag: 'aceitou-missao' },
                {
                  type: 'gk:rpgCreateDoor',
                  cx: { type: 'num', value: 9 },
                  cy: { type: 'num', value: 6 },
                  map: 'caverna',
                },
              ],
            },
            {
              type: 'gk:rpgMoveGrid',
              charVar: 'heroi',
              cell: {
                type: 'num',
                value: 64,
              },
              dtVar: 'dt',
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:rpgDrawNpcs',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'heroi',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#161923' } },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 14 },
              y: { type: 'num', value: 500 },
              w: { type: 'num', value: 610 },
              h: { type: 'num', value: 124 },
            },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ffffff' } },
            { type: 'canvasFont', ctxVar: 'ctx', size: 19, family: 'sans-serif' },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: { type: 'gk:rpgCurrentMap' },
                right: { type: 'str', value: 'vila' },
              },
              then: [
                {
                  type: 'if',
                  cond: { type: 'gk:rpgHasFlag', flag: 'aceitou-missao' },
                  then: [
                    {
                      type: 'canvasFillText',
                      ctxVar: 'ctx',
                      text: { type: 'str', value: 'Objetivo: entre na caverna' },
                      x: { type: 'num', value: 32 },
                      y: { type: 'num', value: 536 },
                    },
                    {
                      type: 'canvasFillText',
                      ctxVar: 'ctx',
                      text: {
                        type: 'str',
                        value: 'Siga o caminho até a porta no canto inferior direito.',
                      },
                      x: { type: 'num', value: 32 },
                      y: { type: 'num', value: 566 },
                    },
                  ],
                  else: [
                    {
                      type: 'canvasFillText',
                      ctxVar: 'ctx',
                      text: { type: 'str', value: 'Objetivo: ouça o Ferreiro' },
                      x: { type: 'num', value: 32 },
                      y: { type: 'num', value: 536 },
                    },
                    {
                      type: 'canvasFillText',
                      ctxVar: 'ctx',
                      text: { type: 'str', value: 'Ele está vindo falar com você.' },
                      x: { type: 'num', value: 32 },
                      y: { type: 'num', value: 566 },
                    },
                  ],
                },
              ],
              else: [
                {
                  type: 'canvasFillText',
                  ctxVar: 'ctx',
                  text: { type: 'str', value: 'Objetivo: enfrente o Dragão' },
                  x: { type: 'num', value: 32 },
                  y: { type: 'num', value: 536 },
                },
                {
                  type: 'canvasFillText',
                  ctxVar: 'ctx',
                  text: { type: 'str', value: 'ESPAÇO: enfrentar o Dragão' },
                  x: { type: 'num', value: 32 },
                  y: { type: 'num', value: 566 },
                },
              ],
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: { type: 'str', value: 'Mover: setas/WASD  •  Interagir: ESPAÇO' },
              x: { type: 'num', value: 32 },
              y: { type: 'num', value: 602 },
            },
            {
              type: 'gk:rpgDrawInventory',
              x: {
                type: 'num',
                value: 650,
              },
              y: {
                type: 'num',
                value: 540,
              },
            },
          ],
        },
      ],
    },
  },
}
