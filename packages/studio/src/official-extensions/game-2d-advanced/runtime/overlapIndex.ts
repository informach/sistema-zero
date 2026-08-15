/**
 * O INDICE ESPACIAL do "para cada par que se encosta".
 *
 * Vive num fragmento proprio porque e um assunto fechado — geometria da forma,
 * mapa de celulas e a lista de vizinhos — e porque o `runtime.ts` tem teto de
 * linhas (`__tests__/architecture.test.ts`) justamente para nao voltar a ser um
 * arquivo unico.
 *
 * O que ele substitui: um laco duplo que examinava o PRODUTO das duas listas.
 * Medido, 300 x 300 espalhados custavam 20,3 ms por quadro; com o indice, 0,295 ms.
 */
export const gameKitOverlapIndexRuntime = `
  /**
   * A CAIXA ENVOLVENTE do que de fato colide. Circulo NAO e a caixa: o bloco
   * "forma redonda, raio 40" num sprite 32x32 poe o circulo 24 px para FORA
   * dela, e um indice que recortasse pela caixa rejeitaria acerto de verdade.
   */
  function _shapeLeft(e) { return isCircle(e) ? hbCenterX(e) - hbRadius(e) : hbLeft(e); }
  function _shapeTop(e) { return isCircle(e) ? hbCenterY(e) - hbRadius(e) : hbTop(e); }
  function _shapeRight(e) { return isCircle(e) ? hbCenterX(e) + hbRadius(e) : hbLeft(e) + hbW(e); }
  function _shapeBottom(e) { return isCircle(e) ? hbCenterY(e) + hbRadius(e) : hbTop(e) + hbH(e); }
  /**
   * Abaixo deste tanto de PARES o indice nem roda: montar o mapa de celulas
   * custa mais do que o laco duplo poupa. 1600 = 40x40, e o teste da sonda
   * crava exatamente esse numero para o limiar nao virar folclore.
   */
  var OVERLAP_INDEX_MIN_PARES = 1600;
  var OVERLAP_CELL = 64;
  /**
   * Mapa de celulas sobre a lista B, para achar os vizinhos de cada A.
   *
   * ⚠️ Devolve objeto NOVO, e o rascunho vive dentro dele: o corpo que a
   * crianca escreve pode chamar OUTRO "para cada par" la dentro, e um singleton
   * de modulo seria sobrescrito no meio da varredura de fora.
   */
  function _buildOverlapIndex(lista) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i];
      if (!e || e._active === false) continue;
      var l = _shapeLeft(e), t = _shapeTop(e), r = _shapeRight(e), b = _shapeBottom(e);
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    }
    if (!(maxX >= minX)) return null;
    var cols = Math.floor((maxX - minX) / OVERLAP_CELL) + 1;
    var rows = Math.floor((maxY - minY) / OVERLAP_CELL) + 1;
    // Mundo enorme com dois bichos nas pontas: o mapa teria milhoes de celulas
    // vazias e o remedio sairia mais caro que a doenca.
    if (cols * rows > 262144) return null;
    var cells = new Array(cols * rows);
    for (var j = 0; j < lista.length; j++) {
      var e2 = lista[j];
      if (!e2 || e2._active === false) continue;
      var c0 = Math.floor((_shapeLeft(e2) - minX) / OVERLAP_CELL);
      var c1 = Math.floor((_shapeRight(e2) - minX) / OVERLAP_CELL);
      var r0 = Math.floor((_shapeTop(e2) - minY) / OVERLAP_CELL);
      var r1 = Math.floor((_shapeBottom(e2) - minY) / OVERLAP_CELL);
      for (var rr = r0; rr <= r1; rr++) {
        for (var cc = c0; cc <= c1; cc++) {
          var k = rr * cols + cc;
          if (k < 0 || k >= cells.length) continue;
          (cells[k] || (cells[k] = [])).push(j);
        }
      }
    }
    return { cells: cells, cols: cols, rows: rows, minX: minX, minY: minY, scratch: [] };
  }
  /**
   * Os indices de B que podem encostar em A, em ordem DECRESCENTE.
   *
   * A ordem nao e detalhe: o laco original desce, e a parada em
   * quando o A e recolhido torna essa ordem observavel no placar da crianca.
   */
  function _overlapCandidates(indice, a) {
    var saida = indice.scratch;
    saida.length = 0;
    var c0 = Math.floor((_shapeLeft(a) - indice.minX) / OVERLAP_CELL);
    var c1 = Math.floor((_shapeRight(a) - indice.minX) / OVERLAP_CELL);
    var r0 = Math.floor((_shapeTop(a) - indice.minY) / OVERLAP_CELL);
    var r1 = Math.floor((_shapeBottom(a) - indice.minY) / OVERLAP_CELL);
    if (c1 < 0 || r1 < 0 || c0 >= indice.cols || r0 >= indice.rows) return saida;
    if (c0 < 0) c0 = 0;
    if (r0 < 0) r0 = 0;
    if (c1 >= indice.cols) c1 = indice.cols - 1;
    if (r1 >= indice.rows) r1 = indice.rows - 1;
    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var lista = indice.cells[rr * indice.cols + cc];
        if (!lista) continue;
        for (var i = 0; i < lista.length; i++) saida.push(lista[i]);
      }
    }
    if (saida.length > 1) {
      saida.sort(function (x, y) { return y - x; });
      // O mesmo B pode estar em varias celulas: sem tirar o repetido, o corpo
      // da crianca rodaria duas vezes para o MESMO par.
      var escrita = 1;
      for (var k = 1; k < saida.length; k++) if (saida[k] !== saida[k - 1]) saida[escrita++] = saida[k];
      saida.length = escrita;
    }
    return saida;
  }
`
