import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Arena dos Goblins" — a arquitetura P24 inteira num jogo de
 * AÇÃO que roda SEM assets (goblin desenhado por aparência VETORIAL; som
 * sintetizado). O herói ATACA com J (golpe = keyPressed + touchCircle + hurt no
 * goblin), o goblin morre por dano (isDead → burst + recycle + emit) e o dano
 * recebido passa pelo gate de invencibilidade do P24 (touchCircle E NÃO
 * isInvincible → hurt + knockback + som). Cobre: aparência com tamanho-base,
 * molde + spawner + enxame, comportamentos (seek/face), combate completo,
 * faíscas, event bus, missão (derrote 10 OU sobreviva 60 s → tela de vitória
 * PRONTA), barra de vida automática (0 = vida máxima) e Canvas do núcleo dentro
 * da aparência (prova o ctxVar).
 *
 * ⚠️ IR GERADA pelo parser real (o mesmo código vive no drift test) — se o parser
 * mudar a saída, re-embutir aqui.
 */
export const arenaGoblinsExample: ExtensionExample = {
  name: 'Arena dos Goblins',
  experience: 'game',
  description:
    'Golpeie com J e derrote 10 goblins! Eles nascem sozinhos, te perseguem e empurram; você pisca invencível ao levar dano. Moldes, spawner, combate de verdade, faíscas e missão — tudo em blocos.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'gk:defineLook',
          name: 'goblin',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e94f4f',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 40,
              },
              h: {
                type: 'num',
                value: 40,
              },
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
                value: 26,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 6,
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
          type: 'gk:defineMold',
          name: 'goblin',
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
          },
          health: {
            type: 'num',
            value: 20,
          },
          speed: {
            type: 'num',
            value: 120,
          },
          damage: {
            type: 'num',
            value: 10,
          },
          color: '#e94f4f',
          image: '',
          look: 'goblin',
        },
        {
          type: 'gk:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 14,
          },
          color: '#caa977',
          size: {
            type: 'num',
            value: 4,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          speed: {
            type: 'num',
            value: 180,
          },
          gravity: {
            type: 'num',
            value: 260,
          },
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
          bg: '#12203a',
          accent: '#4a9eff',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Arena dos Goblins',
          },
          text: {
            type: 'str',
            value: 'WASD anda - J golpeia - derrote 10!',
          },
          button: {
            type: 'str',
            value: 'Entrar na arena',
          },
        },
        {
          type: 'gk:setMission',
          seconds: {
            type: 'num',
            value: 60,
          },
          killCount: {
            type: 'num',
            value: 10,
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
            value: 300,
          },
          color: '#4a9eff',
        },
        {
          type: 'gk:resetCharacter',
          charVar: 'heroi',
        },
        {
          type: 'gk:startSpawner',
          mold: 'goblin',
          seconds: {
            type: 'num',
            value: 1.2,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'inimigo:morreu',
          body: [
            {
              type: 'gk:missionKill',
            },
            {
              type: 'gk:playEffect',
              fx: 'explosion',
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
              type: 'gk:moveWithKeys',
              charVar: 'heroi',
              dtVar: 'dt',
            },
            {
              type: 'gk:keepOnScreen',
              charVar: 'heroi',
            },
            {
              type: 'gk:forEachActive',
              mold: 'goblin',
              itemName: 'item',
              body: [
                {
                  type: 'gk:seek',
                  charVar: 'item',
                  targetVar: 'heroi',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:face',
                  charVar: 'item',
                  targetVar: 'heroi',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:keyPressed',
                      key: 'j',
                    },
                    right: {
                      type: 'gk:touchCircle',
                      aVar: 'heroi',
                      bVar: 'item',
                    },
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'item',
                      amount: {
                        type: 'num',
                        value: 10,
                      },
                      iframes: {
                        type: 'num',
                        value: 0.2,
                      },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'item',
                      fromVar: 'heroi',
                      force: {
                        type: 'num',
                        value: 300,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'hit',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:isDead',
                    charVar: 'item',
                  },
                  then: [
                    {
                      type: 'gk:burst',
                      effect: 'poeira',
                      x: {
                        type: 'gk:charX',
                        charVar: 'item',
                      },
                      y: {
                        type: 'gk:charY',
                        charVar: 'item',
                      },
                    },
                    {
                      type: 'gk:recycle',
                      charVar: 'item',
                    },
                    {
                      type: 'gk:emit',
                      event: 'inimigo:morreu',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'gk:touchCircle',
                      aVar: 'item',
                      bVar: 'heroi',
                    },
                    right: {
                      type: 'logicalNot',
                      value: {
                        type: 'gk:isInvincible',
                        charVar: 'heroi',
                      },
                    },
                  },
                  then: [
                    {
                      type: 'gk:hurt',
                      charVar: 'heroi',
                      amount: {
                        type: 'num',
                        value: 10,
                      },
                      iframes: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    {
                      type: 'gk:knockback',
                      charVar: 'heroi',
                      fromVar: 'item',
                      force: {
                        type: 'num',
                        value: 400,
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'hurt',
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'goblin',
              margin: {
                type: 'num',
                value: 200,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'gk:isDead',
                charVar: 'heroi',
              },
              then: [
                {
                  type: 'gk:endGame',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#0f3460',
              grid: true,
            },
            {
              type: 'gk:drawActive',
              mold: 'goblin',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawEffects',
            },
            {
              type: 'gk:drawHealthBar',
              charVar: 'heroi',
              max: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'gk:drawTimer',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 40,
              },
            },
          ],
        },
      ],
    },
  },
}
