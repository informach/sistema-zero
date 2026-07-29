/**
 * Domínio de animação do Jogo 2D Avançado. O fragmento roda dentro do IIFE do
 * runtime principal e compartilha suas funções/variáveis internas.
 */
export const gameKitAnimationRuntime = `
  // ---- 🎞️ Folha de quadros (Sprite + Animations do RPG kit, simplificado) ----

  function setSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    ensureImageLoaded(imageName);
    c._sheetImg = text(imageName, '');
    c._sheetFw = Math.max(1, num(fw, num(c.w, 32)));
    c._sheetFh = Math.max(1, num(fh, num(c.h, 32)));
    c._animFrom = 0; c._animTo = 0; c._animFps = 0; c._animStart = 0; c._animOnce = false;
  }
  function playAnim(c, from, to, fps) {
    if (!c || typeof c !== 'object') return;
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    var r = Math.max(1, num(fps, 8));
    // Guarda de transição (padrão g2d): re-tocar a MESMA animação todo quadro
    // NÃO reinicia — senão o 1º quadro congela para sempre.
    if (c._animFrom === f && c._animTo === t && c._animFps === r && !c._animOnce) return;
    c._animFrom = f;
    c._animTo = t;
    c._animFps = r;
    c._animOnce = false;
    // O relógio é o playTime (só anda em 'jogando') — a animação PAUSA junto.
    c._animStart = playTime;
  }

  // Folha de ANDAR direcional (personagem de topo estilo RPGMaker): a folha tem 4
  // LINHAS na ordem baixo/cima/esquerda/direita, cada uma com N quadros. O
  // drawEntity escolhe a linha pela direção que o personagem olha e anima a coluna
  // quando ele anda (parado = 1º quadro). Espelha o walk/idle por direção do
  // Sprite.animations do Pizza Legends, mas por FOLHA em vez de col,row autoral.
  /**
   * Tocar uma animacao UMA VEZ e travar no ultimo quadro (em vez de repetir).
   * Complementa o "Tocar a animacao" comum, que repete para sempre.
   */
  function playAnimOnce(c, from, to, fps) {
    if (!c || typeof c !== 'object') return;
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    var r = Math.max(1, num(fps, 8));
    if (c._animFrom === f && c._animTo === t && c._animFps === r && c._animOnce) return;
    startAnimOnce(c, f, t, r);
  }
  // O autoAnimate já protege a transição por ESTADO. Quando um estado one-shot
  // volta depois de outro estado, ele precisa reiniciar mesmo usando os mesmos
  // quadros; a API manual acima continua idempotente quando chamada todo quadro.
  function startAnimOnce(c, f, t, r) {
    c._animFrom = f; c._animTo = t; c._animFps = r; c._animOnce = true;
    c._animStart = playTime;
  }
  /** "Ja tocou tudo?" - puro, sai da conta do playTime: sem lista, sem passo, sem
   * reset. Vale para animacao de uma vez so (a que repete nunca "acaba"). */
  function animEnded(c) {
    if (!c || typeof c !== 'object') return true;
    if (!c._animOnce) return false;
    var span = num(c._animTo, 0) - num(c._animFrom, 0) + 1;
    var fps = num(c._animFps, 0);
    if (!(fps > 0) || !(span > 0)) return true;
    return (playTime - num(c._animStart, 0)) * fps >= span;
  }

  // ---- ANIMACAO POR ESTADO (a trava) ----
  // A TRAVA pertence ao ESTADO, nao a animacao - e por isso que ela serve aos TRES
  // sistemas de animacao (folha manual, folha de andar, quadros por fisica) e
  // tambem ao vetorial, que nao tem quadro nenhum para "terminar".
  //
  // Sem ela, a crianca manda golpear e a animacao de ANDAR apaga o golpe no quadro
  // seguinte. A base de luta resolve com uma cadeia de prioridade fixa dentro do
  // switchSprite; aqui a prioridade e constante do motor (ninguem quer "andar
  // atropela morrer") e o que a crianca responde e o que muda o jogo: se aquela
  // animacao pode ou nao ser interrompida.
  var STATE_FALLBACK = {
    morte: [],
    golpe: ['parado'],
    dano: ['parado'],
    caindo: ['pulando', 'andando', 'parado'],
    pulando: ['andando', 'parado'],
    andando: ['parado'],
    parado: []
  };
  var STATE_NAMES = { parado: 1, andando: 1, pulando: 1, caindo: 1, dano: 1, golpe: 1, morte: 1 };
  var STATE_LIST = 'use parado, andando, pulando, caindo, dano, golpe ou morte';
  // Cadeias completas pre-computadas (estado + fallbacks): o autoAnimate roda
  // por-entidade-por-quadro e um concat ali alocaria ate ~18k arrays/s num enxame.
  var STATE_CHAIN = (function () {
    var m = {};
    for (var k in STATE_FALLBACK) m[k] = [k].concat(STATE_FALLBACK[k]);
    return m;
  })();

  /** Poe a entidade num estado por N segundos - e e a TRAVA: enquanto durar, o
   * autoAnimate nao deixa a fisica roubar a animacao. secs <= 0 = ate a animacao
   * declarada do estado acabar. */
  function setEntityState(who, name, secs) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('estado:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    who._state = st;
    who._stateUntil = playTime + Math.max(0, num(secs, 0));
  }
  function entityState(who) {
    if (!who || typeof who !== 'object') return 'parado';
    if (who._state && playTime < num(who._stateUntil, 0)) return who._state;
    return derivedState(who);
  }
  /** Declara a animacao de UM estado (1x no comeco). O autoAnimate troca sozinho. */
  function stateAnim(who, name, from, to, fps, once) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('stateanim:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    if (!who._stateAnims) who._stateAnims = {};
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    who._stateAnims[st] = { from: f, to: t, fps: Math.max(1, num(fps, 8)), once: !!once };
  }
  /** O caminho VETORIAL do mesmo contrato: a aparencia de um estado (sem folha). */
  function stateLook(who, name, lookName) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('statelook:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    if (!who._stateLooks) who._stateLooks = {};
    who._stateLooks[st] = text(lookName, '');
  }
  /** Deriva o estado pela FISICA, na ordem fixa da base de luta (que esta certa):
   * morte > golpe > dano > no ar > andando > parado. */
  function derivedState(c) {
    if (num(c.maxHealth, 0) > 0 && num(c.health, 0) <= 0) return 'morte';
    if (num(c._swingT, 0) > 0) return 'golpe';
    if (num(c._iFrames, 0) > 0) return 'dano';
    if (c.onGround === false) return num(c.vy, 0) < 0 ? 'pulando' : 'caindo';
    if (Math.abs(num(c.vx, 0)) > 0.01) return 'andando';
    return 'parado';
  }
  /**
   * Anima sozinho pelo que a entidade esta FAZENDO. Use todo quadro.
   * Nada declarado = no-op: quem nao usa nao paga nada.
   */
  function autoAnimate(who) {
    if (!who || typeof who !== 'object') return;
    // 1) estado TRAVADO vence a fisica (e a trava)
    var st = (who._state && playTime < num(who._stateUntil, 0)) ? who._state : derivedState(who);
    // 2) flip pelo sinal de vx - so se NAO houver folha de andar (essa tem uma
    //    linha por direcao e se vira sozinha).
    if (!text(who._walkImg, '')) {
      var vx = num(who.vx, 0);
      if (vx > 0.01) { who._facingDir = 'right'; who._facingLeft = false; }
      else if (vx < -0.01) { who._facingDir = 'left'; who._facingLeft = true; }
    }
    // 3) o estado sem visual declarado cai no parente mais proximo, numa ordem FIXA
    //    e previsivel (caindo parece pular; pular parece andar; golpe parece parado).
    var anims = who._stateAnims;
    var looks = who._stateLooks;
    var key = null;
    // st e sempre um dos 7 nomes (derivedState/setEntityState validam); o ramo
    // lazy e so rede - o mapa nao cresce alem deles.
    var chain = STATE_CHAIN[st] || (STATE_CHAIN[st] = [st].concat(STATE_FALLBACK[st] || []));
    for (var i = 0; i < chain.length; i++) {
      if ((anims && anims[chain[i]]) || (looks && looks[chain[i]])) { key = chain[i]; break; }
    }
    if (!key) {
      // O visual atual pode continuar parado no último quadro, mas ele não é
      // mais o ESTADO lógico ativo. Limpar a transição permite tocar o mesmo
      // one-shot de novo quando a entidade voltar àquele estado.
      who._animState = undefined;
      return;
    }
    if (looks && looks[key]) who.look = looks[key];
    if (anims && anims[key]) {
      var a = anims[key];
      if (a.once) {
        // fps ESTICADO p/ a animacao durar exatamente a trava: e isto que faz
        // "pular quadro" nao quebrar nada - a mecanica manda, a animacao obedece.
        var dur = num(who._stateUntil, 0) - playTime;
        var span = a.to - a.from + 1;
        var fps = (who._state === key && dur > 0.01) ? span / dur : a.fps;
        if (who._animState !== key) startAnimOnce(who, a.from, a.to, fps);
      } else if (who._animState !== key) playAnim(who, a.from, a.to, a.fps);
    }
    who._animState = key;
  }

  function setWalkSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    ensureImageLoaded(imageName);
    c._walkImg = text(imageName, '');
    c._walkFw = Math.max(1, num(fw, num(c.w, 16)));
    c._walkFh = Math.max(1, num(fh, num(c.h, 16)));
    c._walkFrames = 0; // 0 = usar todas as colunas da folha
  }
`
