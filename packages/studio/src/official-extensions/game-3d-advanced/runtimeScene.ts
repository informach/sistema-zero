/** Native scene ownership remains in the shared SDK; no second game loop or controller. */
export const gameKit3DSceneRuntimeSource = `
  var importedScene = null;
  var importedSceneController = null;
  var sceneRequest = null;
  var importedArrivals = new Set();
  var sceneRequestedInFactory = false;
  var importedFocus = null;
  var importedRayEnd = null;
  var importedCameraFrom = null;
  var importedCameraTo = null;

  function cancelImportedRequest() {
    var old = sceneRequest;
    sceneRequest = null;
    if (old) { old.controller.abort(); old.settle(false); }
  }

  function loadScene(id) {
    var sdk = window.SZScene3D;
    if (disposed || !sdk || !sdk.instalar) {
      warn('Traga um cenário do Molda para este projeto antes de carregar.');
      return Promise.resolve(false);
    }
    if (runningProjectFactory) sceneRequestedInFactory = true;
    cancelImportedRequest();
    var done = false, finish;
    var promise = new Promise(function (resolve) { finish = resolve; });
    var request = {
      id: text(id, ''), sdk: sdk, controller: new AbortController(), preparing: false,
      waitForRun: runningProjectFactory || !importedScene || !importedScene.fisica.active(), promise: promise,
      settle: function (ok) {
        if (done) return;
        done = true;
        var at = pending.indexOf(promise);
        if (at !== -1) pending.splice(at, 1);
        finish(ok);
      }
    };
    sceneRequest = request;
    pending.push(promise);
    prepareImportedScene();
    return promise;
  }

  function prepareImportedScene() {
    var request = sceneRequest;
    if (!request || request.preparing || !worldReady || !scene || disposed) return;
    request.preparing = true;
    var target = scene, capabilities = renderer && renderer.capabilities;
    Promise.resolve().then(function () { return request.sdk.instalar(request.id, target, request.controller.signal, {
      maxTextura: capabilities ? capabilities.maxTextureSize : undefined
    }); }).then(function (handle) {
      if (disposed || scene !== target || sceneRequest !== request || request.controller.signal.aborted) {
        handle.descartar(); request.settle(false); return;
      }
      var previousController = importedSceneController;
      importedSceneController = request.controller;
      importedScene = handle;
      sceneRequest = null;
      if (previousController) previousController.abort();
      setDefaultSceneBase(false);
      flushImportedArrivals();
      request.settle(true);
    }).catch(function (error) {
      if (sceneRequest === request) { sceneRequest = null; importedArrivals.clear(); }
      if (!disposed && !request.controller.signal.aborted)
        warn('Não consegui concluir a carga do cenário: ' + error);
      request.settle(false);
    });
  }

  function setDefaultSceneBase(visible) {
    if (!scene) return;
    var nodes = [groundMesh, ambientLight, sunLight];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node) continue;
      if (visible) { if (node.parent !== scene) scene.add(node); continue; }
      if (node.parent !== scene) continue;
      scene.remove(node);
      // Release their GL allocations while retaining CPU defaults for a later non-scene run.
      if (node.geometry && node.geometry.dispose) node.geometry.dispose();
      if (node.material && node.material.dispose) node.material.dispose();
      if (node.shadow) {
        if (node.shadow.map) { node.shadow.map.dispose(); node.shadow.map = null; }
        if (node.shadow.mapPass) { node.shadow.mapPass.dispose(); node.shadow.mapPass = null; }
      }
    }
  }

  function disposeImportedScene(restoreBase) {
    cancelImportedRequest();
    importedArrivals.clear();
    if (importedSceneController) importedSceneController.abort();
    importedSceneController = null;
    if (importedScene) importedScene.descartar();
    importedScene = null;
    if (restoreBase) setDefaultSceneBase(true);
  }

  function beginImportedSceneFactory() {
    cancelImportedRequest();
    importedArrivals.clear();
    sceneRequestedInFactory = false;
  }
  function finishImportedSceneFactory() {
    if (!sceneRequestedInFactory) disposeImportedScene(true);
  }

  function sceneStart(e) {
    if (!isEntity(e) || disposed) return;
    if (sceneRequest) { importedArrivals.add(e); return; }
    if (importedScene) { placeAtImportedStart(e); return; }
    warn('Carregue o cenário antes de escolher seu ponto inicial.');
  }
  function flushImportedArrivals() {
    if (sceneRequest) return;
    importedArrivals.forEach(function (e) { if (isEntity(e)) placeAtImportedStart(e); });
    importedArrivals.clear();
  }
  function placeAtImportedStart(e) {
    var handle = importedScene, m = molds[e._mold];
    if (!isEntity(e) || !m || !handle || !handle.fisica.active()) return;
    var start = window.SZScene3D.inicio(handle), c = m.col;
    var radius = Math.min((c.maxX-c.minX)/2, (c.maxY-c.minY)/2, (c.maxZ-c.minZ)/2);
    var top = start.posicao.y + 1;
    for (var n = 0; n < handle.dados.nos.length; n++) top = Math.max(top, handle.dados.nos[n].volume.max.y + 1);
    var bottom = handle.colisoes.limiteInferior == null ? start.posicao.y - 100 : handle.colisoes.limiteInferior - 1;
    var support = handle.fisica.apoio(start.posicao.x, start.posicao.z, radius, top, bottom, MIN_GROUND_Y, true);
    if (!support) { warn('O ponto inicial do cenário não tem apoio físico.'); return; }
    e.mesh.position.set(start.posicao.x, support.y - c.minY, start.posicao.z);
    e.mesh.rotation.set(0, start.giro + Math.PI, 0);
    if (camMode.kind === 'fps' && sameCamEntity(e, camMode.targetGen) && camMode.target === e)
      camMode.yaw = e.mesh.rotation.y;
    e.vx = 0; e.vy = 0; e.vz = 0; e.grounded = true;
    e._ride = null;
    e._dx = 0; e._dy = 0; e._dz = 0;
    e._lx = e.mesh.position.x; e._ly = e.mesh.position.y; e._lz = e.mesh.position.z;
    touchStatic(e); gridSync(e); freshPickMatrix(e);
  }

  function importedBodyRadius(e) {
    var m = molds[e._mold];
    if (!m) return 0.25;
    var c = m.col;
    return Math.min(c.maxX-c.minX, c.maxY-c.minY, c.maxZ-c.minZ) / 2;
  }
  function importedBodySteps(e, dx, dy, dz) {
    var steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / (importedBodyRadius(e) * 0.45)));
    if (steps > 2048) throw new Error('Corpo pequeno ou rápido demais para resolver a colisão do cenário com segurança.');
    return steps;
  }
  function resolveImportedBody(e) {
    if (!importedScene || !importedScene.fisica.active()) return;
    var m = molds[e._mold];
    if (!m) return;
    var c = m.col, p = e.mesh.position;
    var cx = (c.minX+c.maxX)/2, cz = (c.minZ+c.maxZ)/2;
    var descending = e.vy <= 0, supported = false;
    var hit = importedScene.fisica.resolve({x:p.x+cx, y:p.y+c.minY, z:p.z+cz}, c.maxY-c.minY, importedBodyRadius(e));
    p.set(hit.position.x-cx, hit.position.y-c.minY, hit.position.z-cz);
    for (var i = 0; i < hit.normals.length; i++) {
      var n = hit.normals[i];
      if (n.y >= MIN_GROUND_Y) supported = true;
      contact(e, n.x, n.y, n.z, null);
    }
    // Projecting horizontal input onto a slope may create upward velocity.
    // A non-bouncing body that arrived descending keeps its footing instead of
    // becoming airborne on the next frame. Deliberate jumps/launches and bounce stay intact.
    if (descending && supported && m.bounce <= 0 && e.vy > 0) e.vy = 0;
  }
  function supportImportedGround(e, down, fromY) {
    var m = molds[e._mold];
    if (!m || !importedScene || !importedScene.fisica.active() || e.vy > 0) return;
    var c = m.col, p = e.mesh.position, feet = p.y+c.minY;
    var top = fromY == null ? feet + SKIN : Math.max(fromY, feet) + SKIN;
    var best = importedScene.fisica.apoio(p.x+(c.minX+c.maxX)/2, p.z+(c.minZ+c.maxZ)/2, importedBodyRadius(e), top, feet-down, MIN_GROUND_Y, true);
    if (best) {
      p.y = best.y-c.minY;
      contact(e,best.normal.x,best.normal.y,best.normal.z,null);
    }
  }

  function occludeImportedCamera() {
    if (!importedScene || !importedScene.fisica.active() || !camera || camMode.kind !== 'follow' ||
        !sameCamEntity(camMode.target, camMode.targetGen)) return;
    var from = importedCameraFrom || (importedCameraFrom = new THREE.Vector3());
    var to = importedCameraTo || (importedCameraTo = new THREE.Vector3());
    camMode.target.mesh.getWorldPosition(from);
    from.y += 1;
    camera.getWorldPosition(to);
    var hit = importedScene.colisoes.rastrear(from,to);
    if (!hit) return;
    to.sub(from).normalize().multiplyScalar(Math.max(0.05,hit.distancia-0.2)).add(from);
    if (camera.parent) camera.parent.worldToLocal(to);
    camera.position.copy(to);
  }

  function updateImportedScene(dt) {
    if (!importedScene || !importedScene.fisica.active() || !camera) return;
    importedScene.atualizar(dt);
    var focus = importedFocus || (importedFocus = new THREE.Vector3());
    if (sameCamEntity(camMode.target, camMode.targetGen)) camMode.target.mesh.getWorldPosition(focus);
    else pivotInto(focus);
    importedScene.quadro(camera, focus);
  }

  // "Quando entrar na região" (as regras): a região do cenário onde está o primeiro vivo do molde.
  function sceneRegion(m, at, n) { var e; forEachAlive(m, function (x) { e = x; }); return importedScene && importedScene.regiao(e, at, n); }
`

