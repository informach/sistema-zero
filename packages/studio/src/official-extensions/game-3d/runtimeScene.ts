/** Scene ownership stays in the shared SDK; this fragment adapts the existing game world. */
export const gameThreeDSceneRuntimeSource = `
  function loadScene(world, id) {
    if (!world || world._disposed || !world.scene || !world.renderer) {
      warn('Escolha uma cena do Jogo 3D para receber o cenário.');
      return Promise.resolve(false);
    }
    var sdk = window.SZScene3D;
    if (!sdk || !sdk.instalar) {
      warn('Traga um cenário do Molda para este projeto antes de carregar.');
      return Promise.resolve(false);
    }
    var previous = world._scenePending;
    var pending = { controller: new AbortController() };
    world._scenePending = pending;
    if (previous) previous.controller.abort();
    var capabilities = world.renderer.capabilities;
    return sdk.instalar(id, world.scene, pending.controller.signal, {
      maxTextura: capabilities ? capabilities.maxTextureSize : undefined
    }).then(function (handle) {
      if (world._disposed || world._scenePending !== pending) {
        handle.descartar();
        return false;
      }
      var previousController = world._sceneController;
      world._sceneController = pending.controller;
      world._sceneHandle = handle;
      world._scenePending = null;
      if (previousController) previousController.abort();
      removeDefaultSceneLights(world);
      var arrivals = world._sceneArrivals;
      if (arrivals) {
        arrivals.forEach(function (obj) { placeAtImportedStart(world, obj); });
        arrivals.clear();
      }
      return true;
    }, function (error) {
      if (world._scenePending === pending && world._sceneArrivals) world._sceneArrivals.clear();
      if (!world._disposed && !pending.controller.signal.aborted)
        warn('Não consegui usar o cenário; a base anterior foi preservada: ' + error);
      return false;
    }).finally(function () {
      if (world._scenePending === pending) world._scenePending = null;
    });
  }

  function removeDefaultSceneLights(world) {
    var lights = world._sceneBaseLights || [];
    for (var i = 0; i < lights.length; i++) {
      var light = lights[i];
      world.scene.remove(light);
      if (world._shadowSun === light) world._shadowSun = null;
      if (light.dispose) light.dispose();
    }
    world._lightCount = Math.max(0, world._lightCount - lights.length);
    world._sceneBaseLights = [];
  }

  function sceneStart(obj) {
    var world = worldOf(obj);
    if (!world || world._disposed || obj._szRemoved) return;
    if (world._scenePending) {
      if (!world._sceneArrivals) world._sceneArrivals = new Set();
      world._sceneArrivals.add(obj);
    } else if (world._sceneHandle) placeAtImportedStart(world, obj);
    else warn('Carregue o cenário antes de escolher seu ponto inicial.');
  }

  function placeAtImportedStart(world, obj) {
    if (!obj || obj._szRemoved || world._disposed || worldOf(obj) !== world) return;
    var handle = world._sceneHandle;
    if (!handle || !handle.fisica.active()) return;
    var start = window.SZScene3D.inicio(handle), state = szData(obj);
    var radius = importedBodyRadius(obj, state);
    var top = start.posicao.y + 1;
    for (var n = 0; n < handle.dados.nos.length; n++) top = Math.max(top, handle.dados.nos[n].volume.max.y + 1);
    var bottom = handle.colisoes.limiteInferior == null ? start.posicao.y - 100 : handle.colisoes.limiteInferior - 1;
    var support = null;
    for (var i = 0; i < 9; i++) {
      var angle = (i - 1) * Math.PI / 4;
      var x = start.posicao.x + (i ? Math.cos(angle) * radius * 0.75 : 0);
      var z = start.posicao.z + (i ? Math.sin(angle) * radius * 0.75 : 0);
      var hit = handle.colisoes.rastrear(new THREE.Vector3(x, top, z), new THREE.Vector3(x, bottom, z));
      if (hit && hit.normal.y > 0 && (support == null || hit.ponto.y > support)) support = hit.ponto.y;
    }
    if (support == null) { warn('O ponto inicial do cenário não tem apoio físico.'); return; }
    obj.position.set(start.posicao.x, support + Math.abs(halfY(obj, state)), start.posicao.z);
    if (obj.rotation) obj.rotation.y = start.giro + (world._cameraMode === 'fps' && world._fpsObj === obj ? 0 : Math.PI);
    state.vx = 0; state.vy = 0; state.vz = 0; state.grounded = true;
  }

  function disposeImportedScene(world) {
    if (world._scenePending) world._scenePending.controller.abort();
    world._scenePending = null;
    if (world._sceneController) world._sceneController.abort();
    world._sceneController = null;
    if (world._sceneHandle) world._sceneHandle.descartar();
    world._sceneHandle = null;
    if (world._sceneArrivals) world._sceneArrivals.clear();
  }

  function updateImportedScene(world, dt) {
    var handle = world._sceneHandle;
    if (!handle || !handle.fisica.active()) return;
    handle.atualizar(dt);
    var target = world._tpObj || world._camFollowTarget || world._fpsObj || world._orbitTarget;
    var focus = new THREE.Vector3();
    if (target && target.getWorldPosition) target.getWorldPosition(focus);
    else world.camera.getWorldPosition(focus);
    handle.quadro(world.camera, focus);
  }

  function importedBodyRadius(obj, state) {
    return Math.min(Math.abs(halfX(obj, state)), Math.abs(halfY(obj, state)), Math.abs(halfZ(obj, state)));
  }

  function supportImportedFeet(world, obj) {
    var handle = world._sceneHandle;
    if (!handle || !handle.fisica.active()) return;
    var s = szData(obj), half = Math.abs(halfY(obj, s)), feet = obj.position.y - half;
    var radius = importedBodyRadius(obj, s), support = null;
    for (var i = 0; i < 9; i++) {
      var angle = (i - 1) * Math.PI / 4;
      var x = obj.position.x + (i ? Math.cos(angle) * radius * 0.75 : 0);
      var z = obj.position.z + (i ? Math.sin(angle) * radius * 0.75 : 0);
      var hit = handle.colisoes.rastrear(new THREE.Vector3(x, feet + half * 0.38, z), new THREE.Vector3(x, feet - half * 0.24, z));
      if (hit && hit.normal.y > 0.5 && (support == null || hit.ponto.y > support)) support = hit.ponto.y;
    }
    if (support != null) {
      obj.position.y = support + half;
      s.vy = 0; s.grounded = true;
      _recordHit(s, handle.raiz, 'pes');
    }
  }

  function resolveImportedBody(world, obj) {
    var handle = world._sceneHandle;
    if (!handle || !handle.fisica.active()) return;
    var s = szData(obj), half = Math.abs(halfY(obj, s));
    var contact = handle.fisica.resolve({ x: obj.position.x, y: obj.position.y - half, z: obj.position.z }, half * 2, importedBodyRadius(obj, s));
    obj.position.set(contact.position.x, contact.position.y + half, contact.position.z);
    for (var i = 0; i < contact.normals.length; i++) {
      var n = contact.normals[i];
      var speed = s.vx * n.x + s.vy * n.y + s.vz * n.z;
      if (n.y > 0.5 && speed <= 0.00001) s.grounded = true;
      if (speed < 0) { s.vx -= speed * n.x; s.vy -= speed * n.y; s.vz -= speed * n.z; }
      var side = n.y > 0.5 ? 'pes' : n.y < -0.5 ? 'cabeca' : Math.abs(n.x) > Math.abs(n.z) ? (n.x > 0 ? 'esquerda' : 'direita') : (n.z > 0 ? 'tras' : 'frente');
      _recordHit(s, handle.raiz, side);
    }
    if (s.grounded && Math.abs(s.vy) < 0.00001) s.vy = 0;
  }

  function importedGroundHit(world, origin) {
    var handle = world._sceneHandle;
    if (!handle || !handle.fisica.active()) return null;
    var bottom = handle.colisoes.limiteInferior == null ? origin.y - 100 : handle.colisoes.limiteInferior - 1;
    if (bottom >= origin.y) return null;
    var hit = handle.colisoes.rastrear(origin, new THREE.Vector3(origin.x, bottom, origin.z));
    return hit && hit.normal.y > 0.35 ? { distance: hit.distancia, point: hit.ponto, object: handle.raiz } : null;
  }

  function occludeImportedCamera(world) {
    var handle = world._sceneHandle;
    var target = world._cameraMode === 'follow' ? world._camFollowTarget : world._cameraMode === 'third-person' ? world._tpObj : null;
    if (!handle || !handle.fisica.active() || !target || !target.getWorldPosition) return;
    var from = target.getWorldPosition(new THREE.Vector3());
    if (world._cameraMode === 'third-person') from.y += 1;
    var to = world.camera.getWorldPosition(new THREE.Vector3());
    var hit = handle.colisoes.rastrear(from, to);
    if (!hit) return;
    to.sub(from).normalize().multiplyScalar(Math.max(0.05, hit.distancia - 0.2)).add(from);
    if (world.camera.parent) world.camera.parent.worldToLocal(to);
    world.camera.position.copy(to);
  }
`
