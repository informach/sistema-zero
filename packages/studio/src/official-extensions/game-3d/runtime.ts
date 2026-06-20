/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-3d"
 * está instalada. É um SCRIPT MODULE (importa `three` via importmap — ver
 * `runtime.esmImports`), então roda DEFERIDO e em ordem antes do código do
 * aluno (que também vira module quando há importmap de extensão).
 *
 * Expõe `window.SZGame3D` — wrapper fino e legível sobre Three.js. Higiene de
 * GPU: pixelRatio ≤ 2; ao recriar/parar o loop, dispose de geometrias/materiais
 * e `setAnimationLoop(null)`.
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
    var scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1020');
    var camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 0, 5);
    // Luz para o MeshStandardMaterial ser visível sem passo extra.
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    var world = { scene: scene, camera: camera, renderer: renderer, _objects: [], _canvas: canvas || null };
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
  }

  function addMesh(world, geo, color) {
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
    world.scene.add(mesh);
    world._objects.push(mesh);
    return mesh;
  }
  function createBox(world, opts) {
    opts = opts || {};
    var s = typeof opts.size === 'number' ? opts.size : 1;
    return addMesh(world, new THREE.BoxGeometry(s, s, s), opts.color);
  }
  function createSphere(world, opts) {
    opts = opts || {};
    var r = typeof opts.radius === 'number' ? opts.radius : 0.5;
    return addMesh(world, new THREE.SphereGeometry(r, 32, 16), opts.color);
  }

  function setPosition(obj, x, y, z) { if (obj && obj.position) obj.position.set(x, y, z); }
  function setRotation(obj, x, y, z) { if (obj && obj.rotation) obj.rotation.set(x, y, z); }

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
  }

  /** Descarta TODOS os mundos vivos — usado no fechamento/refresh da página. */
  function disposeAll() {
    // Copia a lista: dispose() mexe no array original via splice.
    var pending = worlds.slice();
    for (var i = 0; i < pending.length; i++) {
      try { dispose(pending[i]); } catch (e) {}
    }
  }

  // Auto-registro: não dependemos de GC preguiçoso nem de o host chamar dispose.
  // pagehide cobre o caso moderno (inclui bfcache); beforeunload é o fallback.
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', disposeAll);
    window.addEventListener('beforeunload', disposeAll);
  }

  window.SZGame3D = {
    createScene: createScene,
    setBackground: setBackground,
    setCameraPosition: setCameraPosition,
    createBox: createBox,
    createSphere: createSphere,
    setPosition: setPosition,
    setRotation: setRotation,
    animate: animate,
    dispose: dispose,
    disposeAll: disposeAll,
    THREE: THREE
  };
})();`
