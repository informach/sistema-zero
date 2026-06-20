/**
 * Bridge de ENTRADA injetado no `<head>` do preview (SEMPRE, em qualquer projeto
 * clássico — não depende de extensão). Dá ao programa do aluno uma forma simples
 * de LER teclado e mouse/dedo sem montar listeners na mão, usada pelos blocos do
 * caminho "na mão" (canvas + programação):
 *
 *   - `window.__szInput.key("ArrowRight")` → true enquanto a tecla está apertada.
 *   - `window.__szInput.x` / `.y` → posição do mouse/dedo DENTRO do canvas.
 *
 * Auto-contido (entra como STRING num `<script>`): sem imports nem refs externas,
 * e sem regex com barra invertida (mesma regra do storageBridge). É independente
 * do runtime da extensão Jogo 2D (SZGame2D) — os dois podem coexistir sem conflito.
 */
export function buildInputBridgeRuntime(): string {
  return `(function () {
  var pressed = Object.create(null);
  window.addEventListener('keydown', function (e) { pressed[e.key] = true; pressed[e.code] = true; });
  window.addEventListener('keyup', function (e) { pressed[e.key] = false; pressed[e.code] = false; });
  // Ao perder o foco (alt-tab, clicar fora do iframe) o navegador pode NÃO mandar
  // o keyup, deixando a tecla "presa". Zeramos tudo no blur p/ não travar o jogo.
  window.addEventListener('blur', function () { pressed = Object.create(null); });
  var input = {
    x: 0,
    y: 0,
    down: false,
    key: function (name) {
      if (name === 'Space') return !!(pressed[' '] || pressed['Space']);
      return !!pressed[name];
    }
  };
  // Cache do <canvas>: re-buscar no DOM a cada pointermove (que dispara dezenas de
  // vezes por segundo) é caro. Guardamos a referência e só re-consultamos quando
  // ela some (null) ou foi removida da página (isConnected === false).
  var canvasEl = null;
  function getCanvas() {
    if (canvasEl && canvasEl.isConnected !== false) return canvasEl;
    try { canvasEl = document.querySelector('canvas'); } catch (err) { canvasEl = null; }
    return canvasEl;
  }
  function at(e) {
    var c = getCanvas();
    var rect = c && c.getBoundingClientRect ? c.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    // Escala display -> coordenadas internas do canvas (quando exibido em tamanho
    // diferente da resolução, ex.: canvas que preenche a janela).
    var sx = c && rect.width ? c.width / rect.width : 1;
    var sy = c && rect.height ? c.height / rect.height : 1;
    input.x = ((e.clientX || 0) - rect.left) * sx;
    input.y = ((e.clientY || 0) - rect.top) * sy;
  }
  // passive: true — nunca chamamos preventDefault aqui, então avisamos o navegador
  // (scroll/zoom não bloqueiam, listener mais leve no hot-path do pointermove).
  window.addEventListener('pointermove', at, { passive: true });
  window.addEventListener('pointerdown', function (e) { at(e); input.down = true; }, { passive: true });
  window.addEventListener('pointerup', function () { input.down = false; }, { passive: true });
  window.__szInput = input;
})();`
}
