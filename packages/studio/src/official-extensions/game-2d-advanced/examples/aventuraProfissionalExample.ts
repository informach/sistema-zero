import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Aventura do Herói Profissional" — o nível 2 da família de
 * aventura (o Zelda-style do Clear Code recriado com o motor avançado), SEM
 * Kit RPG e SEM Kit Monstrinhos: só as peças gerais do motor. Mostra o mundo
 * MAIOR que a tela (createEmptyTilemap + cameraFollowMap), o combate
 * corpo-a-corpo do kit (attackFacing + setSwingWindow + didHit), inimigos com
 * FSM POR ENTIDADE dirigida por distância (entityState/setEntityState +
 * distanceBetween: patrulha -> perseguir -> golpe) em DOIS tipos data-driven
 * (moldes com vida/velocidade/dano diferentes; o dano do toque sai de
 * propertyOf), i-frames + knockback nos dois sentidos, MATO DESTRUTÍVEL no
 * tilemap (setTileAt/tileAt/breakTileAt + burst de folhas), o Y-sort do kit
 * (drawByDepth: o herói passa ATRÁS das árvores), corações no HUD
 * (drawHearts + healthOf), visual 100% defineLook com animação por estado
 * (stateLook + autoAnimate) e missão de derrotar todos (setMission +
 * missionKill -> tela de vitória pronta).
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o fonte
 * vive em `__gen_aventuraProfissional.ts` — se o parser mudar a saída, o drift
 * test `aventuraProfissionalExample.test.ts` manda re-embutir aqui).
 */
