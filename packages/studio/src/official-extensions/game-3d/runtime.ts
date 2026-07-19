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
  var MAX_LIGHTS = 16;
  var MAX_SWARMS = 8;
  var MAX_ROWS = 60;
  var MAX_ROWS_PER_CALL = 30;
  var MAX_STACK_LAYERS = 100;

  function warn(msg) {
    try { console.warn('SZGame3D: ' + msg); } catch (e) {}
  }
  var _warned = Object.create(null);
  function warnOnce(key, msg) {
    if (_warned[key]) return;
    _warned[key] = true;
    warn(msg);
  }
  function finite(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }
  function clamp(value, min, max, fallback) {
    var n = finite(value, fallback);
    return Math.max(min, Math.min(max, n));
  }
  function positive(value, fallback, max) {
    return clamp(value, 0.001, max || 10000, fallback);
  }

  // Texturas de imagem (Fase 6): o editor injeta os assets embutidos (data: URL)
  // em window.__SZGAME_ASSETS (nome -> dataURL). setTexture resolve o nome por aqui.
  var ASSETS = (typeof window !== 'undefined' && window.__SZGAME_ASSETS) || {};
  var _texCache = null;

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
  function clearKeys() { keys = {}; }
  function keyDown(code) { return !!keys[code]; }

  function listen(world, target, name, handler, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(name, handler, options);
    if (!world) return;
    if (!world._listeners) world._listeners = [];
    world._listeners.push({ target: target, name: name, handler: handler, options: options });
  }
  function removeWorldListeners(world) {
    var entries = world && world._listeners ? world._listeners : [];
    for (var i = entries.length - 1; i >= 0; i--) {
      var entry = entries[i];
      if (entry.target && entry.target.removeEventListener) {
        try { entry.target.removeEventListener(entry.name, entry.handler, entry.options); } catch (e) {}
      }
    }
    if (world) world._listeners = [];
  }

  function requireCanvas(canvasId) {
    var canvas = document && document.getElementById ? document.getElementById(canvasId) : null;
    if (!canvas) {
      throw new Error('SZGame3D: o canvas "' + canvasId + '" não existe. Crie a tela no HTML ou use “Criar cena 3D em tela cheia”.');
    }
    return canvas;
  }

  function worldOf(value) {
    if (!value) return null;
    if (value.renderer && value.scene) return value;
    return value._szWorld || (value.userData && value.userData.sz && value.userData.sz.world) || null;
  }
  // Mantém a velocidade histórica dos blocos (valor por quadro a 60 Hz), mas
  // normaliza o deslocamento pelo tempo real. Assim aulas existentes não mudam
  // de escala e 60/120 Hz produzem a mesma simulação.
  function frameScale(value) {
    var world = worldOf(value);
    var d = world && typeof world._dt === 'number' ? world._dt : 0;
    return d > 0 ? clamp(d * 60, 0, 6, 1) : 1;
  }
  function attachWorld(obj, world) {
    if (!obj) return obj;
    obj._szWorld = world || null;
    return obj;
  }

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

  // Monta renderer + cena + câmera + luzes a partir de um canvas e tamanho.
  // Compartilhado por createScene (canvas do HTML) e createFullscreenScene
  // (canvas criado em tela cheia). NÃO muda o comportamento do createScene.
  function _setupWorld(canvas, w, h, options) {
    options = options || {};
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!options.alpha, canvas: canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    // Sombras suaves dão profundidade ao 3D (o chão recebe a sombra do jogador).
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || '#0b1020');
    var camera = options.camera || new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    if (!options.camera) camera.position.set(0, 0, 5);
    // Luz para o MeshStandardMaterial ser visível sem passo extra.
    if (!options.skipLights) {
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
    }
    var world = {
      scene: scene, camera: camera, renderer: renderer, _objects: [], _canvas: canvas,
      _camFollow: null, _listeners: [], _solids: [], _dt: 0,
      _lightCount: options.skipLights ? 0 : 2,
      _swarmItemCount: 0, _disposed: false
    };
    world._resize = function () {
      var nw = canvas.clientWidth || canvas.width || w;
      var nh = canvas.clientHeight || canvas.height || h;
      if (!(nw > 0) || !(nh > 0)) return;
      renderer.setSize(nw, nh, false);
      var activeCamera = world.camera;
      if (typeof options.resizeCamera === 'function') options.resizeCamera(activeCamera, nw, nh);
      else if (typeof activeCamera.aspect === 'number') {
        activeCamera.aspect = nw / nh;
        if (activeCamera.updateProjectionMatrix) activeCamera.updateProjectionMatrix();
      }
    };
    listen(world, window, 'resize', world._resize);
    if (typeof ResizeObserver !== 'undefined') {
      world._resizeObserver = new ResizeObserver(world._resize);
      if (world._resizeObserver.observe) world._resizeObserver.observe(canvas);
    }
    worlds.push(world);
    return world;
  }

  function createScene(canvasId) {
    var canvas = requireCanvas(canvasId);
    // Mesmo canvas, novo "Atualizar"/recriar: descarta o mundo anterior ANTES
    // de instanciar outro WebGLRenderer sobre o MESMO canvas, senão o contexto
    // antigo fica vivo no registro e o navegador acaba forçando perda de
    // contexto (cena preta) ao estourar o limite de ~16 contextos WebGL.
    for (var k = worlds.length - 1; k >= 0; k--) {
      if (worlds[k] && worlds[k]._canvas === canvas) {
        try { dispose(worlds[k]); } catch (e) {}
      }
    }
    var w = canvas.clientWidth || canvas.width || 400;
    var h = canvas.clientHeight || canvas.height || 300;
    return _setupWorld(canvas, w, h);
  }

  // Facilitador: cria um canvas que preenche a janela inteira, já responsivo,
  // sem precisar de <canvas> no HTML. É o bloco "criar cena 3D em tela cheia".
  function createFullscreenScene(bg) {
    var color = (typeof bg === 'string' && bg) ? bg : '#0b1020';
    for (var wi = worlds.length - 1; wi >= 0; wi--) {
      if (worlds[wi] && worlds[wi]._ownsCanvas) {
        try { dispose(worlds[wi]); } catch (e) {}
      }
    }
    var canvas = document.createElement('canvas');
    // Convenção do studio: a tela tem id "tela" (achável por getElementById).
    canvas.id = 'tela';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.zIndex = '0';
    if (document.body) {
      var previousStyles = {
        margin: document.body.style.margin,
        background: document.body.style.background,
        overflow: document.documentElement && document.documentElement.style
          ? document.documentElement.style.overflow : ''
      };
      document.body.style.margin = '0';
      // Mesma cor no fundo da janela (defesa contra flash branco antes do render).
      document.body.style.background = color;
      if (document.documentElement && document.documentElement.style) {
        document.documentElement.style.overflow = 'hidden';
      }
      // Primeiro filho do body: um HUD em HTML (que vier depois) fica POR CIMA.
      if (document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild);
      else document.body.appendChild(canvas);
    }
    var world = _setupWorld(canvas, window.innerWidth || 800, window.innerHeight || 600);
    // Cor de fundo da CENA 3D (o que aparece atrás dos objetos), escolhida no bloco.
    if (world.scene && THREE.Color) world.scene.background = new THREE.Color(color);
    world._ownsCanvas = true;
    world._styleRestore = previousStyles;
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
    return attachWorld(mesh, world);
  }
  function createBox(world, opts) {
    opts = opts || {};
    var s = positive(opts.size, 1, 1000);
    return addMesh(world, new THREE.BoxGeometry(s, s, s), opts.color, { hw: s / 2, hh: s / 2, hd: s / 2 });
  }
  function createSphere(world, opts) {
    opts = opts || {};
    var r = positive(opts.radius, 0.5, 1000);
    return addMesh(world, new THREE.SphereGeometry(r, 32, 16), opts.color, { hw: r, hh: r, hd: r });
  }
  function createBlock(world, opts) {
    opts = opts || {};
    var w = positive(opts.width, 1, 1000);
    var h = positive(opts.height, 1, 1000);
    var d = positive(opts.depth, 1, 1000);
    return addMesh(world, new THREE.BoxGeometry(w, h, d), opts.color, { hw: w / 2, hh: h / 2, hd: d / 2 });
  }

  // ====================================================================
  // GENÉRICOS Fase 6: formas, materiais, texturas e montar modelo.
  // ====================================================================
  function createCylinder(world, opts) {
    opts = opts || {};
    var r = positive(opts.radius, 0.5, 1000);
    var h = positive(opts.height, 1, 1000);
    return addMesh(world, new THREE.CylinderGeometry(r, r, h, 24), opts.color, { hw: r, hh: h / 2, hd: r });
  }
  function createCone(world, opts) {
    opts = opts || {};
    var r = positive(opts.radius, 0.5, 1000);
    var h = positive(opts.height, 1, 1000);
    return addMesh(world, new THREE.ConeGeometry(r, h, 24), opts.color, { hw: r, hh: h / 2, hd: r });
  }
  function createPlane(world, opts) {
    opts = opts || {};
    var w = positive(opts.width, 10, 2000);
    var d = positive(opts.depth, 10, 2000);
    var mesh = addMesh(world, new THREE.PlaneGeometry(w, d), opts.color, { hw: w / 2, hh: 0.05, hd: d / 2 });
    // PlaneGeometry nasce em pé (no XY); deita no chão para virar piso.
    if (mesh && mesh.rotation) mesh.rotation.x = -Math.PI / 2;
    if (mesh && mesh.material && THREE.DoubleSide) mesh.material.side = THREE.DoubleSide;
    return mesh;
  }
  function createTorus(world, opts) {
    opts = opts || {};
    var r = positive(opts.radius, 0.5, 1000);
    var t = positive(opts.tube, 0.2, 1000);
    return addMesh(world, new THREE.TorusGeometry(r, t, 16, 32), opts.color, { hw: r + t, hh: r + t, hd: t });
  }
  function createModel(world) {
    if (!world || !world.scene) return null;
    if (!world._models) world._models = [];
    if (world._models.length >= MAX_OBJECTS) {
      warnOnce('model-limit', 'há modelos demais nesta cena; remova alguns antes de criar novos.');
      return null;
    }
    var g = new THREE.Group();
    world.scene.add(g);
    world._models.push(g);
    return attachWorld(g, world);
  }
  function addToModel(model, part) {
    if (model && model.add && part) model.add(part);
  }
  function eachMaterial(obj, fn) {
    if (!obj || typeof fn !== 'function') return;
    function visit(node) {
      if (!node || !node.material) return;
      var materials = node.material.length ? node.material : [node.material];
      for (var i = 0; i < materials.length; i++) if (materials[i]) fn(materials[i]);
    }
    if (obj.traverse) obj.traverse(visit); else visit(obj);
  }
  function setColor(obj, color) {
    eachMaterial(obj, function (material) {
      if (material.color && material.color.set) material.color.set(color);
    });
  }
  function setOpacity(obj, a) {
    var v = clamp(a, 0, 1, 1);
    eachMaterial(obj, function (material) {
      material.transparent = v < 1;
      material.opacity = v;
      material.needsUpdate = true;
    });
  }
  function setMaterial(obj, kind) {
    eachMaterial(obj, function (m) {
      m.wireframe = false;
      if ('metalness' in m) m.metalness = 0;
      if ('roughness' in m) m.roughness = 1;
      m.transparent = false;
      m.opacity = 1;
      if (m.emissive && m.emissive.set) m.emissive.set('#000000');
      if (kind === 'metal') {
        if ('metalness' in m) m.metalness = 1;
        if ('roughness' in m) m.roughness = 0.25;
      } else if (kind === 'glass') {
        m.transparent = true;
        m.opacity = 0.35;
        if ('roughness' in m) m.roughness = 0;
      } else if (kind === 'glow') {
        if (m.emissive && m.color && m.emissive.copy) m.emissive.copy(m.color);
      } else if (kind === 'wireframe') {
        m.wireframe = true;
      }
      m.needsUpdate = true;
    });
  }
  function setTexture(obj, asset) {
    if (!obj || !THREE.TextureLoader) return;
    var url = ASSETS[asset] || asset;
    if (!url) {
      warnOnce('texture-empty', 'escolha uma imagem válida antes de aplicar a textura.');
      return;
    }
    if (!_texCache) _texCache = {};
    var tex = _texCache[url];
    if (!tex) {
      tex = new THREE.TextureLoader().load(url, undefined, undefined, function () {
        warnOnce('texture:' + url, 'não foi possível carregar a textura "' + asset + '".');
      });
      // Pixel art do Pinta nítida de perto: só o magFilter (upscale) vira
      // nearest; minFilter/mipmaps ficam default para não serrilhar de longe.
      if (THREE.NearestFilter) {
        tex.magFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
      }
      _texCache[url] = tex;
    }
    eachMaterial(obj, function (material) {
      material.map = tex;
      material.needsUpdate = true;
    });
  }
  function setVisible(obj, mode) {
    if (obj) obj.visible = mode !== 'hide';
  }

  function setPosition(obj, x, y, z) {
    if (obj && obj.position) obj.position.set(finite(x, 0), finite(y, 0), finite(z, 0));
  }
  function setRotation(obj, x, y, z) {
    if (obj && obj.rotation) obj.rotation.set(finite(x, 0), finite(y, 0), finite(z, 0));
  }
  function setScale(obj, factor) {
    if (!obj || !obj.scale) return;
    var f = positive(factor, 1, 1000);
    obj.scale.set(f, f, f);
  }

  function setVelocity(obj, x, y, z) {
    if (!obj) return;
    var s = szData(obj);
    s.vx = finite(x, 0); s.vy = finite(y, 0); s.vz = finite(z, 0);
  }

  /** AABB estável entre dois objetos, compartilhada pelas duas camadas de física. */
  function collides(a, b) {
    if (!a || !b || !a.position || !b.position) return false;
    var sa = szData(a), sb = szData(b);
    var axh = halfX(a, sa), ayh = halfY(a, sa), azh = halfZ(a, sa);
    var bxh = halfX(b, sb), byh = halfY(b, sb), bzh = halfZ(b, sb);
    var xC = (a.position.x + axh) >= (b.position.x - bxh) && (a.position.x - axh) <= (b.position.x + bxh);
    var yC = (a.position.y - ayh) <= (b.position.y + byh) && (a.position.y + ayh) >= (b.position.y - byh);
    var zC = (a.position.z + azh) >= (b.position.z - bzh) && (a.position.z - azh) <= (b.position.z + bzh);
    return xC && yC && zC;
  }

  /** Anda pela velocidade e pousa de forma estável sobre o chão. */
  function applyGravity(obj, ground) {
    if (!obj || !obj.position) return;
    var s = szData(obj);
    var scale = frameScale(obj);
    var previousY = obj.position.y;
    s.vy += s.gravity * scale;
    obj.position.x += s.vx * scale;
    obj.position.y += s.vy * scale;
    obj.position.z += s.vz * scale;
    s.grounded = false;
    if (ground && collides(obj, ground) && s.vy <= 0) {
      var gs = szData(ground);
      var top = ground.position.y + halfY(ground, gs);
      var bottomBefore = previousY - halfY(obj, s);
      if (bottomBefore >= top - Math.max(0.1, Math.abs(s.vy * scale))) {
        obj.position.y = top + halfY(obj, s);
      } else {
        resolveAABB(obj, ground);
      }
      s.grounded = true;
      s.vy = 0;
    }
  }

  /** Pulo: só impulsiona se estiver no chão (evita "voar" segurando a tecla). */
  function jump(obj, force) {
    if (!obj) return;
    var s = szData(obj);
    var f = finite(force, 0.08);
    if (s.grounded) { s.vy = f; s.grounded = false; }
  }

  /** Movimento no plano X/Z por WASD ou setas (zera e reaplica a cada quadro). */
  function controlWithKeys(obj, speed) {
    if (!obj) return;
    var s = szData(obj);
    var sp = finite(speed, 0.05);
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
    // Tira do pai (a cena, ou o modelo onde foi montado).
    if (mesh.parent && mesh.parent.remove) mesh.parent.remove(mesh);
    else if (world.scene) world.scene.remove(mesh);
    disposeGroup(mesh, false);
    var i = world._objects.indexOf(mesh);
    if (i !== -1) world._objects.splice(i, 1);
    if (world._models) {
      var modelIndex = world._models.indexOf(mesh);
      if (modelIndex !== -1) world._models.splice(modelIndex, 1);
    }
    if (world._solids) {
      var solidIndex = world._solids.indexOf(mesh);
      if (solidIndex !== -1) world._solids.splice(solidIndex, 1);
    }
  }

  // ====================================================================
  // GENÉRICOS Fase 7: luz & céu (atmosfera). Criar UMA vez, fora do animate.
  // ====================================================================
  function _trackLight(world, light) {
    if (!world || world._lightCount >= MAX_LIGHTS) {
      warnOnce('light-limit', 'há luzes demais nesta cena; o limite é ' + MAX_LIGHTS + '.');
      if (light && light.dispose) try { light.dispose(); } catch (e) {}
      return null;
    }
    if (!world._lights) world._lights = [];
    world._lights.push(light);
    world._lightCount += 1;
    world.scene.add(light);
    return light;
  }
  function addAmbientLight(world, color, intensity) {
    if (!world || !world.scene || !THREE.AmbientLight) return null;
    var i = clamp(intensity, 0, 100, 0.6);
    return _trackLight(world, new THREE.AmbientLight(color || '#ffffff', i));
  }
  function addSunLight(world, color, intensity) {
    if (!world || !world.scene || !THREE.DirectionalLight) return null;
    var d = new THREE.DirectionalLight(color || '#ffffff', clamp(intensity, 0, 100, 0.9));
    d.position.set(5, 10, 7);
    d.castShadow = true;
    if (d.shadow && d.shadow.camera) {
      d.shadow.camera.near = 0.5; d.shadow.camera.far = 60;
      d.shadow.camera.left = -20; d.shadow.camera.right = 20;
      d.shadow.camera.top = 20; d.shadow.camera.bottom = -20;
    }
    return _trackLight(world, d);
  }
  function addPointLight(world, color, intensity, x, y, z) {
    if (!world || !world.scene || !THREE.PointLight) return null;
    var p = new THREE.PointLight(color || '#ffffff', clamp(intensity, 0, 100, 1), 0);
    p.position.set(finite(x, 0), finite(y, 0), finite(z, 0));
    p.castShadow = true;
    return _trackLight(world, p);
  }
  function setFog(world, color, near, far) {
    if (!world || !world.scene || !THREE.Fog) return;
    var n = Math.max(0, finite(near, 1));
    var f = Math.max(n + 0.01, finite(far, 30));
    world.scene.fog = new THREE.Fog(color || '#9ca3af', n, f);
  }
  function setSky(world, top, bottom) {
    if (!world || !world.scene) return;
    // Degradê topo->horizonte via canvas 2D (CSP-safe: sem shader/eval).
    if (typeof document === 'undefined' || !THREE.CanvasTexture) {
      if (THREE.Color) world.scene.background = new THREE.Color(top || '#1e3a8a');
      return;
    }
    var cv = document.createElement('canvas');
    cv.width = 2;
    cv.height = 256;
    var g = cv.getContext && cv.getContext('2d');
    if (!g) {
      if (THREE.Color) world.scene.background = new THREE.Color(top || '#1e3a8a');
      return;
    }
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top || '#1e3a8a');
    grad.addColorStop(1, bottom || '#93c5fd');
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 256);
    var old = world.scene.background;
    if (old && old.isTexture && old.dispose) try { old.dispose(); } catch (e) {}
    world.scene.background = new THREE.CanvasTexture(cv);
  }
  function setShadows(world, on) {
    if (!world || !world.renderer || !world.renderer.shadowMap) return;
    world.renderer.shadowMap.enabled = on !== 'off' && on !== false;
  }

  // ====================================================================
  // GENÉRICOS Fase 8: enxames (grupos genéricos de cópias) + som.
  // ====================================================================
  function createSwarm(world) {
    if (!world || !world.scene) return null;
    if (!world._swarms) world._swarms = [];
    if (world._swarms.length >= MAX_SWARMS) {
      warnOnce('swarm-limit', 'há enxames demais nesta cena; reutilize um enxame existente.');
      return null;
    }
    var s = { items: [], world: world };
    world._swarms.push(s);
    return s;
  }
  function spawnInSwarm(swarm, original, x, y, z) {
    if (!swarm || !swarm.items || !original || !original.clone) return null;
    if (swarm.items.length >= MAX_OBJECTS || (swarm.world._swarmItemCount || 0) >= MAX_OBJECTS) {
      warnOnce('swarm-item-limit', 'há cópias demais nos enxames desta cena; remova as que saíram da tela.');
      return null;
    }
    var copy = original.clone();
    // Material PRÓPRIO por cópia: deixa recolorir/sumir uma sem mexer nas outras,
    // e o dispose de uma cópia não mata o material do original. Geometria é
    // compartilhada (eficiente) — só o original a descarta.
    if (original.material && original.material.clone) copy.material = original.material.clone();
    if (copy.position) copy.position.set(x || 0, y || 0, z || 0);
    copy.visible = true;
    // Herda as medidas/física do original p/ a colisão funcionar nas cópias.
    if (original.userData && original.userData.sz) {
      var d = original.userData.sz;
      copy.userData = copy.userData || {};
      copy.userData.sz = { hw: d.hw, hh: d.hh, hd: d.hd, vx: 0, vy: 0, vz: 0,
        grounded: false, zAccel: false, gravity: d.gravity };
    }
    if (swarm.world && swarm.world.scene) swarm.world.scene.add(copy);
    attachWorld(copy, swarm.world);
    swarm.items.push(copy);
    swarm.world._swarmItemCount = (swarm.world._swarmItemCount || 0) + 1;
    return copy;
  }
  function countSwarm(swarm) {
    return swarm && swarm.items ? swarm.items.length : 0;
  }
  function forEachInSwarm(swarm, fn) {
    if (!swarm || !swarm.items || typeof fn !== 'function') return;
    // Iteração REVERSA: chamar removeFromSwarm de dentro não pula ninguém.
    for (var i = swarm.items.length - 1; i >= 0; i--) fn(swarm.items[i]);
  }
  function removeFromSwarm(swarm, item) {
    if (!swarm || !swarm.items || !item) return;
    var i = swarm.items.indexOf(item);
    if (i === -1) return;
    swarm.items.splice(i, 1);
    if (swarm.world) swarm.world._swarmItemCount = Math.max(0, (swarm.world._swarmItemCount || 0) - 1);
    if (item.parent && item.parent.remove) item.parent.remove(item);
    if (item.material && item.material.dispose) try { item.material.dispose(); } catch (e) {}
  }
  function pruneSwarm(swarm, axis, min, max) {
    if (!swarm || !swarm.items) return;
    var a = axis === 'x' ? 'x' : axis === 'z' ? 'z' : 'y';
    for (var i = swarm.items.length - 1; i >= 0; i--) {
      var it = swarm.items[i];
      var v = it && it.position ? it.position[a] : 0;
      if (v < min || v > max) removeFromSwarm(swarm, it);
    }
  }

  // Som: síntese por Web Audio (sem arquivos). O contexto só "acorda" depois de
  // um gesto do usuário (clique/tecla) — por isso resume() a cada toque.
  var _audio = null;
  function _ensureAudio() {
    if (_audio) return _audio;
    if (typeof window === 'undefined') return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { _audio = new AC(); } catch (e) { return null; }
    return _audio;
  }
  function _beep(type, fromHz, toHz, dur, slide) {
    var ac = _ensureAudio();
    if (!ac) return;
    if (ac.state === 'suspended' && ac.resume) try { ac.resume(); } catch (e) {}
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    var t0 = ac.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, t0);
    if (toHz !== fromHz) {
      if (slide === 'exp' && osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), t0 + dur);
      } else if (osc.frequency.linearRampToValueAtTime) {
        osc.frequency.linearRampToValueAtTime(toHz, t0 + dur);
      }
    }
    gain.gain.setValueAtTime(0.12, t0);
    if (gain.gain.exponentialRampToValueAtTime) gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  function playNote(freq, ms) {
    var f = clamp(freq, 20, 20000, 440);
    var dur = clamp(ms, 10, 10000, 200) / 1000;
    _beep('square', f, f, dur, 'none');
  }
  function playEffect(kind) {
    if (kind === 'jump') _beep('square', 300, 700, 0.16, 'linear');
    else if (kind === 'explosion') _beep('sawtooth', 180, 40, 0.4, 'exp');
    else if (kind === 'hit') _beep('square', 440, 110, 0.12, 'exp');
    else _beep('square', 880, 1320, 0.18, 'exp'); // coin (padrão)
  }

  /**
   * Kit "Desvie": a cada quadro, move os inimigos do grupo (acelerando em z) e,
   * de tempos em tempos, solta um novo lá no fundo. Inimigos que passam da câmera
   * são DESCARTADOS (cena + GPU + grupo) — sem isso o teto de objetos estouraria.
   * O ritmo (rate) acelera com o tempo, deixando o jogo mais difícil.
   */
  function runEnemies(world, group, ground, every, speed) {
    if (!world || !group) return;
    if (typeof group.__elapsed !== 'number') {
      group.__elapsed = 0;
      group.__rate = positive(every, 200, 36000) / 60;
    }
    var baseSpeed = finite(speed, 0.02);
    for (var i = group.length - 1; i >= 0; i--) {
      var e = group[i];
      if (!e) { group.splice(i, 1); continue; }
      var es = szData(e);
      if (es.zAccel) es.vz += 0.0003 * frameScale(world);
      applyGravity(e, ground);
      // Passou da câmera (player fica perto de z=0): descarta para não vazar GPU.
      if (e.position.z > 12) { removeObject(world, e); group.splice(i, 1); }
    }
    group.__elapsed += (world._dt > 0 ? world._dt : 1 / 60);
    if (group.__elapsed + 1e-9 >= group.__rate) {
      group.__elapsed -= group.__rate;
      if (group.__rate > 1 / 3) group.__rate -= 1 / 3;
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

  // ---- GENÉRICOS: ler vetores, mover/girar relativo, suavizar, tempo do quadro ----
  function getPos(obj, axis) {
    if (!obj || !obj.position) return 0;
    var a = axis === 'y' ? 'y' : axis === 'z' ? 'z' : 'x';
    return obj.position[a];
  }
  function getRot(obj, axis) {
    if (!obj || !obj.rotation) return 0;
    var a = axis === 'y' ? 'y' : axis === 'z' ? 'z' : 'x';
    return obj.rotation[a];
  }
  function getScale(obj) {
    return obj && obj.scale ? obj.scale.x : 1;
  }
  // Velocidade do objeto (por eixo x/y/z) — vive em szData(obj).vx/vy/vz (o mesmo
  // que "Mudar a velocidade" grava). "Movendo" usa um limiar pequeno.
  function getVel(obj, axis) {
    if (!obj) return 0;
    var s = szData(obj);
    var a = axis === 'y' ? 'y' : axis === 'z' ? 'z' : 'x';
    return s['v' + a] || 0;
  }
  function getSpeed(obj) {
    if (!obj) return 0;
    var s = szData(obj);
    return Math.sqrt((s.vx || 0) * (s.vx || 0) + (s.vy || 0) * (s.vy || 0) + (s.vz || 0) * (s.vz || 0));
  }
  function isMoving(obj) {
    if (!obj) return false;
    var s = szData(obj);
    return (Math.abs(s.vx || 0) + Math.abs(s.vy || 0) + Math.abs(s.vz || 0)) > 0.01;
  }
  function dt(world) {
    return world && typeof world._dt === 'number' ? world._dt : 0;
  }
  function moveBy(obj, dx, dy, dz) {
    if (!obj || !obj.position) return;
    var scale = frameScale(obj);
    obj.position.x += finite(dx, 0) * scale;
    obj.position.y += finite(dy, 0) * scale;
    obj.position.z += finite(dz, 0) * scale;
  }
  function rotateBy(obj, axis, amount) {
    if (!obj || !obj.rotation) return;
    var a = axis === 'x' ? 'x' : axis === 'z' ? 'z' : 'y';
    obj.rotation[a] += finite(amount, 0) * frameScale(obj);
  }
  function moveTowards(obj, x, y, z, t) {
    if (!obj || !obj.position) return;
    var f = finite(t, 0.1);
    if (f < 0) f = 0;
    if (f > 1) f = 1;
    f = 1 - Math.pow(1 - f, frameScale(obj));
    if (typeof x === 'number') obj.position.x += (x - obj.position.x) * f;
    if (typeof y === 'number') obj.position.y += (y - obj.position.y) * f;
    if (typeof z === 'number') obj.position.z += (z - obj.position.z) * f;
  }
  function lookAtObject(a, b) {
    if (!a || !a.lookAt || !b || !b.position) return;
    a.lookAt(b.position.x, b.position.y, b.position.z);
  }
  function lookAtPoint(obj, x, y, z) {
    if (!obj || !obj.lookAt) return;
    obj.lookAt(
      typeof x === 'number' ? x : 0,
      typeof y === 'number' ? y : 0,
      typeof z === 'number' ? z : 0
    );
  }
  function moveForward(obj, dist) {
    if (!obj || !obj.position || !obj.getWorldDirection) return;
    var d = finite(dist, 0) * frameScale(obj);
    var v = new THREE.Vector3();
    obj.getWorldDirection(v);
    obj.position.x += v.x * d;
    obj.position.y += v.y * d;
    obj.position.z += v.z * d;
  }
  function faceVelocity(obj) {
    if (!obj || !obj.position || !obj.lookAt) return;
    var s = obj.userData && obj.userData.sz;
    if (!s) return;
    if (Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vz) < 1e-6) return;
    obj.lookAt(obj.position.x + s.vx, obj.position.y + s.vy, obj.position.z + s.vz);
  }
  function angleTo(a, b) {
    if (!a || !b || !a.position || !b.position) return 0;
    return Math.atan2(b.position.x - a.position.x, b.position.z - a.position.z);
  }

  // ---- GENÉRICOS: mira & clique (raycast) ----
  // Lazy: o Raycaster/Vector3 só nascem ao usar (não quebra ambientes sem eles).
  var _ray, _down, _fwd;
  function _ensureRay() {
    if (_ray) return true;
    if (!THREE.Raycaster || !THREE.Vector3) return false;
    _ray = new THREE.Raycaster();
    _down = new THREE.Vector3(0, -1, 0);
    _fwd = new THREE.Vector3();
    return true;
  }
  function ensurePick(world) {
    if (!world || world._pickWired) return;
    world._pickWired = true;
    world._mouse = { x: 0, y: 0 };
    var canvas = world._canvas;
    function upd(e) {
      var rect = canvas && canvas.getBoundingClientRect
        ? canvas.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };
      var cx = typeof e.clientX === 'number' ? e.clientX : 0;
      var cy = typeof e.clientY === 'number' ? e.clientY : 0;
      world._mouse.x = ((cx - rect.left) / (rect.width || 1)) * 2 - 1;
      world._mouse.y = -((cy - rect.top) / (rect.height || 1)) * 2 + 1;
    }
    listen(world, window, 'pointermove', upd);
    listen(world, window, 'pointerdown', upd);
  }
  function pickList(world) {
    return world && world._objects ? world._objects : [];
  }
  function _syncMatrices(world) {
    // Sem o loop de render rodando, matrixWorld fica defasado → o raycast não
    // acha nada (ou acha na posição antiga). Atualiza antes de mirar.
    if (world.camera && world.camera.updateMatrixWorld) world.camera.updateMatrixWorld();
    if (world.scene && world.scene.updateMatrixWorld) world.scene.updateMatrixWorld(true);
  }
  function topPick(world, obj) {
    var o = obj;
    var set = pickList(world);
    while (o) {
      if (set.indexOf(o) !== -1) return o;
      o = o.parent;
    }
    return obj;
  }
  function pickAtMouse(world) {
    if (!world || !world.camera || !_ensureRay()) return null;
    ensurePick(world);
    _syncMatrices(world);
    _ray.setFromCamera(world._mouse, world.camera);
    var hits = _ray.intersectObjects(pickList(world), true);
    return hits.length ? topPick(world, hits[0].object) : null;
  }
  function pointerOver(world, obj) {
    var hit = pickAtMouse(world);
    var o = hit;
    while (o) { if (o === obj) return true; o = o.parent; }
    return false;
  }
  function aimAhead(world, obj, dist) {
    if (!world || !obj || !obj.getWorldDirection || !obj.position || !_ensureRay()) return null;
    var d = typeof dist === 'number' ? dist : 100;
    _syncMatrices(world);
    obj.getWorldDirection(_fwd);
    _ray.set(obj.position, _fwd);
    _ray.far = d;
    var hits = _ray.intersectObjects(pickList(world), true);
    _ray.far = Infinity;
    for (var i = 0; i < hits.length; i++) {
      var t = topPick(world, hits[i].object);
      if (t !== obj) return t;
    }
    return null;
  }
  function groundHit(world, obj) {
    if (!world || !obj || !obj.position || !_ensureRay()) return null;
    _syncMatrices(world);
    _ray.set(obj.position, _down);
    var hits = _ray.intersectObjects(pickList(world), true);
    for (var i = 0; i < hits.length; i++) {
      if (topPick(world, hits[i].object) !== obj) return hits[i];
    }
    return null;
  }
  function onGround(world, obj) {
    var h = groundHit(world, obj);
    if (!h) return false;
    var sy = obj.scale ? obj.scale.y : 1;
    var half = obj.userData && obj.userData.sz ? obj.userData.sz.hh * sy : 0.5;
    return h.distance <= half + 0.15;
  }
  function groundHeight(world, obj) {
    var h = groundHit(world, obj);
    return h && h.point ? h.point.y : 0;
  }

  // ---- GENÉRICOS: física (corpo, sólidos, presets plataforma/FPS) ----
  function body(obj, gravity) {
    var s = szData(obj);
    if (s) s.gravity = clamp(gravity, -10, 10, -0.01);
  }
  function setSolid(obj) {
    if (!obj) return;
    if (!obj.userData) obj.userData = {};
    obj.userData._solid = true;
    var world = worldOf(obj);
    if (world) {
      if (!world._solids) world._solids = [];
      if (world._solids.indexOf(obj) === -1) world._solids.push(obj);
    }
  }
  function resolveAABB(obj, solid) {
    if (!obj || !solid || !obj.position || !solid.position) return;
    var sa = szData(obj), sb = szData(solid);
    var ax = halfX(obj, sa), ay = halfY(obj, sa), az = halfZ(obj, sa);
    var bx = halfX(solid, sb), by = halfY(solid, sb), bz = halfZ(solid, sb);
    var dx = obj.position.x - solid.position.x;
    var dy = obj.position.y - solid.position.y;
    var dz = obj.position.z - solid.position.z;
    var ox = ax + bx - Math.abs(dx);
    var oy = ay + by - Math.abs(dy);
    var oz = az + bz - Math.abs(dz);
    if (ox <= 0 || oy <= 0 || oz <= 0) return;
    if (ox <= oy && ox <= oz) {
      obj.position.x += dx < 0 ? -ox : ox; sa.vx = 0;
    } else if (oy <= ox && oy <= oz) {
      obj.position.y += dy < 0 ? -oy : oy;
      if (dy > 0) sa.grounded = true;
      sa.vy = 0;
    } else {
      obj.position.z += dz < 0 ? -oz : oz; sa.vz = 0;
    }
  }
  function resolveCollision(a, b) {
    resolveAABB(a, b);
  }
  function stepBody(obj, world) {
    if (!obj || !obj.position || !world) return;
    var s = szData(obj);
    var scale = frameScale(world);
    s.vy += s.gravity * scale;
    s.grounded = false;
    var maxMove = Math.max(Math.abs(s.vx * scale), Math.abs(s.vy * scale), Math.abs(s.vz * scale));
    var minHalf = Math.max(0.05, Math.min(halfX(obj, s), halfY(obj, s), halfZ(obj, s)));
    var steps = Math.min(8, Math.max(1, Math.ceil(maxMove / minHalf)));
    var solids = world._solids || [];
    for (var step = 0; step < steps; step++) {
      obj.position.x += s.vx * scale / steps;
      obj.position.y += s.vy * scale / steps;
      obj.position.z += s.vz * scale / steps;
      for (var i = 0; i < solids.length; i++) {
        var o = solids[i];
        if (o !== obj) resolveAABB(obj, o);
      }
    }
  }
  function platformerControls(obj, world, speed, jump) {
    if (!obj) return;
    var s = szData(obj);
    var sp = finite(speed, 0.08);
    var jp = finite(jump, 0.18);
    var mx = 0, mz = 0;
    if (keys.ArrowLeft || keys.KeyA) mx -= 1;
    if (keys.ArrowRight || keys.KeyD) mx += 1;
    if (keys.ArrowUp || keys.KeyW) mz -= 1;
    if (keys.ArrowDown || keys.KeyS) mz += 1;
    s.vx = mx * sp;
    s.vz = mz * sp;
    if (keys.Space && s.grounded) s.vy = jp;
    stepBody(obj, world);
  }
  function fpsControls(obj, world, speed) {
    if (!obj || !world) return;
    var s = szData(obj);
    var sp = finite(speed, 0.08);
    var yaw = obj.rotation ? obj.rotation.y : 0;
    var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    var rx = Math.cos(yaw), rz = -Math.sin(yaw);
    var mf = 0, mr = 0;
    if (keys.KeyW || keys.ArrowUp) mf += 1;
    if (keys.KeyS || keys.ArrowDown) mf -= 1;
    if (keys.KeyD || keys.ArrowRight) mr += 1;
    if (keys.KeyA || keys.ArrowLeft) mr -= 1;
    s.vx = (fx * mf + rx * mr) * sp;
    s.vz = (fz * mf + rz * mr) * sp;
    if (keys.Space && s.grounded) s.vy = 0.18;
    stepBody(obj, world);
  }

  // ---- GENÉRICOS: câmeras vivas (1ª pessoa, orbital, 3ª pessoa, olhar, FOV) ----
  function fpsCamera(world, obj) {
    if (!world || !world.camera || !obj) return;
    var cam = world.camera;
    if (obj.add) obj.add(cam);
    if (cam.position) cam.position.set(0, 0.6, 0);
    if (cam.rotation) cam.rotation.set(0, 0, 0);
    world._fpsObj = obj;
    if (world._fpsWired) return;
    world._fpsWired = true;
    world._pitch = 0;
    var canvas = world._canvas;
    if (canvas && canvas.addEventListener) {
      listen(world, canvas, 'click', function () {
        if (canvas.requestPointerLock) canvas.requestPointerLock();
      });
    }
    listen(world, window, 'mousemove', function (e) {
      if (!document.pointerLockElement) return;
      var mx = e.movementX || 0, my = e.movementY || 0;
      if (world._fpsObj && world._fpsObj.rotation) world._fpsObj.rotation.y -= mx * 0.0025;
      world._pitch -= my * 0.0025;
      if (world._pitch > 1.4) world._pitch = 1.4;
      if (world._pitch < -1.4) world._pitch = -1.4;
      if (world.camera && world.camera.rotation) world.camera.rotation.x = world._pitch;
    });
  }
  function orbitCamera(world, target) {
    if (!world || !world.camera) return;
    world._orbitTarget = target || null;
    if (!world._orbit) {
      var st = { az: 0.6, el: 0.5, dist: 12, dragging: false, px: 0, py: 0 };
      world._orbit = st;
      var canvas = world._canvas;
      if (canvas && canvas.addEventListener) {
        listen(world, canvas, 'pointerdown', function (e) {
          st.dragging = true; st.px = e.clientX || 0; st.py = e.clientY || 0;
        });
        listen(world, canvas, 'wheel', function (e) {
          st.dist += e.deltaY > 0 ? 1 : -1;
          if (st.dist < 2) st.dist = 2;
          if (st.dist > 80) st.dist = 80;
        });
      }
      listen(world, window, 'pointermove', function (e) {
        if (!st.dragging) return;
        var cx = e.clientX || 0, cy = e.clientY || 0;
        st.az -= (cx - st.px) * 0.01;
        st.el -= (cy - st.py) * 0.01;
        if (st.el > 1.4) st.el = 1.4;
        if (st.el < -1.4) st.el = -1.4;
        st.px = cx; st.py = cy;
      });
      listen(world, window, 'pointerup', function () { st.dragging = false; });
    }
    updateOrbit(world);
  }
  function updateOrbit(world) {
    var st = world._orbit;
    if (!st || !world.camera || !world.camera.position) return;
    var t = world._orbitTarget;
    var tx = t && t.position ? t.position.x : 0;
    var ty = t && t.position ? t.position.y : 0;
    var tz = t && t.position ? t.position.z : 0;
    var ce = Math.cos(st.el), se = Math.sin(st.el);
    world.camera.position.set(
      tx + st.dist * ce * Math.sin(st.az),
      ty + st.dist * se,
      tz + st.dist * ce * Math.cos(st.az)
    );
    if (world.camera.lookAt) world.camera.lookAt(tx, ty, tz);
  }
  function thirdPersonCamera(world, obj, dist, height) {
    if (!world || !world.camera || !obj) return;
    if (world.scene && world.camera.parent && world.camera.parent !== world.scene) {
      world.scene.add(world.camera);
    }
    world._tpObj = obj;
    world._tpDist = typeof dist === 'number' ? dist : 6;
    world._tpHeight = typeof height === 'number' ? height : 3;
    updateThirdPerson(world);
  }
  function updateThirdPerson(world) {
    var obj = world._tpObj;
    if (!obj || !obj.position || !world.camera || !world.camera.position) return;
    var yaw = obj.rotation ? obj.rotation.y : 0;
    var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    world.camera.position.set(
      obj.position.x - fx * world._tpDist,
      obj.position.y + world._tpHeight,
      obj.position.z - fz * world._tpDist
    );
    if (world.camera.lookAt) world.camera.lookAt(obj.position.x, obj.position.y + 1, obj.position.z);
  }
  function cameraLookAt(world, obj) {
    if (!world || !world.camera || !obj || !obj.position) return;
    if (world.camera.lookAt) world.camera.lookAt(obj.position.x, obj.position.y, obj.position.z);
  }
  function setFOV(world, deg) {
    if (!world || !world.camera) return;
    if (typeof world.camera.fov === 'number') {
      world.camera.fov = clamp(deg, 10, 120, 60);
      if (world.camera.updateProjectionMatrix) world.camera.updateProjectionMatrix();
    }
  }
  function _updateCameras(world) {
    if (world._orbit) updateOrbit(world);
    if (world._tpObj) updateThirdPerson(world);
  }

  function animate(world, fn) {
    if (!world || !world.renderer) return;
    // Delta-time: passa os segundos do último quadro p/ fn (callbacks de 0 args ignoram).
    world._lastT = 0;
    world.renderer.setAnimationLoop(function (t) {
      try {
        var now = typeof t === 'number' ? t : 0;
        var d = world._lastT ? (now - world._lastT) / 1000 : 0;
        if (d < 0) d = 0;
        if (d > 0.1) d = 0.1;
        world._dt = d;
        world._lastT = now;
        fn(d);
        _updateCameras(world);
        world.renderer.render(world.scene, world.camera);
      } catch (e) {
        console.error('SZGame3D: erro durante a animação:', e);
        world.renderer.setAnimationLoop(null);
      }
    });
  }

  /** Libera GPU: para o loop e descarta geometrias/materiais/renderer. */
  function dispose(world) {
    if (!world || world._disposed) return;
    world._disposed = true;
    // Tira o mundo do registro mesmo que o descarte abaixo falhe.
    var idx = worlds.indexOf(world);
    if (idx !== -1) worlds.splice(idx, 1);
    removeWorldListeners(world);
    if (world._resizeObserver && world._resizeObserver.disconnect) {
      try { world._resizeObserver.disconnect(); } catch (e) {}
      world._resizeObserver = null;
    }
    if (document && document.pointerLockElement === world._canvas && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    if (world._ownsCanvas && world._canvas && world._canvas.parentNode) {
      try { world._canvas.parentNode.removeChild(world._canvas); } catch (e) {}
    }
    if (world._ownsCanvas && world._styleRestore && document.body) {
      document.body.style.margin = world._styleRestore.margin;
      document.body.style.background = world._styleRestore.background;
      if (document.documentElement && document.documentElement.style) {
        document.documentElement.style.overflow = world._styleRestore.overflow;
      }
    }
    // Uma única travessia cobre primitivas, modelos e objetos internos dos kits.
    // Sets impedem descarte duplicado quando uma peça também aparece em _objects.
    var seen = { geometries: new Set(), materials: new Set() };
    if (world.scene) disposeGroup(world.scene, false, seen);
    if (
      world.scene &&
      world.scene.background &&
      world.scene.background.isTexture &&
      world.scene.background.dispose
    ) {
      try { world.scene.background.dispose(); } catch (e) {}
    }
    if (world.renderer) {
      world.renderer.setAnimationLoop(null);
      try { world.renderer.dispose(); } catch (e) {}
      // \`dispose()\` sozinho NÃO devolve o contexto WebGL ao navegador — é o
      // \`forceContextLoss()\` que libera o slot de GPU e evita a cena preta
      // depois de vários "Atualizar".
      try { world.renderer.forceContextLoss(); } catch (e) {}
    }
    if (world._swarms) {
      for (var swi = 0; swi < world._swarms.length; swi++) {
        var sw = world._swarms[swi];
        if (sw && sw.items) {
          sw.items.length = 0;
        }
      }
    }
  }

  /** Descarta TODOS os mundos vivos — usado no fechamento/refresh da página. */
  function disposeAll() {
    // Copia a lista: dispose() mexe no array original via splice.
    var pending = worlds.slice();
    for (var i = 0; i < pending.length; i++) {
      try { dispose(pending[i]); } catch (e) {}
    }
    // Texturas são compartilhadas entre mundos (cache global) — libera aqui.
    if (_texCache) {
      for (var tk in _texCache) {
        if (_texCache[tk] && _texCache[tk].dispose) try { _texCache[tk].dispose(); } catch (e) {}
      }
      _texCache = null;
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
  function disposeGroup(group, disposeTextures, seen) {
    if (!group) return;
    var visited = seen || { geometries: new Set(), materials: new Set() };
    function visit(o) {
      if (!o) return;
      if (o.geometry && o.geometry.dispose && !visited.geometries.has(o.geometry)) {
        visited.geometries.add(o.geometry);
        try { o.geometry.dispose(); } catch (e) {}
      }
      if (o.material) {
        var materials = o.material.length ? o.material : [o.material];
        for (var i = 0; i < materials.length; i++) {
          var m = materials[i];
          if (!m || visited.materials.has(m)) continue;
          visited.materials.add(m);
          if (disposeTextures && m.map && m.map.dispose) try { m.map.dispose(); } catch (e2) {}
          if (m.dispose) try { m.dispose(); } catch (e3) {}
        }
      }
    }
    if (group.traverse) group.traverse(visit);
    else {
      visit(group);
      var children = group.children || [];
      for (var ci = 0; ci < children.length; ci++) disposeGroup(children[ci], disposeTextures, visited);
    }
  }

  /** Câmera ortográfica isométrica (z-up), enquadrada pelo aspecto do canvas. */
  function makeIsoCamera(canvas) {
    var w = canvas && (canvas.clientWidth || canvas.width) ? (canvas.clientWidth || canvas.width) : 480;
    var h = canvas && (canvas.clientHeight || canvas.height) ? (canvas.clientHeight || canvas.height) : 360;
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
  /** Câmera isométrica genérica no padrão Three.js (y = altura). */
  function makeYUpIsoCamera(canvas) {
    var cam = makeIsoCamera(canvas);
    cam.up.set(0, 1, 0);
    cam.position.set(12, 12, 12);
    cam.lookAt(0, 0, 0);
    return cam;
  }
  function resizeIsoCamera(cam, w, h) {
    var vs = 14, ratio = w / h;
    cam.left = (-vs * ratio) / 2; cam.right = (vs * ratio) / 2;
    cam.top = vs / 2; cam.bottom = -vs / 2;
    if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
  }

  /** Estado de grade por objeto (linha/coluna + fila de passos + animação). */
  function gridData(obj) {
    if (!obj) return null;
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.grid) {
      obj.userData.grid = {
        row: 0, col: 0, queue: [], moving: false, t: 0, tile: TS,
        sx: 0, sy: 0, ex: 0, ey: 0, targetRot: 0, inner: null, wired: false,
        yUp: true
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
    listen(world, window, 'keydown', function (e) {
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
    g.t = Math.min(1, g.t + 0.12 * frameScale(obj));
    obj.position.x = g.sx + (g.ex - g.sx) * g.t;
    var lift = Math.sin(g.t * Math.PI) * (g.tile * 0.35);
    if (g.yUp) {
      obj.position.z = g.sy + (g.ey - g.sy) * g.t;
      obj.position.y = lift;
      if (inner) inner.rotation.y = inner.rotation.y + (g.targetRot - inner.rotation.y) * g.t;
      else if (obj.rotation) obj.rotation.y = obj.rotation.y + (g.targetRot - obj.rotation.y) * g.t;
    } else {
      obj.position.y = g.sy + (g.ey - g.sy) * g.t;
      if (inner) inner.position.z = lift; else obj.position.z = lift;
      if (inner) inner.rotation.z = inner.rotation.z + (g.targetRot - inner.rotation.z) * g.t;
    }
    if (g.t >= 1) {
      g.moving = false;
      var done = g.queue.shift();
      if (done === 'forward') g.row += 1;
      else if (done === 'backward') g.row -= 1;
      else if (done === 'left') g.col -= 1;
      else if (done === 'right') g.col += 1;
      if (g.yUp) obj.position.y = 0;
      else if (inner) inner.position.z = 0;
      else obj.position.z = 0;
      return true;
    }
    return false;
  }

  // ---- Genéricos expostos ----
  function isometricCamera(world, followObj) {
    if (!world || !world.scene) return;
    var cam = makeYUpIsoCamera(world._canvas);
    world.camera = cam;
    if (followObj && followObj.add) followObj.add(cam);
    else world.scene.add(cam);
  }
  function gridPosition(obj, row, col) {
    if (!obj || !obj.position) return;
    var g = gridData(obj);
    g.yUp = true;
    g.row = row || 0; g.col = col || 0;
    obj.position.x = g.col * g.tile;
    obj.position.z = g.row * g.tile;
  }
  function gridMove(obj, dir) { enqueueMove(obj, dir, null); }
  function gridStep(obj) {
    if (!obj) return;
    wireGridKeys(obj, worldOf(obj));
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
      o.position.x += sp * frameScale(o);
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
    world._lightCount = Math.min(MAX_LIGHTS, (world._lightCount || 0) + 2);
  }

  // ---- Kit Travessia exposto ----
  function createCrossingScene(canvasId) {
    var canvas = requireCanvas(canvasId);
    for (var k = worlds.length - 1; k >= 0; k--) {
      if (worlds[k] && worlds[k]._canvas === canvas) { try { dispose(worlds[k]); } catch (e) {} }
    }
    var w = canvas.clientWidth || canvas.width || 480;
    var h = canvas.clientHeight || canvas.height || 360;
    var camera = makeIsoCamera(canvas);
    var world = _setupWorld(canvas, w, h, {
      alpha: true, background: '#87ceeb', camera: camera,
      skipLights: true, resizeCamera: resizeIsoCamera
    });
    setupCrossingLights(world);
    crossingState(world);
    // linha de início (grama segura) na linha 0 + algumas atrás.
    for (var r = 0; r > -6; r--) world._crossing.map.add(makeRowGround(r, 'grass'));
    return world;
  }

  function createCrosser(world, opts) {
    if (!world || !world.scene) return null;
    opts = opts || {};
    var cs = crossingState(world);
    if (cs.player) {
      if (cs.player.parent && cs.player.parent.remove) cs.player.parent.remove(cs.player);
      disposeGroup(cs.player, false);
      cs.player = null;
    }
    var built = makeCrosser(opts.color);
    world.scene.add(built.outer);
    attachWorld(built.outer, world);
    attachWorld(built.inner, world);
    var g = gridData(built.outer);
    g.row = 0; g.col = 0; g.tile = TS; g.inner = built.inner; g.yUp = false;
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
    var previous = cs.rowByIndex[rowIndex];
    if (previous && previous.group) {
      cs.map.remove(previous.group);
      disposeGroup(previous.group);
    } else if (Object.keys(cs.rowByIndex).length >= MAX_ROWS) {
      warnOnce('row-limit', 'o mapa já tem linhas suficientes; remova as antigas antes de criar outras.');
      return false;
    }
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
    return true;
  }

  function addRow(world, rowIndex, kind, direction, speed) {
    if (!world) return;
    var row = Math.floor(finite(rowIndex, 0));
    buildRow(world, row, kind, direction, positive(speed, 150, 10000));
  }

  function generateRows(world, count) {
    if (!world) return;
    var cs = crossingState(world);
    var kinds = ['car', 'truck', 'forest'];
    var speeds = [125, 156, 188];
    var existing = Object.keys(cs.rowByIndex).length;
    var room = Math.max(0, MAX_ROWS - existing);
    var n = Math.min(room, Math.floor(clamp(count, 0, MAX_ROWS_PER_CALL, 20)));
    if (room === 0) warnOnce('row-limit', 'o mapa já tem linhas suficientes; as antigas serão removidas conforme o personagem avança.');
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
      var step = (meta.speed || 150) / 42 / 60 * frameScale(world);
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

  // ======================================================================
  // GENÉRICOS: câmera aérea + movimento circular + distância. E Kit Corrida.
  // ======================================================================
  function makeAerialCamera(canvas) {
    var w = canvas && (canvas.clientWidth || canvas.width) ? (canvas.clientWidth || canvas.width) : 480;
    var h = canvas && (canvas.clientHeight || canvas.height) ? (canvas.clientHeight || canvas.height) : 360;
    var vs = 30; // unidades visíveis na vertical (vê a pista inteira)
    var ratio = w / h;
    var cam = new THREE.OrthographicCamera(
      (-vs * ratio) / 2, (vs * ratio) / 2, vs / 2, -vs / 2, 0.1, 2000
    );
    cam.up.set(0, 0, 1);
    cam.position.set(0, -16, 26);
    cam.lookAt(0, 0, 0);
    return cam;
  }
  /** Câmera aérea genérica no chão X-Z (y = altura). */
  function makeYUpAerialCamera(canvas) {
    var cam = makeAerialCamera(canvas);
    cam.up.set(0, 0, -1);
    cam.position.set(0, 26, 0);
    cam.lookAt(0, 0, 0);
    return cam;
  }
  function resizeAerialCamera(cam, w, h) {
    var vs = 30, ratio = w / h;
    cam.left = (-vs * ratio) / 2; cam.right = (vs * ratio) / 2;
    cam.top = vs / 2; cam.bottom = -vs / 2;
    if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
  }
  function topCamera(world, followObj) {
    if (!world || !world.scene) return;
    var cam = makeYUpAerialCamera(world._canvas);
    world.camera = cam;
    if (followObj && followObj.add) followObj.add(cam);
    else world.scene.add(cam);
  }
  function circleData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.circle) obj.userData.circle = { angle: 0 };
    return obj.userData.circle;
  }
  function moveInCircle(obj, radius, speed) {
    if (!obj || !obj.position) return;
    var c = circleData(obj);
    var r = positive(radius, 7, 10000);
    var sp = finite(speed, 0.02);
    c.angle += sp * frameScale(obj);
    obj.position.x = Math.cos(c.angle) * r;
    obj.position.z = Math.sin(c.angle) * r;
    if (obj.rotation) obj.rotation.y = -c.angle;
  }
  function distanceTo(a, b) {
    if (!a || !b || !a.position || !b.position) return 0;
    return Math.sqrt(
      (b.position.x - a.position.x) * (b.position.x - a.position.x) +
        (b.position.z - a.position.z) * (b.position.z - a.position.z)
    );
  }
  function distanceXY(a, b) {
    if (!a || !b || !a.position || !b.position) return Infinity;
    return Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y);
  }
  function isNear(a, b, dist) {
    return distanceTo(a, b) < (typeof dist === 'number' ? dist : 1);
  }

  // ---- Kit Corrida (pista oval; carro nos trilhos; rivais; voltas) ----
  var RACE_INNER = 5, RACE_OUTER = 9, RACE_MID = 7, RACE_XS = 1.5;

  function raceState(world) {
    if (!world._race) {
      world._race = {
        group: new THREE.Group(), player: null, rivals: [],
        laps: 0, gameOver: false, totalAngle: 0, spawnElapsed: 0,
        midRx: RACE_MID * RACE_XS, midRy: RACE_MID
      };
      world.scene.add(world._race.group);
    }
    return world._race;
  }
  function placeOnTrack(rs, mesh, angle, clockwise) {
    mesh.position.x = Math.cos(angle) * rs.midRx;
    mesh.position.y = Math.sin(angle) * rs.midRy;
    if (mesh.rotation) mesh.rotation.z = angle + (clockwise ? -Math.PI / 2 : Math.PI / 2);
  }
  function flatRing(inner, outer, color, z) {
    var m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), lambert(color, false));
    m.scale.x = RACE_XS;
    m.position.z = z;
    m.receiveShadow = true;
    return m;
  }

  function createRaceScene(canvasId) {
    var canvas = requireCanvas(canvasId);
    for (var k = worlds.length - 1; k >= 0; k--) {
      if (worlds[k] && worlds[k]._canvas === canvas) { try { dispose(worlds[k]); } catch (e) {} }
    }
    var w = canvas.clientWidth || canvas.width || 480;
    var h = canvas.clientHeight || canvas.height || 360;
    var camera = makeAerialCamera(canvas);
    var world = _setupWorld(canvas, w, h, {
      alpha: true, background: '#bfe3ff', camera: camera,
      skipLights: true, resizeCamera: resizeAerialCamera
    });
    setupCrossingLights(world);
    return world;
  }

  function createRaceTrack(world) {
    if (!world) return;
    var rs = raceState(world);
    if (rs.trackBuilt) return;
    rs.trackBuilt = true;
    var field = new THREE.Mesh(new THREE.PlaneGeometry(48, 34), lambert('#67C240', false));
    field.receiveShadow = true;
    rs.group.add(field);
    rs.group.add(flatRing(RACE_INNER, RACE_OUTER, '#546E90', 0.02));
    rs.group.add(flatRing(RACE_INNER, RACE_INNER + 0.15, '#E0FFFF', 0.03));
    rs.group.add(flatRing(RACE_OUTER - 0.15, RACE_OUTER, '#E0FFFF', 0.03));
    var spots = [[14, 8], [16, -7], [-15, 9], [-16, -8], [0, 12], [10, -11], [-9, -11]];
    var heights = [0.5, 1, 1.4];
    for (var i = 0; i < spots.length; i++) {
      var t = makeTree(0, heights[i % heights.length]);
      t.position.x = spots[i][0];
      t.position.y = spots[i][1];
      rs.group.add(t);
    }
  }

  function createRaceCar(world, opts) {
    if (!world || !world.scene) return null;
    opts = opts || {};
    var rs = raceState(world);
    if (rs.player) {
      rs.group.remove(rs.player);
      disposeGroup(rs.player, false);
      rs.player = null;
    }
    var car = makeCar('right', opts.color || '#ef2d56');
    rs.group.add(car);
    attachWorld(car, world);
    rs.player = car;
    rs.totalAngle = 0; rs.laps = 0;
    if (!car.userData) car.userData = {};
    car.userData.laps = 0; car.userData.throttle = 'normal';
    placeOnTrack(rs, car, Math.PI, false);
    return car;
  }

  function raceStep(car, world) {
    if (!car || !world) return;
    var rs = raceState(world);
    rs.player = car;
    if (!car.userData) car.userData = {};
    var base = 0.012;
    var accel = keys.ArrowUp || car.userData.throttle === 'accelerate';
    var brake = keys.ArrowDown || car.userData.throttle === 'decelerate';
    var sp = accel ? base * 2 : brake ? base * 0.4 : base;
    rs.totalAngle += sp * frameScale(world);
    placeOnTrack(rs, car, Math.PI + rs.totalAngle, false);
    var laps = Math.floor(rs.totalAngle / (Math.PI * 2));
    rs.laps = laps;
    car.userData.laps = laps;
  }

  function raceControl(car, mode) {
    if (!car) return;
    if (!car.userData) car.userData = {};
    car.userData.throttle = mode || 'normal';
  }

  function runRivals(world) {
    if (!world) return;
    var rs = raceState(world);
    rs.spawnElapsed = (rs.spawnElapsed || 0) + (world._dt > 0 ? world._dt : 1 / 60);
    var MAX_RIVALS = 6;
    if (rs.rivals.length < MAX_RIVALS && rs.spawnElapsed >= 2.5) {
      rs.spawnElapsed -= 2.5;
      var isTruck = Math.random() < 0.4;
      var colors = ['#a52523', '#ef2d56', '#0ad3ff', '#ff9f1c'];
      var col = colors[Math.floor(Math.random() * colors.length)];
      var mesh = isTruck ? makeTruck('right', col) : makeCar('right', col);
      attachWorld(mesh, world);
      rs.group.add(mesh);
      rs.rivals.push({
        mesh: mesh,
        angle: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.012,
        cw: Math.random() < 0.5
      });
    }
    for (var i = 0; i < rs.rivals.length; i++) {
      var rv = rs.rivals[i];
      rv.angle += (rv.cw ? -rv.speed : rv.speed) * frameScale(world);
      placeOnTrack(rs, rv.mesh, rv.angle, rv.cw);
    }
  }

  function raceHit(car, world) {
    if (!car || !world) return false;
    var rs = raceState(world);
    for (var i = 0; i < rs.rivals.length; i++) {
      if (rs.rivals[i] && distanceXY(car, rs.rivals[i].mesh) < 1.4) {
        rs.gameOver = true;
        return true;
      }
    }
    return false;
  }

  function raceLaps(car) {
    return car && car.userData && typeof car.userData.laps === 'number' ? car.userData.laps : 0;
  }

  function raceReset(car, world) {
    if (!world) return;
    var rs = raceState(world);
    for (var i = 0; i < rs.rivals.length; i++) {
      var m = rs.rivals[i] && rs.rivals[i].mesh;
      if (m) { rs.group.remove(m); disposeGroup(m); }
    }
    rs.rivals = []; rs.gameOver = false; rs.totalAngle = 0; rs.laps = 0; rs.spawnElapsed = 0;
    if (car) {
      placeOnTrack(rs, car, Math.PI, false);
      if (!car.userData) car.userData = {};
      car.userData.laps = 0; car.userData.throttle = 'normal';
    }
  }

  // ======================================================================
  // GENÉRICOS de movimento/física SEM lib (cair com tombo, deslizar, girar)
  // + Kit Empilhar (Stack). Mundo y-up: empilha em +Y, gravidade -Y.
  // ======================================================================
  var FALL_G = -0.012; // aceleração da gravidade por quadro (queda livre)

  /** Estado de queda por objeto (lazy): velocidade + giro (tombo). */
  function fallData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.szFall) {
      obj.userData.szFall = {
        vx: (Math.random() - 0.5) * 0.06, vy: 0, vz: (Math.random() - 0.5) * 0.06,
        rx: (Math.random() - 0.5) * 0.08, rz: (Math.random() - 0.5) * 0.08
      };
    }
    return obj.userData.szFall;
  }
  /** Integra 1 quadro de queda livre + giro. Devolve true quando some da tela. */
  function integrateFall(obj) {
    if (!obj || !obj.position) return true;
    var f = fallData(obj);
    var scale = frameScale(obj);
    f.vy += FALL_G * scale;
    obj.position.x += f.vx * scale; obj.position.y += f.vy * scale; obj.position.z += f.vz * scale;
    if (obj.rotation) { obj.rotation.x += f.rx * scale; obj.rotation.z += f.rz * scale; }
    return obj.position.y < -24;
  }
  /** GENÉRICO: solta o objeto em queda livre, girando, até sumir (gravidade). */
  function fall(obj) {
    if (!obj || !obj.position) return;
    if (integrateFall(obj)) {
      if (obj.parent && obj.parent.remove) obj.parent.remove(obj);
      disposeGroup(obj);
    }
  }
  /** GENÉRICO: vaivém num eixo entre min e max (plataformas, patrulha). */
  function slideData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.szSlide) obj.userData.szSlide = { dir: 1 };
    return obj.userData.szSlide;
  }
  function slideBetween(obj, axis, min, max, speed) {
    if (!obj || !obj.position) return;
    var ax = axis === 'y' ? 'y' : axis === 'z' ? 'z' : 'x';
    var lo = typeof min === 'number' ? min : -5;
    var hi = typeof max === 'number' ? max : 5;
    if (lo > hi) { var t = lo; lo = hi; hi = t; }
    var sp = finite(speed, 0.05) * frameScale(obj);
    var s = slideData(obj);
    obj.position[ax] += sp * s.dir;
    if (obj.position[ax] >= hi) { obj.position[ax] = hi; s.dir = -1; }
    else if (obj.position[ax] <= lo) { obj.position[ax] = lo; s.dir = 1; }
  }
  /** GENÉRICO: rotação contínua num eixo (moedas, hélices, planetas). */
  function spin(obj, axis, speed) {
    if (!obj || !obj.rotation) return;
    var ax = axis === 'x' ? 'x' : axis === 'z' ? 'z' : 'y';
    obj.rotation[ax] += finite(speed, 0.03) * frameScale(obj);
  }

  // ---- Kit Empilhar (torre de blocos; câmera iso que sobe) ----
  var STACK_H = 1;        // altura de cada andar
  var STACK_W0 = 3;       // largura/profundidade inicial
  var STACK_SPEED = 0.07; // velocidade que o bloco do topo desliza
  var STACK_START = 10;   // de onde o bloco entra (no eixo que desliza)
  var STACK_LIMIT = 10;   // passou disso sem soltar = errou

  /** Câmera ortográfica isométrica y-up (igual à referência: olha p/ 0,0,0). */
  function makeStackCamera(canvas) {
    var w = canvas && (canvas.clientWidth || canvas.width) ? (canvas.clientWidth || canvas.width) : 480;
    var h = canvas && (canvas.clientHeight || canvas.height) ? (canvas.clientHeight || canvas.height) : 360;
    var width = 10;
    var height = width / (w / h);
    var cam = new THREE.OrthographicCamera(
      width / -2, width / 2, height / 2, height / -2, 0, 100
    );
    cam.position.set(4, 4, 4);
    cam.lookAt(0, 0, 0);
    return cam;
  }
  function resizeStackCamera(cam, w, h) {
    var width = 10, height = width / (w / h);
    cam.left = width / -2; cam.right = width / 2;
    cam.top = height / 2; cam.bottom = height / -2;
    if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
  }
  function stackState(world) {
    if (!world._stack) {
      world._stack = {
        world: world, group: new THREE.Group(), layers: [], overhangs: [],
        moving: null, score: 0, gameOver: false
      };
      world.scene.add(world._stack.group);
    }
    return world._stack;
  }
  function layerColor(n) {
    return new THREE.Color('hsl(' + ((30 + n * 4) % 360) + ', 100%, 50%)');
  }
  function stackBox(st, x, y, z, width, depth, color) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(width, STACK_H, depth), lambert(color, false));
    mesh.position.set(x, y, z);
    st.group.add(mesh);
    return attachWorld(mesh, st.world);
  }
  /** Adiciona um andar; direction 'x'/'z' = bloco que desliza, null = base/fixo. */
  function addStackLayer(st, x, z, width, depth, direction) {
    if (st.layers.length >= MAX_STACK_LAYERS) {
      st.gameOver = true;
      warnOnce('stack-limit', 'a torre atingiu o limite seguro de ' + MAX_STACK_LAYERS + ' andares.');
      return null;
    }
    var y = STACK_H * st.layers.length;
    var mesh = stackBox(st, x, y, z, width, depth, layerColor(st.layers.length));
    var layer = { mesh: mesh, width: width, depth: depth, direction: direction || null };
    st.layers.push(layer);
    st.moving = direction ? layer : st.moving;
    return layer;
  }
  function createStackScene(canvasId) {
    var canvas = requireCanvas(canvasId);
    for (var k = worlds.length - 1; k >= 0; k--) {
      if (worlds[k] && worlds[k]._canvas === canvas) { try { dispose(worlds[k]); } catch (e) {} }
    }
    var w = canvas.clientWidth || canvas.width || 480;
    var h = canvas.clientHeight || canvas.height || 360;
    var camera = makeStackCamera(canvas);
    var world = _setupWorld(canvas, w, h, {
      alpha: true, background: '#fbe7c6', camera: camera,
      skipLights: true, resizeCamera: resizeStackCamera
    });
    var scene = world.scene;
    // Luzes y-up (a setupCrossingLights é z-up): ambiente + direcional como a referência.
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 20, 0);
    scene.add(dir);
    world._lightCount = Math.min(MAX_LIGHTS, (world._lightCount || 0) + 2);
    return world;
  }
  function createStackTower(world) {
    if (!world) return;
    var st = stackState(world);
    if (st.layers.length > 0) {
      warnOnce('stack-already-built', 'a torre já foi montada; use recomeçar para reconstruí-la.');
      return;
    }
    addStackLayer(st, 0, 0, STACK_W0, STACK_W0, null);          // fundação (fixa)
    addStackLayer(st, -STACK_START, 0, STACK_W0, STACK_W0, 'x'); // 1º bloco deslizante
    st.score = 0; st.gameOver = false;
  }
  /** O bloco do topo inteiro vira sobra e cai (errou o encaixe). */
  function stackMiss(st) {
    var lay = st.layers[st.layers.length - 1];
    if (lay && st.moving === lay) { st.overhangs.push(lay.mesh); st.moving = null; }
    st.gameOver = true;
  }
  function stackStep(world) {
    if (!world) return;
    var st = stackState(world);
    if (!st.gameOver && st.moving) {
      var ax = st.moving.direction;
      st.moving.mesh.position[ax] += STACK_SPEED * frameScale(world);
      if (st.moving.mesh.position[ax] > STACK_LIMIT) stackMiss(st);
    }
    // Câmera sobe junto com a torre (sem re-olhar: a referência só translada em Y).
    var targetY = 4 + STACK_H * Math.max(0, st.layers.length - 2);
    if (world.camera && world.camera.position.y < targetY) {
      world.camera.position.y = Math.min(targetY, world.camera.position.y + STACK_SPEED * frameScale(world));
    }
    // Sobras caindo (física manual).
    for (var i = st.overhangs.length - 1; i >= 0; i--) {
      if (integrateFall(st.overhangs[i])) {
        st.group.remove(st.overhangs[i]); disposeGroup(st.overhangs[i]);
        st.overhangs.splice(i, 1);
      }
    }
  }
  function stackDrop(world) {
    if (!world) return;
    var st = stackState(world);
    if (st.gameOver || !st.moving) return;
    var top = st.layers[st.layers.length - 1];
    var prev = st.layers[st.layers.length - 2];
    if (!prev) return;
    var dir = top.direction; // 'x' ou 'z'
    var size = dir === 'x' ? top.width : top.depth;
    var delta = top.mesh.position[dir] - prev.mesh.position[dir];
    var overhangSize = Math.abs(delta);
    var overlap = size - overhangSize;
    if (overlap <= 0) { stackMiss(st); return; }
    // Corta o bloco do topo para o tamanho do encaixe.
    if (dir === 'x') top.width = overlap; else top.depth = overlap;
    top.mesh.scale[dir] = overlap / size;
    top.mesh.position[dir] -= delta / 2;
    top.direction = null;
    st.moving = null;
    // Sobra (parte cortada) cai.
    var shift = (overlap / 2 + overhangSize / 2) * (delta < 0 ? -1 : 1);
    var ox = dir === 'x' ? top.mesh.position.x + shift : top.mesh.position.x;
    var oz = dir === 'z' ? top.mesh.position.z + shift : top.mesh.position.z;
    var ow = dir === 'x' ? overhangSize : top.width;
    var od = dir === 'z' ? overhangSize : top.depth;
    st.overhangs.push(stackBox(st, ox, top.mesh.position.y, oz, ow, od, layerColor(st.layers.length - 1)));
    // Próximo bloco: eixo oposto, tamanho do corte, entrando do início.
    var nextDir = dir === 'x' ? 'z' : 'x';
    var nx = nextDir === 'x' ? -STACK_START : top.mesh.position.x;
    var nz = nextDir === 'z' ? -STACK_START : top.mesh.position.z;
    addStackLayer(st, nx, nz, top.width, top.depth, nextDir);
    st.score = st.layers.length - 2;
  }
  function stackScore(world) {
    var st = world && world._stack;
    return st ? st.score : 0;
  }
  function stackGameOver(world) {
    var st = world && world._stack;
    return st ? !!st.gameOver : false;
  }
  function stackReset(world) {
    if (!world) return;
    var st = stackState(world);
    for (var i = st.layers.length - 1; i >= 0; i--) {
      st.group.remove(st.layers[i].mesh); disposeGroup(st.layers[i].mesh);
    }
    for (var j = st.overhangs.length - 1; j >= 0; j--) {
      st.group.remove(st.overhangs[j]); disposeGroup(st.overhangs[j]);
    }
    st.layers = []; st.overhangs = []; st.moving = null; st.score = 0; st.gameOver = false;
    if (world.camera) { world.camera.position.set(4, 4, 4); world.camera.lookAt(0, 0, 0); }
    createStackTower(world);
  }

  // Auto-registro: não dependemos de GC preguiçoso nem de o host chamar dispose.
  // pagehide cobre o caso moderno (inclui bfcache); beforeunload é o fallback.
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    window.addEventListener('pagehide', disposeAll);
    window.addEventListener('beforeunload', disposeAll);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearKeys();
    });
  }

  function runProject(fn) {
    if (typeof fn !== 'function') {
      warn('o projeto precisa de uma função de início');
      return;
    }
    try { fn(); } catch (e) { warn('erro em "Ao iniciar": ' + e); }
  }

  window.SZGame3D = {
    runProject: runProject,
    createScene: createScene,
    createFullscreenScene: createFullscreenScene,
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
    topCamera: topCamera,
    moveInCircle: moveInCircle,
    distanceTo: distanceTo,
    isNear: isNear,
    createRaceScene: createRaceScene,
    createRaceTrack: createRaceTrack,
    createRaceCar: createRaceCar,
    raceStep: raceStep,
    raceControl: raceControl,
    runRivals: runRivals,
    raceHit: raceHit,
    raceLaps: raceLaps,
    raceReset: raceReset,
    fall: fall,
    slideBetween: slideBetween,
    spin: spin,
    createStackScene: createStackScene,
    createStackTower: createStackTower,
    stackDrop: stackDrop,
    stackStep: stackStep,
    stackReset: stackReset,
    stackScore: stackScore,
    stackGameOver: stackGameOver,
    getPos: getPos,
    getRot: getRot,
    getScale: getScale,
    getVel: getVel,
    getSpeed: getSpeed,
    isMoving: isMoving,
    dt: dt,
    moveBy: moveBy,
    rotateBy: rotateBy,
    moveTowards: moveTowards,
    lookAtObject: lookAtObject,
    lookAtPoint: lookAtPoint,
    moveForward: moveForward,
    faceVelocity: faceVelocity,
    angleTo: angleTo,
    pickAtMouse: pickAtMouse,
    pointerOver: pointerOver,
    aimAhead: aimAhead,
    onGround: onGround,
    groundHeight: groundHeight,
    body: body,
    stepBody: stepBody,
    setSolid: setSolid,
    platformerControls: platformerControls,
    fpsControls: fpsControls,
    resolveCollision: resolveCollision,
    fpsCamera: fpsCamera,
    orbitCamera: orbitCamera,
    thirdPersonCamera: thirdPersonCamera,
    cameraLookAt: cameraLookAt,
    setFOV: setFOV,
    createCylinder: createCylinder,
    createCone: createCone,
    createPlane: createPlane,
    createTorus: createTorus,
    createModel: createModel,
    addToModel: addToModel,
    setColor: setColor,
    setOpacity: setOpacity,
    setMaterial: setMaterial,
    setTexture: setTexture,
    setVisible: setVisible,
    remove: removeObject,
    addAmbientLight: addAmbientLight,
    addSunLight: addSunLight,
    addPointLight: addPointLight,
    setFog: setFog,
    setSky: setSky,
    setShadows: setShadows,
    createSwarm: createSwarm,
    spawnInSwarm: spawnInSwarm,
    countSwarm: countSwarm,
    forEachInSwarm: forEachInSwarm,
    removeFromSwarm: removeFromSwarm,
    pruneSwarm: pruneSwarm,
    playNote: playNote,
    playEffect: playEffect,
    animate: animate,
    dispose: dispose,
    disposeAll: disposeAll,
    THREE: THREE
  };
})();`
