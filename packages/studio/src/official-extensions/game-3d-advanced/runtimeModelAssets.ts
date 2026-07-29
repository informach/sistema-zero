import { dataUrlToBufferRuntimeSource } from '../assetRuntime'

const gameKit3DModelAssetsRuntimeTemplate = `  // ---- 🧊 Modelos 3D de verdade (GLB) e céu de foto (HDR) ----
  //
  // Os binários chegam como data: URL no __SZGAME_ASSETS_3D. A rede é MORTA no
  // preview (o permissionGuard mata o fetch e a CSP tem connect-src 'none'), então
  // loader.load(url) NUNCA funciona — decodificamos o base64 na mão e chamamos
  // loader.parse(arrayBuffer), que não faz I/O. Mesmo princípio da textura, que já
  // funciona hoje porque o ImageLoader usa <img> (subrecurso passivo).
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var _gltfMod = null;       // módulo do GLTFLoader (import dinâmico)
  var _hdrLoaderMod = null;
  var _hdrLoaderWaiters = [];
  var _skelMod = null;       // SkeletonUtils: clone que REAMARRA o esqueleto
  var _modelCache = null;    // nome -> { scene, clips } já parseado (clonado a cada uso)
  var _cachedModelMaterials = new Set();
  var _modelPending = null;  // nome -> FILA de callbacks (import/parse em voo)
  var _pendingModelCancels = [];
  var _hdrCache = null;      // nome -> DataTexture-base (cada uso recebe um clone)
  var _hdrPending = null;    // nome -> callbacks aguardando um único parse
  var _environmentTexture = null;
  var _pendingEnvironmentTexture = null;
  var _skyPhotoRequest = 0;  // impede uma carga antiga de vencer a escolha mais nova
  var MODEL_LOAD_TIMEOUT_MS = 10000;

  /*__SZ_DATA_URL_RUNTIME__*/

  /** Encerra esperas de GLB no teardown e solta timers/promises imediatamente. */
  function cancelPendingModelLoads() {
    while (_pendingModelCancels.length) {
      var cancel = _pendingModelCancels.pop();
      if (cancel) cancel();
    }
  }

  /**
   * Carrega o modelo do projeto e guarda no cache. Assíncrono por causa do
   * import() do addon; enquanto não chega, o molde usa a peça de reserva (a
   * criança vê um cubo e o modelo aparece quando fica pronto — nunca uma cena
   * quebrada). Chamado do part(), que roda no defineMold (antes do start).
   */
  /**
   * Clona um modelo importado. ⭐ O clone comum do Object3D NÃO reamarra o esqueleto aos
   * ossos do clone — o boneco clonado fica preso ao esqueleto do original e a
   * animação sai deformada. É por isso que o próprio curso trocou o clone comum
   * pelo SkeletonUtils.clone (cached-asset-streamer.js:135-136). Sem o addon
   * carregado, cai no clone comum: peça estática continua certa, e só o boneco
   * animado é que perderia — por isso o aviso vive no caminho da animação.
   */
  function cloneModel(root) {
    if (_skelMod && _skelMod.clone) {
      try { return _skelMod.clone(root); } catch (e) {}
    }
    return root.clone();
  }

  // ---- 🕺 Animação do modelo (a lição do AnimatedObjectComponent do curso) ----

  /**
   * Monta o mixer DA ENTIDADE. ⚠️ Aqui é o spawn, não o part: as peças são do
   * MOLDE (uma vez), mas a animação é de cada boneco (cada um no seu tempo). Foi
   * exatamente confundir esses dois tempos que gerou o bug do cubo.
   */
  function attachMixer(e, m) {
    if (!m.model || !THREE.AnimationMixer) return;
    var hit = _modelCache && _modelCache[m.model];
    if (!hit || !hit.clips || !hit.clips.length) return;
    try {
      e._mixer = new THREE.AnimationMixer(e.mesh);
      e._clips = hit.clips;
      e._action = null;
    } catch (err) {
      e._mixer = null;
    }
  }

  /** Acha o clipe pelo nome (o .glb de cada site nomeia do seu jeito). */
  function clipByName(e, name) {
    if (!e._clips) return null;
    var k = text(name, '');
    for (var i = 0; i < e._clips.length; i++) {
      if (e._clips[i] && e._clips[i].name === k) return e._clips[i];
    }
    return null;
  }

  /**
   * Toca um clipe com uma passagem CURTA de um para o outro. O curso só faz
   * .play() (e quebra num .glb sem "Idle"); o crossfade é o mínimo para o boneco
   * não picotar ao trocar de estado, e o aviso gentil é o mínimo para um nome
   * errado não derrubar o jogo.
   */
  function playAnim(e, name, loop) {
    if (!isEntity(e) || !e._mixer) return;
    var clip = clipByName(e, name);
    if (!clip) {
      warnOnce('anim:' + e._mold + ':' + text(name, ''),
        'o modelo do molde "' + e._mold + '" não tem a animação "' + text(name, '') + '"');
      return;
    }
    try {
      var next = e._mixer.clipAction(clip);
      var once = loop === false;
      var desiredLoop = once ? THREE.LoopOnce : THREE.LoopRepeat;
      // Idempotência vale enquanto a MESMA ação ainda está rodando no MESMO
      // modo. LoopOnce concluído não está mais "tocando": um novo golpe/pulo
      // precisa rebobinar; trocar repetição por uma vez também é uma ordem nova.
      if (e._action === next && next.loop === desiredLoop &&
          (!next.isRunning || next.isRunning())) return;
      var previous = e._action;
      next.reset();
      // Constantes do THREE, não os números (2200/2201) — número cravado é o tipo
      // de coisa que some sem avisar quando a lib mexe na tabela.
      next.setLoop(desiredLoop, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.fadeIn(0.2);
      next.play();
      if (previous && previous !== next) previous.fadeOut(0.2);
      e._action = next;
    } catch (err) {}
  }

  function stopAnim(e) {
    if (!isEntity(e) || !e._mixer) return;
    try { e._mixer.stopAllAction(); } catch (err) {}
    e._action = null;
  }

  /**
   * Aquece o modelo — a lição do cached-asset-streamer do curso (compileAsync +
   * initTexture). Sem isto, o PRIMEIRO inimigo que nasce compila o shader e sobe a
   * textura NO MEIO do quadro, e o jogo engasga bem na hora da ação. Best-effort:
   * o compileAsync não existe em toda versão, e aquecer é otimização — nunca pode
   * derrubar o carregamento.
   */
  function warmModel(root) {
    if (!root || !renderer || !scene || !camera) return;
    try {
      // Compila CONTRA a cena real: a permutação do shader depende de luz/névoa/
      // sombra, então aquecer noutra cena aqueceria o programa errado.
      var canCompileAsync = renderer.compileAsync &&
        (!renderer.extensions || !renderer.extensions.has || renderer.extensions.has('KHR_parallel_shader_compile'));
      if (canCompileAsync) {
        var compilation = renderer.compileAsync(root, camera, scene);
        if (compilation && compilation.catch) {
          compilation.catch(function (e) {
            if (!disposed) warnOnce('model-warm', 'não consegui aquecer um modelo 3D: ' + e);
          });
        }
      }
      else if (renderer.compile) renderer.compile(root, camera, scene);
    } catch (e) {}
    try {
      root.traverse(function (o) {
        if (!o.isMesh || !o.material || !renderer.initTexture) return;
        for (var key in o.material) {
          var t = o.material[key];
          if (t && t.isTexture) { try { renderer.initTexture(t); } catch (e) {} }
        }
      });
    } catch (e) {}
  }

  /** Mede o custo expandido do GLB depois do parse (bytes compactados não dizem custo de render). */
  function inspectModel(root) {
    var metrics = { meshes: 0, triangles: 0, bones: 0, materials: 0, drawCalls: 0 };
    var materialSet = new Set();
    try {
      root.traverse(function (o) {
        if (o.isBone) metrics.bones++;
        if (!o.isMesh || !o.geometry) return;
        metrics.meshes++;
        var geometry = o.geometry;
        if (geometry.index && geometry.index.count != null) {
          metrics.triangles += Math.floor(geometry.index.count / 3);
        } else if (geometry.attributes && geometry.attributes.position) {
          metrics.triangles += Math.floor(geometry.attributes.position.count / 3);
        }
        var materials = o.material && o.material.length ? o.material : [o.material];
        metrics.drawCalls += Math.max(1, materials.length);
        for (var i = 0; i < materials.length; i++) {
          if (materials[i]) materialSet.add(materials[i]);
        }
      });
    } catch (e) {
      return null;
    }
    metrics.materials = materialSet.size;
    return metrics;
  }

  function modelBudgetProblem(name, metrics) {
    if (!metrics) return 'não consegui medir a complexidade do modelo "' + name + '"';
    if (metrics.meshes > MAX_MODEL_MESHES) {
      return 'o modelo "' + name + '" tem ' + metrics.meshes + ' malhas — o máximo é ' + MAX_MODEL_MESHES + '; una as peças no editor 3D';
    }
    if (metrics.triangles > MAX_MODEL_TRIANGLES) {
      return 'o modelo "' + name + '" tem triângulos demais (' + metrics.triangles + ' > ' + MAX_MODEL_TRIANGLES + ')';
    }
    if (metrics.bones > MAX_MODEL_BONES) {
      return 'o modelo "' + name + '" tem ossos demais (' + metrics.bones + ' > ' + MAX_MODEL_BONES + ')';
    }
    if (metrics.materials > MAX_MODEL_MATERIALS) {
      return 'o modelo "' + name + '" tem materiais demais (' + metrics.materials + ' > ' + MAX_MODEL_MATERIALS + ')';
    }
    if (metrics.drawCalls > MAX_MODEL_DRAW_CALLS) {
      return 'o modelo "' + name + '" exige chamadas de desenho demais (' + metrics.drawCalls + ' > ' + MAX_MODEL_DRAW_CALLS + ')';
    }
    return '';
  }

  function disposeImportedModel(root, disposedResources) {
    var geometries = new Set();
    var materials = new Set();
    var textures = new Set();
    try {
      root.traverse(function (o) {
        if (o.geometry) geometries.add(o.geometry);
        var list = o.material && o.material.length ? o.material : [o.material];
        for (var i = 0; i < list.length; i++) {
          var material = list[i];
          if (!material || materials.has(material)) continue;
          materials.add(material);
          for (var key in material) {
            var value = material[key];
            if (value && value.isTexture) textures.add(value);
          }
        }
      });
    } catch (e) {
      warnOnce('dispose-imported-traverse', 'não consegui percorrer um modelo rejeitado para liberar recursos: ' + e);
    }
    textures.forEach(function (texture) {
      if (disposedResources && disposedResources.textures && disposedResources.textures.has(texture)) return;
      if (disposedResources && disposedResources.textures) disposedResources.textures.add(texture);
      if (texture.dispose) { try { texture.dispose(); } catch (e) { warnOnce('dispose-imported-texture', 'não consegui liberar uma textura de modelo rejeitado: ' + e); } }
    });
    materials.forEach(function (material) {
      if (disposedResources && disposedResources.materials && disposedResources.materials.has(material)) return;
      if (disposedResources && disposedResources.materials) disposedResources.materials.add(material);
      if (material.dispose) { try { material.dispose(); } catch (e) { warnOnce('dispose-imported-material', 'não consegui liberar um material de modelo rejeitado: ' + e); } }
    });
    geometries.forEach(function (geometry) {
      if (disposedResources && disposedResources.geometries && disposedResources.geometries.has(geometry)) return;
      if (disposedResources && disposedResources.geometries) disposedResources.geometries.add(geometry);
      if (geometry.dispose) { try { geometry.dispose(); } catch (e) { warnOnce('dispose-imported-geometry', 'não consegui liberar uma geometria de modelo rejeitado: ' + e); } }
    });
  }

  /** Materiais de um GLB cacheado são compartilhados pelos clones dos moldes. */
  function rememberCachedModelMaterials(root) {
    try {
      root.traverse(function (o) {
        var list = o.material && o.material.length ? o.material : [o.material];
        for (var i = 0; i < list.length; i++) {
          if (list[i]) _cachedModelMaterials.add(list[i]);
        }
      });
    } catch (e) {
      warnOnce('cache-model-materials', 'não consegui registrar os materiais de um modelo 3D: ' + e);
    }
  }

  function isCachedModelMaterial(material) {
    return _cachedModelMaterials.has(material);
  }

  /** O cache-base fica fora da cena; no teardown ele também precisa soltar GPU/CPU. */
  function disposeCachedModels(disposedResources) {
    if (!_modelCache) return;
    var roots = new Set();
    for (var key in _modelCache) {
      var hit = _modelCache[key];
      if (!hit || !hit.scene || roots.has(hit.scene)) continue;
      roots.add(hit.scene);
      disposeImportedModel(hit.scene, disposedResources);
    }
    _modelCache = null;
    _cachedModelMaterials = new Set();
  }

  function loadModel(name, onReady) {
    var k = text(name, '');
    if (!k || disposed) return null;
    if (!_modelCache) _modelCache = Object.create(null);
    if (_modelCache[k]) return _modelCache[k];
    if (!_modelPending) _modelPending = Object.create(null);
    // Carga JÁ em voo: entra na FILA. Antes devolvia null e DESCARTAVA o onReady —
    // dois moldes com o MESMO .glb e o segundo ficava com o cubo para sempre.
    if (_modelPending[k]) {
      if (typeof onReady === 'function') _modelPending[k].push(onReady);
      return null;
    }
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'model3d') {
      warn('o modelo "' + k + '" não está no projeto — a peça fica com a forma de reserva');
      return null;
    }
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) return null;
    _modelPending[k] = typeof onReady === 'function' ? [onReady] : [];
    // ⭐ O start() ESPERA esta promessa (o MESMO array dos sons, com a tela de
    // "carregando" que já existe). É o que garante que o template está remendado
    // ANTES do primeiro spawn — senão toda entidade nascida durante o parse ficava
    // com o cubo para sempre, porque o spawn CLONA o template. Nunca REJEITA: um
    // modelo quebrado não pode travar a criança na tela de carregando.
    var release = null;
    pending.push(new Promise(function (resolve) { release = resolve; }));
    var settled = false;
    var timer = null;
    var cancel = null;
    var flush = function (hit) {
      if (settled) return;
      settled = true;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      var cancelIndex = _pendingModelCancels.indexOf(cancel);
      if (cancelIndex >= 0) _pendingModelCancels.splice(cancelIndex, 1);
      var queue = _modelPending[k] || [];
      delete _modelPending[k];
      if (hit) {
        for (var i = 0; i < queue.length; i++) {
          try { queue[i](hit); } catch (e) {}
        }
      }
      if (release) release();
    };
    cancel = function () { flush(null); };
    _pendingModelCancels.push(cancel);
    var finish = function (mod) {
      if (settled) return;
      if (disposed) { flush(null); return; }
      _gltfMod = mod;
      try {
        new mod.GLTFLoader().parse(buf, '', function (gltf) {
          if (settled) {
            if (gltf && gltf.scene) disposeImportedModel(gltf.scene);
            return;
          }
          if (gltf && gltf.scene) {
            // O loader não oferece cancelamento do parse. Se o iframe morreu no
            // meio, a conclusão tardia é dona destes recursos e deve descartá-los
            // em vez de repovoar caches de um runtime encerrado.
            if (disposed) {
              disposeImportedModel(gltf.scene);
              flush(null);
              return;
            }
            var metrics = inspectModel(gltf.scene);
            var problem = modelBudgetProblem(k, metrics);
            if (problem) {
              warn(problem + ' — a peça fica com a forma de reserva');
              disposeImportedModel(gltf.scene);
              flush(null);
              return;
            }
            // Guarda os CLIPES junto: são eles que dão vida ao boneco (a lição do
            // AnimatedObjectComponent do curso). Antes o gltf.animations ia no lixo.
            rememberCachedModelMaterials(gltf.scene);
            _modelCache[k] = { scene: gltf.scene, clips: gltf.animations || [], metrics: metrics };
            warmModel(gltf.scene);
            flush(_modelCache[k]);
          } else {
            warn('o modelo "' + k + '" veio vazio — a peça fica com a forma de reserva');
            flush(null);
          }
        }, function (err) {
          if (!disposed) warn('não consegui abrir o modelo "' + k + '": ' + err);
          flush(null);
        });
      } catch (e) {
        warn('não consegui abrir o modelo "' + k + '": ' + e);
        flush(null);
      }
    };
    timer = setTimeout(function () {
      if (!disposed) warn('o modelo "' + k + '" demorou demais para carregar — a peça fica com a forma de reserva');
      flush(null);
    }, MODEL_LOAD_TIMEOUT_MS);
    if (_gltfMod) { finish(_gltfMod); return null; }
    try {
      // Os DOIS addons antes de parsear. O SkeletonUtils é opcional (catch -> null):
      // sem ele o clone não reamarra o esqueleto e só a ANIMAÇÃO se perde — a peça
      // estática continua certa. Esperar os dois evita a corrida de clonar o
      // template antes de o SkeletonUtils chegar.
      Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/utils/SkeletonUtils.js').catch(function () { return null; })
      ]).then(function (mods) {
        if (disposed) { flush(null); return; }
        if (mods[1] && mods[1].clone) _skelMod = mods[1];
        finish(mods[0]);
      }, function (e) {
        if (!disposed) warn('não consegui carregar o leitor de modelos: ' + e);
        flush(null);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de modelos: ' + e);
      flush(null);
    }
    return null;
  }

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

  function cloneHdrTexture(base) {
    if (!base) return null;
    var texture = base.clone ? base.clone() : null;
    if (!texture && base.image) {
      texture = new THREE.DataTexture(base.image.data, base.image.width, base.image.height);
    }
    if (!texture) return null;
    if (THREE.EquirectangularReflectionMapping != null) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
    }
    texture.needsUpdate = true;
    return texture;
  }

  function withHdrLoader(callback) {
    if (_hdrLoaderMod) { callback(_hdrLoaderMod); return; }
    _hdrLoaderWaiters.push(callback);
    if (_hdrLoaderWaiters.length > 1) return;
    var finish = function (mod) {
      if (mod) _hdrLoaderMod = mod;
      var waiters = _hdrLoaderWaiters.slice();
      _hdrLoaderWaiters.length = 0;
      for (var i = 0; i < waiters.length; i++) waiters[i](mod);
    };
    try {
      import('three/addons/loaders/HDRLoader.js').then(finish, function (e) {
        warn('não consegui carregar o leitor de céu: ' + e);
        finish(null);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de céu: ' + e);
      finish(null);
    }
  }

  function loadHdrTexture(name, entry, callback) {
    if (!_hdrCache) _hdrCache = Object.create(null);
    if (_hdrCache[name]) { callback(cloneHdrTexture(_hdrCache[name])); return; }
    if (!_hdrPending) _hdrPending = Object.create(null);
    if (_hdrPending[name]) { _hdrPending[name].push(callback); return; }
    _hdrPending[name] = [callback];
    var flush = function (base) {
      var queue = _hdrPending && _hdrPending[name] ? _hdrPending[name] : [];
      if (_hdrPending) delete _hdrPending[name];
      for (var i = 0; i < queue.length; i++) queue[i](cloneHdrTexture(base));
    };
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) { warn('não consegui ler os dados do céu "' + name + '"'); flush(null); return; }
    withHdrLoader(function (mod) {
      if (!mod) { flush(null); return; }
      try {
        var parsed = new mod.HDRLoader().parse(buf);
        if (!parsed) { flush(null); return; }
        var base = parsed.isTexture
          ? parsed
          : new THREE.DataTexture(parsed.data, parsed.width, parsed.height);
        if (!parsed.isTexture) {
          if (parsed.type != null) base.type = parsed.type;
          if (THREE.LinearSRGBColorSpace != null) base.colorSpace = THREE.LinearSRGBColorSpace;
          if (THREE.LinearFilter != null) {
            base.minFilter = THREE.LinearFilter;
            base.magFilter = THREE.LinearFilter;
          }
          base.generateMipmaps = false;
          base.flipY = true;
        }
        if (THREE.EquirectangularReflectionMapping != null) {
          base.mapping = THREE.EquirectangularReflectionMapping;
        }
        base.needsUpdate = true;
        if (disposed) {
          disposeTexture(base, 'dispose-late-hdr');
          flush(null);
          return;
        }
        _hdrCache[name] = base;
        flush(base);
      } catch (e) {
        warn('não consegui abrir o céu "' + name + '": ' + e);
        flush(null);
      }
    });
  }

  /** Céu de FOTO (HDR equirretangular) — vira o fundo e ilumina a cena. */
  function setSkyPhoto(name) {
    var k = text(name, '');
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'environment3d') {
      warn('o céu "' + k + '" não está no projeto (envie um arquivo .hdr)');
      return;
    }
    var request = ++_skyPhotoRequest;
    loadHdrTexture(k, entry, function (texture) {
      if (!texture) return;
      if (disposed || request !== _skyPhotoRequest) {
        disposeTexture(texture, 'dispose-stale-hdr');
        return;
      }
      useEnvironmentTexture(texture);
    });
  }

`

export const gameKit3DModelAssetsRuntimeSource = gameKit3DModelAssetsRuntimeTemplate.replace(
  '  /*__SZ_DATA_URL_RUNTIME__*/',
  dataUrlToBufferRuntimeSource,
)
