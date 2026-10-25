/**
 * Modelos de VERDADE (`.glb`) e céu de FOTO (`.hdr`) no kit iniciante Jogo 3D (lote 7
 * do Molda, 04/09/2026): é o que deixa a criança usar, no primeiro kit, o que ela
 * montou no Molda. Aqui o modelo vira um OBJETO comum da cena, com tudo o que um objeto
 * tem (mover, girar, colidir, pintar).
 *
 * Desde o carregador compartilhado (review 3D, lote 2) este fragmento é só a ADAPTAÇÃO:
 * leitura, fila, orçamento, ossos e HDR moram em `../three3dModelsRuntime.ts`
 * (`createSzModels`), injetado pelo marcador no topo deste literal.
 *
 * O fragmento roda DENTRO da IIFE do runtime principal (mesmo mecanismo do Kit
 * Plataforma), então enxerga `THREE`, `addMesh`, `warn`, `warnOnce`, `positive` e os
 * demais utilitários sem criar outro global.
 *
 * 🎬 Animação (review 3D, lote 6): cada objeto com modelo ganha um animador próprio
 * (`models.animator`), guardado fora da enumeração do userData e atualizado pelo laço
 * da cena (`world._animated`), junto com a pintura animada do Molda (`stepFlipbooks`).
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
 * `disposeAll` (refresh/fechar). Os MATERIAIS são clonados por objeto, para "Pintar de"
 * tingir um sem tingir os outros. Os OSSOS também são de cada objeto (SkeletonUtils).
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal.
 */
