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
  /** A imagem de fundo PRONTA para desenhar, ou null (sem imagem / ainda carregando).
   * @param {import('./runtimeContract').GameTwoDTextAppearance} style */
  function _textBackgroundImage(style) {
    var handle = style && style.imageHandle;
    return handle && handle.loaded && handle.img ? handle.img : null;
  }
  /**
   * A cor pinta? A régua era a comparação LITERAL com 'transparent', e continua
   * valendo (projeto salvo e código escrito à mão). Hoje a paleta entrega um
   * seletor de cor com opacidade, então cor invisível também não pinta —
   * senão todo sprite de texto novo gastaria um fillRect por quadro à toa.
   * @param {string} color
   */
  function _paintsBackground(color) {
    if (!color || typeof color !== 'string' || color === 'transparent') return false;
    // Sem regex de propósito: dentro do template literal do runtime toda barra
    // invertida precisaria ser dupla, e uma simples vira LETRA em silêncio.
    if (color.slice(0, 5) !== 'rgba(' || color.slice(-1) !== ')') return true;
    var canais = color.slice(5, -1).split(',');
    return canais.length !== 4 || Number(canais[3]) !== 0;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _layoutSpriteText(sprite) {
    var style = sprite.textAppearance;
    if (!style || !sprite.skin || sprite.skin.kind !== 'text') return;
    var family = (window.SZGameUIFont && window.SZGameUIFont.family) || _szGameUIFont;
    // A imagem de fundo, quando carrega, MANDA no tamanho: entra na chave para o
    // cache não congelar a medida do texto e a placa nunca aparecer no tamanho
    // certo (ela chega 1-2 quadros depois, como a fonte).
    var fundo = _textBackgroundImage(style);
    var imgW = fundo ? (fundo.naturalWidth || fundo.width || 0) : 0;
    var imgH = fundo ? (fundo.naturalHeight || fundo.height || 0) : 0;
    var mandaImagem = imgW > 0 && imgH > 0;
    var key = JSON.stringify([style.text, style.size, style.width, style.padding, family, _textFontRevision, style.image, imgW, imgH, style.valign]);
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
    var available = mandaImagem
      ? Math.max(1, imgW - 2 * style.padding)
      : (style.width > 0 ? Math.max(1, style.width - 2 * style.padding) : Infinity);
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
    // ⚠️ A escala guarda um redimensionamento feito à mão pela criança. Quando a
    // medida troca de dono (o texto media, a imagem chegou e passou a mandar), o
    // fator antigo vira lixo: ele multiplicaria a imagem pela razão do TEXTO.
    var fonteDaMedida = /** @type {'text' | 'image'} */ (mandaImagem ? 'image' : 'text');
    var reancorar = style.sizeSource !== fonteDaMedida;
    var scaleX = !reancorar && style.measuredW > 0 ? sprite.w / style.measuredW : 1;
    var scaleY = !reancorar && style.measuredH > 0 ? sprite.h / style.measuredH : 1;
    style.sizeSource = fonteDaMedida;
    var measuredWidth = 1;
    for (var textLine of lines) measuredWidth = Math.max(measuredWidth, widthOf(textLine));
    var textoH = Math.ceil(lines.length * style.size * 1.3 + 2 * style.padding);
    style.measuredW = mandaImagem ? imgW : Math.ceil(Math.max(style.width, measuredWidth + 2 * style.padding));
    style.measuredH = mandaImagem ? imgH : textoH;
    style.imageW = imgW;
    style.imageH = imgH;
    // O texto pode estourar a placa: ele transborda (visível) em vez de sumir
    // cortado, e o aviso diz onde mexer. Só com a imagem JÁ CARREGADA — no meio
    // da carga a medida ainda é a do texto e o aviso acusaria quem está certo.
    if (mandaImagem && textoH > imgH) {
      warnOnce('texto-maior-que-a-imagem', 'o texto não cabe na imagem de fundo. Diminua o tamanho da letra no bloco “Texto do sprite … tamanho …” ou use uma imagem maior.');
    }
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
    if (!sprite || _isDestroyedSprite(sprite)) return;
    // ⚠️ Só o redraw da IMAGEM FIXA morre aqui: é ela que está sendo descartada.
    // Cancelar sem olhar matava o da PLACA que ainda vinha, e num jogo sem laço
    // trocar o texto do botão fazia a moldura dele não aparecer nunca.
    if (sprite._hookedHandle && sprite._hookedHandle === sprite.image) {
      _cancelSpriteImageRedraw(sprite);
    }
    sprite.image = null;
    sprite.anim = null;
    sprite._animState = null;
    sprite.skin = { kind: 'text' };
    // ⚠️ A caixa do desenho é a da PLACA quando existe uma: trocar o texto de um
    // botão não pode tirar a moldura dele nem a caixa medida no Pinta.
    _applyArtHitbox(sprite, sprite.textAppearance ? sprite.textAppearance.image : '');
    if (!sprite.textAppearance) {
      sprite.textAppearance = {
        text: '', size: 32, color: '#ffffff', width: 0, align: 'left',
        padding: 4, background: 'transparent', font: '', lines: [],
        measuredW: 0, measuredH: 0, layoutKey: '',
        // 'top' reproduz exatamente o desenho de antes deste campo existir.
        image: '', imageHandle: null, imageW: 0, imageH: 0,
        valign: 'top', sizeSource: 'text'
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
    if (!sprite || _isDestroyedSprite(sprite) || !sprite.textAppearance) return;
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
    if (!sprite || _isDestroyedSprite(sprite) || !sprite.textAppearance) return;
    var style = sprite.textAppearance;
    style.width = Math.max(0, Math.min(4096, _finiteNumber(width, 0)));
    style.padding = Math.max(0, Math.min(256, _finiteNumber(padding, 4)));
    style.align = align === 'center' || align === 'right' ? align : 'left';
    // ⚠️ O soquete do fundo aceita QUALQUER valor (é JSValue): um número encaixado
    // por engano não pode derrubar o jogo. O Canvas já ignorava um fillStyle que
    // não fosse cor; aqui isso vira explícito, e a régua de baixo só vê string.
    style.background = typeof background === 'string' && background ? background : 'transparent';
    _layoutSpriteText(sprite);
  }
  /**
   * Desenha a placa em 1:1 com a caixa medida (que É a medida natural dela), então
   * a imagem nunca deforma. Função própria de propósito: dentro de um callback o
   * TypeScript perde a garantia de que a imagem não é nula.
   *
   * ⚠️ O telaW é o tamanho FINAL na tela (o desenho roda sob um ctx.scale), e é
   * ele que decide nitidez. Passar a medida local faria a placa REDUZIDA pela
   * criança sair serrilhada, porque ali medida local e tamanho natural são iguais
   * e o motor concluiria que está ampliando.
   * @param {CanvasRenderingContext2D} ctx
   * @param {CanvasImageSource} img
   * @param {number} srcW
   * @param {number} telaW
   * @param {number} w
   * @param {number} h
   */
  function _drawTextBackgroundImage(ctx, img, srcW, telaW, w, h) {
    _crispDraw(ctx, srcW || w, telaW || w, function () { ctx.drawImage(img, 0, 0, w, h); });
  }
  /**
   * A imagem vira a MOLDURA do sprite de texto: ela manda no tamanho (sem
   * deformar) e o texto é escrito por cima. Imagem vazia volta ao fundo de cor.
   * @param {import('./runtimeContract').GameTwoDSprite} sprite
   * @param {string} image
   * @param {'top' | 'middle' | 'bottom'} valign
   */
  function setTextImage(sprite, image, valign) {
    if (!sprite || _isDestroyedSprite(sprite)) return;
    if (!sprite.textAppearance || !sprite.skin || sprite.skin.kind !== 'text') {
      warnOnce('fundo-sem-texto', 'este bloco é do sprite de TEXTO. Use antes o “Criar sprite … com texto …” ou o “Mudar o texto do sprite …”.');
      return;
    }
    var style = sprite.textAppearance;
    var nome = typeof image === 'string' ? image : '';
    style.image = nome;
    style.imageHandle = nome ? loadImage(nome) : null;
    style.valign = valign === 'middle' || valign === 'bottom' ? valign : 'top';
    // A caixa de colisão passa a vir do desenho, como em setImage; o CLIQUE segue
    // na caixa inteira (_spriteContainsPointer lê w/h), que é o certo num botão.
    _applyArtHitbox(sprite, nome);
    _layoutSpriteText(sprite);
  }
  /** @param {CanvasRenderingContext2D} ctx @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _drawTextSprite(ctx, sprite) {
    _layoutSpriteText(sprite);
    var style = sprite.textAppearance;
    if (!style) return;
    // Num jogo sem "a cada quadro" ninguém repintaria quando a placa chegasse.
    // ⚠️ A guarda evita alocar a closure do callback a cada quadro (ver o gêmeo em
    // _drawSpriteBody): com a placa já carregada, o caso comum, não se aloca nada.
    var pendente = style.imageHandle;
    if (pendente && pendente.img && !pendente.loaded) {
      _scheduleSpriteImageRedraw(ctx, sprite, pendente, function () {
        var atual = sprite.textAppearance;
        return !!atual && atual.imageHandle === pendente;
      });
    }
    _announceTextSprite(ctx, sprite);
    ctx.save();
    try {
      ctx.translate(sprite.x, sprite.y);
      ctx.scale(sprite.w / style.measuredW, sprite.h / style.measuredH);
      // A cor vem PRIMEIRO: com imagem, ela é a reserva enquanto a carga não chega.
      if (_paintsBackground(style.background)) {
        ctx.fillStyle = style.background;
        ctx.fillRect(0, 0, style.measuredW, style.measuredH);
      }
      var fundo = _textBackgroundImage(style);
      if (fundo) {
        _drawTextBackgroundImage(ctx, fundo, style.imageW, sprite.w, style.measuredW, style.measuredH);
      }
      ctx.font = style.font;
      ctx.fillStyle = style.color;
      ctx.textAlign = style.align;
      ctx.textBaseline = 'middle';
      var x = style.align === 'center' ? style.measuredW / 2 : style.align === 'right' ? style.measuredW - style.padding : style.padding;
      // 'top' é a margem de sempre: sem este campo o desenho é o de antes.
      var blocoH = style.lines.length * style.size * 1.3;
      var topo = style.valign === 'middle'
        ? (style.measuredH - blocoH) / 2
        : style.valign === 'bottom'
          ? style.measuredH - style.padding - blocoH
          : style.padding;
      for (var i = 0; i < style.lines.length; i++) {
        ctx.fillText(style.lines[i], x, topo + (i + 0.5) * style.size * 1.3);
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
    if (!sprite || _isDestroyedSprite(sprite) || typeof key !== 'string') return;
    if (!sprite.data) sprite.data = Object.create(null);
    Object.defineProperty(sprite.data, key, { value: value, writable: true, enumerable: true, configurable: true });
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {string} key @param {unknown} fallback */
  function spriteData(sprite, key, fallback) {
    return sprite && sprite.data && Object.prototype.hasOwnProperty.call(sprite.data, key) ? sprite.data[key] : fallback;
  }
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite @param {number} x @param {number} y */
  function _spriteContainsPointer(sprite, x, y) {
    if (!sprite || _isDestroyedSprite(sprite) || sprite._paintEpoch !== _spritePaintEpoch || !sprite._paintOrder || (sprite.opacity !== undefined && sprite.opacity <= 0)) return false;
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
    if (!sprite || _isDestroyedSprite(sprite) || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-sprite-no-quadro', 'Registre o clique no sprite em “Quando acontecer”, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _targetClickHandlerId('sprite-clique', id, sprite, fn);
    onPointer(function (x, y) { if (_spriteContainsPointer(sprite, x, y)) fn(); }, handlerId);
    _spriteClickTargets.set('clique:' + handlerId, sprite);
  }
  var _spriteClickTargets = new Map();
  /** @param {import('./runtimeContract').GameTwoDSprite} sprite */
  function _removeSpriteClickHandlers(sprite) {
    var hudKey = _textHudIds.get(sprite);
    if (hudKey) _updateAccessibleHud(hudKey, '');
    _textHudIds.delete(sprite);
    _spriteClickTargets.forEach(function (target, id) {
      if (target !== sprite) return;
      delete pointerHandlers[id];
      var index = pointerHandlerOrder.indexOf(id);
      if (index >= 0) pointerHandlerOrder.splice(index, 1);
      _spriteClickTargets.delete(id);
    });
    _targetClickIds.delete(sprite);
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
      _spriteClickTargets.clear();
      _targetClickIds = new WeakMap();
      _textHudIds = new WeakMap();
      _nextTextHudId = 1;
    }
  });
`
