import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Caça-moedas profissional" — o paradigma do kit inteiro num
 * mini-jogo que roda SEM assets (personagens = retângulos coloridos): telas
 * (pronta personalizada + custom com botão), estados (fixos + 'venceu'
 * inventado), gancho de reinício, mecânica com dt no onUpdate e desenho com
 * blocos de Canvas do núcleo no onDraw (o pincel `ctx` do gancho).
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o mesmo
 * código vive no drift test `examples.test.ts` — se o parser mudar a saída, o
 * teste manda re-embutir aqui).
 */
export const cacaMoedasExample: ExtensionExample = {
  name: 'Caça-moedas profissional',
  experience: 'game',
  description:
    'A base de jogo profissional em ação: menu, pausa (Esc), estados, tela de vitória com botão, e a mecânica escrita com blocos — pegue 5 moedas!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'gk:setup',
          w: { type: 'num', value: 960 },
          h: { type: 'num', value: 540 },
          bg: '#1a1a2e',
          accent: '#4a9eff',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Caça-moedas' },
          text: { type: 'str', value: 'WASD ou setas para andar - Esc pausa' },
          button: { type: 'str', value: 'Jogar' },
        },
        {
          type: 'gk:createScreen',
          name: 'vitoria',
          title: { type: 'str', value: 'Você venceu!' },
          text: { type: 'str', value: 'Pegou as 5 moedas!' },
        },
        {
          type: 'gk:addButton',
          screen: 'vitoria',
          label: { type: 'str', value: 'Jogar de novo' },
          body: [{ type: 'gk:restartGame' }],
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
          type: 'gk:createCharacter',
          varName: 'moeda',
          image: '',
          w: { type: 'num', value: 28 },
          h: { type: 'num', value: 28 },
          speed: { type: 'num', value: 0 },
          color: '#fbbf24',
        },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'assign', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'gk:resetCharacter', charVar: 'heroi' },
        {
          type: 'gk:placeCharacter',
          charVar: 'moeda',
          x: { type: 'num', value: 700 },
          y: { type: 'num', value: 120 },
        },
      ],
      events: [],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            { type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' },
            { type: 'gk:keepOnScreen', charVar: 'heroi' },
            {
              type: 'if',
              cond: { type: 'gk:charactersTouch', aVar: 'heroi', bVar: 'moeda' },
              then: [
                {
                  type: 'assign',
                  name: 'pontos',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: { type: 'var', name: 'pontos' },
                    right: { type: 'num', value: 1 },
                  },
                },
                {
                  type: 'gk:placeCharacter',
                  charVar: 'moeda',
                  x: {
                    type: 'binop',
                    op: '*',
                    left: { type: 'randomFloat' },
                    right: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'gk:gameWidth' },
                      right: { type: 'num', value: 28 },
                    },
                  },
                  y: {
                    type: 'binop',
                    op: '*',
                    left: { type: 'randomFloat' },
                    right: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'gk:gameHeight' },
                      right: { type: 'num', value: 28 },
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontos' },
                    right: { type: 'num', value: 5 },
                  },
                  then: [
                    { type: 'gk:setState', name: 'venceu' },
                    { type: 'gk:showScreen', name: 'vitoria' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#0f3460', grid: true },
            { type: 'gk:drawCharacter', charVar: 'heroi' },
            { type: 'gk:drawCharacter', charVar: 'moeda' },
            { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ffffff' } },
            { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Moedas: ' },
                right: { type: 'var', name: 'pontos' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 40 },
            },
          ],
        },
      ],
    },
  },
}
