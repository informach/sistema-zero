import { GAME_KIT_ACTIONS } from '../runtimeContract'

const gameKitActionsJson = JSON.stringify(GAME_KIT_ACTIONS)
const gameKitActionBitsJson = JSON.stringify(
  Object.fromEntries(GAME_KIT_ACTIONS.map((action, index) => [action, 1 << index])),
)

/** Relógio fixo, ações semânticas e controles multimodais da campanha. */
export const gameKitCampaignInputStateRuntime = `
  var PRO_ACTIONS = ${gameKitActionsJson};
  var PRO_ACTION_BITS = ${gameKitActionBitsJson};
  var proSim = {
    enabled: false, hz: 60, step: 1 / 60, accumulator: 0, tick: 0,
    maxCatchUpSteps: 5, droppedSeconds: 0, lastFrameSteps: 0, alpha: 0,
    seed: 1, randomState: 1
  };
  var fixedHooks = [];
  var proInputBound = false;
  var proInputDevice = 'teclado';
  var proBindings = {
    esquerda: { keys: ['arrowleft', 'a'], button: 14 },
    direita: { keys: ['arrowright', 'd'], button: 15 },
    cima: { keys: ['arrowup', 'w'], button: 12 },
    baixo: { keys: ['arrowdown', 's'], button: 13 },
    pular: { keys: [' ', 'x'], button: 0 },
    correr: { keys: ['shift', 'z'], button: 2 },
    agir: { keys: ['e', 'c'], button: 1 },
    pausar: { keys: ['escape'], button: 9 },
    confirmar: { keys: ['enter', ' '], button: 0 },
    voltar: { keys: ['escape', 'backspace'], button: 1 }
  };
  var proActionDown = Object.create(null);
  var proActionPrevious = Object.create(null);
  var proActionPressed = Object.create(null);
  var proActionReleased = Object.create(null);
  var proTouchActions = Object.create(null);
  var proTouchPointers = Object.create(null);

  var proVisualRandomState = 2654435769;

  function proUint32(value) {
    var n = Math.floor(num(value, 1)) >>> 0;
    return n === 0 ? 1 : n;
  }
  function gameRandom() {
    if (!proSim.enabled) return Math.random();
    var x = proSim.randomState >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    proSim.randomState = x >>> 0;
    return (proSim.randomState >>> 0) / 4294967296;
  }
  function visualRandom() {
    if (!proSim.enabled) return Math.random();
    var x = proVisualRandomState >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    proVisualRandomState = x >>> 0;
    return (proVisualRandomState >>> 0) / 4294967296;
  }

`

