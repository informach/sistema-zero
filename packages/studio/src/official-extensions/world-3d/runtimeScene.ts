/** Glue to the canonical scene loader. The world keeps its renderer, controls and game loop. */
export const world3DSceneRuntime = `
  var importedScene = null;
  var importedBounds = null;
  var sceneLoading = null;
  var sceneController = null;
  var sceneGeneration = 0;

  function sceneFloorLimit() {
    return importedScene ? (importedScene.colisoes.limiteInferior == null ? 0 : importedScene.colisoes.limiteInferior) - 100 : -100;
  }

  function importedGround(x, z, reference, radius) {
    if (!importedScene) return null;
    var heights = importedScene.alturas;
    var height = heights && heights.temChao({ x: x, z: z }) ? heights(x, z) : null;
    var top = reference == null ? importedBounds.max.y + 1 : reference + 0.5;
    // The footprint as well as its center (the scene's nine rays): a real foot spans narrow plank
    // joints. Arrival from above uses the first surface; walking keeps its slope check.
    var hit = importedScene.colisoes.apoio(x, z, radius, top, sceneFloorLimit(), reference == null ? 0 : 0.35);
    if (hit && (height == null || hit.y > height)) height = hit.y;
    return height;
  }

  function importedTerrain(x, z) {
    var heights = importedScene.alturas;
    if (heights) return heights.temChao({ x: x, z: z }) ? heights(x, z) : sceneFloorLimit();
    var h = importedGround(x, z, null);
    return h == null ? sceneFloorLimit() : h;
  }

  function importedWaterLevel(x, z) {
    if (importedScene) {
      var water = importedScene.agua.nivel(x, z);
      return water ? water.nivel : null;
    }
    return waterCfg ? waterCfg.y : null;
  }

  function importedArrival(x, z, radius) {
    if (!importedScene) return { x: x, y: heightAt(x, z), z: z, yaw: 0 };
    var start = window.SZScene3D.inicio(importedScene);
    var ground = importedGround(x, z, null, radius);
    var yaw = 0;
    if (start.marcador || ground == null) {
      x = start.posicao.x; z = start.posicao.z;
      ground = importedGround(x, z, null, radius);
      // The canonical explorer faces -Z; the existing World controller faces +Z.
      yaw = start.giro + Math.PI;
    }
    return { x: x, y: ground == null ? start.posicao.y : ground, z: z, yaw: yaw };
  }

  function resolveImportedMove(s, x, z, height, radius) {
    if (!importedScene) return null;
    var dx = s.x - x, dz = s.z - z;
    var steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dz * dz) / (radius * 0.45)));
    var point = new THREE.Vector3(x, s.y, z);
    var blocked = false;
    var support = null;
    for (var i = 0; i < steps; i++) {
      point.x += dx / steps;
      point.z += dz / steps;
      var contact = importedScene.colisoes.resolver(point, height, radius);
      point.copy(contact.posicao);
      support = null;
      for (var n = 0; n < contact.normais.length; n++) {
        if (Math.abs(contact.normais[n].y) < 0.7) blocked = true;
        if (contact.normais[n].y > 0.5) support = point.y;
      }
    }
    s.x = point.x; s.y = point.y; s.z = point.z;
    return { blocked: blocked, support: support };
  }

  function importedSafety(s, dt) {
    if (!importedScene) return;
    var water = importedWaterLevel(s.x, s.z);
    if (s.y < sceneFloorLimit() || (water != null && water - s.y > 1.2)) {
      var safe = _campRespawn || lastSafe;
      var radius = s === personState ? Math.min(0.45, (modelCfg.person ? modelCfg.person.size : 1.7) * 0.25) : 1.1;
      var ground = importedGround(safe.x, safe.z, safe.y, radius);
      if (ground == null) return;
      s.x = safe.x; s.z = safe.z; s.y = ground;
      s.yaw = safe.yaw;
      s.speed = 0; s.vy = 0; s.airborne = false;
      camSnap = true;
    } else if (!s.airborne && (water == null || water <= s.y)) {
      lastSafe.x = s.x; lastSafe.z = s.z; lastSafe.y = s.y; lastSafe.yaw = s.yaw;
    } else if (s === carState && !s.airborne && water != null) {
      var drag = Math.min(0.7, (water - s.y) * 0.35);
      s.speed *= Math.max(0, 1 - drag * dt * 4);
    }
  }

  function resolveImportedVertical(s, previousY, height, radius) {
    if (!importedScene || s.y === previousY) return;
    var dy = s.y - previousY;
    var steps = Math.max(1, Math.ceil(Math.abs(dy) / (radius * 0.45)));
    var point = new THREE.Vector3(s.x, previousY, s.z);
    for (var i = 0; i < steps; i++) {
      point.y += dy / steps;
      var contact = importedScene.colisoes.resolver(point, height, radius);
      point.copy(contact.posicao);
      var stopped = false;
      for (var n = 0; n < contact.normais.length; n++) {
        if (contact.normais[n].y < -0.5 && s.vy > 0) { s.vy = 0; stopped = true; }
        if (contact.normais[n].y > 0.5 && s.vy <= 0) { s.vy = 0; s.airborne = false; stopped = true; }
      }
      if (stopped) break;
    }
    s.x = point.x; s.y = point.y; s.z = point.z;
  }

  function occludeImportedCamera() {
    if (!importedScene || !camera || !_look) return;
    var hit = importedScene.colisoes.rastrear(_look, camera.position);
    if (!hit) return;
    var direction = camera.position.clone().sub(_look).normalize();
    camera.position.copy(_look).addScaledVector(direction, Math.max(0.15, hit.distancia - 0.2));
    camera.lookAt(_look);
  }

  function removeProceduralSceneBase() {
    for (var i = 0, meshes = [terrainMesh, waterMesh, grassMesh]; i < meshes.length; i++) {
      var mesh = meshes[i];
      if (!mesh) continue;
      scene.remove(mesh);
      disposeObjectTree(mesh, true);
    }
    terrainMesh = null;
    terrainField = null;
    waterMesh = null;
    waterMat = null;
    grassMesh = null;
    grassMat = null;
    tryDispose(heightTex); heightTex = null;
    tryDispose(waterFoamTex); waterFoamTex = null;
    for (var j = 0, lights = [ambientLight, sunLight]; j < lights.length; j++) if (lights[j]) lights[j].visible = false;
    _skyPhotoRequest++;
    clearEnvironmentTexture();
    clearPendingEnvironmentTexture();
    tryDispose(skyTex); skyTex = null;
  }

  function attachImportedScene() {
    if (!scene || !importedScene) return;
    removeProceduralSceneBase();
    scene.add(importedScene.cena);
    scene.background = importedScene.cena.background;
    scene.environment = importedScene.cena.environment;
    scene.fog = importedScene.cena.fog;
    scene.backgroundIntensity = importedScene.cena.backgroundIntensity;
    scene.environmentIntensity = importedScene.cena.environmentIntensity;
    if (scene.backgroundRotation) scene.backgroundRotation.copy(importedScene.cena.backgroundRotation);
    if (scene.environmentRotation) scene.environmentRotation.copy(importedScene.cena.environmentRotation);
    if (camera) {
      camera.far = Math.max(camera.far, importedBounds.getSize(new THREE.Vector3()).length() * 4);
      camera.updateProjectionMatrix();
    }
    for (var i = 0, states = [personState, carState]; i < states.length; i++) {
      var s = states[i];
      if (!s) continue;
      var radius = i === 0 ? Math.min(0.45, (modelCfg.person ? modelCfg.person.size : 1.7) * 0.25) : 1.1;
      var h = importedGround(s.x, s.z, null, radius);
      if (h != null) { s.y = h; s.vy = 0; s.airborne = false; }
    }
    camSnap = true;
  }

  function loadScene(id) {
    if (disposed) return Promise.resolve(false);
    var loader = window.SZScene3D;
    if (!loader || typeof loader.carregar !== 'function') {
      warn('traga um cenário do Molda para este projeto antes de usar o bloco');
      return Promise.resolve(false);
    }
    if (sceneController) sceneController.abort();
    var controller = new AbortController();
    sceneController = controller;
    var generation = ++sceneGeneration;
    var loading = loader.carregar(id, controller.signal, {
      maxTextura: renderer && renderer.capabilities ? renderer.capabilities.maxTextureSize : 4096
    }).then(function (result) {
      if (disposed || generation !== sceneGeneration) { result.descartar(); return false; }
      var bounds = new THREE.Box3().setFromObject(result.raiz);
      if (bounds.isEmpty() || !Number.isFinite(bounds.min.x + bounds.min.y + bounds.min.z + bounds.max.x + bounds.max.y + bounds.max.z)) {
        result.descartar(); throw Error('O cenário não tem uma região válida para explorar.');
      }
      var previous = importedScene;
      importedScene = result;
      importedBounds = bounds;
      if (!worldReady) config.world = Math.max(40, bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
      if (scene) attachImportedScene();
      if (previous) {
        if (previous.cena.parent) previous.cena.parent.remove(previous.cena);
        previous.descartar();
      }
      return true;
    }).catch(function (error) {
      if (!controller.signal.aborted) warn('não consegui usar o cenário; o mundo anterior foi preservado', error);
      return false;
    });
    sceneLoading = loading;
    loading.then(function () { if (sceneLoading === loading) sceneLoading = null; });
    return loading;
  }

  function disposeImportedScene() {
    sceneGeneration++;
    if (sceneController) sceneController.abort();
    sceneController = null;
    if (importedScene) {
      if (importedScene.cena.parent) importedScene.cena.parent.remove(importedScene.cena);
      importedScene.descartar();
    }
    importedScene = null;
    importedBounds = null;
  }
`

