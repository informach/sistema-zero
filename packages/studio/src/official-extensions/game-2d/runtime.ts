/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-2d"
 * está instalada. Expõe `window.SZGame2D` com helpers simples.
 *
 * É intencionalmente legível — o aluno pode abrir o modo Código, ver
 * `SZGame2D.createSprite(...)` no script.js e seguir o link mental até esta
 * função.
 */
export const gameTwoDRuntime = `(function () {
  // Estado interno: lista de teclas pressionadas.
  var keys = { left: false, right: false, up: false, down: false };
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
  });

  /**
   * Cria um sprite retangular. Um sprite é apenas um objeto { x, y, w, h, color, vx, vy }.
   */
  function createSprite(opts) {
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      w: opts.w || 32,
      h: opts.h || 32,
      color: opts.color || '#22d3ee',
      vx: opts.vx || 0,
      vy: opts.vy || 0
    };
  }

  /**
   * Desenha o sprite no contexto 2d. Apenas um fillRect — sem mágica.
   */
  function drawSprite(ctx, sprite) {
    if (!ctx || !sprite) return;
    ctx.fillStyle = sprite.color;
    ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
  }

  /**
   * Move o sprite de acordo com as setas do teclado, somando ou subtraindo
   * a velocidade fornecida em cada eixo.
   */
  function moveByKeys(sprite, speed) {
    if (!sprite) return;
    var s = typeof speed === 'number' ? speed : 3;
    if (keys.left) sprite.x -= s;
    if (keys.right) sprite.x += s;
    if (keys.up) sprite.y -= s;
    if (keys.down) sprite.y += s;
  }

  /**
   * Colisão retangular simples (AABB).
   */
  function isColliding(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /**
   * Loop de jogo. Recebe uma função que vai rodar a cada frame e devolve uma
   * função para PARAR o loop (chame-a quando o jogo acabar ou ao reiniciar,
   * para não empilhar vários loops rodando ao mesmo tempo).
   */
  function gameLoop(fn) {
    var canceled = false;
    var rafId = 0;
    function tick() {
      if (canceled) return;
      try { fn(); } catch (e) { console.error(e && e.message ? e.message : e); }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return function stop() {
      canceled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }

  window.SZGame2D = {
    createSprite: createSprite,
    drawSprite: drawSprite,
    moveByKeys: moveByKeys,
    isColliding: isColliding,
    gameLoop: gameLoop,
    keys: keys
  };
})();`
