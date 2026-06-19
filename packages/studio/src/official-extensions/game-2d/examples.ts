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

/**
 * Exemplo "Nave contra Asteroides" (v0.6.0): jogo de tiro completo montado só com
 * blocos — grupos de sprites (tiros, asteroides), spawner por tempo, colisão de
 * grupo, HUD no canvas (placar + vidas) e telas de início/vitória/derrota. Mostra
 * o padrão recomendado: setup no TOPO (visível ao loop) + um único "a cada quadro"
 * que despacha por cena com "se a tela atual é X". Sprites coloridos (sem asset).
 */
export const asteroidsExample: ExtensionExample = {
  name: 'Nave contra Asteroides',
  description:
    'Jogo de tiro: atire nos asteroides, ganhe pontos e sobreviva. Tem telas de início, vitória e derrota. Setas/dedo movem; Espaço atira; Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#020611',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #35e8ff', background: '#06101f' },
      },
    ],
    js: [
      // --- Setup (no TOPO: assim o "a cada quadro" enxerga estas variáveis) ---
      { type: 'g2d:fitScreen', percent: 100 },
      {
        type: 'g2d:createShip',
        varName: 'nave',
        x: 180,
        y: 250,
        w: 54,
        h: 62,
        bodyColor: '#35e8ff',
        wingColor: '#2568ff',
      },
      { type: 'g2d:createGroup', varName: 'tiros' },
      { type: 'g2d:createGroup', varName: 'asteroides' },
      { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
      { type: 'var', name: 'vidas', value: { type: 'num', value: 3 } },
      { type: 'g2d:setScene', name: 'inicio' },
      // --- Enter: começar / reiniciar ---
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
            cond: { type: 'g2d:sceneIs', name: 'perdeu' },
            then: [{ type: 'g2d:restart' }],
          },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'ganhou' },
            then: [{ type: 'g2d:restart' }],
          },
        ],
      },
      // --- Espaço: atirar (só quando está jogando) ---
      {
        type: 'g2d:onKey',
        key: 'Space',
        body: [
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'jogando' },
            then: [
              {
                type: 'g2d:spawnInGroup',
                groupVar: 'tiros',
                x: {
                  type: 'binop',
                  op: '+',
                  left: { type: 'memberGet', object: { type: 'var', name: 'nave' }, name: 'x' },
                  right: { type: 'num', value: 24 },
                },
                y: { type: 'memberGet', object: { type: 'var', name: 'nave' }, name: 'y' },
                w: 6,
                h: 14,
                color: '#9cff57',
                vx: { type: 'num', value: 0 },
                vy: { type: 'num', value: -7 },
              },
              { type: 'g2d:playShoot' },
            ],
          },
        ],
      },
      // --- Loop principal: limpa, desenha o fundo e despacha por cena ---
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:starfield', ctxVar: 'ctx', speed: 1 },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'inicio' },
            then: [
              {
                type: 'g2d:showScreen',
                ctxVar: 'ctx',
                title: 'Nave contra Asteroides',
                subtitle: 'Atire nos asteroides e sobreviva!',
                hint: 'Aperte Enter para começar',
                bg: '#02111f',
              },
            ],
          },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'jogando' },
            then: [
              { type: 'g2d:dragX', spriteVar: 'nave' },
              { type: 'g2d:clampToScreen', spriteVar: 'nave', ctxVar: 'ctx' },
              { type: 'g2d:drawSprite', spriteVar: 'nave', ctxVar: 'ctx' },
              {
                type: 'g2d:everyFrames',
                n: { type: 'num', value: 40 },
                body: [
                  {
                    type: 'g2d:spawnAsteroid',
                    groupVar: 'asteroides',
                    x: {
                      type: 'random',
                      min: { type: 'num', value: 10 },
                      max: { type: 'num', value: 360 },
                    },
                    y: { type: 'num', value: -30 },
                    size: 40,
                    color: '#8d8f9b',
                    vx: { type: 'num', value: 0 },
                    vy: { type: 'num', value: 3 },
                  },
                ],
              },
              { type: 'g2d:updateGroup', groupVar: 'tiros' },
              { type: 'g2d:updateGroup', groupVar: 'asteroides' },
              { type: 'g2d:drawGroup', groupVar: 'tiros', ctxVar: 'ctx' },
              { type: 'g2d:drawGroup', groupVar: 'asteroides', ctxVar: 'ctx' },
              {
                type: 'g2d:onGroupOverlap',
                aGroup: 'tiros',
                aName: 'tiro',
                bGroup: 'asteroides',
                bName: 'asteroide',
                body: [
                  { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                  { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
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
                  { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ffb13b' },
                  { type: 'g2d:playExplosion' },
                  { type: 'g2d:shake', ctxVar: 'ctx', intensity: 5 },
                ],
              },
              {
                type: 'g2d:onSpriteGroupOverlap',
                spriteVar: 'nave',
                groupVar: 'asteroides',
                itemName: 'asteroide',
                body: [
                  { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
                  { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ff5d3d' },
                  { type: 'g2d:playExplosion' },
                  { type: 'g2d:shake', ctxVar: 'ctx', intensity: 8 },
                  {
                    type: 'assign',
                    name: 'vidas',
                    value: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'var', name: 'vidas' },
                      right: { type: 'num', value: 1 },
                    },
                  },
                ],
              },
              {
                type: 'g2d:pruneOffscreen',
                groupVar: 'asteroides',
                ctxVar: 'ctx',
                itemName: 'a',
                body: [
                  {
                    type: 'assign',
                    name: 'vidas',
                    value: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'var', name: 'vidas' },
                      right: { type: 'num', value: 1 },
                    },
                  },
                ],
              },
              {
                type: 'g2d:drawScore',
                ctxVar: 'ctx',
                label: 'Pontos:',
                value: { type: 'var', name: 'pontos' },
                x: 12,
                y: 26,
                color: '#ffffff',
                size: 22,
              },
              {
                type: 'g2d:drawHearts',
                ctxVar: 'ctx',
                count: { type: 'var', name: 'vidas' },
                x: 12,
                y: 40,
                size: 16,
                color: '#ff5d5d',
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '>=',
                  left: { type: 'var', name: 'pontos' },
                  right: { type: 'num', value: 25 },
                },
                then: [{ type: 'g2d:setScene', name: 'ganhou' }],
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '<=',
                  left: { type: 'var', name: 'vidas' },
                  right: { type: 'num', value: 0 },
                },
                then: [{ type: 'g2d:setScene', name: 'perdeu' }],
              },
            ],
          },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'ganhou' },
            then: [
              {
                type: 'g2d:showScreen',
                ctxVar: 'ctx',
                title: 'Você venceu!',
                subtitle: 'Missão cumprida: a galáxia está segura!',
                hint: 'Aperte Enter para jogar de novo',
                bg: '#063018',
              },
            ],
          },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'perdeu' },
            then: [
              {
                type: 'g2d:showScreen',
                ctxVar: 'ctx',
                title: 'Fim de jogo',
                subtitle: 'Os asteroides passaram pela defesa!',
                hint: 'Aperte Enter para tentar de novo',
                bg: '#300a0a',
              },
            ],
          },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}
