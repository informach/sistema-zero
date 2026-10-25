import { dataUrlToBufferRuntimeSource } from './assetRuntime'

/**
 * Carregador de modelos 3D ÚNICO dos três runtimes oficiais baseados em Three (Jogo 3D,
 * Mundo 3D e Jogo 3D Avançado), no molde de `threePostProcessingRuntime.ts`.
 *
 * Os runtimes são strings de JavaScript executadas dentro do iframe; o marcador mantém
 * cada string literal e auditável, e esta composição garante que leitura de GLB/HDR,
 * orçamento, ossos (SkeletonUtils), animação, pintura animada do Molda e descarte
 * evoluam juntos entre as extensões. O fragmento expõe só `createSzModels(host)` e as
 * constantes `MAX_MODEL_*` (o teste do Molda as lê por regex, então ficam escritas assim).
 *
 * Contrato do host: `THREE`, `warn`, `warnOnce` (obrigatórios); `assets` (nome -> {kind,
 * dataUrl}), `isDisposed()`, `trackPending(promise)`, `waitForHdr`, `getRenderer`/
 * `getScene`/`getCamera` (aquecer o shader) e `fallbackNote` (fim das mensagens de falha).
 *
 * ⚠️ Sem crase e sem cifrão-chave dentro do literal. Comentários do literal são `//` de
 * linha inteira: o `compactOfficialRuntimeSource` os tira do payload.
 */
export const THREE_MODELS_MARKER = '/*__SZ_THREE_MODELS_RUNTIME__*/'