/**
 * O que entra no lugar do cenário quando o código do mundo não usa `loadScene` (variante
 * `sem-cenario-molda`, `sceneVariant.ts`). Sem cenário nenhum `importedScene` existe: cada gancho
 * que o motor chama sem guarda devolve exatamente o que o fragmento devolve nesse caso (a água
 * padrão do mundo, a chegada na altura do terreno, nenhum contato) ou não faz nada. Os outros
 * nomes do fragmento param com recado se a detecção errar.
 */
export const world3DSceneAbsentRuntime = `
  var importedScene = null, importedBounds = null, sceneLoading = null, sceneController = null,
    sceneGeneration = 0;
  function sceneAbsent() {
    throw new Error('SZWorld3D: o cenário do Molda não foi carregado neste mundo.');
  }
  var loadScene = sceneAbsent, sceneFloorLimit = sceneAbsent, importedGround = sceneAbsent,
    importedTerrain = sceneAbsent, removeProceduralSceneBase = sceneAbsent,
    attachImportedScene = sceneAbsent;
  function importedWaterLevel() { return waterCfg ? waterCfg.y : null; }
  function importedArrival(x, z) { return { x: x, y: heightAt(x, z), z: z, yaw: 0 }; }
  function resolveImportedMove() { return null; }
  function importedSafety() {}
  function resolveImportedVertical() {}
  function occludeImportedCamera() {}
  function disposeImportedScene() {}
`
