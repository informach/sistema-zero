/**
 * Ciclo de vida da execução gerada: estados do jogo, reinício e reconstrução da
 * receita do aluno. É inserido na IIFE do runtime, onde compartilha o estado do
 * motor sem criar outro global.
 */
export const gameKit3DProjectRuntimeSource = `  // ---- Ciclo de vida do projeto e estados do jogo ----

  function transitionGameState(n) {
    var prev = state;
    var resuming = n === 'jogando' && prev === 'pausado';
    state = n;
    mouseHeld = false;
    mouseJust = false;
    if (n !== 'jogando') releaseFpsInput();
    applyStateScreens(n);
    var newRun = n === 'jogando' && prev !== 'jogando' && prev !== 'pausado';
    // Voltar ao menu também volta para a fase 1 (o "o número da fase" lido lá diz 1).
    if (n === 'menu') resetLevels();
    if (newRun) {
      resetLevels();
      playTime = 0;
      entityLimitWarned = false;
      for (var pk in pools) releaseAll(pools[pk]);
      for (var si = 0; si < spawners.length; si++) spawners[si].timer = 0;
      resetParticles();
      clearSays();
      clearBars();
      // Placar, contagem, texto nos cantos e tremor (as regras comuns) voltam do zero. Sem a
      // fábrica do projeto (código antigo), os "Quando a contagem acabar" ficam registrados.
      if (camera) rules.beforeFrame(camera);
      rules.reset(!projectFactory);
      models.resetFlipbooks();
      if (projectFactory) {
        resetProjectRuntime();
        executeProjectFactory();
      }
    }
    var hooks = resuming ? null : enterStateHooks[n];
    if (hooks) {
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) { warn('erro no "quando o jogo entrar no estado ' + n + '": ' + e); }
      }
    }
    // Começar a partida é começar a fase 1 (depois do "Quando o jogo entrar no estado jogando").
    if (newRun) runLevelStart();
  }

  function setState(name) {
    var n = text(name, '');
    if (!n) return;
    stateQueue.push(n);
    if (changingState) return;

    changingState = true;
    var transitions = 0;
    try {
      while (stateQueue.length) {
        var requested = stateQueue.shift();
        if (!requested || requested === state) continue;
        if (transitions >= MAX_GAME_STATE_TRANSITIONS) {
          warnOnce('game-state-cycle', 'as mudanças de estado do jogo entraram em ciclo — revise os "Quando o jogo entrar no estado"');
          stateQueue.length = 0;
          break;
        }
        transitions++;
        transitionGameState(requested);
      }
    } finally {
      changingState = false;
      stateQueue.length = 0;
    }
  }

  function resetProjectRuntime() {
    resetAudioForRun();
    resetAccessibleHud();
    _fpsTouchId = null;
    updateHooks.length = 0;
    enterStateHooks = Object.create(null);
    listeners = Object.create(null);
    fsmHooks = Object.create(null);
    deathHooks = Object.create(null);
    hurtHooks = Object.create(null);
    overlapHooks = Object.create(null);
    animEndHooks = Object.create(null);
    levelStartHooks.length = 0;
    stateTimers.length = 0;
    spawners.length = 0;
    clearDecor();
    for (var li = 0; li < extraLights.length; li++) removePointLight(extraLights[li]);
    extraLights.length = 0;
    for (var fk in effects) disposeEffect(effects[fk]);
    disposeModelPools();
    var disposedMaterials = new Set();
    for (var mk in molds) disposeMoldTemplate(molds[mk], disposedMaterials);
    for (var bi = 0; bi < projectButtons.length; bi++) {
      var button = projectButtons[bi];
      if (button && button.parentNode) button.parentNode.removeChild(button);
    }
    projectButtons.length = 0;
    molds = Object.create(null);
    moldCount = 0;
    pools = Object.create(null);
    totalAlive = 0;
    resetActiveModelCost();
    effects = Object.create(null);
    effectCount = 0;
    jets.length = 0;
    anySolid = false;
    anyTrigger = false;
    anyCarrier = false;
  }

  function executeProjectFactory() {
    if (typeof projectFactory !== 'function' || runningProjectFactory) return;
    runningProjectFactory = true;
    try { projectFactory(); }
    catch (e) { warn('erro em "Ao iniciar": ' + e); }
    runningProjectFactory = false;
  }

  function runProject(fn) {
    if (typeof fn !== 'function') {
      warn('o projeto precisa de uma função de início');
      return;
    }
    projectFactory = fn;
    executeProjectFactory();
  }
`
