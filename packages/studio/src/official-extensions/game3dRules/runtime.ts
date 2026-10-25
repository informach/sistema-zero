/**
 * Fragmento de runtime das REGRAS DE JOGO 3D, compartilhado pelas extensões 3D (molde de
 * `threePostProcessingRuntime.ts` e `three3dModelsRuntime.ts`). O marcador entra DENTRO da IIFE
 * do runtime da extensão; o fragmento só define `createSzGameRules(host)`, e é o host que
 * decide onde chamar cada gancho (quadro, tecla, clique, recomeçar).
 *
 * O que o fragmento cuida sozinho: o gerenciador de CANTOS da tela (pilha por canto, que também
 * recebe painéis de fora: `panel(canto, chave, ordem)`), pontos, vida com corações e
 * invencibilidade, contagem regressiva, "depois de N s", sorteio, telas de início/fim/vitória,
 * fim de jogo, recomeçar (adiado para fora do quadro), tremer a câmera, piscar um objeto e os
 * "Quando…" de vida, contagem, tecla, clique e encostar (na ENTRADA do contato).
 *
 * O HOST fornece (todos opcionais, menos `pause`/`resume`/`restart`):
 * - `canvas()`        → o canvas do jogo (o HUD se alinha a ele; canvas `position:fixed` = tela cheia);
 * - `layerZ`          → z-index da camada (o Mundo 3D a põe ABAIXO dos cartazes dele);
 * - `pause()`/`resume()` → congelar e soltar os laços da criança (a cena continua desenhando);
 * - `restart()`       → descartar a partida e rodar de novo a fábrica do projeto (chama `reset()`;
 *                       o recomeçar LEVE do Mundo 3D chama `reset(true)`, que guarda os "Quando…");
 * - `wake()`          → garantir que o laço do quadro está ligado (contagem sem "A cada quadro");
 * - `touching(obj, grupo, saida)` → enche `saida` com quem do grupo encosta em `obj` agora;
 * - `wireClick()`     → ligar o clique no canvas, que devolve `rules.click(objetoAcertado)`;
 * - `random()`, `warn(chave, texto)`, `defer(fn)`.
 *
 * O host chama: `step(dt)` uma vez por quadro rodando, `beforeFrame(camera)` antes de mexer na
 * câmera e `afterFrame(camera, dt)` depois dela, `key(code)` na transição da tecla e `click(obj)`.
 *
 * É uma STRING: ES5, só comentários de linha (o `compactOfficialRuntimeSource` os tira), sem
 * crase e sem cifrão-chave.
 */
export const GAME_RULES_3D_MARKER = '/*__SZ_GAME_RULES_3D_RUNTIME__*/'

