/**
 * Domínio da batalha por turnos do Jogo 2D Avançado. O fragmento roda
 * dentro do IIFE principal e compartilha o estado do Kit RPG.
 */
export const gameKitRpgBattleRuntime = `
  // ⚔️ Batalha por turnos RICA (Combatant/TurnCycle do Pizza, 1v1): Atacar/
  // Especial (energia)/Item (poção)/Defender/Fugir; defesa reduz o dano; XP sobe
  // de nível; veneno tira vida por turno. Dano = força ± 20% − defesa/2.
  function rollDamage(strength, targetDef) {
    var raw = Math.round(num(strength, 1) * (0.8 + gameRandom() * 0.4));
    return Math.max(1, raw - Math.floor(num(targetDef, 0) / 2));
  }
  // ---- ⚔️ Batalha em EQUIPE (canvas): combatentes clicáveis + painéis ----
  // Um COMBATENTE carrega os próprios atributos (o createCharacter não tem stats de
  // luta). O herói entra a partir dos rpg.player* (progressão persiste); aliados e
  // inimigos vêm de "Adicionar aliado/inimigo"; os golpes nomeados de "Ensinar o golpe".
  function makeBattler(name, side, hp, str, def, look, color, image) {
    var mx = Math.max(1, num(hp, 20));
    ensureImageLoaded(image); // a imagem do combatente (Pinta) carrega sozinha
    return {
      name: text(name, side === 'inimigo' ? 'Inimigo' : 'Aliado'), side: side,
      hp: mx, max: mx, str: Math.max(0, num(str, 5)), def: Math.max(0, num(def, 0)),
      energy: 10, maxEnergy: 10, moves: [],
      defending: false, poison: 0, regen: 0, blind: 0, alive: true,
      look: text(look, ''), color: text(color, side === 'inimigo' ? '#e05a5a' : '#4a9eff'),
      // 🖼️ Imagem do combatente (a que você "Carregou pelo nome"): drawEntity a usa;
      // sem imagem, cai no retângulo da cor. Só o herói herdava sprite — agora os
      // inimigos/aliados/chefões também podem ter arte do Pinta.
      image: text(image, ''), x: 0, y: 0, w: 72, h: 72
    };
  }
  function heroBattler() {
    var b = makeBattler('Você', 'aliado', rpg.playerMax, rpg.playerStr, rpg.playerDef, '', '#4a9eff');
    b.energy = rpg.playerMaxEnergy; b.maxEnergy = rpg.playerMaxEnergy; b.isHero = true;
    // A vida do herói PERSISTE entre batalhas: ele entra com a vida ATUAL, não cheia
    // (o endBattle grava de volta ao vencer). Piso 1 p/ um herói ferido ainda lutar;
    // b.max segue playerMax (subir de nível aumenta o máximo). "Curar o herói" recupera.
    b.hp = Math.max(1, Math.min(rpg.playerMax, num(rpg.playerHp, rpg.playerMax)));
    // O herói aparece com o SEU visual do mundo (sprite/vetor/cor), se existir.
    if (rpg.hero) { b.image = text(rpg.hero.image, ''); b.look = text(rpg.hero.look, ''); b.color = text(rpg.hero.color, b.color); }
    if (rpg.special) b.moves.push({ name: rpg.special.name, dmg: rpg.special.dmg, cost: rpg.special.cost, heal: false });
    var extra = rpg.movesByName['Você'];
    if (extra) for (var i = 0; i < extra.length; i++) b.moves.push(extra[i]);
    return b;
  }
  function defToBattler(def, side) {
    var b = makeBattler(def.name, side, def.hp, def.str, def.def, def.look, def.color, def.image);
    var mv = rpg.movesByName[def.name];
    if (mv) for (var i = 0; i < mv.length; i++) b.moves.push(mv[i]);
    if (def.boss) b.boss = true; // 👑 CHEFÃO: maior + barra proeminente
    return b;
  }
  function firstAlive(list) { for (var i = 0; i < list.length; i++) if (list[i].alive && list[i].hp > 0) return list[i]; return null; }
  function aliveList(list) { var out = []; for (var i = 0; i < list.length; i++) if (list[i].alive && list[i].hp > 0) out.push(list[i]); return out; }
  function nextAliveAfter(list, who) {
    var seen = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === who) { seen = true; continue; }
      if (seen && list[i].alive && list[i].hp > 0) return list[i];
    }
    return null;
  }
  function foeNames(b) {
    var out = '';
    for (var i = 0; i < b.foes.length; i++) out += (i ? ', ' : '') + b.foes[i].name;
    return out;
  }
  // 🧙 Kit RPG: montar o time. rpgAddAlly = party PERSISTENTE (o herói já entra
  // sozinho); rpgAddFoe = inimigos da PRÓXIMA batalha; rpgTeachMove = golpes nomeados.
  function pushRpgLimited(list, value, limit, key, label) {
    if (list.length >= limit) {
      warnOnce('rpg-limit:' + key, 'o Kit RPG aceita até ' + limit + ' ' + label);
      return false;
    }
    list.push(value);
    return true;
  }
  function rpgAddAlly(name, hp, str, def, color, image) {
    pushRpgLimited(rpg.allies, { name: text(name, 'Aliado'), hp: num(hp, 24), str: num(str, 6), def: num(def, 1), look: '', color: text(color, '#4ade80'), image: text(image, '') }, MAX_RPG_ALLIES, 'allies', 'aliados além do herói');
  }
  function rpgAddFoe(name, hp, str, def, color, image) {
    pushRpgLimited(rpg.foeQueue, { name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0), look: '', color: text(color, '#e05a5a'), image: text(image, '') }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // 👑 O CHEFÃO: um inimigo da próxima batalha desenhado MAIOR, com barra proeminente.
  function rpgAddBoss(name, hp, str, def, image) {
    pushRpgLimited(rpg.foeQueue, { name: text(name, 'Chefão'), hp: num(hp, 120), str: num(str, 9), def: num(def, 2), look: '', color: '#b23b6e', boss: true, image: text(image, '') }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // 👑 R30: ler a vida de um combatente (herói/aliado/inimigo) por NOME — a chave
  // das FASES de chefe ("se a vida do Chefe < metade: fica furioso").
  function findBattler(name) {
    var b = rpg.battle; if (!b) return null;
    var nm = text(name, '');
    for (var i = 0; i < b.allies.length; i++) if (b.allies[i].name === nm) return b.allies[i];
    for (var j = 0; j < b.foes.length; j++) if (b.foes[j].name === nm) return b.foes[j];
    return null;
  }
  function findFoe(name) {
    var b = rpg.battle; if (!b) return null;
    var nm = text(name, '');
    for (var i = 0; i < b.foes.length; i++) if (b.foes[i].name === nm) return b.foes[i];
    return null;
  }
  function activeFoe(name, action) {
    var nm = text(name, '');
    var f = findFoe(nm);
    if (f && f.alive) return f;
    warnOnce('foe:' + action + ':' + nm, 'o inimigo "' + nm + '" não está vivo nesta batalha');
    return null;
  }
  function battlerLife(name) { var c = findBattler(name); return c ? Math.max(0, c.hp) : 0; }
  function battlerMaxLife(name) { var c = findBattler(name); return c ? c.max : 0; }
  // 👑 IA de chefe: o corpo roda na vez daquele inimigo (no lugar do ataque padrão).
  function rpgOnFoeTurn(name, fn) {
    if (typeof fn !== 'function') return;
    rpg.foeTurnHooks[text(name, 'Inimigo')] = fn;
  }
  // O inimigo NOMEADO usa um golpe ENSINADO (dano num aliado ao acaso, ou cura nele).
  function rpgFoeUse(name, moveName) {
    if (!rpg.battle) return;
    var f = activeFoe(name, 'golpe'); if (!f) return;
    var mn = text(moveName, ''), mv = null;
    for (var i = 0; i < f.moves.length; i++) if (f.moves[i].name === mn) { mv = f.moves[i]; break; }
    if (!mv) { warnOnce('foeuse:' + f.name + mn, 'o inimigo "' + f.name + '" não tem o golpe "' + mn + '" — ensine com "Ensinar o golpe"'); return; }
    foeUseMove(f, mv);
  }
  // O golpe ASSINATURA de chefão: acerta TODO o time de uma vez.
  function rpgFoeHitAll(name, dmg) {
    var b = rpg.battle; if (!b) return;
    var f = activeFoe(name, 'area'); if (!f) return;
    var base = Math.max(0, num(dmg, 10));
    var allies = aliveList(b.allies);
    for (var i = 0; i < allies.length; i++) {
      var v = allies[i];
      var d = rollDamage(base, v.def);
      if (v.defending) d = Math.max(d > 0 ? 1 : 0, Math.round(d / 2));
      v.hp -= d;
      if (d > 0) floatText('-' + d, v.x + v.w / 2, v.y, '#ff6b6b', 22);
      if (v.hp <= 0) { v.hp = 0; v.alive = false; }
    }
    b.message = f.name + ' atingiu TODO o time!';
  }
  // Ensinar é IDEMPOTENTE: um golpe com o MESMO nome REPÕE o anterior em vez de
  // empilhar — assim re-ensinar no onGameStart (a cada "Jogar de novo")
  // não duplica os golpes, agora que eles PERSISTEM (ver rpgNewGame).
  function teachMoveTo(k, mv) {
    if (!rpg.movesByName[k]) rpg.movesByName[k] = [];
    var list = rpg.movesByName[k];
    for (var i = 0; i < list.length; i++) { if (list[i].name === mv.name) { list[i] = mv; return; } }
    list.push(mv);
  }
  function rpgTeachMove(who, moveName, dmg, cost) {
    teachMoveTo(text(who, 'Você'), { name: text(moveName, 'Golpe'), dmg: Math.max(1, num(dmg, 10)), cost: Math.max(0, num(cost, 3)), heal: false });
  }
  // Golpe de CURA (heal:true) — o painel de ação mostra "(cura N)" e o applyHeal
  // devolve vida ao próprio lutador em vez de ferir o inimigo.
  function rpgTeachHeal(who, moveName, amount, cost) {
    teachMoveTo(text(who, 'Você'), { name: text(moveName, 'Cura'), dmg: Math.max(1, num(amount, 12)), cost: Math.max(0, num(cost, 3)), heal: true });
  }
  function layoutRow(list, cy) {
    var n = list.length; if (n === 0) return;
    var sz = 72, boss = 112, gap = 28;
    var totalW = 0;
    for (var k = 0; k < n; k++) totalW += (list[k].boss ? boss : sz) + (k ? gap : 0);
    // Mesmo no menor canvas aceito, a fileira inteira permanece visível. Os
    // limites acima preservam tamanhos úteis; esta escala resolve larguras custom.
    var scale = Math.min(1, Math.max(1, config.w - 32) / totalW);
    var scaledGap = gap * scale;
    var x = (config.w - totalW * scale) / 2;
    for (var i = 0; i < n; i++) {
      var c = list[i];
      var s = (c.boss ? boss : sz) * scale;
      c.w = s; c.h = s; c.x = x; c.y = cy - s / 2; // topos alinhados; o chefão desce mais
      x += s + scaledGap;
    }
  }
  function layoutBattlers() {
    var b = rpg.battle; if (!b) return;
    layoutRow(b.foes, config.h * 0.30);
    layoutRow(b.allies, config.h * 0.66);
  }
  function rpgBattleStats(hp, str, def) {
    rpg.baseMax = Math.max(1, num(hp, 30));
    rpg.baseStr = Math.max(1, num(str, 7));
    rpg.baseDef = Math.max(0, num(def, 0));
    rpg.playerMax = rpg.baseMax;
    rpg.playerStr = rpg.baseStr;
    rpg.playerDef = rpg.baseDef;
    rpg.playerHp = rpg.playerMax;
    rpg.playerLevel = 1;
    rpg.playerXp = 0;
    rpg.playerMaxXp = 20;
  }
  function rpgSetSpecial(name, dmg, cost) {
    rpg.special = { name: text(name, 'Especial'), dmg: Math.max(1, num(dmg, 12)), cost: Math.max(0, num(cost, 4)) };
  }
  function rpgGivePotion(name, heal) {
    pushRpgLimited(rpg.potions, { name: text(name, 'Poção'), heal: Math.max(1, num(heal, 20)) }, MAX_RPG_POTIONS, 'potion', 'poções');
  }
  // 🩸 Cura o herói ao MÁXIMO fora da batalha (a estalagem/save/checkpoint). Como a
  // vida agora PERSISTE entre lutas, é a forma de recuperar. Espelha o pkmHealTeam.
  function rpgHealHero() { rpg.playerHp = rpg.playerMax; }
  // Núcleo COMPARTILHADO: monta a batalha (herói + party × inimigo principal + fila) e
  // entra no estado 'batalha'. O mainFoe é um battler JÁ pronto (via defToBattler) — assim
  // o inimigo principal ganha imagem, chefão e golpes ensinados de graça, igual à fila.
  function startTeamBattle(mainFoe) {
    if (!canStartBattle('Kit RPG')) return;
    if (!ensureShell()) return;
    var allies = [heroBattler()];
    for (var i = 0; i < rpg.allies.length; i++) allies.push(defToBattler(rpg.allies[i], 'aliado'));
    var foes = [mainFoe];
    for (var j = 0; j < rpg.foeQueue.length; j++) foes.push(defToBattler(rpg.foeQueue[j], 'inimigo'));
    rpg.foeQueue = []; // a fila é consumida pela batalha
    rpg.battle = {
      allies: allies, foes: foes, phase: 'abrindo', actor: null, target: null,
      move: null, inspect: null, message: '', t: 0, foeIdx: 0
    };
    layoutBattlers();
    setState('batalha'); // estado do MEIO do jogo: congela o mundo SEM resetar
    // ⚡ Transição de ENTRADA (JRPG): a tela pisca branco e a cena de batalha EMERGE
    // do flash (fade começa coberto e clareia). stepScreenFx roda fora do gate de
    // estado, então anima já no 'batalha'; drawScreenFx é o último desenho (por cima).
    fadeScreen('#ffffff', 0.3, false);
  }
  // Constrói o inimigo PRINCIPAL a partir de um def-ish e o coloca na batalha. Reusa
  // defToBattler (imagem/chefão/golpes). Compartilhado por battle_start, battle_named e
  // o replay de cutscene.
  function startBattleFromDef(d) {
    if (rpg.recording) {
      rpg.sceneSteps.push({ type: 'battle', name: d.name, hp: d.hp, str: d.str, def: d.def, image: text(d.image, ''), color: text(d.color, ''), boss: !!d.boss });
      return;
    }
    startTeamBattle(defToBattler(d, 'inimigo'));
  }
  function rpgBattleStart(name, hp, str, def, image) {
    startBattleFromDef({ name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0), image: text(image, ''), color: '#e05a5a' });
  }
  // ⚔️ Ficha REUTILIZÁVEL: define o inimigo/chefão UMA vez, com imagem e atributos.
  function rpgDefineBattler(name, hp, str, def, image, color, boss) {
    var nm = text(name, 'Inimigo');
    ensureImageLoaded(image); // pré-carrega no setup (a tela de carregando espera)
    rpg.battlerDefs[nm] = {
      name: nm, hp: num(hp, 20), str: num(str, 5), def: num(def, 0),
      image: text(image, ''), color: text(color, boss ? '#b23b6e' : '#e05a5a'), boss: !!boss
    };
  }
  function rpgFindDef(name) {
    var d = rpg.battlerDefs[text(name, '')];
    if (!d) warnOnce('battlerdef:' + text(name, ''), 'a ficha do inimigo "' + text(name, '') + '" não existe — crie com "Criar a ficha do inimigo"');
    return d || null;
  }
  // Enfileira um inimigo A PARTIR DA FICHA (a "escolha" de quem entra na próxima batalha).
  function rpgAddFoeNamed(name) {
    var d = rpgFindDef(name); if (!d) return;
    pushRpgLimited(rpg.foeQueue, { name: d.name, hp: d.hp, str: d.str, def: d.def, image: d.image, color: d.color, boss: d.boss }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // Começa a batalha ESCOLHENDO uma ficha como inimigo principal (o que a criança pediu).
  function rpgBattleNamed(name) {
    var d = rpgFindDef(name); if (!d) return;
    startBattleFromDef(d);
  }
  // A vez de um aliado: abre o painel de ação (o menu do motor) para o jogador escolher.
  function startAllyTurn(actor) {
    var b = rpg.battle; if (!b) return;
    if (!actor) { startFoesTurn(); return; }
    b.actor = actor; b.inspect = actor; b.move = null; b.target = null;
    b.phase = 'escolha'; b.t = 0;
    openActionMenu(actor);
  }
  function openActionMenu(actor) {
    var opts = [];
    opts.push({ label: 'Atacar (força)', fn: function () { chooseMove(null); } });
    for (var i = 0; i < actor.moves.length; i++) {
      (function (mv) {
        var lbl = mv.name + (mv.heal ? ' (cura ' + mv.dmg : ' (dano ' + mv.dmg) + ', energia ' + mv.cost + ')';
        opts.push({ label: lbl, fn: function () { chooseMove(mv); } });
      })(actor.moves[i]);
    }
    opts.push({ label: 'Defender (dano pela metade)', fn: function () { actor.defending = true; resolveNoTarget(actor.name + ' se defendeu.'); } });
    if (rpg.potions.length > 0) opts.push({ label: 'Item (poção)', fn: function () { useItem(actor); } });
    opts.push({ label: 'Fugir', fn: function () { tryFlee(); } });
    rpg.menu = { title: 'Vez de ' + actor.name + '  —  vida ' + Math.max(0, actor.hp) + '/' + actor.max + '  energia ' + actor.energy, options: opts, index: 0 };
  }
  function chooseMove(mv) {
    var b = rpg.battle; if (!b || !b.actor) return;
    if (mv && b.actor.energy < mv.cost) { b.message = 'Sem energia para ' + mv.name + '!'; openActionMenu(b.actor); return; }
    b.move = mv;
    if (mv && mv.heal) { applyHeal(b.actor, mv); return; }
    var foes = aliveList(b.foes);
    if (foes.length === 1) { b.target = foes[0]; applyPlayerHit(); return; }
    // Vários inimigos: entra na MIRA (clicar/tecla escolhe o alvo).
    rpg.menu = null; b.phase = 'mira'; b.t = 0;
    b.message = b.actor.name + ': escolha o alvo (clique num inimigo ou aperte espaço).';
  }
  function applyPlayerHit() {
    var b = rpg.battle; if (!b) return;
    var a = b.actor, tgt = b.target, mv = b.move;
    if (!a || !tgt) return;
    if (mv) a.energy = Math.max(0, a.energy - mv.cost);
    var dmg = rollDamage(mv ? mv.dmg : a.str, tgt.def);
    if (a.blind > 0) { a.blind -= 1; if (gameRandom() < 0.33) dmg = 0; }
    tgt.hp -= dmg;
    if (dmg > 0) { floatText('-' + dmg, tgt.x + tgt.w / 2, tgt.y, '#ffd166', 26); b.message = a.name + (mv ? ' usou ' + mv.name + ' e causou ' : ' causou ') + dmg + ' em ' + tgt.name + '!'; }
    else b.message = a.name + ' se atrapalhou e errou!';
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; b.message += ' ' + tgt.name + ' caiu!'; }
    rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function applyHeal(a, mv) {
    var b = rpg.battle; if (!b) return;
    a.energy = Math.max(0, a.energy - mv.cost);
    a.hp = Math.min(a.max, a.hp + mv.dmg);
    floatText('+' + mv.dmg, a.x + a.w / 2, a.y, '#4ade80', 26);
    b.message = a.name + ' usou ' + mv.name + ' (+' + mv.dmg + ' de vida).';
    rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function resolveNoTarget(msg) {
    var b = rpg.battle; if (!b) return;
    b.message = msg; rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function useItem(a) {
    if (rpg.potions.length === 0) { openActionMenu(a); return; }
    var p = rpg.potions.shift();
    a.hp = Math.min(a.max, a.hp + p.heal);
    floatText('+' + p.heal, a.x + a.w / 2, a.y, '#4ade80', 26);
    resolveNoTarget(a.name + ' usou ' + p.name + ' (+' + p.heal + ' de vida).');
  }
  function tryFlee() {
    if (gameRandom() < 0.5) { rpg.menu = null; endBattle(false); return; }
    resolveNoTarget('Não deu para fugir!');
  }
  // Depois de um aliado agir (anima): próximo aliado, ou a vez dos inimigos.
  function afterAction() {
    var b = rpg.battle; if (!b) return;
    if (aliveList(b.foes).length === 0) { winBattle(); return; }
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    var next = nextAliveAfter(b.allies, b.actor);
    if (next) { startAllyTurn(next); return; }
    startFoesTurn();
  }
  function startFoesTurn() {
    var b = rpg.battle; if (!b) return;
    b.phase = 'foes'; b.t = 0; b.actor = null; b.target = null; b.foeIdx = 0; rpg.menu = null;
    b.message = 'Vez dos inimigos...';
  }
  // Um inimigo ATACA um aliado vivo ao acaso (com um golpe, ou pela força).
  function foeHit(f, mv) {
    var b = rpg.battle; if (!b) return;
    var allies = aliveList(b.allies);
    if (allies.length === 0) { loseBattle(); return; }
    var victim = allies[Math.floor(gameRandom() * allies.length)];
    var dmg = rollDamage(mv ? mv.dmg : f.str, victim.def);
    if (f.blind > 0) { f.blind -= 1; if (gameRandom() < 0.33) dmg = 0; }
    if (victim.defending) dmg = Math.max(dmg > 0 ? 1 : 0, Math.round(dmg / 2));
    victim.hp -= dmg;
    if (dmg > 0) floatText('-' + dmg, victim.x + victim.w / 2, victim.y, '#ff6b6b', 24);
    b.message = mv ? (f.name + ' usou ' + mv.name + ' e causou ' + dmg + ' em ' + victim.name + '!')
                   : (f.name + ' atacou ' + victim.name + ' (' + dmg + ').');
    if (victim.hp <= 0) { victim.hp = 0; victim.alive = false; b.message += ' ' + victim.name + ' caiu!'; }
  }
  function foeHeal(f, mv) {
    var b = rpg.battle; if (!b) return;
    f.hp = Math.min(f.max, f.hp + mv.dmg);
    floatText('+' + mv.dmg, f.x + f.w / 2, f.y, '#4ade80', 22);
    b.message = f.name + ' usou ' + mv.name + ' (+' + mv.dmg + ' de vida).';
  }
  function foeUseMove(f, mv) {
    var b = rpg.battle; if (!b) return false;
    if (f.energy < mv.cost) {
      b.message = f.name + ' está sem energia para ' + mv.name + '!';
      return false;
    }
    f.energy = Math.max(0, f.energy - mv.cost);
    if (mv.heal) foeHeal(f, mv); else foeHit(f, mv);
    return true;
  }
  // A vez de um inimigo por tique. ⭐ R30 fix: o inimigo USA os golpes ensinados
  // (antes ignorava f.moves e só batia pela força — golpe/cura/AoE de chefe eram
  // impossíveis). Modelo do pkmEnemyTurn. E o hook de IA de chefe manda, se houver.
  function foeStep() {
    var b = rpg.battle; if (!b) return;
    var foes = aliveList(b.foes);
    if (b.foeIdx >= foes.length) { endRound(); return; }
    var f = foes[b.foeIdx]; b.foeIdx += 1;
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    var hook = rpg.foeTurnHooks[f.name];
    if (hook) {
      try { hook(); } catch (e) { warn('erro na vez de ' + f.name + ': ' + e); }
    } else {
      var available = [];
      for (var i = 0; f.moves && i < f.moves.length; i++) if (f.moves[i].cost <= f.energy) available.push(f.moves[i]);
      var mv = available.length ? available[Math.floor(gameRandom() * available.length)] : null;
      if (mv) foeUseMove(f, mv); else foeHit(f, null);
    }
    b.t = 0;
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
  }
  function endRound() {
    var b = rpg.battle; if (!b) return;
    tickSide(b.allies);
    tickSide(b.foes);
    for (var i = 0; i < b.allies.length; i++) b.allies[i].defending = false;
    if (aliveList(b.foes).length === 0) { winBattle(); return; }
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    startAllyTurn(firstAlive(b.allies));
  }
  function tickSide(list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.alive) continue;
      if (c.poison > 0) { c.hp -= 3; c.poison -= 1; floatText('-3', c.x + c.w / 2, c.y, '#a855f7', 18); }
      if (c.regen > 0) { c.hp = Math.min(c.max, c.hp + 3); c.regen -= 1; }
      c.energy = Math.min(c.maxEnergy, c.energy + 2);
      if (c.hp <= 0) { c.hp = 0; c.alive = false; }
    }
  }
  function winBattle() { rpg.menu = null; endBattle(true); }
  function loseBattle() { rpg.menu = null; endBattle(false); }
  // O laço da batalha (roda FORA do gate de estado, como o do Kit Monstrinhos).
  function stepRpgBattle(dt) {
    var b = rpg.battle; if (!b || state !== 'batalha') return;
    playTime += dt;
    stepUiInput();      // teclado do painel de ação (setas + espaço)
    stepTweens(dt); stepParticles(dt); stepFloaties(dt);
    b.t += dt;
    if (b.phase === 'abrindo') {
      if (b.t < 0.4) return;
      b.message = 'Batalha! Seu time contra ' + foeNames(b) + '.';
      startAllyTurn(firstAlive(b.allies));
      return;
    }
    if (b.phase === 'escolha') {
      // Rede anti-softlock: sem menu aberto e ainda é a vez do aliado → reabre.
      if (!rpg.menu && b.actor) openActionMenu(b.actor);
      return;
    }
    if (b.phase === 'mira') {
      // Esc/voltar: desiste da mira e reabre o painel de ação (escolher outra coisa).
      if (justPressed.escape) { b.phase = 'escolha'; b.t = 0; openActionMenu(b.actor); return; }
      // Clique escolhe o alvo (rpgBattleClick); espaço mira o 1º inimigo vivo.
      if (justPressed[' ']) { var f = firstAlive(b.foes); if (f) { b.target = f; applyPlayerHit(); } }
      return;
    }
    if (b.phase === 'anima') { if (b.t < 0.55) return; afterAction(); return; }
    if (b.phase === 'foes') { if (b.t < 0.5) return; foeStep(); return; }
  }
  // Clique DENTRO da batalha: o painel de ação tem prioridade; senão, clicar num
  // combatente o INSPECIONA (painel de info) e, na mira, escolhe o alvo inimigo.
  function rpgBattleClick(x, y) {
    var b = rpg.battle; if (!b) return;
    if (rpg.menu) {
      for (var i = 0; i < rpg.menuRects.length; i++) {
        var r = rpg.menuRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { rpg.menu.index = r.index; selectMenu(); return; }
      }
    }
    var who = battlerAt(x, y);
    if (who) {
      b.inspect = who;
      if (b.phase === 'mira' && who.side === 'inimigo' && who.alive) { b.target = who; applyPlayerHit(); }
    }
  }
  function battlerAt(x, y) {
    var b = rpg.battle; if (!b) return null;
    var i;
    for (i = 0; i < b.foes.length; i++) { var f = b.foes[i]; if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return f; }
    for (i = 0; i < b.allies.length; i++) { var a = b.allies[i]; if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a; }
    return null;
  }
  // ---- Desenho da batalha em equipe (canvas) ----
  function drawRpgBattle() {
    var b = rpg.battle; if (!b || !ctx2d) return;
    ctx2d.fillStyle = '#242a44'; ctx2d.fillRect(0, 0, config.w, config.h);
    ctx2d.fillStyle = 'rgba(0,0,0,0.18)'; ctx2d.fillRect(0, config.h * 0.5, config.w, config.h * 0.5);
    drawBattlerRow(b.foes, b);
    drawBattlerRow(b.allies, b);
    drawBattleMessage(b);
    drawBattleInfo(b);
    drawEffects(); // faíscas + números de dano por cima da cena
  }
  function drawBattlerRow(list, b) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var prev = 1;
      if (!c.alive) { try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = 0.3; } catch (e) {} }
      drawEntity(c);
      if (!c.alive) { try { ctx2d.globalAlpha = prev; } catch (e) {} }
      // Destaque: amarelo = quem age; branco = clicado (info); vermelho = alvos na mira.
      var ring = null, lw = 2;
      if (c === b.actor && (b.phase === 'escolha' || b.phase === 'mira')) { ring = '#ffd166'; lw = 4; }
      else if (c === b.inspect) { ring = '#ffffff'; lw = 3; }
      else if (b.phase === 'mira' && c.side === 'inimigo' && c.alive) { ring = '#ff6b6b'; lw = 2; }
      if (c === b.target && b.phase === 'mira') { ring = '#ff3b3b'; lw = 4; }
      if (ring) {
        ctx2d.save();
        ctx2d.strokeStyle = ring; ctx2d.lineWidth = lw;
        ctx2d.strokeRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
        ctx2d.restore();
      }
      ctx2d.save();
      ctx2d.fillStyle = c.alive ? '#ffffff' : '#ff8080';
      // 👑 O chefão ganha nome maior (com coroa) e barra de vida mais grossa.
      ctx2d.font = (c.boss ? 'bold 17px ' : '13px ') + _szGameUIFont; ctx2d.textAlign = 'center';
      ctx2d.fillText((c.boss ? '👑 ' : '') + c.name, c.x + c.w / 2, c.y - 10);
      ctx2d.restore();
      var bh = c.boss ? 12 : 7;
      drawBar(Math.max(0, c.hp), c.max, c.x, c.y + c.h + 4, c.w, bh, c.hp > c.max * 0.3 ? '#4ade80' : '#ef4444');
    }
  }
  function drawBattleMessage(b) {
    if (!b.message) return;
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0,0,0,0.7)'; ctx2d.fillRect(0, 0, config.w, 34);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px ' + _szGameUIFont; ctx2d.textAlign = 'left';
    ctx2d.fillText(b.message, 14, 22);
    ctx2d.restore();
  }
  // Painel de INFORMAÇÕES do selecionado: dano, vida/energia e os atributos.
  function drawBattleInfo(b) {
    var c = b.inspect || b.actor; if (!c) return;
    var lines = [];
    lines.push('Vida: ' + Math.max(0, c.hp) + ' / ' + c.max);
    lines.push('Energia: ' + c.energy + ' / ' + c.maxEnergy);
    lines.push('Força: ' + c.str + '     Defesa: ' + c.def);
    if (c.moves && c.moves.length) {
      var mv = 'Golpes: ';
      for (var i = 0; i < c.moves.length; i++) mv += (i ? ', ' : '') + c.moves[i].name + ' (' + c.moves[i].dmg + ')';
      lines.push(mv);
    }
    var st = '';
    if (c.poison > 0) st += 'veneno ';
    if (c.regen > 0) st += 'regenera ';
    if (c.blind > 0) st += 'atrapalhado ';
    if (c.defending) st += 'defendendo ';
    if (st) lines.push('Estado: ' + st);
    var pad = 12, w = 280, x = config.w - w - 16, y = 44;
    var h = 30 + lines.length * 20 + pad;
    ctx2d.save();
    ctx2d.textAlign = 'left';
    ctx2d.fillStyle = 'rgba(0,0,0,0.8)'; ctx2d.fillRect(x, y, w, h);
    ctx2d.strokeStyle = c.side === 'inimigo' ? '#ff6b6b' : '#7dd3fc'; ctx2d.lineWidth = 2; ctx2d.strokeRect(x, y, w, h);
    ctx2d.fillStyle = '#ffd166'; ctx2d.font = 'bold 15px ' + _szGameUIFont;
    ctx2d.fillText(c.name + (c.side === 'inimigo' ? '  (inimigo)' : '  (do seu time)'), x + pad, y + 22);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '13px ' + _szGameUIFont;
    for (var j = 0; j < lines.length; j++) ctx2d.fillText(lines[j], x + pad, y + 44 + j * 20);
    ctx2d.restore();
  }
  /** Ganhar XP (após a batalha): sobe de nível, aumenta atributos e cura. */
  function rpgBattleReward(xp) {
    rpg.playerLevel = boundedInteger(rpg.playerLevel, 1, 1, MAX_GAME_LEVEL);
    rpg.playerMaxXp = boundedInteger(rpg.playerMaxXp, RPG_BASE_MAX_XP, RPG_BASE_MAX_XP, MAX_SAFE_GAME_INTEGER);
    var currentXp = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(rpg.playerXp, 0)));
    var earnedXp = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(xp, 0)));
    rpg.playerXp = Math.min(MAX_SAFE_GAME_INTEGER, currentXp + earnedXp);
    var subiu = false;
    while (rpg.playerLevel < MAX_GAME_LEVEL && rpg.playerXp >= rpg.playerMaxXp) {
      rpg.playerXp -= rpg.playerMaxXp;
      rpg.playerLevel += 1;
      rpg.playerMax = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerMax + 8);
      rpg.playerStr = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerStr + 2);
      rpg.playerDef = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerDef + 1);
      rpg.playerMaxXp = boundedInteger(rpg.playerMaxXp * 1.4, RPG_BASE_MAX_XP, RPG_BASE_MAX_XP, MAX_SAFE_GAME_INTEGER);
      subiu = true;
    }
    if (rpg.playerLevel >= MAX_GAME_LEVEL) rpg.playerXp = Math.min(rpg.playerXp, rpg.playerMaxXp - 1);
    if (subiu) {
      rpg.playerHp = rpg.playerMax; // curou ao subir de nível
      emit('subiu:nivel');
    }
  }
  /** Status de batalha (Pizza Legends): who = 'inimigo'/'heroi'; por N turnos.
   * veneno = −3/turno · regenera = +3/turno · atrapalha = 33% de errar o golpe.
   * No time: 'heroi' aplica no herói (1º aliado); 'inimigo' no 1º inimigo vivo. */
  function rpgInflict(who, status, turns) {
    var t = Math.max(1, Math.round(num(turns, 3)));
    var heroi = (text(who, 'inimigo') === 'heroi' || text(who, 'inimigo') === 'herói');
    var s = text(status, 'veneno');
    if (!rpg.battle) {
      warnOnce('inflict', '"Aplicar veneno/regenerar/atrapalhar" só funciona DENTRO de uma batalha (dá o status a quem está lutando)');
      return;
    }
    var target = heroi ? rpg.battle.allies[0] : firstAlive(rpg.battle.foes);
    if (!target) return;
    if (s === 'regenera') target.regen = t;
    else if (s === 'atrapalha') target.blind = t;
    else target.poison = t; // veneno (padrão; o parser barra status desconhecido na Ponte)
  }
  function endBattle(won) {
    rpg.battleWon = won === true;
    // A vida do herói PERSISTE. Se ele SOBREVIVEU (venceu OU fugiu vivo), carrega a
    // vida que sobrou p/ a próxima luta. Se MORREU (perdeu), volta cheio — derrota =
    // recomeço, sem soft-lock (não há cura automática no mundo; use "Curar o herói").
    if (rpg.battle) {
      var hero = null, al = rpg.battle.allies;
      for (var h = 0; h < al.length; h++) { if (al[h].isHero) { hero = al[h]; break; } }
      if (!hero && al.length) hero = al[0];
      if (hero) rpg.playerHp = hero.hp > 0 ? Math.max(0, Math.round(hero.hp)) : rpg.playerMax;
    }
    rpg.battle = null;
    setState('jogando'); // vindo de 'batalha' o mundo NÃO reseta (ver setState)
    fadeScreen('#000000', 0.25, false); // 🎬 SAÍDA: o mundo reaparece emergindo do escuro (como o pkm)
    for (var i = 0; i < rpg.onBattleEnd.length; i++) {
      try { rpg.onBattleEnd[i](); } catch (e) { warn('erro no "quando a batalha terminar": ' + e); }
    }
    emit('batalha:fim');
  }

`
