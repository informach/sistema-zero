import type { ExtensionExample } from '#extensions'

/**
 * 🥊 "Duelo dos Bonecos" — a vitrine do Kit Luta (asset-free), a pendência do
 * R19. P1 no teclado × computador; golpes rápido/pesado (o COMBO emerge da
 * tabela de tempos), agarrão = "atravessa a defesa", especial da IA, rounds e
 * o chão como manda a regra: molde + nascer + colidir (o kit não tem chão).
 *
 * ⚠️ A IR foi GERADA pelo parser real (one-off); o drift vive no examples.test.ts.
 */
export const dueloDosBonecosExample: ExtensionExample = {
  name: 'Duelo dos Bonecos',
  experience: 'game',
  description:
    'Um contra um com o Kit Luta: você (A/D/W/S, F defende, G soco, H chute, J agarrão) contra o computador — melhor de 3 rounds. O chute pesado trava mais do que demora a recuperar: descubra o combo!',
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
      molds: [
        {
          type: 'gk:defineMold',
          name: 'chao',
          w: {
            type: 'num',
            value: 960,
          },
          h: {
            type: 'num',
            value: 60,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#3d2b52',
          image: '',
          look: '',
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
            value: 540,
          },
          bg: '#241733',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Duelo dos Bonecos',
          },
          text: {
            type: 'str',
            value: 'A/D anda - W pula - S agacha - F defende - G soco - H chute - J agarrão',
          },
          button: {
            type: 'str',
            value: 'Lutar',
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'azul',
          image: '',
          w: {
            type: 'num',
            value: 50,
          },
          h: {
            type: 'num',
            value: 110,
          },
          speed: {
            type: 'num',
            value: 260,
          },
          color: '#4a9eff',
        },
        {
          type: 'gk:createCharacter',
          varName: 'vermelho',
          image: '',
          w: {
            type: 'num',
            value: 50,
          },
          h: {
            type: 'num',
            value: 110,
          },
          speed: {
            type: 'num',
            value: 260,
          },
          color: '#e0526a',
        },
        {
          type: 'gk:lutaMove',
          name: 'soco',
          charVar: 'azul',
          speed: 'rápido',
          damage: {
            type: 'num',
            value: 8,
          },
          range: {
            type: 'num',
            value: 70,
          },
          pierce: false,
          special: false,
        },
        {
          type: 'gk:lutaMove',
          name: 'chute',
          charVar: 'azul',
          speed: 'pesado',
          damage: {
            type: 'num',
            value: 18,
          },
          range: {
            type: 'num',
            value: 90,
          },
          pierce: false,
          special: false,
        },
        {
          type: 'gk:lutaMove',
          name: 'agarrao',
          charVar: 'azul',
          speed: 'médio',
          damage: {
            type: 'num',
            value: 12,
          },
          range: {
            type: 'num',
            value: 60,
          },
          pierce: true,
          special: false,
        },
        {
          type: 'gk:lutaMove',
          name: 'soco',
          charVar: 'vermelho',
          speed: 'rápido',
          damage: {
            type: 'num',
            value: 8,
          },
          range: {
            type: 'num',
            value: 70,
          },
          pierce: false,
          special: false,
        },
        {
          type: 'gk:lutaMove',
          name: 'chute',
          charVar: 'vermelho',
          speed: 'pesado',
          damage: {
            type: 'num',
            value: 18,
          },
          range: {
            type: 'num',
            value: 90,
          },
          pierce: false,
          special: false,
        },
        {
          type: 'gk:lutaMove',
          name: 'especial',
          charVar: 'vermelho',
          speed: 'médio',
          damage: {
            type: 'num',
            value: 25,
          },
          range: {
            type: 'num',
            value: 110,
          },
          pierce: true,
          special: true,
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 480,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'azul',
          x: {
            type: 'num',
            value: 250,
          },
          y: {
            type: 'num',
            value: 370,
          },
        },
        {
          type: 'gk:placeCharacter',
          charVar: 'vermelho',
          x: {
            type: 'num',
            value: 660,
          },
          y: {
            type: 'num',
            value: 370,
          },
        },
        {
          type: 'gk:lutaMatch',
          p1Var: 'azul',
          p2Var: 'vermelho',
          rounds: {
            type: 'num',
            value: 3,
          },
          seconds: {
            type: 'num',
            value: 45,
          },
        },
        {
          type: 'gk:lutaAI',
          charVar: 'vermelho',
          level: 'normal',
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'luta:acabou',
          body: [
            {
              type: 'gk:setScreenText',
              screen: 'fim',
              title: {
                type: 'str',
                value: 'Fim da luta!',
              },
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Venceu: ',
                },
                right: {
                  type: 'gk:lutaWinner',
                },
              },
              button: {
                type: 'str',
                value: 'Revanche',
              },
            },
            {
              type: 'gk:playEffect',
              fx: 'win',
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
              type: 'gk:lutaFighter',
              charVar: 'azul',
              left: 'a',
              right: 'd',
              jump: 'w',
              crouch: 's',
              guard: 'f',
              dtVar: 'dt',
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'g',
              },
              then: [
                {
                  type: 'gk:lutaAttack',
                  charVar: 'azul',
                  move: 'soco',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'h',
              },
              then: [
                {
                  type: 'gk:lutaAttack',
                  charVar: 'azul',
                  move: 'chute',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:keyPressed',
                key: 'j',
              },
              then: [
                {
                  type: 'gk:lutaAttack',
                  charVar: 'azul',
                  move: 'agarrao',
                },
              ],
            },
            {
              type: 'gk:collideGroup',
              charVar: 'azul',
              mold: 'chao',
            },
            {
              type: 'gk:collideGroup',
              charVar: 'vermelho',
              mold: 'chao',
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#241733',
              grid: false,
            },
            {
              type: 'gk:drawActive',
              mold: 'chao',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'azul',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'vermelho',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:lutaDrawHud',
            },
          ],
        },
      ],
    },
  },
}
