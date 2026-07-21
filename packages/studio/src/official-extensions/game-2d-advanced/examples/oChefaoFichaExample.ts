import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "O Chefao da Ficha" 👑 (full review): a vitrine da FICHA reutilizavel + a
 * IMAGEM no combatente + o FUNDO de tela. O Dragao e uma "Criar a ficha do inimigo"
 * (chefao) com um sprite pequeno do Pinta EMBUTIDO (asset "dragao") que RENDERIZA na
 * batalha; o menu e a vitoria tem fundo colorido (setScreenBg); a batalha comeca ao
 * falar com o Guardiao. Prova ficha + imagem + fundo num jogo so. IR do parser (one-off).
 */
export const oChefaoFichaExample: ExtensionExample = {
  name: 'O Chefao da Ficha',
  experience: 'game',
  description:
    'Um RPG curtinho com CHEFAO montado por FICHA: crie o Dragao uma vez (com sprite e atributos), escolha lutar contra ele, e de a SUA cara as telas com um fundo colorido. Fale com o Guardiao para a batalha comecar.',
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
            value: 480,
          },
          h: {
            type: 'num',
            value: 320,
          },
          bg: '#0f1020',
          accent: '#ffcc44',
        },
        {
          type: 'gk:setScreenBg',
          screen: 'menu',
          color: '#241033',
          image: '',
        },
        {
          type: 'gk:setScreenBg',
          screen: 'vitoria',
          color: '#0a2a14',
          image: '',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'O Chefão da Ficha',
          },
          text: {
            type: 'str',
            value: 'Fale com o Guardião (espaço) e enfrente o Dragão!',
          },
          button: {
            type: 'str',
            value: 'Começar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Você venceu o Dragão!',
          },
          text: {
            type: 'str',
            value: 'O reino está salvo.',
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
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
          },
          speed: {
            type: 'num',
            value: 300,
          },
          color: '#4a9eff',
        },
        {
          type: 'gk:rpgBattleStats',
          hp: {
            type: 'num',
            value: 60,
          },
          str: {
            type: 'num',
            value: 12,
          },
          def: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'gk:rpgSetSpecial',
          name: 'Investida',
          dmg: {
            type: 'num',
            value: 20,
          },
          cost: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'gk:rpgGivePotion',
          name: 'Poção',
          heal: {
            type: 'num',
            value: 25,
          },
        },
        {
          type: 'gk:rpgDefineBattler',
          name: 'Dragão',
          hp: {
            type: 'num',
            value: 120,
          },
          str: {
            type: 'num',
            value: 9,
          },
          def: {
            type: 'num',
            value: 2,
          },
          image: 'dragao',
          color: '#b23b6e',
          boss: true,
        },
        {
          type: 'gk:rpgDefineBattler',
          name: 'Capanga',
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
          image: '',
          color: '#e05a5a',
          boss: false,
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Dragão',
          move: 'Baforada',
          dmg: {
            type: 'num',
            value: 26,
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
          name: 'Dragão',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'gk:battlerLife',
                  name: 'Dragão',
                },
                right: {
                  type: 'binop',
                  op: '/',
                  left: {
                    type: 'gk:battlerMaxLife',
                    name: 'Dragão',
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
                  name: 'Dragão',
                  dmg: {
                    type: 'num',
                    value: 16,
                  },
                },
              ],
              else: [
                {
                  type: 'gk:rpgFoeUse',
                  name: 'Dragão',
                  move: 'Baforada',
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
              name: 'Guardião',
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
          npc: 'Guardião',
          body: [
            {
              type: 'gk:rpgSay',
              text: {
                type: 'str',
                value: 'O Dragão acordou! Enfrente-o!',
              },
              speaker: {
                type: 'str',
                value: 'Guardião',
              },
            },
            {
              type: 'gk:rpgAddFoeNamed',
              name: 'Capanga',
            },
            {
              type: 'gk:rpgHealHero',
            },
            {
              type: 'gk:rpgBattleNamed',
              name: 'Dragão',
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
  assets: [
    {
      id: 'gk-chefao-ficha-dragao',
      name: 'dragao',
      kind: 'image',
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXElEQVR42mNgoAWQCtL4jw0Tq/l/2JkCrJiQISiap31YhYKJMgRmAAzANCHziTXgv4SEBIoBMD5RBuDD9DKg4P89Ly8UTB8XUJoOqJuQkBXjEqe2AagZiVhxigEAziwWOvbfbdoAAAAASUVORK5CYII=',
      width: 16,
      height: 16,
      source: 'library',
      libId: 'gk:chefao-ficha-dragao',
    },
  ],
}
