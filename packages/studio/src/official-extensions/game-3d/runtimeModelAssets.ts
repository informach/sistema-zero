import { dataUrlToBufferRuntimeSource } from '../assetRuntime'

/**
 * Modelos de VERDADE (`.glb`) e céu de FOTO (`.hdr`) no kit iniciante Jogo 3D (lote 7
 * do Molda, 04/09/2026): é o que deixa a criança usar, no primeiro kit, o que ela
 * montou no Molda. Porte enxuto do `game-3d-advanced/runtimeModelAssets.ts` (sem
 * animação, sem SkeletonUtils, sem molde/pool): aqui o modelo vira um OBJETO comum
 * da cena, com tudo o que um objeto tem (mover, girar, colidir, pintar).
 *
 * O fragmento roda DENTRO da IIFE do runtime principal (mesmo mecanismo do Kit
 * Plataforma), então enxerga `THREE`, `addMesh`, `warn`, `warnOnce`, `positive` e os
 * demais utilitários sem criar outro global.
 *
 * ⭐ `runProject` é SÍNCRONO e o parse do GLB não é: o objeto nasce como um cubo de
 * reserva (pelo `addMesh`, que o registra em `_objects` e liga o mundo) e as malhas do
 * arquivo são penduradas nele quando o parse resolve, com o cubo escondido. O aluno
 * guarda a MESMA referência o tempo todo — e um modelo que falhe deixa o cubo, nunca
 * uma cena quebrada.
 *
 * ⚠️ As geometrias e texturas do GLB parseado são compartilhadas por todos os objetos
 * do mesmo arquivo (cache por nome) e marcadas `szCachedModel`: o descarte de um mundo
 * as PULA (senão fechar uma cena mataria os objetos da outra), e quem as libera é o
 * `disposeAll` (refresh/fechar), como o `_texCache`. Os MATERIAIS são clonados por
 * objeto, para "Pintar de" tingir um sem tingir os outros.
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal.
 */
