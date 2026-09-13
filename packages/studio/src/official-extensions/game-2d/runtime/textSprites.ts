/** Texto continua sendo uma aparência do sprite, com a mesma física e grupos. */
export const gameTwoDTextSpritesRuntime = `
  /** @type {CanvasRenderingContext2D | null} */
  var _textMeasureContext = null;
  var _textFontRevision = 0;
  var _spritePaintEpoch = 0;
  var _spritePaintOrder = 0;
  /** @type {WeakMap<object, Map<string, WeakMap<object, string>>>} */
  var _targetClickIds = new WeakMap();
  /** @type {WeakMap<object, string>} */
  var _textHudIds = new WeakMap();
  var _nextTextHudId = 1;
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.addEventListener('loadingdone', function () { _textFontRevision++; });
  }

  /** @param {unknown} value */
  function _spriteText(value) {
    var text = value === null || value === undefined ? '' : String(value);
    if (text.length > 4096) {
      warnOnce('texto-longo', 'O texto do sprite pode ter até 4096 caracteres. Divida o restante em outros sprites.');
      return text.slice(0, 4096);
    }
    return text;
  }
  /** @returns {CanvasRenderingContext2D | null} */
  function _textContext() {
    if (!_textMeasureContext && typeof document !== 'undefined') {
      _textMeasureContext = document.createElement('canvas').getContext('2d');
    }
    return _textMeasureContext;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _layoutSpriteText(sprite) {
    var style = sprite.textAppearance;
    if (!style || !sprite.skin || sprite.skin.kind !== 'text') return;
    var family = (window.SZGameUIFont && window.SZGameUIFont.family) || _szGameUIFont;
    var key = JSON.stringify([style.text, style.size, style.width, style.padding, family, _textFontRevision]);
    if (style.layoutKey === key) return;
    var ctx = _textContext();
    // Sem um canvas real ainda, as medidas provisórias serão refeitas ao desenhar.
    var font = '700 ' + style.size + 'px ' + family;
    var fontSize = style.size;
    if (ctx) ctx.font = font;
    /** @param {string} line */
    function widthOf(line) {
      if (!ctx) return Array.from(line).length * fontSize * 0.65;
      var metrics = ctx.measureText(line);
      return Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
    }
    var available = style.width > 0 ? Math.max(1, style.width - 2 * style.padding) : Infinity;
    /** @type {string[]} */
    var lines = [];
    var paragraphs = style.text.replace(/\\r\\n?/g, '\\n').split('\\n');
    for (var paragraph of paragraphs) {
      if (available === Infinity || widthOf(paragraph) <= available) { lines.push(paragraph); continue; }
      var line = '';
      for (var word of paragraph.split(/(\\s+)/)) {
        if (line && widthOf(line + word) > available) { lines.push(line.trimEnd()); line = ''; }
        if (!line && /^\\s+$/.test(word)) continue;
        for (var character of Array.from(word)) {
          if (line && widthOf(line + character) > available) { lines.push(line); line = ''; }
          line += character;
        }
      }
      lines.push(line);
    }
    var scaleX = style.measuredW > 0 ? sprite.w / style.measuredW : 1;
    var scaleY = style.measuredH > 0 ? sprite.h / style.measuredH : 1;
    var measuredWidth = 1;
    for (var textLine of lines) measuredWidth = Math.max(measuredWidth, widthOf(textLine));
    style.measuredW = Math.ceil(Math.max(style.width, measuredWidth + 2 * style.padding));
    style.measuredH = Math.ceil(lines.length * style.size * 1.3 + 2 * style.padding);
    style.lines = lines;
    style.font = font;
    style.layoutKey = ctx ? key : '';
    sprite.w = style.measuredW * scaleX;
    sprite.h = style.measuredH * scaleY;
  }
  /**
   * @param {unknown} text
   * @param {number} x
   * @param {number} y
   * @returns {import('./runtimeContract').GameTwoDSprite}
   */
  function createTextSprite(text, x, y) {
    /** @type {import('./runtimeContract').GameTwoDSprite} */
    var sprite = createSprite({ x: x, y: y });
    setSpriteText(sprite, text);
    return sprite;
  }
  /**
   * @param {import('./runtimeContract').GameTwoDGroup} group
   * @param {unknown} text
   * @param {number} x
   * @param {number} y
   */
  function spawnTextInGroup(group, text, x, y) {
    var sprite = createTextSprite(text, x, y);
    addToGroup(group, sprite);
    return sprite;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {unknown} text */
  function setSpriteText(sprite, text) {
    if (!sprite) return;
    _cancelSpriteImageRedraw(sprite);
    sprite.image = null;
    sprite.anim = null;
    sprite._animState = null;
    sprite.skin = { kind: 'text' };
    _applyArtHitbox(sprite, '');
    if (!sprite.textAppearance) {
      sprite.textAppearance = {
        text: '', size: 32, color: '#ffffff', width: 0, align: 'left',
        padding: 4, background: 'transparent', font: '', lines: [],
        measuredW: 0, measuredH: 0, layoutKey: ''
      };
    }
    sprite.textAppearance.text = _spriteText(text);
    _layoutSpriteText(sprite);
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function spriteText(sprite) {
    return sprite && sprite.skin && sprite.skin.kind === 'text' && sprite.textAppearance ? sprite.textAppearance.text : '';
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {number} size @param {string} color */
  function setTextStyle(sprite, size, color) {
    if (!sprite || !sprite.textAppearance) return;
    sprite.textAppearance.size = Math.min(512, _positiveFiniteNumber(size, 32));
    sprite.textAppearance.color = color || '#ffffff';
    _layoutSpriteText(sprite);
  }
  /**
   * @param {import('./runtimeContract').GameTwoDSprite} sprite
   * @param {number} width
   * @param {'left' | 'center' | 'right'} align
   * @param {number} padding
   * @param {string} background
   */
  function setTextBox(sprite, width, align, padding, background) {
    if (!sprite || !sprite.textAppearance) return;
    var style = sprite.textAppearance;
    style.width = Math.max(0, Math.min(4096, _finiteNumber(width, 0)));
    style.padding = Math.max(0, Math.min(256, _finiteNumber(padding, 4)));
    style.align = align === 'center' || align === 'right' ? align : 'left';
    style.background = background || 'transparent';
    _layoutSpriteText(sprite);
  }
  /** @param {CanvasRenderingContext2D} ctx @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _drawTextSprite(ctx, sprite) {
    _layoutSpriteText(sprite);
    var style = sprite.textAppearance;
    if (!style) return;
    _announceTextSprite(ctx, sprite);
    ctx.save();
    try {
      ctx.translate(sprite.x, sprite.y);
      ctx.scale(sprite.w / style.measuredW, sprite.h / style.measuredH);
      if (style.background !== 'transparent') {
        ctx.fillStyle = style.background;
        ctx.fillRect(0, 0, style.measuredW, style.measuredH);
      }
      ctx.font = style.font;
      ctx.fillStyle = style.color;
      ctx.textAlign = style.align;
      ctx.textBaseline = 'middle';
      var x = style.align === 'center' ? style.measuredW / 2 : style.align === 'right' ? style.measuredW - style.padding : style.padding;
      for (var i = 0; i < style.lines.length; i++) {
        ctx.fillText(style.lines[i], x, style.padding + (i + 0.5) * style.size * 1.3);
      }
    } finally { ctx.restore(); }
  }
  /** Publica somente o texto visível; o ciclo de HUD remove os sprites que deixaram de ser desenhados.
   * @param {CanvasRenderingContext2D} ctx @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _announceTextSprite(ctx, sprite) {
    var key = _textHudIds.get(sprite);
    var angle = _finiteNumber(sprite.angle, 0) + (sprite.direction === 'up' ? -Math.PI / 2 : sprite.direction === 'down' ? Math.PI / 2 : 0);
    var halfW = (Math.abs(sprite.w * Math.cos(angle)) + Math.abs(sprite.h * Math.sin(angle))) / 2;
    var halfH = (Math.abs(sprite.w * Math.sin(angle)) + Math.abs(sprite.h * Math.cos(angle))) / 2;
    var cx = sprite.x + sprite.w / 2 - camera.x;
    var cy = sprite.y + sprite.h / 2 - camera.y;
    var visible = ctx.globalAlpha > 0 && cx + halfW > 0 && cy + halfH > 0 && cx - halfW < stageW(ctx) && cy - halfH < stageH(ctx);
    if (!visible) { if (key) _updateAccessibleHud(key, ''); return; }
    if (!key) {
      key = 'sprite-text:' + String(_nextTextHudId++).padStart(8, '0');
      _textHudIds.set(sprite, key);
    }
    _updateAccessibleHud(key, spriteText(sprite));
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {string} key @param {unknown} value */
  function setSpriteData(sprite, key, value) {
    if (!sprite || typeof key !== 'string') return;
    if (!sprite.data) sprite.data = Object.create(null);
    Object.defineProperty(sprite.data, key, { value: value, writable: true, enumerable: true, configurable: true });
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {string} key @param {unknown} fallback */
  function spriteData(sprite, key, fallback) {
    return sprite && sprite.data && Object.prototype.hasOwnProperty.call(sprite.data, key) ? sprite.data[key] : fallback;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {number} x @param {number} y */
  function _spriteContainsPointer(sprite, x, y) {
    if (!sprite || sprite._paintEpoch !== _spritePaintEpoch || !sprite._paintOrder || (sprite.opacity !== undefined && sprite.opacity <= 0)) return false;
    _layoutSpriteText(sprite);
    var dx = x + camera.x - sprite.x - sprite.w / 2;
    var dy = y + camera.y - sprite.y - sprite.h / 2;
    var angle = _finiteNumber(sprite.angle, 0) + (sprite.direction === 'up' ? -Math.PI / 2 : sprite.direction === 'down' ? Math.PI / 2 : 0);
    var localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    var localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return Math.abs(localX) <= sprite.w / 2 && Math.abs(localY) <= sprite.h / 2;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {() => void} fn @param {string} [id] */
  function onSpriteClick(sprite, fn, id) {
    if (!sprite || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-sprite-no-quadro', 'Registre o clique no sprite em “Quando acontecer”, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _targetClickHandlerId('sprite-clique', id, sprite, fn);
    onPointer(function (x, y) { if (_spriteContainsPointer(sprite, x, y)) fn(); }, handlerId);
  }
  /** @param {import('./runtimeContract').GameTwoDGroup} group @param {(sprite: import('./runtimeContract').GameTwoDSprite) => void} fn @param {string} [id] */
  function onGroupClick(group, fn, id) {
    if (!group || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-grupo-no-quadro', 'Registre o clique no grupo em “Quando acontecer”, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _targetClickHandlerId('grupo-clique', id, group, fn);
    onPointer(function (x, y) {
      /** @type {import('./runtimeContract').GameTwoDSprite | undefined} */
      var picked;
      for (var sprite of group.items) {
        if (_spriteContainsPointer(sprite, x, y) && (!picked || (sprite._paintOrder || 0) > (picked._paintOrder || 0))) picked = sprite;
      }
      if (picked) fn(picked);
    }, handlerId);
  }
  /** @param {string} prefix @param {string | undefined} id @param {object} target @param {object} fn */
  function _targetClickHandlerId(prefix, id, target, fn) {
    if (typeof id === 'string' && id) return prefix + ':id:' + id;
    var kinds = _targetClickIds.get(target);
    if (!kinds) { kinds = new Map(); _targetClickIds.set(target, kinds); }
    var callbacks = kinds.get(prefix);
    if (!callbacks) { callbacks = new WeakMap(); kinds.set(prefix, callbacks); }
    var known = callbacks.get(fn);
    if (!known) {
      known = prefix + ':alvo-' + _nextHandlerId++;
      callbacks.set(fn, known);
    }
    return known;
  }
  _registerRuntimeDomain('text-sprites', {
    reset: function () {
      _targetClickIds = new WeakMap();
      _textHudIds = new WeakMap();
      _nextTextHudId = 1;
    }
  });
`