export const aventuraProfissionalExample: ExtensionExample = {
  name: 'Aventura do Herói Profissional',
  experience: 'game',
  description:
    'Um mundo maior que a tela! Espada com janela de golpe, inimigos com estados por distância, mato que corta de verdade, herói que passa atrás das árvores e corações de vida.',
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
          bg: '#79b365',
          accent: '#2b8a3e',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Aventura do Herói Profissional' },
          text: {
            type: 'str',
            value:
              'Setas: andar. ESPAÇO: golpe de espada. Fique EM CIMA do mato e golpeie para cortar. Passe atrás das árvores e derrote os 7 monstros do campo!',
          },
          button: { type: 'str', value: 'Aventurar' },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: { type: 'str', value: 'Campo em paz!' },
          text: { type: 'str', value: 'Você derrotou todos os monstros. O reino agradece, herói!' },
          button: { type: 'str', value: 'Jogar de novo' },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: { type: 'str', value: 'O herói caiu!' },
          text: { type: 'str', value: 'Os monstros venceram desta vez. Tente de novo!' },
          button: { type: 'str', value: 'Tentar de novo' },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi parado',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#74491f' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 12 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 20 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd8a8' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 14 },
              y: { type: 'num', value: 10 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#2f9e44' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 20 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#5c4425' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 14 },
              y: { type: 'num', value: 40 },
              w: { type: 'num', value: 17 },
              h: { type: 'num', value: 16 },
            },
          ],
          baseW: { type: 'num', value: 44 },
          baseH: { type: 'num', value: 56 },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi andando',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#74491f' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 12 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 20 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd8a8' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 14 },
              y: { type: 'num', value: 10 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#2f9e44' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 20 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#5c4425' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 40 },
              w: { type: 'num', value: 7 },
              h: { type: 'num', value: 16 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 28 },
              y: { type: 'num', value: 40 },
              w: { type: 'num', value: 7 },
              h: { type: 'num', value: 16 },
            },
          ],
          baseW: { type: 'num', value: 44 },
          baseH: { type: 'num', value: 56 },
        },
        {
          type: 'gk:defineLook',
          name: 'heroi golpe',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#74491f' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 0 },
              w: { type: 'num', value: 20 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd8a8' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 10 },
              w: { type: 'num', value: 16 },
              h: { type: 'num', value: 10 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#2f9e44' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 4 },
              y: { type: 'num', value: 20 },
              w: { type: 'num', value: 28 },
              h: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#5c4425' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 40 },
              w: { type: 'num', value: 17 },
              h: { type: 'num', value: 16 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#dee2e6' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 30 },
              y: { type: 'num', value: 24 },
              w: { type: 'num', value: 14 },
              h: { type: 'num', value: 6 },
            },
          ],
          baseW: { type: 'num', value: 44 },
          baseH: { type: 'num', value: 56 },
        },
        {
          type: 'gk:defineLook',
          name: 'javali',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#845ef7' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 12 },
              w: { type: 'num', value: 40 },
              h: { type: 'num', value: 22 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 40 },
              y: { type: 'num', value: 6 },
              w: { type: 'num', value: 10 },
              h: { type: 'num', value: 16 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#3b2a63' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 34 },
              w: { type: 'num', value: 30 },
              h: { type: 'num', value: 6 },
            },
          ],
          baseW: { type: 'num', value: 52 },
          baseH: { type: 'num', value: 40 },
        },
        {
          type: 'gk:defineLook',
          name: 'lobo',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#868e96' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 4 },
              y: { type: 'num', value: 12 },
              w: { type: 'num', value: 30 },
              h: { type: 'num', value: 16 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 30 },
              y: { type: 'num', value: 4 },
              w: { type: 'num', value: 12 },
              h: { type: 'num', value: 14 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 8 },
              w: { type: 'num', value: 8 },
              h: { type: 'num', value: 8 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#ffd43b' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 34 },
              y: { type: 'num', value: 8 },
              w: { type: 'num', value: 4 },
              h: { type: 'num', value: 4 },
            },
          ],
          baseW: { type: 'num', value: 44 },
          baseH: { type: 'num', value: 34 },
        },
        {
          type: 'gk:defineLook',
          name: 'arvore',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#7f5539' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 26 },
              y: { type: 'num', value: 58 },
              w: { type: 'num', value: 12 },
              h: { type: 'num', value: 38 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#2b8a3e' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 6 },
              w: { type: 'num', value: 52 },
              h: { type: 'num', value: 58 },
            },
          ],
          baseW: { type: 'num', value: 64 },
          baseH: { type: 'num', value: 96 },
        },
        {
          type: 'gk:defineLook',
          name: 'mato',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#37b24c' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 24 },
              w: { type: 'num', value: 12 },
              h: { type: 'num', value: 36 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 26 },
              y: { type: 'num', value: 10 },
              w: { type: 'num', value: 12 },
              h: { type: 'num', value: 50 },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 46 },
              y: { type: 'num', value: 26 },
              w: { type: 'num', value: 12 },
              h: { type: 'num', value: 34 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#69db7c' },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 16 },
              y: { type: 'num', value: 36 },
              w: { type: 'num', value: 10 },
              h: { type: 'num', value: 24 },
            },
          ],
          baseW: { type: 'num', value: 64 },
          baseH: { type: 'num', value: 64 },
        },
        {
          type: 'gk:defineEffect',
          name: 'folhas',
          count: { type: 'num', value: 12 },
          color: '#69db7c',
          size: { type: 'num', value: 5 },
          life: { type: 'num', value: 0.5 },
          speed: { type: 'num', value: 140 },
          gravity: { type: 'num', value: 300 },
        },
        {
          type: 'gk:defineEffect',
          name: 'faisca',
          count: { type: 'num', value: 10 },
          color: '#ffe066',
          size: { type: 'num', value: 4 },
          life: { type: 'num', value: 0.35 },
          speed: { type: 'num', value: 180 },
          gravity: { type: 'num', value: 0 },
        },
        {
          type: 'gk:createEmptyTilemap',
          name: 'campo',
          cols: { type: 'num', value: 30 },
          rows: { type: 'num', value: 17 },
          fill: { type: 'num', value: -1 },
          asset: '',
        },
        {
          type: 'gk:defineMold',
          name: 'arvore',
          w: { type: 'num', value: 64 },
          h: { type: 'num', value: 96 },
          health: { type: 'num', value: 1 },
          speed: { type: 'num', value: 0 },
          damage: { type: 'num', value: 0 },
          color: '#2b8a3e',
          image: '',
          look: 'arvore',
        },
        {
          type: 'gk:defineMold',
          name: 'javali',
          w: { type: 'num', value: 52 },
          h: { type: 'num', value: 40 },
          health: { type: 'num', value: 30 },
          speed: { type: 'num', value: 70 },
          damage: { type: 'num', value: 12 },
          color: '#845ef7',
          image: '',
          look: 'javali',
        },
        {
          type: 'gk:defineMold',
          name: 'lobo',
          w: { type: 'num', value: 44 },
          h: { type: 'num', value: 34 },
          health: { type: 'num', value: 10 },
          speed: { type: 'num', value: 130 },
          damage: { type: 'num', value: 6 },
          color: '#868e96',
          image: '',
          look: 'lobo',
        },
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'num', value: 0 },
          to: { type: 'num', value: 7 },
          step: { type: 'num', value: 1 },
          body: [
            {
              type: 'gk:setTileAt',
              map: 'campo',
              x: {
                type: 'binop',
                op: '+',
                left: { type: 'num', value: 896 },
                right: {
                  type: 'binop',
                  op: '*',
                  left: { type: 'var', name: 'i' },
                  right: { type: 'num', value: 64 },
                },
              },
              y: { type: 'num', value: 704 },
              index: { type: 'num', value: 1 },
            },
          ],
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 500 },
          y: { type: 'num', value: 140 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 820 },
          y: { type: 'num', value: 400 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 300 },
          y: { type: 'num', value: 740 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 620 },
          y: { type: 'num', value: 860 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 1250 },
          y: { type: 'num', value: 560 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'arvore',
          x: { type: 'num', value: 1620 },
          y: { type: 'num', value: 170 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'javali',
          x: { type: 'num', value: 1450 },
          y: { type: 'num', value: 320 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'javali',
          x: { type: 'num', value: 1580 },
          y: { type: 'num', value: 430 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'javali',
          x: { type: 'num', value: 1400 },
          y: { type: 'num', value: 520 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'javali',
          x: { type: 'num', value: 1660 },
          y: { type: 'num', value: 300 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'lobo',
          x: { type: 'num', value: 1150 },
          y: { type: 'num', value: 880 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'lobo',
          x: { type: 'num', value: 1320 },
          y: { type: 'num', value: 940 },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'lobo',
          x: { type: 'num', value: 1480 },
          y: { type: 'num', value: 860 },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: { type: 'num', value: 44 },
          h: { type: 'num', value: 56 },
          speed: { type: 'num', value: 250 },
          color: '#2f9e44',
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'heroi',
          x: { type: 'num', value: 200 },
          y: { type: 'num', value: 480 },
        },
        {
          type: 'gk:setHitbox',
          charVar: 'heroi',
          ox: { type: 'num', value: 8 },
          oy: { type: 'num', value: 24 },
          w: { type: 'num', value: 28 },
          h: { type: 'num', value: 30 },
        },
        {
          type: 'gk:setSwingWindow',
          charVar: 'heroi',
          start: { type: 'num', value: 0.08 },
          active: { type: 'num', value: 0.14 },
        },
        { type: 'gk:stateLook', charVar: 'heroi', state: 'parado', look: 'heroi parado' },
        { type: 'gk:stateLook', charVar: 'heroi', state: 'andando', look: 'heroi andando' },
        { type: 'gk:stateLook', charVar: 'heroi', state: 'golpe', look: 'heroi golpe' },
        { type: 'gk:stateLook', charVar: 'heroi', state: 'dano', look: 'heroi parado' },
        { type: 'gk:cameraFollowMap', charVar: 'heroi', map: 'campo' },
        {
          type: 'gk:setMission',
          seconds: { type: 'num', value: 0 },
          killCount: { type: 'num', value: 7 },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'inimigo:caiu',
          body: [{ type: 'gk:playEffect', fx: 'explosion' }],
        },
        {
          type: 'gk:onEnterState',
          name: 'vitoria',
          body: [{ type: 'gk:playEffect', fx: 'win' }],
        },
        {
          type: 'gk:onEnterState',
          name: 'fim',
          body: [{ type: 'gk:playEffect', fx: 'gameover' }],
        },
      ],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            { type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' },
            { type: 'gk:collideGroup', charVar: 'heroi', mold: 'arvore' },
            { type: 'gk:keepOnScreen', charVar: 'heroi' },
            {
              type: 'if',
              cond: { type: 'gk:keyPressed', key: ' ' },
              then: [
                { type: 'gk:playEffect', fx: 'click' },
                {
                  type: 'gk:attackFacing',
                  charVar: 'heroi',
                  range: { type: 'num', value: 56 },
                  duration: { type: 'num', value: 0.3 },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:tileAt',
                      map: 'campo',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'gk:charX', charVar: 'heroi' },
                        right: { type: 'num', value: 22 },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'gk:charY', charVar: 'heroi' },
                        right: { type: 'num', value: 28 },
                      },
                    },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    { type: 'gk:breakTileAt', map: 'campo', charVar: 'heroi' },
                    {
                      type: 'gk:burst',
                      effect: 'folhas',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'gk:charX', charVar: 'heroi' },
                        right: { type: 'num', value: 22 },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'gk:charY', charVar: 'heroi' },
                        right: { type: 'num', value: 28 },
                      },
                    },
                    { type: 'gk:playEffect', fx: 'hit' },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'javali',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: { type: 'gk:entityState', charVar: 'item' },
                    right: { type: 'str', value: 'golpe' },
                  },
                  then: [{ type: 'gk:seek', charVar: 'item', targetVar: 'heroi', dtVar: 'dt' }],
                  elseif: [
                    {
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: { type: 'gk:distanceBetween', a: 'item', b: 'heroi' },
                        right: { type: 'num', value: 80 },
                      },
                      then: [
                        {
                          type: 'gk:setEntityState',
                          charVar: 'item',
                          state: 'golpe',
                          seconds: { type: 'num', value: 0.5 },
                        },
                      ],
                    },
                    {
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: { type: 'gk:distanceBetween', a: 'item', b: 'heroi' },
                        right: { type: 'num', value: 240 },
                      },
                      then: [
                        {
                          type: 'gk:setEntityState',
                          charVar: 'item',
                          state: 'andando',
                          seconds: { type: 'num', value: 0.1 },
                        },
                        { type: 'gk:seek', charVar: 'item', targetVar: 'heroi', dtVar: 'dt' },
                      ],
                    },
                  ],
                  else: [
                    {
                      type: 'gk:setEntityState',
                      charVar: 'item',
                      state: 'parado',
                      seconds: { type: 'num', value: 0.1 },
                    },
                    {
                      type: 'gk:patrolAround',
                      charVar: 'item',
                      ox: { type: 'num', value: 1520 },
                      oy: { type: 'num', value: 400 },
                      radius: { type: 'num', value: 130 },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'gk:didHit', aVar: 'heroi', bVar: 'item' },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'item',
                      amount: { type: 'num', value: 12 },
                      iframes: { type: 'num', value: 0.25 },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'item',
                      fromVar: 'heroi',
                      force: { type: 'num', value: 380 },
                    },
                    { type: 'gk:playEffect', fx: 'hit' },
                    {
                      type: 'if',
                      cond: { type: 'gk:isDead', charVar: 'item' },
                      then: [
                        {
                          type: 'gk:burst',
                          effect: 'faisca',
                          x: { type: 'gk:charX', charVar: 'item' },
                          y: { type: 'gk:charY', charVar: 'item' },
                        },
                        { type: 'gk:missionKill' },
                        { type: 'gk:emit', event: 'inimigo:caiu' },
                        { type: 'gk:recycle', charVar: 'item' },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'logical',
                      op: '&&',
                      left: {
                        type: 'binop',
                        op: '===',
                        left: { type: 'gk:entityState', charVar: 'item' },
                        right: { type: 'str', value: 'golpe' },
                      },
                      right: { type: 'gk:charactersTouch', aVar: 'item', bVar: 'heroi' },
                    },
                    right: {
                      type: 'logicalNot',
                      value: { type: 'gk:isInvincible', charVar: 'heroi' },
                    },
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'heroi',
                      amount: { type: 'gk:propertyOf', charVar: 'item', prop: 'damage' },
                      iframes: { type: 'num', value: 1 },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'heroi',
                      fromVar: 'item',
                      force: { type: 'num', value: 340 },
                    },
                    { type: 'gk:playEffect', fx: 'hurt' },
                    {
                      type: 'gk:cameraShake',
                      intensity: { type: 'num', value: 6 },
                      seconds: { type: 'num', value: 0.25 },
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'lobo',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: { type: 'gk:entityState', charVar: 'item' },
                    right: { type: 'str', value: 'golpe' },
                  },
                  then: [{ type: 'gk:seek', charVar: 'item', targetVar: 'heroi', dtVar: 'dt' }],
                  elseif: [
                    {
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: { type: 'gk:distanceBetween', a: 'item', b: 'heroi' },
                        right: { type: 'num', value: 60 },
                      },
                      then: [
                        {
                          type: 'gk:setEntityState',
                          charVar: 'item',
                          state: 'golpe',
                          seconds: { type: 'num', value: 0.4 },
                        },
                      ],
                    },
                    {
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: { type: 'gk:distanceBetween', a: 'item', b: 'heroi' },
                        right: { type: 'num', value: 340 },
                      },
                      then: [
                        {
                          type: 'gk:setEntityState',
                          charVar: 'item',
                          state: 'andando',
                          seconds: { type: 'num', value: 0.1 },
                        },
                        { type: 'gk:seek', charVar: 'item', targetVar: 'heroi', dtVar: 'dt' },
                      ],
                    },
                  ],
                  else: [
                    {
                      type: 'gk:setEntityState',
                      charVar: 'item',
                      state: 'parado',
                      seconds: { type: 'num', value: 0.1 },
                    },
                    {
                      type: 'gk:patrolAround',
                      charVar: 'item',
                      ox: { type: 'num', value: 1320 },
                      oy: { type: 'num', value: 890 },
                      radius: { type: 'num', value: 160 },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'gk:didHit', aVar: 'heroi', bVar: 'item' },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'item',
                      amount: { type: 'num', value: 12 },
                      iframes: { type: 'num', value: 0.25 },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'item',
                      fromVar: 'heroi',
                      force: { type: 'num', value: 420 },
                    },
                    { type: 'gk:playEffect', fx: 'hit' },
                    {
                      type: 'if',
                      cond: { type: 'gk:isDead', charVar: 'item' },
                      then: [
                        {
                          type: 'gk:burst',
                          effect: 'faisca',
                          x: { type: 'gk:charX', charVar: 'item' },
                          y: { type: 'gk:charY', charVar: 'item' },
                        },
                        { type: 'gk:missionKill' },
                        { type: 'gk:emit', event: 'inimigo:caiu' },
                        { type: 'gk:recycle', charVar: 'item' },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'logical',
                      op: '&&',
                      left: {
                        type: 'binop',
                        op: '===',
                        left: { type: 'gk:entityState', charVar: 'item' },
                        right: { type: 'str', value: 'golpe' },
                      },
                      right: { type: 'gk:charactersTouch', aVar: 'item', bVar: 'heroi' },
                    },
                    right: {
                      type: 'logicalNot',
                      value: { type: 'gk:isInvincible', charVar: 'heroi' },
                    },
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'heroi',
                      amount: { type: 'gk:propertyOf', charVar: 'item', prop: 'damage' },
                      iframes: { type: 'num', value: 1 },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'heroi',
                      fromVar: 'item',
                      force: { type: 'num', value: 300 },
                    },
                    { type: 'gk:playEffect', fx: 'hurt' },
                  ],
                },
              ],
            },
            { type: 'gk:autoAnimate', charVar: 'heroi' },
            {
              type: 'if',
              cond: { type: 'gk:isDead', charVar: 'heroi' },
              then: [{ type: 'gk:endGame' }],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#79b365', grid: false },
            {
              type: 'forRange',
              varName: 'i',
              from: { type: 'num', value: 0 },
              to: { type: 'num', value: 7 },
              step: { type: 'num', value: 1 },
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'gk:tileAt',
                      map: 'campo',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'num', value: 928 },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: { type: 'var', name: 'i' },
                          right: { type: 'num', value: 64 },
                        },
                      },
                      y: { type: 'num', value: 736 },
                    },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    {
                      type: 'gk:drawLook',
                      look: 'mato',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'num', value: 896 },
                        right: {
                          type: 'binop',
                          op: '*',
                          left: { type: 'var', name: 'i' },
                          right: { type: 'num', value: 64 },
                        },
                      },
                      y: { type: 'num', value: 704 },
                      w: { type: 'num', value: 64 },
                      h: { type: 'num', value: 64 },
                    },
                  ],
                },
              ],
            },
            { type: 'gk:drawShadow', charVar: 'heroi' },
            { type: 'gk:drawByDepth', charVar: 'heroi' },
            { type: 'gk:drawEffects' },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawHearts',
              current: {
                type: 'binop',
                op: '/',
                left: { type: 'gk:healthOf', charVar: 'heroi' },
                right: { type: 'num', value: 20 },
              },
              max: { type: 'num', value: 5 },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 20 },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'color', value: '#123018' },
            },
            { type: 'canvasFont', ctxVar: 'ctx', size: 18, family: 'sans-serif' },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Javalis: ' },
                right: { type: 'gk:countActive', mold: 'javali' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 72 },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: { type: 'str', value: 'Lobos: ' },
                right: { type: 'gk:countActive', mold: 'lobo' },
              },
              x: { type: 'num', value: 20 },
              y: { type: 'num', value: 96 },
            },
          ],
        },
      ],
    },
  },
}