const gameThreeDModelAssetsRuntimeTemplate = `
  // ====================================================================
  // MODELOS .glb E CÉU .hdr — o que a criança trouxe do Molda (ou enviou).
  // ====================================================================
  // Os binários chegam como data: URL em window.__SZGAME_ASSETS_3D (nome -> {kind, dataUrl}).
  // A rede é MORTA no preview (connect-src 'none' + permissionGuard), então loader.load(url)
  // NUNCA funciona: decodificamos o base64 na mão e chamamos loader.parse(arrayBuffer).
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var _gltfMod = null;        // módulo do GLTFLoader (import dinâmico, uma vez)
  var _hdrMod = null;         // módulo do HDRLoader
  var _hdrWaiters = [];
  var _modelCache = null;     // nome -> { scene, metrics } já parseado (clonado a cada uso)
  var _modelPending = null;   // nome -> FILA de callbacks (import/parse em voo)
  var _hdrCache = null;       // nome -> DataTexture-base (cada mundo recebe um clone)
  var _hdrPending = null;
  var MODEL_LOAD_TIMEOUT_MS = 10000;
  // Orçamento por modelo (o mesmo do Jogo 3D Avançado): um GLB de criança cabe folgado; um
  // modelo pesado de site é recusado com recado, em vez de travar o quadro para sempre.
  var MAX_MODEL_MESHES = 48;
  var MAX_MODEL_TRIANGLES = 500000;
  var MAX_MODEL_MATERIALS = 64;
  var MAX_MODEL_DRAW_CALLS = 96;

  /*__SZ_DATA_URL_RUNTIME__*/

  /** Mede o custo expandido do GLB depois do parse (bytes compactados não dizem custo de render). */
  function inspectModel(root) {
    var metrics = { meshes: 0, triangles: 0, materials: 0, drawCalls: 0 };
    var materialSet = new Set();
    try {
      root.traverse(function (o) {
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
      return 'o modelo "' + name + '" tem ' + metrics.meshes + ' malhas (o máximo é ' + MAX_MODEL_MESHES + '); junte as peças no Molda';
    }
    if (metrics.triangles > MAX_MODEL_TRIANGLES) {
      return 'o modelo "' + name + '" tem triângulos demais (' + metrics.triangles + ' > ' + MAX_MODEL_TRIANGLES + ')';
    }
    if (metrics.materials > MAX_MODEL_MATERIALS) {
      return 'o modelo "' + name + '" tem materiais demais (' + metrics.materials + ' > ' + MAX_MODEL_MATERIALS + ')';
    }
    if (metrics.drawCalls > MAX_MODEL_DRAW_CALLS) {
      return 'o modelo "' + name + '" exige chamadas de desenho demais (' + metrics.drawCalls + ' > ' + MAX_MODEL_DRAW_CALLS + ')';
    }
    return '';
  }

  /** Geometrias e texturas do cache são de TODOS os objetos do arquivo: o descarte por mundo pula. */
  function markCachedModelResources(root) {
    try {
      root.traverse(function (o) {
        if (o.geometry) {
          o.geometry.userData = o.geometry.userData || {};
          o.geometry.userData.szCachedModel = true;
        }
        var list = o.material && o.material.length ? o.material : [o.material];
        for (var i = 0; i < list.length; i++) {
          var material = list[i];
          if (!material) continue;
          for (var key in material) {
            var value = material[key];
            if (value && value.isTexture) {
              value.userData = value.userData || {};
              value.userData.szCachedModel = true;
            }
          }
        }
      });
    } catch (e) {}
  }

  /** Solta de verdade geometrias, materiais e texturas de um modelo (rejeitado ou no fim). */
  function disposeImportedModel(root) {
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
    } catch (e) {}
    textures.forEach(function (texture) { if (texture.dispose) { try { texture.dispose(); } catch (e) {} } });
    materials.forEach(function (material) { if (material.dispose) { try { material.dispose(); } catch (e) {} } });
    geometries.forEach(function (geometry) { if (geometry.dispose) { try { geometry.dispose(); } catch (e) {} } });
  }

  /** Chamado pelo disposeAll: o cache não pertence a mundo nenhum. */
  function disposeModelAssets() {
    if (_modelCache) {
      for (var k in _modelCache) {
        if (_modelCache[k] && _modelCache[k].scene) disposeImportedModel(_modelCache[k].scene);
      }
      _modelCache = null;
    }
    if (_hdrCache) {
      for (var h in _hdrCache) {
        if (_hdrCache[h] && _hdrCache[h].dispose) { try { _hdrCache[h].dispose(); } catch (e) {} }
      }
      _hdrCache = null;
    }
    _modelPending = null;
    _hdrPending = null;
  }

  /**
   * Carrega (uma vez) o modelo do projeto e guarda no cache. Assíncrono por causa do
   * import() do addon e do parse; a fila por nome atende dois objetos do MESMO arquivo
   * (o segundo entra na fila em vez de ficar com o cubo para sempre). Nunca lança.
   */
  function loadModel(name, onReady) {
    var k = String(name || '');
    if (!k) return;
    if (!_modelCache) _modelCache = Object.create(null);
    if (_modelCache[k]) { onReady(_modelCache[k]); return; }
    if (!_modelPending) _modelPending = Object.create(null);
    if (_modelPending[k]) { _modelPending[k].push(onReady); return; }
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'model3d') {
      warn('o modelo "' + k + '" não está no projeto. Traga um do Molda (ou envie um .glb) no painel Imagens; o objeto fica com a forma de reserva.');
      return;
    }
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) {
      warn('não consegui ler os dados do modelo "' + k + '"');
      return;
    }
    _modelPending[k] = [onReady];
    var settled = false;
    var timer = null;
    var flush = function (hit) {
      if (settled) return;
      settled = true;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      var queue = (_modelPending && _modelPending[k]) || [];
      if (_modelPending) delete _modelPending[k];
      if (!hit) return;
      for (var i = 0; i < queue.length; i++) {
        try { queue[i](hit); } catch (e) {}
      }
    };
    var finish = function (mod) {
      if (settled) return;
      _gltfMod = mod;
      try {
        new mod.GLTFLoader().parse(buf, '', function (gltf) {
          if (settled) {
            if (gltf && gltf.scene) disposeImportedModel(gltf.scene);
            return;
          }
          if (!gltf || !gltf.scene) {
            warn('o modelo "' + k + '" veio vazio; o objeto fica com a forma de reserva');
            flush(null);
            return;
          }
          var metrics = inspectModel(gltf.scene);
          var problem = modelBudgetProblem(k, metrics);
          if (problem) {
            warn(problem + '; o objeto fica com a forma de reserva');
            disposeImportedModel(gltf.scene);
            flush(null);
            return;
          }
          markCachedModelResources(gltf.scene);
          if (!_modelCache) _modelCache = Object.create(null);
          _modelCache[k] = { scene: gltf.scene, metrics: metrics };
          flush(_modelCache[k]);
        }, function (err) {
          warn('não consegui abrir o modelo "' + k + '": ' + err);
          flush(null);
        });
      } catch (e) {
        warn('não consegui abrir o modelo "' + k + '": ' + e);
        flush(null);
      }
    };
    timer = setTimeout(function () {
      warn('o modelo "' + k + '" demorou demais para carregar; o objeto fica com a forma de reserva');
      flush(null);
    }, MODEL_LOAD_TIMEOUT_MS);
    if (_gltfMod) { finish(_gltfMod); return; }
    try {
      import('three/addons/loaders/GLTFLoader.js').then(finish, function (e) {
        warn('não consegui carregar o leitor de modelos: ' + e);
        flush(null);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de modelos: ' + e);
      flush(null);
    }
  }

  /**
   * Encaixa o clone no tamanho pedido: o lado MAIOR vira "size" (em blocos) e o centro
   * da caixa do modelo cai na origem do objeto, que é onde o cubo de reserva estava;
   * posição, gravidade e colisão continuam valendo pela mesma régua. Devolve as
   * meias-medidas reais (a caixa de colisão passa a ser a do modelo).
   */
  function fitModelClone(clone, size) {
    var half = { hw: size / 2, hh: size / 2, hd: size / 2 };
    if (!THREE.Box3 || !THREE.Vector3) return half;
    try {
      var box = new THREE.Box3().setFromObject(clone);
      var dims = new THREE.Vector3();
      box.getSize(dims);
      var biggest = Math.max(dims.x, dims.y, dims.z);
      if (!(biggest > 0)) return half;
      var s = size / biggest;
      clone.scale.setScalar(s);
      var center = new THREE.Vector3();
      box.getCenter(center);
      clone.position.set(-center.x * s, -center.y * s, -center.z * s);
      half = {
        hw: Math.max(0.001, (dims.x * s) / 2),
        hh: Math.max(0.001, (dims.y * s) / 2),
        hd: Math.max(0.001, (dims.z * s) / 2)
      };
    } catch (e) {}
    return half;
  }

  /** Pendura o modelo no cubo de reserva (que some) — só se o objeto ainda vive. */
  function attachModelToObject(mesh, world, hit, size) {
    if (!mesh || !hit || !hit.scene) return;
    if (!world || world._disposed || mesh._szResourcesDisposed) return;
    var clone;
    try { clone = hit.scene.clone(true); } catch (e) {
      warn('não consegui montar o modelo "' + mesh.userData.sz.modelFile + '": ' + e);
      return;
    }
    try {
      clone.traverse(function (o) {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        if (!o.material) return;
        // Material PRÓPRIO por objeto: "Pintar de" tinge este sem tingir os outros do
        // mesmo arquivo (as texturas seguem compartilhadas e ficam no cache).
        if (o.material.length) {
          var own = [];
          for (var i = 0; i < o.material.length; i++) {
            own.push(o.material[i] && o.material[i].clone ? o.material[i].clone() : o.material[i]);
          }
          o.material = own;
        } else if (o.material.clone) {
          o.material = o.material.clone();
        }
      });
    } catch (e) {}
    var half = fitModelClone(clone, size);
    mesh.add(clone);
    // O cubo de reserva some (só o material; o Mesh segue sendo o objeto da criança).
    if (mesh.material) mesh.material.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.userData && mesh.userData.sz) {
      mesh.userData.sz.hw = half.hw;
      mesh.userData.sz.hh = half.hh;
      mesh.userData.sz.hd = half.hd;
      mesh.userData.sz.modelRoot = clone;
    }
  }

  /**
   * "Criar o objeto X com o modelo M na cena W tamanho S". Devolve o objeto NA HORA
   * (um cubo de reserva registrado como qualquer outro) e troca a forma quando o
   * arquivo carrega. size = lado maior, em blocos.
   */
  function createModelFile(world, name, size) {
    if (!world || !world.scene) return null;
    var s = positive(size, 1, 64);
    var k = String(name || '');
    var mesh = addMesh(world, new THREE.BoxGeometry(s, s, s), '#9ca3af', { hw: s / 2, hh: s / 2, hd: s / 2 });
    if (!mesh) return null;
    if (mesh.userData && mesh.userData.sz) mesh.userData.sz.modelFile = k;
    if (!k) {
      warnOnce('model-file-empty', 'escolha um modelo 3D no bloco "Criar o objeto … com o modelo" (traga um do Molda no painel Imagens).');
      return mesh;
    }
    loadModel(k, function (hit) { attachModelToObject(mesh, world, hit, s); });
    return mesh;
  }

  // ---- Céu de foto (.hdr) ----

  function cloneHdrTexture(base) {
    if (!base) return null;
    var texture = base.clone ? base.clone() : null;
    if (!texture && base.image && THREE.DataTexture) {
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
    if (_hdrMod) { callback(_hdrMod); return; }
    _hdrWaiters.push(callback);
    if (_hdrWaiters.length > 1) return;
    var finish = function (mod) {
      if (mod) _hdrMod = mod;
      var waiters = _hdrWaiters.slice();
      _hdrWaiters.length = 0;
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
          // O HDRLoader entrega as linhas na ordem do ARQUIVO (linha 0 em cima): quem vira é o upload.
          base.flipY = true;
        }
        if (THREE.EquirectangularReflectionMapping != null) {
          base.mapping = THREE.EquirectangularReflectionMapping;
        }
        base.needsUpdate = true;
        if (!_hdrCache) _hdrCache = Object.create(null);
        _hdrCache[name] = base;
        flush(base);
      } catch (e) {
        warn('não consegui abrir o céu "' + name + '": ' + e);
        flush(null);
      }
    });
  }

  /** "Usar o céu 360° P na cena W": vira o fundo E ilumina/reflete (scene.environment). */
  function skyPhoto(world, name) {
    if (!world || !world.scene) return;
    var k = String(name || '');
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'environment3d') {
      warn('o céu "' + k + '" não está no projeto. Traga um do Molda (ou envie um .hdr) no painel Imagens.');
      return;
    }
    // Uma carga antiga não vence a escolha mais nova do MESMO mundo.
    world._skyPhotoRequest = (world._skyPhotoRequest || 0) + 1;
    var request = world._skyPhotoRequest;
    loadHdrTexture(k, entry, function (texture) {
      if (!texture) return;
      if (world._disposed || request !== world._skyPhotoRequest) {
        try { texture.dispose(); } catch (e) {}
        return;
      }
      var old = world.scene.background;
      if (old && old.isTexture && old.dispose) { try { old.dispose(); } catch (e) {} }
      world.scene.background = texture;
      world.scene.environment = texture;
    });
  }
`

export const gameThreeDModelAssetsRuntimeSource = gameThreeDModelAssetsRuntimeTemplate.replace(
  '  /*__SZ_DATA_URL_RUNTIME__*/',
  dataUrlToBufferRuntimeSource,
)
