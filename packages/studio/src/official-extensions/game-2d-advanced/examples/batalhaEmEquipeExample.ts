import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Batalha em Equipe" (⚔️ batalha em equipe): a IR embutida foi GERADA
 * pelo parser real a partir do SOURCE do teste (one-off). Fale com o Capitão para
 * abrir a batalha em EQUIPE no canvas — herói + Curandeira contra dois bandidos —
 * com clique/seleção, painel de info e painel de ação (golpes nomeados).
 */
export const batalhaEmEquipeExample: ExtensionExample = {
  name: 'Batalha em Equipe',
  experience: 'game',
  description:
    'Uma batalha por turnos EM EQUIPE: fale com o Capitão (espaço) e enfrente dois bandidos com o seu time (herói + Curandeira, que tem um golpe de CURA). Clique em qualquer personagem para ver a ficha dele (vida, energia, força, defesa, golpes) e destacar quem está selecionado; no seu turno, escolha o golpe no painel de ação e clique no inimigo que quer acertar. Abra e edite à vontade.',
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
          w: { type: 'num', value: 960 },
          h: { type: 'num', value: 640 },
          bg: '#20263f',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Batalha em Equipe' },
          text: {
            type: 'str',
            value:
              'Fale com o Capitao (espaco) e enfrente os bandidos com o seu time! Clique nos personagens para ver a ficha de cada um.',
          },
          button: { type: 'str', value: 'Comecar' },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: { type: 'num', value: 48 },
          h: { type: 'num', value: 48 },
          speed: { type: 'num', value: 320 },
          color: '#4a9eff',
        },
        {
          type: 'gk:rpgBattleStats',
          hp: { type: 'num', value: 60 },
          str: { type: 'num', value: 12 },
          def: { type: 'num', value: 4 },
        },
        {
          type: 'gk:rpgSetSpecial',
          name: 'Golpe Giratorio',
          dmg: { type: 'num', value: 22 },
          cost: { type: 'num', value: 5 },
        },
        {
          type: 'gk:rpgAddAlly',
          name: 'Curandeira',
          hp: { type: 'num', value: 40 },
          str: { type: 'num', value: 8 },
          def: { type: 'num', value: 2 },
          color: '#22c55e',
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Voce',
          move: 'Espadada Dupla',
          dmg: { type: 'num', value: 16 },
          cost: { type: 'num', value: 3 },
        },
        {
          type: 'gk:rpgTeachMove',
          who: 'Curandeira',
          move: 'Flechada',
          dmg: { type: 'num', value: 14 },
          cost: { type: 'num', value: 2 },
        },
        {
          type: 'gk:rpgTeachHeal',
          who: 'Curandeira',
          move: 'Curar',
          amount: { type: 'num', value: 18 },
          cost: { type: 'num', value: 3 },
        },
        { type: 'gk:rpgGivePotion', name: 'Pocao', heal: { type: 'num', value: 25 } },
        { type: 'gk:rpgSetStartMap', map: 'praca' },
        {
          type: 'gk:rpgCreateMap',
          map: 'praca',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#2d3a2d', grid: true }],
        },
      ],
      events: [
        {
          type: 'gk:rpgOnEnterMap',
          map: 'praca',
          body: [
            {
              type: 'gk:rpgCreateNpc',
              name: 'Capitao',
              cx: { type: 'num', value: 4 },
              cy: { type: 'num', value: 3 },
              image: '',
              look: '',
            },
            {
              type: 'gk:placeCharacter',
              charVar: 'heroi',
              x: { type: 'gk:rpgCell', n: { type: 'num', value: 2 } },
              y: { type: 'gk:rpgCell', n: { type: 'num', value: 3 } },
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'Capitao',
          body: [
            {
              type: 'gk:rpgSay',
              text: { type: 'str', value: 'Os bandidos chegaram! Vamos juntos!' },
              speaker: { type: 'str', value: 'Capitao' },
            },
            {
              type: 'gk:rpgAddFoe',
              name: 'Bandido',
              hp: { type: 'num', value: 26 },
              str: { type: 'num', value: 7 },
              def: { type: 'num', value: 1 },
              color: '#ef4444',
            },
            {
              type: 'gk:rpgBattleStart',
              name: 'Chefe Bandido',
              hp: { type: 'num', value: 40 },
              str: { type: 'num', value: 9 },
              def: { type: 'num', value: 2 },
            },
          ],
        },
        {
          type: 'gk:rpgOnBattleEnd',
          body: [
            {
              type: 'if',
              cond: { type: 'gk:rpgBattleWon' },
              then: [
                { type: 'gk:rpgBattleReward', xp: { type: 'num', value: 25 } },
                { type: 'gk:setState', name: 'vitoria' },
              ],
              else: [{ type: 'gk:endGame' }],
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
              cell: { type: 'num', value: 64 },
              dtVar: 'dt',
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [{ type: 'gk:rpgDrawNpcs' }, { type: 'gk:drawCharacter', charVar: 'heroi' }],
        },
      ],
    },
  },
}
