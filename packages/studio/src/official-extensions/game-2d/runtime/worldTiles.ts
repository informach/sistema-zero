export const gameTwoDWorldTilesRuntime = `  // ---- Tiles / tilemaps (v0.5.0) ----
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
  var MAX_TILEMAP_TEXT_CHARS = 1000000;
  var MAX_TILEMAP_ROWS = 512;
  var MAX_TILEMAP_COLUMNS = 512;
  var MAX_TILEMAP_CELLS = 262144;
  var MAX_TILEMAP_SOLID_ENTRIES = 512;
  var MAX_TILEMAP_TOKEN_CHARS = 32;
  function _warnTileMapLimit() {
    warnOnce(
      'tilemap-input-budget',
      'o mapa passou do limite seguro do mapa (512 linhas por 512 colunas); usei somente a parte que cabe.'
    );
  }
  function parseGrid(text) {
    var rows = [];
    if (typeof text !== 'string') return rows;
    var row = [];
    var token = '';
    var cells = 0;
    var truncated = text.length > MAX_TILEMAP_TEXT_CHARS;
    function pushToken() {
      if (token === '') return;
      if (row.length >= MAX_TILEMAP_COLUMNS || cells + row.length >= MAX_TILEMAP_CELLS) {
        truncated = true;
      } else if (token === '.' || token === '-') { row.push(-1); }
      else { var n = parseInt(token, 10); row.push(isNaN(n) ? -1 : n); }
      token = '';
    }
    function pushRow() {
      pushToken();
      if (row.length > 0) {
        if (rows.length >= MAX_TILEMAP_ROWS || cells >= MAX_TILEMAP_CELLS) truncated = true;
        else {
          var remaining = MAX_TILEMAP_CELLS - cells;
          if (row.length > remaining) { row.length = remaining; truncated = true; }
          rows.push(row);
          cells += row.length;
        }
      }
      row = [];
    }
    var textLength = Math.min(text.length, MAX_TILEMAP_TEXT_CHARS);
    for (var i = 0; i < textLength; i++) {
      if (rows.length >= MAX_TILEMAP_ROWS || cells >= MAX_TILEMAP_CELLS) {
        truncated = true;
        break;
      }
      var ch = text.charAt(i);
      var code = text.charCodeAt(i);
      if (ch === ';' || code === 10 || code === 13) { pushRow(); }
      else if (code === 32 || code === 9 || ch === ',') { pushToken(); }
      else if (token.length < MAX_TILEMAP_TOKEN_CHARS) { token += ch; }
      else { truncated = true; }
    }
    pushRow();
    if (truncated) _warnTileMapLimit();
    return rows;
  }
  function parseSolidList(text) {
    var out = [];
    if (typeof text !== 'string') return out;
    var token = '';
    var truncated = text.length > MAX_TILEMAP_TEXT_CHARS;
    function flush() {
      if (token === '') return;
      var n = parseInt(token, 10);
      if (!isNaN(n)) {
        if (out.length < MAX_TILEMAP_SOLID_ENTRIES) out.push(n);
        else truncated = true;
      }
      token = '';
    }
    var textLength = Math.min(text.length, MAX_TILEMAP_TEXT_CHARS);
    for (var i = 0; i < textLength; i++) {
      if (out.length >= MAX_TILEMAP_SOLID_ENTRIES) { truncated = true; break; }
      var code = text.charCodeAt(i);
      // separadores: espaço(32), tab(9), nova linha(10), retorno(13), vírgula(44), ';'(59)
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 44 || code === 59) {
        flush();
      } else if (token.length < MAX_TILEMAP_TOKEN_CHARS) {
        token += text.charAt(i);
      } else { truncated = true; }
    }
    flush();
    if (truncated) _warnTileMapLimit();
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
  function createTileMap(options) {
    options = options || {};
    _tileMapCreates += 1;
    if (_tileMapCreates === 61) {
      console.warn(
        'SZGame2D: "Criar mapa" está rodando sem parar: ele provavelmente está DENTRO do "A cada quadro do jogo". Monte o bloco de criar o mapa FORA do laço (uma vez só) e deixe dentro do laço apenas o "Desenhar o mapa".'
      );
    }
    // tile = tamanho do tile NA ARTE (para fatiar o tileset). O tamanho NA TELA
    // (draw) é calculado no desenho: o mapa ENCAIXA no canvas (a arte é ampliada
    // com nitidez pelo drawFrame). Assim um tile de 16px não fica minúsculo.
    var t = _positiveFiniteNumber(options.tile, 32);
    var solid = parseSolidList(options.solid);
    var solidIndex = new Set(solid);
    // Peças PLATAFORMA (one-way: pisa por cima, atravessa por baixo). Sólido
    // vence no conflito (uma peça não é sólida E plataforma ao mesmo tempo).
    var platform = parseSolidList(options.platform);
    if (platform.length && solid.length) {
      platform = platform.filter(function (n) { return !solidIndex.has(n); });
    }
    var map = {
      tileset: loadSpriteSheet(options.image, t, t),
      tile: t,
      draw: 0,
      rows: parseGrid(options.grid),
      solid: solid,
      platform: platform,
      ox: 0,
      oy: 0
    };
    Object.defineProperties(map, {
      _solidIndex: { value: solidIndex, writable: true, configurable: true },
      _solidIndexSnapshot: { value: solid.slice(), writable: true, configurable: true },
      _platformIndex: { value: new Set(platform), writable: true, configurable: true },
      _platformIndexSnapshot: { value: platform.slice(), writable: true, configurable: true }
    });
    return map;
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
    return map._solidIndex.has(r[col]);
  }
  /** Verdadeiro se a célula é uma PLATAFORMA (one-way). */
  function isPlatformCell(map, col, row) {
    if (!map || !map.rows || !map.platform) return false;
    if (row < 0 || row >= map.rows.length) return false;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return false;
    return map._platformIndex.has(r[col]);
  }
  /** Índice do tile no PIXEL (px,py) do canvas (alinhado a onde o mapa foi desenhado); -1 fora/vazio. */
  function tileAt(map, x, y) {
    if (!map || !map.rows || !map.tile) return -1;
    var t = tileScreenSize(map);
    if (!_isFiniteNumber(x) || !_isFiniteNumber(y) || t <= 0) return -1;
    var col = Math.floor((x - _finiteNumber(map.ox, 0)) / t);
    var row = Math.floor((y - _finiteNumber(map.oy, 0)) / t);
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
  function _restOnGravitySupport(sprite, y, h, gravity, support) {
    if (!sprite) return;
    sprite.y = _gravityPullsUp(gravity) ? y + h : y - sprite.h;
    sprite.vy = 0;
    _confirmGroundSupport(sprite, support);
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
    // solid/platform continuam arrays públicos. Como o modo código pode
    // alterá-los em lugar, comparamos cada lista com seu snapshot antes de
    // reutilizar o Set. O laço tem exatamente as duas famílias do contrato.
    for (var indexKind = 0; indexKind < 2; indexKind++) {
      var values = indexKind === 0 ? map.solid : map.platform;
      var snapshot = indexKind === 0 ? map._solidIndexSnapshot : map._platformIndexSnapshot;
      var index = indexKind === 0 ? map._solidIndex : map._platformIndex;
      var indexChanged = !index || !snapshot || snapshot.length !== values.length;
      if (!indexChanged) {
        for (var indexI = 0; indexI < values.length; indexI++) {
          var bothNaN = snapshot[indexI] !== snapshot[indexI] && values[indexI] !== values[indexI];
          if ((indexI in snapshot) !== (indexI in values) ||
              (!bothNaN && snapshot[indexI] !== values[indexI])) {
            indexChanged = true;
            break;
          }
        }
      }
      if (indexChanged) {
        index = new Set();
        for (var valueI = 0; valueI < values.length; valueI++) {
          // Array.indexOf ignora lacunas e nunca encontra NaN. O índice mantém
          // essa semântica para listas alteradas manualmente.
          if (valueI in values && values[valueI] === values[valueI]) index.add(values[valueI]);
        }
        if (indexKind === 0) {
          Object.defineProperties(map, {
            _solidIndex: { value: index, writable: true, configurable: true },
            _solidIndexSnapshot: { value: values.slice(), writable: true, configurable: true }
          });
        } else {
          Object.defineProperties(map, {
            _platformIndex: { value: index, writable: true, configurable: true },
            _platformIndexSnapshot: { value: values.slice(), writable: true, configurable: true }
          });
        }
      }
    }
    var gravity = world.gravity;
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
              sprite.vy = 0; _confirmGroundSupport(sprite, null);
            }
          }
          else {
            sprite.y += overlapY;
            if ((sprite.vy || 0) < 0) {
              sprite.vy = 0;
              if (_gravityPullsUp(collisionGravity)) _confirmGroundSupport(sprite, null);
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
  function collideSprite(sprite, obstacle) {
    if (!sprite || !obstacle || obstacle === sprite) return;
    _carryByGroundSupport(sprite, obstacle);
    var collisionGravity = world.gravity;
    if (_touchesGravitySupport(sprite, obstacle.x, obstacle.y, obstacle.w, obstacle.h, collisionGravity)) {
      _restOnGravitySupport(sprite, obstacle.y, obstacle.h, collisionGravity, obstacle);
      return;
    }
    var overlapX = Math.min(sprite.x + sprite.w, obstacle.x + obstacle.w) - Math.max(sprite.x, obstacle.x);
    var overlapY = Math.min(sprite.y + sprite.h, obstacle.y + obstacle.h) - Math.max(sprite.y, obstacle.y);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      var cx = sprite.x + sprite.w / 2, ocx = obstacle.x + obstacle.w / 2;
      if (cx < ocx) sprite.x -= overlapX; else sprite.x += overlapX;
      sprite.vx = 0;
    } else {
      var cy = sprite.y + sprite.h / 2, ocy = obstacle.y + obstacle.h / 2;
      if (cy < ocy) {
        sprite.y -= overlapY;
        if (!_gravityPullsUp(collisionGravity) && (sprite.vy || 0) > 0) {
          sprite.vy = 0; _confirmGroundSupport(sprite, obstacle);
        }
      } else {
        sprite.y += overlapY;
        if ((sprite.vy || 0) < 0) {
          sprite.vy = 0;
          if (_gravityPullsUp(collisionGravity)) _confirmGroundSupport(sprite, obstacle);
        }
      }
    }
  }
  function collideGroup(sprite, group) {
    if (!sprite || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) collideSprite(sprite, group.items[i]);
  }

  /**
   * Faz uma figura funcionar como plataforma unidirecional: apoia somente na
   * face atraída pela gravidade e nunca bloqueia pelas laterais ou pela face oposta.
   */
  function collidePlatform(sprite, platform) {
    if (!sprite || !platform || platform === sprite) return;
    _carryByGroundSupport(sprite, platform);
    var gravity = world.gravity;
    var pullsUp = _gravityPullsUp(gravity);
    var vy = _finiteNumber(sprite.vy, 0);
    var overlapX = Math.min(sprite.x + sprite.w, platform.x + platform.w) -
      Math.max(sprite.x, platform.x);
    var overlapY = Math.min(sprite.y + sprite.h, platform.y + platform.h) -
      Math.max(sprite.y, platform.y);
    var crossesFace = pullsUp
      ? sprite.y - vy >= platform.y + platform.h - 1
      : sprite.y + sprite.h - vy <= platform.y + 1;
    var movesTowardFace = pullsUp ? vy < 0 : vy > 0;
    var touchesFace = _touchesGravitySupport(
      sprite,
      platform.x,
      platform.y,
      platform.w,
      platform.h,
      gravity
    );
    if (overlapX > 0 && (overlapY > 0 || touchesFace) &&
        (movesTowardFace || sprite._groundedLastFrame === true) &&
        (crossesFace || touchesFace)) {
      _restOnGravitySupport(sprite, platform.y, platform.h, gravity, platform);
    }
  }
  function collidePlatformGroup(sprite, group) {
    if (!sprite || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) collidePlatform(sprite, group.items[i]);
  }

`
