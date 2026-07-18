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
  description:
    'A base de jogo profissional em ação: menu, pausa (Esc), estados, tela de vitória com botão, e a mecânica escrita com blocos — pegue 5 moedas!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
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
        body: [{ type: 'gk:setState', name: 'jogando' }],
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
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          { type: 'assign', name: 'pontos', value: { type: 'num', value: 0 } },
          { type: 'gk:resetCharacter', charVar: 'heroi' },
          {
            type: 'gk:placeCharacter',
            charVar: 'moeda',
            x: { type: 'num', value: 700 },
            y: { type: 'num', value: 120 },
          },
        ],
      },
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
      { type: 'gk:start' },
    ],
  },
}

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
  description:
    'Golpeie com J e derrote 10 goblins! Eles nascem sozinhos, te perseguem e empurram; você pisca invencível ao levar dano. Moldes, spawner, combate de verdade, faíscas e missão — tudo em blocos.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
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
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'gk:resetCharacter',
            charVar: 'heroi',
          },
        ],
      },
      {
        type: 'gk:startSpawner',
        mold: 'goblin',
        seconds: {
          type: 'num',
          value: 1.2,
        },
      },
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
      {
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo bundlado: "Vila do Dragão" — o 🧙 Kit RPG inteiro numa mini-aventura
 * SEM assets (NPCs por aparência vetorial): vila em GRADE (andar célula a
 * célula, paredes), NPC com conversa que MUDA pela história (flags), item
 * (chave) que abre a PORTA da caverna (mapas), e batalha por TURNOS contra o
 * dragão com o menu pronto (Atacar/Defender/Fugir) — vitória na tela pronta.
 * Também prova o rpgCell dentro de soquete e o inventário no HUD.
 *
 * ⚠️ IR GERADA pelo parser real (o mesmo código vive no drift test) — se o
 * parser mudar a saída, re-embutir aqui.
 */
export const vilaDoDragaoExample: ExtensionExample = {
  name: 'Vila do Dragão',
  description:
    'Uma aventura de RPG com cena de abertura, batalha por turnos RICA (defesa, golpe especial, poção e XP que sobe de nível) e história: fale com o ferreiro, ganhe a chave e a poção, e derrote o dragão. Cenas, escolhas, combate de progressão — tudo em blocos.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
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
        bg: '#1c1330',
        accent: '#fbbf24',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Vila do Dragão',
        },
        text: {
          type: 'str',
          value: 'Setas andam - espaço conversa - derrote o dragão!',
        },
        button: {
          type: 'str',
          value: 'Começar a aventura',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'vitoria',
        title: {
          type: 'str',
          value: 'Vila salva!',
        },
        text: {
          type: 'str',
          value: 'O dragão foi derrotado. Você é uma lenda!',
        },
        button: {
          type: 'str',
          value: '',
        },
      },
      {
        type: 'gk:defineLook',
        name: 'ferreiro',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#8b5a2b',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 12,
            },
            y: {
              type: 'num',
              value: 24,
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
              value: '#f3c78a',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 8,
            },
            w: {
              type: 'num',
              value: 24,
            },
            h: {
              type: 'num',
              value: 20,
            },
          },
        ],
        baseW: {
          type: 'num',
          value: 64,
        },
        baseH: {
          type: 'num',
          value: 64,
        },
      },
      {
        type: 'gk:defineLook',
        name: 'dragao',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#2f9e44',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 8,
            },
            y: {
              type: 'num',
              value: 16,
            },
            w: {
              type: 'num',
              value: 48,
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
              value: '#b2f2bb',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 16,
            },
            y: {
              type: 'num',
              value: 24,
            },
            w: {
              type: 'num',
              value: 10,
            },
            h: {
              type: 'num',
              value: 10,
            },
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#e03131',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 40,
            },
            y: {
              type: 'num',
              value: 24,
            },
            w: {
              type: 'num',
              value: 8,
            },
            h: {
              type: 'num',
              value: 8,
            },
          },
        ],
        baseW: {
          type: 'num',
          value: 64,
        },
        baseH: {
          type: 'num',
          value: 64,
        },
      },
      {
        type: 'gk:rpgBattleStats',
        hp: {
          type: 'num',
          value: 30,
        },
        str: {
          type: 'num',
          value: 8,
        },
        def: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'gk:rpgSetSpecial',
        name: 'Espada flamejante',
        dmg: {
          type: 'num',
          value: 18,
        },
        cost: {
          type: 'num',
          value: 4,
        },
      },
      {
        type: 'gk:createCharacter',
        varName: 'heroi',
        image: '',
        w: {
          type: 'num',
          value: 64,
        },
        h: {
          type: 'num',
          value: 64,
        },
        speed: {
          type: 'num',
          value: 260,
        },
        color: '#4a9eff',
      },
      {
        type: 'gk:rpgOnMap',
        map: 'vila',
        body: [
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
                value: 2,
              },
            },
          },
          {
            type: 'gk:rpgBlockCell',
            cx: {
              type: 'num',
              value: 5,
            },
            cy: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'gk:rpgBlockCell',
            cx: {
              type: 'num',
              value: 5,
            },
            cy: {
              type: 'num',
              value: 2,
            },
          },
          {
            type: 'gk:rpgCreateNpc',
            name: 'ferreiro',
            cx: {
              type: 'num',
              value: 7,
            },
            cy: {
              type: 'num',
              value: 3,
            },
            image: '',
            look: 'ferreiro',
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'gk:rpgHasFlag',
                flag: 'intro',
              },
            },
            then: [
              {
                type: 'gk:rpgCutscene',
                body: [
                  {
                    type: 'gk:rpgNpcWalkTo',
                    npc: 'ferreiro',
                    cx: {
                      type: 'num',
                      value: 3,
                    },
                    cy: {
                      type: 'num',
                      value: 2,
                    },
                  },
                  {
                    type: 'gk:rpgFace',
                    npc: 'ferreiro',
                    dir: 'left',
                  },
                  {
                    type: 'gk:rpgSay',
                    text: {
                      type: 'str',
                      value: 'Ei, viajante! A vila do dragao precisa de voce.',
                    },
                    speaker: {
                      type: 'str',
                      value: 'Ferreiro',
                    },
                  },
                ],
              },
              {
                type: 'gk:rpgAddFlag',
                flag: 'intro',
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'gk:rpgHasItem',
              item: 'chave',
            },
            then: [
              {
                type: 'gk:rpgCreateDoor',
                cx: {
                  type: 'num',
                  value: 9,
                },
                cy: {
                  type: 'num',
                  value: 6,
                },
                map: 'caverna',
              },
            ],
          },
        ],
      },
      {
        type: 'gk:rpgOnMap',
        map: 'caverna',
        body: [
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: {
              type: 'gk:rpgCell',
              n: {
                type: 'num',
                value: 1,
              },
            },
            y: {
              type: 'gk:rpgCell',
              n: {
                type: 'num',
                value: 5,
              },
            },
          },
          {
            type: 'gk:rpgCreateNpc',
            name: 'dragao',
            cx: {
              type: 'num',
              value: 8,
            },
            cy: {
              type: 'num',
              value: 2,
            },
            image: '',
            look: 'dragao',
          },
          {
            type: 'gk:rpgCreateDoor',
            cx: {
              type: 'num',
              value: 0,
            },
            cy: {
              type: 'num',
              value: 5,
            },
            map: 'vila',
          },
          {
            type: 'gk:rpgOnStep',
            cx: {
              type: 'num',
              value: 4,
            },
            cy: {
              type: 'num',
              value: 5,
            },
            body: [
              {
                type: 'gk:rpgSay',
                text: {
                  type: 'str',
                  value: 'Cheiro de enxofre... o dragao esta perto!',
                },
                speaker: {
                  type: 'str',
                  value: '',
                },
              },
            ],
          },
        ],
      },
      {
        type: 'gk:rpgOnTalk',
        npc: 'ferreiro',
        body: [
          {
            type: 'if',
            cond: {
              type: 'gk:rpgHasFlag',
              flag: 'aceitou-missao',
            },
            then: [
              {
                type: 'gk:rpgSay',
                text: {
                  type: 'str',
                  value: 'A caverna fica no canto de baixo. Boa sorte!',
                },
                speaker: {
                  type: 'str',
                  value: 'Ferreiro',
                },
              },
            ],
            else: [
              {
                type: 'gk:rpgSay',
                text: {
                  type: 'str',
                  value: 'O dragão roubou o ouro da vila!',
                },
                speaker: {
                  type: 'str',
                  value: 'Ferreiro',
                },
              },
              {
                type: 'gk:rpgSay',
                text: {
                  type: 'str',
                  value: 'Tome a chave da caverna e esta poção. Só você pode nos salvar!',
                },
                speaker: {
                  type: 'str',
                  value: 'Ferreiro',
                },
              },
              {
                type: 'gk:rpgGiveItem',
                item: 'chave',
                image: '',
              },
              {
                type: 'gk:rpgGivePotion',
                name: 'Poção',
                heal: {
                  type: 'num',
                  value: 20,
                },
              },
              {
                type: 'gk:rpgAddFlag',
                flag: 'aceitou-missao',
              },
              {
                type: 'gk:rpgCreateDoor',
                cx: {
                  type: 'num',
                  value: 9,
                },
                cy: {
                  type: 'num',
                  value: 6,
                },
                map: 'caverna',
              },
            ],
          },
        ],
      },
      {
        type: 'gk:rpgOnTalk',
        npc: 'dragao',
        body: [
          {
            type: 'gk:rpgBattleStart',
            name: 'Dragão',
            hp: {
              type: 'num',
              value: 40,
            },
            str: {
              type: 'num',
              value: 6,
            },
            def: {
              type: 'num',
              value: 3,
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
                  value: 25,
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
            type: 'gk:drawBackground',
            color: '#2a1f45',
            grid: true,
          },
          {
            type: 'gk:rpgDrawNpcs',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'heroi',
          },
        ],
      },
      {
        type: 'gk:onDrawHud',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:rpgDrawInventory',
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 20,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo bundlado: "Floresta Ninja" — o combate de ACAO (estilo Zelda) sem
 * assets: o heroi anda com WASD e GOLPEIA na direcao que olha (ESPACO); dois
 * ninjas PATRULHAM perto do posto e somem numa poeira ao apanhar; coracoes no
 * HUD. Usa profundidade (sombra) e as faiscas. Complementa a batalha por TURNOS
 * do Kit RPG com o outro estilo de luta.
 *
 * A IR foi GERADA pelo parser real a partir do script achatado (o mesmo codigo
 * vive no drift test examples.test.ts — se o parser mudar a saida, re-embutir).
 */
export const florestaNinjaExample: ExtensionExample = {
  name: 'Floresta Ninja',
  description:
    'Aventura de acao: ande com WASD e GOLPEIE na direcao (ESPACO). Os ninjas patrulham e somem ao apanhar. Derrote os dois!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
      {
        type: 'gk:setup',
        w: {
          type: 'num',
          value: 800,
        },
        h: {
          type: 'num',
          value: 600,
        },
        bg: '#16281c',
        accent: '#8fe388',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Floresta Ninja',
        },
        text: {
          type: 'str',
          value: 'WASD anda, ESPACO ataca. Derrote os ninjas!',
        },
        button: {
          type: 'str',
          value: 'Começar',
        },
      },
      {
        type: 'gk:createScreen',
        name: 'vitoria',
        title: {
          type: 'str',
          value: 'Você venceu!',
        },
        text: {
          type: 'str',
          value: 'Os ninjas foram derrotados!',
        },
      },
      {
        type: 'gk:addButton',
        screen: 'vitoria',
        label: {
          type: 'str',
          value: 'Jogar de novo',
        },
        body: [
          {
            type: 'gk:setState',
            name: 'jogando',
          },
        ],
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
          value: 220,
        },
        color: '#8fe388',
      },
      {
        type: 'gk:createCharacter',
        varName: 'ninja1',
        image: '',
        w: {
          type: 'num',
          value: 36,
        },
        h: {
          type: 'num',
          value: 36,
        },
        speed: {
          type: 'num',
          value: 80,
        },
        color: '#e0526a',
      },
      {
        type: 'gk:createCharacter',
        varName: 'ninja2',
        image: '',
        w: {
          type: 'num',
          value: 36,
        },
        h: {
          type: 'num',
          value: 36,
        },
        speed: {
          type: 'num',
          value: 80,
        },
        color: '#e0526a',
      },
      {
        type: 'gk:defineEffect',
        name: 'poeira',
        count: {
          type: 'num',
          value: 14,
        },
        color: '#d9f5c8',
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
          value: 120,
        },
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: {
              type: 'num',
              value: 380,
            },
            y: {
              type: 'num',
              value: 280,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'ninja1',
            x: {
              type: 'num',
              value: 120,
            },
            y: {
              type: 'num',
              value: 120,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'ninja2',
            x: {
              type: 'num',
              value: 620,
            },
            y: {
              type: 'num',
              value: 440,
            },
          },
        ],
      },
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
            type: 'if',
            cond: {
              type: 'gk:keyPressed',
              key: ' ',
            },
            then: [
              {
                type: 'gk:attackFacing',
                charVar: 'heroi',
                range: {
                  type: 'num',
                  value: 46,
                },
                duration: {
                  type: 'num',
                  value: 0.25,
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'gk:isDead',
                charVar: 'ninja1',
              },
            },
            then: [
              {
                type: 'gk:patrolAround',
                charVar: 'ninja1',
                ox: {
                  type: 'num',
                  value: 120,
                },
                oy: {
                  type: 'num',
                  value: 120,
                },
                radius: {
                  type: 'num',
                  value: 130,
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:didHit',
                  aVar: 'heroi',
                  bVar: 'ninja1',
                },
                then: [
                  {
                    type: 'gk:hurt',
                    charVar: 'ninja1',
                    amount: {
                      type: 'num',
                      value: 5,
                    },
                    iframes: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  {
                    type: 'gk:burst',
                    effect: 'poeira',
                    x: {
                      type: 'gk:charX',
                      charVar: 'ninja1',
                    },
                    y: {
                      type: 'gk:charY',
                      charVar: 'ninja1',
                    },
                  },
                  {
                    type: 'gk:playEffect',
                    fx: 'hit',
                  },
                ],
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'gk:isDead',
                charVar: 'ninja2',
              },
            },
            then: [
              {
                type: 'gk:patrolAround',
                charVar: 'ninja2',
                ox: {
                  type: 'num',
                  value: 620,
                },
                oy: {
                  type: 'num',
                  value: 440,
                },
                radius: {
                  type: 'num',
                  value: 130,
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:didHit',
                  aVar: 'heroi',
                  bVar: 'ninja2',
                },
                then: [
                  {
                    type: 'gk:hurt',
                    charVar: 'ninja2',
                    amount: {
                      type: 'num',
                      value: 5,
                    },
                    iframes: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  {
                    type: 'gk:burst',
                    effect: 'poeira',
                    x: {
                      type: 'gk:charX',
                      charVar: 'ninja2',
                    },
                    y: {
                      type: 'gk:charY',
                      charVar: 'ninja2',
                    },
                  },
                  {
                    type: 'gk:playEffect',
                    fx: 'hit',
                  },
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
                type: 'gk:isDead',
                charVar: 'ninja1',
              },
              right: {
                type: 'gk:isDead',
                charVar: 'ninja2',
              },
            },
            then: [
              {
                type: 'gk:setState',
                name: 'vitoria',
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
            color: '#16281c',
            grid: true,
          },
          {
            type: 'gk:drawShadow',
            charVar: 'heroi',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'heroi',
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'gk:isDead',
                charVar: 'ninja1',
              },
            },
            then: [
              {
                type: 'gk:drawShadow',
                charVar: 'ninja1',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'ninja1',
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'gk:isDead',
                charVar: 'ninja2',
              },
            },
            then: [
              {
                type: 'gk:drawShadow',
                charVar: 'ninja2',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'ninja2',
              },
            ],
          },
        ],
      },
      {
        type: 'gk:onDrawHud',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:drawHearts',
            current: {
              type: 'num',
              value: 3,
            },
            max: {
              type: 'num',
              value: 3,
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 20,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo bundlado: "Salto na Floresta" — o 🏃 Kit Plataforma inteiro num
 * mini-jogo SEM assets (tudo retângulo colorido): herói tudo-em-um com o pulo
 * gostoso (coyote + buffer + pulo variável), chão sólido, tábua de atravessar
 * por baixo, plataforma que anda e CARREGA, pisar no bicho (por velocidade),
 * patrulha que vira na parede, checkpoint/renascer no buraco e faíscas.
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o mesmo
 * código vive no drift test `examples.test.ts` — se o parser mudar a saída, o
 * teste manda re-embutir aqui).
 */
export const saltoNaFlorestaExample: ExtensionExample = {
  name: 'Salto na Floresta',
  description:
    'Um jogo de plataforma de verdade: pulo gostoso (dá para pular saindo da beirada!), tábuas que se atravessa por baixo, plataforma que anda e te leva junto, e bichos que você derrota pisando. Pegue as 5 frutas!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
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
        bg: '#87ceeb',
        accent: '#e07a3f',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Salto na Floresta',
        },
        text: {
          type: 'str',
          value: 'Setas ou A/D para andar - espaço para pular - pise nos bichos!',
        },
        button: {
          type: 'str',
          value: 'Jogar',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'vitoria',
        title: {
          type: 'str',
          value: 'Você chegou!',
        },
        text: {
          type: 'str',
          value: 'Pegou as 5 frutas e chegou na bandeira!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'fim',
        title: {
          type: 'str',
          value: 'Ai!',
        },
        text: {
          type: 'str',
          value: 'Um bicho te pegou. Tente de novo!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:setJumpFeel',
        coyote: {
          type: 'num',
          value: 0.1,
        },
        buffer: {
          type: 'num',
          value: 0.1,
        },
        hold: {
          type: 'num',
          value: 0.3,
        },
        gravity: {
          type: 'num',
          value: 2160,
        },
      },
      {
        type: 'gk:defineMold',
        name: 'chao',
        w: {
          type: 'num',
          value: 200,
        },
        h: {
          type: 'num',
          value: 40,
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
        color: '#3f7d3f',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'tabua',
        w: {
          type: 'num',
          value: 120,
        },
        h: {
          type: 'num',
          value: 12,
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
        color: '#a0522d',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'movel',
        w: {
          type: 'num',
          value: 120,
        },
        h: {
          type: 'num',
          value: 16,
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
        color: '#c08040',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'bicho',
        w: {
          type: 'num',
          value: 36,
        },
        h: {
          type: 'num',
          value: 36,
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
          value: 10,
        },
        color: '#8b3a3a',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'fruta',
        w: {
          type: 'num',
          value: 22,
        },
        h: {
          type: 'num',
          value: 22,
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
        color: '#e6398b',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineEffect',
        name: 'poeira',
        count: {
          type: 'num',
          value: 10,
        },
        color: '#ffffff',
        size: {
          type: 'num',
          value: 4,
        },
        life: {
          type: 'num',
          value: 0.4,
        },
        speed: {
          type: 'num',
          value: 120,
        },
        gravity: {
          type: 'num',
          value: 300,
        },
      },
      {
        type: 'gk:createCharacter',
        varName: 'heroi',
        image: '',
        w: {
          type: 'num',
          value: 34,
        },
        h: {
          type: 'num',
          value: 46,
        },
        speed: {
          type: 'num',
          value: 240,
        },
        color: '#2b6cb0',
      },
      {
        type: 'var',
        name: 'frutas',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'assign',
            name: 'frutas',
            value: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'gk:setCheckpoint',
            x: {
              type: 'num',
              value: 60,
            },
            y: {
              type: 'num',
              value: 300,
            },
          },
          {
            type: 'gk:respawn',
            charVar: 'heroi',
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
              value: 460,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'chao',
            x: {
              type: 'num',
              value: 260,
            },
            y: {
              type: 'num',
              value: 460,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'chao',
            x: {
              type: 'num',
              value: 700,
            },
            y: {
              type: 'num',
              value: 460,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'chao',
            x: {
              type: 'num',
              value: 520,
            },
            y: {
              type: 'num',
              value: 360,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'tabua',
            x: {
              type: 'num',
              value: 210,
            },
            y: {
              type: 'num',
              value: 300,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'tabua',
            x: {
              type: 'num',
              value: 760,
            },
            y: {
              type: 'num',
              value: 260,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'movel',
            x: {
              type: 'num',
              value: 380,
            },
            y: {
              type: 'num',
              value: 380,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'bicho',
            x: {
              type: 'num',
              value: 300,
            },
            y: {
              type: 'num',
              value: 424,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'bicho',
            x: {
              type: 'num',
              value: 740,
            },
            y: {
              type: 'num',
              value: 424,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'fruta',
            x: {
              type: 'num',
              value: 240,
            },
            y: {
              type: 'num',
              value: 250,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'fruta',
            x: {
              type: 'num',
              value: 560,
            },
            y: {
              type: 'num',
              value: 310,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'fruta',
            x: {
              type: 'num',
              value: 800,
            },
            y: {
              type: 'num',
              value: 210,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'fruta',
            x: {
              type: 'num',
              value: 420,
            },
            y: {
              type: 'num',
              value: 330,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'fruta',
            x: {
              type: 'num',
              value: 120,
            },
            y: {
              type: 'num',
              value: 410,
            },
          },
        ],
      },
      {
        type: 'gk:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'gk:forEachActive',
            mold: 'movel',
            itemName: 'item',
            body: [
              {
                type: 'gk:movingPlatform',
                charVar: 'item',
                x1: {
                  type: 'num',
                  value: 380,
                },
                y1: {
                  type: 'num',
                  value: 380,
                },
                x2: {
                  type: 'num',
                  value: 620,
                },
                y2: {
                  type: 'num',
                  value: 380,
                },
                seconds: {
                  type: 'num',
                  value: 3,
                },
                dtVar: 'dt',
              },
            ],
          },
          {
            type: 'gk:forEachActive',
            mold: 'bicho',
            itemName: 'item',
            body: [
              {
                type: 'gk:patrolTurnAtWall',
                charVar: 'item',
                speed: {
                  type: 'num',
                  value: 60,
                },
              },
              {
                type: 'gk:applyGravity',
                charVar: 'item',
                g: {
                  type: 'num',
                  value: 2160,
                },
                dtVar: 'dt',
              },
              {
                type: 'gk:moveByVelocity',
                charVar: 'item',
                dtVar: 'dt',
              },
              {
                type: 'gk:collideGroup',
                charVar: 'item',
                mold: 'chao',
              },
            ],
          },
          {
            type: 'gk:platformerHero',
            charVar: 'heroi',
            speed: {
              type: 'num',
              value: 240,
            },
            force: {
              type: 'num',
              value: 660,
            },
            dtVar: 'dt',
          },
          {
            type: 'gk:dropThrough',
            charVar: 'heroi',
          },
          {
            type: 'gk:collideGroup',
            charVar: 'heroi',
            mold: 'chao',
          },
          {
            type: 'gk:oneWayPlatform',
            charVar: 'heroi',
            mold: 'tabua',
            dtVar: 'dt',
          },
          {
            type: 'gk:rideOn',
            charVar: 'heroi',
            mold: 'movel',
          },
          {
            type: 'gk:stompKill',
            charVar: 'heroi',
            mold: 'bicho',
            bounce: {
              type: 'num',
              value: 400,
            },
          },
          {
            type: 'gk:platformerAnim',
            charVar: 'heroi',
          },
          {
            type: 'gk:forEachActive',
            mold: 'fruta',
            itemName: 'item',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:charactersTouch',
                  aVar: 'heroi',
                  bVar: 'item',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'frutas',
                    value: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'var',
                        name: 'frutas',
                      },
                      right: {
                        type: 'num',
                        value: 1,
                      },
                    },
                  },
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
                ],
              },
            ],
          },
          {
            type: 'gk:forEachActive',
            mold: 'bicho',
            itemName: 'item',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:charactersTouch',
                  aVar: 'heroi',
                  bVar: 'item',
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
            type: 'if',
            cond: {
              type: 'binop',
              op: '>',
              left: {
                type: 'gk:charY',
                charVar: 'heroi',
              },
              right: {
                type: 'num',
                value: 540,
              },
            },
            then: [
              {
                type: 'gk:respawn',
                charVar: 'heroi',
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '>=',
              left: {
                type: 'var',
                name: 'frutas',
              },
              right: {
                type: 'num',
                value: 5,
              },
            },
            then: [
              {
                type: 'gk:setState',
                name: 'vitoria',
              },
            ],
          },
        ],
      },
      {
        type: 'gk:onEvent',
        event: 'plataforma:pisou',
        body: [
          {
            type: 'gk:burst',
            effect: 'poeira',
            x: {
              type: 'gk:charX',
              charVar: 'heroi',
            },
            y: {
              type: 'gk:charY',
              charVar: 'heroi',
            },
          },
        ],
      },
      {
        type: 'gk:onDraw',
        ctxName: 'ctx',
        body: [
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'SZGameKit',
            },
            method: 'drawBackground',
            args: [],
          },
          {
            type: 'gk:drawActive',
            mold: 'chao',
          },
          {
            type: 'gk:drawActive',
            mold: 'tabua',
          },
          {
            type: 'gk:drawActive',
            mold: 'movel',
          },
          {
            type: 'gk:drawActive',
            mold: 'fruta',
          },
          {
            type: 'gk:drawActive',
            mold: 'bicho',
          },
          {
            type: 'gk:drawShadow',
            charVar: 'heroi',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'heroi',
          },
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'SZGameKit',
            },
            method: 'drawEffects',
            args: [
              {
                type: 'var',
                name: 'ctx',
              },
            ],
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
            type: 'canvasFont',
            ctxVar: 'ctx',
            size: 24,
            family: 'sans-serif',
          },
          {
            type: 'canvasFillText',
            ctxVar: 'ctx',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Frutas: ',
                },
                right: {
                  type: 'var',
                  name: 'frutas',
                },
              },
              right: {
                type: 'str',
                value: '/5',
              },
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 36,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ] as ExtensionExample['ir']['js'],
  },
}

/**
 * Exemplo bundlado: "Bichinhos do Quintal" — o 👾 Kit Monstrinhos inteiro SEM um
 * único asset (as 5 criaturas são `defineLook` vetorial). Prova a tese do kit: o
 * MUNDO é o Kit RPG (grade, NPCs, fala, menu de escolha, mapa) e só a BATALHA é
 * nova. A criança encosta em todo conceito do gênero em ~10 minutos:
 *   · o TIPO importa — Brasa arrasa a Folhinha (×2) e mal arranha a Gotinha, e
 *     foi ELA quem escreveu essa regra (3 blocos de tabela);
 *   · enfraquecer antes — a bola com a vida cheia é 3× mais difícil;
 *   · trocar é estratégia — Gotinha selvagem × Fogoso → o botão Trocar aparece;
 *   · risco × segurança — Labareda 32/75% contra Brasa 20/90%;
 *   · progressão — vitórias → nível 8 → "Fogoso está evoluindo!".
 *
 * ⚠️ A IR foi GERADA pelo parser real a partir do script achatado (o mesmo código
 * vive no drift test `examples.test.ts` — se o parser mudar a saída, o teste manda
 * re-embutir aqui).
 */
export const bichinhosDoQuintalExample: ExtensionExample = {
  name: 'Bichinhos do Quintal',
  description:
    'Pegue e treine bichinhos! Ande no mato, encontre criaturas selvagens, batalhe por turnos e jogue a bola para capturar. Você inventa os bichos, os golpes e a regra de quem vence quem — pegue 3 e ganhe!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    js: [
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
        bg: '#2d5a2d',
        accent: '#e6398b',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Bichinhos do Quintal',
        },
        text: {
          type: 'str',
          value: 'Setas para andar - espaço para falar - pegue 3 bichinhos!',
        },
        button: {
          type: 'str',
          value: 'Jogar',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'vitoria',
        title: {
          type: 'str',
          value: 'Você conseguiu!',
        },
        text: {
          type: 'str',
          value: 'Pegou 3 bichinhos do quintal!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:defineLook',
        name: 'fogoso',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#e05a2b',
            },
          },
          {
            type: 'canvasBeginPath',
            ctxVar: 'ctx',
          },
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'ctx',
            },
            method: 'arc',
            args: [
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 18,
              },
              {
                type: 'num',
                value: 0,
              },
              {
                type: 'num',
                value: 6.28,
              },
            ],
          },
          {
            type: 'canvasFill',
            ctxVar: 'ctx',
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
              value: 12,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
            },
            h: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 23,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
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
        type: 'gk:defineLook',
        name: 'folhinha',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#3f9d3f',
            },
          },
          {
            type: 'canvasBeginPath',
            ctxVar: 'ctx',
          },
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'ctx',
            },
            method: 'arc',
            args: [
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 18,
              },
              {
                type: 'num',
                value: 0,
              },
              {
                type: 'num',
                value: 6.28,
              },
            ],
          },
          {
            type: 'canvasFill',
            ctxVar: 'ctx',
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
              value: 12,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
            },
            h: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 23,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
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
        type: 'gk:defineLook',
        name: 'gotinha',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#2b7de0',
            },
          },
          {
            type: 'canvasBeginPath',
            ctxVar: 'ctx',
          },
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'ctx',
            },
            method: 'arc',
            args: [
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 20,
              },
              {
                type: 'num',
                value: 18,
              },
              {
                type: 'num',
                value: 0,
              },
              {
                type: 'num',
                value: 6.28,
              },
            ],
          },
          {
            type: 'canvasFill',
            ctxVar: 'ctx',
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
              value: 12,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
            },
            h: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 23,
            },
            y: {
              type: 'num',
              value: 14,
            },
            w: {
              type: 'num',
              value: 5,
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
        type: 'gk:defineLook',
        name: 'fogozao',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#b03010',
            },
          },
          {
            type: 'canvasBeginPath',
            ctxVar: 'ctx',
          },
          {
            type: 'memberCall',
            object: {
              type: 'var',
              name: 'ctx',
            },
            method: 'arc',
            args: [
              {
                type: 'num',
                value: 24,
              },
              {
                type: 'num',
                value: 24,
              },
              {
                type: 'num',
                value: 23,
              },
              {
                type: 'num',
                value: 0,
              },
              {
                type: 'num',
                value: 6.28,
              },
            ],
          },
          {
            type: 'canvasFill',
            ctxVar: 'ctx',
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#ffcc00',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 0,
            },
            w: {
              type: 'num',
              value: 8,
            },
            h: {
              type: 'num',
              value: 10,
            },
          },
        ],
        baseW: {
          type: 'num',
          value: 48,
        },
        baseH: {
          type: 'num',
          value: 48,
        },
      },
      {
        type: 'gk:defineLook',
        name: 'heroi',
        ctxName: 'ctx',
        body: [
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#2b6cb0',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 6,
            },
            y: {
              type: 'num',
              value: 8,
            },
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#ffd9a0',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 10,
            },
            y: {
              type: 'num',
              value: 12,
            },
            w: {
              type: 'num',
              value: 20,
            },
            h: {
              type: 'num',
              value: 12,
            },
          },
        ],
        baseW: {
          type: 'num',
          value: 40,
        },
        baseH: {
          type: 'num',
          value: 48,
        },
      },
      {
        type: 'gk:pkmCreature',
        name: 'Fogoso',
        creatureType: 'fogo',
        hp: {
          type: 'num',
          value: 30,
        },
        str: {
          type: 'num',
          value: 9,
        },
        def: {
          type: 'num',
          value: 4,
        },
        spd: {
          type: 'num',
          value: 7,
        },
        image: '',
        look: 'fogoso',
      },
      {
        type: 'gk:pkmCreature',
        name: 'Folhinha',
        creatureType: 'planta',
        hp: {
          type: 'num',
          value: 34,
        },
        str: {
          type: 'num',
          value: 7,
        },
        def: {
          type: 'num',
          value: 6,
        },
        spd: {
          type: 'num',
          value: 4,
        },
        image: '',
        look: 'folhinha',
      },
      {
        type: 'gk:pkmCreature',
        name: 'Gotinha',
        creatureType: 'agua',
        hp: {
          type: 'num',
          value: 32,
        },
        str: {
          type: 'num',
          value: 8,
        },
        def: {
          type: 'num',
          value: 5,
        },
        spd: {
          type: 'num',
          value: 6,
        },
        image: '',
        look: 'gotinha',
      },
      {
        type: 'gk:pkmCreature',
        name: 'Fogozao',
        creatureType: 'fogo',
        hp: {
          type: 'num',
          value: 45,
        },
        str: {
          type: 'num',
          value: 13,
        },
        def: {
          type: 'num',
          value: 7,
        },
        spd: {
          type: 'num',
          value: 8,
        },
        image: '',
        look: 'fogozao',
      },
      {
        type: 'gk:pkmMove',
        move: 'Brasa',
        creature: 'Fogoso',
        moveType: 'fogo',
        dmg: {
          type: 'num',
          value: 20,
        },
        acc: {
          type: 'num',
          value: 90,
        },
        fx: 'bola',
        color: '#ff8800',
      },
      {
        type: 'gk:pkmMove',
        move: 'Investida',
        creature: 'Fogoso',
        moveType: 'normal',
        dmg: {
          type: 'num',
          value: 12,
        },
        acc: {
          type: 'num',
          value: 100,
        },
        fx: 'investida',
        color: '#999999',
      },
      {
        type: 'gk:pkmMove',
        move: 'Chicote',
        creature: 'Folhinha',
        moveType: 'planta',
        dmg: {
          type: 'num',
          value: 18,
        },
        acc: {
          type: 'num',
          value: 95,
        },
        fx: 'onda',
        color: '#3f9d3f',
      },
      {
        type: 'gk:pkmMove',
        move: 'Jato',
        creature: 'Gotinha',
        moveType: 'agua',
        dmg: {
          type: 'num',
          value: 18,
        },
        acc: {
          type: 'num',
          value: 95,
        },
        fx: 'bola',
        color: '#2b7de0',
      },
      {
        type: 'gk:pkmMove',
        move: 'Labareda',
        creature: 'Fogozao',
        moveType: 'fogo',
        dmg: {
          type: 'num',
          value: 32,
        },
        acc: {
          type: 'num',
          value: 75,
        },
        fx: 'raio',
        color: '#ff4400',
      },
      {
        type: 'gk:pkmTypeChart',
        atk: 'fogo',
        def: 'planta',
        mult: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'gk:pkmTypeChart',
        atk: 'planta',
        def: 'agua',
        mult: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'gk:pkmTypeChart',
        atk: 'agua',
        def: 'fogo',
        mult: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'gk:pkmEvolve',
        from: 'Fogoso',
        to: 'Fogozao',
        level: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'gk:pkmCatchDifficulty',
        creature: 'Gotinha',
        level: 'difícil',
      },
      {
        type: 'gk:pkmEncounterRate',
        percent: {
          type: 'num',
          value: 20,
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
          value: 48,
        },
        speed: {
          type: 'num',
          value: 200,
        },
        color: '#2b6cb0',
      },
      {
        type: 'gk:rpgOnMap',
        map: 'quintal',
        body: [
          {
            type: 'gk:rpgCreateNpc',
            name: 'Cora',
            cx: {
              type: 'num',
              value: 3,
            },
            cy: {
              type: 'num',
              value: 3,
            },
            image: '',
            look: 'heroi',
          },
          {
            type: 'gk:rpgCreateNpc',
            name: 'Enfermeira',
            cx: {
              type: 'num',
              value: 12,
            },
            cy: {
              type: 'num',
              value: 3,
            },
            image: '',
            look: 'heroi',
          },
          {
            type: 'gk:pkmGrassCells',
            x1: {
              type: 'num',
              value: 5,
            },
            y1: {
              type: 'num',
              value: 6,
            },
            x2: {
              type: 'num',
              value: 13,
            },
            y2: {
              type: 'num',
              value: 10,
            },
          },
          {
            type: 'gk:pkmWild',
            creature: 'Folhinha',
            min: {
              type: 'num',
              value: 3,
            },
            max: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'gk:pkmWild',
            creature: 'Gotinha',
            min: {
              type: 'num',
              value: 3,
            },
            max: {
              type: 'num',
              value: 6,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: {
              type: 'num',
              value: 128,
            },
            y: {
              type: 'num',
              value: 128,
            },
          },
        ],
      },
      {
        type: 'gk:rpgOnTalk',
        npc: 'Cora',
        body: [
          {
            type: 'if',
            cond: {
              type: 'gk:rpgHasFlag',
              flag: 'ganhou-inicial',
            },
            then: [
              {
                type: 'gk:rpgMenu',
                title: {
                  type: 'str',
                  value: 'Quer mais bolas?',
                },
                body: [
                  {
                    type: 'gk:rpgOption',
                    label: {
                      type: 'str',
                      value: 'Sim',
                    },
                    body: [
                      {
                        type: 'gk:pkmGiveBall',
                        count: {
                          type: 'num',
                          value: 3,
                        },
                        power: {
                          type: 'num',
                          value: 60,
                        },
                      },
                    ],
                  },
                  {
                    type: 'gk:rpgOption',
                    label: {
                      type: 'str',
                      value: 'Não',
                    },
                    body: [],
                  },
                ],
              },
            ],
            else: [
              {
                type: 'gk:rpgSay',
                text: {
                  type: 'str',
                  value: 'Leve o Fogoso e 5 bolas! Pegue 3 bichinhos no quintal!',
                },
                speaker: {
                  type: 'str',
                  value: 'Cora',
                },
              },
              {
                type: 'gk:pkmGive',
                creature: 'Fogoso',
                level: {
                  type: 'num',
                  value: 5,
                },
              },
              {
                type: 'gk:pkmGiveBall',
                count: {
                  type: 'num',
                  value: 5,
                },
                power: {
                  type: 'num',
                  value: 60,
                },
              },
              {
                type: 'gk:rpgAddFlag',
                flag: 'ganhou-inicial',
              },
            ],
          },
        ],
      },
      {
        type: 'gk:rpgOnTalk',
        npc: 'Enfermeira',
        body: [
          {
            type: 'gk:rpgSay',
            text: {
              type: 'str',
              value: 'Deixe comigo!',
            },
            speaker: {
              type: 'str',
              value: 'Enfermeira',
            },
          },
          {
            type: 'gk:pkmHealTeam',
          },
        ],
      },
      {
        type: 'gk:rpgOnBattleEnd',
        body: [
          {
            type: 'if',
            cond: {
              type: 'gk:pkmCaught',
            },
            then: [
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '>=',
                  left: {
                    type: 'gk:pkmTeamSize',
                  },
                  right: {
                    type: 'num',
                    value: 4,
                  },
                },
                then: [
                  {
                    type: 'gk:setState',
                    name: 'vitoria',
                  },
                ],
              },
            ],
          },
        ],
      },
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
            type: 'gk:drawBackground',
            color: '#2d5a2d',
            grid: false,
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#4a8c4a',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 320,
            },
            y: {
              type: 'num',
              value: 384,
            },
            w: {
              type: 'num',
              value: 576,
            },
            h: {
              type: 'num',
              value: 320,
            },
          },
          {
            type: 'gk:drawByDepth',
            charVar: 'heroi',
          },
        ],
      },
      {
        type: 'gk:onDrawHud',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:pkmDrawTeam',
            x: {
              type: 'num',
              value: 10,
            },
            y: {
              type: 'num',
              value: 10,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ] as ExtensionExample['ir']['js'],
  },
}

