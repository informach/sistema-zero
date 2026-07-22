/** Domínio de cartas do Jogo 2D Avançado, injetado no IIFE principal. */
export const gameKitCardsRuntime = `
  // ---- 🃏 Cartas, pilhas e mão clicável ----
  function pileMoveTop(from, to) {
    if (!Array.isArray(from) || !Array.isArray(to) || from.length === 0) return;
    to.push(from.pop());
  }
  function pileShuffleFrom(deck, discard) {
    if (!Array.isArray(deck) || !Array.isArray(discard)) return;
    while (discard.length) deck.push(discard.pop());
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
  }
  function pileTop(pile) { return (Array.isArray(pile) && pile.length) ? pile[pile.length - 1] : null; }
  function pileSize(pile) { return Array.isArray(pile) ? pile.length : 0; }
  function makeCard(front, back) {
    return { front: front, back: (back === undefined || back === null) ? '?' : back, faceUp: false };
  }
  function cardFlip(c) { if (c && typeof c === 'object') c.faceUp = !c.faceUp; }
  function cardIsUp(c) { return !!(c && typeof c === 'object' && c.faceUp); }
  function cardFace(c) {
    if (!c || typeof c !== 'object') return c;
    return c.faceUp ? c.front : c.back;
  }
  var handRects = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function handDraw(pile, x, y, fan) {
    if (!Array.isArray(pile) || !ctx2d) return;
    var cw = 60, ch = 84, gap = 12, n = pile.length;
    var rects = handRects ? handRects.get(pile) : null;
    if (!rects) { rects = []; if (handRects) handRects.set(pile, rects); }
    var bx = num(x, 0), by = num(y, 0);
    for (var i = 0; i < n; i++) {
      var rx = bx + i * (cw + gap);
      var ry = by + (fan ? Math.abs(i - (n - 1) / 2) * 6 : 0);
      ctx2d.save();
      ctx2d.fillStyle = '#fdfdfd'; ctx2d.strokeStyle = '#2b2b2b'; ctx2d.lineWidth = 2;
      ctx2d.fillRect(rx, ry, cw, ch); ctx2d.strokeRect(rx, ry, cw, ch);
      var card = pile[i];
      var face = (card && typeof card === 'object' && 'faceUp' in card) ? (card.faceUp ? card.front : card.back) : card;
      ctx2d.fillStyle = '#1b1b1b'; ctx2d.font = '22px ' + _szGameUIFont;
      ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText(String(face === undefined || face === null ? '' : face), rx + cw / 2, ry + ch / 2);
      ctx2d.restore();
      var r = rects[i];
      if (r) { r.x = rx; r.y = ry; r.w = cw; r.h = ch; }
      else rects[i] = { x: rx, y: ry, w: cw, h: ch };
    }
    rects.length = n;
  }
  function cardAt(x, y, pile) {
    if (!Array.isArray(pile) || !handRects) return -1;
    var rects = handRects.get(pile);
    if (!rects) return -1;
    var px = num(x, 0), py = num(y, 0);
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  // ---- 🃏 Kit Cartas (deck-battler) ----
  var cards = { battle: null, onTurn: [], onEnemyTurn: [], firstTurnPending: false };
  function cardsStart(heroHp, enemyHp) {
    var hh = Math.max(1, num(heroHp, 30)), eh = Math.max(1, num(enemyHp, 40));
    cards.battle = {
      heroHp: hh, heroMax: hh, enemyHp: eh, enemyMax: eh,
      energy: 3, energyPerTurn: 3, block: 0,
      intentAction: 'atacar', intentValue: 6
    };
    // Durante a factory, os blocos de Início rodam antes dos Eventos. Adie somente
    // esse primeiro turno até a factory terminar, para a compra/configuração já
    // existir. Chamadas feitas depois (clique, estado etc.) continuam imediatas.
    cards.firstTurnPending = runningProjectFactory;
    if (!cards.firstTurnPending) cardsStartTurn();
  }
  function cardsEnergyPerTurn(n) { if (cards.battle) { cards.battle.energyPerTurn = Math.max(0, num(n, 3)); cards.battle.energy = cards.battle.energyPerTurn; } }
  function cardsEnergy() { return cards.battle ? cards.battle.energy : 0; }
  function cardsSpend(n) { if (cards.battle) cards.battle.energy = Math.max(0, cards.battle.energy - Math.max(0, num(n, 1))); }
  function cardsHeroLife() { return cards.battle ? Math.max(0, cards.battle.heroHp) : 0; }
  function cardsEnemyLife() { return cards.battle ? Math.max(0, cards.battle.enemyHp) : 0; }
  function cardsHurtEnemy(n) { if (cards.battle) cards.battle.enemyHp -= Math.max(0, num(n, 0)); }
  function cardsHurtMe(n) {
    if (!cards.battle) return;
    var d = Math.max(0, num(n, 0));
    var absorbed = Math.min(cards.battle.block, d);
    cards.battle.block -= absorbed; d -= absorbed; cards.battle.heroHp -= d;
  }
  function cardsGainBlock(n) { if (cards.battle) cards.battle.block += Math.max(0, num(n, 0)); }
  function cardsEnemyIntent(action, value) {
    if (cards.battle) { cards.battle.intentAction = text(action, 'atacar'); cards.battle.intentValue = Math.max(0, num(value, 6)); }
  }
  function cardsIntentAction() { return cards.battle ? cards.battle.intentAction : ''; }
  function cardsIntentValue() { return cards.battle ? cards.battle.intentValue : 0; }
  function cardsOnTurn(fn) { if (typeof fn === 'function') cards.onTurn.push(fn); }
  function cardsOnEnemyTurn(fn) { if (typeof fn === 'function') cards.onEnemyTurn.push(fn); }
  function cardsStartTurn() {
    if (!cards.battle) return;
    cards.battle.energy = cards.battle.energyPerTurn;
    cards.battle.block = 0;
    for (var i = 0; i < cards.onTurn.length; i++) {
      try { cards.onTurn[i](); } catch (e) { warn('erro no "Quando começar o meu turno": ' + e); }
    }
  }
  function cardsEndTurn() {
    if (!cards.battle) return;
    for (var i = 0; i < cards.onEnemyTurn.length; i++) {
      try { cards.onEnemyTurn[i](); } catch (e) { warn('erro no "Quando for a vez do inimigo": ' + e); }
    }
    cardsStartTurn();
  }
  function cardsProjectReady() {
    if (!cards.firstTurnPending || !cards.battle) return;
    cards.firstTurnPending = false;
    cardsStartTurn();
  }
  function cardsNewGame() { cards.battle = null; cards.firstTurnPending = false; }
  function cardsResetProject() {
    cards.onTurn.length = 0;
    cards.onEnemyTurn.length = 0;
    cards.firstTurnPending = false;
  }
  function cardsDrawHud() {
    if (!cards.battle || !ctx2d) return;
    var b = cards.battle;
    drawBar(Math.max(0, b.enemyHp), b.enemyMax, config.w / 2 - 130, 46, 260, 18, '#ef4444');
    drawBar(Math.max(0, b.heroHp), b.heroMax, config.w / 2 - 130, config.h - 66, 260, 18, '#4ade80');
    ctx2d.save();
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px ' + _szGameUIFont; ctx2d.textAlign = 'center';
    ctx2d.fillText('👿 vai: ' + b.intentAction + ' ' + b.intentValue, config.w / 2, 34);
    ctx2d.fillText('⚡ Energia: ' + b.energy + '     🛡️ Escudo: ' + b.block, config.w / 2, config.h - 34);
    ctx2d.restore();
  }
`
