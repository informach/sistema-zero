import type { ExtensionExample } from '#extensions'
import {
  beginnerGameExample,
  EXAMPLE_HERO_IMAGE,
  EXAMPLE_HERO_WALK_SHEET,
  EXAMPLE_TILESET_IMAGE,
} from './shared'

/**
 * Exemplo bundlado: "Pong simples". Carregado pelo painel de extensões via
 * botão "Carregar exemplo". Substitui a IR atual do projeto.
 */
export const pongExample: ExtensionExample = beginnerGameExample({
  name: 'Pong simples',
  experience: 'game',
  description: 'Primeiro a 5 pontos vence: mova a raquete com as setas e rebata a bola.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #22d3ee', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 20,
          y: 130,
          w: 12,
          h: 40,
          color: '#22d3ee',
        },
        {
          type: 'g2d:createSprite',
          varName: 'computador',
          x: 368,
          y: 130,
          w: 12,
          h: 40,
          color: '#f472b6',
        },
        {
          type: 'g2d:createSprite',
          varName: 'bola',
          x: 190,
          y: 140,
          w: 12,
          h: 12,
          color: '#fbbf24',
        },
        {
          type: 'g2d:setVelocity',
          spriteVar: 'bola',
          vx: { type: 'num', value: 3 },
          vy: { type: 'num', value: 2 },
        },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'var', name: 'pontosComputador', value: { type: 'num', value: 0 } },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Pong simples',
                  subtitle: 'Use as setas para mover a raquete azul. O primeiro a 5 pontos vence!',
                  hint: 'Aperte Enter para começar',
                  bg: '#11172a',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 },
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'jogador' },
                  name: 'x',
                  value: { type: 'num', value: 20 },
                },
                { type: 'g2d:clampToScreen', spriteVar: 'jogador', ctxVar: 'ctx' },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                    right: {
                      type: 'memberGet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'computador' },
                          name: 'y',
                        },
                        right: { type: 'num', value: 2.5 },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                    right: {
                      type: 'memberGet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'computador' },
                          name: 'y',
                        },
                        right: { type: 'num', value: 2.5 },
                      },
                    },
                  ],
                },
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'computador' },
                  name: 'x',
                  value: { type: 'num', value: 368 },
                },
                { type: 'g2d:clampToScreen', spriteVar: 'computador', ctxVar: 'ctx' },
                { type: 'g2d:applyVelocity', spriteVar: 'bola' },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '||',
                    left: {
                      type: 'binop',
                      op: '<=',
                      left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                      right: { type: 'num', value: 0 },
                    },
                    right: {
                      type: 'binop',
                      op: '>=',
                      left: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'y',
                        },
                        right: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'h',
                        },
                      },
                      right: { type: 'num', value: 300 },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vy',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'vy',
                        },
                        right: { type: 'num', value: -1 },
                      },
                    },
                  ],
                },
                { type: 'g2d:collides', aVar: 'jogador', bVar: 'bola', varName: 'bateuJogador' },
                {
                  type: 'if',
                  cond: { type: 'var', name: 'bateuJogador' },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: {
                        type: 'mathUnary',
                        fn: 'abs',
                        arg: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'vx',
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:collides',
                  aVar: 'computador',
                  bVar: 'bola',
                  varName: 'bateuComputador',
                },
                {
                  type: 'if',
                  cond: { type: 'var', name: 'bateuComputador' },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'memberGet',
                            object: { type: 'var', name: 'bola' },
                            name: 'vx',
                          },
                        },
                        right: { type: 'num', value: -1 },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'x' },
                    right: { type: 'num', value: -12 },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosComputador',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontosComputador' },
                        right: { type: 'num', value: 1 },
                      },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'x',
                      value: { type: 'num', value: 194 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'y',
                      value: { type: 'num', value: 144 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: { type: 'num', value: 3 },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'x' },
                    right: { type: 'num', value: 400 },
                  },
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
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'x',
                      value: { type: 'num', value: 194 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'y',
                      value: { type: 'num', value: 144 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: { type: 'num', value: -3 },
                    },
                  ],
                },
                { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'computador', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Você:',
                  value: { type: 'var', name: 'pontos' },
                  x: 120,
                  y: 28,
                  color: '#22d3ee',
                  size: 20,
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Computador:',
                  value: { type: 'var', name: 'pontosComputador' },
                  x: 230,
                  y: 28,
                  color: '#f472b6',
                  size: 20,
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontos' },
                    right: { type: 'num', value: 5 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'vitoria' }],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontosComputador' },
                    right: { type: 'num', value: 5 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'derrota' }],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Você venceu!',
                  subtitle: 'Chegou a 5 pontos primeiro.',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#063018',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Fim de jogo',
                  subtitle: 'O computador chegou a 5 pontos.',
                  hint: 'Aperte Enter para tentar de novo',
                  bg: '#300a0a',
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo "Herói que anda": sprite com imagem da biblioteca + animação de
 * spritesheet, movido pelas setas. Os nomes de asset (`heroi`, `heroi-andando`)
 * casam com os dois assets mínimos embutidos no próprio cartão.
 */
