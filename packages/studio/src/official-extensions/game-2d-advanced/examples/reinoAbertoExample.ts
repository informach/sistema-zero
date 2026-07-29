import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Reino Aberto" (🌍 mundo aberto — R27): a IR embutida foi GERADA pelo
 * parser real a partir do SOURCE do teste (one-off). Mostra os DOIS jeitos de
 * mundo aberto: 4 mapas ligados pelas bordas (estilo Zelda, 2×2) e a vila MAIOR
 * que a tela com a câmera clampando pelo tamanho declarado em "Criar o mapa".
 */
export const reinoAbertoExample: ExtensionExample = {
  name: 'Reino Aberto',
  experience: 'exploration',
  description:
    'Um reino de 4 mapas ligados pelas BORDAS (estilo Zelda): ande até a pontinha do campo e entre na praia, no bosque e na vila — que é MAIOR que a tela, com a câmera te seguindo presa nas bordas do mapa. Converse com o pescador e a prefeita (espaço), e repare o nome do mapa no placar. Abra e edite à vontade.',
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
          bg: '#1c2b1c',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Reino Aberto' },
          text: {
            type: 'str',
            value: 'Setas ou WASD andam - espaço conversa - explore os 4 cantos do reino!',
          },
          button: { type: 'str', value: 'Explorar' },
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
        { type: 'gk:rpgSetStartMap', map: 'campo' },
        {
          type: 'gk:rpgCreateMap',
          map: 'campo',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#2d5a2d', grid: true }],
        },
        {
          type: 'gk:rpgCreateMap',
          map: 'praia',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#2b4a63', grid: true }],
        },
        {
          type: 'gk:rpgCreateMap',
          map: 'bosque',
          cols: { type: 'num', value: 15 },
          rows: { type: 'num', value: 10 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#173317', grid: true }],
        },
        {
          type: 'gk:rpgCreateMap',
          map: 'vila',
          cols: { type: 'num', value: 30 },
          rows: { type: 'num', value: 20 },
          ctxName: 'ctx',
          body: [{ type: 'gk:drawBackground', color: '#4a3c2b', grid: true }],
        },
        {
          type: 'gk:cameraFollow',
          charVar: 'heroi',
          w: { type: 'num', value: 960 },
          h: { type: 'num', value: 640 },
        },
      ],
      events: [
        {
          type: 'gk:rpgOnEnterMap',
          map: 'campo',
          body: [
            { type: 'gk:rpgConnectEdge', side: 'leste', map: 'praia' },
            { type: 'gk:rpgConnectEdge', side: 'sul', map: 'bosque' },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 5 },
              cy: { type: 'num', value: 4 },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 6 },
              cy: { type: 'num', value: 4 },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 9 },
              cy: { type: 'num', value: 6 },
            },
            {
              type: 'gk:placeCharacter',
              charVar: 'heroi',
              x: { type: 'gk:rpgCell', n: { type: 'num', value: 2 } },
              y: { type: 'gk:rpgCell', n: { type: 'num', value: 2 } },
            },
          ],
        },
        {
          type: 'gk:rpgOnEnterMap',
          map: 'praia',
          body: [
            { type: 'gk:rpgConnectEdge', side: 'oeste', map: 'campo' },
            { type: 'gk:rpgConnectEdge', side: 'sul', map: 'vila' },
            {
              type: 'gk:rpgCreateNpc',
              name: 'pescador',
              cx: { type: 'num', value: 7 },
              cy: { type: 'num', value: 3 },
              image: '',
              look: '',
            },
          ],
        },
        {
          type: 'gk:rpgOnEnterMap',
          map: 'bosque',
          body: [
            { type: 'gk:rpgConnectEdge', side: 'norte', map: 'campo' },
            { type: 'gk:rpgConnectEdge', side: 'leste', map: 'vila' },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 4 },
              cy: { type: 'num', value: 4 },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 4 },
              cy: { type: 'num', value: 5 },
            },
            {
              type: 'gk:rpgBlockCell',
              cx: { type: 'num', value: 10 },
              cy: { type: 'num', value: 3 },
            },
          ],
        },
        {
          type: 'gk:rpgOnEnterMap',
          map: 'vila',
          body: [
            { type: 'gk:rpgConnectEdge', side: 'norte', map: 'praia' },
            { type: 'gk:rpgConnectEdge', side: 'oeste', map: 'bosque' },
            {
              type: 'gk:rpgCreateNpc',
              name: 'prefeita',
              cx: { type: 'num', value: 20 },
              cy: { type: 'num', value: 12 },
              image: '',
              look: '',
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'pescador',
          body: [
            {
              type: 'gk:rpgSay',
              text: { type: 'str', value: 'O mar termina aqui, mas o reino continua pro sul!' },
              speaker: { type: 'str', value: 'Pescador' },
            },
          ],
        },
        {
          type: 'gk:rpgOnTalk',
          npc: 'prefeita',
          body: [
            {
              type: 'gk:rpgSay',
              text: {
                type: 'str',
                value: 'Bem-vindo à vila GRANDE — repare a câmera te seguindo!',
              },
              speaker: { type: 'str', value: 'Prefeita' },
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
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ffffff' } },
            { type: 'canvasFont', ctxVar: 'ctx', size: 22, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Mapa: ' },
                right: { type: 'gk:rpgCurrentMap' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 36 },
            },
          ],
        },
      ],
    },
  },
}
