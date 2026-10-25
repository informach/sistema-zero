/**
 * Blocos de JOGO do Jogo 3D Avançado (review 3D, lote 12): patrulhar, a mochila 🎒, guardar o
 * progresso neste computador e as fases. Inserido na IIFE do runtime (marcador
 * `__SZ_GAME_KIT_3D_GAMEPLAY_RUNTIME__`), onde compartilha o estado do motor sem criar outro
 * global. String pura de JS ES5: sem crase, sem interpolação, só comentários de linha.
 *
 * Semântica (documentada no manual e no CLAUDE.md do pacote):
 * - PATRULHAR é um passo por quadro, como o "andar rumo ao ponto": vai de A a B e volta, virado
 *   para onde anda, e para meio segundo em cada ponta. Quem não chama mais (mudou de estado para
 *   perseguir) para de patrulhar. A perna da patrulha zera quando o objeto nasce.
 * - A MOCHILA continua de uma fase para a outra e zera quando a partida RECOMEÇA (entrar em
 *   "jogando" fora da pausa). É diferente do Mundo 3D, onde ela é salva no projeto.
 * - GUARDAR usa o localStorage do jogo (no preview, o shim por projeto), com o nome aparado.
 *   O mesmo valor de novo não grava. Sem storage, com a memória cheia, com um valor que não
 *   vira texto ou grande demais (mais de 20.000 letras), só avisa uma vez (cada caso com a
 *   sua frase) e segue.
 * - FASES: começar a partida é começar a fase 1 (o "Quando começar uma fase" roda depois do
 *   "Quando o jogo entrar no estado jogando"). "Ir para a próxima fase" é ADIADO para o começo
 *   do quadro seguinte: todos saem do jogo, o nascer sem parar e a contagem param, as faíscas,
 *   falas e barras somem, as luzes e os jorros acesos DURANTE a fase apagam (os de antes da
 *   fase 1 ficam), e roda o "Quando começar uma fase". Pontos e mochila continuam. Voltar ao
 *   menu ou recomeçar volta para a fase 1.
 */