/**
 * 🛸 "Invasão dos Óvnis" — a vitrine do 🚀 Kit Nave (asset-free: tudo retângulo
 * colorido). Usa os 8 blocos do kit + o juice do R21 (texto flutuante, leque) e
 * mostra a lição da dificuldade: onda:limpa → velocidade × 1.2 → nova onda.
 *
 * ⚠️ A IR foi GERADA pelo parser real (one-off); o drift vive no examples.test.ts.
 */
export const invasaoDosOvnisExample: ExtensionExample = {
  name: 'Invasão dos Óvnis',
  description:
    'O clássico de nave com o Kit Nave: a formação marcha, desce e acelera; um óvni sorteado atira; power-up de metralhadora, bomba que explode em área e placar com vidas. Não deixe a invasão chegar embaixo!',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    js: [
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
        bg: '#0b1020',
        accent: '#7cc7ff',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Invasão dos Óvnis',
        },
        text: {
          type: 'str',
          value: 'Setas ou A/D movem - espaço atira - não deixe descerem!',
        },
        button: {
          type: 'str',
          value: 'Jogar',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'fim',
        title: {
          type: 'str',
          value: 'Fim de jogo',
        },
        text: {
          type: 'str',
          value: 'Os óvnis venceram desta vez. Tente de novo!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:defineMold',
        name: 'ovni',
        w: {
          type: 'num',
          value: 44,
        },
        h: {
          type: 'num',
          value: 32,
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
          value: 10,
        },
        color: '#5ad66f',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'tiro',
        w: {
          type: 'num',
          value: 6,
        },
        h: {
          type: 'num',
          value: 16,
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
        color: '#ffe066',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'tiro-ovni',
        w: {
          type: 'num',
          value: 4,
        },
        h: {
          type: 'num',
          value: 12,
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
          value: 10,
        },
        color: '#ffffff',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'bomba',
        w: {
          type: 'num',
          value: 24,
        },
        h: {
          type: 'num',
          value: 24,
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
        color: '#ff922b',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineEffect',
        name: 'explosao',
        count: {
          type: 'num',
          value: 16,
        },
        color: '#9775fa',
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
          value: 200,
        },
        gravity: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'gk:createCharacter',
        varName: 'nave',
        image: '',
        w: {
          type: 'num',
          value: 52,
        },
        h: {
          type: 'num',
          value: 28,
        },
        speed: {
          type: 'num',
          value: 420,
        },
        color: '#7cc7ff',
      },
      {
        type: 'var',
        name: 'pontos',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'var',
        name: 'vidas',
        value: {
          type: 'num',
          value: 3,
        },
      },
      {
        type: 'var',
        name: 'velocidade',
        value: {
          type: 'num',
          value: 150,
        },
      },
      {
        type: 'gk:naveInvasionLine',
        y: {
          type: 'num',
          value: 430,
        },
      },
      {
        type: 'gk:naveWaveShooter',
        mold: 'ovni',
        seconds: {
          type: 'num',
          value: 1.5,
        },
        bullet: 'tiro-ovni',
        speed: {
          type: 'num',
          value: 300,
        },
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'assign',
            name: 'pontos',
            value: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'assign',
            name: 'vidas',
            value: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'assign',
            name: 'velocidade',
            value: {
              type: 'num',
              value: 150,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'nave',
            x: {
              type: 'num',
              value: 454,
            },
            y: {
              type: 'num',
              value: 480,
            },
          },
          {
            type: 'gk:naveWave',
            mold: 'ovni',
            cols: {
              type: 'num',
              value: 8,
            },
            rows: {
              type: 'num',
              value: 3,
            },
            gap: {
              type: 'num',
              value: 60,
            },
            speed: {
              type: 'var',
              name: 'velocidade',
            },
            drop: {
              type: 'num',
              value: 30,
            },
            accel: {
              type: 'num',
              value: 15,
            },
          },
        ],
      },
      {
        type: 'gk:onEvent',
        event: 'onda:limpa',
        body: [
          {
            type: 'assign',
            name: 'velocidade',
            value: {
              type: 'binop',
              op: '*',
              left: {
                type: 'var',
                name: 'velocidade',
              },
              right: {
                type: 'num',
                value: 1.2,
              },
            },
          },
          {
            type: 'gk:naveWave',
            mold: 'ovni',
            cols: {
              type: 'num',
              value: 8,
            },
            rows: {
              type: 'num',
              value: 3,
            },
            gap: {
              type: 'num',
              value: 60,
            },
            speed: {
              type: 'var',
              name: 'velocidade',
            },
            drop: {
              type: 'num',
              value: 30,
            },
            accel: {
              type: 'num',
              value: 15,
            },
          },
          {
            type: 'gk:playEffect',
            fx: 'win',
          },
        ],
      },
      {
        type: 'gk:onEvent',
        event: 'onda:invadiu',
        body: [
          {
            type: 'gk:endGame',
          },
        ],
      },
      {
        type: 'gk:onEvent',
        event: 'bomba:acertou',
        body: [
          {
            type: 'assign',
            name: 'pontos',
            value: {
              type: 'binop',
              op: '+',
              left: {
                type: 'var',
                name: 'pontos',
              },
              right: {
                type: 'num',
                value: 50,
              },
            },
          },
        ],
      },
      {
        type: 'gk:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'gk:naveShip',
            charVar: 'nave',
            speed: {
              type: 'num',
              value: 420,
            },
            lean: {
              type: 'num',
              value: 10,
            },
            dtVar: 'dt',
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '===',
              left: {
                type: 'gk:navePowerOf',
                charVar: 'nave',
              },
              right: {
                type: 'str',
                value: 'metralhadora',
              },
            },
            then: [
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'gk:keyDown',
                    key: ' ',
                  },
                  right: {
                    type: 'gk:cooldownReady',
                    charVar: 'nave',
                    seconds: {
                      type: 'num',
                      value: 0.12,
                    },
                  },
                },
                then: [
                  {
                    type: 'gk:fanShot',
                    charVar: 'nave',
                    mold: 'tiro',
                    count: {
                      type: 'num',
                      value: 1,
                    },
                    arc: {
                      type: 'num',
                      value: 0,
                    },
                    degrees: {
                      type: 'num',
                      value: -90,
                    },
                    speed: {
                      type: 'num',
                      value: 600,
                    },
                  },
                  {
                    type: 'gk:playEffect',
                    fx: 'laser',
                  },
                ],
              },
            ],
            elseif: [
              {
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'gk:navePowerOf',
                    charVar: 'nave',
                  },
                  right: {
                    type: 'str',
                    value: 'leque',
                  },
                },
                then: [
                  {
                    type: 'if',
                    cond: {
                      type: 'logical',
                      op: '&&',
                      left: {
                        type: 'gk:keyPressed',
                        key: ' ',
                      },
                      right: {
                        type: 'gk:cooldownReady',
                        charVar: 'nave',
                        seconds: {
                          type: 'num',
                          value: 0.35,
                        },
                      },
                    },
                    then: [
                      {
                        type: 'gk:fanShot',
                        charVar: 'nave',
                        mold: 'tiro',
                        count: {
                          type: 'num',
                          value: 5,
                        },
                        arc: {
                          type: 'num',
                          value: 40,
                        },
                        degrees: {
                          type: 'num',
                          value: -90,
                        },
                        speed: {
                          type: 'num',
                          value: 600,
                        },
                      },
                      {
                        type: 'gk:playEffect',
                        fx: 'laser',
                      },
                    ],
                  },
                ],
              },
            ],
            else: [
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'gk:keyPressed',
                    key: ' ',
                  },
                  right: {
                    type: 'gk:cooldownReady',
                    charVar: 'nave',
                    seconds: {
                      type: 'num',
                      value: 0.35,
                    },
                  },
                },
                then: [
                  {
                    type: 'gk:fanShot',
                    charVar: 'nave',
                    mold: 'tiro',
                    count: {
                      type: 'num',
                      value: 1,
                    },
                    arc: {
                      type: 'num',
                      value: 0,
                    },
                    degrees: {
                      type: 'num',
                      value: -90,
                    },
                    speed: {
                      type: 'num',
                      value: 600,
                    },
                  },
                  {
                    type: 'gk:playEffect',
                    fx: 'laser',
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:forEachActive',
            mold: 'tiro',
            itemName: 'item',
            body: [
              {
                type: 'gk:moveByVelocity',
                charVar: 'item',
                dtVar: 'dt',
              },
            ],
          },
          {
            type: 'gk:forEachActive',
            mold: 'tiro-ovni',
            itemName: 'item',
            body: [
              {
                type: 'gk:moveByVelocity',
                charVar: 'item',
                dtVar: 'dt',
              },
            ],
          },
          {
            type: 'gk:cullOffscreen',
            mold: 'tiro',
            margin: {
              type: 'num',
              value: 100,
            },
          },
          {
            type: 'gk:cullOffscreen',
            mold: 'tiro-ovni',
            margin: {
              type: 'num',
              value: 100,
            },
          },
          {
            type: 'gk:overlapGroups',
            aName: 'a',
            moldA: 'tiro',
            bName: 'b',
            moldB: 'ovni',
            body: [
              {
                type: 'gk:recycle',
                charVar: 'a',
              },
              {
                type: 'gk:burst',
                effect: 'explosao',
                x: {
                  type: 'gk:charX',
                  charVar: 'b',
                },
                y: {
                  type: 'gk:charY',
                  charVar: 'b',
                },
              },
              {
                type: 'gk:floatText',
                text: {
                  type: 'str',
                  value: '+100',
                },
                x: {
                  type: 'gk:charX',
                  charVar: 'b',
                },
                y: {
                  type: 'gk:charY',
                  charVar: 'b',
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 22,
                },
              },
              {
                type: 'assign',
                name: 'pontos',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'pontos',
                  },
                  right: {
                    type: 'num',
                    value: 100,
                  },
                },
              },
              {
                type: 'gk:playEffect',
                fx: 'explosion',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:chance',
                  percent: {
                    type: 'num',
                    value: 8,
                  },
                },
                then: [
                  {
                    type: 'gk:navePowerup',
                    charVar: 'nave',
                    power: 'metralhadora',
                    seconds: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  {
                    type: 'gk:floatText',
                    text: {
                      type: 'str',
                      value: 'METRALHADORA!',
                    },
                    x: {
                      type: 'gk:charX',
                      charVar: 'b',
                    },
                    y: {
                      type: 'gk:charY',
                      charVar: 'b',
                    },
                    color: '#ffe066',
                    size: {
                      type: 'num',
                      value: 20,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:chance',
                  percent: {
                    type: 'num',
                    value: 5,
                  },
                },
                then: [
                  {
                    type: 'gk:naveBomb',
                    mold: 'bomba',
                    radius: {
                      type: 'num',
                      value: 160,
                    },
                    target: 'ovni',
                  },
                ],
              },
              {
                type: 'gk:recycle',
                charVar: 'b',
              },
            ],
          },
          {
            type: 'gk:forEachActive',
            mold: 'tiro-ovni',
            itemName: 'item',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:charactersTouch',
                  aVar: 'item',
                  bVar: 'nave',
                },
                then: [
                  {
                    type: 'gk:recycle',
                    charVar: 'item',
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'logicalNot',
                      value: {
                        type: 'gk:isInvincible',
                        charVar: 'nave',
                      },
                    },
                    then: [
                      {
                        type: 'gk:hurt',
                        charVar: 'nave',
                        amount: {
                          type: 'num',
                          value: 0,
                        },
                        iframes: {
                          type: 'num',
                          value: 1.5,
                        },
                      },
                      {
                        type: 'assign',
                        name: 'vidas',
                        value: {
                          type: 'binop',
                          op: '-',
                          left: {
                            type: 'var',
                            name: 'vidas',
                          },
                          right: {
                            type: 'num',
                            value: 1,
                          },
                        },
                      },
                      {
                        type: 'gk:cameraShake',
                        intensity: {
                          type: 'num',
                          value: 6,
                        },
                        seconds: {
                          type: 'num',
                          value: 0.3,
                        },
                      },
                      {
                        type: 'gk:playEffect',
                        fx: 'hurt',
                      },
                      {
                        type: 'gk:floatText',
                        text: {
                          type: 'str',
                          value: '-1 vida',
                        },
                        x: {
                          type: 'gk:charX',
                          charVar: 'nave',
                        },
                        y: {
                          type: 'gk:charY',
                          charVar: 'nave',
                        },
                        color: '#ff6b6b',
                        size: {
                          type: 'num',
                          value: 20,
                        },
                      },
                      {
                        type: 'if',
                        cond: {
                          type: 'binop',
                          op: '<=',
                          left: {
                            type: 'var',
                            name: 'vidas',
                          },
                          right: {
                            type: 'num',
                            value: 0,
                          },
                        },
                        then: [
                          {
                            type: 'gk:endGame',
                          },
                        ],
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
        type: 'gk:onDraw',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:drawBackground',
            color: '#0b1020',
            grid: false,
          },
          {
            type: 'gk:naveStarfield',
            count: {
              type: 'num',
              value: 100,
            },
            speed: {
              type: 'num',
              value: 20,
            },
          },
          {
            type: 'gk:drawActive',
            mold: 'ovni',
          },
          {
            type: 'gk:drawActive',
            mold: 'tiro',
          },
          {
            type: 'gk:drawActive',
            mold: 'tiro-ovni',
          },
          {
            type: 'gk:drawActive',
            mold: 'bomba',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'nave',
          },
          {
            type: 'gk:drawEffects',
          },
        ],
      },
      {
        type: 'gk:onDrawHud',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:drawHearts',
            current: {
              type: 'var',
              name: 'vidas',
            },
            max: {
              type: 'num',
              value: 3,
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 20,
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
            type: 'canvasFont',
            ctxVar: 'ctx',
            size: 24,
            family: 'sans-serif',
          },
          {
            type: 'canvasFillText',
            ctxVar: 'ctx',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'str',
                value: 'Pontos: ',
              },
              right: {
                type: 'var',
                name: 'pontos',
              },
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 70,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ],
  },
}

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
    js: [
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
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
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
      },
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
      {
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo "Defesa do Reino" (🏰 Kit Defesa de Torre — R26): a IR embutida foi
 * GERADA pelo parser real a partir do SOURCE do teste (one-off do R26).
 */
export const defesaDoReinoExample: ExtensionExample = {
  name: 'Defesa do Reino',
  description:
    'Defenda o castelo com o Kit Defesa de Torre: clique nos lugares para comprar torres (elas miram sozinhas o invasor mais avançado no caminho), some moedas a cada inimigo derrotado e segure as ondas — cada uma vem maior. Deixou 5 passarem? O reino cai.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    js: [
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
        bg: '#26331f',
        accent: '#ffd166',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Defesa do Reino',
        },
        text: {
          type: 'str',
          value: 'Clique nos lugares para comprar torres - não deixe os invasores passarem!',
        },
        button: {
          type: 'str',
          value: 'Defender',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'fim',
        title: {
          type: 'str',
          value: 'O reino caiu!',
        },
        text: {
          type: 'str',
          value: 'Os invasores passaram. Tente de novo!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:defineMold',
        name: 'invasor',
        w: {
          type: 'num',
          value: 34,
        },
        h: {
          type: 'num',
          value: 34,
        },
        health: {
          type: 'num',
          value: 30,
        },
        speed: {
          type: 'num',
          value: 0,
        },
        damage: {
          type: 'num',
          value: 0,
        },
        color: '#e0526a',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'torre',
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
        color: '#4a9eff',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineMold',
        name: 'tiro',
        w: {
          type: 'num',
          value: 10,
        },
        h: {
          type: 'num',
          value: 10,
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
        color: '#ffe066',
        image: '',
        look: '',
      },
      {
        type: 'gk:defineEffect',
        name: 'estouro',
        count: {
          type: 'num',
          value: 12,
        },
        color: '#ffd166',
        size: {
          type: 'num',
          value: 4,
        },
        life: {
          type: 'num',
          value: 0.4,
        },
        speed: {
          type: 'num',
          value: 160,
        },
        gravity: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'gk:createCharacter',
        varName: 'castelo',
        image: '',
        w: {
          type: 'num',
          value: 44,
        },
        h: {
          type: 'num',
          value: 64,
        },
        speed: {
          type: 'num',
          value: 0,
        },
        color: '#f4a259',
      },
      {
        type: 'var',
        name: 'vidas',
        value: {
          type: 'num',
          value: 5,
        },
      },
      {
        type: 'var',
        name: 'leva',
        value: {
          type: 'num',
          value: 3,
        },
      },
      {
        type: 'gk:definePath',
        name: 'trilha',
        body: [
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: -40,
            },
            y: {
              type: 'num',
              value: 120,
            },
          },
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: 300,
            },
            y: {
              type: 'num',
              value: 120,
            },
          },
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: 300,
            },
            y: {
              type: 'num',
              value: 400,
            },
          },
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: 660,
            },
            y: {
              type: 'num',
              value: 400,
            },
          },
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: 660,
            },
            y: {
              type: 'num',
              value: 200,
            },
          },
          {
            type: 'gk:pathPoint',
            x: {
              type: 'num',
              value: 1000,
            },
            y: {
              type: 'num',
              value: 200,
            },
          },
        ],
      },
      {
        type: 'gk:tdSetCoins',
        n: {
          type: 'num',
          value: 100,
        },
      },
      {
        type: 'gk:tdSlot',
        x: {
          type: 'num',
          value: 300,
        },
        y: {
          type: 'num',
          value: 220,
        },
        size: {
          type: 'num',
          value: 60,
        },
      },
      {
        type: 'gk:tdSlot',
        x: {
          type: 'num',
          value: 420,
        },
        y: {
          type: 'num',
          value: 300,
        },
        size: {
          type: 'num',
          value: 60,
        },
      },
      {
        type: 'gk:tdSlot',
        x: {
          type: 'num',
          value: 560,
        },
        y: {
          type: 'num',
          value: 320,
        },
        size: {
          type: 'num',
          value: 60,
        },
      },
      {
        type: 'gk:tdSlot',
        x: {
          type: 'num',
          value: 660,
        },
        y: {
          type: 'num',
          value: 120,
        },
        size: {
          type: 'num',
          value: 60,
        },
      },
      {
        type: 'gk:tdOnBuy',
        cost: {
          type: 'num',
          value: 50,
        },
        xName: 'lugarX',
        yName: 'lugarY',
        body: [
          {
            type: 'gk:spawnFromMold',
            mold: 'torre',
            x: {
              type: 'binop',
              op: '-',
              left: {
                type: 'var',
                name: 'lugarX',
              },
              right: {
                type: 'num',
                value: 20,
              },
            },
            y: {
              type: 'binop',
              op: '-',
              left: {
                type: 'var',
                name: 'lugarY',
              },
              right: {
                type: 'num',
                value: 20,
              },
            },
          },
          {
            type: 'gk:playEffect',
            fx: 'click',
          },
        ],
      },
      {
        type: 'gk:onEvent',
        event: 'compra:negada',
        body: [
          {
            type: 'gk:floatText',
            text: {
              type: 'str',
              value: 'sem moedas!',
            },
            x: {
              type: 'gk:mouseX',
            },
            y: {
              type: 'gk:mouseY',
            },
            color: '#ff6b6b',
            size: {
              type: 'num',
              value: 20,
            },
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
              left: {
                type: 'var',
                name: 'vidas',
              },
              right: {
                type: 'num',
                value: 1,
              },
            },
          },
          {
            type: 'gk:cameraShake',
            intensity: {
              type: 'num',
              value: 6,
            },
            seconds: {
              type: 'num',
              value: 0.3,
            },
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '<=',
              left: {
                type: 'var',
                name: 'vidas',
              },
              right: {
                type: 'num',
                value: 0,
              },
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
        type: 'gk:onEvent',
        event: 'onda:limpa',
        body: [
          {
            type: 'assign',
            name: 'leva',
            value: {
              type: 'binop',
              op: '+',
              left: {
                type: 'var',
                name: 'leva',
              },
              right: {
                type: 'num',
                value: 2,
              },
            },
          },
          {
            type: 'gk:tdAddCoins',
            n: {
              type: 'num',
              value: 25,
            },
          },
          {
            type: 'gk:tdWave',
            path: 'trilha',
            count: {
              type: 'var',
              name: 'leva',
            },
            mold: 'invasor',
            gap: {
              type: 'num',
              value: 150,
            },
            speed: {
              type: 'num',
              value: 90,
            },
          },
        ],
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'assign',
            name: 'vidas',
            value: {
              type: 'num',
              value: 5,
            },
          },
          {
            type: 'assign',
            name: 'leva',
            value: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'castelo',
            x: {
              type: 'num',
              value: 936,
            },
            y: {
              type: 'num',
              value: 168,
            },
          },
          {
            type: 'gk:tdWave',
            path: 'trilha',
            count: {
              type: 'var',
              name: 'leva',
            },
            mold: 'invasor',
            gap: {
              type: 'num',
              value: 150,
            },
            speed: {
              type: 'num',
              value: 90,
            },
          },
        ],
      },
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
                  seconds: {
                    type: 'num',
                    value: 0.8,
                  },
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
                    cond: {
                      type: 'var',
                      name: 'alvo',
                    },
                    then: [
                      {
                        type: 'if',
                        cond: {
                          type: 'binop',
                          op: '<',
                          left: {
                            type: 'gk:distanceBetween',
                            a: 'torre',
                            b: 'alvo',
                          },
                          right: {
                            type: 'num',
                            value: 220,
                          },
                        },
                        then: [
                          {
                            type: 'gk:spawnNamed',
                            varName: 'tiro',
                            mold: 'tiro',
                            x: {
                              type: 'gk:charX',
                              charVar: 'torre',
                            },
                            y: {
                              type: 'gk:charY',
                              charVar: 'torre',
                            },
                          },
                          {
                            type: 'gk:launchTowards',
                            charVar: 'tiro',
                            targetVar: 'alvo',
                            speed: {
                              type: 'num',
                              value: 420,
                            },
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
            body: [
              {
                type: 'gk:moveByVelocity',
                charVar: 'item',
                dtVar: 'dt',
              },
            ],
          },
          {
            type: 'gk:cullOffscreen',
            mold: 'tiro',
            margin: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:overlapGroups',
            aName: 't',
            moldA: 'tiro',
            bName: 'inv',
            moldB: 'invasor',
            body: [
              {
                type: 'gk:recycle',
                charVar: 't',
              },
              {
                type: 'gk:hurt',
                charVar: 'inv',
                amount: {
                  type: 'num',
                  value: 15,
                },
                iframes: {
                  type: 'num',
                  value: 0,
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:isDead',
                  charVar: 'inv',
                },
                then: [
                  {
                    type: 'gk:burst',
                    effect: 'estouro',
                    x: {
                      type: 'gk:charX',
                      charVar: 'inv',
                    },
                    y: {
                      type: 'gk:charY',
                      charVar: 'inv',
                    },
                  },
                  {
                    type: 'gk:tdAddCoins',
                    n: {
                      type: 'num',
                      value: 10,
                    },
                  },
                  {
                    type: 'gk:floatText',
                    text: {
                      type: 'str',
                      value: '+10',
                    },
                    x: {
                      type: 'gk:charX',
                      charVar: 'inv',
                    },
                    y: {
                      type: 'gk:charY',
                      charVar: 'inv',
                    },
                    color: '#ffd166',
                    size: {
                      type: 'num',
                      value: 20,
                    },
                  },
                  {
                    type: 'gk:recycle',
                    charVar: 'inv',
                  },
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
          {
            type: 'gk:drawBackground',
            color: '#26331f',
            grid: true,
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#4a4028',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: -40,
            },
            y: {
              type: 'num',
              value: 102,
            },
            w: {
              type: 'num',
              value: 340,
            },
            h: {
              type: 'num',
              value: 36,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 282,
            },
            y: {
              type: 'num',
              value: 102,
            },
            w: {
              type: 'num',
              value: 36,
            },
            h: {
              type: 'num',
              value: 316,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 282,
            },
            y: {
              type: 'num',
              value: 382,
            },
            w: {
              type: 'num',
              value: 396,
            },
            h: {
              type: 'num',
              value: 36,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 642,
            },
            y: {
              type: 'num',
              value: 182,
            },
            w: {
              type: 'num',
              value: 36,
            },
            h: {
              type: 'num',
              value: 236,
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'num',
              value: 642,
            },
            y: {
              type: 'num',
              value: 182,
            },
            w: {
              type: 'num',
              value: 358,
            },
            h: {
              type: 'num',
              value: 36,
            },
          },
          {
            type: 'gk:tdDrawSlots',
          },
          {
            type: 'gk:forEachActive',
            mold: 'torre',
            itemName: 'torre',
            body: [
              {
                type: 'gk:tdDrawRange',
                charVar: 'torre',
                radius: {
                  type: 'num',
                  value: 220,
                },
              },
            ],
          },
          {
            type: 'gk:drawActive',
            mold: 'torre',
          },
          {
            type: 'gk:drawActive',
            mold: 'invasor',
          },
          {
            type: 'gk:drawActive',
            mold: 'tiro',
          },
          {
            type: 'gk:forEachActive',
            mold: 'invasor',
            itemName: 'inv',
            body: [
              {
                type: 'gk:drawHealthBar',
                charVar: 'inv',
                max: {
                  type: 'num',
                  value: 0,
                },
              },
            ],
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'castelo',
          },
        ],
      },
      {
        type: 'gk:onDrawHud',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:drawHearts',
            current: {
              type: 'var',
              name: 'vidas',
            },
            max: {
              type: 'num',
              value: 5,
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 20,
            },
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#ffd166',
            },
          },
          {
            type: 'canvasFont',
            ctxVar: 'ctx',
            size: 24,
            family: 'sans-serif',
          },
          {
            type: 'canvasFillText',
            ctxVar: 'ctx',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'str',
                value: 'Moedas: ',
              },
              right: {
                type: 'gk:tdCoins',
              },
            },
            x: {
              type: 'num',
              value: 20,
            },
            y: {
              type: 'num',
              value: 70,
            },
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo "Reino Aberto" (🌍 mundo aberto — R27): a IR embutida foi GERADA pelo
 * parser real a partir do SOURCE do teste (one-off). Mostra os DOIS jeitos de
 * mundo aberto: 4 mapas ligados pelas bordas (estilo Zelda, 2×2) e a vila MAIOR
 * que a tela com a câmera clampando pelo "Este mapa tem".
 */
export const reinoAbertoExample: ExtensionExample = {
  name: 'Reino Aberto',
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
    js: [
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
      {
        type: 'gk:rpgOnMap',
        map: 'campo',
        body: [
          {
            type: 'gk:rpgMapSize',
            cols: { type: 'num', value: 15 },
            rows: { type: 'num', value: 10 },
          },
          { type: 'gk:rpgConnectEdge', side: 'leste', map: 'praia' },
          { type: 'gk:rpgConnectEdge', side: 'sul', map: 'bosque' },
          { type: 'gk:rpgBlockCell', cx: { type: 'num', value: 5 }, cy: { type: 'num', value: 4 } },
          { type: 'gk:rpgBlockCell', cx: { type: 'num', value: 6 }, cy: { type: 'num', value: 4 } },
          { type: 'gk:rpgBlockCell', cx: { type: 'num', value: 9 }, cy: { type: 'num', value: 6 } },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: { type: 'gk:rpgCell', n: { type: 'num', value: 2 } },
            y: { type: 'gk:rpgCell', n: { type: 'num', value: 2 } },
          },
        ],
      },
      {
        type: 'gk:rpgOnMap',
        map: 'praia',
        body: [
          {
            type: 'gk:rpgMapSize',
            cols: { type: 'num', value: 15 },
            rows: { type: 'num', value: 10 },
          },
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
        type: 'gk:rpgOnMap',
        map: 'bosque',
        body: [
          {
            type: 'gk:rpgMapSize',
            cols: { type: 'num', value: 15 },
            rows: { type: 'num', value: 10 },
          },
          { type: 'gk:rpgConnectEdge', side: 'norte', map: 'campo' },
          { type: 'gk:rpgConnectEdge', side: 'leste', map: 'vila' },
          { type: 'gk:rpgBlockCell', cx: { type: 'num', value: 4 }, cy: { type: 'num', value: 4 } },
          { type: 'gk:rpgBlockCell', cx: { type: 'num', value: 4 }, cy: { type: 'num', value: 5 } },
          {
            type: 'gk:rpgBlockCell',
            cx: { type: 'num', value: 10 },
            cy: { type: 'num', value: 3 },
          },
        ],
      },
      {
        type: 'gk:rpgOnMap',
        map: 'vila',
        body: [
          {
            type: 'gk:rpgMapSize',
            cols: { type: 'num', value: 30 },
            rows: { type: 'num', value: 20 },
          },
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
            text: { type: 'str', value: 'Bem-vindo à vila GRANDE — repare a câmera te seguindo!' },
            speaker: { type: 'str', value: 'Prefeita' },
          },
        ],
      },
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
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'gk:cameraFollow',
            charVar: 'heroi',
            w: { type: 'num', value: 960 },
            h: { type: 'num', value: 640 },
          },
        ],
      },
      {
        type: 'gk:onDraw',
        ctxName: 'ctx',
        body: [
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '===',
              left: { type: 'gk:rpgCurrentMap' },
              right: { type: 'str', value: 'praia' },
            },
            then: [{ type: 'gk:drawBackground', color: '#2b4a63', grid: true }],
            elseif: [
              {
                cond: {
                  type: 'binop',
                  op: '===',
                  left: { type: 'gk:rpgCurrentMap' },
                  right: { type: 'str', value: 'bosque' },
                },
                then: [{ type: 'gk:drawBackground', color: '#173317', grid: true }],
              },
              {
                cond: {
                  type: 'binop',
                  op: '===',
                  left: { type: 'gk:rpgCurrentMap' },
                  right: { type: 'str', value: 'vila' },
                },
                then: [{ type: 'gk:drawBackground', color: '#4a3c2b', grid: true }],
              },
            ],
            else: [{ type: 'gk:drawBackground', color: '#2d5a2d', grid: true }],
          },
          { type: 'gk:rpgDrawNpcs' },
          { type: 'gk:drawCharacter', charVar: 'heroi' },
        ],
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
      { type: 'gk:start' },
    ],
  },
}

