/**
 * Runtime compartilhado de rasterização DOM para iframes de origem opaca.
 *
 * O html2canvas cria outro iframe e tenta ler o documento clonado, o que falha
 * quando o preview usa sandbox sem allow-same-origin. Este runtime serializa o
 * DOM diretamente para SVG/foreignObject e nunca acessa outro browsing context.
 * É uma string autocontida porque roda dentro do preview da criança.
 */
export function buildDomRasterizerRuntime(): string {
  return `
  var SZ_DOM_LAYOUT = ['display','flexDirection','alignItems','justifyContent','padding','boxSizing','overflow'];
  var SZ_DOM_BACKGROUND = ['backgroundColor','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat'];
  function szDomTraco(nome){ return nome.replace(/[A-Z]/g, function(m){ return '-' + m.toLowerCase(); }); }
  function szRasterizarDOM(raiz, opcoes, cb){
    try {
      raiz = raiz || document.body;
      opcoes = opcoes || {};
      if (!raiz || typeof XMLSerializer === 'undefined' || typeof Image === 'undefined') { cb(null); return; }
      var hr = raiz.getBoundingClientRect ? raiz.getBoundingClientRect() : null;
      var baseW = opcoes.fullDocument ? Math.max(raiz.scrollWidth || 0, raiz.clientWidth || 0) : 0;
      var baseH = opcoes.fullDocument ? Math.max(raiz.scrollHeight || 0, raiz.clientHeight || 0) : 0;
      var lw = Math.max(1, Math.round(baseW || (hr && hr.width) || raiz.clientWidth || opcoes.fallbackWidth || 1));
      var lh = Math.max(1, Math.round(baseH || (hr && hr.height) || raiz.clientHeight || opcoes.fallbackHeight || 1));
      if (opcoes.maxWidth) lw = Math.min(lw, opcoes.maxWidth);
      if (opcoes.maxHeight) lh = Math.min(lh, opcoes.maxHeight);
      var clone = raiz.cloneNode(true);
      var estilo = 'position:relative;margin:0;left:auto;top:auto;right:auto;bottom:auto;' +
        'transform:none;width:' + lw + 'px;height:' + lh + 'px;';
      try {
        var viva = window.getComputedStyle(raiz);
        var propriedades = opcoes.includeBackground ? SZ_DOM_LAYOUT.concat(SZ_DOM_BACKGROUND) : SZ_DOM_LAYOUT;
        for (var s = 0; s < propriedades.length; s++) {
          var valor = viva[propriedades[s]];
          if (valor) estilo += szDomTraco(propriedades[s]) + ':' + String(valor).replace(/"/g, '&quot;') + ';';
        }
      } catch (e) {}
      if (opcoes.hideCanvases) {
        var telas = clone.querySelectorAll ? clone.querySelectorAll('canvas') : [];
        for (var i = 0; i < telas.length; i++) telas[i].style.visibility = 'hidden';
      }
      var css = '';
      var tags = document.querySelectorAll('style');
      for (var j = 0; j < tags.length; j++) css += tags[j].textContent || '';
      var ser = new XMLSerializer();
      var corpo = '';
      for (var k = 0; k < clone.childNodes.length; k++) corpo += ser.serializeToString(clone.childNodes[k]);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + lw + '" height="' + lh + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="' + estilo + '"><style>' + css + '</style>' + corpo + '</div>' +
        '</foreignObject></svg>';
      var img = new Image();
      var pronto = false;
      var fim = function(v){ if (pronto) return; pronto = true; cb(v); };
      img.onload = function(){ fim({ image: img, width: lw, height: lh, rootRect: hr }); };
      img.onerror = function(){ fim(null); };
      setTimeout(function(){ fim(null); }, 1500);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (e) { cb(null); }
  }`
}
