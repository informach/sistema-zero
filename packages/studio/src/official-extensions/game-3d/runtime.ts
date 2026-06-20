/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-3d"
 * está instalada. É um SCRIPT MODULE (importa `three` via importmap — ver
 * `runtime.esmImports`), então roda DEFERIDO e em ordem antes do código do
 * aluno (que também vira module quando há importmap de extensão).
 *
 * Expõe `window.SZGame3D` — wrapper fino e legível sobre Three.js. Higiene de
 * GPU: pixelRatio ≤ 2; ao recriar/parar o loop, dispose de geometrias/materiais
 * e `setAnimationLoop(null)`. O spawner de inimigos (runEnemies) DESCARTA os que
 * saem de cena — sem isso o teto de objetos estouraria e a cena ficaria preta.
 *
 * É uma STRING template: sem regex, sem ${...}, sem barra-n literal.
 */
export const gameThreeDRuntime = `import * as THREE from 'three';
(function () {
  // Registro dos mundos criados nesta página. O navegador limita o número de
  // contextos WebGL ativos (~16): a cada "Atualizar" o preview roda este runtime
  // de novo e cria um WebGLRenderer novo. Sem liberar o contexto antigo, o mais
  // velho é forçado a perder o contexto e a cena fica preta. Mantemos a lista
  // para descartar tudo no fechamento/refresh da página.
  var worlds = [];

  // Teto rígido de objetos por mundo. Geometrias/materiais 3D são pesados na GPU:
  // se o aluno chamar createBox/createSphere DENTRO do "a cada quadro", o cenário
  // cresceria ~60 objetos/segundo e vazaria memória de GPU até o navegador perder
  // o contexto WebGL (cena preta). Acima do teto, addMesh devolve null em SILÊNCIO
  // (nunca lança — setPosition/setRotation já ignoram null) e avisa UMA vez.
  var MAX_OBJECTS = 300;

  // Estado do teclado (por event.code). Lido por keyDown(...) e controlWithKeys(...).
  var keys = {};
  function onKeyDown(e) {
    keys[e.code] = true;
    // Evita rolar a página com espaço/setas (atrapalharia o jogo).
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (e.preventDefault) e.preventDefault();
    }
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function keyDown(code) { return !!keys[code]; }

  // Metadados de física por malha (meia-extensão p/ AABB + velocidade + flags).
  // A escala (obj.scale) é aplicada na hora de medir, então setScale já reflete
  // na colisão sem mexer aqui.
  function szData(obj) {
    if (!obj) return null;
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.sz) {
      obj.userData.sz = { hw: 0.5, hh: 0.5, hd: 0.5, vx: 0, vy: 0, vz: 0,
        grounded: false, zAccel: false, gravity: -0.002 };
    }
    return obj.userData.sz;
  }
  function halfX(o, s) { return s.hw * (o.scale ? o.scale.x : 1); }
  function halfY(o, s) { return s.hh * (o.scale ? o.scale.y : 1); }
  function halfZ(o, s) { return s.hd * (o.scale ? o.scale.z : 1); }

  function createScene(canvasId) {
    var canvas = document.getElementById(canvasId);
    // Mesmo canvas, novo "Atualizar"/recriar: descarta o mundo anterior ANTES
    // de instanciar outro WebGLRenderer sobre o MESMO canvas, senão o contexto
    // antigo fica vivo no registro e o navegador acaba forçando perda de
    // contexto (cena preta) ao estourar o limite de ~16 contextos WebGL.
    if (canvas) {
      for (var k = worlds.length - 1; k >= 0; k--) {
        if (worlds[k] && worlds[k]._canvas === canvas) {
          try { dispose(worlds[k]); } catch (e) {}
        }
      }
    }
    var renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas || undefined });
    var w = canvas && canvas.width ? canvas.width : 400;
    var h = canvas && canvas.height ? canvas.height : 300;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    // Sombras suaves dão profundidade ao 3D (o chão recebe a sombra do jogador).
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    var scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1020');
    var camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 0, 5);
    // Luz para o MeshStandardMaterial ser visível sem passo extra.
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 4);
    dir.castShadow = true;
    if (dir.shadow && dir.shadow.camera) {
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far = 60;
      dir.shadow.camera.left = -20;
      dir.shadow.camera.right = 20;
      dir.shadow.camera.top = 20;
      dir.shadow.camera.bottom = -20;
      if (dir.shadow.mapSize && dir.shadow.mapSize.set) dir.shadow.mapSize.set(1024, 1024);
    }
    scene.add(dir);
    var world = { scene: scene, camera: camera, renderer: renderer, _objects: [], _canvas: canvas || null, _camFollow: null };
    worlds.push(world);
    return world;
  }

  function setBackground(world, color) {
    if (world && world.scene) world.scene.background = new THREE.Color(color);
  }

  function setCameraPosition(world, x, y, z) {
    if (!world || !world.camera) return;
    world.camera.position.set(x, y, z);
    world.camera.lookAt(0, 0, 0);
    // O aluno reposicionou a câmera: refaz o offset do "segue" na próxima vez.
    world._camFollow = null;
  }

  function addMesh(world, geo, color, dims) {
    if (!world || !world.scene) return null;
    // Acima do teto: descarta a geometria recém-criada e devolve null. Sem isto,
    // criar objetos a cada quadro encheria a GPU até a cena ficar preta.
    if (world._objects.length >= MAX_OBJECTS) {
      if (geo && geo.dispose) try { geo.dispose(); } catch (e) {}
      if (!world._objectLimitWarned) {
        world._objectLimitWarned = true;
        console.warn("Crie os objetos UMA vez, fora do bloco 'a cada quadro' — o cenário 3D parou de crescer para não travar.");
      }
      return null;
    }
    var mat = new THREE.MeshStandardMaterial({ color: color || '#22d3ee' });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    var d = dims || { hw: 0.5, hh: 0.5, hd: 0.5 };
    mesh.userData = mesh.userData || {};
    mesh.userData.sz = { hw: d.hw, hh: d.hh, hd: d.hd, vx: 0, vy: 0, vz: 0,
      grounded: false, zAccel: false, gravity: -0.002 };
    world.scene.add(mesh);
    world._objects.push(mesh);
    return mesh;
  }
  function createBox(world, opts) {
    opts = opts || {};
    var s = typeof opts.size === 'number' ? opts.size : 1;
    return addMesh(world, new THREE.BoxGeometry(s, s, s), opts.color, { hw: s / 2, hh: s / 2, hd: s / 2 });
  }
  function createSphere(world, opts) {
    opts = opts || {};
    var r = typeof opts.radius === 'number' ? opts.radius : 0.5;
    return addMesh(world, new THREE.SphereGeometry(r, 32, 16), opts.color, { hw: r, hh: r, hd: r });
  }
  function createBlock(world, opts) {
    opts = opts || {};
    var w = typeof opts.width === 'number' ? opts.width : 1;
    var h = typeof opts.height === 'number' ? opts.height : 1;
    var d = typeof opts.depth === 'number' ? opts.depth : 1;
    return addMesh(world, new THREE.BoxGeometry(w, h, d), opts.color, { hw: w / 2, hh: h / 2, hd: d / 2 });
  }

  function setPosition(obj, x, y, z) { if (obj && obj.position) obj.position.set(x, y, z); }
  function setRotation(obj, x, y, z) { if (obj && obj.rotation) obj.rotation.set(x, y, z); }
  function setScale(obj, factor) {
    if (!obj || !obj.scale) return;
    var f = typeof factor === 'number' ? factor : 1;
    obj.scale.set(f, f, f);
  }

  function setVelocity(obj, x, y, z) {
    if (!obj) return;
    var s = szData(obj);
    s.vx = x || 0; s.vy = y || 0; s.vz = z || 0;
  }

  /** AABB entre dois objetos (com olhar-à-frente no eixo y, como na referência). */
  function collides(a, b) {
    if (!a || !b || !a.position || !b.position) return false;
    var sa = szData(a), sb = szData(b);
    var axh = halfX(a, sa), ayh = halfY(a, sa), azh = halfZ(a, sa);
    var bxh = halfX(b, sb), byh = halfY(b, sb), bzh = halfZ(b, sb);
    var xC = (a.position.x + axh) >= (b.position.x - bxh) && (a.position.x - axh) <= (b.position.x + bxh);
    var yC = (a.position.y - ayh + sa.vy) <= (b.position.y + byh) && (a.position.y + ayh) >= (b.position.y - byh);
    var zC = (a.position.z + azh) >= (b.position.z - bzh) && (a.position.z - azh) <= (b.position.z + bzh);
    return xC && yC && zC;
  }

  /** Anda pela velocidade e aplica gravidade; quica/para no chão e marca grounded. */
  function applyGravity(obj, ground) {
    if (!obj || !obj.position) return;
    var s = szData(obj);
    s.vy += s.gravity;
    obj.position.x += s.vx;
    obj.position.z += s.vz;
    if (ground && collides(obj, ground)) {
      s.grounded = true;
      s.vy = -s.vy * 0.5;
    } else {
      s.grounded = false;
      obj.position.y += s.vy;
    }
  }

  /** Pulo: só impulsiona se estiver no chão (evita "voar" segurando a tecla). */
  function jump(obj, force) {
    if (!obj) return;
    var s = szData(obj);
    var f = typeof force === 'number' ? force : 0.08;
    if (s.grounded) { s.vy = f; s.grounded = false; }
  }

  /** Movimento no plano X/Z por WASD ou setas (zera e reaplica a cada quadro). */
  function controlWithKeys(obj, speed) {
    if (!obj) return;
    var s = szData(obj);
    var sp = typeof speed === 'number' ? speed : 0.05;
    s.vx = 0; s.vz = 0;
    if (keys.KeyA || keys.ArrowLeft) s.vx = -sp;
    else if (keys.KeyD || keys.ArrowRight) s.vx = sp;
    if (keys.KeyW || keys.ArrowUp) s.vz = -sp;
    else if (keys.KeyS || keys.ArrowDown) s.vz = sp;
  }

  /** Câmera segue um objeto mantendo o enquadramento (offset) atual. */
  function cameraFollow(world, obj) {
    if (!world || !world.camera || !obj || !obj.position) return;
    if (!world._camFollow) {
      world._camFollow = {
        dx: world.camera.position.x - obj.position.x,
        dy: world.camera.position.y - obj.position.y,
        dz: world.camera.position.z - obj.position.z
      };
    }
    var f = world._camFollow;
    world.camera.position.set(obj.position.x + f.dx, obj.position.y + f.dy, obj.position.z + f.dz);
    world.camera.lookAt(obj.position.x, obj.position.y, obj.position.z);
  }

  function createGroup() { return []; }

  /** Remove um objeto da cena, do registro de GPU e descarta geometria/material. */
  function removeObject(world, mesh) {
    if (!world || !mesh) return;
    if (world.scene) world.scene.remove(mesh);
    if (mesh.geometry && mesh.geometry.dispose) try { mesh.geometry.dispose(); } catch (e) {}
    if (mesh.material && mesh.material.dispose) try { mesh.material.dispose(); } catch (e) {}
    var i = world._objects.indexOf(mesh);
    if (i !== -1) world._objects.splice(i, 1);
  }

  /**
   * Kit "Desvie": a cada quadro, move os inimigos do grupo (acelerando em z) e,
   * de tempos em tempos, solta um novo lá no fundo. Inimigos que passam da câmera
   * são DESCARTADOS (cena + GPU + grupo) — sem isso o teto de objetos estouraria.
   * O ritmo (rate) acelera com o tempo, deixando o jogo mais difícil.
   */
  function runEnemies(world, group, ground, every, speed) {
    if (!world || !group) return;
    if (typeof group.__frames !== 'number') {
      group.__frames = 0;
      group.__rate = (typeof every === 'number' && every > 0) ? Math.round(every) : 200;
    }
    var baseSpeed = typeof speed === 'number' ? speed : 0.02;
    for (var i = group.length - 1; i >= 0; i--) {
      var e = group[i];
      if (!e) { group.splice(i, 1); continue; }
      var es = szData(e);
      if (es.zAccel) es.vz += 0.0003;
      applyGravity(e, ground);
      // Passou da câmera (player fica perto de z=0): descarta para não vazar GPU.
      if (e.position.z > 12) { removeObject(world, e); group.splice(i, 1); }
    }
    group.__frames += 1;
    if (group.__frames % group.__rate === 0) {
      if (group.__rate > 20) group.__rate -= 20;
      var enemy = createBlock(world, { width: 1, height: 1, depth: 1, color: '#ff4444' });
      if (enemy) {
        enemy.position.set((Math.random() - 0.5) * 10, 0, -20);
        var s = szData(enemy);
        s.vz = baseSpeed;
        s.zAccel = true;
        group.push(enemy);
      }
    }
  }

  /** Verdadeiro se obj encostou em qualquer um do grupo (fim de jogo). */
  function hitAny(obj, group) {
    if (!obj || !group) return false;
    for (var i = 0; i < group.length; i++) {
      if (group[i] && collides(obj, group[i])) return true;
    }
    return false;
  }

  /** Para o loop de animação (game over). */
  function stop(world) {
    if (world && world.renderer) world.renderer.setAnimationLoop(null);
  }

  function animate(world, fn) {
    if (!world || !world.renderer) return;
    world.renderer.setAnimationLoop(function () {
      try {
        fn();
        world.renderer.render(world.scene, world.camera);
      } catch (e) {
        console.error(e && e.message ? e.message : e);
        world.renderer.setAnimationLoop(null);
      }
    });
  }

  /** Libera GPU: para o loop e descarta geometrias/materiais/renderer. */
  function dispose(world) {
    if (!world) return;
    // Tira o mundo do registro mesmo que o descarte abaixo falhe.
    var idx = worlds.indexOf(world);
    if (idx !== -1) worlds.splice(idx, 1);
    if (world.renderer) {
      world.renderer.setAnimationLoop(null);
      try { world.renderer.dispose(); } catch (e) {}
      // \`dispose()\` sozinho NÃO devolve o contexto WebGL ao navegador — é o
      // \`forceContextLoss()\` que libera o slot de GPU e evita a cena preta
      // depois de vários "Atualizar".
      try { world.renderer.forceContextLoss(); } catch (e) {}
    }
    for (var i = 0; i < (world._objects || []).length; i++) {
      var o = world._objects[i];
      if (o && o.geometry && o.geometry.dispose) o.geometry.dispose();
      if (o && o.material && o.material.dispose) o.material.dispose();
    }
    // Travessia: o mapa é feito de Groups (fora de _objects) — descarta também.
    if (world._crossing && world._crossing.map) {
      try { disposeGroup(world._crossing.map); } catch (e) {}
    }
  }

  /** Descarta TODOS os mundos vivos — usado no fechamento/refresh da página. */
  function disposeAll() {
    // Copia a lista: dispose() mexe no array original via splice.
    var pending = worlds.slice();
    for (var i = 0; i < pending.length; i++) {
      try { dispose(pending[i]); } catch (e) {}
    }
  }

  // ======================================================================
  // GENÉRICOS de grade/isométrico + Kit Travessia (atravessar a rua).
  // Mundo z-up (chão no plano XY, altura em Z). Escala: 1 tile = 1 unidade.
  // ======================================================================
  var TS = 1; // tamanho do tile (unidade do mundo)
  var MIN_TILE = -8;
  var MAX_TILE = 8;
  var TILES_PER_ROW = MAX_TILE - MIN_TILE + 1; // 17

  /** Descarta recursivamente as geometrias/materiais de um grupo (higiene de GPU). */
  function disposeGroup(group) {
    if (!group || !group.traverse) return;
    group.traverse(function (o) {
      if (o.geometry && o.geometry.dispose) try { o.geometry.dispose(); } catch (e) {}
      if (o.material) {
        var m = o.material;
        if (m.length) { for (var i = 0; i < m.length; i++) if (m[i] && m[i].dispose) m[i].dispose(); }
        else if (m.dispose) try { m.dispose(); } catch (e2) {}
      }
    });
  }

  /** Câmera ortográfica isométrica (z-up), enquadrada pelo aspecto do canvas. */
  function makeIsoCamera(canvas) {
    var w = canvas && canvas.width ? canvas.width : 480;
    var h = canvas && canvas.height ? canvas.height : 360;
    var vs = 14; // unidades visíveis na vertical
    var ratio = w / h;
    var cam = new THREE.OrthographicCamera(
      (-vs * ratio) / 2, (vs * ratio) / 2, vs / 2, -vs / 2, 0.1, 1000
    );
    cam.up.set(0, 0, 1);
    cam.position.set(12, -12, 14);
    cam.lookAt(0, 0, 0);
    return cam;
  }

  /** Estado de grade por objeto (linha/coluna + fila de passos + animação). */
  function gridData(obj) {
    if (!obj) return null;
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.grid) {
      obj.userData.grid = {
        row: 0, col: 0, queue: [], moving: false, t: 0, tile: TS,
        sx: 0, sy: 0, ex: 0, ey: 0, targetRot: 0, inner: null, wired: false
      };
    }
    return obj.userData.grid;
  }

  /** Célula final após aplicar uma sequência de passos a partir de (row,col). */
  function endCell(row, col, moves) {
    var r = row, c = col;
    for (var i = 0; i < moves.length; i++) {
      var d = moves[i];
      if (d === 'forward') r += 1;
      else if (d === 'backward') r -= 1;
      else if (d === 'left') c -= 1;
      else if (d === 'right') c += 1;
    }
    return { row: r, col: c };
  }

  /** Posição válida? (borda do tabuleiro + árvore). Sem mundo Travessia = livre. */
  function validCell(world, row, col) {
    var cs = world && world._crossing;
    if (!cs) return true;
    if (row < 0 || col < MIN_TILE || col > MAX_TILE) return false;
    var meta = cs.rowByIndex[row];
    if (meta && meta.type === 'forest' && meta.trees) {
      for (var i = 0; i < meta.trees.length; i++) if (meta.trees[i].tileIndex === col) return false;
    }
    return true;
  }

  /** Enfileira um passo (valida contra borda/árvore quando há mundo Travessia). */
  function enqueueMove(obj, dir, world) {
    var g = gridData(obj);
    if (!g) return;
    var end = endCell(g.row, g.col, g.queue.concat([dir]));
    if (!validCell(world, end.row, end.col)) return;
    g.queue.push(dir);
  }

  /** Liga (uma vez por objeto) as setas do teclado à fila de passos. */
  function wireGridKeys(obj, world) {
    var g = gridData(obj);
    if (!g || g.wired) return;
    g.wired = true;
    if (typeof window === 'undefined' || !window.addEventListener) return;
    window.addEventListener('keydown', function (e) {
      var dir =
        e.code === 'ArrowUp' ? 'forward'
        : e.code === 'ArrowDown' ? 'backward'
        : e.code === 'ArrowLeft' ? 'left'
        : e.code === 'ArrowRight' ? 'right'
        : null;
      if (dir) { if (e.preventDefault) e.preventDefault(); enqueueMove(obj, dir, world); }
    });
  }

  /** Anima um passo em grade (lerp + saltinho + giro). Devolve true ao COMPLETAR. */
  function animateStep(obj) {
    var g = gridData(obj);
    if (!g) return false;
    var inner = g.inner;
    if (!g.moving) {
      if (g.queue.length === 0) return false;
      var dir = g.queue[0];
      g.moving = true; g.t = 0;
      g.sx = g.col * g.tile; g.sy = g.row * g.tile;
      g.ex = g.sx; g.ey = g.sy;
      if (dir === 'left') g.ex -= g.tile;
      else if (dir === 'right') g.ex += g.tile;
      else if (dir === 'forward') g.ey += g.tile;
      else if (dir === 'backward') g.ey -= g.tile;
      g.targetRot =
        dir === 'forward' ? 0 : dir === 'left' ? Math.PI / 2 : dir === 'right' ? -Math.PI / 2 : Math.PI;
    }
    g.t = Math.min(1, g.t + 0.12);
    obj.position.x = g.sx + (g.ex - g.sx) * g.t;
    obj.position.y = g.sy + (g.ey - g.sy) * g.t;
    var lift = Math.sin(g.t * Math.PI) * (g.tile * 0.35);
    if (inner) inner.position.z = lift; else obj.position.z = lift;
    if (inner) inner.rotation.z = inner.rotation.z + (g.targetRot - inner.rotation.z) * g.t;
    if (g.t >= 1) {
      g.moving = false;
      var done = g.queue.shift();
      if (done === 'forward') g.row += 1;
      else if (done === 'backward') g.row -= 1;
      else if (done === 'left') g.col -= 1;
      else if (done === 'right') g.col += 1;
      if (inner) inner.position.z = 0; else obj.position.z = 0;
      return true;
    }
    return false;
  }

  // ---- Genéricos expostos ----
  function isometricCamera(world, followObj) {
    if (!world || !world.scene) return;
    var cam = makeIsoCamera(world._canvas);
    world.camera = cam;
    if (followObj && followObj.add) followObj.add(cam);
    else world.scene.add(cam);
  }
  function gridPosition(obj, row, col) {
    if (!obj || !obj.position) return;
    var g = gridData(obj);
    g.row = row || 0; g.col = col || 0;
    obj.position.x = g.col * g.tile;
    obj.position.y = g.row * g.tile;
  }
  function gridMove(obj, dir) { enqueueMove(obj, dir, null); }
  function gridStep(obj) {
    if (!obj) return;
    wireGridKeys(obj, null);
    animateStep(obj);
  }
  function moveAcross(group, speed, min, max) {
    if (!group || !group.length) return;
    var sp = typeof speed === 'number' ? speed : 0.1;
    var lo = typeof min === 'number' ? min : -10;
    var hi = typeof max === 'number' ? max : 10;
    for (var i = 0; i < group.length; i++) {
      var o = group[i];
      if (!o || !o.position) continue;
      o.position.x += sp;
      if (sp >= 0 && o.position.x > hi) o.position.x = lo;
      else if (sp < 0 && o.position.x < lo) o.position.x = hi;
    }
  }
  function boxOf(obj) { return new THREE.Box3().setFromObject(obj); }
  function touchesBox(obj, group) {
    if (!obj || !group || !group.length) return false;
    var pb = boxOf(obj);
    for (var i = 0; i < group.length; i++) {
      if (group[i] && pb.intersectsBox(boxOf(group[i]))) return true;
    }
    return false;
  }

  // ---- Modelos compostos do Kit Travessia (escala 1 tile = 1 unidade) ----
  function lambert(color, flat) {
    return new THREE.MeshLambertMaterial({ color: color, flatShading: flat !== false });
  }
  function part(w, h, d, color, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function makeWheel(x) { return part(0.28, 0.78, 0.28, '#333333', x, 0, 0.14); }
  function makeCar(direction, color) {
    var car = new THREE.Group();
    if (!direction || direction === 'left') car.rotation.z = Math.PI;
    car.add(part(1.42, 0.71, 0.36, color, 0, 0, 0.3));
    car.add(part(0.78, 0.57, 0.29, '#cccccc', -0.14, 0, 0.6));
    car.add(makeWheel(0.43));
    car.add(makeWheel(-0.43));
    return car;
  }
  function makeTruck(direction, color) {
    var truck = new THREE.Group();
    if (!direction || direction === 'left') truck.rotation.z = Math.PI;
    truck.add(part(1.66, 0.83, 0.83, '#b4c6fc', -0.36, 0, 0.6));
    truck.add(part(0.71, 0.71, 0.71, color, 0.83, 0, 0.48));
    truck.add(makeWheel(0.88));
    truck.add(makeWheel(0.12));
    truck.add(makeWheel(-0.83));
    return truck;
  }
  function makeTree(tileIndex, height) {
    var tree = new THREE.Group();
    tree.position.x = tileIndex * TS;
    tree.add(part(0.36, 0.36, 0.48, '#4d2926', 0, 0, 0.24));
    var crown = part(0.71, 0.71, height, '#7aa21d', 0, 0, height / 2 + 0.48);
    tree.add(crown);
    return tree;
  }
  function makeRowSection(color, isPlane) {
    var geo = isPlane
      ? new THREE.PlaneGeometry(TILES_PER_ROW * TS, TS)
      : new THREE.BoxGeometry(TILES_PER_ROW * TS, TS, 0.05);
    var m = new THREE.Mesh(geo, lambert(color, false));
    m.receiveShadow = true;
    return m;
  }
  function makeRowGround(rowIndex, kind) {
    var row = new THREE.Group();
    row.position.y = rowIndex * TS;
    var isRoad = kind === 'car' || kind === 'truck';
    var mid = makeRowSection(isRoad ? '#454a59' : '#baf455', isRoad);
    row.add(mid);
    var side = makeRowSection(isRoad ? '#393d49' : '#99c846', isRoad);
    side.position.x = -TILES_PER_ROW * TS;
    row.add(side);
    var side2 = makeRowSection(isRoad ? '#393d49' : '#99c846', isRoad);
    side2.position.x = TILES_PER_ROW * TS;
    row.add(side2);
    return row;
  }
  function makeCrosser(color) {
    var outer = new THREE.Group();
    var inner = new THREE.Group();
    var body = part(0.36, 0.36, 0.5, color || '#ffffff', 0, 0, 0.25);
    inner.add(body);
    inner.add(part(0.12, 0.12, 0.12, '#f0619a', 0, 0.06, 0.55));
    outer.add(inner);
    return { outer: outer, inner: inner };
  }

  function crossingState(world) {
    if (!world._crossing) {
      world._crossing = {
        tileSize: TS, minTile: MIN_TILE, maxTile: MAX_TILE,
        map: new THREE.Group(), rowByIndex: {}, nextRow: 1, player: null, gameOver: false
      };
      world.scene.add(world._crossing.map);
    }
    return world._crossing;
  }

  function setupCrossingLights(world) {
    var amb = new THREE.AmbientLight(0xffffff, 0.6);
    world.scene.add(amb);
    var dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(-10, -10, 20);
    dir.up.set(0, 0, 1);
    dir.castShadow = true;
    if (dir.shadow && dir.shadow.camera) {
      dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
      dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -20;
      dir.shadow.camera.near = 1; dir.shadow.camera.far = 80;
      if (dir.shadow.mapSize && dir.shadow.mapSize.set) dir.shadow.mapSize.set(1024, 1024);
    }
    world.scene.add(dir);
  }

  // ---- Kit Travessia exposto ----
  function createCrossingScene(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (canvas) {
      for (var k = worlds.length - 1; k >= 0; k--) {
        if (worlds[k] && worlds[k]._canvas === canvas) { try { dispose(worlds[k]); } catch (e) {} }
      }
    }
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvas || undefined });
    var w = canvas && canvas.width ? canvas.width : 480;
    var h = canvas && canvas.height ? canvas.height : 360;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    var scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');
    var camera = makeIsoCamera(canvas);
    var world = { scene: scene, camera: camera, renderer: renderer, _objects: [], _canvas: canvas || null };
    setupCrossingLights(world);
    crossingState(world);
    // linha de início (grama segura) na linha 0 + algumas atrás.
    for (var r = 0; r > -6; r--) world._crossing.map.add(makeRowGround(r, 'grass'));
    worlds.push(world);
    return world;
  }

  function createCrosser(world, opts) {
    if (!world || !world.scene) return null;
    opts = opts || {};
    var cs = crossingState(world);
    var built = makeCrosser(opts.color);
    world.scene.add(built.outer);
    var g = gridData(built.outer);
    g.row = 0; g.col = 0; g.tile = TS; g.inner = built.inner;
    built.outer.position.set(0, 0, 0);
    cs.player = built.outer;
    // câmera segue o personagem (parenteada — translada junto, sem girar).
    if (world.camera) {
      if (world.camera.parent && world.camera.parent.remove) world.camera.parent.remove(world.camera);
      built.outer.add(world.camera);
    }
    return built.outer;
  }

  function crosserMove(obj, dir) {
    var g = gridData(obj);
    var world = g && g.world ? g.world : null;
    enqueueMove(obj, dir, world);
  }

  function crosserStep(obj, world) {
    if (!obj || !world) return;
    var cs = crossingState(world);
    var g = gridData(obj);
    g.world = world; // para o crosserMove validar
    wireGridKeys(obj, world);
    animateStep(obj);
    // estende o mapa à frente e descarta o que ficou muito atrás.
    if (g.row > cs.nextRow - 10) generateRows(world, 10);
    cullRows(world, g.row);
  }

  function crosserReset(obj, world) {
    if (!obj || !world) return;
    var cs = crossingState(world);
    // limpa o mapa
    var ids = [];
    for (var key in cs.rowByIndex) if (cs.rowByIndex.hasOwnProperty(key)) ids.push(key);
    for (var i = 0; i < ids.length; i++) {
      var meta = cs.rowByIndex[ids[i]];
      if (meta && meta.group) { cs.map.remove(meta.group); disposeGroup(meta.group); }
    }
    cs.rowByIndex = {}; cs.nextRow = 1; cs.gameOver = false;
    var g = gridData(obj);
    g.row = 0; g.col = 0; g.queue = []; g.moving = false;
    obj.position.set(0, 0, 0);
    if (g.inner) { g.inner.position.z = 0; g.inner.rotation.z = 0; }
    generateRows(world, 20);
  }

  function buildRow(world, rowIndex, kind, direction, speed) {
    var cs = crossingState(world);
    var row = makeRowGround(rowIndex, kind);
    var meta = { type: kind, group: row, direction: direction, speed: speed, vehicles: [], trees: [] };
    if (kind === 'forest') {
      var used = {};
      var n = 4;
      for (var t = 0; t < n; t++) {
        var ti;
        var tries = 0;
        do { ti = THREE.MathUtils.randInt(MIN_TILE, MAX_TILE); tries++; } while (used[ti] && tries < 20);
        used[ti] = true;
        var heights = [0.5, 1, 1.4];
        var hgt = heights[Math.floor(Math.random() * heights.length)];
        meta.trees.push({ tileIndex: ti, height: hgt });
        row.add(makeTree(ti, hgt));
      }
    } else if (kind === 'car' || kind === 'truck') {
      var count = kind === 'truck' ? 2 : 3;
      var colors = ['#a52523', '#bdb638', '#78b14b'];
      for (var v = 0; v < count; v++) {
        var startTile = THREE.MathUtils.randInt(MIN_TILE, MAX_TILE);
        var col = colors[Math.floor(Math.random() * colors.length)];
        var mesh = kind === 'truck' ? makeTruck(direction, col) : makeCar(direction, col);
        mesh.position.x = startTile * TS;
        row.add(mesh);
        meta.vehicles.push({ ref: mesh });
      }
    }
    cs.rowByIndex[rowIndex] = meta;
    cs.map.add(row);
    if (rowIndex >= cs.nextRow) cs.nextRow = rowIndex + 1;
  }

  function addRow(world, rowIndex, kind, direction, speed) {
    if (!world) return;
    buildRow(world, rowIndex, kind, direction, typeof speed === 'number' ? speed : 150);
  }

  function generateRows(world, count) {
    if (!world) return;
    var cs = crossingState(world);
    var kinds = ['car', 'truck', 'forest'];
    var speeds = [125, 156, 188];
    var n = typeof count === 'number' ? count : 20;
    for (var i = 0; i < n; i++) {
      var kind = kinds[Math.floor(Math.random() * kinds.length)];
      var direction = Math.random() < 0.5 ? 'right' : 'left';
      var speed = speeds[Math.floor(Math.random() * speeds.length)];
      buildRow(world, cs.nextRow, kind, direction, speed);
    }
  }

  /** Remove (e descarta) linhas muito atrás do personagem — segura a GPU. */
  function cullRows(world, playerRow) {
    var cs = world._crossing;
    if (!cs) return;
    var ids = [];
    for (var key in cs.rowByIndex) if (cs.rowByIndex.hasOwnProperty(key)) ids.push(key);
    for (var i = 0; i < ids.length; i++) {
      var idx = parseInt(ids[i], 10);
      if (idx < playerRow - 10) {
        var meta = cs.rowByIndex[ids[i]];
        if (meta && meta.group) { cs.map.remove(meta.group); disposeGroup(meta.group); }
        delete cs.rowByIndex[ids[i]];
      }
    }
  }

  function moveTraffic(world) {
    var cs = world && world._crossing;
    if (!cs) return;
    var begin = (MIN_TILE - 2) * TS;
    var end = (MAX_TILE + 2) * TS;
    for (var key in cs.rowByIndex) {
      if (!cs.rowByIndex.hasOwnProperty(key)) continue;
      var meta = cs.rowByIndex[key];
      if (!meta || (meta.type !== 'car' && meta.type !== 'truck')) continue;
      var step = (meta.speed || 150) / 42 / 60; // px-ish → unidades por quadro (~60fps)
      for (var i = 0; i < meta.vehicles.length; i++) {
        var ref = meta.vehicles[i] && meta.vehicles[i].ref;
        if (!ref) continue;
        if (meta.direction === 'right') {
          ref.position.x = ref.position.x > end ? begin : ref.position.x + step;
        } else {
          ref.position.x = ref.position.x < begin ? end : ref.position.x - step;
        }
      }
    }
  }

  function crosserHit(obj, world) {
    var cs = world && world._crossing;
    if (!obj || !cs) return false;
    var g = gridData(obj);
    var meta = cs.rowByIndex[g.row];
    if (!meta || (meta.type !== 'car' && meta.type !== 'truck')) return false;
    var pb = boxOf(obj);
    for (var i = 0; i < meta.vehicles.length; i++) {
      var ref = meta.vehicles[i] && meta.vehicles[i].ref;
      if (ref && pb.intersectsBox(boxOf(ref))) { cs.gameOver = true; return true; }
    }
    return false;
  }

  function crosserRow(obj) {
    var g = gridData(obj);
    return g ? g.row : 0;
  }

  // Auto-registro: não dependemos de GC preguiçoso nem de o host chamar dispose.
  // pagehide cobre o caso moderno (inclui bfcache); beforeunload é o fallback.
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pagehide', disposeAll);
    window.addEventListener('beforeunload', disposeAll);
  }

  window.SZGame3D = {
    createScene: createScene,
    setBackground: setBackground,
    setCameraPosition: setCameraPosition,
    createBox: createBox,
    createSphere: createSphere,
    createBlock: createBlock,
    setPosition: setPosition,
    setRotation: setRotation,
    setScale: setScale,
    setVelocity: setVelocity,
    applyGravity: applyGravity,
    jump: jump,
    controlWithKeys: controlWithKeys,
    cameraFollow: cameraFollow,
    keyDown: keyDown,
    collides: collides,
    hitAny: hitAny,
    createGroup: createGroup,
    runEnemies: runEnemies,
    stop: stop,
    isometricCamera: isometricCamera,
    gridPosition: gridPosition,
    gridStep: gridStep,
    gridMove: gridMove,
    moveAcross: moveAcross,
    touchesBox: touchesBox,
    createCrossingScene: createCrossingScene,
    createCrosser: createCrosser,
    crosserMove: crosserMove,
    crosserStep: crosserStep,
    crosserReset: crosserReset,
    addRow: addRow,
    generateRows: generateRows,
    moveTraffic: moveTraffic,
    crosserHit: crosserHit,
    crosserRow: crosserRow,
    animate: animate,
    dispose: dispose,
    disposeAll: disposeAll,
    THREE: THREE
  };
})();`
