export const gameTwoDAudioRuntime = `  // ---- Áudio (Web Audio, sem assets) ----
  var audioCtx = null;
  var _activeAudioSources = new Set();
  var _audioSuspendedForPause = false;
  var _audioResumeGeneration = 0;
  function _trackAudioSource(source) {
    if (!source) return source;
    _activeAudioSources.add(source);
    var release = function () { _activeAudioSources.delete(source); };
    if (typeof source.addEventListener === 'function') {
      source.addEventListener('ended', release, { once: true });
    } else {
      source.onended = release;
    }
    return source;
  }
  function _startAudioSource(source, when) {
    _trackAudioSource(source);
    try {
      if (when === undefined) source.start();
      else source.start(when);
    } catch (error) {
      _activeAudioSources.delete(source);
      throw error;
    }
  }
  function _stopActiveAudioSources() {
    var sources = Array.from(_activeAudioSources);
    _activeAudioSources.clear();
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      try { source.stop(0); } catch (ignored) {}
      try { if (typeof source.disconnect === 'function') source.disconnect(); } catch (ignored) {}
    }
  }
  // O Chromium proíbe criar/iniciar AudioContext antes de um gesto. Exemplos
  // podem declarar música no topo, então o motor espera o primeiro teclado/toque
  // em vez de gerar warning e deixar o contexto suspenso.
  var audioGestureSeen = false;
  function ensureAudio() {
    if (_paused) return null;
    if (audioCtx) return audioCtx;
    if (!audioGestureSeen) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {}
    return audioCtx;
  }
  function unlockAudio() {
    audioGestureSeen = true;
    // Solta os sons de ARQUIVO que ficaram esperando o gesto (o guard de _paused
    // mora dentro do _startClip, entao pausado nada dispara).
    _releaseClips();
    if (_paused) return;
    var ctx = ensureAudio();
    try {
      if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
    } catch (e) {}
    if (ctx && !_musicStop && _musicState && !_paused && _musicTimer === null) _musicNext();
  }
  if (window.addEventListener) {
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }
  /** Toca um tom curto (freq em Hz, duração em ms). Sintetizado — não precisa de arquivo. */
  function playSound(frequency, milliseconds) {
    if (_paused) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = _positiveFiniteNumber(frequency, 440);
      osc.connect(gain);
      gain.connect(ctx.destination);
      var dur = _positiveFiniteNumber(milliseconds, 200) / 1000;
      var t = ctx.currentTime;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      _startAudioSource(osc, t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  // Um tom com varredura de frequência opcional (slide 'exp'|'linear'|'none').
  function _fxBeep(type, fromHz, toHz, durSec, slide, peak) {
    if (_paused) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      var t = ctx.currentTime;
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(fromHz, t);
      if (toHz !== fromHz && slide && slide !== 'none') {
        if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), t + durSec);
        else osc.frequency.linearRampToValueAtTime(toHz, t + durSec);
      }
      var pk = _finiteNumber(peak, 0.1);
      gain.gain.setValueAtTime(pk, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
      osc.connect(gain); gain.connect(ctx.destination);
      _startAudioSource(osc, t); osc.stop(t + durSec);
    } catch (e) {}
  }
  // Uma sequência de notas: cada nota é [freqHz, inícioSeg, duraçãoSeg].
  function _fxSeq(type, notes, peak) {
    if (_paused) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var t0 = ctx.currentTime;
      var pk = _finiteNumber(peak, 0.1);
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.0001, t0 + n[1]);
        gain.gain.exponentialRampToValueAtTime(pk, t0 + n[1] + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        osc.connect(gain); gain.connect(ctx.destination);
        _startAudioSource(osc, t0 + n[1]); osc.stop(t0 + n[1] + n[2]);
      }
    } catch (e) {}
  }
  /**
   * Toca um efeito sonoro PRONTO pelo nome (sintetizado, sem arquivo). Reusa os
   * sons dos Kits quando combinam e tem receitas próprias para os demais.
   */
  function playFx(name) {
    switch (name) {
      case 'coin': _fxSeq('square', [[988, 0, 0.08], [1319, 0.07, 0.14]], 0.08); return;
      case 'gem': _fxSeq('triangle', [[1047, 0, 0.09], [1568, 0.08, 0.16]], 0.09); return;
      case 'heal': _fxSeq('sine', [[660, 0, 0.12], [880, 0.1, 0.2]], 0.1); return;
      case 'powerup': _fxBeep('square', 300, 1200, 0.35, 'exp', 0.09); return;
      case 'levelup': _fxSeq('square', [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.22]], 0.08); return;
      case 'collect': playCollect(); return;
      case 'laser': _fxBeep('square', 1200, 300, 0.12, 'exp', 0.07); return;
      case 'shoot': playShoot(); return;
      case 'explosion': playExplosion(); return;
      case 'hit': _fxBeep('square', 300, 90, 0.1, 'exp', 0.12); return;
      case 'hurt': playDinoHurt(); return;
      case 'punch': _fxBeep('sawtooth', 200, 60, 0.12, 'exp', 0.14); return;
      case 'jump': playJump(); return;
      case 'land': _fxBeep('sine', 220, 80, 0.12, 'exp', 0.12); return;
      case 'whoosh': _fxBeep('sine', 200, 900, 0.18, 'linear', 0.05); return;
      case 'step': _fxBeep('square', 150, 110, 0.05, 'exp', 0.06); return;
      case 'bounce': _fxBeep('sine', 400, 720, 0.08, 'linear', 0.1); return;
      case 'whistle': playWhistle(); return;
      case 'win': _fxSeq('square', [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.3]], 0.08); return;
      case 'gameover': _fxSeq('sawtooth', [[440, 0, 0.18], [349, 0.18, 0.18], [262, 0.36, 0.42]], 0.12); return;
      case 'start': _fxSeq('square', [[523, 0, 0.1], [784, 0.1, 0.2]], 0.08); return;
      case 'alarm': _fxSeq('square', [[880, 0, 0.12], [660, 0.14, 0.12], [880, 0.28, 0.12], [660, 0.42, 0.12]], 0.08); return;
      case 'click': _fxBeep('square', 800, 800, 0.04, 'none', 0.05); return;
      case 'confirm': _fxSeq('sine', [[660, 0, 0.08], [990, 0.07, 0.12]], 0.08); return;
      case 'error': _fxSeq('square', [[200, 0, 0.12], [160, 0.13, 0.2]], 0.1); return;
      case 'select': _fxBeep('triangle', 520, 720, 0.06, 'linear', 0.06); return;
      case 'blip': _fxBeep('square', 1000, 1000, 0.05, 'none', 0.05); return;
      default:
        warnOnce('fx:' + name, 'não conheço o som "' + name + '" — toquei um bip. Escolha um som da lista do bloco.');
        _fxBeep('square', 880, 1320, 0.18, 'exp', 0.08); return;
    }
  }

  // ---- Música de fundo: uma melodia curta sintetizada que toca em loop ----
  // Só UMA música por vez: chamar de novo para a anterior antes de começar.
  var _musicTimer = null;
  var _musicStop = false;
  var _musicName = null;
  var _musicState = null;
  var MUSIC_TUNES = Object.create(null);
  MUSIC_TUNES.adventure = { wave: 'square', step: 200, notes: [262, 330, 392, 330, 440, 392, 330, 262] };
  MUSIC_TUNES.happy = { wave: 'triangle', step: 180, notes: [523, 587, 659, 784, 659, 587, 523, 587] };
  MUSIC_TUNES.tense = { wave: 'sawtooth', step: 160, notes: [220, 233, 220, 207, 220, 247, 220, 196] };
  MUSIC_TUNES.calm = { wave: 'sine', step: 320, notes: [392, 440, 523, 440, 392, 349, 392, 0] };
  MUSIC_TUNES.victory = { wave: 'square', step: 200, notes: [523, 523, 523, 659, 784, 0, 784, 1047] };
  function _scheduleMusic(delay) {
    if (_musicStop || !_musicState || _paused) return;
    var wait = Math.max(0, _finiteNumber(delay, _musicState.step));
    _musicState.remaining = wait;
    _musicState.deadline = _wallNow() + wait;
    _musicTimer = setTimeout(_musicNext, wait);
  }
  function _musicNext() {
    _musicTimer = null;
    if (_musicStop || !_musicState || _paused) return;
    // Não deixe a melodia avançar em silêncio enquanto o navegador ainda
    // aguarda o primeiro gesto que permite criar o AudioContext.
    if (!ensureAudio()) return;
    var tune = _musicState.tune;
    var f = tune.notes[_musicState.index % tune.notes.length];
    if (f > 0) _fxBeep(tune.wave, f, f, _musicState.step / 1000 * 0.9, 'none', 0.05);
    _musicState.index++;
    _scheduleMusic(_musicState.step);
  }
  function playMusic(name) {
    if (!MUSIC_TUNES[name]) warnOnce('music:' + name, 'não conheço a música "' + name + '" — toquei "adventure". Escolha uma da lista do bloco.');
    var resolvedName = MUSIC_TUNES[name] ? name : 'adventure';
    if (!_musicStop && _musicState && _musicName === resolvedName) return;
    stopMusic();
    var tune = MUSIC_TUNES[resolvedName];
    var step = _positiveFiniteNumber(tune.step, 200);
    _musicStop = false;
    _musicName = resolvedName;
    _musicState = { tune: tune, step: step, index: 0, remaining: 0, deadline: 0 };
    _musicNext();
  }
  function _pauseMusic() {
    if (!_musicState || _musicTimer === null) return;
    _musicState.remaining = Math.max(0, _musicState.deadline - _wallNow());
    clearTimeout(_musicTimer);
    _musicTimer = null;
  }
  function _resumeMusic() {
    if (_musicStop || !_musicState || _musicTimer !== null) return;
    if (!ensureAudio()) return;
    _scheduleMusic(_musicState.remaining);
  }
  function _pauseAudio() {
    _pauseClips();
    _pauseMusic();
    _audioResumeGeneration += 1;
    _audioSuspendedForPause = false;
    var ctx = audioCtx;
    if (!ctx || ctx.state !== 'running' || typeof ctx.suspend !== 'function') return;
    _audioSuspendedForPause = true;
    try {
      var pending = ctx.suspend();
      if (pending && typeof pending.catch === 'function') {
        pending.catch(function () {
          if (audioCtx === ctx && _paused) _audioSuspendedForPause = false;
          warnOnce('audio-pause', 'o navegador não deixou pausar o áudio desta partida.');
        });
      }
    } catch (error) {
      _audioSuspendedForPause = false;
      warnOnce('audio-pause', 'o navegador não deixou pausar o áudio desta partida.');
    }
  }
  function _resumeAudio() {
    _resumeClips();
    var ctx = audioCtx;
    var shouldResumeContext = _audioSuspendedForPause;
    _audioSuspendedForPause = false;
    var generation = ++_audioResumeGeneration;
    if (!shouldResumeContext || !ctx || typeof ctx.resume !== 'function') {
      _resumeMusic();
      return;
    }
    try {
      var pending = ctx.resume();
      if (pending && typeof pending.then === 'function') {
        pending.then(function () {
          if (!_paused && generation === _audioResumeGeneration) _resumeMusic();
        }, function () {
          warnOnce('audio-resume', 'o navegador não deixou continuar o áudio desta partida. Interaja com o jogo para tentar de novo.');
        });
        return;
      }
      _resumeMusic();
    } catch (error) {
      warnOnce('audio-resume', 'o navegador não deixou continuar o áudio desta partida. Interaja com o jogo para tentar de novo.');
    }
  }
  function stopMusic() {
    _musicStop = true;
    if (_musicTimer !== null) clearTimeout(_musicTimer);
    _musicTimer = null;
    _musicName = null;
    _musicState = null;
  }
  // ---- 🔊 Som de ARQUIVO (o que a crianca enviou em "Imagens e sons") ----
  // Tudo acima e SINTETIZADO (oscilador). Daqui para baixo toca o mp3/wav dela,
  // por HTMLAudio.
  // ⚠️ Os nomes internos sao clip/track, e nao playSound/playMusic, porque esses
  // dois ja pertencem aos blocos de bip e de melodia pronta — e bloco que a
  // crianca ja usa nao muda de forma. No Jogo 3D, onde nao havia conflito, as
  // mesmas funcoes se chamam playSound/playMusic.
  var _clips = Object.create(null);
  // Fonte por apelido num mapa PARALELO: o typecheck do runtime confere contra o
  // DOM real, e HTMLAudioElement nao tem campo livre para pendurar coisa nossa.
  var _clipSrc = Object.create(null);
  var _clipVolume = 0.8;
  var _trackKey = '';
  // ⚠️ O navegador RECUSA play() antes de um gesto, e a recusa e SILENCIOSA
  // (promise rejeitada). Sem esta fila, "Tocar o som" no "Ao iniciar" nao
  // acontecia e nao havia nada no console explicando. Aqui o pedido espera o
  // primeiro clique/tecla — o mesmo destravamento que o bip ja fazia acima.
  var _clipWaiting = Object.create(null);
  function _releaseClips() {
    for (var key in _clipWaiting) {
      if (Object.prototype.hasOwnProperty.call(_clipWaiting, key)) {
        var start = _clipWaiting[key];
        delete _clipWaiting[key];
        try { start(); } catch (e) {}
      }
    }
  }
  function _clipKey(name) {
    return typeof name === 'string' ? name.trim() : '';
  }
  function loadSound(name, asset) {
    var key = _clipKey(name) || _clipKey(asset);
    if (!key) { warnOnce('som-sem-apelido', 'o bloco "Carregar o som" precisa de um apelido.'); return; }
    var wanted = _clipKey(asset);
    var registered = Object.prototype.hasOwnProperty.call(SOUNDS, wanted) ? SOUNDS[wanted] : null;
    var src = typeof registered === 'string'
      ? registered
      : (wanted.indexOf('data:audio/') === 0 ? wanted : null);
    if (!src) {
      warnOnce('som-ausente-' + wanted, 'o som "' + wanted + '" nao esta no projeto. Envie o arquivo em "Imagens e sons".');
      return;
    }
    if (_clips[key] && _clipSrc[key] === src) return;
    if (_clips[key]) { try { _clips[key].pause(); } catch (e) {} }
    try {
      var el = new Audio();
      el.preload = 'auto';
      el.volume = _clipVolume;
      el.onerror = function () { warnOnce('som-falhou-' + key, 'o som "' + key + '" nao pode ser carregado.'); };
      el.src = src;
      _clips[key] = el;
      _clipSrc[key] = src;
    } catch (e) {}
  }
  function _startClip(key, loop) {
    var el = _clips[key];
    if (!el || _paused) return;
    try {
      el.loop = !!loop;
      el.volume = _clipVolume;
      el.currentTime = 0;
      var playing = el.play();
      if (playing && playing.catch) {
        playing.catch(function () {
          if (!audioGestureSeen) _clipWaiting[key] = function () { _startClip(key, loop); };
        });
      }
    } catch (e) {}
  }
  function _requestClip(key, loop) {
    if (!key) return;
    if (!_clips[key]) {
      warnOnce('som-nao-carregado-' + key, 'o som "' + key + '" ainda nao foi carregado. Use "Carregar o som" em "Ao iniciar".');
      return;
    }
    if (!audioGestureSeen) { _clipWaiting[key] = function () { _startClip(key, loop); }; return; }
    _startClip(key, loop);
  }
  function playClip(name) {
    _requestClip(_clipKey(name), false);
  }
  function stopClip(name) {
    var key = _clipKey(name);
    if (key === _trackKey) _trackKey = '';
    delete _clipWaiting[key];
    var el = _clips[key];
    if (!el) return;
    try { el.pause(); el.currentTime = 0; el.loop = false; } catch (e) {}
  }
  function playTrack(name) {
    var key = _clipKey(name);
    if (!key) return;
    // UMA trilha por vez: comecar outra troca a que estava tocando.
    if (_trackKey && _trackKey !== key) stopClip(_trackKey);
    // Repetir a MESMA nao recomeca a faixa (o bloco costuma rodar mais de uma
    // vez, e recomecar do zero seria um solavanco).
    if (_trackKey === key && _clips[key] && !_clips[key].paused) return;
    _trackKey = key;
    _requestClip(key, true);
  }
  function stopTrack() {
    // ⚠️ Para as DUAS: a do arquivo e a melodia sintetizada. Assim "Parar a
    // musica" sempre faz o que a crianca espera, sem ela precisar lembrar de
    // qual dos dois blocos de musica usou.
    if (_trackKey) stopClip(_trackKey);
    stopMusic();
  }
  function setSoundVolume(level) {
    // ⚠️ NAO usar _positiveFiniteNumber aqui: ele so aceita > 0, entao o ZERO
    // caia no fallback 8 e "por o volume em 0" DEIXAVA O SOM EM 80%, o oposto do
    // que o bloco promete. E zero e justamente o valor que a crianca mais tenta,
    // porque o rotulo diz "0 (mudo)".
    var n = _isFiniteNumber(level) ? level : 8;
    // A crianca pensa de 0 a 10; o navegador quer 0 a 1.
    _clipVolume = Math.max(0, Math.min(10, n)) / 10;
    for (var key in _clips) {
      if (Object.prototype.hasOwnProperty.call(_clips, key)) {
        try { _clips[key].volume = _clipVolume; } catch (e) {}
      }
    }
  }
  /** Sem isto a trilha em loop sobrevive ao "jogar de novo" e some so no F5. */
  function _resetClips() {
    for (var key in _clips) {
      if (Object.prototype.hasOwnProperty.call(_clips, key)) {
        try { _clips[key].pause(); _clips[key].src = ''; } catch (e) {}
      }
    }
    _clips = Object.create(null);
    _clipSrc = Object.create(null);
    _clipWaiting = Object.create(null);
    _trackKey = '';
  }
  function _pauseClips() {
    for (var key in _clips) {
      if (Object.prototype.hasOwnProperty.call(_clips, key)) {
        try { if (!_clips[key].paused) _clips[key].pause(); } catch (e) {}
      }
    }
  }
  function _resumeClips() {
    // So a trilha volta sozinha: um efeito curto interrompido pela pausa nao
    // deve ressurgir fora de contexto quando o jogo despausa.
    if (_trackKey && _clips[_trackKey]) {
      try { var pr = _clips[_trackKey].play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    }
  }

  function _resetAudio() {
    stopMusic();
    _resetClips();
    _stopActiveAudioSources();
    _audioSuspendedForPause = false;
    _audioResumeGeneration += 1;
  }

  // ---- Notas musicais por nome (dó ré mi…) → frequência ----
  var NOTE_FREQS = { C: 262, D: 294, E: 330, F: 349, G: 392, A: 440, B: 494, C5: 523 };
  function playNote(note, milliseconds) {
    var f = NOTE_FREQS[note];
    playSound(_positiveFiniteNumber(f, 440), milliseconds);
  }

  _registerRuntimeDomain('audio', {
    reset: _resetAudio,
    pause: _pauseAudio,
    resume: _resumeAudio
  });

`
