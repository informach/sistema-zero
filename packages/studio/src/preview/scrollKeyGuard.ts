/**
 * Runtime injetado no `<head>` do iframe (1st-party, antes das extensões e do código do aluno)
 * que impede as teclas de NAVEGAÇÃO do jogo de rolarem a página de FORA.
 *
 * Porquê (03/10/2026, relato dela): no jogo pronto da aula, andar com as setas rolava a página
 * da aula junto, para cima e para baixo. A seta que o documento do jogo não tem o que rolar
 * sobe para quem o embute (o navegador encadeia a rolagem do iframe para a página), e nenhum
 * runtime de jogo cancelava a tecla. O host não alcança esses eventos: eles nascem DENTRO do
 * iframe. Vale em todo lugar onde se joga (jogo pronto, Estúdio da aula, página pública).
 *
 * A regra: seta, Espaço, PageUp/PageDown e Home/End têm o comportamento padrão cancelado SÓ
 * quando nada dentro do jogo consegue rolar NAQUELE SENTIDO (nem o documento, nem uma caixa
 * rolável em volta do foco). Uma página do aluno mais alta que o iframe continua rolando com as
 * setas, como antes.
 * - ⚠️ O SENTIDO conta, e não só "tem o que rolar": com o documento do jogo já no fim, a próxima
 *   seta para baixo também subiria para a aula.
 * - ⚠️ `overflow: hidden` no `<html>` (ou no `<body>`, que propaga para a janela quando o `<html>`
 *   é `visible`) quer dizer que a criança NÃO rola o documento, mesmo com o canvas maior que a
 *   janela. É o caso comum dos jogos, e contar só o tamanho deixava a tecla passar.
 * - Campos e controles que USAM as teclas ficam de fora (texto, seleção, slider, menu, abas,
 *   áudio e vídeo com controles): a seta move o cursor ou o valor, e o Espaço digita.
 * - O Espaço num BOTÃO (ou link, caixa de marcar) fica de fora: cancelar o `keydown` cancelaria
 *   o clique que o Espaço dá.
 * - Só `preventDefault`, nunca `stopPropagation`: o jogo continua recebendo a tecla. Escuta na
 *   CAPTURA do `window` para correr antes de um runtime que pare a propagação.
 *
 * Auto-contido (entra como STRING num `<script>`): sem imports nem refs externas, e sem regex
 * com barra invertida (mesma regra dos outros bridges).
 */
export function buildScrollKeyGuardRuntime(): string {
  return `(function () {
  var KEYS = {
    ArrowUp: ['y', -1], ArrowDown: ['y', 1], PageUp: ['y', -1], PageDown: ['y', 1],
    Home: ['y', -1], End: ['y', 1], ' ': ['y', 1], Spacebar: ['y', 1],
    ArrowLeft: ['x', -1], ArrowRight: ['x', 1]
  };
  var USE_KEYS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]),'
    + ' audio[controls], video[controls],'
    + ' [role="textbox"], [role="slider"], [role="spinbutton"], [role="listbox"], [role="menu"],'
    + ' [role="menubar"], [role="tablist"], [role="radiogroup"], [role="grid"], [role="tree"],'
    + ' [role="combobox"]';
  var USE_SPACE = 'button, a[href], summary, [role="button"], [role="link"], [role="checkbox"],'
    + ' [role="switch"], [role="menuitem"], [role="option"], [role="tab"], [role="radio"]';
  function overflowOf(el, axis) {
    var style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(el) : null;
    return (style && (axis === 'y' ? style.overflowY : style.overflowX)) || 'visible';
  }
  function rollable(overflow) {
    return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
  }
  function canMove(el, axis, dir) {
    var max = axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    if (!(max > 1)) return false;
    var at = (axis === 'y' ? el.scrollTop : el.scrollLeft) || 0;
    return dir < 0 ? at > 0 : at < max - 1;
  }
  window.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    var entry = KEYS[event.key];
    if (!entry) return;
    var axis = entry[0];
    var space = event.key === ' ' || event.key === 'Spacebar';
    var dir = space && event.shiftKey ? -1 : entry[1];
    var el = event.target && event.target.nodeType === 1 ? event.target : null;
    if (el && typeof el.closest === 'function') {
      if (el.closest(USE_KEYS)) return;
      if (space && el.closest(USE_SPACE)) return;
    }
    var html = document.documentElement;
    var body = document.body;
    var htmlOverflow = html ? overflowOf(html, axis) : 'visible';
    var bodyPropagates = htmlOverflow === 'visible';
    var viewport = bodyPropagates && body ? overflowOf(body, axis) : htmlOverflow;
    var root = document.scrollingElement || html;
    if (root && viewport !== 'hidden' && viewport !== 'clip' && canMove(root, axis, dir)) return;
    for (var node = el; node && node !== html; node = node.parentElement) {
      if (node === body && bodyPropagates) continue;
      if (rollable(overflowOf(node, axis)) && canMove(node, axis, dir)) return;
    }
    event.preventDefault();
  }, true);
})();`
}
