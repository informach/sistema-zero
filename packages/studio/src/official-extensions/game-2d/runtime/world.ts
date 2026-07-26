export const gameTwoDWorldRuntime = `  // ---- Tiles / tilemaps (v0.5.0) ----
  // Um tilemap é uma GRADE de índices desenhada com um tileset (uma imagem com
  // vários quadros lado a lado, indexados como na spritesheet). O índice de cada
  // célula escolhe o quadro; célula vazia (-1) não desenha nada. Os índices
  // marcados como "sólidos" barram o sprite (collideTileMap). O texto da grade
  // aceita linhas separadas por ';' ou quebra de linha, e células separadas por
  // espaço ou vírgula; '.' ou '-' (ou vazio) = célula vazia.
  // IMPORTANTE: este runtime é injetado como STRING (template literal) — escapes
  // de barra invertida (como em literais de regex) NÃO sobrevivem à montagem da
  // string. Por isso tokenizamos a grade na mão, comparando caracteres por código,
  // sem usar regex. Separadores de COLUNA: espaço(32), tab(9), vírgula(44).
  // Separadores de LINHA: ';'(59), nova linha(10), retorno(13).
  function parseGrid(text) {
    var rows = [];
    if (typeof text !== 'string') return rows;
    var row = [];
    var token = '';
    function pushToken() {
      if (token === '') return;
      if (token === '.' || token === '-') { row.push(-1); }
      else { var n = parseInt(token, 10); row.push(isNaN(n) ? -1 : n); }
      token = '';
    }
    function pushRow() {
      pushToken();
      if (row.length > 0) rows.push(row);
      row = [];
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var code = text.charCodeAt(i);
      if (ch === ';' || code === 10 || code === 13) { pushRow(); }
      else if (code === 32 || code === 9 || ch === ',') { pushToken(); }
      else { token += ch; }
    }
    pushRow();
    return rows;
  }
  function parseSolidList(text) {
    var out = [];
    if (typeof text !== 'string') return out;
    var token = '';
    function flush() {
      if (token === '') return;
      var n = parseInt(token, 10);
      if (!isNaN(n)) out.push(n);
      token = '';
    }
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      // separadores: espaço(32), tab(9), nova linha(10), retorno(13), vírgula(44), ';'(59)
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 44 || code === 59) {
        flush();
      } else {
        token += text.charAt(i);
      }
    }
    flush();
    return out;
  }
  /**
   * Cria um tilemap a partir de { image, tile, solid, grid }. image = nome do
   * asset do tileset; tile = tamanho (px) de cada quadro/célula; grid = texto da
   * grade; solid = índices que barram o sprite. ox/oy guardam onde o mapa foi
   * desenhado por último (collideTileMap usa para alinhar a colisão ao desenho).
   */
  // "Criar mapa" DENTRO do "a cada quadro" recria o mapa a cada quadro: além do
  // desperdício, as edições de tile (quebrar/pôr) somem na hora. O teto detecta
  // o laço e avisa UMA vez (o jogo segue rodando).
  var _tileMapCreates = 0;
  function createTileMap(opts) {
    opts = opts || {};
    _tileMapCreates += 1;
    if (_tileMapCreates === 61) {
      console.warn(
        'SZGame2D: "Criar mapa" está rodando sem parar: ele provavelmente está DENTRO do "A cada quadro do jogo". Monte o bloco de criar o mapa FORA do laço (uma vez só) e deixe dentro do laço apenas o "Desenhar o mapa".'
      );
    }
    // tile = tamanho do tile NA ARTE (para fatiar o tileset). O tamanho NA TELA
    // (draw) é calculado no desenho: o mapa ENCAIXA no canvas (a arte é ampliada
    // com nitidez pelo drawFrame). Assim um tile de 16px não fica minúsculo.
    var t = _positiveFiniteNumber(opts.tile, 32);
    var solid = parseSolidList(opts.solid);
    // Peças PLATAFORMA (one-way: pisa por cima, atravessa por baixo). Sólido
    // vence no conflito (uma peça não é sólida E plataforma ao mesmo tempo).
    var platform = parseSolidList(opts.platform);
    if (platform.length && solid.length) {
      platform = platform.filter(function (n) { return solid.indexOf(n) === -1; });
    }
    return {
      tileset: loadSpriteSheet(opts.image, t, t),
      tile: t,
      draw: 0,
      rows: parseGrid(opts.grid),
      solid: solid,
      platform: platform,
      ox: 0,
      oy: 0
    };
  }

  /**
   * Cria um tilemap PRONTO a partir de um desenho de MAPA (Pinta ou fatiador):
   * o metadado do asset traz a grade, o tamanho do tile, os solidos e a FOLHA
   * de pecas embutida. Sem metadado, devolve um mapa vazio (desenhar/colidir
   * viram no-op) e avisa no console — o jogo nunca quebra.
   */
  function createTileMapFromAsset(name) {
    var entry = null;
    if (name && typeof name === 'string' &&
        Object.prototype.hasOwnProperty.call(ASSET_META, name)) {
      entry = ASSET_META[name];
    }
    var meta = (entry && entry.tilemap && typeof entry.tilemap === 'object') ? entry.tilemap : null;
    if (!meta || !meta.tileset || typeof meta.tileset.dataUrl !== 'string' ||
        typeof meta.grid !== 'string') {
      try {
        console.warn('O desenho "' + name + '" nao veio com um mapa do Pinta. Envie o MAPA pelo foguete do Pinta (ou use "Criar mapa de tiles" para montar na mao).');
      } catch (e) {}
      return createTileMap({ image: '', tile: 32, solid: '', grid: '' });
    }
    var solidText = '';
    if (meta.solid && typeof meta.solid.length === 'number') {
      for (var i = 0; i < meta.solid.length; i++) {
        var n = meta.solid[i];
        if (_isFiniteNumber(n) && n >= 0) {
          solidText += (solidText === '' ? '' : ' ') + Math.floor(n);
        }
      }
    }
    var platformText = '';
    if (meta.platform && typeof meta.platform.length === 'number') {
      for (var j = 0; j < meta.platform.length; j++) {
        var m = meta.platform[j];
        if (_isFiniteNumber(m) && m >= 0) {
          platformText += (platformText === '' ? '' : ' ') + Math.floor(m);
        }
      }
    }
    // A folha embutida entra como dataUrl direto — loadImage aceita url/dataUrl.
    return createTileMap({
      image: meta.tileset.dataUrl,
      tile: _positiveFiniteNumber(meta.tileSize, 32),
      solid: solidText,
      platform: platformText,
      grid: meta.grid
    });
  }
  /** Nº de colunas do mapa (maior linha). */
  function tileMapCols(map) {
    var cols = 0;
    if (map && map.rows) for (var i = 0; i < map.rows.length; i++) {
      if (map.rows[i].length > cols) cols = map.rows[i].length;
    }
    return cols;
  }
  /** Tamanho do tile NA TELA (o efetivo do último desenho; cai no da arte se não desenhou). */
  function tileScreenSize(map) {
    if (!map) return 0;
    return (_isFiniteNumber(map.draw) && map.draw > 0)
      ? map.draw
      : _positiveFiniteNumber(map.tile, 0);
  }
  /** Verdadeiro se a célula (col,row) tem um índice marcado como sólido. */
  function isSolidCell(map, col, row) {
    if (!map || !map.rows) return false;
    if (row < 0 || row >= map.rows.length) return false;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return false;
    return map.solid.indexOf(r[col]) !== -1;
  }
  /** Verdadeiro se a célula é uma PLATAFORMA (one-way). */
  function isPlatformCell(map, col, row) {
    if (!map || !map.rows || !map.platform) return false;
    if (row < 0 || row >= map.rows.length) return false;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return false;
    return map.platform.indexOf(r[col]) !== -1;
  }
  /** Índice do tile no PIXEL (px,py) do canvas (alinhado a onde o mapa foi desenhado); -1 fora/vazio. */
  function tileAt(map, px, py) {
    if (!map || !map.rows || !map.tile) return -1;
    var t = tileScreenSize(map);
    if (!_isFiniteNumber(px) || !_isFiniteNumber(py) || t <= 0) return -1;
    var col = Math.floor((px - _finiteNumber(map.ox, 0)) / t);
    var row = Math.floor((py - _finiteNumber(map.oy, 0)) / t);
    if (row < 0 || row >= map.rows.length) return -1;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return -1;
    return r[col];
  }
  /**
   * Desenha o tilemap ENCAIXANDO no canvas: calcula o maior tile QUADRADO que faz o
   * mapa inteiro caber (sem distorcer) e centraliza. A arte (map.tile) é ampliada com
   * nitidez. x/y deslocam por cima (ex.: câmera) — mapa maior que a tela rola com ela.
   */
  function drawTileMap(ctx, map, x, y, size) {
    if (!ctx || !map || !map.rows) return;
    var rowsN = map.rows.length;
    var cols = tileMapCols(map);
    if (cols === 0 || rowsN === 0) return;
    var cw = stageW(ctx);
    var ch = stageH(ctx);
    var hasCanvas = cw > 0 && ch > 0;
    // "size" (opcional) é o tamanho do tile NA TELA escolhido pelo aluno; 0 (ou
    // vazio) mantém o encaixe automático. Com tamanho manual o mapa continua
    // centralizado; maior que a tela, transborda igual dos dois lados (a câmera
    // rola por cima via x/y).
    var manual = (_isFiniteNumber(size) && size > 0) ? Math.max(1, Math.floor(size)) : 0;
    var cell = manual || (hasCanvas ? Math.max(1, Math.floor(Math.min(cw / cols, ch / rowsN))) : map.tile);
    map.draw = cell;
    // Sem tamanho de canvas (contexto atípico): não encaixa nem centraliza (fica em x/y).
    var ox = _finiteNumber(x, 0) + (hasCanvas ? Math.floor((cw - cols * cell) / 2) : 0);
    var oy = _finiteNumber(y, 0) + (hasCanvas ? Math.floor((ch - rowsN * cell) / 2) : 0);
    map.ox = ox;
    map.oy = oy;
    map._drawn = true;
    // Só visita as células que cruzam a viewport. O wrapper de câmera traduz o
    // contexto, então o recorte é calculado nas mesmas coordenadas de mundo de
    // ox/oy. Sem canvas mensurável, preserva o comportamento antigo e desenha tudo.
    var firstRow = 0, lastRow = rowsN - 1, firstCol = 0, lastCol = cols - 1;
    if (hasCanvas) {
      var visible = _visibleWorldRect(ctx);
      firstCol = Math.max(0, Math.floor((visible.left - ox) / cell));
      lastCol = Math.min(cols - 1, Math.ceil((visible.right - ox) / cell) - 1);
      firstRow = Math.max(0, Math.floor((visible.top - oy) / cell));
      lastRow = Math.min(rowsN - 1, Math.ceil((visible.bottom - oy) / cell) - 1);
    }
    for (var r = firstRow; r <= lastRow; r++) {
      var row = map.rows[r];
      var rowLastCol = Math.min(lastCol, row.length - 1);
      for (var c = firstCol; c <= rowLastCol; c++) {
        var idx = row[c];
        if (idx < 0) continue;
        drawFrame(ctx, map.tileset, idx, ox + c * cell, oy + r * cell, cell, cell);
      }
    }
  }
  /**
   * Impede o sprite de atravessar os tiles sólidos do mapa: empurra o sprite para
   * FORA de cada célula sólida que ele toca (pelo eixo de menor sobreposição) e
   * zera a velocidade nesse eixo — assim ele pousa sobre o chão e bate nas
   * paredes. Usa o canto (ox/oy) do último drawTileMap para alinhar a colisão.
   */
  // Contato exato não tem sobreposição. Ainda assim, ele é apoio quando a face
  // horizontal coincide, o sprite continua caindo nessa direção (ou já estava
  // apoiado no quadro anterior) e há sobreposição REAL no eixo X.
  function _touchesGravitySupport(sprite, x, y, w, h, gravity) {
    if (!sprite) return false;
    var overlapX = Math.min(sprite.x + sprite.w, x + w) - Math.max(sprite.x, x);
    if (overlapX <= 0) return false;
    var pullsUp = _gravityPullsUp(gravity);
    var touchingFace = pullsUp
      ? Math.abs(sprite.y - (y + h)) <= 0.0001
      : Math.abs(sprite.y + sprite.h - y) <= 0.0001;
    var vy = _finiteNumber(sprite.vy, 0);
    var movesTowardFace = pullsUp ? vy < 0 : vy > 0;
    return touchingFace && (movesTowardFace || sprite._groundedLastFrame === true);
  }
  function _restOnGravitySupport(sprite, y, h, gravity) {
    if (!sprite) return;
    sprite.y = _gravityPullsUp(gravity) ? y + h : y - sprite.h;
    sprite.vy = 0;
    sprite.onGround = true;
  }
  function collideTileMap(sprite, map) {
    if (!sprite || !map || !map.rows || !map.tile) return;
    // Antes do 1º "Desenhar o mapa" não sabemos onde ele fica na tela (o encaixe é
    // calculado no desenho) — a colisão usaria o canto (0,0) e ficaria torta.
    if (map && !map._drawn) warnOnce('colmapfirst', 'desenhe o mapa (bloco "Desenhar o mapa") ANTES de "Impedir de atravessar os tiles" — senão a colisão fica fora do lugar no 1º quadro.');
    var t = tileScreenSize(map), ox = _finiteNumber(map.ox, 0), oy = _finiteNumber(map.oy, 0);
    if (!_isFiniteNumber(t) || t <= 0 ||
        !_isFiniteNumber(sprite.x) || !_isFiniteNumber(sprite.y) ||
        !_isFiniteNumber(sprite.w) || !_isFiniteNumber(sprite.h)) return;
    var rowsN = map.rows.length;
    var colsN = tileMapCols(map);
    if (!rowsN || !colsN) return;
    // A busca pertence ao MAPA, nunca ao tamanho arbitrário do sprite. Além de
    // evitar trabalho inútil fora da grade, isto torna o laço finitamente
    // limitado mesmo quando a criança usa dimensões enormes.
    var c0 = Math.max(0, Math.floor((sprite.x - ox) / t));
    var c1 = Math.min(colsN - 1, Math.floor((sprite.x + sprite.w - 1 - ox) / t));
    var r0 = Math.max(0, Math.floor((sprite.y - oy) / t));
    var r1 = Math.min(rowsN - 1, Math.floor((sprite.y + sprite.h - 1 - oy) / t));
    var gravity = _worldGravityOr(0.6);
    var pullsUp = _gravityPullsUp(gravity);
    var vy = _finiteNumber(sprite.vy, 0);
    if (pullsUp ? (vy < 0 || sprite._groundedLastFrame === true) : (vy > 0 || sprite._groundedLastFrame === true)) {
      if (pullsUp) r0 = Math.max(0, Math.floor((sprite.y - oy) / t) - 1);
      else r1 = Math.min(rowsN - 1, Math.floor((sprite.y + sprite.h - oy) / t));
    }
    if (c0 > c1 || r0 > r1) return;
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        // Peça PLATAFORMA (one-way): segura o sprite na face para a qual a
        // gravidade puxa. Com gravidade normal, pousa por cima; com gravidade
        // negativa, pousa por baixo. Atravessar pela face oposta, andar de lado
        // ou ficar parado dentro dela continua permitido.
        if (isPlatformCell(map, c, r)) {
          var pty = oy + r * t;
          var pox = ox + c * t;
          var pOverlapX = Math.min(sprite.x + sprite.w, pox + t) - Math.max(sprite.x, pox);
          var pOverlapY = Math.min(sprite.y + sprite.h, pty + t) - Math.max(sprite.y, pty);
          var platformPullsUp = pullsUp;
          var platformVY = _finiteNumber(sprite.vy, 0);
          var crossesPlatformFace = platformPullsUp
            ? sprite.y - platformVY >= pty + t - 1
            : sprite.y + sprite.h - platformVY <= pty + 1;
          var movesTowardPlatform = platformPullsUp ? platformVY < 0 : platformVY > 0;
          var touchesPlatformFace = _touchesGravitySupport(sprite, pox, pty, t, t, gravity);
          if (pOverlapX > 0 && (pOverlapY > 0 || touchesPlatformFace) &&
              (movesTowardPlatform || sprite._groundedLastFrame === true) &&
              (crossesPlatformFace || touchesPlatformFace)) {
            _restOnGravitySupport(sprite, pty, t, gravity);
          }
          continue;
        }
        if (!isSolidCell(map, c, r)) continue;
        var tx = ox + c * t, ty = oy + r * t;
        var overlapX = Math.min(sprite.x + sprite.w, tx + t) - Math.max(sprite.x, tx);
        var overlapY = Math.min(sprite.y + sprite.h, ty + t) - Math.max(sprite.y, ty);
        if (_touchesGravitySupport(sprite, tx, ty, t, t, gravity)) {
          _restOnGravitySupport(sprite, ty, t, gravity);
          continue;
        }
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          if (sprite.x < tx) sprite.x -= overlapX; else sprite.x += overlapX;
          sprite.vx = 0;
        } else {
          var collisionGravity = gravity;
          if (sprite.y < ty) {
            sprite.y -= overlapY;
            // Pousou num tile (empurrado p/ CIMA enquanto caía): está no chão.
            // Nunca seta false — o helper de gravidade do quadro já fez isso.
            if (!_gravityPullsUp(collisionGravity) && (sprite.vy || 0) > 0) {
              sprite.vy = 0; sprite.onGround = true;
            }
          }
          else {
            sprite.y += overlapY;
            if ((sprite.vy || 0) < 0) {
              sprite.vy = 0;
              if (_gravityPullsUp(collisionGravity)) sprite.onGround = true;
            }
          }
        }
      }
    }
  }

  /**
   * Impede o sprite de atravessar os sprites de um GRUPO (obstáculos desenhados à
   * mão: pedras, casas, paredes). Mesma ideia do collideTileMap, mas contra o
   * retângulo de cada sprite do grupo: empurra para FORA pelo eixo de menor
   * sobreposição e zera a velocidade nesse eixo (dá parede E chão + deslizar).
   * Compara os CENTROS (obstáculos de tamanhos variados) — não o canto.
   */
  // Empurra o sprite para FORA de UM outro sprite (o núcleo do collideGroup, por
  // item): eixo de menor sobreposição, zera a velocidade nesse eixo, pousa em cima.
  function collideSprite(sprite, o) {
    if (!sprite || !o || o === sprite) return;
    var collisionGravity = _worldGravityOr(0.6);
    if (_touchesGravitySupport(sprite, o.x, o.y, o.w, o.h, collisionGravity)) {
      _restOnGravitySupport(sprite, o.y, o.h, collisionGravity);
      return;
    }
    var overlapX = Math.min(sprite.x + sprite.w, o.x + o.w) - Math.max(sprite.x, o.x);
    var overlapY = Math.min(sprite.y + sprite.h, o.y + o.h) - Math.max(sprite.y, o.y);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      var cx = sprite.x + sprite.w / 2, ocx = o.x + o.w / 2;
      if (cx < ocx) sprite.x -= overlapX; else sprite.x += overlapX;
      sprite.vx = 0;
    } else {
      var cy = sprite.y + sprite.h / 2, ocy = o.y + o.h / 2;
      if (cy < ocy) {
        sprite.y -= overlapY;
        if (!_gravityPullsUp(collisionGravity) && (sprite.vy || 0) > 0) {
          sprite.vy = 0; sprite.onGround = true;
        }
      } else {
        sprite.y += overlapY;
        if ((sprite.vy || 0) < 0) {
          sprite.vy = 0;
          if (_gravityPullsUp(collisionGravity)) sprite.onGround = true;
        }
      }
    }
  }
  function collideGroup(sprite, group) {
    if (!sprite || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) collideSprite(sprite, group.items[i]);
  }

  // ---- Eventos "Quando…" ----
  // Um listener real despacha para callbacks identificados pelo id do bloco.
  // A identidade não depende do texto da função: closures iguais continuam
  // sendo eventos diferentes quando vieram de blocos diferentes.
  var keyHandlers = Object.create(null);
  var keyHandlerOrder = [];
  window.addEventListener('keydown', function (e) {
    _setDirectionalKey(e, true);
    pressedKeys[_normalizeGameKey(e.key)] = true;
    pressedKeys[_normalizeGameKey(e.code)] = true;
    // O sistema REPETE keydown enquanto a tecla fica segurada; "quando apertar" só
    // dispara no toque, então ignoramos as repetições (senão vira metralhadora).
    if (e.repeat) return;
    var generation = _driverGeneration;
    var handlers = keyHandlerOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var h = keyHandlers[id];
      if (!h) continue;
      var hit = _eventMatchesGameKey(e, h.key);
      if (!hit) continue;
      try { _invokeProjectCallback(h.fn, h, []); }
      catch (error) {
        _reportHandlerError('“Quando apertar a tecla”', id, error);
        _removeOrderedIfCurrent(keyHandlers, keyHandlerOrder, id, h);
      }
      if (_runGenerationChanged(generation)) return;
    }
  });
  /** Roda fn toda vez que a tecla é apertada (compara e.key e e.code). */
  function onKey(key, fn, explicitId) {
    if (typeof fn !== 'function' || !key) return;
    if (_runningLoopId && !explicitId) {
      warnOnce('evento-tecla-no-quadro', '“Quando apertar a tecla” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var id = _stableHandlerId('tecla', explicitId, fn);
    if (!keyHandlers[id]) keyHandlerOrder.push(id);
    keyHandlers[id] = { key: key, fn: fn };
  }
  // Sobreposição: registra pares (getA, getB, fn) e checa num rAF interno (começa
  // sob demanda). Edge-triggered: dispara UMA vez quando começam a encostar. Os
  // sprites entram como thunks (() => sprite) — resolvidos no disparo, então a
  // ordem dos blocos no topo não causa erro de "antes de declarar".
  var overlapHandlers = Object.create(null);
  var _overlapOrder = [];
  function _runOverlapHandlers() {
    // "Pausar o jogo" congela também a checagem de sobreposição: sem isto, dois
    // sprites parados encostados seguiriam disparando o "quando encostar", e ao
    // despausar viria uma borda FALSA. Congelar o wasOverlapping preserva o estado.
    if (!_paused) {
      var generation = _driverGeneration;
      var handlers = _overlapOrder.slice();
      for (var i = 0; i < handlers.length; i++) {
        var id = handlers[i];
        var h = overlapHandlers[id];
        if (!h) continue;
        var a = null, b = null;
        try {
          a = _invokeProjectCallback(h.getA, h, []);
          b = _invokeProjectCallback(h.getB, h, []);
        }
        catch (error) {
          _reportHandlerError('“Quando encostar”', id, error);
          _removeOrderedIfCurrent(overlapHandlers, _overlapOrder, id, h);
          if (_runGenerationChanged(generation)) return;
          continue;
        }
        if (_runGenerationChanged(generation)) return;
        var over = isColliding(a, b);
        if (over && !h.wasOverlapping) {
          try { _invokeProjectCallback(h.fn, h, []); }
          catch (error) {
            _reportHandlerError('“Quando encostar”', id, error);
            _removeOrderedIfCurrent(overlapHandlers, _overlapOrder, id, h);
          }
          if (_runGenerationChanged(generation)) return;
        }
        h.wasOverlapping = over;
      }
    }
  }
  function onOverlap(getA, getB, fn, explicitId) {
    if (typeof getA !== 'function' || typeof getB !== 'function' || typeof fn !== 'function') return;
    if (_runningLoopId && !explicitId) {
      warnOnce('evento-contato-no-quadro', '“Quando encostar” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var id = _stableHandlerId('contato', explicitId, fn);
    if (!overlapHandlers[id]) _overlapOrder.push(id);
    overlapHandlers[id] = { getA: getA, getB: getB, fn: fn, wasOverlapping: false };
    _ensureDriver();
  }

  // ---- Perguntas (booleanos): "tecla apertada?" e "sprites se tocando?" ----
  // Estado de TODAS as teclas seguradas (o "keys" lá de cima só cobre as setas).
  var pressedKeys = Object.create(null);
  window.addEventListener('keyup', function (e) {
    _setDirectionalKey(e, false);
    pressedKeys[_normalizeGameKey(e.key)] = false;
    pressedKeys[_normalizeGameKey(e.code)] = false;
  });
  // Ao trocar de aba/janela (alt-tab), o "keyup"/"pointerup" não chega ao jogo e a
  // tecla/dedo ficaria "grudado" (o herói anda sozinho para sempre). Ao perder o
  // foco, soltamos tudo: setas, todas as teclas seguradas e o clique.
  function _releaseAllInputs() {
    keys.left = keys.right = keys.up = keys.down = false;
    for (var k in pressedKeys) pressedKeys[k] = false;
    pointer.down = false;
  }
  function _suspendInputAndClock() {
    _releaseAllInputs();
    _resetDriverClock();
  }
  window.addEventListener('blur', _suspendInputAndClock);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) _suspendInputAndClock();
  });
  /** Verdadeiro enquanto a tecla está segurada (compara e.key e e.code). */
  function keyDown(key) {
    return !!pressedKeys[_normalizeGameKey(key)];
  }
  /** Verdadeiro enquanto os dois sprites se tocam (alias de isColliding). */
  function touches(a, b) { return isColliding(a, b); }

  // ---- Grupos de sprites: MUITOS sprites (tiros, inimigos, estrelas) ----
  // Um grupo é só uma LISTA gerenciada de sprites — os mesmos objetos de
  // createSprite. Assim drawSprite/applyVelocity/isColliding já funcionam em
  // cada item, sem motor novo. Teto rígido p/ não vazar memória se o aluno
  // criar sprites sem parar (ex.: um tiro por quadro).
  var MAX_GROUP = 400;
  // Um sprite pode pertencer a mais de um grupo no modo Código. O redraw de uma
  // imagem pendente pertence ao SPRITE, não a um vínculo isolado: só o liberamos
  // quando o último grupo gerenciado deixa de possuir aquele objeto.
  var _managedGroups = new WeakSet();
  var _spriteGroupOwners = new WeakMap();
  function _trackableGroupItem(sprite) {
    return !!sprite && (typeof sprite === 'object' || typeof sprite === 'function');
  }
  function _uniqueTrackableItems(items) {
    var unique = new Set();
    for (var i = 0; i < items.length; i++) {
      if (_trackableGroupItem(items[i])) unique.add(items[i]);
    }
    return unique;
  }
  function _syncGroupOwnership(previousItems, nextItems) {
    var previous = _uniqueTrackableItems(previousItems);
    var next = _uniqueTrackableItems(nextItems);
    next.forEach(function (sprite) {
      if (previous.has(sprite)) return;
      _spriteGroupOwners.set(sprite, (_spriteGroupOwners.get(sprite) || 0) + 1);
    });
    previous.forEach(function (sprite) {
      if (next.has(sprite)) return;
      var owners = _spriteGroupOwners.get(sprite) || 0;
      if (owners <= 1) {
        _spriteGroupOwners.delete(sprite);
        _disposeSprite(sprite);
      } else {
        _spriteGroupOwners.set(sprite, owners - 1);
      }
    });
  }
  function _disposeUnmanagedGroupItem(sprite) {
    if (!_trackableGroupItem(sprite) || (_spriteGroupOwners.get(sprite) || 0) > 0) return;
    _disposeSprite(sprite);
  }
  /** Marca uma mudança de pertencimento/ordem para varreduras com snapshot. */
  function _touchGroup(group) {
    if (!group) return;
    group._revision = _finiteNumber(group._revision, 0) + 1;
  }
  /** Atualiza ownership e libera somente sprites que ficaram sem nenhum grupo dono. */
  function _disposeRemovedGroupItems(previousItems, nextItems) {
    _syncGroupOwnership(previousItems, nextItems);
  }
  /**
   * O array do grupo faz parte da API pública no modo Código. Rastreá-lo aqui
   * mantém as varreduras corretas tanto pelos blocos quanto por push/splice,
   * atribuição por índice ou substituição direta de items feita pela criança.
   */
  function _trackGroupItems(group, initialItems) {
    var mutatingMethods = {
      copyWithin: true,
      fill: true,
      pop: true,
      push: true,
      reverse: true,
      shift: true,
      sort: true,
      splice: true,
      unshift: true
    };
    var methodWrappers = Object.create(null);
    var proxy = null;
    proxy = new Proxy(initialItems, {
      get: function (target, property, receiver) {
        var arrayMethod = typeof property === 'string' ? Array.prototype[property] : null;
        if (!mutatingMethods[property] || typeof arrayMethod !== 'function' || target[property] !== arrayMethod) {
          return Reflect.get(target, property, receiver);
        }
        if (!methodWrappers[property]) {
          methodWrappers[property] = function () {
            var previousItems = target.slice();
            var result = arrayMethod.apply(target, arguments);
            _disposeRemovedGroupItems(previousItems, target);
            _touchGroup(group);
            return result === target ? proxy : result;
          };
        }
        return methodWrappers[property];
      },
      set: function (target, property, value) {
        var previousItems = target.slice();
        var hadProperty = Object.prototype.hasOwnProperty.call(target, property);
        var previous = target[property];
        target[property] = value;
        if (!hadProperty || previous !== value) {
          _disposeRemovedGroupItems(previousItems, target);
          _touchGroup(group);
        }
        return true;
      },
      deleteProperty: function (target, property) {
        if (!Object.prototype.hasOwnProperty.call(target, property)) return true;
        var previousItems = target.slice();
        delete target[property];
        _disposeRemovedGroupItems(previousItems, target);
        _touchGroup(group);
        return true;
      },
      defineProperty: function (target, property, descriptor) {
        var previousItems = target.slice();
        var hadProperty = Object.prototype.hasOwnProperty.call(target, property);
        var previous = target[property];
        Object.defineProperty(target, property, descriptor);
        if (!hadProperty || previous !== target[property]) {
          _disposeRemovedGroupItems(previousItems, target);
          _touchGroup(group);
        }
        return true;
      }
    });
    return proxy;
  }
  /** Cria um grupo vazio com pertencimento observável inclusive no modo Código. */
  function createGroup() {
    var group = { _revision: 0 };
    _managedGroups.add(group);
    var items = _trackGroupItems(group, []);
    Object.defineProperty(group, 'items', {
      enumerable: true,
      get: function () { return items; },
      set: function (nextItems) {
        if (nextItems === items) return;
        var previousItems = items.slice();
        var replacement = Array.isArray(nextItems) ? nextItems.slice() : [];
        items = _trackGroupItems(group, replacement);
        _disposeRemovedGroupItems(previousItems, replacement);
        _touchGroup(group);
      }
    });
    return group;
  }
  /** Snapshot estável: itens novos ficam para a próxima passada e removidos não rodam. */
  function _beginGroupTraversal(group) {
    return {
      items: group.items.slice(),
      revision: _finiteNumber(group._revision, 0),
      members: new Set(group.items)
    };
  }
  function _refreshGroupTraversal(group, traversal) {
    var revision = _finiteNumber(group._revision, 0);
    if (revision === traversal.revision) return;
    traversal.revision = revision;
    traversal.members = new Set(group.items);
  }
  /** Remove pertencimento e libera o trabalho assíncrono do sprite uma única vez. */
  function _removeGroupItemAt(group, index) {
    if (!group || !group.items || index < 0 || index >= group.items.length) return null;
    var sprite = group.items[index];
    group.items.splice(index, 1);
    if (!_managedGroups.has(group)) {
      _disposeUnmanagedGroupItem(sprite);
      _touchGroup(group);
    }
    return sprite;
  }
  function _clearGroupItems(group) {
    if (!group || !group.items || !group.items.length) return;
    if (_managedGroups.has(group)) {
      group.items.length = 0;
      return;
    }
    for (var i = 0; i < group.items.length; i++) _disposeUnmanagedGroupItem(group.items[i]);
    group.items.length = 0;
    _touchGroup(group);
  }
  /**
   * Cria um sprite (colorido OU com imagem, conforme opts) e o coloca no grupo.
   * Devolve o sprite. Acima do teto, descarta silenciosamente (nunca lança).
   */
  function spawn(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    var s = createSprite(opts);
    group.items.push(s);
    _touchGroup(group);
    return s;
  }
  // Cria um TIRO (bolinha brilhante) no grupo. x/y = CENTRO; raio em px.
  function spawnBullet(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var r = _positiveFiniteNumber(opts.radius, 5);
    var s = createSprite({
      x: _finiteNumber(opts.x, 0) - r,
      y: _finiteNumber(opts.y, 0) - r,
      w: r * 2,
      h: r * 2,
      color: opts.color,
      vx: opts.vx,
      vy: opts.vy
    });
    s.skin = { kind: 'bullet', color: opts.color || '#9cff57' };
    group.items.push(s);
    _touchGroup(group);
    return s;
  }
  /** Desenha o tiro: bolinha com brilho (glow). */
  function drawBullet(ctx, sprite) {
    var r = (sprite.w || 10) / 2;
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    var col = (sprite.skin && sprite.skin.color) || sprite.color || '#9cff57';
    ctx.save();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // Move o sprite SÓ na horizontal com as setas ← → (não sai sozinho da tela:
  // combine com "prender o sprite na tela").
  function arrowsX(sprite, speed) {
    if (!sprite) return;
    var sp = _finiteNumber(speed, 5);
    // Grava a velocidade horizontal p/ os getters (parado → 0); só mexe no eixo X.
    sprite.vx = (keys.right ? sp : 0) - (keys.left ? sp : 0);
    if (keys.left) sprite.x -= sp;
    if (keys.right) sprite.x += sp;
  }
  // Faz o sprite PISCAR por N quadros (ex.: invencibilidade ao levar dano).
  function blink(sprite, frames) {
    if (!sprite) return;
    sprite.blinkFrames = Math.floor(_positiveFiniteNumber(frames, 60));
  }
  /** Move cada sprite do grupo pela sua velocidade (e gravidade do mundo). */
  function updateGroup(group) {
    if (!group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) applyVelocity(group.items[i]);
  }
  /**
   * Move cada sprite do grupo pela sua velocidade, SEM somar gravidade — para
   * TIROS do jogador num jogo com gravidade (senão eles arqueiam para baixo).
   */
  function updateGroupNoGravity(group) {
    if (!group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) {
      var s = group.items[i];
      if (!s) continue;
      s.x = _finiteNumber(s.x, 0) + _finiteNumber(s.vx, 0);
      s.y = _finiteNumber(s.y, 0) + _finiteNumber(s.vy, 0);
    }
  }
  /** Desenha todos os sprites do grupo. */
  function drawGroup(ctx, group) {
    if (!ctx || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) drawSprite(ctx, group.items[i]);
  }
  /**
   * Desenha o grupo ordenado pela BASE (y+h): quem está mais para baixo na tela
   * é desenhado por último (fica na frente). É a profundidade dos jogos top-down.
   * Ordena uma CÓPIA — a ordem lógica do grupo (trazer para frente/fundo) fica intacta.
   */
  function drawGroupByY(ctx, group) {
    if (!ctx || !group || !group.items) return;
    var snapshot = group.items.slice();
    snapshot.sort(function (a, b) {
      var aBase = (a ? _finiteNumber(a.y, 0) + _finiteNumber(a.h, 0) : 0);
      var bBase = (b ? _finiteNumber(b.y, 0) + _finiteNumber(b.h, 0) : 0);
      return aBase - bBase;
    });
    for (var i = 0; i < snapshot.length; i++) drawSprite(ctx, snapshot[i]);
  }
  /**
   * Roda fn(sprite, i) para cada sprite. Itera em ordem REVERSA para que o
   * corpo possa remover o item atual (com "tirar do grupo") sem pular nenhum.
   */
  function forEachInGroup(group, fn) {
    if (!group || !group.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var traversal = _beginGroupTraversal(group);
    for (var i = traversal.items.length - 1; i >= 0; i--) {
      _refreshGroupTraversal(group, traversal);
      var sprite = traversal.items[i];
      if (!sprite || !traversal.members.has(sprite)) continue;
      _invokeProjectCallback(fn, undefined, [sprite, i]);
      if (_runGenerationChanged(generation)) return;
    }
  }
  /** Quantos sprites o grupo tem agora. */
  function countGroup(group) { return (group && group.items) ? group.items.length : 0; }
  /** Esvazia o grupo (tira todos os sprites). */
  function clearGroup(group) {
    _clearGroupItems(group);
  }
  /** Tira um sprite específico do grupo (por referência). */
  function removeFromGroup(group, sprite) {
    if (!group || !group.items) return;
    var idx = group.items.indexOf(sprite);
    if (idx !== -1) _removeGroupItemAt(group, idx);
  }
  /**
   * Remove do grupo os sprites que saíram da tela (com uma margem). Para cada
   * um que sai, chama onLeave(sprite) — é assim que "asteroide escapou = perde
   * vida". Roda dentro do "a cada quadro" do aluno; sem RAF próprio.
   */
  function pruneOffscreen(ctx, group, margin, onLeave) {
    if (!ctx || !ctx.canvas || !group || !group.items) return;
    var generation = _driverGeneration;
    var m = _finiteNumber(margin, 40);
    var visible = _visibleWorldRect(ctx);
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { _removeGroupItemAt(group, i); continue; }
      if (s.x + s.w < visible.left - m || s.x > visible.right + m || s.y + s.h < visible.top - m || s.y > visible.bottom + m) {
        _removeGroupItemAt(group, i);
        if (typeof onLeave === 'function') {
          _invokeProjectCallback(onLeave, undefined, [s]);
          if (_runGenerationChanged(generation)) return;
        }
      }
    }
  }
  /**
   * Para cada par (sprite do grupo A, sprite do grupo B) que se encosta, chama
   * fn(a, b). Varredura por quadro (NÃO registra handler como onOverlap — sem
   * teto de 32 e sem edge-trigger): use dentro do "a cada quadro". Itera em
   * ordem reversa p/ tolerar remoção dos sprites no corpo (tiro some, inimigo
   * explode). Grupos grandes usam uma fase ampla por eixo X antes do teste AABB.
   */
  function _overlapBroadPhase(firstItems, secondItems, sameGroup) {
    if (firstItems.length * secondItems.length < 2048) return null;
    var sortedSecond = [];
    for (var j = 0; j < secondItems.length; j++) {
      var second = secondItems[j];
      if (!second) continue;
      var sx = second.x, sy = second.y, sw = second.w, sh = second.h;
      if (![sx, sy, sw, sh].every(Number.isFinite)) return null;
      sortedSecond.push({ index: j, left: sx, right: sx + sw, top: sy, bottom: sy + sh });
    }
    sortedSecond.sort(function (left, right) {
      return left.left - right.left || left.index - right.index;
    });
    var candidates = new Array(firstItems.length);
    for (var i = 0; i < firstItems.length; i++) {
      var first = firstItems[i];
      if (!first) { candidates[i] = []; continue; }
      var ax = first.x, ay = first.y, aw = first.w, ah = first.h;
      if (![ax, ay, aw, ah].every(Number.isFinite)) return null;
      var rightEdge = ax + aw;
      var lo = 0, hi = sortedSecond.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (sortedSecond[mid].left < rightEdge) lo = mid + 1;
        else hi = mid;
      }
      var js = [];
      for (var k = 0; k < lo; k++) {
        var bound = sortedSecond[k];
        if (sameGroup && bound.index >= i) continue;
        if (bound.right > ax && ay < bound.bottom && ay + ah > bound.top) js.push(bound.index);
      }
      js.sort(function (left, right) { return right - left; });
      candidates[i] = js;
    }
    return candidates;
  }
  function overlapGroups(a, b, fn) {
    if (!a || !a.items || !b || !b.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var sameGroup = a === b;
    var firstItems = a.items.slice();
    var secondItems = sameGroup ? firstItems : b.items.slice();
    var firstMembers = new Set(firstItems);
    var secondMembers = sameGroup ? firstMembers : new Set(secondItems);
    var firstRevision = a._revision, secondRevision = b._revision;
    var firstLength = a.items.length, secondLength = b.items.length;
    var broadCandidates = _overlapBroadPhase(firstItems, secondItems, sameGroup);
    function refreshMembership() {
      if (a._revision !== firstRevision || a.items.length !== firstLength) {
        firstMembers = new Set(a.items);
        firstRevision = a._revision;
        firstLength = a.items.length;
        if (sameGroup) secondMembers = firstMembers;
      }
      if (!sameGroup && (b._revision !== secondRevision || b.items.length !== secondLength)) {
        secondMembers = new Set(b.items);
        secondRevision = b._revision;
        secondLength = b.items.length;
      }
    }
    for (var i = firstItems.length - 1; i >= 0; i--) {
      var ai = firstItems[i];
      refreshMembership();
      if (!ai || !firstMembers.has(ai)) continue;
      var lastJ = sameGroup ? i - 1 : secondItems.length - 1;
      var candidateJs = broadCandidates ? broadCandidates[i] : null;
      var cursor = candidateJs ? 0 : lastJ;
      while (candidateJs ? cursor < candidateJs.length : cursor >= 0) {
        var j = candidateJs ? candidateJs[cursor++] : cursor--;
        var bj = secondItems[j];
        if (!bj || !secondMembers.has(bj)) continue;
        if (isColliding(ai, bj)) {
          _invokeProjectCallback(fn, undefined, [ai, bj]);
          if (_runGenerationChanged(generation)) return;
          refreshMembership();
          // Se o corpo REMOVEU ai (ex.: "remova o tiro"), ele não deve acertar mais
          // ninguém neste quadro — senão um tiro só derrubaria TODOS os inimigos
          // encostados. Se NÃO removeu, o laço segue (o tiro "perfura" de propósito).
          if (!firstMembers.has(ai)) break;
        }
      }
    }
  }

  // ---- Temporizadores didáticos: "a cada N quadros / segundos" ----
  // Sem RAF próprio: as raízes periódicas geradas usam contadores por CHAVE
  // estável. everyFrames conta quadros; everySeconds usa o relógio compartilhado.
  var frameCounters = Object.create(null);
  function everyFrames(key, n) {
    var step = (typeof n === 'number' && Number.isFinite(n) && n > 0)
      ? Math.max(1, Math.floor(n))
      : 1;
    var c = (frameCounters[key] || 0) + 1;
    frameCounters[key] = c;
    return c % step === 0;
  }
  var secondTimers = Object.create(null);
  function everySeconds(key, secs) {
    var period = _positiveFiniteNumber(secs, 1) * 1000;
    var t = now();
    var last = secondTimers[key];
    if (last === undefined) { secondTimers[key] = t; return false; }
    if (t - last >= period) { secondTimers[key] = t; return true; }
    return false;
  }
  // One-shot: "depois de N segundos, fazer" — dispara UMA vez por partida.
  // O reset do domínio zera o mapa, então reiniciar o jogo re-arma o timer.
  var onceTimers = Object.create(null);
  function afterSeconds(key, secs) {
    var delay = _positiveFiniteNumber(secs, 1) * 1000;
    var state = onceTimers[key];
    if (state === 'done') return false;
    var t = now();
    if (state === undefined) { onceTimers[key] = t; return false; }
    if (t - state >= delay) { onceTimers[key] = 'done'; return true; }
    return false;
  }

  _registerRuntimeDomain('world', {
    reset: function () {
      keyHandlers = Object.create(null);
      keyHandlerOrder = [];
      overlapHandlers = Object.create(null);
      _overlapOrder = [];
      pressedKeys = Object.create(null);
      frameCounters = Object.create(null);
      secondTimers = Object.create(null);
      onceTimers = Object.create(null);
      _tileMapCreates = 0;
      _releaseAllInputs();
    }
  });

`
