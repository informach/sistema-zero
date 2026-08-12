/** Runtime do Kit Monstrinhos, injetado dentro do escopo do motor principal. */
export const gameKitMonsterBattleRuntime = `
  // Uma única arena usa o estado global "batalha", o menu, o diálogo e o
  // canvas. Portanto a exclusão é uma política do DOMÍNIO, compartilhada pelos
  // dois kits, e precisa acontecer antes de criar oponente/time ou rodar corpos.
  function canStartBattle(nextKit) {
    var activeKit = rpg.battle ? 'Kit RPG' : (pkm.battle ? 'Kit Monstrinhos' : '');
    if (!activeKit) return true;
    warn('já tem uma batalha do ' + activeKit + ' aberta — os kits não podem rodar juntos; termine antes de começar a do ' + nextKit);
    return false;
  }

  // ============================================================================
  // 👾 KIT MONSTRINHOS — o atalho do gênero "pegue e treine bichinhos"
  // ============================================================================
  // ⭐ A TESE: um jogo destes É um jogo do Kit RPG com OUTRA batalha. O mundo já
  // existe (grade, NPC, fala, mapa, flags, salvar); o kit é só CRIATURAS +
  // ENCONTROS + a batalha criatura-vs-criatura.
  //
  // Três armadilhas do motor que definem esta arquitetura:
  //  1. A batalha do Kit RPG é DOM (makeScreen + 5 makeButton) — por isso o menu
  //     dela é fixo e nunca saiu dos dados. Aqui a UI é CANVAS: o motor escreve
  //     direto no rpg.menu e herda o desenho, as setas, o espaço e o clique.
  //  2. O stepSystems só roda em 'jogando' — e é ELE que faz playTime += dt,
  //     stepUiInput, stepTweens e stepParticles. Uma batalha em canvas precisa dos
  //     quatro, senão a fala fica com 0 letras PARA SEMPRE. Por isso existe o
  //     stepPkmBattle, chamado do gameLoop FORA do gate de estado.
  //  3. O estado 'batalha' pausa o onUpdate do mundo, mas setState preserva toda
  //     a partida ao entrar e sair. Só restartGame chama a limpeza completa.
  // O efeito do acerto nasce pronto: é do MOTOR da batalha, não uma escolha da
  // criança (ela nunca declarou "faíscas de batalha").
  var pkmFxReady = false;
  function pkmEnsureFx() {
    if (pkmFxReady) return;
    pkmFxReady = true;
    defineEffect('__pkm_hit', { count: 10, color: '#ffffff', size: 4, life: 0.3, speed: 160, gravity: 0 });
  }
  var pkm = {
    species: Object.create(null),   // nome -> DADOS da espécie (nível 1)
    moves: Object.create(null),     // nome -> {creature, type, dmg, acc, fx, color}
    types: Object.create(null),     // 'fogo|planta' -> multiplicador
    evolve: Object.create(null),    // espécie -> {to, level}
    catchDiff: Object.create(null), // espécie -> multiplicador de captura
    team: [],                       // MEUS indivíduos {species, level, hp, hpMax, xp}
    balls: [],                      // [{power}]
    wild: [],                       // [{species, min, max}] — a tabela do mapa
    grassAreas: [],                 // retângulos {x1,y1,x2,y2}; custo independe da área
    grassTiles: Object.create(null),// índice de peça -> true
    grassTileCount: 0,
    grassMap: '',
    rate: 20,                       // % por PASSO
    battle: null,
    caught: false
  };
  var PKM_XP_PER_LEVEL = 30;

  function pkmKeyType(t) { return text(t, 'normal').trim().toLowerCase(); }

  function pkmCreature(name, type, hp, str, def, spd, image, look) {
    var k = text(name, '');
    if (!k) { warn('"Criatura" precisa de um nome'); return; }
    ensureImageLoaded(image); // a imagem da criatura (Pinta) carrega sozinha
    pkm.species[k] = {
      name: k, type: pkmKeyType(type),
      hp: Math.max(1, num(hp, 30)), str: Math.max(1, num(str, 8)),
      def: Math.max(0, num(def, 4)), spd: Math.max(1, num(spd, 5)),
      image: text(image, ''), look: text(look, ''), moves: []
    };
  }
  function pkmMove(move, creature, type, dmg, acc, fx, color) {
    var mk = text(move, '');
    var ck = text(creature, '');
    if (!mk) { warn('"Ensinar o golpe" precisa de um nome'); return; }
    var sp = pkm.species[ck];
    if (!sp) { warnOnce('pkmsp:' + ck, 'a criatura "' + ck + '" não existe — crie com "Criatura"'); return; }
    pkm.moves[mk] = {
      name: mk, type: pkmKeyType(type), dmg: Math.max(0, num(dmg, 20)),
      acc: Math.max(1, Math.min(100, num(acc, 100))), fx: text(fx, 'investida'),
      color: text(color, '#ffffff')
    };
    if (sp.moves.indexOf(mk) === -1 && sp.moves.length < 4) sp.moves.push(mk);
  }
  /** ⭐ A tabela é de TEXTO LIVRE e vazia: quem escreve "fogo vence planta" é a
   * criança. Uma tabela pronta seria a caixa-preta que a regra rejeita (o jogo
   * teria uma opinião que não é dela), e um dropdown fogo/água/planta proibiria
   * gelo, doce, dinossauro — o oposto de "faça o SEU bichinho". */
  function pkmTypeChart(atk, def, mult) {
    pkm.types[pkmKeyType(atk) + '|' + pkmKeyType(def)] = Math.max(0, num(mult, 2));
  }
  function pkmAdvantage(atkType, defType) {
    var v = pkm.types[pkmKeyType(atkType) + '|' + pkmKeyType(defType)];
    return typeof v === 'number' ? v : 1;
  }
  function pkmEvolve(from, to, level) {
    var f = text(from, '');
    if (!pkm.species[f]) { warnOnce('pkmev:' + f, 'a criatura "' + f + '" não existe'); return; }
    pkm.evolve[f] = { to: text(to, ''), level: Math.max(2, Math.round(num(level, 8))) };
  }
  function pkmCatchDifficulty(name, level) {
    var k = text(name, '');
    // Os irmãos (pkmWild/pkmMove/pkmEvolve) avisam; este falhava calado.
    if (!pkm.species[k]) { warnOnce('pkmcatch:' + k, 'a criatura "' + k + '" não existe'); return; }
    var mult = { 'fácil': 1.6, facil: 1.6, normal: 1, 'difícil': 0.5, dificil: 0.5, 'raríssimo': 0.15, rarissimo: 0.15 };
    var lv = text(level, 'normal');
    var m = mult[lv];
    if (typeof m !== 'number') warnOnce('pkmcatchlv:' + lv, 'dificuldade "' + lv + '" não existe (use fácil, normal, difícil ou raríssimo)');
    pkm.catchDiff[k] = typeof m === 'number' ? m : 1;
  }

  // ---- os 3 níveis: espécie (dados) → indivíduo (o time) → lutador (efêmero) ----
  /** ⚠️ CÓPIA, nunca referência: é exatamente o bug da base (o gsap mutava o
   * objeto de dados e os monstros desciam 20px a CADA batalha). */
  function pkmSpawn(speciesName, level) {
    var sp = pkm.species[text(speciesName, '')];
    if (!sp) return null;
    var lv = boundedInteger(level, 5, 1, MAX_GAME_LEVEL);
    var hpMax = Math.round(sp.hp + (lv - 1) * 8);
    return { species: sp.name, level: lv, hp: hpMax, hpMax: hpMax, xp: 0 };
  }
  function pkmStat(ind, which) {
    var sp = pkm.species[ind.species];
    if (!sp) return 1;
    var lv = ind.level - 1;
    if (which === 'str') return Math.round(sp.str + lv * 2);
    if (which === 'def') return Math.round(sp.def + lv * 1);
    return sp.spd;
  }
  /** Um objeto no formato do createCharacter: aí o drawEntity o desenha de graça
   * (look/imagem/folha/piscar/giro) e o tweenTo o anima. */
  function pkmFighter(ind, x, y, w, h) {
    var sp = pkm.species[ind.species] || {};
    var f = createCharacter({ image: sp.image || '', w: w, h: h, speed: 0, color: '#e94f4f' });
    f.look = sp.look || '';
    placeCharacterAt(f, x, y);
    return f;
  }
  function placeCharacterAt(c, x, y) {
    c.x = num(x, 0); c.y = num(y, 0); c._prevX = c.x; c._prevY = c.y;
  }

  // ---- 🎒 Meu time ----
  function pkmGive(speciesName, level) {
    var ind = pkmSpawn(speciesName, level);
    if (!ind) { warnOnce('pkmgive:' + text(speciesName, ''), 'a criatura "' + text(speciesName, '') + '" não existe'); return; }
    if (pkm.team.length >= MAX_PKM_TEAM) { rpgSay('Seu time está cheio!', ''); return; }
    pkm.team.push(ind);
    emit('monstrinho:ganhou', ind);
  }
  function pkmGiveBall(count, power) {
    var n = Math.max(1, Math.round(num(count, 5)));
    var p = Math.max(1, Math.min(100, num(power, 60)));
    var room = Math.max(0, MAX_CAPTURE_BALLS - pkm.balls.length);
    var total = Math.min(n, room);
    if (total < n) warnOnce('pkmball:limit', 'a mochila comporta até ' + MAX_CAPTURE_BALLS + ' bolas de captura');
    for (var i = 0; i < total; i++) pkm.balls.push({ power: p });
  }
  function pkmRestoreTeam(raw) {
    var restored = [];
    if (!Array.isArray(raw)) return restored;
    for (var i = 0; i < raw.length && restored.length < MAX_PKM_TEAM; i++) {
      var saved = raw[i];
      if (!saved || typeof saved !== 'object' || typeof saved.species !== 'string' || !pkm.species[saved.species]) continue;
      var level = boundedInteger(saved.level, 1, 1, MAX_GAME_LEVEL);
      var individual = pkmSpawn(saved.species, level);
      if (!individual) continue;
      individual.hpMax = Math.max(1, Math.min(MAX_SAFE_GAME_INTEGER, Math.round(num(saved.hpMax, individual.hpMax))));
      individual.hp = Math.max(0, Math.min(individual.hpMax, num(saved.hp, individual.hpMax)));
      individual.xp = Math.max(0, Math.min(PKM_XP_PER_LEVEL * individual.level - 1, num(saved.xp, 0)));
      restored.push(individual);
    }
    return restored;
  }
  function pkmRestoreBalls(raw) {
    var restored = [];
    if (!Array.isArray(raw)) return restored;
    for (var i = 0; i < raw.length && restored.length < MAX_CAPTURE_BALLS; i++) {
      var saved = raw[i];
      if (!saved || typeof saved !== 'object') continue;
      restored.push({ power: Math.max(1, Math.min(100, num(saved.power, 60))) });
    }
    return restored;
  }
  function pkmHealTeam() {
    for (var i = 0; i < pkm.team.length; i++) pkm.team[i].hp = pkm.team[i].hpMax;
  }
  function pkmHas(name) {
    var k = text(name, '');
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].species === k) return true;
    return false;
  }
  function pkmTeamSize() { return pkm.team.length; }
  function pkmBallCount() { return pkm.balls.length; }
  function pkmLevelOf(name) {
    var k = text(name, '');
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].species === k) return pkm.team[i].level;
    return 0;
  }
  function pkmFirstAlive() {
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].hp > 0) return pkm.team[i];
    return null;
  }
  function pkmDrawTeam(x, y) {
    if (!ctx2d) return;
    ctxSave();
    var bx = num(x, 10), by = num(y, 10);
    for (var i = 0; i < pkm.team.length; i++) {
      var t = pkm.team[i];
      var yy = by + i * 26;
      ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
      ctx2d.fillRect(bx, yy, 168, 22);
      ctx2d.fillStyle = t.hp > 0 ? '#ffffff' : '#ff8080';
      ctx2d.font = '13px ' + _szGameUIFont;
      ctx2d.fillText(t.species + ' Nv' + t.level, bx + 6, yy + 15);
      var pct = Math.max(0, Math.min(1, t.hp / Math.max(1, t.hpMax)));
      ctx2d.fillStyle = '#333';
      ctx2d.fillRect(bx + 112, yy + 8, 50, 6);
      ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
      ctx2d.fillRect(bx + 112, yy + 8, Math.round(50 * pct), 6);
    }
    ctxRestore();
  }

  // ---- 🌿 Encontros (a grama alta) ----
  function pkmGrassCells(x1, y1, x2, y2) {
    var ax = Math.round(num(x1, 0)), ay = Math.round(num(y1, 0));
    var bx = Math.round(num(x2, 0)), by = Math.round(num(y2, 0));
    var left = Math.min(ax, bx), top = Math.min(ay, by);
    var right = Math.max(ax, bx), bottom = Math.max(ay, by);
    // Dentro de um mapa, coordenadas fora dele não podem ser pisadas. Cortar o
    // retângulo aqui preserva a intenção e impede números acidentais gigantes.
    if (rpg.mapCols > 0 && rpg.mapRows > 0) {
      left = Math.max(0, left); top = Math.max(0, top);
      right = Math.min(rpg.mapCols - 1, right); bottom = Math.min(rpg.mapRows - 1, bottom);
      if (left > right || top > bottom) return;
    }
    if (pkm.grassAreas.length >= MAX_PKM_GRASS_AREAS) {
      warnOnce('pkmgrass:limit', 'use até ' + MAX_PKM_GRASS_AREAS + ' áreas de grama por mapa');
      return;
    }
    pkm.grassAreas.push({ x1: left, y1: top, x2: right, y2: bottom });
  }
  function pkmInGrassArea(cx, cy) {
    for (var i = 0; i < pkm.grassAreas.length; i++) {
      var area = pkm.grassAreas[i];
      if (cx >= area.x1 && cx <= area.x2 && cy >= area.y1 && cy <= area.y2) return true;
    }
    return false;
  }
  function pkmGrassTiles(index, mapName) {
    var tile = boundedInteger(index, 0, 0, MAX_SAFE_GAME_INTEGER);
    if (!pkm.grassTiles[tile]) {
      if (pkm.grassTileCount >= MAX_PKM_GRASS_TILES) {
        warnOnce('pkmgrasstile:limit', 'use até ' + MAX_PKM_GRASS_TILES + ' peças de grama por mapa');
        return;
      }
      pkm.grassTiles[tile] = true;
      pkm.grassTileCount += 1;
    }
    pkm.grassMap = text(mapName, '');
  }
  function pkmWild(speciesName, min, max) {
    var k = text(speciesName, '');
    if (!pkm.species[k]) { warnOnce('pkmwild:' + k, 'a criatura "' + k + '" não existe'); return; }
    var a = boundedInteger(min, 3, 1, MAX_GAME_LEVEL);
    var b = boundedInteger(max, 6, 1, MAX_GAME_LEVEL);
    var lower = Math.min(a, b);
    var upper = Math.max(a, b);
    for (var i = 0; i < pkm.wild.length; i++) {
      if (pkm.wild[i].species === k) {
        pkm.wild[i].min = lower;
        pkm.wild[i].max = upper;
        return;
      }
    }
    if (pkm.wild.length >= MAX_PKM_WILD_ENTRIES) {
      warnOnce('pkmwild:limit', 'use até ' + MAX_PKM_WILD_ENTRIES + ' criaturas selvagens por mapa');
      return;
    }
    pkm.wild.push({ species: k, min: lower, max: upper });
  }
  function pkmEncounterRate(pct) { pkm.rate = Math.max(0, Math.min(100, num(pct, 20))); }
  /** ⭐ O sorteio é por PASSO, não por quadro. O herói do kit anda com o
   * rpgMoveGrid (ENCAIXA na célula), então "metade do corpo dentro" não existe —
   * e "20% por passo" é legível para criança de um jeito que "1% por quadro"
   * (= 45% por segundo a 60fps) nunca seria. É como o gênero funciona de verdade. */
  function pkmOnStepCell(cx, cy) {
    if (!pkm.wild.length || pkm.battle) return;
    var inGrass = pkmInGrassArea(cx, cy);
    if (!inGrass && pkm.grassMap) {
      var t = tileAt(pkm.grassMap, cx * tilePx + tilePx / 2, cy * tilePx + tilePx / 2);
      if (pkm.grassTiles[t]) inGrass = true;
    }
    if (!inGrass) return;
    if (!chance(pkm.rate)) return;
    var pick = pkm.wild[Math.floor(gameRandom() * pkm.wild.length)];
    var lv = pick.min + Math.floor(gameRandom() * (Math.max(pick.min, pick.max) - pick.min + 1));
    pkmBattleWild(pick.species, lv);
  }

  // ---- ⚔️ A batalha (criatura × criatura) ----
  function pkmPrepareBattle() {
    pkm.caught = false;
    rpg.battleWon = false;
    pkmEnsureFx();
  }
  function pkmBattleWild(speciesName, level) {
    if (!canStartBattle('Kit Monstrinhos')) return;
    var foe = pkmSpawn(speciesName, level);
    if (!foe) { warnOnce('pkmbw:' + text(speciesName, ''), 'a criatura "' + text(speciesName, '') + '" não existe'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkmPrepareBattle();
    pkm.battle = { mine: mine, foe: foe, kind: 'selvagem', phase: 'abrindo', t: 0, mineF: null, foeF: null };
    flashScreen('#ffffff', 2);
    setState('batalha');
    emit('monstrinho:apareceu', foe);
  }
  function pkmBattleTrainer(name, fn) {
    if (typeof fn !== 'function') return;
    if (!canStartBattle('Kit Monstrinhos')) return;
    var team = [];
    var previousList = pkmTrainerList;
    pkmTrainerList = team;
    try { fn(); } catch (e) { warn('erro no time do treinador: ' + e); }
    finally { pkmTrainerList = previousList; }
    if (!team.length) { warn('o treinador "' + text(name, '') + '" não tem nenhuma criatura'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkmPrepareBattle();
    pkm.battle = {
      mine: mine, foe: team[0], kind: 'treinador', trainer: text(name, ''),
      foes: team.slice(), foeIndex: 0, phase: 'abrindo', t: 0, mineF: null, foeF: null
    };
    flashScreen('#ffffff', 2);
    setState('batalha');
  }
  // null fora do callback-construtor: impede que um bloco-filho solto acumule
  // criaturas invisíveis para uma batalha futura.
  var pkmTrainerList = null;
  function pkmTrainerCreature(speciesName, level) {
    if (!pkmTrainerList) {
      warnOnce('pkmtrainerchild', '"Criatura do treinador" só pode ser usado dentro de "Batalha contra treinador"');
      return;
    }
    if (pkmTrainerList.length >= MAX_PKM_TEAM) {
      warnOnce('pkmtrainerfull', 'o time do treinador pode ter no máximo ' + MAX_PKM_TEAM + ' criaturas');
      return;
    }
    var ind = pkmSpawn(speciesName, level);
    if (ind) pkmTrainerList.push(ind);
  }

  function pkmSetupFighters() {
    var b = pkm.battle;
    b.mineF = pkmFighter(b.mine, 140, config.h - 240, 140, 140);
    b.foeF = pkmFighter(b.foe, config.w - 300, 90, 120, 120);
  }
  function pkmMainMenu() {
    var b = pkm.battle;
    if (!b) return;
    var opts = [{ label: 'Lutar', fn: pkmMoveMenu }];
    if (b.kind === 'selvagem' && pkm.balls.length > 0) {
      opts.push({ label: 'Bola (' + pkm.balls.length + ')', fn: pkmThrowBall });
    }
    var alive = 0;
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].hp > 0) alive += 1;
    if (alive > 1) opts.push({ label: 'Trocar', fn: pkmSwitchMenu });
    if (b.kind === 'selvagem') opts.push({ label: 'Fugir', fn: pkmFlee });
    rpg.menu = { title: b.mine.species + '  ' + b.mine.hp + '/' + b.mine.hpMax, options: opts, index: 0 };
  }
  /** ⭐ O menu sai dos GOLPES da criatura ativa — a melhor ideia da base. */
  function pkmMoveMenu() {
    var b = pkm.battle;
    if (!b) return;
    var sp = pkm.species[b.mine.species];
    var opts = [];
    for (var i = 0; i < sp.moves.length; i++) {
      (function (mv) {
        var m = pkm.moves[mv];
        if (!m) return;
        opts.push({ label: m.name + '  (' + m.type + ')', fn: function () { pkmUseMove(m, true); } });
      })(sp.moves[i]);
    }
    opts.push({ label: '← Voltar', fn: pkmMainMenu });
    rpg.menu = { title: 'Qual golpe?', options: opts, index: 0 };
  }
  /** forced = a criatura desmaiou: NÃO pode voltar (lutar com HP 0 não existe). */
  function pkmSwitchMenu(forced) {
    var opts = [];
    for (var i = 0; i < pkm.team.length; i++) {
      (function (t) {
        if (t.hp <= 0 || t === pkm.battle.mine) return;
        opts.push({
          label: t.species + ' Nv' + t.level + ' (' + t.hp + '/' + t.hpMax + ')',
          fn: function () { pkmDoSwitch(t); }
        });
      })(pkm.team[i]);
    }
    if (!forced) opts.push({ label: '← Voltar', fn: pkmMainMenu });
    rpg.menu = {
      title: forced ? 'Quem vai lutar agora?' : 'Trocar por quem?',
      options: opts,
      index: 0
    };
  }
  function pkmDoSwitch(t) {
    var b = pkm.battle;
    b.mine = t;
    b.mineF = pkmFighter(t, 140, config.h - 240, 140, 140);
    rpgSay('Vai, ' + t.species + '!', '');
    b.phase = 'inimigo';
    b.t = 0;
  }
  function pkmFlee() {
    if (chance(50)) { rpgSay('Escapou!', ''); pkm.battle.phase = 'fim'; pkm.battle.t = 0; }
    else { rpgSay('Não deu para fugir!', ''); pkm.battle.phase = 'inimigo'; pkm.battle.t = 0; }
  }
  /** dano = (dano do golpe + força/2) × vantagem × (0.85..1.15) − defesa/2, mín 1.
   * ⭐ Na base o tipo do golpe NUNCA entrava na conta (era só a cor do texto). Fazer o
   * tipo IMPORTAR é a lição do gênero e a maior oportunidade do porte. */
  function pkmUseMove(m, isMine) {
    var b = pkm.battle;
    var atk = isMine ? b.mine : b.foe;
    var dfd = isMine ? b.foe : b.mine;
    var atkF = isMine ? b.mineF : b.foeF;
    var dfdF = isMine ? b.foeF : b.mineF;
    b.phase = 'anim';
    b.t = 0;
    b.pending = null;
    if (!chance(m.acc)) {
      rpgSay(atk.species + ' usou ' + m.name + '... mas errou!', '');
      b.next = isMine ? 'inimigo' : 'menu';
      return;
    }
    var mult = pkmAdvantage(m.type, pkm.species[dfd.species].type);
    var base = m.dmg + pkmStat(atk, 'str') / 2;
    var vary = 0.85 + gameRandom() * 0.3;
    // ⭐ "Não teve efeito!" tem que tirar ZERO. O piso de 1 vale para o golpe fraco
    // (senão a defesa alta trava a batalha para sempre), mas quando a vantagem é 0 a
    // fala promete imunidade — e tirar 1 mesmo assim é mentir para a criança.
    var dmg = mult === 0 ? 0 : Math.max(1, Math.round(base * mult * vary - pkmStat(dfd, 'def') / 2));
    var txt = atk.species + ' usou ' + m.name + '!';
    if (mult > 1) txt += ' É SUPER EFETIVO!';
    else if (mult === 0) txt += ' Não teve efeito!';
    else if (mult < 1) txt += ' Não foi muito eficaz...';
    rpgSay(txt, '');
    b.pending = { dmg: dmg, target: dfd, targetF: dfdF, isMine: isMine };
    // A coreografia: investida = o lutador corre e volta; os outros = piscar.
    if (m.fx === 'investida' && atkF && dfdF) {
      var ox = atkF.x;
      tweenToQuiet(atkF, dfdF.x + (isMine ? -60 : 60), atkF.y, 0.18);
      b.returnTo = { f: atkF, x: ox, y: atkF.y };
    }
    burst('__pkm_hit', dfdF ? centerX(dfdF) : 0, dfdF ? centerY(dfdF) : 0);
    b.next = isMine ? 'inimigo' : 'menu';
  }
  function pkmApplyPending() {
    var b = pkm.battle;
    if (!b.pending) return;
    var p = b.pending;
    p.target.hp = Math.max(0, p.target.hp - p.dmg); // ⚠️ nunca negativo (bug da base)
    if (p.targetF) {
      cameraShake(4, 0.15);
      // ⭐ O piscar do acerto reusa os i-frames, que o drawEntity JÁ desenha.
      // Antes eram dois fadeTo em sequência (40% e volta a 100%) — mas o pushTween
      // DEDUPA por (entidade, propriedade): o 2º apagava o 1º ANTES de ele rodar e
      // lia "de: opacity = 1", então o tween ia de 1 para 1 e nada piscava. Sobrava
      // só o tremor. (O pushTween é substitutivo por design; quem quer sequência
      // não pode empilhar na mesma propriedade.)
      p.targetF._iFrames = 0.3;
    }
    b.pending = null;
    if (b.returnTo) { tweenToQuiet(b.returnTo.f, b.returnTo.x, b.returnTo.y, 0.15); b.returnTo = null; }
  }
  function pkmThrowBall() {
    var b = pkm.battle;
    if (!pkm.balls.length) return;
    var ball = pkm.balls.pop();
    /** ⚠️ O óbvio (1 − vida/máx) daria 0% com a vida cheia: pegar seria
     * IMPOSSÍVEL, não difícil — a criança joga a bola, nunca funciona e conclui
     * que o bloco está quebrado. Este fator vale 1/3 com a vida cheia e ~1 com 1
     * de vida: "sempre possível, 3× mais difícil". A lição é ENFRAQUECER antes. */
    var diff = pkm.catchDiff[b.foe.species];
    if (typeof diff !== 'number') diff = 1;
    var pct = ball.power * ((3 * b.foe.hpMax - 2 * b.foe.hp) / (3 * b.foe.hpMax)) * diff;
    b.phase = 'anim';
    b.t = 0;
    if (chance(pct)) {
      if (pkm.team.length >= MAX_PKM_TEAM) { rpgSay('Seu time está cheio!', ''); pkm.balls.push(ball); b.next = 'menu'; return; }
      pkm.team.push(b.foe);
      pkm.caught = true;
      rpgSay(b.foe.species + ' foi capturado!', '');
      emit('monstrinho:pegou', b.foe);
      b.next = 'fim';
    } else {
      var shakes = Math.floor(Math.max(0, Math.min(1, pct / 100)) * 3);
      rpgSay(shakes >= 2 ? 'Ah! Quase!' : shakes === 1 ? 'Ele escapou!' : 'Nem chegou perto...', '');
      b.next = 'inimigo';
    }
  }
  function pkmEnemyTurn() {
    var b = pkm.battle;
    var sp = pkm.species[b.foe.species];
    var mv = sp.moves.length ? pkm.moves[sp.moves[Math.floor(gameRandom() * sp.moves.length)]] : null;
    // Espécie sem golpe ensinado (o esquecimento nº 1 previsível). 'menu' é fase de
    // REPOUSO: pôr a fase sem ABRIR o menu congelava a batalha para sempre.
    if (!mv) {
      warnOnce('pkm-sem-golpe-' + b.foe.species, 'o ' + b.foe.species + ' não tem nenhum golpe: use "Ensinar o golpe"');
      pkmEnterPhase('menu');
      return;
    }
    pkmUseMove(mv, false);
  }
  function pkmCheckFaint() {
    var b = pkm.battle;
    if (b.foe.hp <= 0) {
      rpgSay(b.foe.species + ' desmaiou!', '');
      if (b.foeF) { tweenToQuiet(b.foeF, b.foeF.x, b.foeF.y + 20, 0.4); fadeToQuiet(b.foeF, 0, 0.4); }
      pkmReward();
      if (b.kind === 'treinador' && b.foeIndex + 1 < b.foes.length) {
        b.foeIndex += 1;
        b.foe = b.foes[b.foeIndex];
        b.foeF = pkmFighter(b.foe, config.w - 300, 90, 120, 120);
        b.phase = 'anim';
        b.next = 'menu';
        rpgSay(b.trainer + ' mandou ' + b.foe.species + '!', '');
        return true;
      }
      b.phase = 'anim';
      b.next = 'fim';
      rpg.battleWon = true;
      return true;
    }
    if (b.mine.hp <= 0) {
      rpgSay(b.mine.species + ' desmaiou!', '');
      if (b.mineF) { tweenToQuiet(b.mineF, b.mineF.x, b.mineF.y + 20, 0.4); fadeToQuiet(b.mineF, 0, 0.4); }
      var next = pkmFirstAlive();
      if (next) { b.phase = 'anim'; b.next = 'trocar-forcado'; return true; }
      b.phase = 'anim';
      b.next = 'fim';
      rpg.battleWon = false;
      return true;
    }
    return false;
  }
  function pkmReward() {
    var b = pkm.battle;
    var xp = PKM_XP_PER_LEVEL * b.foe.level / 2;
    b.mine.level = boundedInteger(b.mine.level, 1, 1, MAX_GAME_LEVEL);
    b.mine.xp = Math.min(MAX_SAFE_GAME_INTEGER, Math.max(0, num(b.mine.xp, 0)) + Math.round(xp));
    rpgSay(b.mine.species + ' ganhou ' + Math.round(xp) + ' de experiência!', '');
    while (b.mine.level < MAX_GAME_LEVEL && b.mine.xp >= PKM_XP_PER_LEVEL * b.mine.level) {
      b.mine.xp -= PKM_XP_PER_LEVEL * b.mine.level;
      b.mine.level += 1;
      b.mine.hpMax += 8;
      b.mine.hp = b.mine.hpMax;
      rpgSay(b.mine.species + ' subiu para o nível ' + b.mine.level + '!', '');
      emit('monstrinho:subiu', b.mine);
      var ev = pkm.evolve[b.mine.species];
      if (ev && b.mine.level >= ev.level && pkm.species[ev.to]) {
        rpgSay(b.mine.species + ' está evoluindo!', '');
        b.mine.species = ev.to; // mantém nível/XP: o indivíduo é o MESMO
        b.mine.hpMax += 6;
        b.mine.hp = b.mine.hpMax;
        b.mineF = pkmFighter(b.mine, 140, config.h - 240, 140, 140);
        rpgSay('Virou ' + ev.to + '!', '');
        emit('monstrinho:evoluiu', b.mine);
      }
    }
    if (b.mine.level >= MAX_GAME_LEVEL) {
      b.mine.xp = Math.min(b.mine.xp, PKM_XP_PER_LEVEL * b.mine.level - 1);
    }
  }
  function pkmEndBattle() {
    pkm.battle = null;
    rpg.menu = null;
    fadeScreen('#000000', 0.25, false);
    setState('jogando'); // ⚠️ 'batalha' → 'jogando' NÃO recomeça (o setState poupa)
    var hooks = rpg.onBattleEnd;
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) { warn('erro no "quando a batalha terminar": ' + e); }
    }
  }
  /** ⭐ Roda FORA do gate de estado (o stepSystems só anda em 'jogando'), e bombeia
   * o relógio + a UI + os tweens + as faíscas — senão a fala fica com 0 letras. */
  function stepPkmBattle(dt) {
    var b = pkm.battle;
    if (!b || state !== 'batalha') return;
    playTime += dt;
    stepUiInput();
    stepTweens(dt);
    stepParticles(dt);
    b.t += dt;
    // Os lutadores da batalha não passam pelo stepSystems (que é quem decai os
    // i-frames de todo mundo), então o piscar do acerto decai aqui — senão ficaria
    // piscando para sempre.
    if (b.mineF && b.mineF._iFrames > 0) b.mineF._iFrames = Math.max(0, b.mineF._iFrames - dt);
    if (b.foeF && b.foeF._iFrames > 0) b.foeF._iFrames = Math.max(0, b.foeF._iFrames - dt);
    if (b.phase === 'abrindo') {
      if (b.t < 0.5) return;
      pkmSetupFighters();
      rpgSay(b.kind === 'treinador' ? b.trainer + ' quer batalhar!' : 'Um ' + b.foe.species + ' selvagem apareceu!', '');
      b.phase = 'espera-fala';
      b.next = 'menu';
      b.t = 0;
      return;
    }
    if (b.phase === 'espera-fala') {
      if (rpg.dialog) return; // a criança lê no ritmo dela
      pkmEnterPhase(b.next);
      return;
    }
    if (b.phase === 'anim') {
      if (b.t > 0.25 && b.pending) pkmApplyPending();
      if (rpg.dialog || b.t < 0.5) return;
      if (pkmCheckFaint()) { b.phase = 'espera-fala'; return; }
      pkmEnterPhase(b.next);
      return;
    }
    if (b.phase === 'inimigo') { pkmEnemyTurn(); return; }
    if (b.phase === 'fim') { pkmEndBattle(); return; }
    // Rede: 'menu' e 'trocar-forcado' são fases de REPOUSO dirigidas pelo menu — se
    // ficarem sem menu aberto, ninguém as move e a batalha congela (só recarregando).
    // Era exatamente o softlock do desmaio. Reabrir é sempre melhor que travar.
    if (!rpg.menu && !rpg.dialog) {
      if (b.phase === 'menu') pkmMainMenu();
      else if (b.phase === 'trocar-forcado') pkmSwitchMenu(true);
    }
  }
  /**
   * Entrar numa fase = despachar o que ela precisa para andar.
   * ⭐ Isto estava DUPLICADO em 'espera-fala' (que só sabia despachar 'menu') e em
   * 'anim' (que sabia as quatro), e as duas cópias divergiram: o desmaio passa por
   * 'espera-fala', então a fase virava 'trocar-forcado' e NINGUÉM abria o menu de
   * troca — a criança perdia a criatura e o jogo morria. Um dispatcher só, um
   * comportamento só.
   */
  function pkmEnterPhase(ph) {
    var b = pkm.battle;
    b.phase = ph || 'menu';
    b.t = 0;
    if (b.phase === 'menu') pkmMainMenu();
    else if (b.phase === 'inimigo') pkmEnemyTurn();
    else if (b.phase === 'fim') pkmEndBattle();
    else if (b.phase === 'trocar-forcado') pkmSwitchMenu(true);
  }
  function drawPkmBattle() {
    var b = pkm.battle;
    if (!b || !ctx2d) return;
    ctx2d.fillStyle = '#5b8c5a';
    ctx2d.fillRect(0, 0, config.w, config.h);
    ctx2d.fillStyle = 'rgba(0,0,0,0.15)';
    ctx2d.fillRect(0, config.h * 0.55, config.w, config.h * 0.45);
    if (b.foeF) drawEntity(b.foeF);
    if (b.mineF) drawEntity(b.mineF);
    pkmBar(b.foe, 50, 40);
    pkmBar(b.mine, config.w - 290, config.h - 190);
    drawEffects();
  }
  function pkmBar(ind, x, y) {
    ctxSave();
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(x, y, 240, 54);
    ctx2d.strokeStyle = '#111';
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(x, y, 240, 54);
    ctx2d.fillStyle = '#111';
    ctx2d.font = '15px ' + _szGameUIFont;
    ctx2d.fillText(ind.species + '  Nv' + ind.level, x + 10, y + 22);
    var pct = Math.max(0, Math.min(1, ind.hp / Math.max(1, ind.hpMax)));
    ctx2d.fillStyle = '#ccc';
    ctx2d.fillRect(x + 10, y + 32, 220, 8);
    ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
    ctx2d.fillRect(x + 10, y + 32, Math.round(220 * pct), 8);
    ctxRestore();
  }
  function pkmCaught() { return pkm.caught; }
  function pkmNewGame() {
    pkm.team = [];
    pkm.balls = [];
    pkm.battle = null;
    pkm.caught = false;
    pkmTrainerList = null;
    // ⚠️ TODO estado de jogo entra no reset (é a 3ª vez que esta linha é a causa):
    // sem isto, "Jogar de novo" recomeçava com a tabela de selvagens acumulada.
    pkm.wild = [];
    pkm.grassAreas = [];
    pkm.grassTiles = {};
    pkm.grassTileCount = 0;
    pkm.grassMap = '';
  }
`
