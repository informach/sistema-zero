import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Pong simples". Carregado pelo painel de extensões via
 * botão "Carregar exemplo". Substitui a IR atual do projeto.
 */
export const pongExample: ExtensionExample = {
  name: 'Pong simples',
  description: 'Bola que rebate nas bordas + raquete controlada pelas setas.',
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
    js: [
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
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 },
          { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
          // Física da bola com os blocos do próprio motor (em vez de JS cru, que
          // caía no bloco "código avançado"): mover pela velocidade, quicar nas
          // bordas e, ao bater na raquete, mandar a bola para a direita (vx > 0).
          { type: 'g2d:applyVelocity', spriteVar: 'bola' },
          { type: 'g2d:bounceOnEdges', spriteVar: 'bola', ctxVar: 'ctx' },
          { type: 'g2d:collides', aVar: 'jogador', bVar: 'bola', varName: 'bateu' },
          {
            type: 'if',
            cond: { type: 'var', name: 'bateu' },
            then: [
              {
                type: 'memberSet',
                object: { type: 'var', name: 'bola' },
                name: 'vx',
                value: {
                  type: 'mathUnary',
                  fn: 'abs',
                  arg: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'vx' },
                },
              },
            ],
          },
          { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Herói que anda": sprite com imagem da biblioteca + animação de
 * spritesheet, movido pelas setas. Os nomes de asset (`heroi`, `heroi-andando`)
 * casam com itens do starter pack — enquanto a imagem não é adicionada, o sprite
 * aparece como retângulo (placeholder) e segue jogável.
 */
export const animatedHeroExample: ExtensionExample = {
  name: 'Herói que anda',
  description: 'Sprite com imagem + animação de spritesheet, movido pelas setas.',
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
    js: [
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
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Mini plataforma" (v0.4.0): herói que anda com esquerda/direita, pula
 * com gravidade e não sai da tela. Setas para mover/pular. Sprite colorido (não
 * depende de asset) para o exemplo funcionar sozinho.
 */
export const platformerExample: ExtensionExample = {
  name: 'Mini plataforma',
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
    js: [
      {
        type: 'g2d:createSprite',
        varName: 'heroi',
        x: 20,
        y: 120,
        w: 36,
        h: 36,
        color: '#4ade80',
      },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
          { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Sala com paredes" (v0.5.0): um mapa de tiles (chão + paredes) com um
 * herói que anda nas 4 direções pelas setas e NÃO atravessa as paredes (tiles
 * sólidos). Usa o `tileset` da biblioteca (chão = 0, parede = 1); enquanto o asset
 * não for adicionado, os tiles aparecem como retângulos (placeholder) e o mapa
 * segue jogável.
 */
export const tilemapExample: ExtensionExample = {
  name: 'Sala com paredes',
  description: 'Mapa de tiles com paredes que o herói não atravessa (setas para andar).',
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
    js: [
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
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:drawTileMap', mapVar: 'mapa', ctxVar: 'ctx', x: 0, y: 0 },
          { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
          { type: 'g2d:tileMapCollide', spriteVar: 'heroi', mapVar: 'mapa' },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}
