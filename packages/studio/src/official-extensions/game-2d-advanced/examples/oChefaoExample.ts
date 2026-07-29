import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "O Chefao" 👑 (R30): a vitrine dos CHEFES. Um RPG de exploracao curtinho
 * (grade + NPC) onde o Dragao e um add_boss (maior, barra proeminente) que USA os
 * golpes ensinados a ele e, via rpgOnFoeTurn + battlerLife, muda de fase ao chegar
 * na metade da vida (rpgFoeHitAll no time). IR do parser (one-off), asset-free.
 */
export const oChefaoExample: ExtensionExample = {
  name: 'O Chefao',
  experience: 'game',
  description:
    'Um RPG de exploracao com CHEFAO: fale com o Guardiao e enfrente o Dragao. O chefe usa os golpes ensinados a ele e, quando cai para metade da vida, VIRA FERA e acerta todo o seu time. Prova o inimigo usando golpes + as fases do chefe.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
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
            value: 640,
          },
          bg: '#1a1420',
          accent: '#ff8c42',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'O Chefao',
          },
          text: {
            type: 'str',
            value:
              'Fale com o Guardiao (espaco) e enfrente o Dragao! Quando ele fica com metade da vida, vira fera.',
          },
          button: {
            type: 'str',
            value: 'Comecar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Voce venceu o Dragao!',
          },
          text: {
            type: 'str',
            value: 'O reino esta salvo.',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 48,
          },
          h: {
            type: 'num',
            value: 48,
          },
          speed: {
            type: 'num',
            value: 320,
          },
          color: '#4a9eff',
        },
        {
          type: 'gk:rpgBattleStats',
          hp: {
            type: 'num',
            value: 80,
          },
          str: {
            type: 'num',
            value: 14,
          },
          def: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Voce',
          move: 'Investida',
          dmg: {
            type: 'num',
            value: 20,
          },
          cost: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'gk:rpgTeachHeal',
          who: 'Voce',
          move: 'Curar',
          amount: {
            type: 'num',
            value: 22,
          },
          cost: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Dragao',
          move: 'Garra',
          dmg: {
            type: 'num',
            value: 16,
          },
          cost: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Dragao',
          move: 'Baforada',
          dmg: {
            type: 'num',
            value: 30,
          },
          cost: {
            type: 'num',
            value: 0,
          },
        },
        { type: 'gk:rpgSetStartMap', map: 'caverna' },
        {
          type: 'gk:rpgCreateMap',
          map: 'caverna',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#241a2e', grid: true }],
        },
      ],
      events: [
        {
          type: 'gk:rpgOnFoeTurn',
          name: 'Dragao',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'gk:battlerLife',
                  name: 'Dragao',
                },
                right: {
                  type: 'binop',
                  op: '/',
                  left: {
                    type: 'gk:battlerMaxLife',
                    name: 'Dragao',
                  },
                  right: {
                    type: 'num',
                    value: 2,
                  },
                },
              },
              then: [
                {
                  type: 'gk:rpgFoeHitAll',
                  name: 'Dragao',
                  dmg: {
                    type: 'num',
                    value: 22,
                  },
                },
              ],
              else: [
                {
                  type: 'gk:rpgFoeUse',
                  name: 'Dragao',
                  move: 'Garra',
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
              type: 'gk:rpgCreateNpc',
              name: 'Guardiao',
              cx: {
                type: 'num',
                value: 4,
              },
              cy: {
                type: 'num',
                value: 3,
              },
              image: '',
              look: '',
            },
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
                  value: 3,
                },
              },
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'Guardiao',
          body: [
            {
              type: 'gk:rpgSay',
              text: {
                type: 'str',
                value: 'O Dragao acordou! Enfrente-o, heroi!',
              },
              speaker: {
                type: 'str',
                value: 'Guardiao',
              },
            },
            {
              type: 'gk:rpgAddBoss',
              name: 'Dragao',
              hp: {
                type: 'num',
                value: 160,
              },
              str: {
                type: 'num',
                value: 9,
              },
              def: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'gk:rpgBattleStart',
              name: 'Lacaio',
              hp: {
                type: 'num',
                value: 24,
              },
              str: {
                type: 'num',
                value: 5,
              },
              def: {
                type: 'num',
                value: 0,
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
                    value: 40,
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
      ],
    },
  },
}