/**
 * Exemplo "Batalha em Equipe" (⚔️ batalha em equipe): a IR embutida foi GERADA
 * pelo parser real a partir do SOURCE do teste (one-off). Fale com o Capitão para
 * abrir a batalha em EQUIPE no canvas — herói + Curandeira contra dois bandidos —
 * com clique/seleção, painel de info e painel de ação (golpes nomeados).
 */
export const batalhaEmEquipeExample: ExtensionExample = {
  name: 'Batalha em Equipe',
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
    js: [
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
      {
        type: 'gk:rpgOnMap',
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
        body: [
          { type: 'gk:drawBackground', color: '#2d3a2d', grid: true },
          { type: 'gk:rpgDrawNpcs' },
          { type: 'gk:drawCharacter', charVar: 'heroi' },
        ],
      },
      { type: 'gk:start' },
    ],
  },
}

/**
 * Exemplo "Meu primeiro jogo" (R29): a MENOR coisa jogável — um personagem que
 * anda com as setas, fundo e nada mais. É a ponte entre "começar do zero" (vazio)
 * e os exemplos completos. Ensina a receita (preparar → criar → a cada quadro →
 * desenhar → começar) e que o jogo abre no MENU (clique Jogar). IR do parser (one-off).
 */
export const meuPrimeiroJogoExample: ExtensionExample = {
  name: 'Meu primeiro jogo',
  description:
    'O comecinho de tudo: um personagem que anda com as SETAS, e só. Clique em Jogar no menu para começar. É a base de QUALQUER jogo — a partir daqui, adicione o que quiser (inimigos, pontos, telas). Abra e mexa à vontade.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    js: [
      {
        type: 'gk:setup',
        w: { type: 'num', value: 800 },
        h: { type: 'num', value: 600 },
        bg: '#1e2a3a',
        accent: '#ffd166',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: { type: 'str', value: 'Meu primeiro jogo' },
        text: { type: 'str', value: 'Use as SETAS para andar. Clique em Jogar para comecar!' },
        button: { type: 'str', value: 'Jogar' },
      },
      {
        type: 'gk:createCharacter',
        varName: 'heroi',
        image: '',
        w: { type: 'num', value: 48 },
        h: { type: 'num', value: 48 },
        speed: { type: 'num', value: 260 },
        color: '#4ade80',
      },
      {
        type: 'gk:onUpdate',
        dtName: 'dt',
        body: [
          { type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' },
          { type: 'gk:keepOnScreen', charVar: 'heroi' },
        ],
      },
      {
        type: 'gk:onDraw',
        ctxName: 'ctx',
        body: [
          { type: 'gk:drawBackground', color: '#1e2a3a', grid: true },
          { type: 'gk:drawCharacter', charVar: 'heroi' },
        ],
      },
      { type: 'gk:start' },
    ],
  },
}

