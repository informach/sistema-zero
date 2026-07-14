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
    'Uma aventura de RPG: fale com o ferreiro (espaço), ganhe a chave, atravesse a porta da caverna e vença o dragão na batalha por turnos. Grade, NPCs, história e mapas — tudo em blocos.',
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
                  value: 'Tome a chave da caverna. Só você pode nos salvar!',
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