const gameThreeDModelAssetsRuntimeTemplate = `
  // ====================================================================
  // MODELOS .glb E CÉU .hdr — o que a criança trouxe do Molda (ou enviou).
  // ====================================================================
  /*__SZ_THREE_MODELS_RUNTIME__*/
  // Os binários chegam como data: URL em window.__SZGAME_ASSETS_3D (nome -> {kind, dataUrl}).
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var models = createSzModels({
    THREE: THREE,
    warn: warn,
    warnOnce: warnOnce,
    assets: MODELS3D,
    fallbackNote: '; o objeto fica com a forma de reserva',
    // Aquecer o shader na cena ATUAL: o primeiro quadro do modelo não engasga.
    getRenderer: function () { var w = _currentWorld(); return w ? w.renderer : null; },
    getScene: function () { var w = _currentWorld(); return w ? w.scene : null; },
    getCamera: function () { var w = _currentWorld(); return w ? w.camera : null; }
  });

  // modelRoot e anim ficam FORA da enumeração: o clone do Three copia o userData por JSON,
  // e um mixer (circular) quebraria a cópia de grupo.
  function hideOn(state, key, value) {
    try { Object.defineProperty(state, key, { value: value, writable: true, configurable: true, enumerable: false }); }
    catch (e) { state[key] = value; }
  }

  /** Chamado pelo disposeAll: o cache não pertence a mundo nenhum. */
  function disposeModelAssets() {
    models.disposeAll();
  }

  /** Mesmo contrato do carregador: hit na hora (cache) ou o onReady quando chegar. */
  function loadModel(name, onReady) {
    var hit = models.load(name, onReady);
    if (hit) onReady(hit);
  }

  /** Pendura o modelo no cubo de reserva (que some) — só se o objeto ainda vive. */
  function attachModelToObject(mesh, world, hit, size) {
    if (!mesh || !hit || !hit.scene) return;
    if (!world || world._disposed || mesh._szResourcesDisposed) return;
    var clone;
    // Material PRÓPRIO por objeto ("Pintar de" tinge um só) e ossos próprios (SkeletonUtils).
    try { clone = models.instantiate(hit, { ownMaterials: true, shadows: true }); } catch (e) {
      warn('não consegui montar o modelo "' + mesh.userData.sz.modelFile + '": ' + e);
      return;
    }
    if (!clone) return;
    applyRememberedModelAppearance(mesh, clone);
    // Lado MAIOR = size e centro da caixa do modelo na origem, onde o cubo estava: posição,
    // gravidade e colisão continuam valendo pela mesma régua.
    var half = models.fit(clone, hit, { mode: 'longest', anchor: 'center', size: size });
    mesh.add(clone);
    // O cubo de reserva some (só o material; o Mesh segue sendo o objeto da criança).
    if (mesh.material) mesh.material.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.userData && mesh.userData.sz) {
      mesh.userData.sz.hw = half.hw;
      mesh.userData.sz.hh = half.hh;
      mesh.userData.sz.hd = half.hd;
      hideOn(mesh.userData.sz, 'modelRoot', clone);
      mesh.userData.sz.modelLoaded = true;
      startModelAnimator(mesh, world, clone, hit);
    }
  }

  // ---- 🎬 Animação do modelo: um animador por objeto, no laço da cena ----
  // Cada objeto (e cada cópia de grupo) tem o próprio mixer: cada boneco no seu tempo.
  function startModelAnimator(mesh, world, root, hit) {
    var anim = models.animator(root, hit);
    if (!anim) return;
    var state = mesh.userData.sz;
    hideOn(state, 'anim', anim);
    anim.onFinished(function () { state.animDone = true; });
    if (!world._animated) world._animated = [];
    world._animated.push(anim);
    // Sem "A cada quadro" a cena não redesenha: o modelo animado liga um laço vazio.
    if (!world._animationLoopInstalled) animate(world, function () {});
    var want = state.animWant;
    if (want) anim.play(want.clip, { once: want.once, fade: 0 });
  }

  // Chamado pelo laço da cena antes de desenhar (d = 0 com o jogo pausado: tudo congela).
  function stepModelAnimations(world, d, stamp) {
    world._frameNo = (world._frameNo || 0) + 1;
    if (!(d > 0)) return;
    var list = world._animated;
    for (var i = 0; list && i < list.length; i++) list[i].update(d);
    // A pintura animada do Molda: uma linha do tempo por material (o carimbo evita andar 2x).
    models.stepFlipbooks(d, stamp || null);
  }

  function animOf(obj) {
    var state = obj && obj.userData && obj.userData.sz;
    return state && state.anim ? state.anim : null;
  }

  // "Tocar a animação C em X repetindo/uma vez". Pedido repetido a cada quadro só continua
  // (no laço não rebobina); um pedido novo, ou depois de uma pausa, começa do início.
  function playAnimation(obj, clip, mode) {
    var state = obj && obj.userData && obj.userData.sz;
    if (!state) return;
    if (!state.modelFile) {
      warnOnce('anim-no-model', 'só um objeto criado com um modelo 3D do Molda tem animação: use "Criar o objeto … com o modelo".');
      return;
    }
    var name = String(clip == null ? '' : clip);
    var once = mode === 'uma-vez';
    var w = worldOf(obj);
    var frame = w ? (w._frameNo || 0) : 0;
    var want = state.animWant;
    var same = !!want && want.clip === name && want.once === once;
    var continuing = same && typeof state.animAt === 'number' && state.animAt >= frame - 1;
    state.animAt = frame;
    if (continuing) return;
    state.animWant = { clip: name, once: once };
    state.animDone = false;
    var anim = animOf(obj);
    if (anim) { anim.play(name, { once: once }); return; }
    if (state.modelRoot) {
      warnOnce('anim-no-clips:' + state.modelFile, 'o modelo "' + state.modelFile + '" não tem animações. Crie uma no Molda, no modo Animar.');
    }
    // Ainda carregando: o pedido fica guardado e começa quando o modelo chegar.
  }

  function stopAnimation(obj) {
    var state = obj && obj.userData && obj.userData.sz;
    if (!state) return;
    state.animWant = null;
    state.animDone = false;
    var anim = animOf(obj);
    if (anim) anim.stop();
  }

  function animationDone(obj) {
    var state = obj && obj.userData && obj.userData.sz;
    return !!(state && state.animDone);
  }

  // Remover objeto (ou tirar do grupo): o mixer e os ossos da cópia saem junto.
  function releaseModelObjects(world, root) {
    var nodes = objectTree(root);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var state = node && node.userData && node.userData.sz;
      if (!state || !state.modelFile) continue;
      var anim = state.anim || null;
      if (anim && world) removeFromArray(world._animated, anim);
      if (state.modelRoot && (anim || (node.userData && node.userData.szCopy))) models.disposeClone(state.modelRoot, anim);
      hideOn(state, 'anim', null);
    }
  }

  // Descarte da cena inteira (recomeçar, recriar, fechar): todos os mixers dela.
  function disposeWorldAnimations(world) {
    var list = world && world._animated;
    if (!list) return;
    var seen = new Set();
    for (var i = 0; i < list.length; i++) {
      try { list[i].dispose(seen); } catch (e) {}
    }
    world._animated = [];
  }

  /**
   * A cópia de grupo de um modelo: já montado, ela ganha os ossos e o animador próprios
   * (começando a animação que o molde pediu); ainda carregando, entra na mesma fila.
   */
  function followModelCopy(source, copy, world) {
    var state = source && source.userData && source.userData.sz;
    var copyState = copy && copy.userData && copy.userData.sz;
    if (!state || !state.modelFile || !copyState) return;
    if (state.animWant) copyState.animWant = { clip: state.animWant.clip, once: state.animWant.once };
    if (state.modelRoot) {
      var at = source.children ? source.children.indexOf(state.modelRoot) : -1;
      var root = at >= 0 && copy.children ? copy.children[at] : null;
      if (!root) return;
      hideOn(copyState, 'modelRoot', root);
      var hit = models.cached(state.modelFile);
      if (hit) startModelAnimator(copy, world, root, hit);
      return;
    }
    if (state.modelLoaded) return;
    var size = positive(state.modelSize, 1, 64);
    loadModel(state.modelFile, function (hit) { attachModelToObject(copy, world, hit, size); });
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
    if (mesh.userData && mesh.userData.sz) {
      mesh.userData.sz.modelFile = k;
      mesh.userData.sz.modelSize = s;
      mesh.userData.sz.modelLoaded = false;
    }
    if (!k) {
      warnOnce('model-file-empty', 'escolha um modelo 3D no bloco "Criar o objeto … com o modelo" (traga um do Molda em "Modelos 3D").');
      return mesh;
    }
    loadModel(k, function (hit) { attachModelToObject(mesh, world, hit, s); });
    return mesh;
  }

  /** "Usar o céu 360° P na cena W": vira o fundo E ilumina/reflete (scene.environment). */
  function skyPhoto(world, name) {
    if (!world || !world.scene) return;
    var k = String(name || '');
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'environment3d') {
      warn('o céu "' + k + '" não está no projeto. Traga um do Molda (ou envie um .hdr) em "Modelos 3D".');
      return;
    }
    // Uma carga antiga não vence a escolha mais nova do MESMO mundo.
    var request = beginSkyChange(world);
    models.loadHdr(k, function (texture) {
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

export const gameThreeDModelAssetsRuntimeSource = gameThreeDModelAssetsRuntimeTemplate
