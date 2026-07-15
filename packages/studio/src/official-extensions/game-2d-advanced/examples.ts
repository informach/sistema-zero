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
