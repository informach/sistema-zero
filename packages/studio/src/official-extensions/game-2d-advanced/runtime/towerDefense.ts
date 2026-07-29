/**
 * Domínio de defesa de torre injetado no mesmo IIFE de SZGameKit.
 *
 * O fragmento compartilha o escopo léxico do runtime principal; ele não cria
 * outro global nem altera o bootstrap publicado pela extensão.
 */
export const towerDefenseRuntime = `
  // 🏰 KIT DEFESA DE TORRE - o atalho do genero (Tower Defense)
  // ==========================================================================
  // Pela REGRA: o caminho (🛤️ geral), o alvo (pickActive geral), o tiro da torre
  // (cooldown + spawn + seek + overlap) sao GERAIS. O kit so tem o que SO existe
  // em TD: a onda que INVADE pelo caminho, os lugares de torre com compra
  // validada, e o anel de alcance. A economia (carteira) mora no kit como o XP
  // do RPG e os rounds da Luta (precedente rpgLevel/lutaWinsOf).
  /** A onda: nasce ESPACADA atras do inicio do caminho (o xOffset=i*150 do
   * Chris, generalizado); o MOTOR move cada um pelo caminho (stepTd). */
  function tdWave(pathName, count, moldName, gap, speed) {
    var pk = text(pathName, '');
    var rec = paths[pk];
    if (!rec) { warnOnce('tdwave:' + pk, 'o caminho "' + pk + '" não existe — crie com "Criar o caminho"'); return; }
    var mk = text(moldName, '');
    if (!molds[mk]) { warnOnce('tdmold:' + mk, 'o molde "' + mk + '" não existe — crie com "Criar o molde"'); return; }
    if (td.waves.length >= MAX_TD_WAVES) { warnOnce('tdwaves', 'muitas ondas ao mesmo tempo (teto ' + MAX_TD_WAVES + ')'); return; }
    var n = Math.max(1, Math.min(200, Math.round(num(count, 3))));
    var g = Math.max(0, num(gap, 150));
    var v = num(speed, 90);
    // Vetor unitario do 1o trecho: os inimigos entram em fila atras do 1o ponto.
    var p0 = rec.pts[0], p1 = rec.pts[1];
    var dx = p1.x - p0.x, dy = p1.y - p0.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    td.seq += 1;
    var w = { id: td.seq, path: pk, mold: mk, speed: v, members: [] };
    for (var i = 0; i < n; i++) {
      var e = spawnFromMold(mk, 0, 0);
      if (!e) break;
      e.x = p0.x - ux * g * i - e.w / 2;
      e.y = p0.y - uy * g * i - e.h / 2;
      e._prevX = e.x; e._prevY = e.y;
      e._pathName = pk; e._pathIdx = 0; e._pathDone = false;
      e._tdWave = w.id; // ⭐ carimbo anti-fantasma (a licao do _wave do Nave)
      w.members.push(e);
    }
    if (w.members.length) td.waves.push(w);
  }
  /** Marcar um lugar de torre (um por bloco; funciona com qualquer fundo). */
  function tdSlot(x, y, size) {
    if (td.slots.length >= MAX_TD_SLOTS) { warnOnce('tdslots', 'muitos lugares de torre (teto ' + MAX_TD_SLOTS + ')'); return; }
    td.slots.push({ x: num(x, 100), y: num(y, 100), size: Math.max(8, num(size, 64)), occupied: false });
  }
  function tdFreeSlot(x, y) {
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (Math.abs(num(x, 0) - s.x) <= s.size / 2 && Math.abs(num(y, 0) - s.y) <= s.size / 2) {
        s.occupied = false; return;
      }
    }
  }
  function tdSlotAt(px, py) {
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (!s.occupied && Math.abs(px - s.x) <= s.size / 2 && Math.abs(py - s.y) <= s.size / 2) return s;
    }
    return null;
  }
  function tdDrawSlots() {
    if (!ctx2d) return;
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (s.occupied) continue;
      var hover = Math.abs(mouse.x - s.x) <= s.size / 2 && Math.abs(mouse.y - s.y) <= s.size / 2;
      var prev = 1;
      try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = hover ? 0.4 : 0.15; } catch (e) {}
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      try { ctx2d.globalAlpha = prev; } catch (e) {}
    }
  }
  function tdDrawRange(who, radius) {
    if (!ctx2d || !who || typeof who !== 'object') return;
    var r = Math.max(1, num(radius, 220));
    var prev = 1;
    try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = 0.12; } catch (e) {}
    ctx2d.fillStyle = '#66aaff';
    ctx2d.beginPath();
    try { ctx2d.arc(centerX(who), centerY(who), r, 0, Math.PI * 2); ctx2d.fill(); } catch (e) {}
    try { ctx2d.globalAlpha = prev; ctx2d.strokeStyle = '#66aaff'; ctx2d.lineWidth = 2; ctx2d.stroke(); } catch (e) {}
  }
  // Carteira do kit (precedente rpgLevel/lutaWinsOf — evita o padrao novo de
  // closures no parser p/ ler a variavel da crianca).
  function tdSetCoins(n) { td.coins = Math.round(num(n, 100)); td.coinsInit = td.coins; }
  function tdAddCoins(n) { td.coins = Math.round(td.coins + num(n, 0)); }
  function tdCoins() { return td.coins; }
  // Há um único evento de compra no kit: registrar dois corpos faria o mesmo
  // clique cobrar duas vezes. O primeiro registro vence e o segundo ensina a
  // criança a manter apenas um chapéu de evento.
  var tdBuyer = null;
  function tdOnBuy(cost, fn) {
    if (typeof fn !== 'function') return;
    if (tdBuyer) {
      warnOnce('tdbuyer:duplicate', 'use apenas um bloco "Quando clicar para comprar uma torre" — o primeiro será usado');
      return;
    }
    tdBuyer = { cost: Math.max(0, num(cost, 50)), fn: fn };
  }
  /** Clique no jogo: 1o slot livre sob o ponto. Paga e roda o corpo, ou avisa. */
  function tdHandleClick(px, py) {
    if (!tdBuyer) return false;
    var slot = tdSlotAt(px, py);
    if (!slot) return false;
    if (td.coins >= tdBuyer.cost) {
      td.coins -= tdBuyer.cost;
      slot.occupied = true;
      try { tdBuyer.fn(slot.x, slot.y); } catch (e) { warn('erro no "Quando comprar a torre": ' + e); }
    } else {
      emit('compra:negada', null);
    }
    return true; // consome o clique (nao cai no "Quando clicar no jogo")
  }
  /** O passo do kit (stepSystems): move as ondas pelo caminho, avisa vazamento. */
  function stepTd(dt) {
    for (var wi = td.waves.length - 1; wi >= 0; wi--) {
      var w = td.waves[wi];
      var rec = paths[w.path];
      var ms = w.members;
      for (var i = ms.length - 1; i >= 0; i--) {
        var e = ms[i];
        if (!e || e._active === false || e._tdWave !== w.id) {
          ms[i] = ms[ms.length - 1]; ms.pop(); continue;
        }
        if (rec) followPathStep(e, rec, w.speed, dt);
        if (e._pathDone) {
          ms[i] = ms[ms.length - 1]; ms.pop();
          recycle(e);
          emit('invasor:passou', null); // a crianca tira a vida no on()
        }
      }
      if (!ms.length) {
        td.waves[wi] = td.waves[td.waves.length - 1]; td.waves.pop();
        emit('onda:limpa', null); // MESMO evento do Nave (vocabulario unico)
      }
    }
  }
  /** "Jogar de novo" limpa o kit; slots liberam, moedas voltam ao inicial. */
  function tdNewGame() {
    td.waves.length = 0;
    for (var i = 0; i < td.slots.length; i++) td.slots[i].occupied = false;
    td.coins = td.coinsInit;
  }
  function tdResetProject() {
    td.slots.length = 0;
    tdBuyer = null;
  }

`
