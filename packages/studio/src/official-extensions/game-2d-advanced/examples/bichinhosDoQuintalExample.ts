import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Bichinhos do Quintal" — o 👾 Kit Monstrinhos inteiro SEM um
 * único asset (as 5 criaturas são `defineLook` vetorial). Prova a tese do kit: o
 * MUNDO é o Kit RPG (grade, NPCs, fala, menu de escolha, mapa) e só a BATALHA é
 * nova. A criança encosta em todo conceito do gênero em ~10 minutos:
 *   · o TIPO importa — Brasa arrasa a Folhinha (×2) e mal arranha a Gotinha, e
 *     foi ELA quem escreveu essa regra (3 blocos de tabela);
 *   · enfraquecer antes — a bola com a vida cheia é 3× mais difícil;
 *   · trocar é estratégia — Gotinha selvagem × Fogoso → o botão Trocar aparece;
 *   · risco × segurança — Labareda 32/75% contra Brasa 20/90%;
 *   · progressão — vitórias → nível 8 → "Fogoso está evoluindo!".
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o mesmo código
 * vive no drift test `examples.test.ts` — se o parser mudar a saída, o teste manda
 * re-embutir aqui).
 */
export const bichinhosDoQuintalExample: ExtensionExample = {
  name: 'Bichinhos do Quintal',
  experience: 'game',
  description:
    'Pegue e treine bichinhos! Ande no mato, encontre criaturas selvagens, batalhe por turnos e jogue a bola para capturar. Você inventa os bichos, os golpes e a regra de quem vence quem — pegue 3 e ganhe!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 960,
          },
          h: {
            type: 'num',
            value: 540,
          },
          bg: '#2d5a2d',
          accent: '#e6398b',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Bichinhos do Quintal',
          },
          text: {
            type: 'str',
            value: 'Setas para andar - espaço para falar - pegue 3 bichinhos!',
          },
          button: {
            type: 'str',
            value: 'Jogar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Você conseguiu!',
          },
          text: {
            type: 'str',
            value: 'Pegou 3 bichinhos do quintal!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:defineLook',
          name: 'fogoso',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e05a2b',
              },
            },
            {
              type: 'canvasBeginPath',
              ctxVar: 'ctx',
            },
            {
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'ctx',
              },
              method: 'arc',
              args: [
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 18,
                },
                {
                  type: 'num',
                  value: 0,
                },
                {
                  type: 'num',
                  value: 6.28,
                },
              ],
            },
            {
              type: 'canvasFill',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffffff',
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
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 23,
              },
              y: {
                type: 'num',
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 40,
          },
          baseH: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'folhinha',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#3f9d3f',
              },
            },
            {
              type: 'canvasBeginPath',
              ctxVar: 'ctx',
            },
            {
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'ctx',
              },
              method: 'arc',
              args: [
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 18,
                },
                {
                  type: 'num',
                  value: 0,
                },
                {
                  type: 'num',
                  value: 6.28,
                },
              ],
            },
            {
              type: 'canvasFill',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffffff',
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
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 23,
              },
              y: {
                type: 'num',
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 40,
          },
          baseH: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'gotinha',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2b7de0',
              },
            },
            {
              type: 'canvasBeginPath',
              ctxVar: 'ctx',
            },
            {
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'ctx',
              },
              method: 'arc',
              args: [
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 20,
                },
                {
                  type: 'num',
                  value: 18,
                },
                {
                  type: 'num',
                  value: 0,
                },
                {
                  type: 'num',
                  value: 6.28,
                },
              ],
            },
            {
              type: 'canvasFill',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffffff',
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
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 23,
              },
              y: {
                type: 'num',
                value: 14,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 40,
          },
          baseH: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'fogozao',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#b03010',
              },
            },
            {
              type: 'canvasBeginPath',
              ctxVar: 'ctx',
            },
            {
              type: 'memberCall',
              object: {
                type: 'var',
                name: 'ctx',
              },
              method: 'arc',
              args: [
                {
                  type: 'num',
                  value: 24,
                },
                {
                  type: 'num',
                  value: 24,
                },
                {
                  type: 'num',
                  value: 23,
                },
                {
                  type: 'num',
                  value: 0,
                },
                {
                  type: 'num',
                  value: 6.28,
                },
              ],
            },
            {
              type: 'canvasFill',
              ctxVar: 'ctx',
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffcc00',
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
                value: 0,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 10,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 48,
          },
          baseH: {
            type: 'num',
            value: 48,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2b6cb0',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 28,
              },
              h: {
                type: 'num',
                value: 32,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffd9a0',
              },
            },
            {
              type: 'canvasFillRect',
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
                value: 20,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 40,
          },
          baseH: {
            type: 'num',
            value: 48,
          },
        },
        {
          type: 'gk:pkmCreature',
          name: 'Fogoso',
          creatureType: 'fogo',
          hp: {
            type: 'num',
            value: 30,
          },
          str: {
            type: 'num',
            value: 9,
          },
          def: {
            type: 'num',
            value: 4,
          },
          spd: {
            type: 'num',
            value: 7,
          },
          image: '',
          look: 'fogoso',
        },
        {
          type: 'gk:pkmCreature',
          name: 'Folhinha',
          creatureType: 'planta',
          hp: {
            type: 'num',
            value: 34,
          },
          str: {
            type: 'num',
            value: 7,
          },
          def: {
            type: 'num',
            value: 6,
          },
          spd: {
            type: 'num',
            value: 4,
          },
          image: '',
          look: 'folhinha',
        },
        {
          type: 'gk:pkmCreature',
          name: 'Gotinha',
          creatureType: 'agua',
          hp: {
            type: 'num',
            value: 32,
          },
          str: {
            type: 'num',
            value: 8,
          },
          def: {
            type: 'num',
            value: 5,
          },
          spd: {
            type: 'num',
            value: 6,
          },
          image: '',
          look: 'gotinha',
        },
        {
          type: 'gk:pkmCreature',
          name: 'Fogozao',
          creatureType: 'fogo',
          hp: {
            type: 'num',
            value: 45,
          },
          str: {
            type: 'num',
            value: 13,
          },
          def: {
            type: 'num',
            value: 7,
          },
          spd: {
            type: 'num',
            value: 8,
          },
          image: '',
          look: 'fogozao',
        },
        {
          type: 'gk:pkmMove',
          move: 'Brasa',
          creature: 'Fogoso',
          moveType: 'fogo',
          dmg: {
            type: 'num',
            value: 20,
          },
          acc: {
            type: 'num',
            value: 90,
          },
          fx: 'bola',
          color: '#ff8800',
        },
        {
          type: 'gk:pkmMove',
          move: 'Investida',
          creature: 'Fogoso',
          moveType: 'normal',
          dmg: {
            type: 'num',
            value: 12,
          },
          acc: {
            type: 'num',
            value: 100,
          },
          fx: 'investida',
          color: '#999999',
        },
        {
          type: 'gk:pkmMove',
          move: 'Chicote',
          creature: 'Folhinha',
          moveType: 'planta',
          dmg: {
            type: 'num',
            value: 18,
          },
          acc: {
            type: 'num',
            value: 95,
          },
          fx: 'onda',
          color: '#3f9d3f',
        },
        {
          type: 'gk:pkmMove',
          move: 'Jato',
          creature: 'Gotinha',
          moveType: 'agua',
          dmg: {
            type: 'num',
            value: 18,
          },
          acc: {
            type: 'num',
            value: 95,
          },
          fx: 'bola',
          color: '#2b7de0',
        },
        {
          type: 'gk:pkmMove',
          move: 'Labareda',
          creature: 'Fogozao',
          moveType: 'fogo',
          dmg: {
            type: 'num',
            value: 32,
          },
          acc: {
            type: 'num',
            value: 75,
          },
          fx: 'raio',
          color: '#ff4400',
        },
        {
          type: 'gk:pkmTypeChart',
          atk: 'fogo',
          def: 'planta',
          mult: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'gk:pkmTypeChart',
          atk: 'planta',
          def: 'agua',
          mult: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'gk:pkmTypeChart',
          atk: 'agua',
          def: 'fogo',
          mult: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'gk:pkmEvolve',
          from: 'Fogoso',
          to: 'Fogozao',
          level: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'gk:pkmCatchDifficulty',
          creature: 'Gotinha',
          level: 'difícil',
        },
        {
          type: 'gk:pkmEncounterRate',
          percent: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 48,
          },
          speed: {
            type: 'num',
            value: 200,
          },
          color: '#2b6cb0',
        },
        { type: 'gk:rpgSetStartMap', map: 'quintal' },
        {
          type: 'gk:rpgCreateMap',
          map: 'quintal',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 12 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#2d5a2d', grid: false }],
        },
      ],
      events: [
        {
          type: 'gk:rpgOnEnterMap',
          map: 'quintal',
          body: [
            {
              type: 'gk:rpgCreateNpc',
              name: 'Cora',
              cx: {
                type: 'num',
                value: 3,
              },
              cy: {
                type: 'num',
                value: 3,
              },
              image: '',
              look: 'heroi',
            },
            {
              type: 'gk:rpgCreateNpc',
              name: 'Enfermeira',
              cx: {
                type: 'num',
                value: 12,
              },
              cy: {
                type: 'num',
                value: 3,
              },
              image: '',
              look: 'heroi',
            },
            {
              type: 'gk:pkmGrassCells',
              x1: {
                type: 'num',
                value: 5,
              },
              y1: {
                type: 'num',
                value: 6,
              },
              x2: {
                type: 'num',
                value: 13,
              },
              y2: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'gk:pkmWild',
              creature: 'Folhinha',
              min: {
                type: 'num',
                value: 3,
              },
              max: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'gk:pkmWild',
              creature: 'Gotinha',
              min: {
                type: 'num',
                value: 3,
              },
              max: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'gk:placeCharacter',
              charVar: 'heroi',
              x: {
                type: 'num',
                value: 128,
              },
              y: {
                type: 'num',
                value: 128,
              },
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'Cora',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:rpgHasFlag',
                flag: 'ganhou-inicial',
              },
              then: [
                {
                  type: 'gk:rpgMenu',
                  title: {
                    type: 'str',
                    value: 'Quer mais bolas?',
                  },
                  body: [
                    {
                      type: 'gk:rpgOption',
                      label: {
                        type: 'str',
                        value: 'Sim',
                      },
                      body: [
                        {
                          type: 'gk:pkmGiveBall',
                          count: {
                            type: 'num',
                            value: 3,
                          },
                          power: {
                            type: 'num',
                            value: 60,
                          },
                        },
                      ],
                    },
                    {
                      type: 'gk:rpgOption',
                      label: {
                        type: 'str',
                        value: 'Não',
                      },
                      body: [],
                    },
                  ],
                },
              ],
              else: [
                {
                  type: 'gk:rpgSay',
                  text: {
                    type: 'str',
                    value: 'Leve o Fogoso e 5 bolas! Pegue 3 bichinhos no quintal!',
                  },
                  speaker: {
                    type: 'str',
                    value: 'Cora',
                  },
                },
                {
                  type: 'gk:pkmGive',
                  creature: 'Fogoso',
                  level: {
                    type: 'num',
                    value: 5,
                  },
                },
                {
                  type: 'gk:pkmGiveBall',
                  count: {
                    type: 'num',
                    value: 5,
                  },
                  power: {
                    type: 'num',
                    value: 60,
                  },
                },
                {
                  type: 'gk:rpgAddFlag',
                  flag: 'ganhou-inicial',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'Enfermeira',
          body: [
            {
              type: 'gk:rpgSay',
              text: {
                type: 'str',
                value: 'Deixe comigo!',
              },
              speaker: {
                type: 'str',
                value: 'Enfermeira',
              },
            },
            {
              type: 'gk:pkmHealTeam',
            },
          ],
        },
        {
          type: 'gk:rpgOnBattleEnd',
          body: [
            {
              type: 'if',
              cond: {
                type: 'gk:pkmCaught',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'gk:pkmTeamSize',
                    },
                    right: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setState',
                      name: 'vitoria',
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
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
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
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#4a8c4a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 320,
              },
              y: {
                type: 'num',
                value: 384,
              },
              w: {
                type: 'num',
                value: 576,
              },
              h: {
                type: 'num',
                value: 320,
              },
            },
            {
              type: 'gk:drawByDepth',
              charVar: 'heroi',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:pkmDrawTeam',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 10,
              },
            },
          ],
        },
      ],
    },
  },
}