const GAME_RULES_3D_SOURCE = `
  // ==== Regras de jogo 3D (fragmento compartilhado, game3dRules/runtime.ts) ====
  function createSzGameRules(host) {
    host = host || {};
    var CORNERS = { 'top-left': 1, 'top-center': 1, 'top-right': 1, 'bottom-left': 1, 'bottom-center': 1, 'bottom-right': 1 };
    var OWN_PANELS = ['texto', 'vidas', 'pontos', 'tempo'];
    var SCREEN_DEFAULTS = {
      inicio: ['Meu jogo 3D', '', 'Jogar'],
      fim: ['Fim de jogo', 'Não foi dessa vez!', 'Jogar de novo'],
      vitoria: ['Você venceu!', 'Parabéns!', 'Jogar de novo']
    };
    var layer = null, layerCanvas = null, layerBox = '', styleEl = null, screenEl = null;
    var corners = {};
    var score = 0, scoreShown = false;
    var hero = null, lifeList = [];
    var timer = { on: false, left: 0, shown: -1 };
    var afters = [], blinks = [];
    var handlers = { life: [], timer: [], key: [], click: [], touch: [] };
    var screens = {};
    var ended = false, waiting = false, restartPending = false;
    // A tela de início aparece UMA vez por página: "Jogar de novo" volta direto ao jogo.
    var startSeen = false;
    var shakeT = 0, shakeMax = 1, shakeAmp = 0, ox = 0, oy = 0, oz = 0;
    var touchScratch = [];

    function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
    function str(v) { return v === undefined || v === null ? '' : String(v); }
    function warn(key, msg) {
      if (host.warn) host.warn(key, msg);
      else { try { console.warn('Regras do jogo: ' + msg); } catch (e) {} }
    }
    function rand() { return host.random ? host.random() : Math.random(); }
    function call(fn, arg, label) {
      try { fn(arg); } catch (e) { warn('erro-' + label, 'erro no "' + label + '": ' + e); }
    }
    function running() { return !ended && !waiting && !restartPending; }

    // ---- Cantos da tela: uma pilha flex por canto, ordenada por "ordem" ----
    function hasDom() { return typeof document !== 'undefined' && document && document.createElement && document.body; }
    function ensureStyle() {
      if (styleEl || !hasDom()) return;
      styleEl = document.createElement('style');
      styleEl.setAttribute('data-sz-game-rules', '');
      styleEl.textContent = '' +
        '.szr-layer{position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:30;overflow:hidden;' +
          'font-family:var(--sz-game-ui-font);color:#fff}' +
        '.szr-corner{position:absolute;display:flex;flex-direction:column;gap:6px;padding:12px;max-width:46%}' +
        '.szr-top-left{top:0;left:0;align-items:flex-start}' +
        '.szr-top-center{top:0;left:50%;transform:translateX(-50%);align-items:center}' +
        '.szr-top-right{top:0;right:0;align-items:flex-end;text-align:right}' +
        '.szr-bottom-left{bottom:0;left:0;align-items:flex-start;flex-direction:column-reverse}' +
        '.szr-bottom-center{bottom:0;left:50%;transform:translateX(-50%);align-items:center;flex-direction:column-reverse}' +
        '.szr-bottom-right{bottom:0;right:0;align-items:flex-end;text-align:right;flex-direction:column-reverse}' +
        '.szr-panel{font-size:22px;font-weight:bold;line-height:1.25;white-space:pre-wrap;padding:4px 10px;' +
          'border-radius:10px;background:rgba(2,6,23,0.45);text-shadow:0 2px 2px rgba(0,0,0,0.8)}' +
        '.szr-screen{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;' +
          'justify-content:center;background:rgba(2,6,23,0.55);pointer-events:auto}' +
        '.szr-box{max-width:82%;text-align:center;padding:26px 32px;border-radius:16px;' +
          'background:rgba(15,23,42,0.88);border:3px solid #facc15;box-shadow:0 0 28px rgba(250,204,21,0.35)}' +
        '.szr-box h2{margin:0 0 12px;font-size:36px;color:#facc15}' +
        '.szr-box p{margin:0 0 12px;font-size:18px}' +
        '.szr-box button{font:inherit;font-size:20px;font-weight:bold;cursor:pointer;margin-top:6px;' +
          'padding:12px 26px;border-radius:12px;border:2px solid #facc15;background:#facc15;color:#0f172a}' +
        '.szr-box button:focus-visible{outline:3px solid #fff;outline-offset:3px}';
      (document.head || document.body).appendChild(styleEl);
    }
    function ensureLayer() {
      if (layer && layer.parentNode) return layer;
      if (!hasDom()) return null;
      ensureStyle();
      var canvas = host.canvas ? host.canvas() : null;
      var fixed = !canvas || !canvas.parentNode || (canvas.style && canvas.style.position === 'fixed');
      var parent = fixed ? document.body : canvas.parentNode;
      layer = document.createElement('div');
      layer.className = 'szr-layer';
      if (!fixed) layer.style.position = 'absolute';
      if (host.layerZ !== undefined) layer.style.zIndex = String(host.layerZ);
      parent.appendChild(layer);
      layerCanvas = fixed ? null : canvas;
      layerBox = '';
      corners = {};
      syncLayer();
      watchLayer();
      return layer;
    }
    // A caixa do canvas só muda num reajuste: mede no ResizeObserver dele e no resize da janela
    // (que move o canvas centralizado), nunca a cada quadro (ler offset* força layout).
    var layerObserver = null, onLayerResize = null;
    function watchLayer() {
      unwatchLayer();
      if (!layerCanvas) return;
      if (typeof ResizeObserver !== 'undefined') {
        layerObserver = new ResizeObserver(function () { syncLayer(); });
        if (layerObserver.observe) layerObserver.observe(layerCanvas);
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        onLayerResize = function () { syncLayer(); };
        window.addEventListener('resize', onLayerResize);
      }
    }
    function unwatchLayer() {
      if (layerObserver && layerObserver.disconnect) { try { layerObserver.disconnect(); } catch (e) {} }
      layerObserver = null;
      if (onLayerResize && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', onLayerResize);
      }
      onLayerResize = null;
    }
    // Canvas dentro da página: o HUD acompanha a caixa dele (só escreve quando muda).
    function syncLayer() {
      if (!layer || !layerCanvas) return;
      var box = layerCanvas.offsetLeft + ',' + layerCanvas.offsetTop + ',' + layerCanvas.offsetWidth + ',' + layerCanvas.offsetHeight;
      if (box === layerBox) return;
      layerBox = box;
      layer.style.left = layerCanvas.offsetLeft + 'px';
      layer.style.top = layerCanvas.offsetTop + 'px';
      layer.style.width = layerCanvas.offsetWidth + 'px';
      layer.style.height = layerCanvas.offsetHeight + 'px';
      layer.style.right = 'auto';
      layer.style.bottom = 'auto';
    }
    function cornerOf(name) {
      var key = CORNERS[name] ? name : 'top-left';
      var c = corners[key];
      if (c && c.el.parentNode) return c;
      var root = ensureLayer();
      if (!root) return null;
      var el = document.createElement('div');
      el.className = 'szr-corner szr-' + key;
      root.appendChild(el);
      c = corners[key] = { el: el, items: {} };
      return c;
    }
    // Painel nomeado num canto. Painéis de fora (os automáticos do Mundo 3D) usam o MESMO caminho.
    function panel(corner, key, order) {
      var c = cornerOf(corner);
      if (!c) return null;
      var item = c.items[key];
      if (item) return item.el;
      var el = document.createElement('div');
      el.className = 'szr-panel';
      el.setAttribute('data-szr-panel', key);
      var o = num(order, 50);
      var before = null;
      for (var k in c.items) {
        var other = c.items[k];
        if (other.order > o && (!before || other.order < before.order)) before = other;
      }
      if (before) c.el.insertBefore(el, before.el); else c.el.appendChild(el);
      c.items[key] = { el: el, order: o };
      return el;
    }
    function dropPanel(corner, key) {
      var c = corners[CORNERS[corner] ? corner : 'top-left'];
      var item = c && c.items[key];
      if (!item) return;
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
      delete c.items[key];
    }
    function write(el, text) { if (el && el.textContent !== text) el.textContent = text; }

    // ---- Texto da criança (um por canto, sempre o primeiro da pilha) ----
    function hudText(corner, value) {
      var content = str(value);
      if (!content) { dropPanel(corner, 'texto'); return; }
      write(panel(corner, 'texto', 10), content);
    }

    // ---- Pontos: aparecem sozinhos no canto de cima, à direita ----
    function addScore(n) {
      score += num(n, 0);
      scoreShown = true;
      write(panel('top-right', 'pontos', 20), '⭐ ' + score);
    }
    function getScore() { return score; }

    // ---- Vida: o PRIMEIRO objeto que ganha vida é o herói (corações no canto) ----
    function lifeData(obj) { return obj && typeof obj === 'object' ? obj._szLife || null : null; }
    function drawHearts() {
      var d = lifeData(hero);
      if (!d) return;
      var hp = Math.max(0, Math.ceil(d.hp));
      var max = Math.max(hp, Math.ceil(d.max));
      var text = '';
      if (max > 10) text = '❤️ x ' + hp;
      else {
        for (var i = 0; i < max; i++) text += i < hp ? '❤️' : '🤍';
      }
      write(panel('top-left', 'vidas', 20), text);
    }
    function setLife(obj, n) {
      if (!obj || typeof obj !== 'object') return;
      var d = obj._szLife;
      if (!d) {
        d = obj._szLife = { hp: 0, max: 0, inv: 0, over: false };
        lifeList.push(obj);
        if (!hero) hero = obj;
      }
      d.hp = Math.max(0, num(n, 3));
      d.max = d.hp;
      d.inv = 0;
      d.over = d.hp <= 0;
      if (obj === hero) drawHearts();
    }
    function hurt(obj, n) {
      if (!obj || typeof obj !== 'object') return;
      if (!obj._szLife) {
        warn('vida-sem-dar', 'use "Dar … de vida" antes de machucar; dei 3 de vida.');
        setLife(obj, 3);
      }
      var d = obj._szLife;
      var amount = Math.max(0, num(n, 1));
      if (d.over || d.inv > 0 || !amount) return;
      d.hp = Math.max(0, d.hp - amount);
      // Invencível por 1 s, piscando: um encostão não tira todas as vidas de uma vez.
      d.inv = 1;
      blink(obj, 1);
      if (obj === hero) drawHearts();
      if (d.hp > 0) return;
      d.over = true;
      var list = handlers.life.slice();
      for (var i = 0; i < list.length; i++) {
        if (list[i].obj === obj) call(list[i].fn, undefined, 'quando a vida acabar');
      }
    }
    function heal(obj, n) {
      var d = lifeData(obj);
      if (!d) { setLife(obj, Math.max(0, num(n, 1))); return; }
      d.hp += Math.max(0, num(n, 1));
      if (d.hp > d.max) d.max = d.hp;
      if (d.hp > 0) d.over = false;
      if (obj === hero) drawHearts();
    }
    function lifeOf(obj) { var d = lifeData(obj); return d ? d.hp : 0; }

    // ---- Contagem regressiva (aparece sozinha em cima, no meio) ----
    function drawTimer() {
      var whole = Math.ceil(timer.left);
      if (whole === timer.shown) return;
      timer.shown = whole;
      write(panel('top-center', 'tempo', 20), '⏱️ ' + whole);
    }
    function startTimer(secs) {
      timer.left = Math.max(0, num(secs, 30));
      timer.on = timer.left > 0;
      timer.shown = -1;
      drawTimer();
      if (host.wake) host.wake();
    }
    function stopTimer() { timer.on = false; }
    function timeLeft() { return Math.ceil(timer.left); }

    // ---- Depois de N segundos (uma vez; a pausa congela) ----
    function afterSeconds(secs, fn) {
      if (typeof fn !== 'function') return;
      afters.push({ left: Math.max(0, num(secs, 1)), fn: fn });
      if (host.wake) host.wake();
    }

    // ---- Sorteio ----
    function randomBetween(a, b) {
      var lo = Math.round(num(a, 1)), hi = Math.round(num(b, 6));
      if (lo > hi) { var t = lo; lo = hi; hi = t; }
      return lo + Math.floor(rand() * (hi - lo + 1));
    }
    function randomChance(p) { return rand() * 100 < num(p, 50); }

    // ---- Piscar e tremer ----
    function blink(obj, secs) {
      if (!obj || typeof obj !== 'object') return;
      var left = Math.max(0, num(secs, 1));
      for (var i = 0; i < blinks.length; i++) {
        if (blinks[i].obj === obj) { blinks[i].left = Math.max(blinks[i].left, left); return; }
      }
      // wrote = o que o PISCAR escreveu por último: se o visible mudar sem ele, foi a criança.
      var shown = obj.visible !== false;
      blinks.push({ obj: obj, left: left, was: shown, wrote: shown });
      if (host.wake) host.wake();
    }
    function endBlink(b) { b.obj.visible = b.was; }
    function endAllBlinks() {
      for (var i = 0; i < blinks.length; i++) endBlink(blinks[i]);
      blinks.length = 0;
    }
    function cameraShake(strength, secs) {
      shakeAmp = Math.max(0, num(strength, 0.3));
      shakeT = Math.max(0, num(secs, 0.3));
      shakeMax = shakeT || 1;
      if (host.wake) host.wake();
    }
    // Desfaz o tremor do quadro anterior ANTES de a câmera seguir alguém (senão o seguir
    // perseguiria a própria tremedeira).
    function beforeFrame(cam) {
      if (!cam || !cam.position || (!ox && !oy && !oz)) return;
      cam.position.x -= ox; cam.position.y -= oy; cam.position.z -= oz;
      ox = oy = oz = 0;
    }
    function afterFrame(cam, dt) {
      if (!cam || !cam.position || dt <= 0 || shakeT <= 0) return;
      shakeT = Math.max(0, shakeT - dt);
      var k = shakeAmp * (shakeT / shakeMax);
      ox = (rand() * 2 - 1) * k; oy = (rand() * 2 - 1) * k; oz = (rand() * 2 - 1) * k;
      cam.position.x += ox; cam.position.y += oy; cam.position.z += oz;
    }

    // ---- Os "Quando…" ----
    function onLifeOver(obj, fn) { if (typeof fn === 'function') handlers.life.push({ obj: obj, fn: fn }); }
    function onTimerEnd(fn) { if (typeof fn === 'function') handlers.timer.push({ fn: fn }); }
    function onKey(code, fn) { if (typeof fn === 'function') handlers.key.push({ code: str(code), fn: fn }); }
    function onClickObject(obj, fn) {
      if (typeof fn !== 'function' || !obj) return;
      handlers.click.push({ obj: obj, fn: fn });
      if (host.wireClick) host.wireClick();
    }
    function onTouchGroup(obj, group, fn) {
      if (typeof fn !== 'function' || !obj) return;
      handlers.touch.push({ obj: obj, group: group, fn: fn, inside: [] });
      if (host.wake) host.wake();
    }
    function key(code) {
      if (!running()) return;
      var list = handlers.key.slice();
      for (var i = 0; i < list.length; i++) {
        if (list[i].code === code) call(list[i].fn, undefined, 'quando apertar a tecla');
      }
    }
    function contains(root, hit) {
      for (var o = hit; o; o = o.parent) if (o === root) return true;
      return false;
    }
    function click(hit) {
      if (!running() || !hit) return;
      var list = handlers.click.slice();
      for (var i = 0; i < list.length; i++) {
        if (contains(list[i].obj, hit)) call(list[i].fn, undefined, 'quando clicar');
      }
    }
    // Encostar dispara na ENTRADA do contato: quem continua encostado não repete. Sem lixo
    // por quadro: a lista de ganchos, o contato de agora e a entrada usam buffers
    // reaproveitados, e cada gancho guarda o "quem estava dentro" no PRÓPRIO array.
    var touchList = [], touchEntering = [];
    function stepTouches() {
      if (!host.touching) return;
      var list = touchList;
      list.length = handlers.touch.length;
      for (var c = 0; c < list.length; c++) list[c] = handlers.touch[c];
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        if (!h.group || !h.group.length) { h.inside.length = 0; continue; }
        var now = host.touching(h.obj, h.group, touchScratch);
        var entering = touchEntering;
        entering.length = 0;
        for (var j = 0; j < now.length; j++) if (h.inside.indexOf(now[j]) === -1) entering.push(now[j]);
        h.inside.length = now.length;
        for (var n = 0; n < now.length; n++) h.inside[n] = now[n];
        if (!entering.length) continue;
        // O "quando encostar" pode mexer nos contatos: dispara a partir de uma cópia.
        var fire = entering.slice();
        for (var k = 0; k < fire.length && running(); k++) call(h.fn, fire[k], 'quando encostar');
      }
      list.length = 0;
    }

    // ---- Um quadro do jogo (só quando está rodando) ----
    function step(dt) {
      var d = num(dt, 0);
      if (!running()) return;
      if (d > 0) {
        for (var i = 0; i < lifeList.length; i++) {
          var life = lifeList[i]._szLife;
          if (life && life.inv > 0) life.inv = Math.max(0, life.inv - d);
        }
        for (var b = blinks.length - 1; b >= 0; b--) {
          var bl = blinks[b];
          // Esconder ou mostrar durante a piscada vence: a piscada acaba e o pedido fica.
          if ((bl.obj.visible !== false) !== bl.wrote) { blinks.splice(b, 1); continue; }
          bl.left -= d;
          if (bl.left <= 0) { blinks.splice(b, 1); endBlink(bl); }
          else { bl.wrote = Math.floor(bl.left * 8) % 2 === 0; bl.obj.visible = bl.wrote; }
        }
        if (timer.on) {
          timer.left = Math.max(0, timer.left - d);
          drawTimer();
          if (timer.left <= 0) {
            timer.on = false;
            var ends = handlers.timer.slice();
            for (var t = 0; t < ends.length && running(); t++) call(ends[t].fn, undefined, 'quando a contagem acabar');
          }
        }
        var due = null;
        for (var a = afters.length - 1; a >= 0; a--) {
          afters[a].left -= d;
          if (afters[a].left <= 0) {
            if (!due) due = [];
            due.unshift(afters.splice(a, 1)[0]);
          }
        }
        for (var q = 0; due && q < due.length && running(); q++) call(due[q].fn, undefined, 'depois de N segundos');
      }
      if (running()) stepTouches();
    }

    // ---- Telas de início, fim e vitória ----
    function hideScreen() {
      if (screenEl && screenEl.parentNode) screenEl.parentNode.removeChild(screenEl);
      screenEl = null;
    }
    function showScreen(kind) {
      var root = ensureLayer();
      if (!root) return;
      hideScreen();
      var conf = screens[kind] || {};
      var def = SCREEN_DEFAULTS[kind];
      var el = document.createElement('div');
      el.className = 'szr-screen';
      el.setAttribute('data-szr-screen', kind);
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'false');
      var box = document.createElement('div');
      box.className = 'szr-box';
      var h = document.createElement('h2');
      h.id = 'szr-screen-title';
      h.textContent = conf.title || def[0];
      el.setAttribute('aria-labelledby', h.id);
      box.appendChild(h);
      var body = conf.title || conf.text || conf.button ? conf.text : def[1];
      if (body) { var p = document.createElement('p'); p.textContent = body; box.appendChild(p); }
      if (kind !== 'inicio' && scoreShown) {
        var s = document.createElement('p');
        s.textContent = '⭐ ' + score + ' pontos';
        box.appendChild(s);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = conf.button || def[2];
      btn.onclick = function () {
        if (kind === 'inicio') {
          hideScreen();
          waiting = false;
          if (host.resume) host.resume();
        } else restart();
      };
      box.appendChild(btn);
      el.appendChild(box);
      root.appendChild(el);
      screenEl = el;
      try { btn.focus({ preventScroll: true }); } catch (e) {}
    }
    function setScreenText(kind, title, text, button) {
      if (!SCREEN_DEFAULTS[kind]) return;
      screens[kind] = { title: str(title), text: str(text), button: str(button) };
      if (kind !== 'inicio' || startSeen) return;
      startSeen = true;
      waiting = true;
      if (host.pause) host.pause();
      // A cena precisa ser desenhada por trás da tela, mesmo sem nenhum laço da criança.
      if (host.wake) host.wake();
      showScreen('inicio');
    }
    function endGame(result) {
      if (ended || restartPending) return;
      ended = true;
      timer.on = false;
      // O fim congela o quadro: quem estava no meio de uma piscada volta como era (senão
      // ficava invisível atrás da tela de fim).
      endAllBlinks();
      if (host.pause) host.pause();
      showScreen(result === 'ganhou' ? 'vitoria' : 'fim');
    }
    // Recomeçar é ADIADO para fora do quadro: o resto do bloco que pediu termina na partida velha.
    function restart() {
      if (restartPending) return;
      restartPending = true;
      if (host.pause) host.pause();
      var go = function () { if (host.restart) host.restart(); else reset(); };
      if (host.defer) host.defer(go);
      else setTimeout(go, 0);
    }
    // Zera a partida (o host chama no próprio recomeçar). Painéis de fora ficam. Com keep, os
    // "Quando…" e as telas escritas ficam (o recomeçar LEVE do Mundo 3D não roda o projeto de novo).
    function reset(keep) {
      hideScreen();
      for (var c in corners) for (var i = 0; i < OWN_PANELS.length; i++) dropPanel(c, OWN_PANELS[i]);
      for (var b = 0; b < blinks.length; b++) endBlink(blinks[b]);
      for (var l = 0; l < lifeList.length; l++) { try { delete lifeList[l]._szLife; } catch (e) {} }
      score = 0; scoreShown = false; hero = null; lifeList = [];
      timer = { on: false, left: 0, shown: -1 };
      afters = []; blinks = [];
      if (!keep) {
        handlers = { life: [], timer: [], key: [], click: [], touch: [] };
        screens = {};
      }
      ended = false; waiting = false; restartPending = false;
      shakeT = 0; ox = oy = oz = 0;
    }
    function dispose() {
      reset();
      unwatchLayer();
      if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      layer = null; styleEl = null; corners = {};
    }

    return {
      hudText: hudText, panel: panel, dropPanel: dropPanel,
      addScore: addScore, score: getScore,
      setLife: setLife, hurt: hurt, heal: heal, lifeOf: lifeOf, onLifeOver: onLifeOver,
      startTimer: startTimer, stopTimer: stopTimer, timeLeft: timeLeft, onTimerEnd: onTimerEnd,
      afterSeconds: afterSeconds, randomBetween: randomBetween, randomChance: randomChance,
      blink: blink, cameraShake: cameraShake,
      onKey: onKey, onClickObject: onClickObject, onTouchGroup: onTouchGroup,
      setScreenText: setScreenText, endGame: endGame, restart: restart,
      step: step, beforeFrame: beforeFrame, afterFrame: afterFrame, key: key, click: click,
      running: running, reset: reset, dispose: dispose
    };
  }
`

