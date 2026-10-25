/**
 * 🧊 Modelos 3D de verdade (GLB) e céu de foto (HDR) no Jogo 3D Avançado.
 *
 * Desde o carregador compartilhado (review 3D, lote 2) a leitura, a fila, o orçamento,
 * os ossos (SkeletonUtils), o mixer, a pintura animada do Molda e o HDR moram em
 * `../three3dModelsRuntime.ts` (`createSzModels`), injetado pelo marcador no topo deste
 * literal. Aqui fica só o que é do MOLDE e do POOL: dono/revisão de cada recurso clonado,
 * devolução ao pool, o mixer por entidade e o céu de foto aplicado à cena.
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal.
 */
const gameKit3DModelAssetsRuntimeTemplate = `  // ---- 🧊 Modelos 3D de verdade (GLB) e céu de foto (HDR) ----
  /*__SZ_THREE_MODELS_RUNTIME__*/
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var _environmentTexture = null;
  var _pendingEnvironmentTexture = null;
  var _skyPhotoRequest = 0;  // impede uma carga antiga de vencer a escolha mais nova
  // O start() ESPERA os modelos (o MESMO array dos sons): o template fica remendado ANTES
  // do primeiro spawn, porque o spawn CLONA o template.
  var models = createSzModels({
    THREE: THREE,
    warn: warn,
    warnOnce: warnOnce,
    assets: MODELS3D,
    isDisposed: function () { return disposed; },
    trackPending: function (promise) { pending.push(promise); },
    getRenderer: function () { return renderer; },
    getScene: function () { return scene; },
    getCamera: function () { return camera; },
    fallbackNote: ' — a peça fica com a forma de reserva'
  });

  // Carrega o .glb do molde (hit na hora se já estiver no cache; senão o onReady).
  function loadModel(name, onReady) {
    return models.load(text(name, ''), onReady);
  }

  // Clone com ossos PRÓPRIOS quando há SkinnedMesh (senão o boneco anima morto).
  function cloneModel(root) {
    return models.clone(root);
  }

  // Skeletons own bone textures; geometry/materials belong to the shared model cache.
  function disposeModelSkeletons(root, released) {
    models.disposeClone(root, null, released);
  }

  // Release one obsolete clone; its recipe's materials remain alive while other clones need them.
  function disposeModelResource(resource, disposedResources) {
    if (!resource || !resource.owner) return;
    var owner = resource.owner;
    resource.owner = null;
    // O aviso de "terminou a animação" sai junto com o animador do recurso.
    if (resource.anim && resource.anim._szOff) {
      resource.anim._szOff();
      resource.anim._szOff = null;
    }
    models.disposeClone(resource.mesh, resource.anim, disposedResources && disposedResources.skeletons);
    if (resource.mesh && resource.mesh.userData) delete resource.mesh.userData.szEntity;
    owner.resourceCount--;
    releaseRetiredMoldMaterials(owner, disposedResources && disposedResources.materials);
  }

  function discardStaleModelResources(pool, mold) {
    if (!pool) return;
    var kept = 0;
    for (var i = 0; i < pool.free.length; i++) {
      var resource = pool.free[i];
      if (resource.owner === mold && resource.revision === mold.resourceRevision) pool.free[kept++] = resource;
      else disposeModelResource(resource);
    }
    pool.free.length = kept;
  }

  function returnModelResource(pool, entity, disposedResources) {
    var resource = pooledResources(entity);
    var mold = molds[entity._mold];
    if (mold && resource.owner === mold && resource.revision === mold.resourceRevision) pool.free.push(resource);
    else disposeModelResource(resource, disposedResources);
  }

  // Only for discarded runs, not recycle: active AND detached pooled roots own skeletons/mixers.
  function disposeModelPools(disposedResources) {
    for (var key in pools) {
      var pool = pools[key];
      releaseAll(pool, disposedResources);
      for (var i = 0; i < pool.free.length; i++) {
        disposeModelResource(pool.free[i], disposedResources);
      }
      pool.free.length = 0;
    }
  }

  // ---- 🕺 Animação do modelo (a lição do AnimatedObjectComponent do curso) ----

  // Monta o animador DA ENTIDADE. ⚠️ Aqui é o spawn, não o part: as peças são do
  // MOLDE (uma vez), mas a animação é de cada boneco (cada um no seu tempo).
  // Clips belong to the installed template, not merely to an entry parsed into the cache.
  function attachMixer(e, m) {
    if (!m.modelClips || !m.modelClips.length) return;
    var anim = models.animator(e.mesh, { name: m.model, clips: m.modelClips },
      { owner: 'o modelo do molde "' + e._mold + '"' });
    e._anim = anim;
    e._mixer = anim ? anim.mixer : null;
    e._clips = anim ? anim.clips : null;
    e._action = null;
    if (!anim) return;
    // ⭐ UM aviso de "terminou" por animador do pool (não por vida): o recurso passa de uma
    // vida para outra, e quem responde é a vida que o usa AGORA (o spawn atualiza _szEntity).
    anim._szEntity = e;
    anim._szOff = anim.onFinished(function (clipName) { dispatchAnimEnd(anim, clipName); });
  }

  // "Quando um X terminar a animação Y": só roda para a vida VIVA que usa este animador, e só se
  // o recurso ainda é do molde atual (um molde redefinido no meio não chama ganchos de outro).
  function dispatchAnimEnd(anim, clipName) {
    var e = anim._szEntity;
    if (!isEntity(e) || e._anim !== anim || e._resourceOwner !== molds[e._mold]) return;
    var perMold = animEndHooks[e._mold];
    var hooks = perMold ? perMold[text(clipName, '')] : null;
    if (hooks) runMoldHooks(hooks.slice(), e, 'quando terminar a animação');
  }

  // "Velocidade da animação de X": 1 normal, 0.5 câmera lenta, 2 o dobro.
  function animSpeed(e, k) {
    if (!isEntity(e) || !e._anim) return;
    e._anim.setSpeed(Math.max(0, Math.min(10, num(k, 1))));
  }

  // Toca um clipe com passagem curta (0,2 s) e aviso gentil para nome errado.
  function playAnim(e, name, loop) {
    if (!isEntity(e) || !e._anim) return;
    e._anim.play(text(name, ''), { once: loop === false });
    e._action = e._anim.action();
  }

  function stopAnim(e) {
    if (!isEntity(e) || !e._anim) return;
    e._anim.stop();
    e._action = null;
  }

  // ---- 🌤️ Céu de foto (HDR equirretangular) — vira o fundo e ilumina a cena ----

  function disposeTexture(texture, warningKey) {
    if (!texture || !texture.dispose) return;
    try { texture.dispose(); }
    catch (e) { warnOnce(warningKey, 'não consegui liberar uma textura antiga: ' + e); }
  }

  function clearEnvironmentTexture() {
    var old = _environmentTexture;
    _environmentTexture = null;
    if (scene) {
      if (scene.background === old) scene.background = null;
      if (scene.environment === old) scene.environment = null;
    }
    disposeTexture(old, 'dispose-hdr');
  }

  function clearPendingEnvironmentTexture() {
    var old = _pendingEnvironmentTexture;
    _pendingEnvironmentTexture = null;
    disposeTexture(old, 'dispose-pending-hdr');
  }

  function useEnvironmentTexture(texture) {
    if (!texture) return;
    clearEnvironmentTexture();
    if (scene && scene.background && scene.background.isTexture) {
      disposeTexture(scene.background, 'dispose-sky');
    }
    if (!scene) {
      clearPendingEnvironmentTexture();
      _pendingEnvironmentTexture = texture;
      return;
    }
    scene.background = texture;
    scene.environment = texture;
    _environmentTexture = texture;
  }

  function setSkyPhoto(name) {
    var k = text(name, '');
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'environment3d') {
      warn('o céu "' + k + '" não está no projeto (envie um arquivo .hdr)');
      return;
    }
    var request = ++_skyPhotoRequest;
    models.loadHdr(k, function (texture) {
      if (!texture) return;
      if (disposed || request !== _skyPhotoRequest) {
        disposeTexture(texture, 'dispose-stale-hdr');
        return;
      }
      useEnvironmentTexture(texture);
    });
  }

`

export const gameKit3DModelAssetsRuntimeSource = gameKit3DModelAssetsRuntimeTemplate