export const animatedHeroExample: ExtensionExample = beginnerGameExample({
  name: 'Herói que anda',
  experience: 'demo',
  description: 'Sprite com imagem + animação de spritesheet, movido pelas setas.',
  assets: [
    {
      id: 'example-hero',
      name: 'heroi',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_IMAGE,
      width: 32,
      height: 32,
      source: 'library',
      libId: 'example-hero',
    },
    {
      id: 'example-hero-walk',
      name: 'heroi-andando',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_WALK_SHEET,
      width: 128,
      height: 32,
      source: 'library',
      libId: 'example-hero-walk',
    },
  ],
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #f472b6', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createImageSprite',
          varName: 'heroi',
          x: 180,
          y: 130,
          w: 48,
          h: 48,
          image: 'heroi',
        },
        {
          type: 'g2d:loadSpritesheet',
          varName: 'andar',
          image: 'heroi-andando',
          frameW: 32,
          frameH: 32,
        },
        {
          type: 'g2d:animateSprite',
          spriteVar: 'heroi',
          sheetVar: 'andar',
          from: 0,
          to: 3,
          fps: 8,
        },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: 'Use as setas para andar e ver a animação.',
              x: 200,
              y: 286,
              color: '#e2e8f0',
              size: 14,
              align: 'center',
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo "Mini plataforma" (v0.4.0): herói que anda com esquerda/direita, pula
 * com gravidade e não sai da tela. Setas para mover/pular. Sprite colorido (não
 * depende de asset) para o exemplo funcionar sozinho.
 */
export const platformerExample: ExtensionExample = beginnerGameExample({
  name: 'Mini plataforma',
  experience: 'demo',
  description: 'Herói que anda, pula com gravidade e fica preso na tela (setas).',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 200 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #4ade80', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 20,
          y: 120,
          w: 36,
          h: 36,
          color: '#4ade80',
        },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
            { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: '← → para andar · ↑ para pular',
              x: 160,
              y: 190,
              color: '#e2e8f0',
              size: 14,
              align: 'center',
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo "Sala com paredes" (v0.5.0): um mapa de tiles (chão + paredes) com um
 * herói que anda nas 4 direções pelas setas e NÃO atravessa as paredes (tiles
 * sólidos). Embute uma folha mínima (chão = 0, parede = 1) e o herói.
 */
export const tilemapExample: ExtensionExample = beginnerGameExample({
  name: 'Sala com paredes',
  experience: 'demo',
  description: 'Mapa de tiles com paredes que o herói não atravessa (setas para andar).',
  assets: [
    {
      id: 'example-room-tileset',
      name: 'tileset',
      kind: 'image',
      dataUrl: EXAMPLE_TILESET_IMAGE,
      width: 64,
      height: 32,
      source: 'library',
      libId: 'example-room-tileset',
    },
    {
      id: 'example-room-hero',
      name: 'heroi',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_IMAGE,
      width: 32,
      height: 32,
      source: 'library',
      libId: 'example-room-hero',
    },
  ],
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 256 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #f472b6', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createTileMap',
          varName: 'mapa',
          image: 'tileset',
          tile: 32,
          solid: '1',
          grid: '1 1 1 1 1 1 1 1 1 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 1 1 0 0 0 1;1 0 0 0 1 1 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 1 1 1 1 1 1 1 1 1',
        },
        {
          type: 'g2d:createImageSprite',
          varName: 'heroi',
          x: 48,
          y: 48,
          w: 28,
          h: 28,
          image: 'heroi',
        },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawTileMap', mapVar: 'mapa', ctxVar: 'ctx', x: 0, y: 0 },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
            { type: 'g2d:tileMapCollide', spriteVar: 'heroi', mapVar: 'mapa' },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: 'Use as setas e tente atravessar as paredes.',
              x: 160,
              y: 246,
              color: '#f8fafc',
              size: 13,
              align: 'center',
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