/**
 * Exemplo "Cobrinha" 🐍 (R29): a vitrine do 🧩 Tabuleiro. A grade guarda, em cada
 * celula, por quantos PASSOS ela ainda e corpo (a cabeca marca `tamanho`, tudo
 * decai 1/passo, 0 = vazio) — Snake SEM lista, so com boardGet/boardSet + os lacos
 * do nucleo. Comer a maca aumenta `tamanho`. IR do parser (one-off), asset-free.
 */
export const cobrinhaExample: ExtensionExample = {
  name: 'Cobrinha',
  description:
    'A cobrinha classica montada num 🧩 Tabuleiro: cada celula guarda por quantos passos faz parte do corpo. Vire com as SETAS, coma as macas e cresca. Bateu na parede ou no proprio corpo, perdeu. Prova o primitivo de grade (sem lista, sem magica).',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    js: [
      {
        type: 'gk:setup',
        w: {
          type: 'num',
          value: 640,
        },
        h: {
          type: 'num',
          value: 640,
        },
        bg: '#0b160b',
        accent: '#4ade80',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Cobrinha',
        },
        text: {
          type: 'str',
          value: 'Use as SETAS para virar. Coma as macas e cresca!',
        },
        button: {
          type: 'str',
          value: 'Jogar',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'fim',
        title: {
          type: 'str',
          value: 'Perdeu!',
        },
        text: {
          type: 'str',
          value: 'A cobra bateu. Tente de novo!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'var',
        name: 'cabecaCol',
        value: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'var',
        name: 'cabecaLin',
        value: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'var',
        name: 'dirCol',
        value: {
          type: 'num',
          value: 1,
        },
      },
      {
        type: 'var',
        name: 'dirLin',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'var',
        name: 'tamanho',
        value: {
          type: 'num',
          value: 4,
        },
      },
      {
        type: 'var',
        name: 'macaCol',
        value: {
          type: 'num',
          value: 12,
        },
      },
      {
        type: 'var',
        name: 'macaLin',
        value: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'gk:boardCreate',
            name: 'cobra',
            cols: {
              type: 'num',
              value: 16,
            },
            rows: {
              type: 'num',
              value: 16,
            },
            empty: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'assign',
            name: 'cabecaCol',
            value: {
              type: 'num',
              value: 8,
            },
          },
          {
            type: 'assign',
            name: 'cabecaLin',
            value: {
              type: 'num',
              value: 8,
            },
          },
          {
            type: 'assign',
            name: 'dirCol',
            value: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'assign',
            name: 'dirLin',
            value: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'assign',
            name: 'tamanho',
            value: {
              type: 'num',
              value: 4,
            },
          },
          {
            type: 'assign',
            name: 'macaCol',
            value: {
              type: 'num',
              value: 12,
            },
          },
          {
            type: 'assign',
            name: 'macaLin',
            value: {
              type: 'num',
              value: 8,
            },
          },
          {
            type: 'gk:boardSet',
            name: 'cobra',
            value: {
              type: 'var',
              name: 'tamanho',
            },
            col: {
              type: 'var',
              name: 'cabecaCol',
            },
            row: {
              type: 'var',
              name: 'cabecaLin',
            },
          },
        ],
      },
      {
        type: 'gk:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'if',
            cond: {
              type: 'gk:keyPressed',
              key: 'arrowleft',
            },
            then: [
              {
                type: 'assign',
                name: 'dirCol',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'num',
                    value: 0,
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
              },
              {
                type: 'assign',
                name: 'dirLin',
                value: {
                  type: 'num',
                  value: 0,
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'gk:keyPressed',
              key: 'arrowright',
            },
            then: [
              {
                type: 'assign',
                name: 'dirCol',
                value: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'assign',
                name: 'dirLin',
                value: {
                  type: 'num',
                  value: 0,
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'gk:keyPressed',
              key: 'arrowup',
            },
            then: [
              {
                type: 'assign',
                name: 'dirCol',
                value: {
                  type: 'num',
                  value: 0,
                },
              },
              {
                type: 'assign',
                name: 'dirLin',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'num',
                    value: 0,
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'gk:keyPressed',
              key: 'arrowdown',
            },
            then: [
              {
                type: 'assign',
                name: 'dirCol',
                value: {
                  type: 'num',
                  value: 0,
                },
              },
              {
                type: 'assign',
                name: 'dirLin',
                value: {
                  type: 'num',
                  value: 1,
                },
              },
            ],
          },
          {
            type: 'gk:everySeconds',
            seconds: {
              type: 'num',
              value: 0.16,
            },
            body: [
              {
                type: 'assign',
                name: 'cabecaCol',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'cabecaCol',
                  },
                  right: {
                    type: 'var',
                    name: 'dirCol',
                  },
                },
              },
              {
                type: 'assign',
                name: 'cabecaLin',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'cabecaLin',
                  },
                  right: {
                    type: 'var',
                    name: 'dirLin',
                  },
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:boardIn',
                  name: 'cobra',
                  col: {
                    type: 'var',
                    name: 'cabecaCol',
                  },
                  row: {
                    type: 'var',
                    name: 'cabecaLin',
                  },
                },
                then: [
                  {
                    type: 'if',
                    cond: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'gk:boardGet',
                        name: 'cobra',
                        col: {
                          type: 'var',
                          name: 'cabecaCol',
                        },
                        row: {
                          type: 'var',
                          name: 'cabecaLin',
                        },
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    then: [
                      {
                        type: 'gk:endGame',
                      },
                    ],
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'binop',
                      op: '===',
                      left: {
                        type: 'var',
                        name: 'cabecaCol',
                      },
                      right: {
                        type: 'var',
                        name: 'macaCol',
                      },
                    },
                    then: [
                      {
                        type: 'if',
                        cond: {
                          type: 'binop',
                          op: '===',
                          left: {
                            type: 'var',
                            name: 'cabecaLin',
                          },
                          right: {
                            type: 'var',
                            name: 'macaLin',
                          },
                        },
                        then: [
                          {
                            type: 'assign',
                            name: 'tamanho',
                            value: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'var',
                                name: 'tamanho',
                              },
                              right: {
                                type: 'num',
                                value: 1,
                              },
                            },
                          },
                          {
                            type: 'assign',
                            name: 'macaCol',
                            value: {
                              type: 'mathUnary',
                              fn: 'floor',
                              arg: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'randomFloat',
                                },
                                right: {
                                  type: 'num',
                                  value: 16,
                                },
                              },
                            },
                          },
                          {
                            type: 'assign',
                            name: 'macaLin',
                            value: {
                              type: 'mathUnary',
                              fn: 'floor',
                              arg: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'randomFloat',
                                },
                                right: {
                                  type: 'num',
                                  value: 16,
                                },
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'forRange',
                    varName: 'coluna',
                    from: {
                      type: 'num',
                      value: 0,
                    },
                    to: {
                      type: 'num',
                      value: 16,
                    },
                    step: {
                      type: 'num',
                      value: 1,
                    },
                    body: [
                      {
                        type: 'forRange',
                        varName: 'linha',
                        from: {
                          type: 'num',
                          value: 0,
                        },
                        to: {
                          type: 'num',
                          value: 16,
                        },
                        step: {
                          type: 'num',
                          value: 1,
                        },
                        body: [
                          {
                            type: 'if',
                            cond: {
                              type: 'binop',
                              op: '>',
                              left: {
                                type: 'gk:boardGet',
                                name: 'cobra',
                                col: {
                                  type: 'var',
                                  name: 'coluna',
                                },
                                row: {
                                  type: 'var',
                                  name: 'linha',
                                },
                              },
                              right: {
                                type: 'num',
                                value: 0,
                              },
                            },
                            then: [
                              {
                                type: 'gk:boardSet',
                                name: 'cobra',
                                value: {
                                  type: 'binop',
                                  op: '-',
                                  left: {
                                    type: 'gk:boardGet',
                                    name: 'cobra',
                                    col: {
                                      type: 'var',
                                      name: 'coluna',
                                    },
                                    row: {
                                      type: 'var',
                                      name: 'linha',
                                    },
                                  },
                                  right: {
                                    type: 'num',
                                    value: 1,
                                  },
                                },
                                col: {
                                  type: 'var',
                                  name: 'coluna',
                                },
                                row: {
                                  type: 'var',
                                  name: 'linha',
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'gk:boardSet',
                    name: 'cobra',
                    value: {
                      type: 'var',
                      name: 'tamanho',
                    },
                    col: {
                      type: 'var',
                      name: 'cabecaCol',
                    },
                    row: {
                      type: 'var',
                      name: 'cabecaLin',
                    },
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
      },
      {
        type: 'gk:onDraw',
        ctxName: 'ctx',
        body: [
          {
            type: 'gk:drawBackground',
            color: '#0b160b',
            grid: true,
          },
          {
            type: 'canvasFillStyle',
            ctxVar: 'ctx',
            color: {
              type: 'color',
              value: '#ef4444',
            },
          },
          {
            type: 'canvasFillRect',
            ctxVar: 'ctx',
            x: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'var',
                  name: 'macaCol',
                },
                right: {
                  type: 'num',
                  value: 40,
                },
              },
              right: {
                type: 'num',
                value: 4,
              },
            },
            y: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'var',
                  name: 'macaLin',
                },
                right: {
                  type: 'num',
                  value: 40,
                },
              },
              right: {
                type: 'num',
                value: 4,
              },
            },
            w: {
              type: 'num',
              value: 32,
            },
            h: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'forRange',
            varName: 'coluna',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 16,
            },
            step: {
              type: 'num',
              value: 1,
            },
            body: [
              {
                type: 'forRange',
                varName: 'linha',
                from: {
                  type: 'num',
                  value: 0,
                },
                to: {
                  type: 'num',
                  value: 16,
                },
                step: {
                  type: 'num',
                  value: 1,
                },
                body: [
                  {
                    type: 'if',
                    cond: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'gk:boardGet',
                        name: 'cobra',
                        col: {
                          type: 'var',
                          name: 'coluna',
                        },
                        row: {
                          type: 'var',
                          name: 'linha',
                        },
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    then: [
                      {
                        type: 'canvasFillStyle',
                        ctxVar: 'ctx',
                        color: {
                          type: 'color',
                          value: '#4ade80',
                        },
                      },
                      {
                        type: 'canvasFillRect',
                        ctxVar: 'ctx',
                        x: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'var',
                              name: 'coluna',
                            },
                            right: {
                              type: 'num',
                              value: 40,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        y: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'var',
                              name: 'linha',
                            },
                            right: {
                              type: 'num',
                              value: 40,
                            },
                          },
                          right: {
                            type: 'num',
                            value: 2,
                          },
                        },
                        w: {
                          type: 'num',
                          value: 36,
                        },
                        h: {
                          type: 'num',
                          value: 36,
                        },
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
        type: 'gk:start',
      },
    ],
  },
}

/**
 * Exemplo "Quebra-blocos" 🧱 (R29): a vitrine da raquete (paddleBounce). A bola
 * anda por velocidade, quica nas bordas e REBATE na raquete com o angulo pelo ponto
 * de impacto; os blocos sao um enxame e o toque recolhe + inverte o vy. Breakout
 * inteiro montado com pecas neutras. IR do parser (one-off), asset-free.
 */
export const quebraBlocosExample: ExtensionExample = {
  name: 'Quebra-blocos',
  description:
    'Breakout na unha: a bola anda, quica nas paredes e REBATE na raquete (o angulo muda pelo ponto que bateu). Mova a raquete com as SETAS e derrube todos os blocos. Prova a peca Rebater na raquete + quicar nas bordas.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    js: [
      {
        type: 'gk:setup',
        w: {
          type: 'num',
          value: 800,
        },
        h: {
          type: 'num',
          value: 600,
        },
        bg: '#0b1020',
        accent: '#22d3ee',
      },
      {
        type: 'gk:setScreenText',
        screen: 'menu',
        title: {
          type: 'str',
          value: 'Quebra-blocos',
        },
        text: {
          type: 'str',
          value: 'Mova a raquete com as SETAS. Nao deixe a bola cair!',
        },
        button: {
          type: 'str',
          value: 'Jogar',
        },
      },
      {
        type: 'gk:setScreenText',
        screen: 'fim',
        title: {
          type: 'str',
          value: 'A bola caiu!',
        },
        text: {
          type: 'str',
          value: 'Tente de novo!',
        },
        button: {
          type: 'str',
          value: 'Jogar de novo',
        },
      },
      {
        type: 'gk:createCharacter',
        varName: 'raquete',
        image: '',
        w: {
          type: 'num',
          value: 120,
        },
        h: {
          type: 'num',
          value: 18,
        },
        speed: {
          type: 'num',
          value: 520,
        },
        color: '#22d3ee',
      },
      {
        type: 'gk:createCharacter',
        varName: 'bola',
        image: '',
        w: {
          type: 'num',
          value: 16,
        },
        h: {
          type: 'num',
          value: 16,
        },
        speed: {
          type: 'num',
          value: 0,
        },
        color: '#fde047',
      },
      {
        type: 'gk:defineMold',
        name: 'bloco',
        w: {
          type: 'num',
          value: 72,
        },
        h: {
          type: 'num',
          value: 24,
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
        color: '#f472b6',
        image: '',
        look: '',
      },
      {
        type: 'gk:onEnterState',
        name: 'jogando',
        body: [
          {
            type: 'gk:placeCharacter',
            charVar: 'raquete',
            x: {
              type: 'num',
              value: 340,
            },
            y: {
              type: 'num',
              value: 540,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'bola',
            x: {
              type: 'num',
              value: 392,
            },
            y: {
              type: 'num',
              value: 300,
            },
          },
          {
            type: 'gk:setVelocity',
            charVar: 'bola',
            vx: {
              type: 'num',
              value: 220,
            },
            vy: {
              type: 'num',
              value: 260,
            },
          },
          {
            type: 'forRange',
            varName: 'linha',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 3,
            },
            step: {
              type: 'num',
              value: 1,
            },
            body: [
              {
                type: 'forRange',
                varName: 'coluna',
                from: {
                  type: 'num',
                  value: 0,
                },
                to: {
                  type: 'num',
                  value: 9,
                },
                step: {
                  type: 'num',
                  value: 1,
                },
                body: [
                  {
                    type: 'gk:spawnFromMold',
                    mold: 'bloco',
                    x: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'num',
                        value: 40,
                      },
                      right: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'coluna',
                        },
                        right: {
                          type: 'num',
                          value: 84,
                        },
                      },
                    },
                    y: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'num',
                        value: 80,
                      },
                      right: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'linha',
                        },
                        right: {
                          type: 'num',
                          value: 36,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'gk:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'if',
            cond: {
              type: 'gk:keyDown',
              key: 'arrowleft',
            },
            then: [
              {
                type: 'gk:setProperty',
                charVar: 'raquete',
                prop: 'x',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'gk:propertyOf',
                    charVar: 'raquete',
                    prop: 'x',
                  },
                  right: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'num',
                      value: 520,
                    },
                    right: {
                      type: 'var',
                      name: 'dt',
                    },
                  },
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'gk:keyDown',
              key: 'arrowright',
            },
            then: [
              {
                type: 'gk:setProperty',
                charVar: 'raquete',
                prop: 'x',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'gk:propertyOf',
                    charVar: 'raquete',
                    prop: 'x',
                  },
                  right: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'num',
                      value: 520,
                    },
                    right: {
                      type: 'var',
                      name: 'dt',
                    },
                  },
                },
              },
            ],
          },
          {
            type: 'gk:keepOnScreen',
            charVar: 'raquete',
          },
          {
            type: 'gk:moveByVelocity',
            charVar: 'bola',
            dtVar: 'dt',
          },
          {
            type: 'gk:bounceOnEdges',
            charVar: 'bola',
          },
          {
            type: 'gk:paddleBounce',
            ballVar: 'bola',
            paddleVar: 'raquete',
          },
          {
            type: 'gk:forEachActive',
            mold: 'bloco',
            itemName: 'item',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:charactersTouch',
                  aVar: 'bola',
                  bVar: 'item',
                },
                then: [
                  {
                    type: 'gk:recycle',
                    charVar: 'item',
                  },
                  {
                    type: 'gk:setVelocity',
                    charVar: 'bola',
                    vx: {
                      type: 'gk:velocityOf',
                      charVar: 'bola',
                      axis: 'x',
                    },
                    vy: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'num',
                        value: 0,
                      },
                      right: {
                        type: 'gk:velocityOf',
                        charVar: 'bola',
                        axis: 'y',
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '>',
              left: {
                type: 'gk:propertyOf',
                charVar: 'bola',
                prop: 'y',
              },
              right: {
                type: 'gk:gameHeight',
              },
            },
            then: [
              {
                type: 'gk:endGame',
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '<=',
              left: {
                type: 'gk:countActive',
                mold: 'bloco',
              },
              right: {
                type: 'num',
                value: 0,
              },
            },
            then: [
              {
                type: 'gk:setState',
                name: 'vitoria',
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
            color: '#0b1020',
            grid: false,
          },
          {
            type: 'gk:drawActive',
            mold: 'bloco',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'raquete',
          },
          {
            type: 'gk:drawCharacter',
            charVar: 'bola',
          },
        ],
      },
      {
        type: 'gk:start',
      },
    ],
  },
}