const THREE_MODELS_TEMPLATE = `
  // ---- 🧊 Modelos 3D (GLB) e céu 360° (HDR): carregador compartilhado ----
  // A rede é MORTA no preview (connect-src 'none' + permissionGuard): loader.load(url)
  // nunca funciona. Decodificamos o data: URL na mão e chamamos loader.parse(buffer).
  // Orçamento POR MODELO (uma cópia). O Molda confere os mesmos números antes de exportar.
  var MAX_MODEL_MESHES = 48;
  var MAX_MODEL_TRIANGLES = 500000;
  var MAX_MODEL_BONES = 256;
  var MAX_MODEL_MATERIALS = 64;
  var MAX_MODEL_DRAW_CALLS = 96;
  var MODEL_LOAD_TIMEOUT_MS = 10000;

/*__SZ_DATA_URL_RUNTIME__*/

  function createSzModels(host) {
    var assets = host.assets || {};
    var note = host.fallbackNote || '';
    var cache = Object.create(null);
    var pendingModels = Object.create(null);
    var cancels = [];
    var gltfMod = null;
    var skelMod = null;
    var skelWait = null;
    var hdrMod = null;
    var hdrWaiters = [];
    var hdrCache = Object.create(null);
    var hdrPending = Object.create(null);
    var hdrCancels = [];
    var lastFlipStamp = null;

    function isGone() { return !!(host.isDisposed && host.isDisposed()); }
    function keyOf(name) { return name == null ? '' : String(name); }
    function materialList(o) { return o && o.material ? (o.material.length ? o.material : [o.material]) : []; }
    function track() {
      var release = null;
      if (host.trackPending) host.trackPending(new Promise(function (resolve) { release = resolve; }));
      return function () { if (release) { var r = release; release = null; r(); } };
    }

    // Mede o custo EXPANDIDO depois do parse (bytes compactados não dizem custo de render).
    function inspect(root) {
      var metrics = { meshes: 0, triangles: 0, bones: 0, materials: 0, drawCalls: 0 };
      var materialSet = new Set();
      try {
        root.traverse(function (o) {
          if (o.isBone) metrics.bones++;
          if (!o.isMesh || !o.geometry) return;
          metrics.meshes++;
          var g = o.geometry;
          if (g.index && g.index.count != null) metrics.triangles += Math.floor(g.index.count / 3);
          else if (g.attributes && g.attributes.position) metrics.triangles += Math.floor(g.attributes.position.count / 3);
          var list = materialList(o);
          metrics.drawCalls += Math.max(1, list.length);
          for (var i = 0; i < list.length; i++) if (list[i]) materialSet.add(list[i]);
        });
      } catch (e) {
        return null;
      }
      metrics.materials = materialSet.size;
      return metrics;
    }

    function budgetProblem(name, m) {
      var who = 'o modelo "' + name + '"';
      if (!m) return 'não consegui medir a complexidade d' + who;
      if (m.meshes > MAX_MODEL_MESHES) return who + ' tem ' + m.meshes + ' malhas (o máximo é ' + MAX_MODEL_MESHES + '); junte as peças no Molda';
      if (m.triangles > MAX_MODEL_TRIANGLES) return who + ' tem triângulos demais (' + m.triangles + ' > ' + MAX_MODEL_TRIANGLES + ')';
      if (m.bones > MAX_MODEL_BONES) return who + ' tem ossos demais (' + m.bones + ' > ' + MAX_MODEL_BONES + ')';
      if (m.materials > MAX_MODEL_MATERIALS) return who + ' tem materiais demais (' + m.materials + ' > ' + MAX_MODEL_MATERIALS + ')';
      if (m.drawCalls > MAX_MODEL_DRAW_CALLS) return who + ' exige chamadas de desenho demais (' + m.drawCalls + ' > ' + MAX_MODEL_DRAW_CALLS + ')';
      return '';
    }

    // A caixa do MOLDE, medida uma vez: cada cópia reusa (nada de Box3 por objeto).
    function measure(root) {
      if (!THREE.Box3 || !THREE.Vector3) return null;
      try {
        var box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty && box.isEmpty()) return null;
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        return { min: box.min.clone(), max: box.max.clone(), size: size, center: center };
      } catch (e) {
        return null;
      }
    }

    // Geometria e texturas do cache são de TODAS as cópias: quem descarta por objeto pula.
    function markCached(root) {
      try {
        root.traverse(function (o) {
          if (o.geometry) {
            o.geometry.userData = o.geometry.userData || {};
            o.geometry.userData.szCachedModel = true;
          }
          var list = materialList(o);
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

    // Aquecer = compilar o shader e subir a textura antes do primeiro uso (best-effort).
    function warm(root) {
      var renderer = host.getRenderer ? host.getRenderer() : null;
      var scene = host.getScene ? host.getScene() : null;
      var camera = host.getCamera ? host.getCamera() : null;
      if (!root || !renderer || !scene || !camera) return;
      try {
        var canCompileAsync = renderer.compileAsync &&
          (!renderer.extensions || !renderer.extensions.has || renderer.extensions.has('KHR_parallel_shader_compile'));
        if (canCompileAsync) {
          var compilation = renderer.compileAsync(root, camera, scene);
          if (compilation && compilation.catch) {
            compilation.catch(function (e) {
              if (!isGone()) host.warnOnce('model-warm', 'não consegui aquecer um modelo 3D: ' + e);
            });
          }
        } else if (renderer.compile) renderer.compile(root, camera, scene);
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

    // ---- 🎞️ Pintura animada do Molda (contrato 1, material.userData.molda.flipbook) ----
    // UMA linha do tempo por MATERIAL, compartilhada por todas as cópias: a folha é a mesma
    // textura para todo mundo. Contrato desconhecido ou dado inválido fica PARADO.
    function collectFlipbooks(root) {
      var found = [];
      if (!root || !root.traverse) return found;
      var seen = new Set();
      root.traverse(function (o) {
        var list = materialList(o);
        for (var i = 0; i < list.length; i++) {
          var material = list[i];
          if (!material || seen.has(material)) continue;
          seen.add(material);
          var molda = material.userData && material.userData.molda;
          var book = molda && molda.flipbook;
          if (!book || book.contract !== 1) continue;
          var columns = book.columns;
          var rows = book.rows;
          var fps = book.fps;
          var cells = columns * rows;
          if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || cells > 256) continue;
          if (!Number.isFinite(fps) || fps < 0.1 || fps > 60 || typeof book.loop !== 'boolean') continue;
          var raw = book.frames;
          if (!Array.isArray(raw) || !raw.length || raw.length > 256) continue;
          if (!raw.every(function (cell) { return Number.isInteger(cell) && cell >= 0 && cell < cells; })) continue;
          found.push({
            material: material, columns: columns, rows: rows, frames: raw.slice(),
            fps: fps, loop: book.loop, t: 0, step: -1
          });
        }
      });
      return found;
    }

    // Devolve se colocou: sem textura ainda não é passo dado (uma folha que chega depois anda).
    function placeFlipbook(book, step) {
      var map = book.material && book.material.map;
      if (!map || !map.offset || !map.repeat) return false;
      var frame = book.frames[step];
      map.repeat.set(1 / book.columns, 1 / book.rows);
      map.offset.set((frame % book.columns) / book.columns, Math.floor(frame / book.columns) / book.rows);
      return true;
    }

    function eachFlipbook(fn) {
      for (var key in cache) {
        var books = cache[key].flipbooks;
        for (var i = 0; books && i < books.length; i++) fn(books[i]);
      }
    }

    // frameStamp: quem tem um laço por mundo passa o carimbo do quadro e só o 1º anda.
    function stepFlipbooks(dt, frameStamp) {
      if (frameStamp != null) {
        if (frameStamp === lastFlipStamp) return;
        lastFlipStamp = frameStamp;
      }
      var delta = typeof dt === 'number' && isFinite(dt) && dt > 0 ? dt : 0;
      eachFlipbook(function (book) {
        book.t += delta;
        var step;
        if (book.loop) {
          var total = book.frames.length / book.fps;
          step = Math.floor((book.t % total) * book.fps) % book.frames.length;
        } else {
          step = Math.min(book.frames.length - 1, Math.floor(book.t * book.fps));
        }
        if (step !== book.step && placeFlipbook(book, step)) book.step = step;
      });
    }

    // "Jogar de novo" recomeça a pintura do 1º quadro (o cache sobrevive de propósito).
    function resetFlipbooks() {
      lastFlipStamp = null;
      eachFlipbook(function (book) {
        book.t = 0;
        book.step = -1;
        if (placeFlipbook(book, 0)) book.step = 0;
      });
    }

    // ---- Ossos: cada cópia com esqueleto próprio ----
    function hasSkin(root) {
      var skinned = false;
      try { root.traverse(function (o) { if (o.isSkinnedMesh) skinned = true; }); } catch (e) {}
      return skinned;
    }

    // O clone comum do Object3D deixa a cópia presa ao esqueleto do original (anima morto).
    // Sem SkeletonUtils, só modelo sem skin pode usar o clone comum.
    function cloneTree(root, skinned) {
      if (skinned == null) skinned = hasSkin(root);
      if (!skinned) return root.clone();
      if (skelMod && skelMod.clone) return skelMod.clone(root);
      throw new Error('não consegui criar ossos independentes para este modelo');
    }

    // Esqueletos (e a textura de ossos) são da CÓPIA; geometria/material ficam no cache.
    function disposeSkeletons(root, seen) {
      if (!root || !root.traverse) return;
      var released = seen || new Set();
      root.traverse(function (o) {
        var skeleton = o.isSkinnedMesh && o.skeleton;
        if (!skeleton || released.has(skeleton)) return;
        released.add(skeleton);
        try { skeleton.dispose(); }
        catch (e) { host.warnOnce('dispose-model-skeleton', 'não consegui liberar os ossos de um modelo: ' + e); }
      });
    }

    function disposeClone(root, anim, seenSkeletons) {
      if (anim && anim.dispose) anim.dispose(seenSkeletons);
      disposeSkeletons(root, seenSkeletons);
    }

    function instantiate(hit, opts) {
      if (!hit || !hit.scene) return null;
      var o = opts || {};
      var root = cloneTree(hit.scene, hit.skinned);
      if (o.ownMaterials || o.shadows) {
        root.traverse(function (node) {
          if (!node.isMesh) return;
          if (o.shadows) {
            node.castShadow = true;
            if (o.shadows !== 'cast') node.receiveShadow = true;
          }
          if (!o.ownMaterials || !node.material) return;
          if (node.material.length) {
            var own = [];
            for (var i = 0; i < node.material.length; i++) {
              var m = node.material[i];
              own.push(m && m.clone ? m.clone() : m);
            }
            node.material = own;
          } else if (node.material.clone) {
            node.material = node.material.clone();
          }
        });
      }
      return root;
    }

    // Encaixe: longest (lado maior = size), contain (cabe na caixa w×h×d sem esticar) ou
    // height (altura = height). Âncora center (centro da caixa na origem) ou floor (pé no 0).
    function fit(root, hit, opts) {
      var o = opts || {};
      var mode = o.mode === 'contain' || o.mode === 'height' ? o.mode : 'longest';
      var floor = o.anchor === 'floor';
      var box = o.box || {};
      var size = typeof o.size === 'number' && o.size > 0 ? o.size : 1;
      var bw = box.w > 0 ? box.w : size;
      var bh = box.h > 0 ? box.h : size;
      var bd = box.d > 0 ? box.d : size;
      var height = typeof o.height === 'number' && o.height > 0 ? o.height : size;
      var b = hit && hit.bounds;
      var sx = b ? b.size.x : 0;
      var sy = b ? b.size.y : 0;
      var sz = b ? b.size.z : 0;
      var biggest = Math.max(sx, sy, sz);
      if (!(biggest > 0)) {
        var fh = mode === 'height' ? height : (mode === 'contain' ? bh : size);
        var fw = mode === 'contain' ? bw : fh;
        var fd = mode === 'contain' ? bd : fh;
        return { scale: 1, hw: fw / 2, hh: fh / 2, hd: fd / 2, minY: floor ? 0 : -fh / 2 };
      }
      var s;
      if (mode === 'height') s = height / (sy > 0 ? sy : biggest);
      else if (mode === 'contain') {
        s = Infinity;
        if (sx > 0) s = Math.min(s, bw / sx);
        if (sy > 0) s = Math.min(s, bh / sy);
        if (sz > 0) s = Math.min(s, bd / sz);
      } else s = size / biggest;
      try {
        if (root && root.scale && root.scale.setScalar) root.scale.setScalar(s);
        if (root && root.position && root.position.set) {
          root.position.set(-b.center.x * s, floor ? -b.min.y * s : -b.center.y * s, -b.center.z * s);
        }
      } catch (e) {}
      var hh = Math.max(0.001, (sy * s) / 2);
      return {
        scale: s,
        hw: Math.max(0.001, (sx * s) / 2),
        hh: hh,
        hd: Math.max(0.001, (sz * s) / 2),
        minY: floor ? 0 : -hh
      };
    }

    // ---- 🕺 Animação: um mixer por cópia (cada boneco no seu tempo) ----
    function animator(root, hit, opts) {
      var clips = hit && hit.clips;
      if (!root || !clips || !clips.length || !THREE.AnimationMixer) return null;
      var mixer;
      try { mixer = new THREE.AnimationMixer(root); } catch (e) { return null; }
      var owner = (opts && opts.owner) || ('o modelo "' + keyOf(hit.name) + '"');
      var current = null;
      var speed = 1;
      var finished = [];
      var names = [];
      for (var c = 0; c < clips.length; c++) if (clips[c]) names.push(clips[c].name);
      var onMixerFinished = function (event) {
        if (!event || !current || event.action !== current) return;
        var name = current.getClip ? current.getClip().name : '';
        var list = finished.slice();
        for (var i = 0; i < list.length; i++) {
          try { list[i](name); }
          catch (e) { host.warnOnce('anim-finished', 'erro no "quando a animação terminar": ' + e); }
        }
      };
      if (mixer.addEventListener) mixer.addEventListener('finished', onMixerFinished);
      function clipNamed(name) {
        for (var i = 0; i < clips.length; i++) if (clips[i] && clips[i].name === name) return clips[i];
        return null;
      }
      var anim = {
        mixer: mixer,
        clips: clips,
        root: root,
        play: function (name, playOpts) {
          var k = keyOf(name);
          var clip = clipNamed(k);
          if (!clip) {
            host.warnOnce('anim:' + owner + ':' + k, owner + ' não tem a animação "' + k + '"' +
              (names.length ? ' (tem: ' + names.join(', ') + ')' : ''));
            return false;
          }
          var p = playOpts || {};
          var once = !!p.once;
          var fade = typeof p.fade === 'number' && p.fade >= 0 ? p.fade : 0.2;
          var rate = typeof p.speed === 'number' && isFinite(p.speed) ? p.speed : speed;
          try {
            var next = mixer.clipAction(clip);
            var loop = once ? THREE.LoopOnce : THREE.LoopRepeat;
            // Idempotente enquanto a MESMA ação roda no MESMO modo. Uma vez concluída não está
            // mais tocando: um golpe novo precisa rebobinar.
            if (current === next && next.loop === loop && (!next.isRunning || next.isRunning())) {
              if (typeof p.speed === 'number') next.timeScale = rate;
              return true;
            }
            var previous = current;
            next.reset();
            next.setLoop(loop, once ? 1 : Infinity);
            next.clampWhenFinished = once;
            next.timeScale = rate;
            if (fade > 0) next.fadeIn(fade);
            next.play();
            if (previous && previous !== next) {
              if (fade > 0) previous.fadeOut(fade);
              else previous.stop();
            }
            current = next;
            return true;
          } catch (e) {
            return false;
          }
        },
        stop: function () {
          try { mixer.stopAllAction(); } catch (e) {}
          current = null;
        },
        setSpeed: function (k) {
          if (typeof k !== 'number' || !isFinite(k)) return;
          speed = k;
          if (current) current.timeScale = k;
        },
        update: function (dt) {
          try { mixer.update(dt); } catch (e) {}
        },
        current: function () {
          return current && current.getClip ? current.getClip().name : '';
        },
        action: function () { return current; },
        onFinished: function (cb) {
          if (typeof cb !== 'function') return function () {};
          finished.push(cb);
          return function () {
            var i = finished.indexOf(cb);
            if (i >= 0) finished.splice(i, 1);
          };
        },
        dispose: function (seenSkeletons) {
          try {
            mixer.stopAllAction();
            mixer.uncacheRoot(root);
            if (mixer.removeEventListener) mixer.removeEventListener('finished', onMixerFinished);
          } catch (e) {
            host.warnOnce('dispose-model-mixer', 'não consegui liberar um movimento antigo: ' + e);
          }
          current = null;
          finished.length = 0;
          disposeSkeletons(root, seenSkeletons);
        }
      };
      return anim;
    }

    // Solta de verdade geometrias, materiais, texturas e ossos de um modelo (rejeitado/no fim).
    function disposeImported(root, done) {
      disposeSkeletons(root, done && done.skeletons);
      var geometries = new Set();
      var materials = new Set();
      var textures = new Set();
      try {
        root.traverse(function (o) {
          if (o.geometry) geometries.add(o.geometry);
          var list = materialList(o);
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
        host.warnOnce('dispose-imported-traverse', 'não consegui percorrer um modelo para liberar recursos: ' + e);
      }
      var release = function (set, bucket, label) {
        set.forEach(function (resource) {
          var seen = done && done[bucket];
          if (seen && seen.has(resource)) return;
          if (seen) seen.add(resource);
          if (resource.dispose) {
            try { resource.dispose(); }
            catch (e) { host.warnOnce('dispose-imported-' + label, 'não consegui liberar um recurso de modelo: ' + e); }
          }
        });
      };
      release(textures, 'textures', 'texture');
      release(materials, 'materials', 'material');
      release(geometries, 'geometries', 'geometry');
    }

    // SkeletonUtils chega em paralelo ao parse; ninguém clona antes de ele chegar (ou falhar).
    // Falhou (rede caiu no meio): quem esperava segue sem ele, e o PRÓXIMO modelo tenta de novo
    // (guardar a espera falhada deixava todo modelo com ossos da página sem SkeletonUtils).
    function skeletonUtils() {
      if (!skelWait) {
        try {
          // host.importSkeleton existe só para o teste simular a rede caindo.
          var pending = host.importSkeleton ? host.importSkeleton() : import('three/addons/utils/SkeletonUtils.js');
          skelWait = pending.then(function (mod) {
            if (mod && mod.clone) skelMod = mod;
            else skelWait = null;
          }, function () { skelWait = null; });
        } catch (e) {
          skelWait = Promise.resolve();
        }
      }
      return skelWait;
    }

    function makeHit(name, gltf, metrics) {
      var clips = gltf.animations || [];
      var clipNames = [];
      for (var i = 0; i < clips.length; i++) if (clips[i]) clipNames.push(clips[i].name);
      markCached(gltf.scene);
      return {
        name: name,
        scene: gltf.scene,
        clips: clips,
        clipNames: clipNames,
        metrics: metrics,
        bounds: measure(gltf.scene),
        skinned: hasSkin(gltf.scene),
        flipbooks: collectFlipbooks(gltf.scene)
      };
    }

    // Fila por nome, prazo de 10 s, NUNCA rejeita: modelo quebrado não trava o carregando.
    // Devolve o hit na hora quando já está no cache (o onReady então NÃO é chamado).
    function load(name, onReady) {
      var k = keyOf(name);
      if (!k || isGone()) return null;
      if (cache[k]) return cache[k];
      if (pendingModels[k]) {
        if (typeof onReady === 'function') pendingModels[k].push(onReady);
        return null;
      }
      var entry = assets[k];
      if (!entry || entry.kind !== 'model3d') {
        host.warn('o modelo "' + k + '" não está no projeto. Traga um do Molda (ou envie um .glb) em "Modelos 3D", no menu ⋯' + note);
        return null;
      }
      var buf = dataUrlToBuffer(entry.dataUrl);
      if (!buf) {
        host.warn('não consegui ler os dados do modelo "' + k + '"' + note);
        return null;
      }
      pendingModels[k] = typeof onReady === 'function' ? [onReady] : [];
      var release = track();
      var settled = false;
      var timer = null;
      var cancel = null;
      var flush = function (hit) {
        if (settled) return;
        settled = true;
        if (timer !== null) { clearTimeout(timer); timer = null; }
        var at = cancels.indexOf(cancel);
        if (at >= 0) cancels.splice(at, 1);
        var queue = pendingModels[k] || [];
        delete pendingModels[k];
        if (hit && !isGone()) {
          for (var i = 0; i < queue.length; i++) {
            try { queue[i](hit); }
            catch (e) { host.warnOnce('model-ready:' + k, 'erro ao montar o modelo "' + k + '": ' + e); }
          }
        }
        release();
      };
      cancel = function () { flush(null); };
      cancels.push(cancel);
      var parse = function (mod) {
        if (settled) return;
        if (isGone()) { flush(null); return; }
        gltfMod = mod;
        try {
          new mod.GLTFLoader().parse(buf, '', function (gltf) {
            var install = function () {
              // O parse não cancela: uma conclusão tardia é dona destes recursos e os solta.
              if (settled || isGone()) {
                if (gltf && gltf.scene) disposeImported(gltf.scene);
                flush(null);
                return;
              }
              if (!gltf || !gltf.scene) {
                host.warn('o modelo "' + k + '" veio vazio' + note);
                flush(null);
                return;
              }
              var metrics = inspect(gltf.scene);
              var problem = budgetProblem(k, metrics);
              if (problem) {
                host.warn(problem + note);
                disposeImported(gltf.scene);
                flush(null);
                return;
              }
              var hit = makeHit(k, gltf, metrics);
              cache[k] = hit;
              warm(gltf.scene);
              flush(hit);
            };
            if (skelMod) install();
            else skeletonUtils().then(install, install);
          }, function (err) {
            if (!isGone()) host.warn('não consegui abrir o modelo "' + k + '": ' + err);
            flush(null);
          });
        } catch (e) {
          host.warn('não consegui abrir o modelo "' + k + '": ' + e);
          flush(null);
        }
      };
      timer = setTimeout(function () {
        if (!isGone()) host.warn('o modelo "' + k + '" demorou demais para carregar' + note);
        flush(null);
      }, MODEL_LOAD_TIMEOUT_MS);
      // Sem o SkeletonUtils, só modelo sem skin funciona (uma skin nunca cai para ossos
      // compartilhados); por isso o hit só sai depois de ele chegar ou falhar.
      skeletonUtils();
      if (gltfMod) { parse(gltfMod); return null; }
      try {
        import('three/addons/loaders/GLTFLoader.js').then(function (mod) {
          if (isGone()) { flush(null); return; }
          parse(mod);
        }, function (e) {
          if (!isGone()) host.warn('não consegui carregar o leitor de modelos: ' + e);
          flush(null);
        });
      } catch (e) {
        host.warn('não consegui carregar o leitor de modelos: ' + e);
        flush(null);
      }
      return null;
    }

    // ---- 🌤️ Céu 360° (.hdr): um parse por nome, um CLONE por uso ----
    function cloneHdr(base) {
      if (!base) return null;
      var texture = base.clone ? base.clone() : null;
      if (!texture && base.image && THREE.DataTexture) {
        texture = new THREE.DataTexture(base.image.data, base.image.width, base.image.height);
      }
      if (!texture) return null;
      if (THREE.EquirectangularReflectionMapping != null) texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;
      return texture;
    }

    function withHdrLoader(callback) {
      if (hdrMod) { callback(hdrMod); return; }
      hdrWaiters.push(callback);
      if (hdrWaiters.length > 1) return;
      var finish = function (mod) {
        if (mod) hdrMod = mod;
        var waiters = hdrWaiters.slice();
        hdrWaiters.length = 0;
        for (var i = 0; i < waiters.length; i++) waiters[i](mod);
      };
      try {
        import('three/addons/loaders/HDRLoader.js').then(finish, function (e) {
          if (!isGone()) host.warn('não consegui carregar o leitor de céu: ' + e);
          finish(null);
        });
      } catch (e) {
        host.warn('não consegui carregar o leitor de céu: ' + e);
        finish(null);
      }
    }

    function disposeTextureQuietly(texture) {
      if (texture && texture.dispose) {
        try { texture.dispose(); }
        catch (e) { host.warnOnce('dispose-hdr', 'não consegui liberar uma textura de céu: ' + e); }
      }
    }

    function loadHdr(name, callback) {
      var k = keyOf(name);
      var cb = typeof callback === 'function' ? callback : function () {};
      var entry = assets[k];
      if (isGone() || !entry || entry.kind !== 'environment3d') { cb(null); return; }
      if (hdrCache[k]) { cb(cloneHdr(hdrCache[k])); return; }
      if (hdrPending[k]) { hdrPending[k].push(cb); return; }
      hdrPending[k] = [cb];
      var release = host.waitForHdr ? track() : function () {};
      var settled = false;
      var cancel = null;
      var flush = function (base) {
        if (settled) return;
        settled = true;
        var at = hdrCancels.indexOf(cancel);
        if (at >= 0) hdrCancels.splice(at, 1);
        var queue = hdrPending[k] || [];
        delete hdrPending[k];
        for (var i = 0; i < queue.length; i++) {
          try { queue[i](base && !isGone() ? cloneHdr(base) : null); }
          catch (e) { host.warnOnce('hdr-ready:' + k, 'erro ao usar o céu "' + k + '": ' + e); }
        }
        release();
      };
      cancel = function () { flush(null); };
      hdrCancels.push(cancel);
      var buf = dataUrlToBuffer(entry.dataUrl);
      if (!buf) { host.warn('não consegui ler os dados do céu "' + k + '"'); flush(null); return; }
      withHdrLoader(function (mod) {
        if (settled) return;
        if (!mod || isGone()) { flush(null); return; }
        try {
          var parsed = new mod.HDRLoader().parse(buf);
          if (!parsed || (!parsed.isTexture && !parsed.data)) { flush(null); return; }
          var base = parsed.isTexture ? parsed : new THREE.DataTexture(parsed.data, parsed.width, parsed.height);
          if (!parsed.isTexture) {
            if (parsed.type != null) base.type = parsed.type;
            if (THREE.LinearSRGBColorSpace != null) base.colorSpace = THREE.LinearSRGBColorSpace;
            if (THREE.LinearFilter != null) {
              base.minFilter = THREE.LinearFilter;
              base.magFilter = THREE.LinearFilter;
            }
            base.generateMipmaps = false;
            // O HDRLoader entrega as linhas na ordem do ARQUIVO (linha 0 em cima): vira no upload.
            base.flipY = true;
          }
          if (THREE.EquirectangularReflectionMapping != null) base.mapping = THREE.EquirectangularReflectionMapping;
          base.needsUpdate = true;
          if (isGone()) {
            disposeTextureQuietly(base);
            flush(null);
            return;
          }
          hdrCache[k] = base;
          flush(base);
        } catch (e) {
          host.warn('não consegui abrir o céu "' + k + '": ' + e);
          flush(null);
        }
      });
    }

    // ---- Cores do céu 360° para materiais sem reflexo (Toon/Lambert) ----
    // Amostra esparsa (8×8 = 64 pontos) da DataTexture: média do céu (metade de cima),
    // média do chão (metade de baixo) e o ponto mais forte (o sol), com a direção dele.
    function colorOf(r, g, b) {
      var peak = Math.max(r, g, b, 0);
      var k = peak > 1 ? 1 / peak : 1;
      return { r: r * k, g: g * k, b: b * k, intensity: peak };
    }

    function hdrAmbient(texture) {
      var image = texture && texture.image;
      var data = image && image.data;
      var w = image ? image.width : 0;
      var h = image ? image.height : 0;
      if (!data || !(w > 0) || !(h > 0) || !data.length) return null;
      var channels = Math.round(data.length / (w * h));
      if (channels < 3) return null;
      var half = data instanceof Uint16Array && THREE.DataUtils && THREE.DataUtils.fromHalfFloat;
      var bytes = data instanceof Uint8Array || data instanceof Uint8ClampedArray;
      var read = function (i) {
        var v = data[i];
        if (half) return THREE.DataUtils.fromHalfFloat(v);
        if (bytes) return v / 255;
        return v;
      };
      var GRID = 8;
      var sky = [0, 0, 0, 0];
      var ground = [0, 0, 0, 0];
      var sun = null;
      for (var gy = 0; gy < GRID; gy++) {
        var y = Math.min(h - 1, Math.floor(((gy + 0.5) * h) / GRID));
        for (var gx = 0; gx < GRID; gx++) {
          var x = Math.min(w - 1, Math.floor(((gx + 0.5) * w) / GRID));
          var at = (y * w + x) * channels;
          var r = Math.max(0, read(at) || 0);
          var g = Math.max(0, read(at + 1) || 0);
          var b = Math.max(0, read(at + 2) || 0);
          var bucket = y < h / 2 ? sky : ground;
          bucket[0] += r; bucket[1] += g; bucket[2] += b; bucket[3]++;
          var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (!sun || lum > sun.lum) sun = { lum: lum, r: r, g: g, b: b, x: x, y: y };
        }
      }
      var avg = function (acc) { return acc[3] ? colorOf(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3]) : colorOf(0, 0, 0); };
      // Equirretangular: linha 0 = topo (latitude +90°), coluna 0 = longitude -180°.
      var lon = (((sun.x + 0.5) / w) - 0.5) * 2 * Math.PI;
      var lat = (0.5 - ((sun.y + 0.5) / h)) * Math.PI;
      var light = colorOf(sun.r, sun.g, sun.b);
      light.x = Math.cos(lat) * Math.cos(lon);
      light.y = Math.sin(lat);
      light.z = Math.cos(lat) * Math.sin(lon);
      return { sky: avg(sky), ground: avg(ground), sun: light };
    }

    // Textura de COR (foto/desenho): sRGB, repetindo, com anisotropia modesta (≤ 4).
    function configureColorTexture(tex, opts) {
      if (!tex) return tex;
      var o = opts || {};
      if (THREE.SRGBColorSpace != null) tex.colorSpace = THREE.SRGBColorSpace;
      if (THREE.RepeatWrapping != null) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      }
      var rep = o.repeat;
      var rx = 1;
      var ry = 1;
      if (typeof rep === 'number' && isFinite(rep) && rep > 0) { rx = rep; ry = rep; }
      else if (rep && rep.x > 0 && rep.y > 0) { rx = rep.x; ry = rep.y; }
      if (tex.repeat && tex.repeat.set) tex.repeat.set(rx, ry);
      var renderer = o.renderer || (host.getRenderer ? host.getRenderer() : null);
      var caps = renderer && renderer.capabilities;
      var max = caps && caps.getMaxAnisotropy ? caps.getMaxAnisotropy() : 1;
      tex.anisotropy = Math.max(1, Math.min(4, max || 1));
      // Sem imagem ainda, quem marca o upload é o próprio loader quando ela chega.
      if (tex.image) tex.needsUpdate = true;
      return tex;
    }

    // Teardown: encerra esperas (timers/promessas) na hora.
    function cancelAll() {
      while (cancels.length) {
        var cancel = cancels.pop();
        if (cancel) cancel();
      }
      while (hdrCancels.length) {
        var hdrCancel = hdrCancels.pop();
        if (hdrCancel) hdrCancel();
      }
    }

    // Solta o cache inteiro (fora da cena). disposedResources deduplica com a cena do host.
    function disposeAll(disposedResources) {
      cancelAll();
      var roots = new Set();
      for (var key in cache) {
        var hit = cache[key];
        if (!hit || !hit.scene || roots.has(hit.scene)) continue;
        roots.add(hit.scene);
        disposeImported(hit.scene, disposedResources);
      }
      for (var hk in hdrCache) {
        var base = hdrCache[hk];
        var seen = disposedResources && disposedResources.textures;
        if (seen && seen.has(base)) continue;
        if (seen) seen.add(base);
        disposeTextureQuietly(base);
      }
      cache = Object.create(null);
      pendingModels = Object.create(null);
      hdrCache = Object.create(null);
      hdrPending = Object.create(null);
      lastFlipStamp = null;
    }

    return {
      load: load,
      cached: function (name) { return cache[keyOf(name)] || null; },
      instantiate: instantiate,
      clone: cloneTree,
      fit: fit,
      animator: animator,
      disposeClone: disposeClone,
      stepFlipbooks: stepFlipbooks,
      resetFlipbooks: resetFlipbooks,
      loadHdr: loadHdr,
      hdrAmbient: hdrAmbient,
      configureColorTexture: configureColorTexture,
      cancelAll: cancelAll,
      disposeAll: disposeAll
    };
  }
`

// O fragmento entra em TRÊS runtimes: a indentação de cada linha sai do payload (o
// literal não tem string de várias linhas, então nenhum texto muda; só os espaços à esquerda).
const THREE_MODELS_SOURCE = THREE_MODELS_TEMPLATE.replace(
  '/*__SZ_DATA_URL_RUNTIME__*/',
  () => dataUrlToBufferRuntimeSource,
)
  .split('\n')
  .map((line) => line.trimStart())
  .filter((line) => line !== '' && !line.startsWith('//'))
  .join('\n')

/** Fragmento cru (para os testes do módulo, que o avaliam isolado). */
export const threeModelsRuntimeSource = THREE_MODELS_SOURCE

export function withThreeModelsRuntime(source: string): string {
  const firstMarker = source.indexOf(THREE_MODELS_MARKER)
  if (firstMarker === -1) {
    throw new Error('Runtime 3D sem o marcador do carregador de modelos compartilhado')
  }
  if (source.indexOf(THREE_MODELS_MARKER, firstMarker + 1) !== -1) {
    throw new Error('Runtime 3D com marcador do carregador de modelos duplicado')
  }
  return source.replace(THREE_MODELS_MARKER, () => THREE_MODELS_SOURCE)
}