// O fragmento entra em mais de um runtime: a indentação e os comentários de linha saem do
// payload (nenhuma string do literal tem várias linhas, então nada de texto muda).
const GAME_RULES_3D_SOURCE_COMPACT = GAME_RULES_3D_SOURCE.split('\n')
  .map((line) => line.trimStart())
  .filter((line) => line !== '' && !line.startsWith('//'))
  .join('\n')

/** Fragmento cru (os testes do módulo o avaliam isolado). */
export const gameRules3DRuntimeSource = GAME_RULES_3D_SOURCE_COMPACT

/** Os métodos que as extensões expõem no global com o mesmo nome do fragmento. */
export const GAME_RULES_PUBLIC_METHODS = [
  'hudText',
  'addScore',
  'score',
  'setLife',
  'hurt',
  'heal',
  'lifeOf',
  'onLifeOver',
  'setScreenText',
  'endGame',
  'restart',
  'afterSeconds',
  'startTimer',
  'timeLeft',
  'stopTimer',
  'onTimerEnd',
  'randomBetween',
  'randomChance',
  'cameraShake',
  'blink',
  'onKey',
  'onClickObject',
  'onTouchGroup',
] as const

export function withGameRules3DRuntime(source: string): string {
  const firstMarker = source.indexOf(GAME_RULES_3D_MARKER)
  if (firstMarker === -1) {
    throw new Error('Runtime 3D sem o marcador das regras de jogo')
  }
  if (source.indexOf(GAME_RULES_3D_MARKER, firstMarker + 1) !== -1) {
    throw new Error('Runtime 3D com marcador das regras de jogo duplicado')
  }
  return source.replace(GAME_RULES_3D_MARKER, () => GAME_RULES_3D_SOURCE_COMPACT)
}
