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
  var input = {
    x: 0,
    y: 0,
    down: false,
    key: function (name) {
      if (name === 'Space') return !!(pressed[' '] || pressed['Space']);
      return !!pressed[name];
    }
  };
  function at(e) {
    var c = null;
    try { c = document.querySelector('canvas'); } catch (err) {}
    var rect = c && c.getBoundingClientRect ? c.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    // Escala display -> coordenadas internas do canvas (quando exibido em tamanho
    // diferente da resolução, ex.: canvas que preenche a janela).
    var sx = c && rect.width ? c.width / rect.width : 1;
    var sy = c && rect.height ? c.height / rect.height : 1;
    input.x = ((e.clientX || 0) - rect.left) * sx;
    input.y = ((e.clientY || 0) - rect.top) * sy;
  }
  window.addEventListener('pointermove', at);
  window.addEventListener('pointerdown', function (e) { at(e); input.down = true; });
  window.addEventListener('pointerup', function () { input.down = false; });
  window.__szInput = input;
})();`
}
