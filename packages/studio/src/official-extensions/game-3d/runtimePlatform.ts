/**
 * Kit Plataforma do Jogo 3D (lote "Reino Cogumelo"): o motor de um jogo de
 * correr-e-pular de lado, no molde dos outros quatro kits de gênero da extensão.
 *
 * O fragmento é inserido dentro da IIFE do runtime principal (mesmo mecanismo do
 * `game-3d-advanced/runtimeCamera.ts`), então enxerga `THREE`, `keys`,
 * `classicPlatformer`, `paintPattern`, `forEachHit` e os demais utilitários sem
 * criar outro global.
 *
 * ⚠️ As malhas do kit são construídas com `new THREE.Mesh` DIRETO, sem passar
 * pelo `addMesh`. É de propósito, e é o mesmo que o Kit Travessia faz: assim o
 * cenário da fase não consome o teto de 300 objetos do aluno (que existe para
 * proteger quem cria caixa dentro do "a cada quadro"). Em troca, o kit tem o seu
 * próprio teto e o seu próprio descarte.
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal.
 */
export const gameThreeDPlatformRuntimeSource = `
  // ====================================================================
  // KIT PLATAFORMA — um jogo de correr e pular de lado, em 2,5D.
  // O mundo é um corredor: X avança, Y é altura, Z fica quase parado.
  // ====================================================================
  var MAX_STAGE_MESHES = 260;   // teto PRÓPRIO do kit (não é o dos 300 objetos)
  var MAX_STAGE_ENEMIES = 28;
  var TILE = 1;                 // um bloco do mapa = uma unidade do mundo
  var STAGE_Z = 0;              // o corredor inteiro vive nesta profundidade
  var STAGE_DEPTH = 1.6;        // espessura das peças (dá volume sem virar labirinto)
  var VIEW_AHEAD = 17;          // colunas materializadas à frente da câmera
  var VIEW_BEHIND = 11;         // colunas mantidas atrás antes de reciclar

  var STAGE_THEMES = {
    dia: { sky: '#5c94fc', horizon: '#c8e0ff', ground: '#c86400', groundB: '#e89050',
           brick: '#b5651d', brickB: '#f2d0a4', hard: '#8b5a2b', fog: 0 },
    noite: { sky: '#0b1020', horizon: '#243a6b', ground: '#3a2a4a', groundB: '#6b5b8a',
             brick: '#5b4a7a', brickB: '#a89ad0', hard: '#463a5e', fog: 60 },
    subterraneo: { sky: '#000000', horizon: '#06202a', ground: '#0e6a72', groundB: '#4fd6e0',
                   brick: '#0e6a72', brickB: '#7ff0f8', hard: '#0a4a50', fog: 42 },
    agua: { sky: '#0a3a8a', horizon: '#2f7ad0', ground: '#116b3a', groundB: '#49d07a',
            brick: '#116b3a', brickB: '#7ff0a8', hard: '#0d5030', fog: 34 },
    castelo: { sky: '#000000', horizon: '#2a2a2a', ground: '#6b6b6b', groundB: '#bdbdbd',
               hard: '#4a4a4a', brick: '#6b6b6b', brickB: '#bdbdbd', fog: 48 }
  };

  /** O estado da partida inteira mora aqui, pendurado na cena. */
  function stageState(world) {
    if (!world) return null;
    if (!world._stage) {
      world._stage = {
        theme: 'dia', meshes: [], enemies: [], coins: [],
        lifts: [], hazards: [], firebars: [], shots: [], boss: null, axe: null,
        parts: null, hero: null, clock: 0,
        built: 0, width: 0, camX: 0, spawnX: 2, checkpoint: 0, reachedCheckpoint: 0,
        score: 0, coinCount: 0, lives: 5, world: 1, stage: 1,
        time: 400, timeLeft: 400, power: 0, invincible: 0, dead: 0, won: 0,
        events: {}, flagX: 0, warned: {}
      };
    }
    return world._stage;
  }

  function stageWarn(st, key, msg) {
    if (!st || st.warned[key]) return;
    st.warned[key] = true;
    warn(msg);
  }

  // ---- Construção de peças (fora do teto de objetos do aluno) --------------
  function stageMesh(world, st, w, h, d, color) {
    if (st.meshes.length >= MAX_STAGE_MESHES) {
      stageWarn(st, 'malhas', 'a fase tem peças demais na tela; encurte o mapa ou junte trechos de chão.');
      return null;
    }
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: color }));
    mesh.castShadow = false;      // cenário não projeta sombra: metade do custo
    mesh.receiveShadow = true;
    mesh.userData.sz = { hw: w / 2, hh: h / 2, hd: d / 2, vx: 0, vy: 0, vz: 0,
      grounded: false, gravity: 0 };
    world.scene.add(mesh);
    attachWorld(mesh, world);
    st.meshes.push(mesh);
    return mesh;
  }

  function stageSolid(world, st, mesh) {
    if (!mesh) return null;
    mesh.userData._solid = true;
    if (!world._solids) world._solids = [];
    world._solids.push(mesh);
    return mesh;
  }

  function dropStageMesh(world, st, mesh) {
    if (!mesh) return;
    if (world.scene && world.scene.remove) world.scene.remove(mesh);
    removeFromArray(st.meshes, mesh);
    if (world._solids) removeFromArray(world._solids, mesh);
    if (mesh.geometry && mesh.geometry.dispose) mesh.geometry.dispose();
    if (mesh.material && mesh.material.dispose) mesh.material.dispose();
  }

  // ---- O mapa da fase, em texto -------------------------------------------
  // Formato: linhas "assunto=itens", itens separados por vírgula.
  //   chao=0-69,71-85        trechos contínuos de chão (o vão entre eles é abismo)
  //   tijolo=20:4            um tijolo na coluna 20, altura 4
  //   surpresa=16:4:moeda    bloco de interrogação com um prêmio dentro
  //   solido=134:1-8         coluna de blocos rígidos (escada), alturas 1 a 8
  //   cano=28:2 / 46:4:entra cano de altura 2; "entra" = dá para descer nele
  //   moeda=100:5            uma moeda solta no ar
  //   inimigo=22:goomba      quem nasce ali
  //   mastro=198 castelo=202 checkpoint=95 tempo=400 tema=dia
  function parseStage(text) {
    var out = { chao: [], tijolo: [], surpresa: [], solido: [], cano: [], moeda: [],
      inimigo: [], escondido: [], plataforma: [], lava: [], fogo: [],
      mastro: 0, castelo: 0, chefao: 0, checkpoint: 0, tempo: 400, tema: '', largura: 0 };
    // Ponto-e-vírgula OU quebra de linha separam os assuntos: assim o mapa cabe
    // num campo de texto de bloco (uma linha só) sem deixar de ser legível.
    var lines = String(text || '').replace(/;/g, '\\n').split('\\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^\\s+|\\s+$/g, '');
      if (!line) continue;
      var eq = line.indexOf('=');
      if (eq < 0) continue;
      var key = line.slice(0, eq).replace(/^\\s+|\\s+$/g, '');
      var rest = line.slice(eq + 1);
      if (key === 'tema') { out.tema = rest.replace(/^\\s+|\\s+$/g, ''); continue; }
      if (key === 'mastro' || key === 'castelo' || key === 'checkpoint' ||
          key === 'tempo' || key === 'chefao') {
        out[key] = parseInt(rest, 10) || 0;
        continue;
      }
      var items = rest.split(',');
      for (var j = 0; j < items.length; j++) {
        var raw = items[j].replace(/^\\s+|\\s+$/g, '');
        if (!raw) continue;
        if (key === 'chao' || key === 'lava') {
          var dash = raw.indexOf('-');
          var from = dash < 0 ? parseInt(raw, 10) : parseInt(raw.slice(0, dash), 10);
          var to = dash < 0 ? from : parseInt(raw.slice(dash + 1), 10);
          if (isNaN(from) || isNaN(to)) continue;
          out[key].push({ from: from, to: to });
          if (to + 1 > out.largura) out.largura = to + 1;
          continue;
        }
        var bits = raw.split(':');
        var col = parseInt(bits[0], 10);
        if (isNaN(col)) continue;
        if (col + 1 > out.largura) out.largura = col + 1;
        if (key === 'tijolo') out.tijolo.push({ x: col, y: parseInt(bits[1], 10) || 4 });
        else if (key === 'surpresa') {
          out.surpresa.push({ x: col, y: parseInt(bits[1], 10) || 4, prize: bits[2] || 'moeda' });
        } else if (key === 'solido') {
          var span = String(bits[1] || '1');
          var sd = span.indexOf('-');
          var lo = sd < 0 ? parseInt(span, 10) : parseInt(span.slice(0, sd), 10);
          var hi = sd < 0 ? lo : parseInt(span.slice(sd + 1), 10);
          if (isNaN(lo)) continue;
          if (isNaN(hi)) hi = lo;
          out.solido.push({ x: col, from: lo, to: hi });
        } else if (key === 'cano') {
          out.cano.push({ x: col, h: parseInt(bits[1], 10) || 2, enter: bits[2] === 'entra' });
        } else if (key === 'moeda') out.moeda.push({ x: col, y: parseInt(bits[1], 10) || 4 });
        else if (key === 'inimigo') out.inimigo.push({ x: col, kind: bits[1] || 'goomba' });
        else if (key === 'escondido') {
          // Bloco invisível: só aparece depois da cabeçada. É o 1-Up do abismo
          // da 1-1, que o artigo mostra estar posicionado para segurar o pulo
          // errado do jogador.
          out.escondido.push({ x: col, y: parseInt(bits[1], 10) || 4, prize: bits[2] || 'vida' });
        } else if (key === 'plataforma') {
          out.plataforma.push({
            x: col,
            y: parseInt(bits[1], 10) || 4,
            axis: bits[2] === 'y' ? 'y' : 'x',
            range: parseInt(bits[3], 10) || 4,
          });
        } else if (key === 'fogo') {
          out.fogo.push({ x: col, y: parseInt(bits[1], 10) || 6, len: parseInt(bits[2], 10) || 3 });
        }
      }
    }
    return out;
  }

  // ---- Materializar/reciclar por coluna (streaming, como o console fazia) --
  function buildColumn(world, st, col) {
    var p = st.parts;
    var t = STAGE_THEMES[st.theme] || STAGE_THEMES.dia;
    var k;
    for (k = 0; k < p.chao.length; k++) {
      var run = p.chao[k];
      if (run.from !== col) continue;
      var wide = (run.to - run.from + 1) * TILE;
      var floor = stageMesh(world, st, wide, 2 * TILE, STAGE_DEPTH, t.ground);
      if (floor) {
        floor.userData._stageThemeRole = 'ground';
        floor.position.set((run.from + (run.to - run.from) / 2) * TILE, -TILE, STAGE_Z);
        paintPattern(floor, st.theme === 'castelo' ? 'pedra' : 'terra', t.ground, t.groundB);
        stageSolid(world, st, floor);
        floor.userData._stageCol = col;
        floor.userData._stageColEnd = run.to;
      }
    }
    for (k = 0; k < p.solido.length; k++) {
      var s = p.solido[k];
      if (s.x !== col) continue;
      var tall = (s.to - s.from + 1) * TILE;
      var pillar = stageMesh(world, st, TILE, tall, STAGE_DEPTH, t.hard);
      if (pillar) {
        pillar.userData._stageThemeRole = 'hard';
        pillar.position.set(s.x * TILE, (s.from + (s.to - s.from) / 2) * TILE, STAGE_Z);
        paintPattern(pillar, 'pedra', t.hard, t.brickB);
        stageSolid(world, st, pillar);
        pillar.userData._stageCol = col;
      }
    }
    for (k = 0; k < p.tijolo.length; k++) {
      var b = p.tijolo[k];
      if (b.x !== col || b.broken) continue;
      var brick = stageMesh(world, st, TILE, TILE, STAGE_DEPTH, t.brick);
      if (brick) {
        brick.userData._stageThemeRole = 'brick';
        brick.position.set(b.x * TILE, b.y * TILE, STAGE_Z);
        paintPattern(brick, 'tijolo', t.brick, t.brickB);
        stageSolid(world, st, brick);
        brick.userData._stageCol = col;
        brick.userData._brick = b;
      }
    }
    for (k = 0; k < p.surpresa.length; k++) {
      var q = p.surpresa[k];
      if (q.x !== col) continue;
      var box = stageMesh(world, st, TILE, TILE, STAGE_DEPTH,
        q.used ? '#9a6a3a' : '#f8b800');
      if (box) {
        box.position.set(q.x * TILE, q.y * TILE, STAGE_Z);
        paintPattern(box, q.used ? 'pedra' : 'interrogacao',
          q.used ? '#9a6a3a' : '#f8b800', q.used ? '#6a4a28' : '#7a4a08');
        stageSolid(world, st, box);
        box.userData._stageCol = col;
        box.userData._question = q;
      }
    }
    for (k = 0; k < p.cano.length; k++) {
      var pipe = p.cano[k];
      if (pipe.x !== col) continue;
      var body = stageMesh(world, st, 2 * TILE, pipe.h * TILE, STAGE_DEPTH + 0.2, '#00a800');
      if (body) {
        body.position.set((pipe.x + 0.5) * TILE, (pipe.h / 2 - 0.5) * TILE, STAGE_Z);
        paintPattern(body, 'cano', '#00a800', '#88f888');
        stageSolid(world, st, body);
        body.userData._stageCol = col;
        body.userData._pipe = pipe;
      }
    }
    for (k = 0; k < p.moeda.length; k++) {
      var c = p.moeda[k];
      if (c.x !== col || c.taken) continue;
      var coin = stageMesh(world, st, 0.6 * TILE, 0.6 * TILE, 0.2, '#fcd000');
      if (coin) {
        coin.position.set(c.x * TILE, c.y * TILE, STAGE_Z);
        paintPattern(coin, 'moeda', '#fcd000', '#f8f8b0');
        coin.userData._stageCol = col;
        coin.userData._coin = c;
        st.coins.push(coin);
      }
    }
    for (k = 0; k < p.inimigo.length; k++) {
      var e = p.inimigo[k];
      if (e.x !== col || e.dead || e.alive) continue;
      if (st.enemies.length >= MAX_STAGE_ENEMIES) {
        stageWarn(st, 'inimigos', 'há inimigos demais ao mesmo tempo nesta fase.');
        break;
      }
      spawnStageEnemy(world, st, e, col);
    }
    for (k = 0; k < p.escondido.length; k++) {
      var h = p.escondido[k];
      if (h.x !== col || !h.found) continue;
      // Só ganha corpo DEPOIS de encontrado; antes disso ele é apenas um ponto
      // no ar que o teto do herói consulta (ver stepStageBlocks).
      var solto = stageMesh(world, st, TILE, TILE, STAGE_DEPTH, '#9a6a3a');
      if (solto) {
        solto.position.set(h.x * TILE, h.y * TILE, STAGE_Z);
        paintPattern(solto, 'pedra', '#9a6a3a', '#6a4a28');
        stageSolid(world, st, solto);
        solto.userData._stageCol = col;
      }
    }
    for (k = 0; k < p.plataforma.length; k++) {
      var mv = p.plataforma[k];
      if (mv.x !== col) continue;
      var lift = stageMesh(world, st, 2.4 * TILE, 0.4 * TILE, STAGE_DEPTH, '#f8b800');
      if (lift) {
        lift.position.set(mv.x * TILE, mv.y * TILE, STAGE_Z);
        paintPattern(lift, 'listras', '#f8b800', '#a06000');
        stageSolid(world, st, lift);
        carryRiders(lift);
        lift.userData._stageCol = col;
        lift.userData._lift = mv;
        st.lifts.push(lift);
      }
    }
    for (k = 0; k < p.lava.length; k++) {
      var lv = p.lava[k];
      if (lv.from !== col) continue;
      var poca = stageMesh(world, st, (lv.to - lv.from + 1) * TILE, TILE, STAGE_DEPTH, '#f83800');
      if (poca) {
        poca.position.set((lv.from + (lv.to - lv.from) / 2) * TILE, -0.5 * TILE, STAGE_Z);
        paintPattern(poca, 'lava', '#f83800', '#f8d000');
        poca.userData._stageCol = col;
        poca.userData._stageColEnd = lv.to;
        poca.userData._lava = true;
        st.hazards.push(poca);
      }
    }
    for (k = 0; k < p.fogo.length; k++) {
      var fb = p.fogo[k];
      if (fb.x !== col) continue;
      buildFirebar(world, st, fb, col);
    }
    // ⚠️ O "maior que zero" não é decoração: 0 é o valor de "não tem", e a coluna 0 existe
    // em toda fase. Sem ele, TODA fase ganhava um chefão, um mastro e um castelo
    // fantasmas na origem — e o chefão fantasma entrava na lista de inimigos,
    // envenenando tudo que percorre essa lista.
    if (p.chefao > 0 && p.chefao === col) buildBoss(world, st, col);
    if (p.mastro > 0 && p.mastro === col) buildFlag(world, st, col, t);
    if (p.castelo > 0 && p.castelo === col) buildCastle(world, st, col, t);
  }

  /** Barra de fogo do castelo: bolas girando presas a um pivô. */
  function buildFirebar(world, st, spec, col) {
    for (var i = 1; i <= spec.len; i++) {
      var bola = stageMesh(world, st, 0.5, 0.5, 0.5, '#f8b800');
      if (!bola) return;
      bola.position.set(spec.x * TILE, spec.y * TILE, STAGE_Z);
      paintPattern(bola, 'lava', '#f8b800', '#f83800');
      bola.userData._stageCol = col;
      bola.userData._firebar = { spec: spec, dist: i * 0.7 };
      st.hazards.push(bola);
      st.firebars.push(bola);
    }
  }

  function buildBoss(world, st, col) {
    var chefe = stageMesh(world, st, 1.8, 2.2, 1.4, '#00a800');
    if (!chefe) return;
    chefe.position.set(col * TILE, 1.1, STAGE_Z);
    paintPattern(chefe, 'pedra', '#00a800', '#f8b800');
    chefe.userData.sz.gravity = -0.02;
    chefe.userData._stageCol = col;
    chefe.userData._boss = true;
    setObjectValue(chefe, 'vida', 5);
    setObjectValue(chefe, 'dir', -1);
    st.boss = chefe;
    st.enemies.push(chefe);
    // O machado do outro lado da ponte: encostar nele derruba o chefão.
    var machado = stageMesh(world, st, 0.5, 0.7, 0.3, '#c0c0c0');
    if (machado) {
      machado.position.set((col + 5) * TILE, 1.2, STAGE_Z);
      machado.userData._stageCol = col;
      machado.userData._stageColEnd = col + 5;
      machado.userData._axe = true;
      st.axe = machado;
    }
  }

  var ENEMY_LOOK = {
    goomba: { color: '#a04000', tall: 0.9, kind: 1 },
    koopa: { color: '#00a800', tall: 1.3, kind: 2 },
    planta: { color: '#f83800', tall: 1.4, kind: 3 },
    besouro: { color: '#404060', tall: 0.9, kind: 4 },
    espinho: { color: '#f8b800', tall: 0.9, kind: 5 }
  };
  function spawnStageEnemy(world, st, spec, col) {
    var look = ENEMY_LOOK[spec.kind] || ENEMY_LOOK.goomba;
    var body = stageMesh(world, st, 0.9 * TILE, look.tall * TILE, STAGE_DEPTH * 0.7, look.color);
    if (!body) return;
    body.position.set(spec.x * TILE, 0.5 * look.tall * TILE, STAGE_Z);
    body.userData.sz.gravity = look.kind === 3 ? 0 : -0.02;
    body.userData._stageCol = col;
    body.userData._enemy = spec;
    spec.alive = body;
    setObjectValue(body, 'dir', -1);
    setObjectValue(body, 'kind', look.kind);
    setObjectValue(body, 'shell', 0);
    setObjectValue(body, 'combo', 0);
    if (look.kind === 3) {
      // A planta mora no cano: a base é a boca dele, e ela sobe a partir dali.
      setObjectValue(body, 'base', body.position.y);
      setObjectValue(body, 'fase', (spec.x % 7) * 0.9);
    }
    st.enemies.push(body);
  }

  function buildFlag(world, st, col, t) {
    var pole = stageMesh(world, st, 0.18, 10 * TILE, 0.18, '#f8f8f8');
    if (pole) {
      pole.position.set(col * TILE, 5 * TILE - 0.5, STAGE_Z);
      pole.userData._stageCol = col;
      st.flagX = col * TILE;
    }
    var flag = stageMesh(world, st, 0.9, 0.7, 0.1, '#00c000');
    if (flag) {
      flag.position.set(col * TILE + 0.5, 9 * TILE - 0.5, STAGE_Z);
      flag.userData._stageCol = col;
    }
  }

  function buildCastle(world, st, col, t) {
    var keep = stageMesh(world, st, 5 * TILE, 5 * TILE, STAGE_DEPTH, t.brick);
    if (keep) {
      keep.userData._stageThemeRole = 'brick';
      keep.position.set((col + 2) * TILE, 2 * TILE, STAGE_Z);
      paintPattern(keep, 'tijolo', t.brick, t.brickB);
      keep.userData._stageCol = col;
      keep.userData._stageColEnd = col + 4;
    }
    var door = stageMesh(world, st, TILE, 1.6 * TILE, 0.2, '#101010');
    if (door) {
      door.position.set((col + 2) * TILE, 0.3 * TILE, STAGE_Z + STAGE_DEPTH / 2);
      door.userData._stageCol = col;
    }
  }

  function recycleColumns(world, st, minCol) {
    for (var i = st.meshes.length - 1; i >= 0; i--) {
      var mesh = st.meshes[i];
      var col = mesh.userData ? mesh.userData._stageCol : undefined;
      if (col === undefined) continue;
      // ⚠️ Peça LONGA (um trecho de chão fundido, a lava, o castelo) nasce
      // ancorada na PRIMEIRA coluna dela. Reciclar por essa âncora sumia com o
      // chão inteiro assim que o herói passava de VIEW_BEHIND colunas da borda
      // esquerda — e aí tudo caía no vazio, em silêncio. O fim da peça manda.
      var fim = mesh.userData._stageColEnd;
      if (fim === undefined) fim = col;
      if (fim >= minCol) continue;
      var enemy = mesh.userData._enemy;
      if (enemy) { enemy.alive = null; removeFromArray(st.enemies, mesh); }
      if (mesh.userData._coin) removeFromArray(st.coins, mesh);
      dropStageMesh(world, st, mesh);
    }
  }

  // ---- API do kit ---------------------------------------------------------
  function createPlatformScene(canvasId) {
    var world = createScene(canvasId);
    if (!world) return world;
    var st = stageState(world);
    applyStageTheme(world, st, 'dia');
    addSunLight(world, '#ffffff', 1.1);
    addAmbientLight(world, '#8899bb', 0.75);
    return world;
  }

  function applyStageTheme(world, st, theme) {
    var t = STAGE_THEMES[theme] || STAGE_THEMES.dia;
    st.theme = STAGE_THEMES[theme] ? theme : 'dia';
    setSky(world, t.sky, t.horizon);
    if (t.fog) setFog(world, t.sky, 12, t.fog);
    else if (world && world.scene) world.scene.fog = null;
    for (var i = 0; i < st.meshes.length; i++) {
      var mesh = st.meshes[i];
      var role = mesh && mesh.userData ? mesh.userData._stageThemeRole : '';
      if (!role) continue;
      var color = t[role];
      if (!color) continue;
      setColor(mesh, color);
      if (role === 'ground') {
        paintPattern(mesh, st.theme === 'castelo' ? 'pedra' : 'terra', t.ground, t.groundB);
      } else if (role === 'hard') {
        paintPattern(mesh, 'pedra', t.hard, t.brickB);
      } else if (role === 'brick') {
        paintPattern(mesh, 'tijolo', t.brick, t.brickB);
      }
    }
  }

  function setStageTheme(world, theme) {
    var st = stageState(world);
    if (!st) return;
    applyStageTheme(world, st, String(theme || 'dia'));
  }

  function createHero(world, color) {
    var st = stageState(world);
    if (!st) return null;
    var hero = createBlock(world, { width: 0.8, height: 1.5, depth: 0.8,
      color: color || '#e03010' });
    if (!hero) return null;
    body(hero, -0.02);
    setPosition(hero, st.spawnX * TILE, 2, STAGE_Z);
    st.hero = hero;
    return hero;
  }

  function loadStage(world, text) {
    var st = stageState(world);
    if (!st) return;
    // Montar a MESMA fase de novo é no-op. Sem isto, o bloco caído dentro do
    // "a cada quadro" reconstruiria o mundo 60 vezes por segundo — e como a
    // criança pode pôr o bloco onde quiser, a guarda mora aqui, não no editor.
    if (st.parts && st.source === String(text || '')) return;
    st.source = String(text || '');
    clearStage(world);
    st.parts = parseStage(text);
    applyStageTheme(world, st, st.parts.tema || st.theme);
    st.width = st.parts.largura;
    st.time = st.parts.tempo || 400;
    st.timeLeft = st.time;
    st.checkpoint = st.parts.checkpoint || 0;
    st.reachedCheckpoint = 0;
    st.built = 0;
    st.dead = 0;
    st.won = 0;
    st.camX = 0;
    st.spawnX = 2;
    // Materializa a primeira janela AGORA: adiar para o quadro seguinte deixaria
    // o herói cair num chão que ainda não existe.
    growStage(world, st, VIEW_AHEAD);
    if (st.hero) {
      setPosition(st.hero, st.spawnX * TILE, 2, STAGE_Z);
      setVelocity(st.hero, 0, 0, 0);
    }
  }

  function growStage(world, st, untilCol) {
    if (!st.parts) return;
    var limit = Math.min(st.width + 6, untilCol);
    while (st.built <= limit) {
      buildColumn(world, st, st.built);
      st.built = st.built + 1;
    }
  }

  function clearStage(world) {
    var st = stageState(world);
    if (!st) return;
    for (var i = st.meshes.length - 1; i >= 0; i--) dropStageMesh(world, st, st.meshes[i]);
    st.meshes = [];
    st.enemies = [];
    st.coins = [];
    st.lifts = [];
    st.hazards = [];
    st.firebars = [];
    st.shots = [];
    st.boss = null;
    st.axe = null;
    st.parts = null;
    st.source = null;
    st.built = 0;
  }

  function stageReset(world) {
    var st = stageState(world);
    if (!st) return;
    st.timeLeft = st.time;
    st.dead = 0;
    st.won = 0;
    st.power = 0;
    st.invincible = 0;
    st.starred = 0;
    st.clock = 0;
    setHeroSmall(st.hero);
    if (st.parts) {
      var p = st.parts;
      var i;
      for (i = 0; i < p.inimigo.length; i++) { p.inimigo[i].dead = 0; p.inimigo[i].alive = null; }
      for (i = 0; i < p.moeda.length; i++) p.moeda[i].taken = 0;
      for (i = 0; i < p.tijolo.length; i++) p.tijolo[i].broken = 0;
      for (i = 0; i < p.surpresa.length; i++) p.surpresa[i].used = 0;
      for (i = 0; i < p.escondido.length; i++) p.escondido[i].found = 0;
    }
    var parts = st.parts;
    clearStage(world);
    st.parts = parts;
    st.built = 0;
    st.spawnX = st.checkpoint && st.reachedCheckpoint ? st.checkpoint : 2;
    growStage(world, st, st.spawnX + VIEW_AHEAD);
    if (st.hero) {
      setPosition(st.hero, st.spawnX * TILE, 2, STAGE_Z);
      setVelocity(st.hero, 0, 0, 0);
    }
  }

  function fireStage(st, name, arg) {
    var fn = st.events[name];
    if (typeof fn !== 'function') return;
    try { fn(arg); } catch (e) {
      console.error('SZGame3D: erro no bloco "quando acontecer ' + name + '":', e);
      st.events[name] = null;
    }
  }

  function onStageEvent(world, name, fn) {
    var st = stageState(world);
    if (!st || typeof fn !== 'function') return;
    st.events[String(name)] = fn;
  }

  // ---- Um quadro do jogo --------------------------------------------------
  function stageStep(world, hero) {
    var st = stageState(world);
    if (!st || !st.parts) return;
    if (hero && !belongsToWorld(world, hero, 'stage-step-world', 'Atualizar a fase')) return;
    if (hero) st.hero = hero;
    var who = st.hero;
    if (!who) return;
    var dt = world._dt > 0 ? world._dt : 1 / 60;

    if (st.dead || st.won) return;

    var hx = who.position.x;
    growStage(world, st, Math.floor(hx / TILE) + VIEW_AHEAD);
    recycleColumns(world, st, Math.floor(hx / TILE) - VIEW_BEHIND);

    if (st.invincible > 0) {
      st.invincible = st.invincible - dt;
      if (st.invincible <= 0) st.starred = 0;
    }

    st.clock = st.clock + dt;
    stepStageLifts(world, st, dt);
    stepStageFirebars(world, st);
    stepStageEnemies(world, st, who);
    stepStageShots(world, st);
    stepStageCoins(world, st, who);
    stepStageBlocks(world, st, who);
    stepStageHazards(world, st, who);
    stepStageBoss(world, st, who);

    // Relógio: o tempo é do jogo, não do mundo, e só corre com a fase viva.
    st.timeLeft = st.timeLeft - dt * 2.5;
    if (st.timeLeft <= 0) {
      st.timeLeft = 0;
      killHero(world, st, 'tempo');
      return;
    }

    if (st.checkpoint && hx >= st.checkpoint * TILE) st.reachedCheckpoint = 1;
    if (who.position.y < -8) { killHero(world, st, 'buraco'); return; }
    if (st.parts.mastro && hx >= st.flagX - 0.6 && st.flagX > 0) {
      st.won = 1;
      // Quanto mais alto no mastro, mais pontos (0 a 5000, como no original).
      var height = Math.max(0, Math.min(1, (who.position.y - 0.5) / 8));
      st.score = st.score + Math.round(height * 5000 / 100) * 100;
      st.score = st.score + Math.round(st.timeLeft) * 50;
      playEffect('coin');
      fireStage(st, 'tocar-a-bandeira', null);
    }
  }

  /** Elevadores e plataformas móveis: vão e voltam, carregando o passageiro. */
  function stepStageLifts(world, st, dt) {
    for (var i = 0; i < st.lifts.length; i++) {
      var lift = st.lifts[i];
      var spec = lift.userData._lift;
      if (!spec) continue;
      var onda = Math.sin(st.clock * 0.9) * (spec.range / 2);
      if (spec.axis === 'y') lift.position.y = spec.y * TILE + onda;
      else lift.position.x = spec.x * TILE + onda;
    }
  }

  /** Barras de fogo giram em torno do pivô; cada bola no seu raio. */
  function stepStageFirebars(world, st) {
    for (var i = 0; i < st.firebars.length; i++) {
      var bola = st.firebars[i];
      var fb = bola.userData._firebar;
      if (!fb) continue;
      var ang = st.clock * 1.6;
      bola.position.x = fb.spec.x * TILE + Math.cos(ang) * fb.dist;
      bola.position.y = fb.spec.y * TILE + Math.sin(ang) * fb.dist;
    }
  }

  /** Lava e fogo matam de qualquer jeito — nem a estrela salva na lava. */
  function stepStageHazards(world, st, who) {
    for (var i = 0; i < st.hazards.length; i++) {
      var perigo = st.hazards[i];
      if (!perigo.parent || !collides(who, perigo)) continue;
      if (perigo.userData._lava) { killHero(world, st, 'lava'); return; }
      if (st.invincible > 0) continue;
      hurtHero(world, st, who);
      return;
    }
  }

  /** Bolas de fogo do herói: quicam no chão, somem longe e matam inimigos. */
  function stepStageShots(world, st) {
    for (var i = st.shots.length - 1; i >= 0; i--) {
      var tiro = st.shots[i];
      if (!tiro.parent) { st.shots.splice(i, 1); continue; }
      stepBody(tiro, world);
      if (tiro.userData.sz.grounded) tiro.userData.sz.vy = 0.16;
      var morreu = false;
      forEachHit(tiro, 'esquerda', function () { morreu = true; });
      forEachHit(tiro, 'direita', function () { morreu = true; });
      if (Math.abs(tiro.position.x - objectValue(tiro, 'origem')) > 18) morreu = true;
      if (tiro.position.y < -8) morreu = true;
      for (var k = st.enemies.length - 1; k >= 0; k--) {
        var alvo = st.enemies[k];
        if (!alvo.parent || !collides(tiro, alvo)) continue;
        if (alvo.userData._boss) { hurtBoss(world, st, alvo); morreu = true; continue; }
        st.score = st.score + 200;
        retireEnemy(world, st, alvo);
        morreu = true;
      }
      if (morreu) {
        removeFromArray(st.shots, tiro);
        dropStageMesh(world, st, tiro);
      }
    }
  }

  /** Solta uma bola de fogo (só como Fiery). Devolve false quando não pode. */
  function shootFire(world, hero) {
    if (!world || !hero || !belongsToWorld(world, hero, 'stage-fire-world', 'Soltar uma bola de fogo')) return false;
    var st = stageState(world);
    if (!st || st.power < 2) return false;
    if (st.shots.length >= 3) return false;
    var tiro = stageMesh(world, st, 0.4, 0.4, 0.4, '#f8b800');
    if (!tiro) return false;
    var dir = hero.userData.sz.vx < 0 ? -1 : 1;
    tiro.position.set(hero.position.x + dir * 0.8, hero.position.y, STAGE_Z);
    paintPattern(tiro, 'moeda', '#f8b800', '#f83800');
    tiro.userData.sz.gravity = -0.03;
    tiro.userData.sz.vx = dir * 0.22;
    setObjectValue(tiro, 'origem', hero.position.x);
    st.shots.push(tiro);
    playEffect('hit');
    return true;
  }

  function hurtBoss(world, st, chefe) {
    var vida = objectValue(chefe, 'vida') - 1;
    setObjectValue(chefe, 'vida', vida);
    playEffect('hit');
    if (vida > 0) return;
    st.score = st.score + 5000;
    retireEnemy(world, st, chefe);
    st.boss = null;
    fireStage(st, 'derrotar-o-chefe', null);
  }

  /** O chefão anda de um lado para o outro; o machado do outro lado o derruba. */
  function stepStageBoss(world, st, who) {
    if (st.axe && st.axe.parent && collides(who, st.axe)) {
      // Pegar o machado derruba a ponte e o chefão junto, sem bola de fogo.
      if (st.boss && st.boss.parent) {
        st.score = st.score + 5000;
        retireEnemy(world, st, st.boss);
        st.boss = null;
      }
      dropStageMesh(world, st, st.axe);
      st.axe = null;
      playEffect('explosion');
      fireStage(st, 'derrotar-o-chefe', null);
      st.won = 1;
    }
  }

  function stepStageEnemies(world, st, who) {
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (!e || !e.parent) { st.enemies.splice(i, 1); continue; }
      if (e.userData._boss) { stepBossWalk(world, st, e); continue; }
      var kind = objectValue(e, 'kind');
      if (kind === 3) { stepPiranha(world, st, e, who); continue; }
      var dir = objectValue(e, 'dir') || -1;
      var shell = objectValue(e, 'shell');
      var speed = shell === 2 ? 0.16 : 0.03;
      e.userData.sz.vx = shell === 1 ? 0 : dir * speed;
      stepBody(e, world);
      // Bateu numa parede: vira. É o Goomba do cano do trecho 4 da 1-1 — e é o
      // mesmo ricochete que faz a concha chutada voltar contra o jogador.
      forEachHit(e, 'esquerda', function () { setObjectValue(e, 'dir', 1); });
      forEachHit(e, 'direita', function () { setObjectValue(e, 'dir', -1); });
      if (shell === 2) shellSweeps(world, st, e);
      if (e.position.y < -8) { retireEnemy(world, st, e); continue; }
      hitHeroAgainstEnemy(world, st, who, e);
    }
  }

  /**
   * A concha chutada varre tudo no caminho — o "ataque de escavadeira" do
   * livreto. Cada vítima vale mais que a anterior, como no original.
   */
  function shellSweeps(world, st, concha) {
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var outro = st.enemies[i];
      if (outro === concha || !outro.parent) continue;
      if (outro.userData._boss) continue;
      if (objectValue(outro, 'kind') === 3) continue;
      if (!collides(concha, outro)) continue;
      var seguidos = objectValue(concha, 'combo') + 1;
      setObjectValue(concha, 'combo', seguidos);
      st.score = st.score + Math.min(8000, 100 * Math.pow(2, seguidos - 1));
      playEffect('hit');
      retireEnemy(world, st, outro);
      fireStage(st, 'pisar-inimigo', outro);
    }
  }

  /**
   * Planta piranha: sai e volta do cano num ritmo, e NÃO pode ser pisada.
   * Enquanto o herói está em pé no cano, ela não sobe (regra do original que o
   * artigo destaca no trecho 8 da 1-2).
   */
  function stepPiranha(world, st, planta, who) {
    var base = objectValue(planta, 'base');
    var fase = objectValue(planta, 'fase');
    // "Em cima do cano" é ter os PÉS acima da boca dele — não apenas estar mais
    // alto que o centro da planta, que é verdade até para quem passa ao lado.
    var pes = who.position.y - who.userData.sz.hh;
    var heroiEmCima = Math.abs(who.position.x - planta.position.x) < 1.2 &&
      pes >= base + 0.9;
    var alvo = heroiEmCima ? base - 1 : base + (Math.sin(st.clock * 1.1 + fase) > 0 ? 1.1 : -1);
    planta.position.y = planta.position.y + (alvo - planta.position.y) * 0.08;
    if (collides(who, planta) && st.invincible <= 0) hurtHero(world, st, who);
  }

  function stepBossWalk(world, st, chefe) {
    var dir = objectValue(chefe, 'dir') || -1;
    chefe.userData.sz.vx = dir * 0.02;
    stepBody(chefe, world);
    forEachHit(chefe, 'esquerda', function () { setObjectValue(chefe, 'dir', 1); });
    forEachHit(chefe, 'direita', function () { setObjectValue(chefe, 'dir', -1); });
  }

  function retireEnemy(world, st, e) {
    var spec = e.userData._enemy;
    if (spec) { spec.dead = 1; spec.alive = null; }
    removeFromArray(st.enemies, e);
    dropStageMesh(world, st, e);
  }

  function hitHeroAgainstEnemy(world, st, who, e) {
    if (!collides(who, e)) return;
    var shell = objectValue(e, 'shell');
    var kind = objectValue(e, 'kind');
    var fromAbove = who.userData.sz.vy < 0 &&
      who.position.y - who.userData.sz.hh > e.position.y;
    // A estrela mata no toque. A piscada de quem acabou de levar dano NÃO mata:
    // ela só protege, e é por isso que a invencibilidade tem dois donos aqui.
    if (st.invincible > 0 && st.starred) {
      st.score = st.score + 100;
      retireEnemy(world, st, e);
      return;
    }
    // Espinho e planta não podem ser pisados: pular em cima deles machuca.
    if (fromAbove && (kind === 5 || kind === 3)) {
      hurtHero(world, st, who);
      return;
    }
    if (fromAbove) {
      who.userData.sz.vy = 0.16;   // o quique do pisão
      playEffect('hit');
      if (kind === 2 && shell === 0) {
        // Koopa vira concha: fica parado até alguém encostar de lado.
        setObjectValue(e, 'shell', 1);
        e.scale.y = 0.55;
        st.score = st.score + 100;
        fireStage(st, 'pisar-inimigo', e);
        return;
      }
      if (shell > 0) {
        // Pisar numa concha PARA a concha; não a destrói. Sem isto, o quique do
        // primeiro pisão devolvia o herói em cima dela e o segundo pisão sumia
        // com a concha antes de dar tempo de chutá-la.
        setObjectValue(e, 'shell', 1);
        setObjectValue(e, 'combo', 0);
        return;
      }
      st.score = st.score + 100;
      retireEnemy(world, st, e);
      fireStage(st, 'pisar-inimigo', e);
      return;
    }
    if (shell === 1) {
      // Encostou de lado numa concha parada: chuta para longe.
      setObjectValue(e, 'shell', 2);
      setObjectValue(e, 'dir', who.position.x < e.position.x ? 1 : -1);
      // Respiro curto: sem ele, a concha recém-chutada ainda está encostada e
      // mataria quem a chutou no quadro seguinte. NÃO é a estrela (starred fica
      // 0), então só protege — não mata ninguém.
      if (st.invincible <= 0) st.invincible = 0.4;
      playEffect('hit');
      fireStage(st, 'chutar-concha', e);
      return;
    }
    if (shell === 2) { hurtHero(world, st, who); return; }
    hurtHero(world, st, who);
  }

  function stepStageCoins(world, st, who) {
    for (var i = st.coins.length - 1; i >= 0; i--) {
      var coin = st.coins[i];
      if (!coin || !coin.parent) { st.coins.splice(i, 1); continue; }
      coin.rotation.y = coin.rotation.y + 0.08;
      if (!collides(who, coin)) continue;
      takeCoin(world, st, coin);
    }
  }

  function takeCoin(world, st, coin) {
    var spec = coin.userData._coin;
    if (spec) spec.taken = 1;
    removeFromArray(st.coins, coin);
    dropStageMesh(world, st, coin);
    st.coinCount = st.coinCount + 1;
    st.score = st.score + 200;
    playEffect('coin');
    if (st.coinCount >= 100) {
      st.coinCount = st.coinCount - 100;
      st.lives = st.lives + 1;
      fireStage(st, 'ganhar-vida', null);
    }
    fireStage(st, 'pegar-moeda', null);
  }

  /** Cabeçada por baixo: quebra tijolo (só grande) e abre bloco de surpresa. */
  function stepStageBlocks(world, st, who) {
    revealHiddenBlocks(world, st, who);
    forEachHit(who, 'cabeca', function (hit) {
      var mesh = hit.other;
      if (!mesh || !mesh.userData) return;
      var question = mesh.userData._question;
      if (question && !question.used) {
        question.used = 1;
        paintPattern(mesh, 'pedra', '#9a6a3a', '#6a4a28');
        st.score = st.score + 50;
        givePrize(world, st, who, question, mesh);
        return;
      }
      var brick = mesh.userData._brick;
      if (brick) {
        st.score = st.score + 50;
        if (st.power > 0) {
          brick.broken = 1;
          dropStageMesh(world, st, mesh);
          playEffect('explosion');
          fireStage(st, 'quebrar-tijolo', null);
        } else {
          playEffect('hit');
        }
      }
    });
  }

  /**
   * O bloco invisível não existe até a cabeçada. Como ele não tem corpo, o
   * forEachHit nunca o veria: a checagem é geométrica, do topo do herói
   * subindo contra o ponto onde ele mora.
   */
  function revealHiddenBlocks(world, st, who) {
    if (who.userData.sz.vy <= 0) return;
    var p = st.parts;
    var topo = who.position.y + who.userData.sz.hh;
    for (var i = 0; i < p.escondido.length; i++) {
      var h = p.escondido[i];
      if (h.found) continue;
      if (Math.abs(who.position.x - h.x * TILE) > 0.7) continue;
      if (Math.abs(topo - (h.y * TILE - 0.5)) > 0.35) continue;
      h.found = 1;
      who.userData.sz.vy = 0;
      st.score = st.score + 50;
      buildColumn(world, st, h.x);
      givePrize(world, st, who, h, null);
    }
  }

  function givePrize(world, st, who, question, mesh) {
    var prize = question.prize;
    if (prize === 'moeda') {
      st.coinCount = st.coinCount + 1;
      st.score = st.score + 200;
      playEffect('coin');
      if (st.coinCount >= 100) {
        st.coinCount = st.coinCount - 100;
        st.lives = st.lives + 1;
        fireStage(st, 'ganhar-vida', null);
      }
      fireStage(st, 'pegar-moeda', null);
      return;
    }
    if (prize === 'vida') {
      st.lives = st.lives + 1;
      playEffect('coin');
      fireStage(st, 'ganhar-vida', null);
      return;
    }
    if (prize === 'estrela') {
      st.invincible = 10;
      st.starred = 1;
      st.score = st.score + 1000;
      playEffect('coin');
      fireStage(st, 'pegar-estrela', null);
      return;
    }
    // cogumelo e flor: crescem o herói (a flor também dá o poder de fogo).
    var was = st.power;
    st.power = prize === 'flor' ? 2 : Math.max(1, st.power);
    st.score = st.score + 1000;
    playEffect('coin');
    if (was === 0 && st.hero) {
      st.hero.scale.y = 1.6;
      st.hero.userData.sz.hh = st.hero.userData.sz.hh * 1.6;
      st.hero.position.y = st.hero.position.y + 0.4;
    }
    fireStage(st, prize === 'flor' ? 'pegar-flor' : 'pegar-cogumelo', null);
  }

  function hurtHero(world, st, who) {
    if (st.invincible > 0) return;
    if (st.power > 0) {
      st.power = 0;
      // Piscada de proteção: NÃO é a estrela, então não mata quem encostar.
      st.invincible = 2;
      st.starred = 0;
      setHeroSmall(who);
      playEffect('hit');
      fireStage(st, 'levar-dano', null);
      return;
    }
    killHero(world, st, 'inimigo');
  }

  function killHero(world, st, cause) {
    if (st.dead) return;
    st.dead = 1;
    st.lives = st.lives - 1;
    st.power = 0;
    setHeroSmall(st.hero);
    playEffect('explosion');
    fireStage(st, cause === 'tempo' ? 'acabar-o-tempo' : 'levar-dano', null);
  }

  // ---- Câmera lateral: acompanha, mas NUNCA volta -------------------------
  function sideCamera(world, obj) {
    if (!world || !world.camera) return;
    var st = stageState(world);
    if (!st) return;
    var target = obj || st.hero;
    if (target && !belongsToWorld(world, target, 'stage-camera-world', 'Usar a câmera lateral')) return;
    activateCameraMode(world, 'manual');
    if (target && target.position) {
      var wanted = target.position.x;
      if (wanted > st.camX) st.camX = wanted;
    }
    world.camera.position.set(st.camX, 4.2, 15);
    world.camera.lookAt(st.camX, 3.4, STAGE_Z);
  }

  function setHeroSmall(hero) {
    if (!hero || !hero.scale || !hero.userData || !hero.userData.sz) return;
    hero.scale.y = 1;
    hero.userData.sz.hh = 0.75;
  }

  // ---- Perguntas ----------------------------------------------------------
  function stageValue(world, field) {
    var st = stageState(world);
    if (!st) return 0;
    if (field === 'pontos') return st.score;
    if (field === 'moedas') return st.coinCount;
    if (field === 'vidas') return st.lives;
    if (field === 'tempo') return Math.max(0, Math.round(st.timeLeft));
    if (field === 'mundo') return st.world;
    if (field === 'fase') return st.stage;
    return 0;
  }

  function setStageNumber(world, worldNumber, stageNumber) {
    var st = stageState(world);
    if (!st) return;
    st.world = Math.max(1, Math.floor(finite(worldNumber, 1)));
    st.stage = Math.max(1, Math.floor(finite(stageNumber, 1)));
  }

  function heroIs(obj, what) {
    var world = worldOf(obj);
    var st = world ? stageState(world) : null;
    if (!st) return false;
    if (what === 'pequeno') return st.power === 0;
    if (what === 'grande') return st.power >= 1;
    if (what === 'de fogo') return st.power === 2;
    if (what === 'invencivel') return st.invincible > 0;
    if (what === 'no chao') return !!(obj && obj.userData && obj.userData.sz && obj.userData.sz.grounded);
    return false;
  }

  function stageIs(world, what) {
    var st = stageState(world);
    if (!st) return false;
    if (what === 'perdeu') return !!st.dead;
    if (what === 'venceu') return !!st.won;
    if (what === 'acabou') return !!(st.dead || st.won);
    if (what === 'sem vidas') return st.lives <= 0;
    return false;
  }
`
