import type { ExtensionExample } from '#extensions'
import {
  beginnerGameExample,
  EXAMPLE_BACKDROP_IMAGE,
  EXAMPLE_HERO_IMAGE,
  EXAMPLE_HERO_WALK_SHEET,
  EXAMPLE_TILESET_IMAGE,
} from './shared'

/**
 * Exemplo "Herói que anda": sprite com imagem da biblioteca + animação de
 * spritesheet, movido pelas setas. Os nomes de asset (`heroi`, `heroi-andando`)
 * casam com os dois assets mínimos embutidos no próprio cartão.
 */
/**
 * Exemplo "Cenário do meu desenho": o desenho da criança virando o fundo do
 * jogo. Existe porque o caminho Pinta → Estúdio não tinha receita nenhuma de
 * "pôr o meu desenho de fundo" e o Zappy não sabia ensinar o que não existe.
 *
 * O cenário de 32x24 e o palco de 320x240 têm a MESMA proporção, então ele
 * cobre exatinho, sem corte: é o caso bonito que a criança quer reproduzir.
 * O bloco usado aqui é o FIXO (basta pôr uma vez, e o motor repinta a cada
 * limpada da tela); o irmão por quadro fica dentro do 🔁.
 */
export const backdropExample: ExtensionExample = beginnerGameExample({
  name: 'Cenário do meu desenho',
  experience: 'demo',
  description: 'Ponha um desenho seu como fundo do jogo e ande na frente dele.',
  assets: [
    {
      id: 'example-backdrop',
      name: 'cenario',
      kind: 'image',
      dataUrl: EXAMPLE_BACKDROP_IMAGE,
      width: 32,
      height: 24,
      source: 'library',
      libId: 'example-backdrop',
    },
  ],
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 240 }],
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
      { selector: 'canvas', declarations: { border: '2px solid #38bdf8' } },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g2d:setBackdrop', image: 'cenario' },
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 148,
          y: 150,
          w: 24,
          h: 24,
          color: '#f97316',
        },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
            { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'heroi' },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

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
            { type: 'g2d:applyGravity', spriteVar: 'heroi' },
            { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
            { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: 'Use as setas ← → para andar · ↑ para pular',
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

/**
 * Exemplo "Pegue a moeda": o PRIMEIRO jogo, o mais simples e completo possível —
 * um herói que anda com as setas, uma moeda para encostar, um placar e a vitória
 * ao fazer 5 pontos. Top-down (sem gravidade), dois sprites coloridos (não depende
 * de asset), telas de início/vitória e reinício com Enter. É a porta de entrada da
 * vitrine: menos de 20 blocos, do jeito mais facilitado.
 */
export const catchCoinExample: ExtensionExample = beginnerGameExample({
  name: 'Pegue a moeda',
  experience: 'game',
  description: 'Ande com as setas, encoste na moeda e faça 5 pontos para vencer.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 240 }],
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
        declarations: { border: '2px solid #fbbf24', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 148,
          y: 108,
          w: 24,
          h: 24,
          color: '#4ade80',
        },
        {
          type: 'g2d:createSprite',
          varName: 'moeda',
          x: 60,
          y: 60,
          w: 18,
          h: 18,
          color: '#fbbf24',
        },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
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
                  title: 'Pegue a moeda',
                  subtitle: 'Use as setas para andar e encoste na moeda. Faça 5 pontos!',
                  hint: 'Aperte Enter para começar',
                  bg: '#11172a',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
                { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
                { type: 'g2d:collides', aVar: 'heroi', bVar: 'moeda', varName: 'pegou' },
                {
                  type: 'if',
                  cond: { type: 'var', name: 'pegou' },
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
                      object: { type: 'var', name: 'moeda' },
                      name: 'x',
                      value: { type: 'g2d:randomBetween', min: 20, max: 282 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'moeda' },
                      name: 'y',
                      value: { type: 'g2d:randomBetween', min: 20, max: 202 },
                    },
                    { type: 'g2d:playFx', fx: 'coin' },
                  ],
                },
                { type: 'g2d:drawSprite', spriteVar: 'moeda', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Moedas:',
                  value: { type: 'var', name: 'pontos' },
                  x: 12,
                  y: 28,
                  color: '#fbbf24',
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
                  subtitle: 'Você pegou 5 moedas!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#063018',
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