export const gameKit3DGameplayRuntimeSource = `  // ---- 🚶 Patrulhar (um passo por quadro, como o seekPoint) ----
  var PATROL_PAUSE = 0.5;
  function patrol(e, ax, az, bx, bz, speed) {
    if (!isEntity(e)) return;
    if (e._patrolWait > 0) {
      e._patrolWait -= currentDt;
      e.vx = 0;
      e.vz = 0;
      return;
    }
    var back = e._patrolLeg === 1;
    var tx = back ? num(ax, 0) : num(bx, 0);
    var tz = back ? num(az, 0) : num(bz, 0);
    var dx = tx - e.mesh.position.x;
    var dz = tz - e.mesh.position.z;
    var len = Math.sqrt(dx * dx + dz * dz);
    var sp = Math.max(0, num(speed, 3));
    // Chegou (ou chegaria neste quadro): para, espera e troca de ponta.
    if (!(len > Math.max(0.15, sp * currentDt))) {
      e._patrolLeg = back ? 0 : 1;
      e._patrolWait = PATROL_PAUSE;
      e.vx = 0;
      e.vz = 0;
      return;
    }
    e.vx = (dx / len) * sp;
    e.vz = (dz / len) * sp;
    e.mesh.rotation.set(0, Math.atan2(e.vx, e.vz), 0);
    touchStatic(e);
  }

  // ---- 🎒 Mochila (zera ao recomeçar a partida; continua entre as fases) ----
  var bag = Object.create(null);
  function bagKey(item) { return text(item, '').trim(); }
  function bagAmount(n) {
    var v = Math.floor(num(n, 1));
    return v > 0 ? v : 0;
  }
  function drawBag() {
    var parts = [];
    for (var k in bag) parts.push(k + ' ×' + bag[k]);
    if (!parts.length) { rules.dropPanel('bottom-left', 'mochila'); return; }
    var el = rules.panel('bottom-left', 'mochila', 30);
    var t = '🎒 ' + parts.join(' · ');
    if (el && el.textContent !== t) el.textContent = t;
  }
  function putInBag(item, n) {
    var k = bagKey(item);
    var add = bagAmount(n);
    if (!k) { warnOnce('bag-name', '"Pôr … na mochila" precisa do nome do item'); return; }
    if (!add) return;
    bag[k] = (bag[k] || 0) + add;
    drawBag();
  }
  function takeFromBag(item, n) {
    var k = bagKey(item);
    var have = bag[k] || 0;
    if (!have) return;
    var left = have - bagAmount(n);
    if (left > 0) bag[k] = left; else delete bag[k];
    drawBag();
  }
  function bagCount(item) { return bag[bagKey(item)] || 0; }
  function clearBag() {
    bag = Object.create(null);
    drawBag();
  }

  // ---- 💾 Guardar o progresso neste computador ----
  var SAVE_PREFIX = 'szg3k-val-';
  var MAX_SAVED_CHARS = 20000;
  // O nome é aparado: " recorde" e "recorde" são o MESMO lugar (o bloco de ler também apara).
  function saveKey(name) { return text(name, '').trim(); }
  function saveValue(name, value) {
    var k = saveKey(name);
    if (!k) { warnOnce('save-name', '"Guardar … com o nome" precisa de um nome'); return; }
    var raw;
    try { raw = JSON.stringify(value === undefined ? null : value); } catch (e) { raw = null; }
    if (typeof raw !== 'string') {
      warnOnce('save-shape:' + k, 'não deu para guardar "' + k + '": guarde um número ou um texto');
      return;
    }
    if (raw.length > MAX_SAVED_CHARS) {
      warnOnce('save-size:' + k, 'não deu para guardar "' + k + '": é grande demais (o máximo é ' + MAX_SAVED_CHARS + ' letras)');
      return;
    }
    try {
      // O mesmo valor de novo não grava: guardar a cada quadro (o recorde no "A cada
      // quadro") não reescreve a memória do jogo nem acorda o espelho do preview à toa.
      if (window.localStorage.getItem(SAVE_PREFIX + k) === raw) return;
      window.localStorage.setItem(SAVE_PREFIX + k, raw);
    }
    catch (e) { warnOnce('save-fail', 'não deu para guardar neste computador (memória cheia ou bloqueada)'); }
  }
  function savedValue(name, fallback) {
    var k = saveKey(name);
    var none = fallback === undefined ? 0 : fallback;
    if (!k) return none;
    try {
      var raw = window.localStorage.getItem(SAVE_PREFIX + k);
      if (raw == null) return none;
      var v = JSON.parse(raw);
      return v == null ? none : v;
    } catch (e) { return none; }
  }

  // ---- 🚩 Fases (a fase 1 começa com a partida) ----
  var level = 1;
  var levelPending = false;
  var levelStartHooks = [];
  // Conta as fases já começadas. Luz e jorro guardam o número da fase em que nasceram:
  // os acesos ANTES da primeira fase (Ao iniciar, "Quando o jogo entrar no estado
  // jogando") ficam a partida toda; os acesos DURANTE uma fase saem com ela.
  var levelEpoch = 0;
  function runLevelStart() {
    levelEpoch += 1;
    for (var i = 0; i < levelStartHooks.length; i++) {
      try { levelStartHooks[i](level); }
      catch (e) { warnOnce('level-hook', 'erro no "Quando começar uma fase": ' + e); }
    }
  }
  // Partida nova (entrar em "jogando" fora da pausa) ou volta ao menu: fase 1, mochila vazia.
  function resetLevels() {
    level = 1;
    levelPending = false;
    clearBag();
  }
  function nextLevel() {
    if (state !== 'jogando') { warnOnce('level-state', '"Ir para a próxima fase" só vale com o jogo rodando'); return; }
    levelPending = true;
  }
  // Roda no começo do quadro (fora dos laços): trocar de fase no meio de um "Para cada"
  // tiraria do jogo quem o laço ainda ia visitar.
  function startPendingLevel() {
    levelPending = false;
    level += 1;
    for (var pk in pools) releaseAll(pools[pk]);
    spawners.length = 0;
    rules.stopTimer();
    rules.dropPanel('top-center', 'tempo');
    dropLevelLightsAndJets();
    clearSays();
    clearBars();
    runLevelStart();
  }
  // A fase que acaba leva as luzes e os jorros que ela acendeu (sem isso as luzes de cada
  // fase se somavam até o teto de 8 e as da fase seguinte não acendiam). As faíscas no ar
  // somem todas; os jorros de antes da primeira fase voltam a soltar faíscas.
  function dropLevelLightsAndJets() {
    for (var li = extraLights.length - 1; li >= 0; li--) {
      if (extraLights[li].userData.szLevelEpoch !== levelEpoch) continue;
      removePointLight(extraLights[li]);
      extraLights.splice(li, 1);
    }
    var keep = [];
    for (var ji = 0; ji < jets.length; ji++) {
      if (jets[ji].epoch !== levelEpoch) keep.push(jets[ji]);
    }
    resetParticles();
    for (var ki = 0; ki < keep.length; ki++) jets.push(keep[ki]);
  }
`