export const gameKitCampaignInputRuntime = `
  function proKnownAction(action) { return PRO_ACTION_BITS[text(action, '')] != null; }
  function enableFixedSimulation(options) {
    var opts = proPlainObject(options) ? options : {};
    proSim.enabled = true;
    proSim.hz = 60;
    proSim.step = 1 / 60;
    proSim.accumulator = 0;
    proSim.tick = 0;
    proSim.alpha = 0;
    proSim.droppedSeconds = 0;
    proSim.lastFrameSteps = 0;
    proSim.maxCatchUpSteps = boundedInteger(opts.maxCatchUpSteps, 5, 1, 5);
    proSim.seed = proUint32(opts.seed);
    proSim.randomState = proSim.seed;
    proVisualRandomState = (proSim.seed ^ 2654435769) >>> 0;
    ensureProfessionalInput();
  }
  function onFixedUpdate(fn) {
    if (typeof fn === 'function') fixedHooks.push(fn);
  }
  function runFixedHooks(dt) {
    for (var i = 0; i < fixedHooks.length; i++) {
      try { fixedHooks[i](dt, proSim.tick); }
      catch (e) { warnOnce('fixed-hook:' + i, 'erro em "A cada passo do jogo": ' + e); }
    }
  }
  function bindAction(action, keys, gamepadButton) {
    var name = text(action, '');
    if (!proKnownAction(name)) { warn('a ação "' + name + '" não existe'); return false; }
    var source = text(keys, '');
    var parts = source.split(',');
    var normalized = [];
    for (var i = 0; i < parts.length; i++) {
      var key = normKey(parts[i].trim());
      if (key && normalized.indexOf(key) === -1) normalized.push(key);
    }
    if (!normalized.length) { warn('escolha ao menos uma tecla para a ação "' + name + '"'); return false; }
    proBindings[name] = { keys: normalized, button: boundedInteger(gamepadButton, proBindings[name].button, 0, 31) };
    return true;
  }
  function proKeyboardDown(binding) {
    for (var i = 0; i < binding.keys.length; i++) if (keys[binding.keys[i]] === true) return true;
    return false;
  }
  function proReadGamepad(binding) {
    try {
      if (!window.navigator || typeof window.navigator.getGamepads !== 'function') return 0;
      var pads = window.navigator.getGamepads();
      for (var i = 0; i < pads.length && i < 2; i++) {
        var pad = pads[i];
        if (!pad || pad.connected === false) continue;
        var button = pad.buttons && pad.buttons[binding.button];
        if (button && (button.pressed || button.value > 0.5)) return i + 1;
      }
    } catch (e) { warnOnce('gamepad-read', 'não consegui ler o controle conectado'); }
    return 0;
  }

  function sampleProfessionalActions() {
    var replayMask = proReplayMask();
    var anyKeyboard = false;
    var gamepad = 0;
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      var binding = proBindings[action];
      var down;
      if (replayMask >= 0) down = (replayMask & PRO_ACTION_BITS[action]) !== 0;
      else {
        var keyboard = proKeyboardDown(binding);
        var pad = proReadGamepad(binding);
        var touchingNow = proTouchActions[action] === true;
        down = keyboard || pad > 0 || touchingNow;
        if (keyboard) anyKeyboard = true;
        if (pad > gamepad) gamepad = pad;
        if (touchingNow) proInputDevice = 'toque';
      }
      var previous = proActionPrevious[action] === true;
      proActionDown[action] = down;
      proActionPressed[action] = down && !previous;
      proActionReleased[action] = !down && previous;
      proActionPrevious[action] = down;
    }
    if (gamepad > 0) proInputDevice = gamepad === 1 ? 'controle-1' : 'controle-2';
    else if (anyKeyboard) proInputDevice = 'teclado';
  }
  function proActionMask() {
    var mask = 0;
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      if (proActionDown[action]) mask |= PRO_ACTION_BITS[action];
    }
    return mask >>> 0;
  }
  function proReleaseAllActions() {
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      proActionDown[action] = false;
      proActionPrevious[action] = false;
      proActionPressed[action] = false;
      proActionReleased[action] = false;
    }
    proTouchActions = Object.create(null);
    proTouchPointers = Object.create(null);
    if (typeof document !== 'undefined') {
      var touchControls = document.querySelectorAll('#szgk-touch-controls [data-sz-gk-action]');
      for (var ti = 0; ti < touchControls.length; ti++) touchControls[ti].setAttribute('aria-pressed', 'false');
    }
  }
  function proTouchButton(parent, label, action, position, accessibleLabel) {
    var button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.setAttribute('aria-label', accessibleLabel);
    button.setAttribute('data-sz-gk-action', action);
    button.style.cssText = 'position:absolute;' + position + ';width:44px;height:44px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.88);background:rgba(10,18,35,.68);color:#fff;font:700 15px var(--sz-game-ui-font);touch-action:none;user-select:none;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.28);';
    function pressId(id) {
      var previous = proTouchPointers[id];
      if (previous && previous !== action) releaseId(id);
      proTouchPointers[id] = action; proTouchActions[action] = true; proInputDevice = 'toque';
      button.setAttribute('aria-pressed', 'true');
    }
    function releaseId(id) {
      var released = proTouchPointers[id]; delete proTouchPointers[id];
      if (!released) return;
      var still = false;
      for (var pointer in proTouchPointers) if (proTouchPointers[pointer] === released) still = true;
      proTouchActions[released] = still;
      if (released === action && !still) button.setAttribute('aria-pressed', 'false');
    }
    function press(ev) {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      var id = ev && ev.pointerId != null ? ev.pointerId : action;
      pressId(id);
      try { if (ev && ev.pointerId != null) button.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    function release(ev) {
      var id = ev && ev.pointerId != null ? ev.pointerId : action;
      releaseId(id);
    }
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', function (ev) {
      if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); pressId('key:' + action); }
    });
    button.addEventListener('keyup', function (ev) {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); releaseId('key:' + action); }
    });
    button.addEventListener('blur', function () { releaseId('key:' + action); });
    button.setAttribute('aria-pressed', 'false');
    parent.appendChild(button);
  }
  function proTouchCluster(overlay, name, style, label) {
    var group = document.createElement('div');
    group.setAttribute('data-sz-gk-cluster', name); group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
    group.style.cssText = 'position:absolute;width:132px;height:132px;pointer-events:none;' + style;
    overlay.appendChild(group);
    return group;
  }
  function ensureTouchOverlay() {
    if (!stageEl || typeof document === 'undefined' || document.getElementById('szgk-touch-controls')) return;
    var coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}
    if (!coarse && !('ontouchstart' in window)) return;
    var overlay = document.createElement('div');
    overlay.id = 'szgk-touch-controls';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', 'Controles de toque');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:80;pointer-events:none;overflow:hidden;';
    var safeBottom = 'bottom:8px;bottom:max(8px,env(safe-area-inset-bottom))';
    var directions = proTouchCluster(overlay, 'directions', 'left:8px;left:max(8px,env(safe-area-inset-left));' + safeBottom, 'Direções');
    proTouchButton(directions, '◀', 'esquerda', 'left:0;bottom:44px', 'Mover para a esquerda');
    proTouchButton(directions, '▶', 'direita', 'left:88px;bottom:44px', 'Mover para a direita');
    proTouchButton(directions, '▲', 'cima', 'left:44px;bottom:88px', 'Mover para cima');
    proTouchButton(directions, '▼', 'baixo', 'left:44px;bottom:0', 'Mover para baixo');
    var actions = proTouchCluster(overlay, 'actions', 'right:8px;right:max(8px,env(safe-area-inset-right));' + safeBottom, 'Ações');
    proTouchButton(actions, 'A', 'pular', 'left:88px;bottom:44px', 'Pular');
    proTouchButton(actions, 'B', 'correr', 'left:44px;bottom:0', 'Correr');
    proTouchButton(actions, 'X', 'agir', 'left:44px;bottom:88px', 'Agir');
    proTouchButton(actions, '✓', 'confirmar', 'left:0;bottom:44px', 'Confirmar');
    var system = proTouchCluster(overlay, 'system', 'right:8px;right:max(8px,env(safe-area-inset-right));top:8px;top:max(8px,env(safe-area-inset-top));width:96px;height:44px', 'Menu');
    proTouchButton(system, '↩', 'voltar', 'left:0;top:0', 'Voltar');
    proTouchButton(system, 'Ⅱ', 'pausar', 'right:0;top:0', 'Pausar');
    stageEl.appendChild(overlay);
  }
  function ensureProfessionalInput() {
    if (proInputBound) { ensureTouchOverlay(); return; }
    proInputBound = true;
    window.addEventListener('gamepaddisconnected', function () { proReleaseAllActions(); proInputDevice = 'teclado'; });
    window.addEventListener('blur', proReleaseAllActions);
    ensureTouchOverlay();
  }
`
