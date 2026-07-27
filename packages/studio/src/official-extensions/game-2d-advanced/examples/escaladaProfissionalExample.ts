import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Escalada do Guerreiro Profissional" — o vertical-platformer
 * do Chris Courses recriado com o 🏃 Kit Plataforma do motor avançado (o mesmo
 * kit do "Salto na Floresta"/"Dino Corredor Profissional"), SEM assets: o
 * guerreiro, os tijolos, as tábuas, a bandeira e o fundo são desenhados por
 * código (defineLook + drawBackground). Mostra a arquitetura do kit: pulo
 * gostoso (platformerHero, com coyote/buffer/pulo variável), chão sólido
 * (collideGroup) e tábuas finas que se atravessa por baixo (oneWayPlatform, o
 * platform one-way do original), câmera que acompanha o herói subindo pelo mundo
 * mais alto que a tela (cameraFollow), renascer no checkpoint ao cair
 * (setCheckpoint + respawn), a bandeira no topo (região + isInside) e a maior
 * altura guardada de verdade (saveValue/savedValue).
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o fonte vive
 * em __gen_escaladaProfissional.ts — se o parser mudar a saída, o drift test
 * escaladaProfissionalExample.test.ts manda re-embutir aqui).
 */
export const escaladaProfissionalExample: ExtensionExample = {
  name: 'Escalada do Guerreiro Profissional',
  experience: 'game',
  description:
    'A plataforma de subida do motor avançado: pulo gostoso, tábuas que se atravessa por baixo, câmera que acompanha o herói subindo e a maior altura guardada. Suba ate a bandeira no topo!',
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
          bg: '#4a6fa5',
          accent: '#e07a3f',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Escalada do Guerreiro Profissional' },
          text: {
            type: 'str',
            value:
              'A/D ou setas para andar. Espaço para pular. Suba pelas tábuas ate a bandeira no topo!',
          },
          button: { type: 'str', value: 'Escalar' },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: { type: 'str', value: 'Chegou ao topo!' },
          text: {
            type: 'str',
            value: 'Voce escalou a torre inteira. A maior altura fica guardada!',
          },
          button: { type: 'str', value: 'Escalar de novo' },
        },
        {
          type: 'gk:defineLook',
          name: 'guerreiro',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#d9a066' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 2 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 14 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#8a5a2b' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 5 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#4a76b8' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 16 },
              w: { type: 'num', value: 20 },
              h: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#3a3f58' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 36 },
              w: { type: 'num', value: 7 },
              h: { type: 'num', value: 12 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 17 },
              y: { type: 'num', value: 36 },
              w: { type: 'num', value: 7 },
              h: { type: 'num', value: 12 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#c0c8d0' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 26 },
              y: { type: 'num', value: 12 },
              w: { type: 'num', value: 4 },
              h: { type: 'num', value: 26 },
            },
          ],
          baseW: { type: 'num', value: 32 },
          baseH: { type: 'num', value: 48 },
        },
        {
          type: 'gk:defineLook',
          name: 'tijolo',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#6b4f3a' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 120 },
              h: { type: 'num', value: 24 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#5a4230' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 120 },
              h: { type: 'num', value: 4 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 12 },
              w: { type: 'num', value: 120 },
              h: { type: 'num', value: 2 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 38 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 3 },
              h: { type: 'num', value: 12 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 80 },
              y: { type: 'num', value: 12 },
              w: { type: 'num', value: 3 },
              h: { type: 'num', value: 12 },
            },
          ],
          baseW: { type: 'num', value: 120 },
          baseH: { type: 'num', value: 24 },
        },
        {
          type: 'gk:defineLook',
          name: 'tabua',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#a0763d' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 110 },
              h: { type: 'num', value: 12 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#7a5628' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 9 },
              w: { type: 'num', value: 110 },
              h: { type: 'num', value: 3 },
            },
          ],
          baseW: { type: 'num', value: 110 },
          baseH: { type: 'num', value: 12 },
        },
        {
          type: 'gk:defineLook',
          name: 'bandeira',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#8a8a8a' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 4 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 4 },
              h: { type: 'num', value: 60 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#e63946' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 4 },
              w: { type: 'num', value: 34 },
              h: { type: 'num', value: 22 },
            },
          ],
          baseW: { type: 'num', value: 46 },
          baseH: { type: 'num', value: 60 },
        },
        {
          type: 'gk:setJumpFeel',
          coyote: { type: 'num', value: 0.1 },
          buffer: { type: 'num', value: 0.1 },
          hold: { type: 'num', value: 0.3 },
          gravity: { type: 'num', value: 2000 },
        },
        {
          type: 'gk:defineMold',
          name: 'chao',
          w: { type: 'num', value: 120 },
          h: { type: 'num', value: 24 },
          health: { type: 'num', value: 1 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#6b4f3a',
          image: '',
          look: 'tijolo',
        },
        {
          type: 'gk:defineMold',
          name: 'tabua',
          w: { type: 'num', value: 110 },
          h: { type: 'num', value: 12 },
          health: { type: 'num', value: 1 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#a0763d',
          image: '',
          look: 'tabua',
        },
        {
          type: 'gk:defineEffect',
          name: 'poeira',
          count: { type: 'num', value: 8 },
          color: '#ffffff',
          size: { type: 'num', value: 3 },
          life: { type: 'num', value: 0.4 },
          speed: { type: 'num', value: 100 },
          gravity: { type: 'num', value: 300 },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: { type: 'num', value: 32 },
          h: { type: 'num', value: 48 },
          speed: { type: 'num', value: 200 },
          color: '#4a76b8',
        },
        { type: 'gk:stateLook', charVar: 'heroi', state: 'parado', look: 'guerreiro' },
        { type: 'var', name: 'recorde', value: { type: 'gk:savedValue', name: 'recorde' } },
        { type: 'var', name: 'altura', value: { type: 'num', value: 0 } },
        {
          type: 'gk:setCheckpoint',
          x: { type: 'num', value: 80 },
          y: { type: 'num', value: 1360 },
        },
        { type: 'gk:respawn', charVar: 'heroi' },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 1420 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: { type: 'num', value: 120 },
          y: { type: 'num', value: 1420 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: { type: 'num', value: 240 },
          y: { type: 'num', value: 1420 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 300 },
          y: { type: 'num', value: 1240 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 120 },
          y: { type: 'num', value: 1080 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 420 },
          y: { type: 'num', value: 940 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 200 },
          y: { type: 'num', value: 780 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 520 },
          y: { type: 'num', value: 640 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 280 },
          y: { type: 'num', value: 480 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 560 },
          y: { type: 'num', value: 320 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: { type: 'num', value: 340 },
          y: { type: 'num', value: 180 },
        },
        {
          type: 'gk:defineRegion',
          name: 'topo',
          x: { type: 'num', value: 300 },
          y: { type: 'num', value: 60 },
          w: { type: 'num', value: 200 },
          h: { type: 'num', value: 100 },
        },
        {
          type: 'gk:cameraFollow',
          charVar: 'heroi',
          w: { type: 'num', value: 960 },
          h: { type: 'num', value: 1500 },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'plataforma:pisou',
          body: [
            {
              type: 'gk:burst',
              effect: 'poeira',
              x: {
                type: 'binop',
                op: '+',
                left: { type: 'gk:charX', charVar: 'heroi' },
                right: { type: 'num', value: 16 },
              },
              y: {
                type: 'binop',
                op: '+',
                left: { type: 'gk:charY', charVar: 'heroi' },
                right: { type: 'num', value: 48 },
              },
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
              type: 'gk:platformerHero',
              charVar: 'heroi',
              speed: { type: 'num', value: 200 },
              force: { type: 'num', value: 620 },
              dtVar: 'dt',
            },
            { type: 'gk:dropThrough', charVar: 'heroi' },
            { type: 'gk:collideGroup', charVar: 'heroi', mold: 'chao' },
            { type: 'gk:oneWayPlatform', charVar: 'heroi', mold: 'tabua', dtVar: 'dt' },
            { type: 'gk:platformerAnim', charVar: 'heroi' },
            {
              type: 'assign',
              name: 'altura',
              value: {
                type: 'mathUnary',
                fn: 'round',
                arg: {
                  type: 'binop',
                  op: '-',
                  left: { type: 'num', value: 1420 },
                  right: { type: 'gk:charY', charVar: 'heroi' },
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: { type: 'var', name: 'altura' },
                right: { type: 'var', name: 'recorde' },
              },
              then: [
                { type: 'assign', name: 'recorde', value: { type: 'var', name: 'altura' } },
                {
                  type: 'gk:saveValue',
                  name: 'recorde',
                  value: { type: 'var', name: 'recorde' },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: { type: 'gk:charY', charVar: 'heroi' },
                right: { type: 'num', value: 1560 },
              },
              then: [{ type: 'gk:respawn', charVar: 'heroi' }],
            },
            {
              type: 'if',
              cond: { type: 'gk:isInside', charVar: 'heroi', region: 'topo' },
              then: [{ type: 'gk:setState', name: 'vitoria' }],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#4a6fa5', grid: false },
            { type: 'gk:drawActive', mold: 'chao' },
            { type: 'gk:drawActive', mold: 'tabua' },
            {
              type: 'gk:drawLook',
              look: 'bandeira',
              x: { type: 'num', value: 320 },
              y: { type: 'num', value: 100 },
              w: { type: 'num', value: 46 },
              h: { type: 'num', value: 60 },
            },
            { type: 'gk:drawShadow', charVar: 'heroi' },
            { type: 'gk:drawCharacter', charVar: 'heroi' },
            { type: 'gk:drawEffects' },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffffff' },
            },
            { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Altura: ' },
                right: { type: 'var', name: 'altura' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 36 },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Recorde: ' },
                right: { type: 'var', name: 'recorde' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 68 },
            },
          ],
        },
      ],
    },
  },
}
