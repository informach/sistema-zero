import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Muralha do Reino Profissional" — o tower-defense do Chris
 * Courses recriado com o 🏰 Kit Defesa de Torre do motor avançado (o mesmo kit
 * do "Defesa do Reino"), SEM assets: o mapa, os orcs, as torres e os tiros são
 * desenhados por código (defineLook + drawBackground). Mostra a arquitetura do
 * kit: caminho por waypoints (definePath), lugares de compra (tdSlot + tdOnBuy
 * por 50 moedas), torres que miram o invasor MAIS avançado no alcance
 * (pickActive maior por pathProgress + launchTowards), tiro que tira 20 de vida,
 * +25 moedas por orc derrotado, coração a menos quando um passa e ondas que
 * crescem +2 a cada onda limpa.
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o fonte vive
 * em __gen_muralhaProfissional.ts — se o parser mudar a saída, o drift test
 * muralhaProfissionalExample.test.ts manda re-embutir aqui).
 */
export const muralhaProfissionalExample: ExtensionExample = {
  name: 'Muralha do Reino Profissional',
  experience: 'game',
  description:
    'A defesa de torres do motor avançado: clique nos lugares para comprar torres que miram sozinhas o invasor mais na frente, some moedas a cada orc derrotado e segure as ondas, que crescem sozinhas.',
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
          bg: '#3a5a40',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Muralha do Reino Profissional' },
          text: {
            type: 'str',
            value:
              'Clique nos lugares de terra para comprar torres. Elas miram sozinhas o invasor mais na frente. Segure as ondas!',
          },
          button: { type: 'str', value: 'Defender' },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: { type: 'str', value: 'A muralha caiu!' },
          text: { type: 'str', value: 'O recorde fica guardado. Tente de novo!' },
          button: { type: 'str', value: 'Defender de novo' },
        },
        {
          type: 'gk:defineLook',
          name: 'orc',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#6a994e' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 8 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 26 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#386641' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 30 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 6 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffffff' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 12 },
              y: { type: 'num', value: 16 },
              w: { type: 'num', value: 6 },
              h: { type: 'num', value: 6 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 24 },
              y: { type: 'num', value: 16 },
              w: { type: 'num', value: 6 },
              h: { type: 'num', value: 6 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#2b2d42' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 14 },
              y: { type: 'num', value: 18 },
              w: { type: 'num', value: 3 },
              h: { type: 'num', value: 3 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 26 },
              y: { type: 'num', value: 18 },
              w: { type: 'num', value: 3 },
              h: { type: 'num', value: 3 },
            },
          ],
          baseW: { type: 'num', value: 40 },
          baseH: { type: 'num', value: 40 },
        },
        {
          type: 'gk:defineLook',
          name: 'torre',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#6c757d' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 20 },
              w: { type: 'num', value: 36 },
              h: { type: 'num', value: 24 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#adb5bd' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 6 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 18 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#495057' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 16 },
              y: { type: 'num', value: 10 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd166' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 8 },
              h: { type: 'num', value: 10 },
            },
          ],
          baseW: { type: 'num', value: 48 },
          baseH: { type: 'num', value: 48 },
        },
        {
          type: 'gk:defineLook',
          name: 'flecha',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffe066' },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: { type: 'num', value: 7 },
              y: { type: 'num', value: 7 },
              r: { type: 'num', value: 6 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#f4a259' },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: { type: 'num', value: 7 },
              y: { type: 'num', value: 7 },
              r: { type: 'num', value: 3 },
            },
          ],
          baseW: { type: 'num', value: 14 },
          baseH: { type: 'num', value: 14 },
        },
        {
          type: 'gk:defineMold',
          name: 'invasor',
          w: { type: 'num', value: 40 },
          h: { type: 'num', value: 40 },
          health: { type: 'num', value: 60 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#6a994e',
          image: '',
          look: 'orc',
        },
        {
          type: 'gk:defineMold',
          name: 'torre',
          w: { type: 'num', value: 48 },
          h: { type: 'num', value: 48 },
          health: { type: 'num', value: 1 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#6c757d',
          image: '',
          look: 'torre',
        },
        {
          type: 'gk:defineMold',
          name: 'tiro',
          w: { type: 'num', value: 14 },
          h: { type: 'num', value: 14 },
          health: { type: 'num', value: 1 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#ffe066',
          image: '',
          look: 'flecha',
        },
        {
          type: 'gk:defineEffect',
          name: 'estouro',
          count: { type: 'num', value: 16 },
          color: '#ffd166',
          size: { type: 'num', value: 5 },
          life: { type: 'num', value: 0.4 },
          speed: { type: 'num', value: 200 },
          gravity: { type: 'num', value: 0 },
        },
        { type: 'var', name: 'vidas', value: { type: 'num', value: 10 } },
        { type: 'var', name: 'leva', value: { type: 'num', value: 3 } },
        {
          type: 'gk:definePath',
          name: 'trilha',
          body: [
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: -60 },
              y: { type: 'num', value: 356 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 207 },
              y: { type: 'num', value: 354 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 207 },
              y: { type: 'num', value: 118 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 551 },
              y: { type: 'num', value: 119 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 551 },
              y: { type: 'num', value: 304 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 454 },
              y: { type: 'num', value: 305 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 454 },
              y: { type: 'num', value: 502 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 785 },
              y: { type: 'num', value: 499 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 787 },
              y: { type: 'num', value: 216 },
            },
            {
              type: 'gk:pathPoint',
              x: { type: 'num', value: 1020 },
              y: { type: 'num', value: 215 },
            },
          ],
        },
        { type: 'gk:tdSetCoins', n: { type: 'num', value: 100 } },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 120 },
          y: { type: 'num', value: 230 },
          size: { type: 'num', value: 60 },
        },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 230 },
          size: { type: 'num', value: 60 },
        },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 340 },
          y: { type: 'num', value: 400 },
          size: { type: 'num', value: 60 },
        },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 620 },
          y: { type: 'num', value: 400 },
          size: { type: 'num', value: 60 },
        },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 640 },
          y: { type: 'num', value: 150 },
          size: { type: 'num', value: 60 },
        },
        {
          type: 'gk:tdSlot',
          x: { type: 'num', value: 880 },
          y: { type: 'num', value: 340 },
          size: { type: 'num', value: 60 },
        },
        { type: 'assign', name: 'vidas', value: { type: 'num', value: 10 } },
        { type: 'assign', name: 'leva', value: { type: 'num', value: 3 } },
        {
          type: 'gk:tdWave',
          path: 'trilha',
          count: { type: 'var', name: 'leva' },
          mold: 'invasor',
          gap: { type: 'num', value: 150 },
          speed: { type: 'num', value: 80 },
        },
      ],
      events: [
        {
          type: 'gk:tdOnBuy',
          cost: { type: 'num', value: 50 },
          xName: 'lugarX',
          yName: 'lugarY',
          body: [
            {
              type: 'gk:spawnFromMold',
              mold: 'torre',
              x: {
                type: 'binop',
                op: '-',
                left: { type: 'var', name: 'lugarX' },
                right: { type: 'num', value: 24 },
              },
              y: {
                type: 'binop',
                op: '-',
                left: { type: 'var', name: 'lugarY' },
                right: { type: 'num', value: 24 },
              },
            },
            { type: 'gk:playEffect', fx: 'click' },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'compra:negada',
          body: [
            {
              type: 'gk:floatText',
              text: { type: 'str', value: 'sem moedas!' },
              x: { type: 'gk:mouseX' },
              y: { type: 'gk:mouseY' },
              color: '#ff6b6b',
              size: { type: 'num', value: 20 },
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'invasor:passou',
          body: [
            {
              type: 'assign',
              name: 'vidas',
              value: {
                type: 'binop',
                op: '-',
                left: { type: 'var', name: 'vidas' },
                right: { type: 'num', value: 1 },
              },
            },
            {
              type: 'gk:cameraShake',
              intensity: { type: 'num', value: 6 },
              seconds: { type: 'num', value: 0.3 },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: { type: 'var', name: 'vidas' },
                right: { type: 'num', value: 0 },
              },
              then: [{ type: 'gk:endGame' }],
            },
          ],
        },
        {
          type: 'gk:onEvent',
          event: 'onda:limpa',
          body: [
            {
              type: 'assign',
              name: 'leva',
              value: {
                type: 'binop',
                op: '+',
                left: { type: 'var', name: 'leva' },
                right: { type: 'num', value: 2 },
              },
            },
            { type: 'gk:tdAddCoins', n: { type: 'num', value: 25 } },
            {
              type: 'gk:tdWave',
              path: 'trilha',
              count: { type: 'var', name: 'leva' },
              mold: 'invasor',
              gap: { type: 'num', value: 150 },
              speed: { type: 'num', value: 80 },
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
              type: 'gk:forEachActive',
              mold: 'torre',
              itemName: 'torre',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:cooldownReady',
                    charVar: 'torre',
                    seconds: { type: 'num', value: 0.7 },
                  },
                  then: [
                    {
                      type: 'var',
                      name: 'alvo',
                      value: {
                        type: 'gk:pickActive',
                        mold: 'invasor',
                        mode: 'maior',
                        prop: 'pathProgress',
                      },
                      kind: 'const',
                    },
                    {
                      type: 'if',
                      cond: { type: 'var', name: 'alvo' },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '<',
                            left: { type: 'gk:distanceBetween', a: 'torre', b: 'alvo' },
                            right: { type: 'num', value: 200 },
                          },
                          then: [
                            {
                              type: 'gk:spawnNamed',
                              varName: 'tiro',
                              mold: 'tiro',
                              x: {
                                type: 'binop',
                                op: '+',
                                left: { type: 'gk:charX', charVar: 'torre' },
                                right: { type: 'num', value: 17 },
                              },
                              y: {
                                type: 'binop',
                                op: '+',
                                left: { type: 'gk:charY', charVar: 'torre' },
                                right: { type: 'num', value: 4 },
                              },
                            },
                            {
                              type: 'gk:launchTowards',
                              charVar: 'tiro',
                              targetVar: 'alvo',
                              speed: { type: 'num', value: 460 },
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
              type: 'gk:forEachActive',
              mold: 'tiro',
              itemName: 'item',
              body: [{ type: 'gk:moveByVelocity', charVar: 'item', dtVar: 'dt' }],
            },
            { type: 'gk:cullOffscreen', mold: 'tiro', margin: { type: 'num', value: 60 } },
            {
              type: 'gk:overlapGroups',
              aName: 't',
              moldA: 'tiro',
              bName: 'inv',
              moldB: 'invasor',
              body: [
                { type: 'gk:recycle', charVar: 't' },
                {
                  type: 'gk:hurt',
                  charVar: 'inv',
                  amount: { type: 'num', value: 20 },
                  iframes: { type: 'num', value: 0 },
                },
                {
                  type: 'if',
                  cond: { type: 'gk:isDead', charVar: 'inv' },
                  then: [
                    {
                      type: 'gk:burst',
                      effect: 'estouro',
                      x: { type: 'gk:charX', charVar: 'inv' },
                      y: { type: 'gk:charY', charVar: 'inv' },
                    },
                    { type: 'gk:tdAddCoins', n: { type: 'num', value: 25 } },
                    {
                      type: 'gk:floatText',
                      text: { type: 'str', value: '+25' },
                      x: { type: 'gk:charX', charVar: 'inv' },
                      y: { type: 'gk:charY', charVar: 'inv' },
                      color: '#ffd166',
                      size: { type: 'num', value: 20 },
                    },
                    { type: 'gk:recycle', charVar: 'inv' },
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
            { type: 'gk:drawBackground', color: '#3a5a40', grid: true },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#a68a64' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: -60 },
              y: { type: 'num', value: 336 },
              w: { type: 'num', value: 267 },
              h: { type: 'num', value: 40 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 187 },
              y: { type: 'num', value: 118 },
              w: { type: 'num', value: 40 },
              h: { type: 'num', value: 258 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 187 },
              y: { type: 'num', value: 118 },
              w: { type: 'num', value: 384 },
              h: { type: 'num', value: 40 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 531 },
              y: { type: 'num', value: 119 },
              w: { type: 'num', value: 40 },
              h: { type: 'num', value: 205 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 434 },
              y: { type: 'num', value: 285 },
              w: { type: 'num', value: 137 },
              h: { type: 'num', value: 40 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 434 },
              y: { type: 'num', value: 285 },
              w: { type: 'num', value: 40 },
              h: { type: 'num', value: 237 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 434 },
              y: { type: 'num', value: 482 },
              w: { type: 'num', value: 371 },
              h: { type: 'num', value: 40 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 765 },
              y: { type: 'num', value: 216 },
              w: { type: 'num', value: 40 },
              h: { type: 'num', value: 306 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 767 },
              y: { type: 'num', value: 216 },
              w: { type: 'num', value: 253 },
              h: { type: 'num', value: 40 },
            },
            { type: 'gk:tdDrawSlots' },
            {
              type: 'gk:forEachActive',
              mold: 'torre',
              itemName: 'torre',
              body: [
                {
                  type: 'gk:tdDrawRange',
                  charVar: 'torre',
                  radius: { type: 'num', value: 200 },
                },
              ],
            },
            { type: 'gk:drawActive', mold: 'torre' },
            { type: 'gk:drawActive', mold: 'invasor' },
            { type: 'gk:drawActive', mold: 'tiro' },
            {
              type: 'gk:forEachActive',
              mold: 'invasor',
              itemName: 'inv',
              body: [{ type: 'gk:drawHealthBar', charVar: 'inv', max: { type: 'num', value: 0 } }],
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawHearts',
              current: { type: 'var', name: 'vidas' },
              max: { type: 'num', value: 10 },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd166' },
            },
            { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Moedas: ' },
                right: { type: 'gk:tdCoins' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 76 },
            },
          ],
        },
      ],
    },
  },
}