/**
 * O que entra no lugar do cenário quando o código do projeto não usa `loadScene` nem
 * `sceneStart` (variante `sem-cenario-molda`, `sceneVariant.ts`). Sem cenário pedido nenhum
 * `importedScene`/`sceneRequest` existe: os ganchos que o motor chama sem guarda (preparar,
 * fábrica do projeto, câmera, quadro e descarte) são "nada", como no runtime completo. O motor
 * base nunca tira o chão nem as luzes padrão, então o descarte não tem o que devolver. Os
 * outros nomes do fragmento param com recado se a detecção errar.
 */
export const gameKit3DSceneAbsentRuntimeSource = `
  var importedScene = null, sceneRequest = null, importedArrivals = new Set(), importedRayEnd = null;
  function sceneAbsent() {
    throw new Error('SZGameKit3D: o cenário do Molda não foi carregado neste jogo.');
  }
  var loadScene = sceneAbsent, sceneStart = sceneAbsent, cancelImportedRequest = sceneAbsent,
    setDefaultSceneBase = sceneAbsent, flushImportedArrivals = sceneAbsent,
    placeAtImportedStart = sceneAbsent, importedBodyRadius = sceneAbsent,
    importedBodySteps = sceneAbsent, resolveImportedBody = sceneAbsent,
    supportImportedGround = sceneAbsent;
  function prepareImportedScene() {}
  function disposeImportedScene() {}
  function beginImportedSceneFactory() {}
  function finishImportedSceneFactory() {}
  function occludeImportedCamera() {}
  function updateImportedScene() {}
`
