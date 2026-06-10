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
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
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
          { type: 'canvasClear', ctxVar: 'ctx', canvasVar: 'ctx' },
          { type: 'g2d:moveByKeys', spriteVar: 'jogador', speed: 4 },
          { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
          {
            type: 'rawJS',
            advanced: true,
            code: [
              'bola.x += bola.vx; bola.y += bola.vy;',
              'if (bola.x < 0 || bola.x + bola.w > canvas.width) bola.vx *= -1;',
              'if (bola.y < 0 || bola.y + bola.h > canvas.height) bola.vy *= -1;',
              'if (SZGame2D.isColliding(jogador, bola)) bola.vx = Math.abs(bola.vx);',
            ].join('\n'),
          },
          { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}
