/** Áudio importado e sintetizado, injetado dentro do escopo do runtime principal. */
export const gameKitAudioRuntime = `
  // ---- 🔊 Som (importado via new Audio + sintetizado) ----
  function loadSound(name, asset) {
    var key = text(name, '') || text(asset, '');
    if (!key) { warn('"Carregar o som" precisa de um nome'); return; }
    var a = text(asset, '');
    var src = SOUNDS[a] || (a.indexOf('data:audio/') === 0 ? a : null);
    if (!src) { warn('o som "' + a + '" não está no projeto (importe em "Imagens e sons")'); return; }
    var loaded = sounds[key];
    if (loaded && loaded._szgkSrc === src) return;
    if (loaded) {
      try { loaded.pause(); loaded.currentTime = 0; } catch (e) {}
    }
    pending.push(new Promise(function (resolve) {
      try {
        // fallback: se nunca disparar canplaythrough, não travar o start
        var timer = setTimeout(resolve, 3000);
        var done = function () { clearTimeout(timer); resolve(); };
        var audio = new Audio();
        audio.preload = 'auto';
        audio.oncanplaythrough = done;
        audio.onerror = function () { warn('o som "' + key + '" falhou ao carregar'); done(); };
        audio._szgkSrc = src;
        audio.src = src;
        sounds[key] = audio;
      } catch (e) { resolve(); }
    }));
  }
  function playSound(name) {
    var a = sounds[text(name, '')];
    if (!a) return;
    try { a.currentTime = 0; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  var _audioCtx = null;
  // Osciladores não são HTMLAudioElement e, sem este registro, continuavam
  // tocando depois de "Jogar de novo". Cada partida é dona dos seus tons.
  var activeTones = [];
  function ensureAudioCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch (e) { _audioCtx = null; }
    return _audioCtx;
  }
  /**
   * Acorda o áudio no primeiro GESTO (tecla/clique). Sem isto, um AudioContext
   * criado antes do gesto fica 'suspended' p/ sempre = todos os tons MUDOS
   * (Safari/iPad exige resume DENTRO do gesto).
   */
  function resumeAudio() {
    try {
      if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    } catch (e) {}
  }
  function releaseTone(record) {
    var index = activeTones.indexOf(record);
    if (index >= 0) activeTones.splice(index, 1);
    try { record.osc.onended = null; record.osc.disconnect(); } catch (e) {}
    try { record.gain.disconnect(); } catch (e) {}
  }
  function stopProjectTones() {
    var owned = activeTones.slice();
    activeTones.length = 0;
    for (var i = 0; i < owned.length; i++) {
      var record = owned[i];
      try { record.osc.onended = null; record.osc.stop(_audioCtx ? _audioCtx.currentTime : 0); } catch (e) {}
      try { record.osc.disconnect(); } catch (e) {}
      try { record.gain.disconnect(); } catch (e) {}
    }
  }
  function playTone(freq, ms) {
    var ac = ensureAudioCtx();
    if (!ac) return;
    try { if (ac.state === 'suspended') ac.resume(); } catch (e) {}
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = Math.max(20, Math.min(20000, num(freq, 440)));
      gain.gain.value = 0.06;
      osc.connect(gain); gain.connect(ac.destination);
      var dur = Math.max(0.01, Math.min(60, num(ms, 200) / 1000));
      var record = { osc: osc, gain: gain };
      activeTones.push(record);
      osc.onended = function () { releaseTone(record); };
      osc.start();
      gain.gain.setTargetAtTime(0, ac.currentTime + dur * 0.6, 0.05);
      osc.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  var FX_TONES = {
    coin: [880, 90], hit: [180, 80], explosion: [90, 260], jump: [520, 120],
    laser: [1200, 90], hurt: [140, 160], powerup: [700, 200], win: [990, 300],
    gameover: [120, 400], click: [440, 50]
  };
  function playEffect(fx) {
    var t = FX_TONES[text(fx, '')] || FX_TONES.hit;
    playTone(t[0], t[1]);
  }
`
